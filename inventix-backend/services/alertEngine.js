import { pool } from '../config/db.js';

export const startAlertEngine = (io) => {
  const runChecks = async () => {
    console.log('Running Alert Engine checks...');
    try {
      // 1. Dead Stock Check
      const deadStockQuery = `
        WITH VariantRetailerStock AS (
          SELECT 
            v.id AS variant_id, 
            sh.retailer_id,
            SUM(sl.quantity_shipped) - COALESCE((
              SELECT SUM(units_sold) 
              FROM sell_through_events ste 
              WHERE ste.variant_id = v.id AND ste.retailer_id = sh.retailer_id
            ), 0) AS units_held,
            (
              SELECT MAX(sold_at) 
              FROM sell_through_events ste 
              WHERE ste.variant_id = v.id AND ste.retailer_id = sh.retailer_id
            ) AS last_sold_at
          FROM shipment_lines sl
          JOIN shipments sh ON sh.id = sl.shipment_id
          JOIN sku_variants v ON sl.variant_id = v.id
          GROUP BY v.id, sh.retailer_id
        )
        SELECT * FROM VariantRetailerStock
        WHERE units_held > 0 AND last_sold_at < (NOW() - INTERVAL '14 days');
      `;
      const dsResult = await pool.query(deadStockQuery);
      for (const row of dsResult.rows) {
        // Prevent duplicate spam
        const checkExisting = await pool.query(
          "SELECT 1 FROM anomaly_flags WHERE entity_type='sku_variant' AND entity_id=$1 AND anomaly_type='dead_stock_warning' AND status='pending'", 
          [row.variant_id]
        );
        if (checkExisting.rowCount === 0) {
          await pool.query(
            "INSERT INTO anomaly_flags (entity_type, entity_id, anomaly_type, severity, notes) VALUES ('sku_variant', $1, 'dead_stock_warning', 'medium', $2)",
            [row.variant_id, `Dead stock detected at retailer ${row.retailer_id}`]
          );
        }
      }

      // 2. Low Stock Check
      const lowStockResult = await pool.query("SELECT id, current_stock FROM sku_variants WHERE current_stock < 20");
      for (const row of lowStockResult.rows) {
        if (io) {
          io.emit('alert', { type: 'low_stock', variant_id: row.id, current_stock: row.current_stock });
        }
      }

      // 3. Credit Risk Check
      const creditQuery = `
        WITH RetailerMetrics AS (
          SELECT 
            r.id,
            r.credit_used,
            r.credit_limit,
            (SELECT COALESCE(SUM(ste.units_sold), 0)
             FROM sell_through_events ste
             WHERE ste.retailer_id = r.id AND ste.sold_at >= NOW() - INTERVAL '30 days') AS sold_30d,
            (SELECT COALESCE(SUM(sl.quantity_shipped), 0)
             FROM shipment_lines sl JOIN shipments sh ON sh.id = sl.shipment_id
             WHERE sh.retailer_id = r.id AND sh.shipped_at >= NOW() - INTERVAL '30 days') AS shipped_30d
          FROM retailers r
        )
        SELECT * FROM RetailerMetrics
        WHERE credit_limit > 0 
          AND (credit_used / credit_limit) > 0.7 
          AND shipped_30d > 0 
          AND (sold_30d::FLOAT / shipped_30d) < 0.3;
      `;
      const crResult = await pool.query(creditQuery);
      for (const row of crResult.rows) {
        const checkExisting = await pool.query(
          "SELECT 1 FROM anomaly_flags WHERE entity_type='retailer' AND entity_id=$1 AND anomaly_type='credit_risk' AND status='pending'", 
          [row.id]
        );
        if (checkExisting.rowCount === 0) {
          const insertResult = await pool.query(
            "INSERT INTO anomaly_flags (entity_type, entity_id, anomaly_type, severity, notes) VALUES ('retailer', $1, 'credit_risk', 'high', 'High credit usage with low sell-through') RETURNING *",
            [row.id]
          );
          if (io) {
            io.emit('alert', { type: 'credit_risk', event: insertResult.rows[0] });
          }
        }
      }

      console.log('Alert Engine checks completed.');
    } catch (e) {
      console.error('Alert Engine failed:', e);
    }
  };

  // Run on startup
  runChecks();

  // Then run every hour
  setInterval(runChecks, 60 * 60 * 1000);
};
