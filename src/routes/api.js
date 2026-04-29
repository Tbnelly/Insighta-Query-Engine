'use strict';

/**
 * API routes — TRD paths (all under /api/):
 * GET  /api/profiles
 * GET  /api/profiles/search
 * GET  /api/profiles/export
 * GET  /api/profiles/:id
 * POST /api/profiles  (admin only)
 * GET  /api/users/me
 */

const express    = require('express');
const router     = express.Router();
const { getAllProfiles, searchProfiles, createProfile, getProfileById } = require('../controllers/profileController');
const { exportProfiles } = require('../controllers/exportController');
const { getMe }          = require('../controllers/authController');
const authenticate       = require('../middleware/authenticate');
const authorize          = require('../middleware/authorize');
const apiVersion         = require('../middleware/apiVersion');
const { apiLimiter }     = require('../middleware/rateLimiter');

// All /api/* routes require: rate limit + api version header + authentication
router.use(apiLimiter);
router.use(apiVersion);
router.use(authenticate);

// /api/users/me
router.get('/users/me', getMe);

// /api/profiles
router.get('/profiles/search',         authorize('admin', 'analyst'), searchProfiles);
router.get('/profiles/export',         authorize('admin', 'analyst'), exportProfiles);
router.get('/profiles/:id',            authorize('admin', 'analyst'), getProfileById);
router.get('/profiles',                authorize('admin', 'analyst'), getAllProfiles);
router.post('/profiles',               authorize('admin'),            createProfile);

module.exports = router;
