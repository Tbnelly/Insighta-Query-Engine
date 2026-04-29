'use strict';

/**
 * src/middleware/validate.js
 * --------------------------
 * Input validation using express-validator.
 * Applied to profile and export routes to reject bad input
 * before it ever reaches the controller or the database.
 *
 * Why validate at the middleware layer?
 * Controllers should trust their inputs. If a controller has to
 * check "is page a number?" alongside business logic, it becomes
 * hard to read and easy to miss cases. Validation middleware
 * handles the "is this input safe?" question in one dedicated place.
 *
 * What we validate:
 *  - gender: only 'male' or 'female'
 *  - page / limit: must be positive integers within safe bounds
 *  - min_age / max_age: must be 0-120
 *  - order: only 'asc' or 'desc'
 *  - sort_by: only known field names (prevents NoSQL injection via sort)
 *  - country_id: max 3 chars, letters only
 */

const { query, validationResult } = require('express-validator');

// ── Reusable validation chains ───────────────────────────────────────────────

const paginationRules = [
  query('page')
    .optional()
    .isInt({ min: 1, max: 10000 })
    .withMessage('page must be an integer between 1 and 10000')
    .toInt(),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('limit must be an integer between 1 and 50')
    .toInt(),
];

const filterRules = [
  query('gender')
    .optional()
    .isIn(['male', 'female'])
    .withMessage('gender must be male or female'),

  query('age_group')
    .optional()
    .isIn(['child', 'teenager', 'adult', 'senior'])
    .withMessage('age_group must be child, teenager, adult, or senior'),

  query('country_id')
    .optional()
    .isAlpha()
    .isLength({ max: 3 })
    .withMessage('country_id must be 2-3 letters')
    .toUpperCase(),

  query('min_age')
    .optional()
    .isInt({ min: 0, max: 120 })
    .withMessage('min_age must be between 0 and 120')
    .toInt(),

  query('max_age')
    .optional()
    .isInt({ min: 0, max: 120 })
    .withMessage('max_age must be between 0 and 120')
    .toInt(),

  query('sort_by')
    .optional()
    .isIn(['age', 'gender_probability', 'country_probability', 'created_at'])
    .withMessage('sort_by must be age, gender_probability, country_probability, or created_at'),

  query('order')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('order must be asc or desc'),
];

const searchRules = [
  query('q')
    .notEmpty()
    .withMessage('q is required')
    .isLength({ max: 200 })
    .withMessage('q must be under 200 characters')
    .trim()
    .escape(),

  ...paginationRules,
];

// ── Validation result handler ────────────────────────────────────────────────

/**
 * Run after validation chains. If any failed, return 422 with details.
 * If all passed, call next() to proceed to the controller.
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      status:  'error',
      message: 'Validation failed',
      errors:  errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }
  next();
};

// ── Exported rule sets ───────────────────────────────────────────────────────

module.exports = {
  validateProfiles: [...filterRules, ...paginationRules, handleValidationErrors],
  validateSearch:   [...searchRules, handleValidationErrors],
  validateExport:   [...filterRules, handleValidationErrors],
};
