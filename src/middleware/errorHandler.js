'use strict';

/**
 * src/middleware/errorHandler.js
 * --------------------------------
 * Global error handler — must be the LAST middleware registered.
 * NEVER sends stack traces or internal error details to the client in production.
 */

const { nodeEnv } = require('../config/env');

const errorHandler = (err, req, res, next) => {
  console.error(`[error] ${req.method} ${req.path} —`, err.message);
  if (nodeEnv === 'development') console.error(err.stack);

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    return res.status(422).json({
      status: 'error', message: 'Validation failed',
      errors: Object.values(err.errors).map((e) => ({ field: e.path, message: e.message })),
    });
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return res.status(409).json({ status: 'error', message: `Duplicate value for ${field}` });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ status: 'error', message: 'Invalid token' });
  }
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ status: 'error', message: 'Token expired', code: 'TOKEN_EXPIRED' });
  }

  // Mongoose cast error
  if (err.name === 'CastError') {
    return res.status(400).json({ status: 'error', message: `Invalid value for ${err.path}` });
  }

  // Default 500 — never reveal internals in production
  res.status(err.status || 500).json({
    status: 'error',
    message: nodeEnv === 'production'
      ? 'An unexpected error occurred. Please try again.'
      : err.message,
  });
};

module.exports = errorHandler;
