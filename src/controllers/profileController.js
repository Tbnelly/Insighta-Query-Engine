'use strict';

/**
 * src/controllers/profileController.js
 * --------------------------------------
 * Stage 3 update: pagination response upgraded to production standard.
 *
 * WHAT CHANGED: response now uses { data, meta: { page, limit, total, totalPages } }
 * WHAT DID NOT CHANGE: all filter/sort/pagination/NL logic — completely untouched.
 */

const Profile = require('../models/profile');
const { buildProfileQuery } = require('../services/queryBuilder');
const { parseNaturalLanguage } = require('../parser/nlParser');
const respond = require('../utils/apiResponse');

const getAllProfiles = async (req, res, next) => {
  try {
    const built = buildProfileQuery(req.query);

    if (built.errors) {
      return respond.error(res, 'Invalid query parameters', 422);
    }

    const { filter, sort, skip, limit, page } = built;

    const [total, data] = await Promise.all([
      Profile.countDocuments(filter),
      Profile.find(filter).sort(sort).skip(skip).limit(limit).select('-_id -__v'),
    ]);

    return respond.paginated(res, data, { page, limit, total });

  } catch (err) {
    next(err);
  }
};

const searchProfiles = async (req, res, next) => {
  try {
    const { q, page, limit } = req.query;

    if (!q || q.trim() === '') {
      return respond.error(res, 'Missing or empty parameter: q', 400);
    }

    const parsed = parseNaturalLanguage(q);

    if (parsed.error) {
      return respond.error(res, parsed.error, 422);
    }

    const { filter } = parsed;

    const parsedPage  = Math.max(1, Number(page)  || 1);
    const parsedLimit = Math.min(50, Math.max(1, Number(limit) || 10));
    const skip        = (parsedPage - 1) * parsedLimit;

    const [total, data] = await Promise.all([
      Profile.countDocuments(filter),
      Profile.find(filter).sort({ created_at: -1 }).skip(skip).limit(parsedLimit).select('-_id -__v'),
    ]);

    return respond.paginated(res, data, { page: parsedPage, limit: parsedLimit, total });

  } catch (err) {
    next(err);
  }
};

module.exports = { getAllProfiles, searchProfiles };

