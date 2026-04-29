'use strict';

/**
 * src/middleware/rateLimiter.js
 * ------------------------------
 * Separate rate limiters for different route categories.
 *
 * Why different limits per route?
 * A blanket "100 requests per 15 min" is too loose for auth endpoints
 * (an attacker can try 100 passwords) and potentially too tight for
 * data endpoints (a legitimate analyst running reports).
 *
 * Auth limiter   — very strict: 10 attempts per 15 min per IP
 *                  Brute-force protection for login endpoints
 *
 * API limiter    — moderate: 100 requests per 15 min per IP
 *                  Normal usage for querying profiles
 *
 * Export limiter — strict: 10 exports per hour per IP
 *                  Exports are expensive DB operations
 */

const rateLimit = require('express-rate-limit');

const authLimiter = rateLimit({
  windowMs:       15 * 60 * 1000, // 15 minutes
  max:            10,
  standardHeaders: true,
  legacyHeaders:  false,
  message: {
    status:  'error',
    message: 'Too many login attempts. Please wait 15 minutes and try again.',
  },
});

const apiLimiter = rateLimit({
  windowMs:       15 * 60 * 1000,
  max:            100,
  standardHeaders: true,
  legacyHeaders:  false,
  message: {
    status:  'error',
    message: 'Too many requests. Please wait and try again.',
  },
});

const exportLimiter = rateLimit({
  windowMs:       60 * 60 * 1000, // 1 hour
  max:            10,
  standardHeaders: true,
  legacyHeaders:  false,
  message: {
    status:  'error',
    message: 'Export limit reached. You can export up to 10 times per hour.',
  },
});

module.exports = { authLimiter, apiLimiter, exportLimiter };
