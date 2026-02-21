const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { createChecklistSchema, updateChecklistSchema } = require('../utils/validation');

const router = express.Router();

router.use(authenticateToken);

// Add checklist item to task
router.post('/task/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;
    const userId = req.user.userId;

    const { error, value } = createChecklistSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const result = await pool.query(
      `INSERT INTO checklists (task_id, title, position)
       SELECT $1, $2, COALESCE($4::int, COALESCE(MAX(cl.position), -1) + 1)
       FROM tasks t
       LEFT JOIN checklists cl ON cl.task_id = t.id
       WHERE t.id = $1 AND t.user_id = $3
       GROUP BY t.id
       RETURNING *`,
      [taskId, value.title, userId, value.position ?? null]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create checklist item error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update checklist item
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const { error, value } = updateChecklistSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const updates = [];
    const params = [];
    let paramIndex = 1;

    Object.entries(value).forEach(([key, val]) => {
      updates.push(`${key} = $${paramIndex}`);
      params.push(val);
      paramIndex++;
    });

    params.push(id, userId);

    const result = await pool.query(
      `UPDATE checklists SET ${updates.join(', ')}
       WHERE id = $${paramIndex} AND task_id IN (SELECT id FROM tasks WHERE user_id = $${paramIndex + 1})
       RETURNING *`,
      params
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Checklist item not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update checklist item error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Toggle checklist item
router.patch('/:id/toggle', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const result = await pool.query(
      `UPDATE checklists SET is_completed = NOT is_completed
       WHERE id = $1 AND task_id IN (SELECT id FROM tasks WHERE user_id = $2)
       RETURNING *`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Checklist item not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Toggle checklist item error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete checklist item
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const result = await pool.query(
      `DELETE FROM checklists
       WHERE id = $1 AND task_id IN (SELECT id FROM tasks WHERE user_id = $2)
       RETURNING id`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Checklist item not found' });
    }

    res.json({ message: 'Checklist item deleted', id });
  } catch (error) {
    console.error('Delete checklist item error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
