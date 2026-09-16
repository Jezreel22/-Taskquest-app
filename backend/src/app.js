'use strict';

const express    = require('express');
const helmet     = require('helmet');
const cors       = require('cors');
const morgan     = require('morgan');
const rateLimit  = require('express-rate-limit');

const authRoutes         = require('./routes/authRoutes');
const taskRoutes         = require('./routes/taskRoutes');
const gamificationRoutes = require('./routes/gamificationRoutes');
const globalErrorHandler = require('./middleware/errorHandler');
const AppError           = require('./utils/AppError');
const {
  RATE_LIMIT_WINDOW_MS,
  RATE_LIMIT_MAX_REQUESTS,
} = require('./config/constants');

const app = express();

// ─── Security headers ─────────────────────────────────────────────────────────
app.use(helmet());

// ─── CORS ─────────────────────────────────────────────────────────────────────
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      // Allow tool-less requests (Postman, server-to-server) in development
      if (!origin || allowedOrigins.length === 0) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`CORS: Origin "${origin}" not allowed.`));
    },
    credentials: true,
  })
);

// ─── Global rate limiter ──────────────────────────────────────────────────────
app.use(
  rateLimit({
    windowMs: RATE_LIMIT_WINDOW_MS,
    max: RATE_LIMIT_MAX_REQUESTS,
    message: { status: 'fail', message: 'Too many requests from this IP. Please slow down.' },
    standardHeaders: true,
    legacyHeaders: false,
  })
);

// ─── Body parsing ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// ─── Logging ──────────────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.status(200).json({
    status:  'ok',
    service: 'TaskQuest API',
    version: '1.0.0',
    uptime:  process.uptime(),
    ts:      new Date().toISOString(),
  });
});

// ─── API routes ───────────────────────────────────────────────────────────────
const API_PREFIX = '/api/v1';

app.use(`${API_PREFIX}/auth`,          authRoutes);
app.use(`${API_PREFIX}/tasks`,         taskRoutes);
app.use(`${API_PREFIX}/gamification`,  gamificationRoutes);

// ─── 404 handler ──────────────────────────────────────────────────────────────
app.all('*', (req, res, next) => {
  next(new AppError(`Route ${req.method} ${req.originalUrl} not found.`, 404, 'NOT_FOUND'));
});

// ─── Global error handler ─────────────────────────────────────────────────────
app.use(globalErrorHandler);

module.exports = app;
