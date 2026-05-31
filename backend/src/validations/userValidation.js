const Joi = require('joi');
const ROLES = require('../constants/roles');

const updateUserRoleSchema = Joi.object({
  role: Joi.string()
    .valid(...Object.values(ROLES))
    .required()
    .messages({
      'any.only': `Role must be one of: ${Object.values(ROLES).join(', ')}`,
      'any.required': 'Role is required',
    }),
});

const updateUserSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).messages({
    'string.min': 'Name must be at least 2 characters',
    'string.max': 'Name must not exceed 100 characters',
  }),
  isActive: Joi.boolean(),
})
  .min(1)
  .messages({
    'object.min': 'At least one field must be provided',
  });

const mongoIdSchema = Joi.object({
  id: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      'string.pattern.base': 'Invalid ID format',
      'any.required': 'ID is required',
    }),
});

module.exports = { updateUserRoleSchema, updateUserSchema, mongoIdSchema };
