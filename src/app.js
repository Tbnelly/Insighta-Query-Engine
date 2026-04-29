'use strict';

const env = require('./config/env');

const express      = require('express');
const cors         = require('cors');
const cookieParser = require('cookie-parser');
const dotenv       = require('dotenv');
const connectDB    = require('./config/db');

dotenv.config();

const app = express();

// Security
app.use(require('helmet')());

// Request logger
app.use(require('./middleware/requestLogger'));

// Body parsers
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: false, limit: '10kb' }));
app.use(cookieParser());

// CORS
app.use(cors({
  origin:         env.clientUrl,
  credentials:    true,
  methods:        ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Version'],
}));

// DB connection per request (serverless compatible)
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    return res.status(503).json({ status: 'error', message: 'Database unavailable. Please try again.' });
  }
});

// ── Routes ────────────────────────────────────────────────────────────────────
// Auth: /auth/* (no api prefix — TRD spec)
app.use('/auth', require('./routes/auth'));

// API: /api/* (requires X-API-Version: 1 header)
app.use('/api', require('./routes/api'));

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'success', message: 'Insighta Query Engine — Stage 3', version: '1' });
});

// 404
app.use((req, res) => {
  res.status(404).json({ status: 'error', message: 'Route not found' });
});

// Error handler
app.use(require('./middleware/errorHandler'));

// Local dev server
if (env.nodeEnv !== 'production') {
  const PORT = env.port;
  connectDB().then(() => {
    app.listen(PORT, () => console.log(`[app] Server running → http://localhost:${PORT}`));
  });
}

module.exports = app;
