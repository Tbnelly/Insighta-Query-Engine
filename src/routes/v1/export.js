'use strict';

/**
 * src/routes/v1/export.js
 * ------------------------
 * Phase 6: added export-specific rate limiter and input validation.
 * Exports are expensive DB operations — limited to 10 per hour per IP.
 */

const express  = require('express');
const router   = express.Router();
const { exportProfiles }    = require('../../controllers/exportController');
const authenticate          = require('../../middleware/authenticate');
const authorize             = require('../../middleware/authorize');
const { validateExport }    = require('../../middleware/validate');
const { exportLimiter }     = require('../../middleware/rateLimiter');

router.get(
  '/profiles',
  exportLimiter,
  authenticate,
  authorize('admin', 'analyst'),
  validateExport,
  exportProfiles
);

module.exports = router;
