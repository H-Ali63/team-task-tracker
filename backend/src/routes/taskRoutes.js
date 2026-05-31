const express = require('express');
const router = express.Router();

const taskController = require('../controllers/taskController');
const authenticate = require('../middlewares/authenticate');
const authorize = require('../middlewares/authorize');
const scopeToOrganization = require('../middlewares/scopeToOrganization');
const validate = require('../middlewares/validate');
const {
  createTaskSchema,
  updateTaskSchema,
  updateStatusSchema,
  taskQuerySchema,
} = require('../validations/taskValidation');
const { mongoIdSchema } = require('../validations/userValidation');
const ROLES = require('../constants/roles');

// All task routes require authentication and org scoping
router.use(authenticate, scopeToOrganization);

/**
 * @swagger
 * /tasks/analytics:
 *   get:
 *     summary: Get task analytics (overdue count, avg completion time)
 *     tags: [Tasks]
 */
// Analytics — must come before /:id to avoid param collision
router.get(
  '/analytics',
  authorize(ROLES.ADMIN, ROLES.MANAGER),
  taskController.getAnalytics
);

/**
 * @swagger
 * /tasks:
 *   get:
 *     summary: List tasks with filtering, sorting, and pagination
 *     tags: [Tasks]
 *   post:
 *     summary: Create a new task
 *     tags: [Tasks]
 */
router
  .route('/')
  .get(validate(taskQuerySchema, 'query'), taskController.listTasks)
  .post(
    authorize(ROLES.ADMIN, ROLES.MANAGER),
    validate(createTaskSchema),
    taskController.createTask
  );

/**
 * @swagger
 * /tasks/{id}:
 *   get:
 *     summary: Get a single task by ID
 *     tags: [Tasks]
 *   put:
 *     summary: Update task details
 *     tags: [Tasks]
 *   delete:
 *     summary: Delete a task
 *     tags: [Tasks]
 */
router
  .route('/:id')
  .get(validate(mongoIdSchema, 'params'), taskController.getTask)
  .put(
    authorize(ROLES.ADMIN, ROLES.MANAGER),
    validate(mongoIdSchema, 'params'),
    validate(updateTaskSchema),
    taskController.updateTask
  )
  .delete(
    authorize(ROLES.ADMIN, ROLES.MANAGER),
    validate(mongoIdSchema, 'params'),
    taskController.deleteTask
  );

/**
 * @swagger
 * /tasks/{id}/status:
 *   patch:
 *     summary: Update task status (enforced transitions)
 *     tags: [Tasks]
 */
router.patch(
  '/:id/status',
  validate(mongoIdSchema, 'params'),
  validate(updateStatusSchema),
  taskController.updateTaskStatus
);

module.exports = router;
