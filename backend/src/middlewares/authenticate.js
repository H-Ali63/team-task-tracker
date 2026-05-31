const { verifyAccessToken } = require('../utils/jwt');
const userRepository = require('../repositories/userRepository');
const AppError = require('../utils/AppError');
const ERROR_CODES = require('../constants/errorCodes');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Verifies the JWT access token from the Authorization header.
 * Attaches the authenticated user to req.user.
 * Must be applied before the authorize() middleware.
 */
const authenticate = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AppError(
      'Authentication required. Please provide a Bearer token.',
      401,
      ERROR_CODES.UNAUTHORIZED
    );
  }

  const token = authHeader.split(' ')[1];

  let decoded;
  try {
    decoded = verifyAccessToken(token);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw new AppError('Access token expired. Please refresh.', 401, ERROR_CODES.TOKEN_EXPIRED);
    }
    throw new AppError('Invalid access token.', 401, ERROR_CODES.TOKEN_INVALID);
  }

  const user = await userRepository.findById(decoded.userId);
  if (!user || !user.isActive) {
    throw new AppError('User not found or deactivated.', 401, ERROR_CODES.UNAUTHORIZED);
  }

  req.user = user;
  next();
});

module.exports = authenticate;
