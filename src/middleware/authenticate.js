'use strict';

/**
 * src/middleware/authenticate.js
 * --------------------------------
 * Verifies the JWT access token on every protected request.
 * If valid, attaches the decoded payload to `req.user` so
 * downstream middleware and controllers can use it.
 *
 * Accepts tokens from two places:
 *   1. Authorization: Bearer <token>   ← API clients, CLI
 *   2. Cookie: accessToken=<token>     ← web portal (optional)
 *
 * Important: this middleware AUTHENTICATES (who are you?).
 * Authorisation (what are you allowed to do?) is a separate
 * middleware — authorize.js. Keeping them apart lets you apply
 * them independently per route.
 */

const { verifyAccessToken } = require('../services/tokenService');

const authenticate = (req, res, next) => {
  // 1. Try Authorization header first
  const authHeader = req.headers['authorization'];
  let token = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7).trim();
  }

  // 2. Fall back to cookie (web portal)
  if (!token && req.cookies?.accessToken) {
    token = req.cookies.accessToken;
  }

  if (!token) {
    return res.status(401).json({
      status: 'error',
      message: 'Authentication required. Provide a Bearer token or log in.',
    });
  }

  try {
    const decoded = verifyAccessToken(token);
    req.user = decoded; // { sub, role, username, iat, exp }
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        status: 'error',
        message: 'Access token expired. Use /api/v1/auth/refresh to get a new one.',
        code: 'TOKEN_EXPIRED',
      });
    }
    return res.status(401).json({
      status: 'error',
      message: 'Invalid access token.',
    });
  }
};

module.exports = authenticate;
