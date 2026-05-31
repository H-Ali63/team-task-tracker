const logger = require('../utils/logger');
const ERROR_CODES = require('../constants/errorCodes');

/**
 * Centralised error handler.
 * All errors passed via next(err) land here.
 * Returns consistent JSON error format:
 * { status, code, message }
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  let { statusCode = 500, message, code = ERROR_CODES.INTERNAL_ERROR } = err;

  // --- Mongoose errors ---
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid ${err.path}: ${err.value}`;
    code = ERROR_CODES.VALIDATION_ERROR;
  }

  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors)
      .map((e) => e.message)
      .join('; ');
    code = ERROR_CODES.VALIDATION_ERROR;
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    statusCode = 409;
    message = `${field} already exists.`;
    code = ERROR_CODES.CONFLICT;
  }

  // --- JWT errors (fallthrough) ---
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token.';
    code = ERROR_CODES.TOKEN_INVALID;
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired.';
    code = ERROR_CODES.TOKEN_EXPIRED;
  }

  // Log server errors
  if (statusCode >= 500) {
    logger.error({
      message: err.message,
      stack: err.stack,
      url: req.originalUrl,
      method: req.method,
    });
  }

  res.status(statusCode).json({
    status: statusCode,
    code,
    message,
  });
};

module.exports = errorHandler;
