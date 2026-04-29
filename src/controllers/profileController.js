'use strict';

/**
 * src/controllers/profileController.js
 * TRD-compliant: GET /api/profiles, GET /api/profiles/search
 * POST /api/profiles (admin only)
 */

const Profile  = require('../models/profile');
const { buildProfileQuery } = require('../services/queryBuilder');
const { parseNaturalLanguage } = require('../parser/nlParser');
const respond  = require('../utils/apiResponse');

// GET /api/profiles
const getAllProfiles = async (req, res, next) => {
  try {
    const built = buildProfileQuery(req.query);
    if (built.errors) return respond.error(res, built.errors.join(', '), 422);

    const { filter, sort, skip, limit, page } = built;
    const [total, data] = await Promise.all([
      Profile.countDocuments(filter),
      Profile.find(filter).sort(sort).skip(skip).limit(limit).select('-_id -__v'),
    ]);

    return respond.paginated(res, data, { page, limit, total }, '/api/profiles');
  } catch (err) { next(err); }
};

// GET /api/profiles/search
const searchProfiles = async (req, res, next) => {
  try {
    const { q, page, limit } = req.query;
    if (!q || q.trim() === '') return respond.error(res, 'Missing or empty parameter: q', 400);

    const parsed = parseNaturalLanguage(q);
    if (parsed.error) return respond.error(res, parsed.error, 422);

    const parsedPage  = Math.max(1, Number(page)  || 1);
    const parsedLimit = Math.min(50, Math.max(1, Number(limit) || 10));
    const skip        = (parsedPage - 1) * parsedLimit;

    const [total, data] = await Promise.all([
      Profile.countDocuments(parsed.filter),
      Profile.find(parsed.filter).sort({ created_at: -1 }).skip(skip).limit(parsedLimit).select('-_id -__v'),
    ]);

    return respond.paginated(res, data, { page: parsedPage, limit: parsedLimit, total }, '/api/profiles/search');
  } catch (err) { next(err); }
};

// POST /api/profiles (admin only) — calls external APIs like Stage 1
const createProfile = async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) return respond.error(res, 'name is required', 400);

    // Check duplicate
    const existing = await Profile.findOne({ name: name.trim() });
    if (existing) return respond.error(res, 'Profile with this name already exists', 409);

    // Call external APIs (Genderize, Agify, Nationalize)
    const [genderRes, ageRes, countryRes] = await Promise.all([
      fetch(`https://api.genderize.io?name=${encodeURIComponent(name)}`).then(r => r.json()),
      fetch(`https://api.agify.io?name=${encodeURIComponent(name)}`).then(r => r.json()),
      fetch(`https://api.nationalize.io?name=${encodeURIComponent(name)}`).then(r => r.json()),
    ]);

    // Determine age group
    const age = ageRes.age || 25;
    let age_group = 'adult';
    if (age < 13) age_group = 'child';
    else if (age < 18) age_group = 'teenager';
    else if (age >= 60) age_group = 'senior';

    // Top country
    const topCountry = countryRes.country?.sort((a, b) => b.probability - a.probability)[0];

    // Get country name
    let country_name = topCountry?.country_id || 'Unknown';
    try {
      const countryData = await fetch(`https://restcountries.com/v3.1/alpha/${topCountry?.country_id}`).then(r => r.json());
      country_name = countryData[0]?.name?.common || topCountry?.country_id;
    } catch { /* use country_id as fallback */ }

    const profile = await Profile.create({
      name: name.trim(),
      gender:               genderRes.gender || 'male',
      gender_probability:   genderRes.probability || 0.5,
      age,
      age_group,
      country_id:           topCountry?.country_id || 'US',
      country_name,
      country_probability:  topCountry?.probability || 0.5,
    });

    return respond.success(res, profile.toJSON(), 201);
  } catch (err) { next(err); }
};

// GET /api/profiles/:id
const getProfileById = async (req, res, next) => {
  try {
    const profile = await Profile.findOne({ id: req.params.id }).select('-_id -__v');
    if (!profile) return respond.error(res, 'Profile not found', 404);
    return respond.success(res, profile);
  } catch (err) { next(err); }
};

module.exports = { getAllProfiles, searchProfiles, createProfile, getProfileById };
