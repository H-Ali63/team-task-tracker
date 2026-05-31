const Joi = require('joi');
const { TASK_STATUS, TASK_PRIORITY } = require('../constants/taskConstants');

const createTaskSchema = Joi.object({
  title: Joi.string().trim().min(1).max(200).required().messages({
    'string.min': 'Title cannot be empty',
    'string.max': 'Title must not exceed 200 characters',
    'any.required': 'Task title is required',
  }),
  description: Joi.string().trim().max(2000).optional().allow('').messages({
    'string.max': 'Description must not exceed 2000 characters',
  }),
  priority: Joi.string()
    .valid(...Object.values(TASK_PRIORITY))
    .default(TASK_PRIORITY.MEDIUM)
    .messages({
      'any.only': `Priority must be one of: ${Object.values(TASK_PRIORITY).join(', ')}`,
    }),
  assignee: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .optional()
    .allow(null)
    .messages({
      'string.pattern.base': 'Invalid assignee ID format',
    }),
  dueDate: Joi.date().iso().greater('now').optional().allow(null).messages({
    'date.greater': 'due_date must be a future date',
    'date.format': 'due_date must be a valid ISO date',
  }),
});

const updateTaskSchema = Joi.object({
  title: Joi.string().trim().min(1).max(200).messages({
    'string.min': 'Title cannot be empty',
    'string.max': 'Title must not exceed 200 characters',
  }),
  description: Joi.string().trim().max(2000).optional().allow(''),
  priority: Joi.string()
    .valid(...Object.values(TASK_PRIORITY))
    .messages({
      'any.only': `Priority must be one of: ${Object.values(TASK_PRIORITY).join(', ')}`,
    }),
  assignee: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .optional()
    .allow(null),
  dueDate: Joi.date().iso().greater('now').optional().allow(null).messages({
    'date.greater': 'due_date must be a future date',
  }),
})
  .min(1)
  .messages({
    'object.min': 'At least one field must be provided for update',
  });

const updateStatusSchema = Joi.object({
  status: Joi.string()
    .valid(...Object.values(TASK_STATUS))
    .required()
    .messages({
      'any.only': `Status must be one of: ${Object.values(TASK_STATUS).join(', ')}`,
      'any.required': 'Status is required',
    }),
});

const taskQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  status: Joi.string().valid(...Object.values(TASK_STATUS)).optional(),
  priority: Joi.string().valid(...Object.values(TASK_PRIORITY)).optional(),
  assignee: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .optional(),
  sortBy: Joi.string()
    .valid('createdAt', 'dueDate', 'priority', 'status', 'title')
    .default('createdAt'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
});

module.exports = {
  createTaskSchema,
  updateTaskSchema,
  updateStatusSchema,
  taskQuerySchema,
};
