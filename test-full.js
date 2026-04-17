
const API = 'http://localhost:5000/api';
const ML = 'http://localhost:8000';
let pass = 0, fail = 0;

function log(test, ok, detail) {
  const s = ok ? '✅ PASS' : '❌ FAIL';
  console.log(`${s} — ${test}${detail ? ': ' + detail : ''}`);
  ok ? pass++ : fail++;
}

async function j(r) { try { return await r.json(); } catch { return null; } }

async function run() {
  console.log('\n══════════════════════════════════════════');
  console.log(' INVENTIX END-TO-END VERIFICATION');
  console.log('══════════════════════════════════════════\n');

  // ── 1. Health ──
  try {
    const h = await fetch(`${API}/health`).then(r => r.json());
    log('Backend /api/health', h.status === 'ok', JSON.stringify(h));
  } catch (e) { log('Backend /api/health', false, e.message); }

  try {
    const h = await fetch(`${ML}/health`).then(r => r.json());
    log('ML /health', h.status === 'ok', JSON.stringify(h));
  } catch (e) { log('ML /health', false, e.message); }

  // ── 2. Auth — Register seller ──
  let sellerToken, sellerId, mfgId;
  try {
    // Get a manufacturer ID from the DB first
    const mfgRes = await fetch(`${API}/health`); // just to warm up
    
    // Register a seller linked to first manufacturer
    const reg = await fetch(`${API}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: `seller_test_${Date.now()}@inventix.com`, password: 'Test1234!', role: 'manufacturer' })
    });
    const regData = await j(reg);
    sellerToken = regData?.token;
    sellerId = regData?.user?.id;
    log('Auth: Register manufacturer', !!sellerToken, regData?.user?.email);
  } catch (e) { log('Auth: Register manufacturer', false, e.message); }

  // ── 3. Auth — Register admin ──
  let adminToken;
  try {
    const reg = await fetch(`${API}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: `admin_test_${Date.now()}@inventix.com`, password: 'Admin1234!', role: 'admin' })
    });
    const regData = await j(reg);
    adminToken = regData?.token;
    log('Auth: Register admin', !!adminToken, regData?.user?.email);
  } catch (e) { log('Auth: Register admin', false, e.message); }

  // ── 4. Auth — GET /me ──
  if (sellerToken) {
    try {
      const me = await fetch(`${API}/auth/me`, {
        headers: { 'Authorization': `Bearer ${sellerToken}` }
      }).then(r => r.json());
      log('Auth: GET /me', !!me?.id, me?.email);
    } catch (e) { log('Auth: GET /me', false, e.message); }
  }

  const auth = (token) => ({ 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' });

  // ── 5. Inventory routes ──
  let skus = [], variantId;
  if (sellerToken) {
    try {
      const res = await fetch(`${API}/inventory`, { headers: auth(sellerToken) });
      skus = await j(res);
      const isArr = Array.isArray(skus);
      log('Inventory: GET /inventory', isArr, `${isArr ? skus.length : 0} SKUs`);
      if (isArr && skus.length > 0 && skus[0].variants?.length > 0) {
        variantId = skus[0].variants[0].id;
      }
    } catch (e) { log('Inventory: GET /inventory', false, e.message); }

    // Stock update
    if (variantId) {
      try {
        const res = await fetch(`${API}/inventory/update`, {
          method: 'POST',
          headers: auth(sellerToken),
          body: JSON.stringify({ variant_id: variantId, quantity_delta: 5, reason_code: 'Restock' })
        });
        const data = await j(res);
        log('Inventory: POST /update', res.ok, `variant ${variantId} updated`);
      } catch (e) { log('Inventory: POST /update', false, e.message); }

      // Timeline
      if (skus.length > 0) {
        try {
          const res = await fetch(`${API}/inventory/${skus[0].id}/timeline`, { headers: auth(sellerToken) });
          const data = await j(res);
          log('Inventory: GET /timeline', Array.isArray(data), `${data?.length || 0} events`);
        } catch (e) { log('Inventory: GET /timeline', false, e.message); }
      }
    }
  }

  // ── 6. Retailer routes ──
  let retailers = [], retailerId;
  if (sellerToken) {
    try {
      const res = await fetch(`${API}/retailers`, { headers: auth(sellerToken) });
      retailers = await j(res);
      const isArr = Array.isArray(retailers);
      log('Retailers: GET /retailers', isArr, `${isArr ? retailers.length : 0} retailers`);
      if (isArr && retailers.length > 0) retailerId = retailers[0].id;
    } catch (e) { log('Retailers: GET /retailers', false, e.message); }

    if (retailerId) {
      try {
        const res = await fetch(`${API}/retailers/${retailerId}`, { headers: auth(sellerToken) });
        const data = await j(res);
        log('Retailers: GET /:id detail', res.ok, data?.name || 'ok');
      } catch (e) { log('Retailers: GET /:id detail', false, e.message); }

      try {
        const res = await fetch(`${API}/retailers/${retailerId}/credit`, { headers: auth(sellerToken) });
        const data = await j(res);
        log('Retailers: GET /:id/credit', res.ok, `${Array.isArray(data) ? data.length : '?'} events`);
      } catch (e) { log('Retailers: GET /:id/credit', false, e.message); }
    }
  }

  // ── 7. Alerts route ──
  if (sellerToken) {
    try {
      const res = await fetch(`${API}/alerts`, { headers: auth(sellerToken) });
      const data = await j(res);
      log('Alerts: GET /alerts', res.ok, `${Array.isArray(data) ? data.length : '?'} alerts`);
    } catch (e) { log('Alerts: GET /alerts', false, e.message); }
  }

  // ── 8. Admin routes ──
  if (adminToken) {
    try {
      const res = await fetch(`${API}/admin/feed`, { headers: auth(adminToken) });
      const data = await j(res);
      log('Admin: GET /feed', res.ok, `${Array.isArray(data) ? data.length : '?'} events`);
    } catch (e) { log('Admin: GET /feed', false, e.message); }

    try {
      const res = await fetch(`${API}/admin/anomalies`, { headers: auth(adminToken) });
      const data = await j(res);
      log('Admin: GET /anomalies', res.ok, `${Array.isArray(data) ? data.length : '?'} anomalies`);
    } catch (e) { log('Admin: GET /anomalies', false, e.message); }

    try {
      const res = await fetch(`${API}/admin/analytics`, { headers: auth(adminToken) });
      const data = await j(res);
      log('Admin: GET /analytics', res.ok, JSON.stringify(data).slice(0, 80));
    } catch (e) { log('Admin: GET /analytics', false, e.message); }

    try {
      const res = await fetch(`${API}/admin/audit`, { headers: auth(adminToken) });
      const data = await j(res);
      log('Admin: GET /audit', res.ok, `${Array.isArray(data) ? data.length : '?'} entries`);
    } catch (e) { log('Admin: GET /audit', false, e.message); }
  }

  // ── 9. ML routes ──
  try {
    const res = await fetch(`${ML}/demand/restock-signals`);
    const data = await j(res);
    log('ML: GET /demand/restock-signals', res.ok, `${Array.isArray(data) ? data.length : '?'} signals`);
  } catch (e) { log('ML: GET /demand/restock-signals', false, e.message); }

  if (variantId && retailerId) {
    try {
      const res = await fetch(`${ML}/demand/forecast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ variant_id: variantId, retailer_id: retailerId, weeks_ahead: 4 })
      });
      const data = await j(res);
      log('ML: POST /demand/forecast', res.ok, data?.reason || `${data?.forecast?.length} weeks`);
    } catch (e) { log('ML: POST /demand/forecast', false, e.message); }
  }

  try {
    const res = await fetch(`${ML}/simulation/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ manufacturer_id: 'any', scenario: 'demand_spike', parameters: { demand_multiplier: 2.0 } })
    });
    const data = await j(res);
    log('ML: POST /simulation/run (demand_spike)', res.ok, data?.risk_level || data?.detail || 'ok');
  } catch (e) { log('ML: POST /simulation/run', false, e.message); }

  try {
    const res = await fetch(`${ML}/simulation/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ manufacturer_id: 'any', scenario: 'supply_delay', parameters: { delay_days: 10 } })
    });
    const data = await j(res);
    log('ML: POST /simulation/run (supply_delay)', res.ok, data?.risk_level || 'ok');
  } catch (e) { log('ML: POST /simulation (supply_delay)', false, e.message); }

  try {
    const res = await fetch(`${ML}/simulation/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ manufacturer_id: 'any', scenario: 'festival_surge', parameters: { festival: 'Diwali', weeks_until: 4 } })
    });
    const data = await j(res);
    log('ML: POST /simulation/run (festival_surge)', res.ok, data?.risk_level || 'ok');
  } catch (e) { log('ML: POST /simulation (festival_surge)', false, e.message); }

  try {
    const res = await fetch(`${ML}/anomaly/risk-scores`);
    const data = await j(res);
    log('ML: GET /anomaly/risk-scores', res.ok, `${Array.isArray(data) ? data.length : '?'} scores`);
  } catch (e) { log('ML: GET /anomaly/risk-scores', false, e.message); }

  // ── Summary ──
  console.log('\n══════════════════════════════════════════');
  console.log(` RESULTS: ${pass} PASSED, ${fail} FAILED out of ${pass + fail}`);
  console.log('══════════════════════════════════════════\n');
}

run();
