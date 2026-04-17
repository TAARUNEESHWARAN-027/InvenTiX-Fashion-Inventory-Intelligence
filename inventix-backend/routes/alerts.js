import express from 'express';
import { pool } from '../config/db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.use(requireAuth);

router.get('/', async (req, res) => {
  try {
    const manufacturerId = req.user.entity_id;

    // Fetch all anomalies that are semantically connected to this manufacturer
    const query = `
      SELECT DISTINCT af.*
      FROM anomaly_flags af
      LEFT JOIN sku_variants sv ON af.entity_type = 'sku_variant' AND af.entity_id = sv.id
      LEFT JOIN skus s ON sv.sku_id = s.id
      LEFT JOIN retailers r ON af.entity_type = 'retailer' AND af.entity_id = r.id
      LEFT JOIN shipments sh ON sh.retailer_id = r.id AND sh.manufacturer_id = $1
      WHERE af.created_at >= NOW() - INTERVAL '30 days'
        AND (
          (af.entity_type = 'manufacturer' AND af.entity_id = $1) OR
          (af.entity_type = 'sku_variant' AND s.manufacturer_id = $1) OR
          (af.entity_type = 'retailer' AND sh.id IS NOT NULL)
        )
      ORDER BY af.created_at DESC
    `;
    
    const result = await pool.query(query, [manufacturerId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Fetch alerts/anomalies error:', error);
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

export default router;
