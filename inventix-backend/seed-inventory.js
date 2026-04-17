import pkg from 'pg';
const { Pool } = pkg;
const p = new Pool({ connectionString: 'postgresql://neondb_owner:npg_8u5NdXxVEzMH@ep-nameless-resonance-anir5zmo.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require' });

const MFG_ID = '940418c6-a58e-4339-b902-281d6b0c2b2e'; // Surat Kurti House

// ── 1. Get or create 3 retailers linked to this manufacturer ──
const retailers = [
  { name: 'Meena Boutique', city: 'Mumbai', state: 'Maharashtra', credit_limit: 250000, risk_score: 28 },
  { name: 'Rajwadi Fashions', city: 'Jaipur', state: 'Rajasthan', credit_limit: 180000, risk_score: 55 },
  { name: 'Silk Route Stores', city: 'Bangalore', state: 'Karnataka', credit_limit: 320000, risk_score: 12 },
];

const retailerIds = [];
for (const r of retailers) {
  const res = await p.query(
    `INSERT INTO retailers (name, city, state, credit_limit, credit_used, risk_score)
     VALUES ($1, $2, $3, $4, $5*0.4, $6)
     ON CONFLICT DO NOTHING
     RETURNING id`,
    [r.name, r.city, r.state, r.credit_limit, r.credit_limit, r.risk_score]
  );
  if (res.rows[0]) {
    retailerIds.push(res.rows[0].id);
    console.log(`Retailer created: ${r.name} → ${res.rows[0].id}`);
  } else {
    const ex = await p.query(`SELECT id FROM retailers WHERE name=$1`, [r.name]);
    retailerIds.push(ex.rows[0].id);
    console.log(`Retailer exists: ${r.name} → ${ex.rows[0].id}`);
  }
}

// ── 2. Create SKUs with realistic Indian fashion data ──
const skuDefs = [
  { name: 'Bandhani Anarkali Kurti', category: 'ethnic wear', season: 'festive 2025', base_price: 849 },
  { name: 'Cotton Lucknowi Chikankari Suit', category: 'ethnic wear', season: 'summer 2025', base_price: 1299 },
  { name: 'Rayon Printed Palazzo Set', category: 'bottoms', season: 'all-season', base_price: 699 },
  { name: 'Chanderi Silk Kurta', category: 'ethnic wear', season: 'festive 2025', base_price: 1599 },
  { name: 'Modal Slub Casual Kurti', category: 'casual wear', season: 'summer 2025', base_price: 549 },
];

const sizes = ['S', 'M', 'L', 'XL', 'XXL'];
const colours = [
  ['Ivory', 'Coral Pink'],
  ['White', 'Sky Blue'],
  ['Terracotta', 'Olive Green'],
  ['Mint Green', 'Rose Gold'],
  ['Navy Blue', 'Charcoal'],
];

const skuIds = [];
for (let i = 0; i < skuDefs.length; i++) {
  const def = skuDefs[i];
  let skuId;
  const ex = await p.query(`SELECT id FROM skus WHERE name=$1 AND manufacturer_id=$2`, [def.name, MFG_ID]);
  if (ex.rows[0]) {
    skuId = ex.rows[0].id;
    console.log(`SKU exists: ${def.name}`);
  } else {
    const res = await p.query(
      `INSERT INTO skus (manufacturer_id, name, category, season, base_price) VALUES ($1,$2,$3,$4,$5) RETURNING id`,
      [MFG_ID, def.name, def.category, def.season, def.base_price]
    );
    skuId = res.rows[0].id;
    console.log(`SKU created: ${def.name} → ${skuId}`);
  }
  skuIds.push({ id: skuId, ...def, colours: colours[i] });
}

// ── 3. Create variants and seed sell-through events ──
const variantIds = [];
for (const sku of skuIds) {
  for (const colour of sku.colours) {
    for (const size of sizes) {
      const stock = Math.floor(Math.random() * 60) + 15; // 15–75 units realistic
      const ex = await p.query(`SELECT id FROM sku_variants WHERE sku_id=$1 AND colour=$2 AND size=$3`, [sku.id, colour, size]);
      let vId;
      if (ex.rows[0]) {
        vId = ex.rows[0].id;
      } else {
        const res = await p.query(
          `INSERT INTO sku_variants (sku_id, colour, size, current_stock) VALUES ($1,$2,$3,$4) RETURNING id`,
          [sku.id, colour, size, stock]
        );
        vId = res.rows[0].id;
      }
      variantIds.push(vId);

      // Seed stock_updates (restock history)
      await p.query(
        `INSERT INTO stock_updates (variant_id, quantity_delta, reason_code, created_at) VALUES ($1,$2,'Production Complete', NOW()-INTERVAL '${Math.floor(Math.random()*30+1)} days')`,
        [vId, stock]
      ).catch(() => {});

      // Seed sell-through events across 4 weeks
      for (const retailerId of retailerIds) {
        for (let week = 1; week <= 4; week++) {
          const sold = Math.floor(Math.random() * 8) + 1; // 1–8 per week realistic
          await p.query(
            `INSERT INTO sell_through_events (variant_id, retailer_id, units_sold, sold_at, source) VALUES ($1,$2,$3, NOW()-INTERVAL '${week*7} days','POS')`,
            [vId, retailerId, sold]
          ).catch(() => {});
        }
      }
    }
  }
}

// ── 4. Create shipments ──
for (const retailerId of retailerIds) {
  const ex = await p.query(`SELECT id FROM shipments WHERE manufacturer_id=$1 AND retailer_id=$2 LIMIT 1`, [MFG_ID, retailerId]);
  if (!ex.rows[0]) {
    const ship = await p.query(
      `INSERT INTO shipments (manufacturer_id, retailer_id, total_units, credit_terms_days) VALUES ($1,$2,$3,45) RETURNING id`,
      [MFG_ID, retailerId, 120]
    );
    const shipId = ship.rows[0].id;
    // Ship a sample of variants
    const sample = variantIds.slice(0, 8);
    for (const vId of sample) {
      await p.query(
        `INSERT INTO shipment_lines (shipment_id, variant_id, quantity_shipped) VALUES ($1,$2,$3)`,
        [shipId, vId, Math.floor(Math.random()*15)+5]
      ).catch(() => {});
    }
    console.log(`Shipment created to retailer ${retailerId}`);
  }
}

// ── 5. Credit events ──
for (const retailerId of retailerIds) {
  const ex = await p.query(`SELECT id FROM credit_events WHERE manufacturer_id=$1 AND retailer_id=$2 LIMIT 1`, [MFG_ID, retailerId]);
  if (!ex.rows[0]) {
    const limit = retailers[retailerIds.indexOf(retailerId)]?.credit_limit || 200000;
    const creditUsed = Math.floor(limit * 0.4);
    await p.query(
      `INSERT INTO credit_events (retailer_id, manufacturer_id, event_type, amount, balance_after) VALUES ($1,$2,'shipment_credit',$3,$3)`,
      [retailerId, MFG_ID, creditUsed]
    ).catch(() => {});
  }
}

console.log('\n✅ Seed complete!');
console.log(`  SKUs: ${skuIds.length}`);
console.log(`  Variants: ${variantIds.length}`);
console.log(`  Retailers: ${retailerIds.length}`);
p.end();
