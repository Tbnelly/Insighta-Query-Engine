'use strict';

/**
 * src/utils/apiResponse.js
 * TRD-compliant response format with links for pagination.
 */

const paginated = (res, data, { page, limit, total }, baseUrl) => {
  const totalPages = Math.ceil(total / limit);
  const self = `${baseUrl}?page=${page}&limit=${limit}`;
  const next = page < totalPages ? `${baseUrl}?page=${page + 1}&limit=${limit}` : null;
  const prev = page > 1 ? `${baseUrl}?page=${page - 1}&limit=${limit}` : null;

  return res.status(200).json({
    status: 'success',
    page,
    limit,
    total,
    total_pages: totalPages,
    links: { self, next, prev },
    data,
  });
};

const success = (res, data, statusCode = 200) =>
  res.status(statusCode).json({ status: 'success', data });

const error = (res, message, statusCode = 400) =>
  res.status(statusCode).json({ status: 'error', message });

module.exports = { paginated, success, error };
