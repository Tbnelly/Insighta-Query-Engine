'use strict';

/**
 * src/middleware/apiVersion.js
 * -----------------------------
 * TRD requirement: All /api/* requests must include header:
 *   X-API-Version: 1
 * Requests without it get 400.
 */

const apiVersion = (req, res, next) => {
  const version = req.headers['x-api-version'];
  if (!version || version !== '1') {
    return res.status(400).json({
      status: 'error',
      message: 'API version header required',
    });
  }
  next();
};

module.exports = apiVersion;
