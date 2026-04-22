const express = require('express');
const router = express.Router();
const { getAllProfiles, searchProfiles } = require('../controllers/profileController');

// IMPORTANT: /search must be defined BEFORE /:id
// Otherwise Express matches "search" as an id parameter
router.get('/search', searchProfiles);
router.get('/', getAllProfiles);

module.exports = router;