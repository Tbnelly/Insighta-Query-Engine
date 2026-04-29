'use strict';

const express = require('express');
const router  = express.Router();
const {
  redirectToGitHub,
  githubCallback,
  getCliToken,
  refreshTokens,
  logout,
} = require('../controllers/authController');
const authenticate    = require('../middleware/authenticate');
const { authLimiter } = require('../middleware/rateLimiter');

router.get('/github',          authLimiter, redirectToGitHub);
router.get('/github/callback', authLimiter, githubCallback);
router.get('/cli-token',       authLimiter, getCliToken);
router.post('/refresh',        authLimiter, refreshTokens);
router.post('/logout',         authenticate, logout);

module.exports = router;
