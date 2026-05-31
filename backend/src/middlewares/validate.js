const AppError = require('../utils/AppError');
const ERROR_CODES = require('../constants/errorCodes');

/**
 * Factory function that returns a middleware to validate
 * request body, query params, or route params using a Joi schema.
 *
 * @param {Joi.Schema} schema - Joi validation schema
 * @param {'body'|'query'|'params'} source - Which part of req to validate
 */
const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[source], {
      abortEarly: false,   // Return all errors, not just the first
      stripUnknown: true,  // Remove unknown keys silently
      convert: true,       // Allow type coercion (string '1' → number 1)
    });

    if (error) {
      const message = error.details.map((d) => d.message).join('; ');
      return next(
        new AppError(message, 400, ERROR_CODES.VALIDATION_ERROR)
      );
    }

    // Replace req[source] with the sanitized/coerced value
    req[source] = value;
    next();
  };
};

module.exports = validate;
