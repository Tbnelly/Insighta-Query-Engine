'use strict';

/**
 * src/utils/apiResponse.js
 * ------------------------
 * Centralised response helpers so every endpoint returns
 * an identical JSON shape. This matters because:
 *
 *  - The CLI parser can rely on a predictable structure
 *  - The web portal doesn't need conditional response handling
 *  - Future API clients (mobile, etc.) have a stable contract
 *
 * Production pagination format:
 * {
 *   status: 'success',
 *   data: [...],
 *   meta: { page, limit, total, totalPages }
 * }
 *
 * This replaces the Stage 2 flat format:
 * { status, page, limit, total, data }
 * — which mixed pagination metadata with response metadata.
 */

/**
 * Send a paginated list response.
 * @param {object} res       - Express response object
 * @param {Array}  data      - Array of records
 * @param {object} pagination - { page, limit, total }
 */
const paginated = (res, data, { page, limit, total }) => {
  return res.status(200).json({
    status: 'success',
    data,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
};

/**
 * Send a single-item success response.
 */
const success = (res, data, statusCode = 200) => {
  return res.status(statusCode).json({ status: 'success', data });
};

/**
 * Send an error response.
 */
const error = (res, message, statusCode = 400) => {
  return res.status(statusCode).json({ status: 'error', message });
};

module.exports = { paginated, success, error };
