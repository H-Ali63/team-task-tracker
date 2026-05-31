const userService = require('../services/userService');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');

/**
 * GET /api/v1/users
 */
const listUsers = asyncHandler(async (req, res) => {
  const users = await userService.listUsers(req.user);
  sendSuccess(res, { users }, 'Users retrieved');
});

/**
 * GET /api/v1/users/:id
 */
const getUser = asyncHandler(async (req, res) => {
  const user = await userService.getUser(req.params.id, req.user);
  sendSuccess(res, { user }, 'User retrieved');
});

/**
 * PATCH /api/v1/users/:id/role
 */
const updateUserRole = asyncHandler(async (req, res) => {
  const user = await userService.updateUserRole(req.params.id, req.body.role, req.user);
  sendSuccess(res, { user }, 'User role updated');
});

/**
 * DELETE /api/v1/users/:id
 */
const deactivateUser = asyncHandler(async (req, res) => {
  await userService.deactivateUser(req.params.id, req.user);
  sendSuccess(res, {}, 'User deactivated');
});

/**
 * GET /api/v1/users/profile
 */
const getProfile = asyncHandler(async (req, res) => {
  const user = await userService.getProfile(req.user._id);
  sendSuccess(res, { user }, 'Profile retrieved');
});

module.exports = { listUsers, getUser, updateUserRole, deactivateUser, getProfile };
