const ERROR_CODES = require('../constants/errorCodes');

class AppError extends Error {
  /**
   * @param {string} message - Human-readable error message
   * @param {number} statusCode - HTTP status code
   * @param {string} code - Application error code from ERROR_CODES
   */
  constructor(message, statusCode = 500, code = ERROR_CODES.INTERNAL_ERROR) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true; // Distinguish from programmer errors

    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
