'use strict';

/**
 * src/app.js — Stage 3 Final (Phase 6 Security Hardened)
 * -------------------------------------------------------
 * Middleware order is load-bearing — do not reorder:
 *
 *  1. Helmet       — sets 14 security HTTP headers
 *  2. Request logger
 *  3. Body parsers + cookies
 *  4. CORS         — must run before routes
 *  5. Routes       — each route has its own rate limiter + validator
 *  6. 404 handler
 *  7. Error handler — must be last, must have 4 params
 *
 * Rate limiting is now applied PER ROUTE GROUP, not globally:
 *  - Auth routes:   10 req / 15 min  (brute-force protection)
 *  - API routes:   100 req / 15 min  (normal usage)
 *  - Export routes: 10 req / hour    (expensive operations)
 */

const env = require('./config/env');

const express      = require('express');
const cors         = require('cors');
const cookieParser = require('cookie-parser');
const dotenv       = require('dotenv');
const connectDB    = require('./config/db');

dotenv.config();
connectDB();

const app = express();

// ── 1. Helmet — secure HTTP headers ─────────────────────────────────────────
// Sets headers like: Content-Security-Policy, X-Frame-Options,
// X-Content-Type-Options, Strict-Transport-Security, etc.
app.use(require('helmet')());

// ── 2. Request logger ────────────────────────────────────────────────────────
app.use(require('./middleware/requestLogger'));

// ── 3. Body parsers + cookies ────────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));        // reject bodies > 10kb
app.use(express.urlencoded({ extended: false, limit: '10kb' }));
app.use(cookieParser());

// ── 4. CORS ──────────────────────────────────────────────────────────────────
// Only allow requests from the web portal origin.
// credentials:true is required for the refresh token cookie to be sent.
app.use(cors({
  origin:      env.clientUrl,
  credentials: true,
  methods:     ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ── 5. API v1 Routes ─────────────────────────────────────────────────────────
// Each route file applies its own rate limiter + validation internally
app.use('/api/v1/auth',     require('./routes/v1/auth'));
app.use('/api/v1/profiles', require('./routes/v1/profiles'));
app.use('/api/v1/export',   require('./routes/v1/export'));

// ── 6. Health check ──────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    status:  'success',
    message: 'Insighta Query Engine — Stage 3',
    version: 'v1',
  });
});

// Debug endpoint — disabled in production
app.get('/debug', (req, res) => {
  if (env.nodeEnv === 'production') return res.status(404).end();
  res.json({
    node_env:              env.nodeEnv,
    mongo_uri_set:         !!env.mongoUri,
    github_client_id_set:  !!env.github.clientId,
    jwt_access_secret_set: !!env.jwt.accessSecret,
  });
});

// ── 7. 404 ───────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ status: 'error', message: 'Route not found' });
});

// ── 8. Global error handler (must be last, must have 4 params) ───────────────
app.use(require('./middleware/errorHandler'));

// ── Start server (skip in production — use a process manager like PM2) ───────
if (env.nodeEnv !== 'production') {
  const PORT = env.port;
  app.listen(PORT, () => {
    console.log(`[app] Server running → http://localhost:${PORT}`);
    console.log(`[app] Environment   → ${env.nodeEnv}`);
  });
}

module.exports = app;
