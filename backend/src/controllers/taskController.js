const taskService = require('../services/taskService');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess, sendCreated } = require('../utils/response');

/**
 * POST /api/v1/tasks
 */
const createTask = asyncHandler(async (req, res) => {
  const task = await taskService.createTask(req.body, req.user);
  sendCreated(res, { task }, 'Task created successfully');
});

/**
 * GET /api/v1/tasks
 */
const listTasks = asyncHandler(async (req, res) => {
  const result = await taskService.listTasks(req.query, req.user);
  sendSuccess(res, result, 'Tasks retrieved');
});

/**
 * GET /api/v1/tasks/:id
 */
const getTask = asyncHandler(async (req, res) => {
  const task = await taskService.getTask(req.params.id, req.user);
  sendSuccess(res, { task }, 'Task retrieved');
});

/**
 * PUT /api/v1/tasks/:id
 */
const updateTask = asyncHandler(async (req, res) => {
  const task = await taskService.updateTask(req.params.id, req.body, req.user);
  sendSuccess(res, { task }, 'Task updated successfully');
});

/**
 * PATCH /api/v1/tasks/:id/status
 */
const updateTaskStatus = asyncHandler(async (req, res) => {
  const task = await taskService.updateTaskStatus(req.params.id, req.body.status, req.user);
  sendSuccess(res, { task }, 'Task status updated');
});

/**
 * DELETE /api/v1/tasks/:id
 */
const deleteTask = asyncHandler(async (req, res) => {
  await taskService.deleteTask(req.params.id, req.user);
  sendSuccess(res, {}, 'Task deleted successfully');
});

/**
 * GET /api/v1/tasks/analytics
 */
const getAnalytics = asyncHandler(async (req, res) => {
  const analytics = await taskService.getAnalytics(req.user.organizationId);
  sendSuccess(res, analytics, 'Analytics retrieved');
});

module.exports = {
  createTask,
  listTasks,
  getTask,
  updateTask,
  updateTaskStatus,
  deleteTask,
  getAnalytics,
};
