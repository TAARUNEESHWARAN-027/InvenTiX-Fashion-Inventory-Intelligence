import express from 'express';
import multer from 'multer';
import { parse } from 'csv-parse';
import { pool } from '../config/db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Apply auth to all routes in this router
router.use(requireAuth);

// 1. GET /api/inventory
router.get('/', async (req, res) => {
  try {
    const manufacturerId = req.user.entity_id;
    const query = `
      SELECT 
        s.id as sku_id, s.name, s.category, s.season, s.base_price,
        v.id as variant_id, v.colour, v.size, v.current_stock, v.last_updated,
        COALESCE(
          (SELECT SUM(st.units_sold) FROM sell_through_events st WHERE st.variant_id = v.id AND st.sold_at >= NOW() - INTERVAL '30 days'), 0
        ) as units_sold_30d,
        COALESCE(
          (SELECT SUM(sl.quantity_shipped) FROM shipment_lines sl JOIN shipments sh ON sh.id = sl.shipment_id WHERE sl.variant_id = v.id AND sh.shipped_at >= NOW() - INTERVAL '30 days'), 0
        ) as units_shipped_30d
      FROM skus s
      JOIN sku_variants v ON v.sku_id = s.id
      WHERE s.manufacturer_id = $1
    `;
    const result = await pool.query(query, [manufacturerId]);
    
    // Group variants under their respective SKUs
    const skusMap = new Map();
    for (const row of result.rows) {
      if (!skusMap.has(row.sku_id)) {
        skusMap.set(row.sku_id, {
          id: row.sku_id, name: row.name, category: row.category, season: row.season, base_price: row.base_price,
          variants: []
        });
      }
      
      const sold = parseInt(row.units_sold_30d, 10) || 0;
      const shipped = parseInt(row.units_shipped_30d, 10) || 0;
      const sell_through_rate = shipped > 0 ? (sold / shipped) : 0;

      skusMap.get(row.sku_id).variants.push({
        id: row.variant_id,
        colour: row.colour,
        size: row.size,
        current_stock: row.current_stock,
        last_updated: row.last_updated,
        sell_through_rate
      });
    }

    res.json(Array.from(skusMap.values()));
  } catch (err) {
    console.error('Fetch inventory error:', err);
    res.status(500).json({ error: 'Failed to fetch inventory' });
  }
});

// 2. POST /api/inventory/update
router.post('/update', async (req, res) => {
  const client = await pool.connect();
  try {
    const { variant_id, quantity_delta, reason_code } = req.body;
    const userId = req.user.id;
    const ipAddress = req.ip;

    await client.query('BEGIN');

    // Insert stock_update record
    const stockQuery = `
      INSERT INTO stock_updates (variant_id, updated_by, quantity_delta, reason_code, ip_address)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const stockResult = await client.query(stockQuery, [variant_id, userId, quantity_delta, reason_code, ipAddress]);
    const stockUpdateRecord = stockResult.rows[0];

    // Update current_stock in sku_variants
    const variantQuery = `
      UPDATE sku_variants 
      SET current_stock = current_stock + $1, last_updated = NOW() 
      WHERE id = $2
      RETURNING *
    `;
    const variantResult = await client.query(variantQuery, [quantity_delta, variant_id]);
    const updatedVariant = variantResult.rows[0];

    await client.query('COMMIT');

    // Emit event via Socket.IO
    if (req.io) {
      req.io.emit('stock_update', {
        update: stockUpdateRecord,
        variant: updatedVariant
      });
    }

    res.json(updatedVariant);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Update stock error:', err);
    res.status(500).json({ error: 'Failed to update stock' });
  } finally {
    client.release();
  }
});

// 3. POST /api/inventory/bulk-upload
router.post('/bulk-upload', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const manufacturerId = req.user.entity_id;
  const userId = req.user.id;
  const ipAddress = req.ip;

  try {
    const fileContent = req.file.buffer.toString('utf-8');
    
    parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    }, async (err, records) => {
      if (err) return res.status(400).json({ error: 'Failed to parse CSV' });

      let successCount = 0;
      let errors = [];

      // Validate headers on the first row
      if (records.length > 0) {
        const headers = Object.keys(records[0]);
        const requiredHeaders = ['SKU name', 'colour', 'size', 'quantity', 'reason_code'];
        const missing = requiredHeaders.filter(h => !headers.includes(h));
        if (missing.length > 0) {
          return res.status(400).json({ error: `Missing required columns: ${missing.join(', ')}` });
        }
      }

      // Process rows sequentially to avoid thrashing the DB pool
      for (let i = 0; i < records.length; i++) {
        const row = records[i];
        const { 'SKU name': skuName, colour, size, quantity, reason_code } = row;
        
        const delta = parseInt(quantity, 10);
        if (isNaN(delta)) {
          errors.push({ row: i + 1, error: 'Invalid quantity' });
          continue;
        }

        // Find the variant_id associated with this sku/colour/size and logged-in manufacturer
        const findQuery = `
          SELECT v.id 
          FROM sku_variants v
          JOIN skus s ON s.id = v.sku_id
          WHERE s.name = $1 AND v.colour = $2 AND v.size = $3 AND s.manufacturer_id = $4
        `;
        const findResult = await pool.query(findQuery, [skuName, colour, size, manufacturerId]);
        
        if (findResult.rows.length === 0) {
          errors.push({ row: i + 1, error: `Variant not found for ${skuName} (${colour}-${size})` });
          continue;
        }

        const variantId = findResult.rows[0].id;
        const client = await pool.connect();
        
        try {
          await client.query('BEGIN');
          await client.query(
            'INSERT INTO stock_updates (variant_id, updated_by, quantity_delta, reason_code, ip_address) VALUES ($1, $2, $3, $4, $5)',
            [variantId, userId, delta, reason_code, ipAddress]
          );
          await client.query(
            'UPDATE sku_variants SET current_stock = current_stock + $1, last_updated = NOW() WHERE id = $2',
            [delta, variantId]
          );
          await client.query('COMMIT');
          successCount++;
        } catch (txnErr) {
          await client.query('ROLLBACK');
          errors.push({ row: i + 1, error: txnErr.message });
        } finally {
          client.release();
        }
      }
      
      res.json({ success: successCount, errors });
    });
  } catch (err) {
    console.error('Bulk upload error:', err);
    res.status(500).json({ error: 'Server error during bulk upload' });
  }
});

// 4. GET /api/inventory/:sku_id/timeline
router.get('/:sku_id/timeline', async (req, res) => {
  try {
    const { sku_id } = req.params;
    const query = `
      SELECT su.*, v.size, v.colour 
      FROM stock_updates su
      JOIN sku_variants v ON su.variant_id = v.id
      WHERE v.sku_id = $1
      ORDER BY su.created_at DESC
      LIMIT 50
    `;
    const result = await pool.query(query, [sku_id]);
    res.json(result.rows);
  } catch (err) {
    console.error('Fetch timeline error:', err);
    res.status(500).json({ error: 'Failed to fetch timeline records' });
  }
});

// 5. POST /api/inventory/skus — Create a new SKU
router.post('/skus', async (req, res) => {
  try {
    const manufacturerId = req.user.entity_id;
    if (!manufacturerId) return res.status(400).json({ error: 'User is not linked to a manufacturer.' });
    const { name, category, season, base_price } = req.body;
    if (!name) return res.status(400).json({ error: 'SKU name is required.' });
    const result = await pool.query(
      `INSERT INTO skus (manufacturer_id, name, category, season, base_price) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [manufacturerId, name, category || 'general', season || 'all-season', parseFloat(base_price) || 0]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create SKU error:', err);
    res.status(500).json({ error: 'Failed to create SKU' });
  }
});

// 6. POST /api/inventory/skus/:sku_id/variants — Add a variant to a SKU
router.post('/skus/:sku_id/variants', async (req, res) => {
  try {
    const { sku_id } = req.params;
    const { colour, size, current_stock } = req.body;
    if (!colour || !size) return res.status(400).json({ error: 'Colour and size are required.' });
    const result = await pool.query(
      `INSERT INTO sku_variants (sku_id, colour, size, current_stock) VALUES ($1, $2, $3, $4) RETURNING *`,
      [sku_id, colour, size, parseInt(current_stock) || 0]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create variant error:', err);
    res.status(500).json({ error: 'Failed to create variant' });
  }
});

export default router;

