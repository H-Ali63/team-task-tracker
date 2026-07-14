const taskRepository = require('../repositories/taskRepository');
const userRepository = require('../repositories/userRepository');
const { cacheService, CacheKeys, buildQueryHash } = require('../cache/cacheService');
const { STATUS_TRANSITIONS } = require('../constants/taskConstants');
const ROLES = require('../constants/roles');
const AppError = require('../utils/AppError');
const ERROR_CODES = require('../constants/errorCodes');
const { getPaginationOptions, buildPaginationMeta } = require('../utils/pagination');

/**
 * Create a new task within the user's organization.
 */
const createTask = async (data, requestingUser) => {
  const { assignee, ...rest } = data;

  // Validate assignee belongs to same org
  if (assignee) {
    await _validateAssigneeBelongsToOrg(assignee, requestingUser.organizationId);
  }

  const task = await taskRepository.create({
    ...rest,
    assignee: assignee || null,
    organizationId: requestingUser.organizationId,
    createdBy: requestingUser._id,
  });

  // Invalidate caches for this org
  await cacheService.invalidateTaskCaches(
    requestingUser.organizationId.toString(),
    assignee?.toString()
  );

  return taskRepository.findByIdPopulated(task._id);
};

/**
 * List tasks with pagination, filtering, sorting. Redis-cached.
 */
const listTasks = async (query, requestingUser) => {
  const { page, limit, skip } = getPaginationOptions(query);
  const { status, priority, assignee, sortBy = 'createdAt', sortOrder = 'desc' } = query;

  // Build filter scoped to the user's organization
  const filter = { organizationId: requestingUser.organizationId };

  // MEMBER role can only see their own tasks
  if (requestingUser.role === ROLES.MEMBER) {
    filter.assignee = requestingUser._id;
  } else if (assignee) {
    filter.assignee = assignee;
  }

  if (status) filter.status = status;
  if (priority) filter.priority = priority;

  const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

  // Build cache key from filter + pagination
  const queryHash = buildQueryHash({ filter, page, limit, sortBy, sortOrder });
  const cacheKey = CacheKeys.tasksByOrg(requestingUser.organizationId.toString(), queryHash);

  // Try cache first
  const cached = await cacheService.get(cacheKey);
  if (cached) {
    return cached;
  }

  // Fallback to DB
  const { tasks, total } = await taskRepository.findTasks({ filter, page, limit, skip, sort });

  const result = {
    tasks,
    pagination: buildPaginationMeta(total, page, limit),
  };

  // Store in cache
  await cacheService.set(cacheKey, result);

  return result;
};

/**
 * Get a single task by ID, scoped to organization.
 */
const getTask = async (taskId, requestingUser) => {
  const task = await taskRepository.findByIdPopulated(taskId);

  if (!task || task.organizationId._id.toString() !== requestingUser.organizationId.toString()) {
    throw new AppError('Task not found.', 404, ERROR_CODES.NOT_FOUND);
  }

  // MEMBER can only view their assigned tasks
  if (
    requestingUser.role === ROLES.MEMBER &&
    task.assignee?._id.toString() !== requestingUser._id.toString()
  ) {
    throw new AppError('Access denied. You can only view your own tasks.', 403, ERROR_CODES.FORBIDDEN);
  }

  return task;
};

/**
 * Update task fields (not status — use updateTaskStatus for that).
 * Only ADMIN and MANAGER can update task details.
 */
const updateTask = async (taskId, updates, requestingUser) => {
  const task = await _getTaskInOrg(taskId, requestingUser.organizationId);

  // If reassigning, validate new assignee
  const oldAssignee = task.assignee?.toString();
  if (updates.assignee) {
    await _validateAssigneeBelongsToOrg(updates.assignee, requestingUser.organizationId);
  }

  const updatedTask = await taskRepository.updateById(taskId, updates);

  // Invalidate caches for old and new assignee
  await cacheService.invalidateTaskCaches(
    requestingUser.organizationId.toString(),
    oldAssignee
  );
  if (updates.assignee && updates.assignee !== oldAssignee) {
    await cacheService.invalidateTaskCaches(
      requestingUser.organizationId.toString(),
      updates.assignee
    );
  }

  return taskRepository.findByIdPopulated(updatedTask._id);
};

/**
 * Update task status with enforced state-machine transitions.
 * Only the assignee or a MANAGER can advance status.
 */
const updateTaskStatus = async (taskId, newStatus, requestingUser) => {
  const task = await _getTaskInOrg(taskId, requestingUser.organizationId);

  // Permission check: only assignee or MANAGER/ADMIN
  const isAssignee = task.assignee?.toString() === requestingUser._id.toString();
  const isManagerOrAdmin = [ROLES.MANAGER, ROLES.ADMIN].includes(requestingUser.role);

  if (!isAssignee && !isManagerOrAdmin) {
    throw new AppError(
      'Only the task assignee or a Manager/Admin can update task status.',
      403,
      ERROR_CODES.FORBIDDEN
    );
  }

  // Validate transition
  const allowedTransitions = STATUS_TRANSITIONS[task.status];
  if (!allowedTransitions.includes(newStatus)) {
    throw new AppError(
      `Invalid status transition from ${task.status} to ${newStatus}. Allowed: ${allowedTransitions.join(', ') || 'none (terminal state)'}`,
      400,
      ERROR_CODES.INVALID_TRANSITION
    );
  }

  task.status = newStatus;
  await task.save(); // triggers pre-save hook for completedAt

  // Invalidate caches
  await cacheService.invalidateTaskCaches(
    requestingUser.organizationId.toString(),
    task.assignee?.toString()
  );

  // Emit socket event if io is available (optional real-time notification)
  const io = global.io;
  if (io && task.assignee) {
    io.to(`user:${task.assignee}`).emit('task:status_changed', {
      taskId: task._id,
      newStatus,
      taskTitle: task.title,
      updatedBy: requestingUser.name,
    });
  }

  return taskRepository.findByIdPopulated(task._id);
};

/**
 * Delete a task (ADMIN/MANAGER only).
 */
const deleteTask = async (taskId, requestingUser) => {
  const task = await _getTaskInOrg(taskId, requestingUser.organizationId);

  await taskRepository.deleteById(taskId);

  await cacheService.invalidateTaskCaches(
    requestingUser.organizationId.toString(),
    task.assignee?.toString()
  );
};

/**
 * Analytics: overdue counts + avg completion time.
 */
const getAnalytics = async (organizationId) => {
  return taskRepository.getAnalytics(organizationId);
};

// ---- Private helpers ----

const _getTaskInOrg = async (taskId, organizationId) => {
  const task = await taskRepository.findById(taskId);
  if (!task || task.organizationId.toString() !== organizationId.toString()) {
    throw new AppError('Task not found.', 404, ERROR_CODES.NOT_FOUND);
  }
  return task;
};

const _validateAssigneeBelongsToOrg = async (assigneeId, organizationId) => {
  const assignee = await userRepository.findById(assigneeId);
  if (
    !assignee ||
    !assignee.isActive ||
    assignee.organizationId.toString() !== organizationId.toString()
  ) {
    throw new AppError(
      'Assignee not found or does not belong to your organization.',
      400,
      ERROR_CODES.VALIDATION_ERROR
    );
  }
  return assignee;
};

module.exports = {
  createTask,
  listTasks,
  getTask,
  updateTask,
  updateTaskStatus,
  deleteTask,
  getAnalytics,
};
