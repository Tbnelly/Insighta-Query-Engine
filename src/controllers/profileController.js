const Profile = require('../models/profile');
const { buildProfileQuery } = require('../services/queryBuilder');
const { parseNaturalLanguage } = require('../parser/nlParser');

const getAllProfiles = async (req, res, next) => {
  try {
    const built = buildProfileQuery(req.query);

    // Validation failed
    if (built.errors) {
      return res.status(422).json({
        status: 'error',
        message: 'Invalid query parameters',
      });
    }

    const { filter, sort, skip, limit, page } = built;

    // Run count and data fetch in parallel for performance
    const [total, data] = await Promise.all([
      Profile.countDocuments(filter),
      Profile.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .select('-_id -__v'),  // exclude internal mongo fields
    ]);

    return res.status(200).json({
      status: 'success',
      page,
      limit,
      total,
      data,
    });

  } catch (err) {
    next(err);
  }
};



const searchProfiles = async (req, res, next) => {
  try {
    const { q, page, limit } = req.query;

    // q is required
    if (!q || q.trim() === '') {
      return res.status(400).json({
        status: 'error',
        message: 'Missing or empty parameter: q',
      });
    }

    // Parse the natural language query
    const parsed = parseNaturalLanguage(q);

    if (parsed.error) {
      return res.status(422).json({
        status: 'error',
        message: parsed.error,
      });
    }

    const { filter } = parsed;

    // Pagination
    const parsedPage = Math.max(1, Number(page) || 1);
    const parsedLimit = Math.min(50, Math.max(1, Number(limit) || 10));
    const skip = (parsedPage - 1) * parsedLimit;

    const [total, data] = await Promise.all([
      Profile.countDocuments(filter),
      Profile.find(filter)
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(parsedLimit)
        .select('-_id -__v'),
    ]);

    return res.status(200).json({
      status: 'success',
      page: parsedPage,
      limit: parsedLimit,
      total,
      data,
    });

  } catch (err) {
    next(err);
  }
};

module.exports = { getAllProfiles, searchProfiles };

