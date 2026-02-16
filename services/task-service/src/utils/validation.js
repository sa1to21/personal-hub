const Joi = require('joi');

const createTaskSchema = Joi.object({
  title: Joi.string().max(255).required(),
  description: Joi.string().allow(null, '').optional(),
  status: Joi.string().valid('todo', 'in_progress', 'done').default('todo'),
  priority: Joi.string().valid('low', 'medium', 'high').default('medium'),
  due_date: Joi.date().iso().allow(null).optional(),
});

const updateTaskSchema = Joi.object({
  title: Joi.string().max(255).optional(),
  description: Joi.string().allow(null, '').optional(),
  status: Joi.string().valid('todo', 'in_progress', 'done').optional(),
  priority: Joi.string().valid('low', 'medium', 'high').optional(),
  due_date: Joi.date().iso().allow(null).optional(),
}).min(1);

const queryTasksSchema = Joi.object({
  status: Joi.string().valid('todo', 'in_progress', 'done').optional(),
  priority: Joi.string().valid('low', 'medium', 'high').optional(),
  sort_by: Joi.string().valid('created_at', 'updated_at', 'due_date', 'priority').default('created_at'),
  order: Joi.string().valid('asc', 'desc').default('desc'),
});

module.exports = {
  createTaskSchema,
  updateTaskSchema,
  queryTasksSchema,
};
