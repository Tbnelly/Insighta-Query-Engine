'use strict';

/**
 * src/routes/v1/profiles.js
 * --------------------------
 * Stage 3 Phase 6: added input validation middleware to every route.
 * Controller logic untouched.
 */

const express  = require('express');
const router   = express.Router();
const { getAllProfiles, searchProfiles } = require('../../controllers/profileController');
const authenticate  = require('../../middleware/authenticate');
const authorize     = require('../../middleware/authorize');
const { validateProfiles, validateSearch } = require('../../middleware/validate');
const { apiLimiter } = require('../../middleware/rateLimiter');

router.get(
  '/search',
  apiLimiter,
  authenticate,
  authorize('admin', 'analyst'),
  validateSearch,
  searchProfiles
);

router.get(
  '/',
  apiLimiter,
  authenticate,
  authorize('admin', 'analyst'),
  validateProfiles,
  getAllProfiles
);

module.exports = router;
