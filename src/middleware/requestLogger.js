'use strict';

/**
 * src/middleware/requestLogger.js
 * --------------------------------
 * HTTP request logging using morgan.
 *
 * In development: colourised "dev" format  →  GET /api/v1/profiles 200 12ms
 * In production:  "combined" format        →  Apache-style log line with IP,
 *                                             user-agent, timestamp — suitable
 *                                             for log aggregators (Datadog, etc.)
 *
 * We intentionally do NOT log request bodies — they can contain
 * tokens, passwords, or PII. The URL + status + duration is enough
 * to debug 99% of issues without a security risk.
 */

let morgan;
try {
  morgan = require('morgan');
} catch {
  // morgan not installed — return a no-op middleware
  module.exports = (req, res, next) => next();
  return;
}

const { nodeEnv } = require('../config/env');

const format = nodeEnv === 'production' ? 'combined' : 'dev';

module.exports = morgan(format);
