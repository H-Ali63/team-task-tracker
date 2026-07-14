const jwt = require('jsonwebtoken');

const DURATION_UNITS_IN_SECONDS = {
  s: 1,
  m: 60,
  h: 60 * 60,
  d: 60 * 60 * 24,
};

const parseDurationToSeconds = (duration, fallbackSeconds) => {
  if (typeof duration === 'number' && Number.isFinite(duration)) {
    return duration;
  }

  if (typeof duration !== 'string') {
    return fallbackSeconds;
  }

  const normalizedDuration = duration.trim();

  if (!normalizedDuration) {
    return fallbackSeconds;
  }

  const directNumber = Number(normalizedDuration);
  if (Number.isFinite(directNumber)) {
    return directNumber;
  }

  const match = normalizedDuration.match(/^(\d+)([smhd])$/i);
  if (!match) {
    return fallbackSeconds;
  }

  const value = Number(match[1]);
  const unit = match[2].toLowerCase();
  const unitSeconds = DURATION_UNITS_IN_SECONDS[unit];

  if (!Number.isFinite(value) || !unitSeconds) {
    return fallbackSeconds;
  }

  return value * unitSeconds;
};

const getRefreshTokenExpiryDate = () => {
  const expiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
  const expiresInSeconds = parseDurationToSeconds(expiresIn, 7 * 24 * 60 * 60);
  return new Date(Date.now() + expiresInSeconds * 1000);
};

/**
 * Generates a short-lived access token.
 */
const generateAccessToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_ACCESS_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  });
};

/**
 * Generates a long-lived refresh token.
 */
const generateRefreshToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  });
};

/**
 * Verifies an access token and returns the decoded payload.
 */
const verifyAccessToken = (token) => {
  return jwt.verify(token, process.env.JWT_ACCESS_SECRET);
};

/**
 * Verifies a refresh token and returns the decoded payload.
 */
const verifyRefreshToken = (token) => {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  getRefreshTokenExpiryDate,
  parseDurationToSeconds,
};
