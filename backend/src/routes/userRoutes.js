const express = require('express');
const router = express.Router();

const userController = require('../controllers/userController');
const authenticate = require('../middlewares/authenticate');
const authorize = require('../middlewares/authorize');
const validate = require('../middlewares/validate');
const { updateUserRoleSchema, mongoIdSchema } = require('../validations/userValidation');
const ROLES = require('../constants/roles');

router.use(authenticate);

/**
 * GET /users/profile — current user profile (all roles)
 */
router.get('/profile', userController.getProfile);

/**
 * GET /users — list org users (ADMIN, MANAGER)
 */
router.get('/', authorize(ROLES.ADMIN, ROLES.MANAGER), userController.listUsers);

/**
 * GET /users/:id — get user by ID (ADMIN, MANAGER)
 */
router.get(
  '/:id',
  authorize(ROLES.ADMIN, ROLES.MANAGER),
  validate(mongoIdSchema, 'params'),
  userController.getUser
);

/**
 * PATCH /users/:id/role — change role (ADMIN only)
 */
router.patch(
  '/:id/role',
  authorize(ROLES.ADMIN),
  validate(mongoIdSchema, 'params'),
  validate(updateUserRoleSchema),
  userController.updateUserRole
);

/**
 * DELETE /users/:id — deactivate user (ADMIN only)
 */
router.delete(
  '/:id',
  authorize(ROLES.ADMIN),
  validate(mongoIdSchema, 'params'),
  userController.deactivateUser
);

module.exports = router;
