import express from 'express';
import { pool } from '../config/db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = express.Router();

// All admin routes require auth + admin role
router.use(requireAuth, requireRole('admin'));

// 1. GET /api/admin/feed — last 100 stock_update events across ALL manufacturers
router.get('/feed', async (req, res) => {
  try {
    const query = `
      SELECT 
        su.id, su.quantity_delta, su.reason_code, su.ip_address, su.created_at,
        v.size, v.colour, v.current_stock,
        s.name AS sku_name, s.category, s.season,
        m.name AS manufacturer_name, m.city AS manufacturer_city,
        u.email AS updated_by_email, u.role AS updated_by_role
      FROM stock_updates su
      JOIN sku_variants v ON su.variant_id = v.id
      JOIN skus s ON v.sku_id = s.id
      JOIN manufacturers m ON s.manufacturer_id = m.id
      LEFT JOIN users u ON su.updated_by = u.id
      ORDER BY su.created_at DESC
      LIMIT 100
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error('Admin feed error:', err);
    res.status(500).json({ error: 'Failed to fetch activity feed' });
  }
});

// 2. GET /api/admin/anomalies — all pending anomaly_flags, critical first
router.get('/anomalies', async (req, res) => {
  try {
    const query = `
      SELECT *
      FROM anomaly_flags
      WHERE status = 'pending'
      ORDER BY
        CASE severity
          WHEN 'critical' THEN 1
          WHEN 'high'     THEN 2
          WHEN 'medium'   THEN 3
          WHEN 'low'      THEN 4
          ELSE 5
        END,
        created_at ASC
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error('Admin anomalies error:', err);
    res.status(500).json({ error: 'Failed to fetch anomalies' });
  }
});

// 3. POST /api/admin/anomalies/:id/resolve
router.post('/anomalies/:id/resolve', async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { action, reason } = req.body;

    const validActions = ['approve', 'reject', 'escalate', 'freeze'];
    if (!validActions.includes(action)) {
      return res.status(400).json({ error: `Invalid action. Must be one of: ${validActions.join(', ')}` });
    }

    await client.query('BEGIN');

    // Map action to status label
    const statusMap = { approve: 'approved', reject: 'rejected', escalate: 'escalated', freeze: 'frozen' };
    const newStatus = statusMap[action];

    // Update the anomaly_flag
    const updateResult = await client.query(
      `UPDATE anomaly_flags SET status = $1, notes = COALESCE(notes || ' | ', '') || $2 WHERE id = $3 RETURNING *`,
      [newStatus, `Action: ${action} — ${reason || 'No reason provided'}`, id]
    );

    if (updateResult.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Anomaly flag not found' });
    }

    const flag = updateResult.rows[0];

    // If freeze: set sku_variants.current_stock = -1 to mark as frozen
    if (action === 'freeze' && flag.entity_type === 'sku_variant') {
      await client.query(
        `UPDATE sku_variants SET current_stock = -1, last_updated = NOW() WHERE id = $1`,
        [flag.entity_id]
      );
    }

    await client.query('COMMIT');

    // Emit Socket.IO event
    if (req.io) {
      req.io.emit('anomaly_resolved', {
        flag_id: id,
        action,
        updated_flag: flag
      });
    }

    res.json({ success: true, flag });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Resolve anomaly error:', err);
    res.status(500).json({ error: 'Failed to resolve anomaly' });
  } finally {
    client.release();
  }
});

// 4. GET /api/admin/analytics
router.get('/analytics', async (req, res) => {
  try {
    // Top 5 categories by sell-through rate (last 30 days)
    const categoriesQuery = `
      SELECT 
        s.category,
        COALESCE(SUM(ste.units_sold), 0) AS total_sold,
        COALESCE(SUM(sl.quantity_shipped), 0) AS total_shipped,
        CASE 
          WHEN SUM(sl.quantity_shipped) > 0 
          THEN ROUND(SUM(ste.units_sold)::NUMERIC / SUM(sl.quantity_shipped), 3)
          ELSE 0 
        END AS sell_through_rate
      FROM skus s
      LEFT JOIN sku_variants v ON v.sku_id = s.id
      LEFT JOIN sell_through_events ste ON ste.variant_id = v.id AND ste.sold_at >= NOW() - INTERVAL '30 days'
      LEFT JOIN shipment_lines sl ON sl.variant_id = v.id
      GROUP BY s.category
      ORDER BY sell_through_rate DESC
      LIMIT 5
    `;

    // Top 5 fastest-moving sizes platform-wide (last 30 days)
    const sizesQuery = `
      SELECT 
        v.size,
        SUM(ste.units_sold) AS total_sold
      FROM sell_through_events ste
      JOIN sku_variants v ON ste.variant_id = v.id
      WHERE ste.sold_at >= NOW() - INTERVAL '30 days'
      GROUP BY v.size
      ORDER BY total_sold DESC
      LIMIT 5
    `;

    // Top 5 retailers by credit risk score
    const creditRiskQuery = `
      SELECT id, name, city, state, credit_limit, credit_used, risk_score,
        CASE WHEN credit_limit > 0 THEN ROUND((credit_used / credit_limit * 100)::NUMERIC, 1) ELSE 0 END AS credit_utilisation_pct
      FROM retailers
      ORDER BY risk_score DESC, credit_used DESC
      LIMIT 5
    `;

    // Platform-wide dead stock count (variants with no sell-through for 14+ days while stock is held)
    const deadStockQuery = `
      WITH variant_held AS (
        SELECT 
          sl.variant_id,
          sh.retailer_id,
          SUM(sl.quantity_shipped) AS shipped,
          COALESCE((
            SELECT SUM(units_sold) FROM sell_through_events ste
            WHERE ste.variant_id = sl.variant_id AND ste.retailer_id = sh.retailer_id
          ), 0) AS sold,
          (
            SELECT MAX(sold_at) FROM sell_through_events ste
            WHERE ste.variant_id = sl.variant_id AND ste.retailer_id = sh.retailer_id
          ) AS last_sold_at
        FROM shipment_lines sl
        JOIN shipments sh ON sh.id = sl.shipment_id
        GROUP BY sl.variant_id, sh.retailer_id
      )
      SELECT COUNT(*) AS dead_stock_count
      FROM variant_held
      WHERE (shipped - sold) > 0 AND (last_sold_at IS NULL OR last_sold_at < NOW() - INTERVAL '14 days')
    `;

    const [categories, sizes, creditRisk, deadStock] = await Promise.all([
      pool.query(categoriesQuery),
      pool.query(sizesQuery),
      pool.query(creditRiskQuery),
      pool.query(deadStockQuery)
    ]);

    res.json({
      top_categories_by_sell_through: categories.rows,
      top_sizes_by_velocity: sizes.rows,
      top_retailers_by_credit_risk: creditRisk.rows,
      dead_stock_count: parseInt(deadStock.rows[0].dead_stock_count, 10)
    });
  } catch (err) {
    console.error('Admin analytics error:', err);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// 5. GET /api/admin/audit — filterable audit log
router.get('/audit', async (req, res) => {
  try {
    const { user_id, entity_id, date_from, date_to } = req.query;

    const conditions = [];
    const params = [];
    let idx = 1;

    if (user_id) {
      conditions.push(`su.updated_by = $${idx++}`);
      params.push(user_id);
    }
    if (entity_id) {
      conditions.push(`(v.sku_id = $${idx} OR s.manufacturer_id = $${idx})`);
      params.push(entity_id);
      idx++;
    }
    if (date_from) {
      conditions.push(`su.created_at >= $${idx++}`);
      params.push(date_from);
    }
    if (date_to) {
      conditions.push(`su.created_at <= $${idx++}`);
      params.push(date_to);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const query = `
      SELECT 
        su.id, su.variant_id, su.updated_by, su.quantity_delta, su.reason_code, su.ip_address, su.created_at,
        v.size, v.colour,
        s.name AS sku_name, s.category,
        m.name AS manufacturer_name,
        u.email AS updated_by_email, u.role AS updated_by_role
      FROM stock_updates su
      JOIN sku_variants v ON su.variant_id = v.id
      JOIN skus s ON v.sku_id = s.id
      JOIN manufacturers m ON s.manufacturer_id = m.id
      LEFT JOIN users u ON su.updated_by = u.id
      ${whereClause}
      ORDER BY su.created_at DESC
    `;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Admin audit error:', err);
    res.status(500).json({ error: 'Failed to fetch audit log' });
  }
});

export default router;
