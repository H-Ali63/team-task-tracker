const AppError = require('../utils/AppError');
const ERROR_CODES = require('../constants/errorCodes');

/**
 * RBAC middleware factory.
 * Checks that the authenticated user has one of the required roles.
 *
 * Usage: router.get('/admin-only', authenticate, authorize('ADMIN'), handler)
 * Usage: router.post('/tasks', authenticate, authorize('ADMIN', 'MANAGER'), handler)
 *
 * IMPORTANT: This must always be used AFTER the authenticate middleware,
 * which populates req.user. Role checks MUST NOT appear in controller logic.
 *
 * @param {...string} roles - Allowed roles (variadic)
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(
        new AppError('Authentication required.', 401, ERROR_CODES.UNAUTHORIZED)
      );
    }

    if (!roles.includes(req.user.role)) {
      return next(
        new AppError(
          `Access denied. Required role: ${roles.join(' or ')}. Your role: ${req.user.role}`,
          403,
          ERROR_CODES.FORBIDDEN
        )
      );
    }

    next();
  };
};

module.exports = authorize;
