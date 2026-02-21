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

// Reorder checklist items
router.put('/task/:taskId/reorder', async (req, res) => {
  const client = await pool.connect();
  try {
    const { taskId } = req.params;
    const userId = req.user.userId;
    const { orderedIds } = req.body;

    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
      return res.status(400).json({ error: 'orderedIds must be a non-empty array' });
    }

    const taskCheck = await client.query(
      'SELECT id FROM tasks WHERE id = $1 AND user_id = $2',
      [taskId, userId]
    );
    if (taskCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    await client.query('BEGIN');
    for (let i = 0; i < orderedIds.length; i++) {
      await client.query(
        'UPDATE checklists SET position = $1 WHERE id = $2 AND task_id = $3',
        [i, orderedIds[i], taskId]
      );
    }
    await client.query('COMMIT');

    res.json({ message: 'Checklist reordered' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Reorder checklist error:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
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
