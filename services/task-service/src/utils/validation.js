const Joi = require('joi');

// Project schemas
const createProjectSchema = Joi.object({
  name: Joi.string().max(100).required(),
  description: Joi.string().allow(null, '').optional(),
  color: Joi.string().pattern(/^#[0-9a-fA-F]{6}$/).default('#5b5fc7'),
});

const updateProjectSchema = Joi.object({
  name: Joi.string().max(100).optional(),
  description: Joi.string().allow(null, '').optional(),
  color: Joi.string().pattern(/^#[0-9a-fA-F]{6}$/).optional(),
  position: Joi.number().integer().min(0).optional(),
}).min(1);

// Task schemas
const createTaskSchema = Joi.object({
  title: Joi.string().max(255).required(),
  description: Joi.string().allow(null, '').optional(),
  status: Joi.string().valid('todo', 'in_progress', 'review', 'done').default('todo'),
  priority: Joi.string().valid('low', 'medium', 'high', 'urgent').default('medium'),
  due_date: Joi.date().iso().allow(null).optional(),
  position: Joi.number().integer().min(0).optional(),
});

const updateTaskSchema = Joi.object({
  title: Joi.string().max(255).optional(),
  description: Joi.string().allow(null, '').optional(),
  status: Joi.string().valid('todo', 'in_progress', 'review', 'done').optional(),
  priority: Joi.string().valid('low', 'medium', 'high', 'urgent').optional(),
  due_date: Joi.date().iso().allow(null).optional(),
  position: Joi.number().integer().min(0).optional(),
}).min(1);

const queryTasksSchema = Joi.object({
  status: Joi.string().valid('todo', 'in_progress', 'review', 'done').optional(),
  priority: Joi.string().valid('low', 'medium', 'high', 'urgent').optional(),
  sort_by: Joi.string().valid('created_at', 'updated_at', 'due_date', 'priority', 'position').default('position'),
  order: Joi.string().valid('asc', 'desc').default('asc'),
});

// Checklist schemas
const createChecklistSchema = Joi.object({
  title: Joi.string().max(255).required(),
  position: Joi.number().integer().min(0).optional(),
});

const updateChecklistSchema = Joi.object({
  title: Joi.string().max(255).optional(),
  is_completed: Joi.boolean().optional(),
  position: Joi.number().integer().min(0).optional(),
}).min(1);

// Label schemas
const createLabelSchema = Joi.object({
  name: Joi.string().max(50).required(),
  color: Joi.string().pattern(/^#[0-9a-fA-F]{6}$/).required(),
});

module.exports = {
  createProjectSchema,
  updateProjectSchema,
  createTaskSchema,
  updateTaskSchema,
  queryTasksSchema,
  createChecklistSchema,
  updateChecklistSchema,
  createLabelSchema,
};
