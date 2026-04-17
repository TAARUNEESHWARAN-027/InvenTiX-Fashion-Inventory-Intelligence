import express from 'express';
import { pool } from '../config/db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.use(requireAuth);

// Helper function to calculate retailer metrics
const calculateRetailerMetrics = (row) => {
  const unitsHeld = parseInt(row.total_units_held, 10) || 0;
  const sold30d = parseInt(row.units_sold_30d, 10) || 0;
  const shipped30d = parseInt(row.units_shipped_30d, 10) || 0;

  const sell_through_rate = shipped30d > 0 ? (sold30d / shipped30d) : 0;
  
  let days_since_last_sale = null;
  if (row.last_sale_date) {
    const diff = new Date() - new Date(row.last_sale_date);
    days_since_last_sale = Math.floor(diff / (1000 * 60 * 60 * 24));
  }

  const weekly_velocity = sold30d / 4;
  const estimated_weeks_cover = weekly_velocity > 0 ? (unitsHeld / weekly_velocity) : (unitsHeld > 0 ? 99 : 0);

  let health_status = 'red';
  if (sell_through_rate > 0.6) health_status = 'green';
  else if (sell_through_rate >= 0.3) health_status = 'yellow';

  return {
    ...row,
    total_units_held: unitsHeld,
    sell_through_rate,
    days_since_last_sale,
    estimated_weeks_cover,
    health_status
  };
};

// 1. GET /api/retailers
router.get('/', async (req, res) => {
  try {
    const manufacturerId = req.user.entity_id;
    const query = `
      WITH manufacturer_retailers AS (
        SELECT DISTINCT retailer_id FROM shipments WHERE manufacturer_id = $1
      )
      SELECT 
        r.id, r.name, r.city, r.state, r.credit_limit, r.credit_used, r.risk_score,
        COALESCE((
          SELECT SUM(sl.quantity_shipped) 
          FROM shipments sh
          JOIN shipment_lines sl ON sl.shipment_id = sh.id
          WHERE sh.manufacturer_id = $1 AND sh.retailer_id = r.id
        ), 0) - COALESCE((
          SELECT SUM(ste.units_sold)
          FROM sell_through_events ste
          JOIN sku_variants sv ON ste.variant_id = sv.id
          JOIN skus s ON sv.sku_id = s.id
          WHERE ste.retailer_id = r.id AND s.manufacturer_id = $1
        ), 0) AS total_units_held,
        (
          SELECT MAX(ste.sold_at)
          FROM sell_through_events ste
          JOIN sku_variants sv ON ste.variant_id = sv.id
          JOIN skus s ON sv.sku_id = s.id
          WHERE ste.retailer_id = r.id AND s.manufacturer_id = $1
        ) AS last_sale_date,
        COALESCE((
          SELECT SUM(ste.units_sold)
          FROM sell_through_events ste
          JOIN sku_variants sv ON ste.variant_id = sv.id
          JOIN skus s ON sv.sku_id = s.id
          WHERE ste.retailer_id = r.id AND s.manufacturer_id = $1 AND ste.sold_at >= NOW() - INTERVAL '30 days'
        ), 0) AS units_sold_30d,
        COALESCE((
          SELECT SUM(sl.quantity_shipped)
          FROM shipments sh
          JOIN shipment_lines sl ON sl.shipment_id = sh.id
          WHERE sh.manufacturer_id = $1 AND sh.retailer_id = r.id AND sh.shipped_at >= NOW() - INTERVAL '30 days'
        ), 0) AS units_shipped_30d
      FROM retailers r
      JOIN manufacturer_retailers mr ON r.id = mr.retailer_id
    `;
    const result = await pool.query(query, [manufacturerId]);
    
    const enrichedRetailers = result.rows.map(calculateRetailerMetrics);
    
    // Clean up auxiliary calculation fields before sending
    const cleaned = enrichedRetailers.map(r => {
      const { units_sold_30d, units_shipped_30d, last_sale_date, ...rest } = r;
      return rest;
    });

    res.json(cleaned);
  } catch (error) {
    console.error('Fetch retailers error:', error);
    res.status(500).json({ error: 'Failed to fetch retailers' });
  }
});

// 2. GET /api/retailers/:id
router.get('/:id', async (req, res) => {
  try {
    const manufacturerId = req.user.entity_id;
    const retailerId = req.params.id;

    // First fetch basic retailer info
    const rResult = await pool.query('SELECT * FROM retailers WHERE id = $1', [retailerId]);
    if (rResult.rows.length === 0) return res.status(404).json({ error: 'Retailer not found' });
    const retailer = rResult.rows[0];

    // Get variant level breakdown
    const query = `
      SELECT 
        s.name as sku_name, s.category, s.season, s.base_price,
        v.id as variant_id, v.size, v.colour,
        COALESCE((
          SELECT SUM(sl.quantity_shipped)
          FROM shipment_lines sl
          JOIN shipments sh ON sh.id = sl.shipment_id
          WHERE sh.retailer_id = $2 AND sh.manufacturer_id = $1 AND sl.variant_id = v.id
        ), 0) as total_shipped,
        COALESCE((
          SELECT SUM(ste.units_sold)
          FROM sell_through_events ste
          WHERE ste.retailer_id = $2 AND ste.variant_id = v.id
        ), 0) as total_sold,
        (
          SELECT MAX(ste.sold_at)
          FROM sell_through_events ste
          WHERE ste.retailer_id = $2 AND ste.variant_id = v.id
        ) as last_sale_date
      FROM sku_variants v
      JOIN skus s ON v.sku_id = s.id
      WHERE s.manufacturer_id = $1 AND EXISTS (
        SELECT 1 FROM shipment_lines sl 
        JOIN shipments sh ON sh.id = sl.shipment_id 
        WHERE sl.variant_id = v.id AND sh.retailer_id = $2
      )
    `;
    const result = await pool.query(query, [manufacturerId, retailerId]);
    
    // Calculate variant metrics
    const variants = result.rows.map(row => {
      const shipped = parseInt(row.total_shipped, 10);
      const sold = parseInt(row.total_sold, 10);
      const remaining = shipped - sold;
      const rate = shipped > 0 ? (sold / shipped) : 0;
      
      return {
        ...row,
        units_remaining: remaining,
        sell_through_rate: rate
      };
    });

    res.json({ ...retailer, variants });
  } catch (error) {
    console.error('Fetch single retailer error:', error);
    res.status(500).json({ error: 'Failed to fetch retailer breakdown' });
  }
});

// 3. POST /api/retailers/:id/sell-through
router.post('/:id/sell-through', async (req, res) => {
  try {
    const manufacturerId = req.user.entity_id;
    const retailerId = req.params.id;
    const { variant_id, units_sold, sold_at } = req.body;

    const eventDate = sold_at || new Date().toISOString();

    // Insert sell_through_event
    const insertQuery = `
      INSERT INTO sell_through_events (variant_id, retailer_id, units_sold, sold_at, source)
      VALUES ($1, $2, $3, $4, 'POS')
      RETURNING *
    `;
    const steResult = await pool.query(insertQuery, [variant_id, retailerId, units_sold, eventDate]);
    const event = steResult.rows[0];

    // Re-fetch retailer summary to recalculate health status
    const summaryQuery = `
      SELECT 
        r.id, r.name, r.city, r.state, r.credit_limit, r.credit_used, r.risk_score,
        COALESCE((
          SELECT SUM(sl.quantity_shipped) FROM shipments sh JOIN shipment_lines sl ON sl.shipment_id = sh.id
          WHERE sh.manufacturer_id = $1 AND sh.retailer_id = r.id
        ), 0) - COALESCE((
          SELECT SUM(ste.units_sold) FROM sell_through_events ste
          JOIN sku_variants sv ON ste.variant_id = sv.id JOIN skus s ON sv.sku_id = s.id
          WHERE ste.retailer_id = r.id AND s.manufacturer_id = $1
        ), 0) AS total_units_held,
        (
          SELECT MAX(ste.sold_at) FROM sell_through_events ste
          JOIN sku_variants sv ON ste.variant_id = sv.id JOIN skus s ON sv.sku_id = s.id
          WHERE ste.retailer_id = r.id AND s.manufacturer_id = $1
        ) AS last_sale_date,
        COALESCE((
          SELECT SUM(ste.units_sold) FROM sell_through_events ste
          JOIN sku_variants sv ON ste.variant_id = sv.id JOIN skus s ON sv.sku_id = s.id
          WHERE ste.retailer_id = r.id AND s.manufacturer_id = $1 AND ste.sold_at >= NOW() - INTERVAL '30 days'
        ), 0) AS units_sold_30d,
        COALESCE((
          SELECT SUM(sl.quantity_shipped) FROM shipments sh JOIN shipment_lines sl ON sl.shipment_id = sh.id
          WHERE sh.manufacturer_id = $1 AND sh.retailer_id = r.id AND sh.shipped_at >= NOW() - INTERVAL '30 days'
        ), 0) AS units_shipped_30d
      FROM retailers r
      WHERE r.id = $2
    `;
    const summaryResult = await pool.query(summaryQuery, [manufacturerId, retailerId]);
    const summary = calculateRetailerMetrics(summaryResult.rows[0]);
    
    const { units_sold_30d, units_shipped_30d, last_sale_date, ...cleanedSummary } = summary;

    if (req.io) {
      req.io.emit('sell_through_update', { event, retailerSummary: cleanedSummary });
    }

    res.json(cleanedSummary);
  } catch (error) {
    console.error('Insert sell-through error:', error);
    res.status(500).json({ error: 'Failed to record sell-through event' });
  }
});

// 4. GET /api/retailers/:id/credit
router.get('/:id/credit', async (req, res) => {
  try {
    const manufacturerId = req.user.entity_id;
    const retailerId = req.params.id;

    const query = `
      SELECT * FROM credit_events 
      WHERE retailer_id = $1 AND manufacturer_id = $2
      ORDER BY created_at DESC
    `;
    const result = await pool.query(query, [retailerId, manufacturerId]);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Fetch credit history error:', error);
    res.status(500).json({ error: 'Failed to fetch credit history' });
  }
});

export default router;
