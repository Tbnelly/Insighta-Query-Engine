'use strict';

/**
 * src/middleware/authorize.js
 * ----------------------------
 * Role-Based Access Control (RBAC) middleware factory.
 * Call it with the roles you want to allow:
 *
 *   router.delete('/users/:id', authenticate, authorize('admin'), deleteUser);
 *   router.get('/profiles',     authenticate, authorize('admin', 'analyst'), getAllProfiles);
 *
 * MUST run AFTER authenticate.js — it reads req.user which
 * authenticate populates. If authenticate hasn't run yet, req.user
 * is undefined and this will correctly return 403.
 *
 * Why a factory function instead of a static middleware?
 * Because different routes need different role requirements.
 * A factory generates a tailored middleware for each route.
 */

const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      // Should not happen if authenticate runs first, but defensive check
      return res.status(401).json({
        status: 'error',
        message: 'Not authenticated.',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        status: 'error',
        message: `Access denied. Required role: ${allowedRoles.join(' or ')}. Your role: ${req.user.role}.`,
      });
    }

    next();
  };
};

module.exports = authorize;
