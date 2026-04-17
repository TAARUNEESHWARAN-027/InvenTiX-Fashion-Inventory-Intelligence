/**
 * InvenTiX — FULL PRODUCTION SEED SCRIPT
 * Clears all data and inserts realistic Indian B2B fashion data
 */
import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_8u5NdXxVEzMH@ep-nameless-resonance-anir5zmo.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require'
});

const q = (sql, params = []) => pool.query(sql, params);

console.log('🌱 Starting InvenTiX full seed...\n');

// ──────────────────────────────────────────────────────────────────────────────
// 1. CLEAR ALL TABLES (reverse dependency order)
// ──────────────────────────────────────────────────────────────────────────────
console.log('🗑  Clearing tables...');
await q(`DELETE FROM credit_events`);
await q(`DELETE FROM anomaly_flags`);
await q(`DELETE FROM stock_updates`);
await q(`DELETE FROM sell_through_events`);
await q(`DELETE FROM shipment_lines`);
await q(`DELETE FROM shipments`);
await q(`DELETE FROM sku_variants`);
await q(`DELETE FROM skus`);
await q(`DELETE FROM retailers`);
// Keep manufacturers and users — just update
await q(`DELETE FROM manufacturers`);
console.log('✅ Tables cleared\n');

// ──────────────────────────────────────────────────────────────────────────────
// 2. MANUFACTURERS (5)
// ──────────────────────────────────────────────────────────────────────────────
console.log('🏭 Inserting manufacturers...');
const mfgData = [
  { name: 'Surat Ethnic Wear Co.',      city: 'Surat',      state: 'Gujarat',        category: 'ethnic wear',  tier: 'Tier 1' },
  { name: 'Tirupur Cotton Mills',        city: 'Tirupur',    state: 'Tamil Nadu',     category: 'casual wear',  tier: 'Tier 1' },
  { name: 'Jaipur Block Print House',   city: 'Jaipur',     state: 'Rajasthan',      category: 'ethnic wear',  tier: 'Tier 2' },
  { name: 'Delhi Fast Fashion Ltd.',     city: 'Delhi',      state: 'Delhi',          category: 'westernwear',  tier: 'Tier 1' },
  { name: 'Ludhiana Knitwear Exports',  city: 'Ludhiana',   state: 'Punjab',         category: 'winterwear',   tier: 'Tier 2' },
];

const mfgs = [];
for (const m of mfgData) {
  const r = await q(
    `INSERT INTO manufacturers (name, city, state, category_focus, tier) VALUES ($1,$2,$3,$4,$5) RETURNING id, name`,
    [m.name, m.city, m.state, m.category, m.tier]
  );
  mfgs.push({ ...r.rows[0], ...m });
}
console.log(`✅ ${mfgs.length} manufacturers\n`);

// ──────────────────────────────────────────────────────────────────────────────
// 3. LINK demo@inventix.com to first manufacturer
// ──────────────────────────────────────────────────────────────────────────────
await q(`UPDATE users SET entity_id = $1 WHERE email = 'demo@inventix.com'`, [mfgs[0].id]);
await q(`UPDATE users SET entity_id = $1 WHERE email = 'seller@inventix.com'`, [mfgs[1].id]);
console.log(`✅ demo@inventix.com → ${mfgs[0].name}`);
console.log(`✅ seller@inventix.com → ${mfgs[1].name}\n`);

// ──────────────────────────────────────────────────────────────────────────────
// 4. RETAILERS (15)
// ──────────────────────────────────────────────────────────────────────────────
console.log('🏪 Inserting retailers...');
const retailerData = [
  { name: 'Meena Boutique',          city: 'Mumbai',     state: 'Maharashtra',  limit: 350000, used_pct: 0.42, risk: 22 },
  { name: 'Rajwadi Fashions',        city: 'Jaipur',     state: 'Rajasthan',    limit: 220000, used_pct: 0.71, risk: 58 },
  { name: 'Silk Route Stores',       city: 'Bangalore',  state: 'Karnataka',    limit: 480000, used_pct: 0.28, risk: 14 },
  { name: 'Kaveri Saree Palace',     city: 'Chennai',    state: 'Tamil Nadu',   limit: 290000, used_pct: 0.55, risk: 41 },
  { name: 'Westend Wardrobe',        city: 'Pune',       state: 'Maharashtra',  limit: 180000, used_pct: 0.88, risk: 76 },
  { name: 'Fusion Threads',          city: 'Hyderabad',  state: 'Telangana',    limit: 310000, used_pct: 0.34, risk: 19 },
  { name: 'Kamla Fashion House',     city: 'Ahmedabad',  state: 'Gujarat',      limit: 260000, used_pct: 0.62, risk: 47 },
  { name: 'Noor Collection',         city: 'Lucknow',    state: 'Uttar Pradesh',limit: 195000, used_pct: 0.49, risk: 33 },
  { name: 'TrendZone Retail',        city: 'Kolkata',    state: 'West Bengal',  limit: 420000, used_pct: 0.21, risk: 11 },
  { name: 'Chandigarh Style Hub',    city: 'Chandigarh', state: 'Punjab',       limit: 155000, used_pct: 0.93, risk: 82 },
  { name: 'South Silk Emporium',     city: 'Coimbatore', state: 'Tamil Nadu',   limit: 280000, used_pct: 0.38, risk: 26 },
  { name: 'Dilli Haat Fashions',     city: 'New Delhi',  state: 'Delhi',        limit: 520000, used_pct: 0.45, risk: 30 },
  { name: 'Bhopal Ethnic Corner',    city: 'Bhopal',     state: 'Madhya Pradesh',limit: 140000, used_pct: 0.77, risk: 63 },
  { name: 'Rainbow Apparel',         city: 'Kochi',      state: 'Kerala',       limit: 230000, used_pct: 0.31, risk: 18 },
  { name: 'Nagpur Dress Circle',     city: 'Nagpur',     state: 'Maharashtra',  limit: 175000, used_pct: 0.67, risk: 54 },
];

const retailers = [];
for (const r of retailerData) {
  const used = Math.round(r.limit * r.used_pct);
  const res = await q(
    `INSERT INTO retailers (name, city, state, credit_limit, credit_used, risk_score) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, name`,
    [r.name, r.city, r.state, r.limit, used, r.risk]
  );
  retailers.push({ ...res.rows[0], ...r, credit_used: used });
}
console.log(`✅ ${retailers.length} retailers\n`);

// ──────────────────────────────────────────────────────────────────────────────
// 5. SKUs (25+) distributed across all 5 manufacturers
// ──────────────────────────────────────────────────────────────────────────────
console.log('📦 Inserting SKUs...');
const skuDefs = [
  // Mfg 0 — Surat Ethnic Wear Co. (6 SKUs)
  { mfg: 0, name: 'Festive Bandhani Kurti SS25',         cat: 'ethnic wear',  season: 'festive 2025', price: 949 },
  { mfg: 0, name: 'Chikankari Embroidery Suit Set',      cat: 'ethnic wear',  season: 'summer 2025',  price: 1849 },
  { mfg: 0, name: 'Rayon Palazzo Printed Co-ord',        cat: 'bottoms',       season: 'summer 2025',  price: 699 },
  { mfg: 0, name: 'Chanderi Silk Kurta FW25',            cat: 'ethnic wear',  season: 'festive 2025', price: 1599 },
  { mfg: 0, name: 'Georgette Sharara Set',               cat: 'ethnic wear',  season: 'festive 2025', price: 2199 },
  { mfg: 0, name: 'Modal Slub Casual Kurti',             cat: 'casual wear',  season: 'all-season',   price: 549 },

  // Mfg 1 — Tirupur Cotton Mills (5 SKUs)
  { mfg: 1, name: 'Basic Crew Neck Tee Pack of 3',       cat: 'casual wear',  season: 'all-season',   price: 399 },
  { mfg: 1, name: 'Pique Polo Collar Shirt',             cat: 'casual wear',  season: 'summer 2025',  price: 649 },
  { mfg: 1, name: 'Enzyme Washed Hooded Sweatshirt',     cat: 'winterwear',   season: 'winter 2025',  price: 899 },
  { mfg: 1, name: 'Slim Fit Cargo Jogger',               cat: 'bottoms',       season: 'all-season',   price: 799 },
  { mfg: 1, name: 'Organic Cotton Premium Boxers Pack',  cat: 'innerwear',    season: 'all-season',   price: 349 },

  // Mfg 2 — Jaipur Block Print House (5 SKUs)
  { mfg: 2, name: 'Hand Block Print Cotton Saree',       cat: 'ethnic wear',  season: 'all-season',   price: 2499 },
  { mfg: 2, name: 'Indigo Mud Print Shirt Dress',        cat: 'westernwear',  season: 'summer 2025',  price: 1199 },
  { mfg: 2, name: 'Dabu Print Anarkali Flare',           cat: 'ethnic wear',  season: 'festive 2025', price: 1749 },
  { mfg: 2, name: 'Bagru Block Printed Bedsheet Set',    cat: 'home decor',   season: 'all-season',   price: 1299 },
  { mfg: 2, name: 'Sanganeri Print Kurta Pyjama Set',    cat: 'ethnic wear',  season: 'festive 2025', price: 1099 },

  // Mfg 3 — Delhi Fast Fashion Ltd. (5 SKUs)
  { mfg: 3, name: 'Oversized Acid Wash Denim Jacket',    cat: 'westernwear',  season: 'winter 2025',  price: 1499 },
  { mfg: 3, name: 'High-Rise Flare Jeans',               cat: 'westernwear',  season: 'all-season',   price: 1199 },
  { mfg: 3, name: 'Satin Slip Co-ord Set',               cat: 'westernwear',  season: 'festive 2025', price: 1349 },
  { mfg: 3, name: 'Smocked Linen Maxi Dress',            cat: 'westernwear',  season: 'summer 2025',  price: 1099 },
  { mfg: 3, name: 'Rib-Knit Crop Top 3-Pack',            cat: 'westernwear',  season: 'all-season',   price: 599 },

  // Mfg 4 — Ludhiana Knitwear (4 SKUs)
  { mfg: 4, name: 'Cable Knit Fisherman Sweater',        cat: 'winterwear',   season: 'winter 2025',  price: 1799 },
  { mfg: 4, name: 'Turtle Neck Ribbed Pullover',         cat: 'winterwear',   season: 'winter 2025',  price: 1299 },
  { mfg: 4, name: 'Merino Wool Blend Socks 6-pack',      cat: 'accessories',  season: 'winter 2025',  price: 449 },
  { mfg: 4, name: 'Sherpa Fleece Track Suit',            cat: 'winterwear',   season: 'winter 2025',  price: 1649 },
];

const sizes = ['S', 'M', 'L', 'XL', 'XXL'];
const coloursByCat = {
  'ethnic wear':  [['Ivory', 'Coral Pink'], ['Emerald Green', 'Mustard'], ['Royal Blue', 'Maroon']],
  'casual wear':  [['White', 'Black'], ['Navy Blue', 'Olive Green']],
  'westernwear':  [['Black', 'Beige'], ['Denim Blue', 'White']],
  'winterwear':   [['Charcoal', 'Cream'], ['Burgundy', 'Camel']],
  'bottoms':      [['Black', 'Khaki'], ['Olive', 'Navy']],
  'innerwear':    [['White', 'Grey']],
  'accessories':  [['Grey Marl', 'Black']],
  'home decor':   [['Indigo Blue', 'Sand Beige']],
};

const skus = [];
let variantCount = 0;
const allVariants = []; // { id, skuId, mfgId, colour, size, stock }

for (const def of skuDefs) {
  const mfgId = mfgs[def.mfg].id;
  const r = await q(
    `INSERT INTO skus (manufacturer_id, name, category, season, base_price) VALUES ($1,$2,$3,$4,$5) RETURNING id`,
    [mfgId, def.name, def.cat, def.season, def.price]
  );
  const skuId = r.rows[0].id;
  skus.push({ id: skuId, mfgId, mfgIdx: def.mfg, ...def });

  const colourPairs = coloursByCat[def.cat] || [['White', 'Black']];
  const colours = colourPairs[0]; // use first pair for variants

  for (const colour of colours) {
    for (const size of sizes) {
      const stock = Math.floor(Math.random() * 80) + 20; // 20-100 units
      const vr = await q(
        `INSERT INTO sku_variants (sku_id, colour, size, current_stock) VALUES ($1,$2,$3,$4) RETURNING id`,
        [skuId, colour, size, stock]
      );
      allVariants.push({ id: vr.rows[0].id, skuId, mfgId, mfgIdx: def.mfg, colour, size, stock });
      variantCount++;
    }
  }
}
console.log(`✅ ${skus.length} SKUs, ${variantCount} variants\n`);

// ──────────────────────────────────────────────────────────────────────────────
// 6. SHIPMENTS + SELL-THROUGH EVENTS
// ──────────────────────────────────────────────────────────────────────────────
console.log('📦 Creating shipments and sell-through history (last 12 weeks)...');

// 3 retailers per manufacturer
const mfgRetailers = [
  [retailers[0], retailers[1], retailers[2]],   // Surat → Meena, Rajwadi, Silk Route
  [retailers[3], retailers[4], retailers[5]],   // Tirupur → Kaveri, Westend, Fusion
  [retailers[6], retailers[7], retailers[8]],   // Jaipur → Kamla, Noor, TrendZone
  [retailers[9], retailers[10], retailers[11]], // Delhi → Chandigarh, South Silk, Dilli Haat
  [retailers[12], retailers[13], retailers[14]],// Ludhiana → Bhopal, Rainbow, Nagpur
];

let stEventsCount = 0;

for (let mIdx = 0; mIdx < mfgs.length; mIdx++) {
  const mfgId = mfgs[mIdx].id;
  const mfgSkuVariants = allVariants.filter(v => v.mfgIdx === mIdx);
  const assignedRetailers = mfgRetailers[mIdx];

  for (const retailer of assignedRetailers) {
    // Create 1 shipment per retailer per manufacturer
    const shipResult = await q(
      `INSERT INTO shipments (manufacturer_id, retailer_id, total_units, credit_terms_days, shipped_at) VALUES ($1,$2,$3,45,NOW()-INTERVAL '60 days') RETURNING id`,
      [mfgId, retailer.id, 200]
    );
    const shipId = shipResult.rows[0].id;

    // Ship ALL variants for this manufacturer to test the ML properly
    for (const v of mfgSkuVariants) {
      // Ship 200 units of each variant
      const qty = Math.floor(Math.random() * 50) + 150;
      await q(
        `INSERT INTO shipment_lines (shipment_id, variant_id, quantity_shipped) VALUES ($1,$2,$3)`,
        [shipId, v.id, qty]
      );

      // 90 days of daily sell-through events over bulk insert (data_points >= 14 for Prophet)
      const stValues = [];
      const stParams = [];
      let pIdx = 1;

      for (let day = 1; day <= 90; day++) {
        const sold = Math.floor(Math.random() * 4);
        if (sold > 0) {
          stValues.push(`($${pIdx},$${pIdx+1},$${pIdx+2}, NOW()-($${pIdx+3}::int * INTERVAL '1 day'),'POS')`);
          stParams.push(v.id, retailer.id, sold, day);
          pIdx += 4;
          stEventsCount++;
        }
      }

      if (stValues.length > 0) {
        await q(
          `INSERT INTO sell_through_events (variant_id, retailer_id, units_sold, sold_at, source) VALUES ${stValues.join(',')}`,
          stParams
        );
      }
    }

    // Credit event
    await q(
      `INSERT INTO credit_events (retailer_id, manufacturer_id, event_type, amount, balance_after) VALUES ($1,$2,'shipment_credit',$3,$3)`,
      [retailer.id, mfgId, retailer.credit_used]
    );
  }
}
console.log(`✅ ${stEventsCount} sell-through events created\n`);

// ──────────────────────────────────────────────────────────────────────────────
// 7. STOCK UPDATES (so admin activity feed populates)
// ──────────────────────────────────────────────────────────────────────────────
console.log('📋 Creating stock update history for activity feed...');
const reasonCodes = ['Restock', 'Production Complete', 'Damaged', 'QC Failed', 'Return Received', 'Transfer Out'];
let suCount = 0;

// Use the first 20 variants for stock updates
for (const v of allVariants.slice(0, 20)) {
  const delta = Math.floor(Math.random() * 100) + 10;
  const reason = reasonCodes[Math.floor(Math.random() * reasonCodes.length)];
  const daysAgo = Math.floor(Math.random() * 30) + 1;
  await q(
    `INSERT INTO stock_updates (variant_id, quantity_delta, reason_code, created_at) VALUES ($1,$2,$3, NOW()-($4::int * INTERVAL '1 day'))`,
    [v.id, reason.includes('Damage') || reason.includes('QC') || reason.includes('Transfer') ? -delta : delta, reason, daysAgo]
  );
  suCount++;
}
console.log(`✅ ${suCount} stock update records\n`);

// ──────────────────────────────────────────────────────────────────────────────
// 8. ANOMALY FLAGS (10+ for admin dashboard)
// ──────────────────────────────────────────────────────────────────────────────
console.log('🚨 Creating anomaly flags...');
const anomalyDefs = [
  { etype: 'sku_variant', eid: allVariants[0].id, type: 'dead_stock_warning',      severity: 'critical', notes: 'Festive Bandhani Kurti Ivory/L has not sold in 18 days at Meena Boutique. 45 units at risk.' },
  { etype: 'retailer',    eid: retailers[4].id,   type: 'credit_risk',             severity: 'critical', notes: 'Westend Wardrobe credit utilisation at 88%. Payment 12 days overdue on last shipment.' },
  { etype: 'sku_variant', eid: allVariants[5].id,  type: 'zero_sell_through_cliff', severity: 'high',     notes: 'Modal Slub Kurti in Black/XS has 0 sales in 3 weeks at Rajwadi Fashions.' },
  { etype: 'retailer',    eid: retailers[9].id,   type: 'credit_risk',             severity: 'high',     notes: 'Chandigarh Style Hub credit utilisation 93% — near limit breach. Evaluate further shipments.' },
  { etype: 'sku_variant', eid: allVariants[10].id, type: 'low_stock',              severity: 'high',     notes: 'Basic Crew Neck Tee White/M at 22 units. Restock recommended within 1 week.' },
  { etype: 'sku_variant', eid: allVariants[2].id,  type: 'sudden_stock_spike',     severity: 'medium',   notes: 'Rayon Palazzo stock increased by 380 units in a single transaction. Verify entry.' },
  { etype: 'sku_variant', eid: allVariants[8].id,  type: 'repeated_damage',        severity: 'medium',   notes: 'Enzyme Washed Hoodie has 3 negative adjustments in 2 weeks. Quality investigation needed.' },
  { etype: 'manufacturer',eid: mfgs[2].id,         type: 'unusual_activity',       severity: 'medium',   notes: 'Jaipur Block Print House registered 12 stock updates outside business hours (2–5 AM).' },
  { etype: 'sku_variant', eid: allVariants[15].id, type: 'ghost_restock',          severity: 'low',      notes: 'Acid Wash Denim Jacket restocked with no linked shipment order. Possible data discrepancy.' },
  { etype: 'retailer',    eid: retailers[12].id,  type: 'credit_risk',             severity: 'low',      notes: 'Bhopal Ethnic Corner credit utilisation at 77%. Monitoring recommended.' },
  { etype: 'sku_variant', eid: allVariants[20].id, type: 'dead_stock_warning',     severity: 'high',     notes: 'Cable Knit Sweater Charcoal/XL idle for 22 days. Winter season ending — intervention needed.' },
  { etype: 'sku_variant', eid: allVariants[3].id,  type: 'low_stock',              severity: 'medium',   notes: 'Chanderi Silk Kurta Royal Blue/S at 24 units ahead of festive season demand peak.' },
];

for (const a of anomalyDefs) {
  const daysAgo = Math.floor(Math.random() * 14);
  await q(
    `INSERT INTO anomaly_flags (entity_type, entity_id, anomaly_type, severity, status, notes, created_at) VALUES ($1,$2,$3,$4,'pending',$5, NOW()-($6::int * INTERVAL '1 day'))`,
    [a.etype, a.eid, a.type, a.severity, a.notes, daysAgo]
  );
}
console.log(`✅ ${anomalyDefs.length} anomaly flags\n`);

// ──────────────────────────────────────────────────────────────────────────────
// SUMMARY
// ──────────────────────────────────────────────────────────────────────────────
console.log('═══════════════════════════════════════════');
console.log('✅ SEED COMPLETE!');
console.log(`   Manufacturers:     ${mfgs.length}`);
console.log(`   Retailers:         ${retailers.length}`);
console.log(`   SKUs:              ${skus.length}`);
console.log(`   Variants:          ${variantCount}`);
console.log(`   Sell-thru Events:  ${stEventsCount}`);
console.log(`   Stock Updates:     ${suCount}`);
console.log(`   Anomaly Flags:     ${anomalyDefs.length}`);
console.log('═══════════════════════════════════════════\n');

console.log('🔑 Login Credentials:');
console.log('   SELLER  → demo@inventix.com    / password123   → Surat Ethnic Wear Co.');
console.log('   SELLER2 → seller@inventix.com  / password123   → Tirupur Cotton Mills');
console.log('   ADMIN   → admin@inventix.com   / admin123      → Platform Admin');

pool.end();
