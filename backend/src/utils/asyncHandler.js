/**
 * Wraps async route handlers to avoid repetitive try/catch blocks.
 * Passes errors to Express error middleware automatically.
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
