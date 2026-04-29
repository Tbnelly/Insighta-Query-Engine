'use strict';

const env = require('./config/env');

const express      = require('express');
const cors         = require('cors');
const cookieParser = require('cookie-parser');
const dotenv       = require('dotenv');
const connectDB    = require('./config/db');

dotenv.config();

const app = express();

// ── Security ─────────────────────────────────────────────────────────────────
app.use(require('helmet')());

// ── Request logger ────────────────────────────────────────────────────────────
app.use(require('./middleware/requestLogger'));

// ── Body parsers ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: false, limit: '10kb' }));
app.use(cookieParser());

// ── CORS ──────────────────────────────────────────────────────────────────────
app.use(cors({
  origin:         env.clientUrl,
  credentials:    true,
  methods:        ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ── DB connection middleware ──────────────────────────────────────────────────
// On Vercel each request may hit a cold function — we connect here
// so the DB is ready before any route handler runs.
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    return res.status(503).json({
      status:  'error',
      message: 'Database unavailable. Please try again.',
    });
  }
});

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/v1/auth',     require('./routes/v1/auth'));
app.use('/api/v1/profiles', require('./routes/v1/profiles'));
app.use('/api/v1/export',   require('./routes/v1/export'));

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({ status: 'success', message: 'Insighta Query Engine — Stage 3', version: 'v1' });
});

app.get('/debug', (req, res) => {
  if (env.nodeEnv === 'production') return res.status(404).end();
  res.json({
    node_env:              env.nodeEnv,
    mongo_uri_set:         !!env.mongoUri,
    github_client_id_set:  !!env.github.clientId,
    jwt_access_secret_set: !!env.jwt.accessSecret,
  });
});

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ status: 'error', message: 'Route not found' });
});

// ── Error handler ─────────────────────────────────────────────────────────────
app.use(require('./middleware/errorHandler'));

// ── Local dev server ──────────────────────────────────────────────────────────
if (env.nodeEnv !== 'production') {
  const PORT = env.port;
  connectDB().then(() => {
    app.listen(PORT, () => {
      console.log(`[app] Server running → http://localhost:${PORT}`);
    });
  });
}

module.exports = app;