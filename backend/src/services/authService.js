const userRepository = require('../repositories/userRepository');
const organizationRepository = require('../repositories/organizationRepository');
const Organization = require('../models/Organization');
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  getRefreshTokenExpiryDate,
} = require('../utils/jwt');
const AppError = require('../utils/AppError');
const ERROR_CODES = require('../constants/errorCodes');

/**
 * Registers a new user.
 * If organizationName is provided, creates a new org and assigns ADMIN role.
 * If organizationId is provided, joins existing org with MEMBER role.
 */
const register = async ({ name, email, password, organizationName, organizationId }) => {
  // Check for duplicate email
  const existing = await userRepository.findByEmail(email);
  if (existing) {
    throw new AppError('Email already registered.', 409, ERROR_CODES.CONFLICT);
  }

  let orgId;
  let role = 'MEMBER';

  if (organizationName) {
    // Create new organization; first user becomes ADMIN
    const org = await Organization.create({ name: organizationName });
    orgId = org._id;
    role = 'ADMIN';
  } else {
    const org = await organizationRepository.findById(organizationId);
    if (!org) {
      throw new AppError('Organization not found.', 404, ERROR_CODES.NOT_FOUND);
    }
    orgId = org._id;
  }

  const user = await userRepository.create({
    name,
    email,
    password,
    role,
    organizationId: orgId,
  });

  const tokens = await _issueTokens(user);

  return {
    user: _sanitizeUser(user),
    ...tokens,
  };
};

/**
 * Authenticates a user and issues tokens.
 */
const login = async ({ email, password }) => {
  const user = await userRepository.findByEmail(email, true); // include password
  if (!user || !user.isActive) {
    throw new AppError('Invalid email or password.', 401, ERROR_CODES.INVALID_CREDENTIALS);
  }

  const passwordMatch = await user.comparePassword(password);
  if (!passwordMatch) {
    throw new AppError('Invalid email or password.', 401, ERROR_CODES.INVALID_CREDENTIALS);
  }

  const tokens = await _issueTokens(user);

  return {
    user: _sanitizeUser(user),
    ...tokens,
  };
};

/**
 * Rotates refresh token: revokes old, issues new pair.
 */
const refreshTokens = async (incomingToken) => {
  let decoded;
  try {
    decoded = verifyRefreshToken(incomingToken);
  } catch {
    throw new AppError('Invalid or expired refresh token.', 401, ERROR_CODES.TOKEN_INVALID);
  }

  const user = await userRepository.findByIdWithRefreshTokens(decoded.userId);
  if (!user) {
    throw new AppError('User not found.', 401, ERROR_CODES.UNAUTHORIZED);
  }

  const tokenRecord = user.refreshTokens.find(
    (t) => t.token === incomingToken && !t.isRevoked && t.expiresAt > new Date()
  );

  if (!tokenRecord) {
    // Token reuse detected — revoke ALL tokens (security measure)
    user.refreshTokens = [];
    await user.save();
    throw new AppError('Refresh token reuse detected. Please log in again.', 401, ERROR_CODES.TOKEN_INVALID);
  }

  // Revoke the used token
  await userRepository.revokeRefreshToken(user._id, incomingToken);

  // Issue new tokens
  const tokens = await _issueTokens(user);
  return tokens;
};

/**
 * Revokes a refresh token on logout.
 */
const logout = async (userId, refreshToken) => {
  if (refreshToken) {
    await userRepository.revokeRefreshToken(userId, refreshToken);
    await userRepository.cleanExpiredTokens(userId);
  }
};

// ---- Private helpers ----

const _issueTokens = async (user) => {
  const payload = {
    userId: user._id.toString(),
    role: user.role,
    organizationId: user.organizationId.toString(),
  };

  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);
  const expiresAt = getRefreshTokenExpiryDate();

  await userRepository.addRefreshToken(user._id, {
    token: refreshToken,
    expiresAt,
    isRevoked: false,
  });

  // Periodically clean old tokens
  await userRepository.cleanExpiredTokens(user._id);

  return { accessToken, refreshToken };
};

const _sanitizeUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  organizationId: user.organizationId,
});

module.exports = { register, login, refreshTokens, logout };
