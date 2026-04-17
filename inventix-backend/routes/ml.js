import express from 'express';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.use(requireAuth);

const ML_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

// Generic ML proxy — forwards request body, returns ML JSON response
const proxyToML = async (path, method = 'GET', body = null) => {
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body) options.body = JSON.stringify(body);
  const res = await fetch(`${ML_URL}${path}`, options);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw { status: res.status, detail: err.detail || 'ML service error' };
  }
  return res.json();
};

// GET /api/ml/restock-signals
router.get('/restock-signals', async (req, res) => {
  try {
    const data = await proxyToML('/demand/restock-signals');
    res.json(data);
  } catch (err) {
    res.status(err.status || 502).json({ error: err.detail || 'Failed to reach ML service' });
  }
});

// POST /api/ml/forecast
router.post('/forecast', async (req, res) => {
  try {
    const data = await proxyToML('/demand/forecast', 'POST', req.body);
    res.json(data);
  } catch (err) {
    res.status(err.status || 502).json({ error: err.detail || 'Failed to reach ML service' });
  }
});

// POST /api/ml/anomaly/scan
router.post('/anomaly/scan', async (req, res) => {
  try {
    const data = await proxyToML('/anomaly/scan', 'POST', req.body);
    res.json(data);
  } catch (err) {
    res.status(err.status || 502).json({ error: err.detail || 'Failed to reach ML service' });
  }
});

// GET /api/ml/anomaly/risk-scores
router.get('/anomaly/risk-scores', async (req, res) => {
  try {
    const data = await proxyToML('/anomaly/risk-scores');
    res.json(data);
  } catch (err) {
    res.status(err.status || 502).json({ error: err.detail || 'Failed to reach ML service' });
  }
});

// POST /api/ml/simulation/run
router.post('/simulation/run', async (req, res) => {
  try {
    const data = await proxyToML('/simulation/run', 'POST', req.body);
    res.json(data);
  } catch (err) {
    res.status(err.status || 502).json({ error: err.detail || 'Failed to reach ML service' });
  }
});

export default router;
