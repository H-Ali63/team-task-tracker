const userRepository = require('../repositories/userRepository');
const AppError = require('../utils/AppError');
const ERROR_CODES = require('../constants/errorCodes');

/**
 * List all users in the requesting user's organization.
 */
const listUsers = async (requestingUser) => {
  return userRepository.findByOrganization(requestingUser.organizationId, {
    sort: { createdAt: -1 },
    populate: { path: 'organizationId', select: 'name' },
  });
};

/**
 * Get a single user by ID, scoped to organization.
 */
const getUser = async (userId, requestingUser) => {
  const user = await userRepository.findById(userId);
  if (
    !user ||
    user.organizationId.toString() !== requestingUser.organizationId.toString()
  ) {
    throw new AppError('User not found.', 404, ERROR_CODES.NOT_FOUND);
  }
  return user;
};

/**
 * Update a user's role (ADMIN only).
 */
const updateUserRole = async (userId, role, requestingUser) => {
  // Prevent self-demotion
  if (userId === requestingUser._id.toString()) {
    throw new AppError('You cannot change your own role.', 400, ERROR_CODES.VALIDATION_ERROR);
  }

  const user = await userRepository.findById(userId);
  if (
    !user ||
    user.organizationId.toString() !== requestingUser.organizationId.toString()
  ) {
    throw new AppError('User not found.', 404, ERROR_CODES.NOT_FOUND);
  }

  return userRepository.updateById(userId, { role });
};

/**
 * Deactivate a user (ADMIN only).
 */
const deactivateUser = async (userId, requestingUser) => {
  if (userId === requestingUser._id.toString()) {
    throw new AppError('You cannot deactivate your own account.', 400, ERROR_CODES.VALIDATION_ERROR);
  }

  const user = await userRepository.findById(userId);
  if (
    !user ||
    user.organizationId.toString() !== requestingUser.organizationId.toString()
  ) {
    throw new AppError('User not found.', 404, ERROR_CODES.NOT_FOUND);
  }

  return userRepository.updateById(userId, { isActive: false });
};

/**
 * Get the current user's own profile.
 */
const getProfile = async (userId) => {
  return userRepository.findById(userId);
};

module.exports = { listUsers, getUser, updateUserRole, deactivateUser, getProfile };
