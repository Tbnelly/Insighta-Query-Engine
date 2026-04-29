'use strict';

/**
 * src/routes/v1/auth.js
 * ----------------------
 * Phase 6: auth routes now use the strict authLimiter (10 req / 15 min).
 * This prevents brute-force attacks on the login flow.
 */

const express = require('express');
const router  = express.Router();
const {
  redirectToGitHub,
  githubCallback,
  getCliToken,
  refreshTokens,
  logout,
  getMe,
} = require('../../controllers/authController');
const authenticate          = require('../../middleware/authenticate');
const { authLimiter }       = require('../../middleware/rateLimiter');

// ── Public ───────────────────────────────────────────────────────────────────
router.get('/github',          authLimiter, redirectToGitHub);
router.get('/github/callback', authLimiter, githubCallback);
router.get('/cli-token',       authLimiter, getCliToken);
router.post('/refresh',        authLimiter, refreshTokens);

// ── Protected ────────────────────────────────────────────────────────────────
router.post('/logout', authenticate, logout);
router.get('/me',      authenticate, getMe);

module.exports = router;
