import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import cors from 'cors';
import authRouter from './routes/auth.js';
import inventoryRouter from './routes/inventory.js';
import retailersRouter from './routes/retailers.js';
import alertsRouter from './routes/alerts.js';
import adminRouter from './routes/admin.js';
import { startAlertEngine } from './services/alertEngine.js';
import { requireAuth } from './middleware/auth.js';
import { createProxyMiddleware } from 'http-proxy-middleware';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
  }
});

io.on('connection', (socket) => {
  console.log(`[Socket.IO] Client connected: ${socket.id}`);
  socket.on('disconnect', () => {
    console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
  });
});

// Inject io into request context so routes can emit events
app.use((req, res, next) => {
  req.io = io;
  next();
});

app.use('/api/auth', authRouter);
app.use('/api/inventory', inventoryRouter);
app.use('/api/retailers', retailersRouter);
app.use('/api/alerts', alertsRouter);
app.use('/api/admin', adminRouter);

const ML_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';
app.use('/api/ml', requireAuth, createProxyMiddleware({
  target: ML_URL,
  changeOrigin: true,
  pathRewrite: { '^/api/ml': '' },
  onError: (err, req, res) => {
    res.status(502).json({ error: 'Failed to access ML microservice engine' });
  }
}));

app.get('/api/health', (req, res) => {
  res.json({
    status: "ok",
    service: "inventix-api",
    timestamp: new Date()
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`InvenTiX API running on port ${PORT}`);
  startAlertEngine(io);
});
