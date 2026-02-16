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

    // Verify task ownership
    const taskCheck = await pool.query(
      'SELECT id FROM tasks WHERE id = $1 AND user_id = $2',
      [taskId, userId]
    );
    if (taskCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const { error, value } = createChecklistSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const posResult = await pool.query(
      'SELECT COALESCE(MAX(position), -1) + 1 AS next_pos FROM checklists WHERE task_id = $1',
      [taskId]
    );

    const result = await pool.query(
      `INSERT INTO checklists (task_id, title, position)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [taskId, value.title, value.position ?? posResult.rows[0].next_pos]
    );

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

    // Verify ownership through task
    const ownerCheck = await pool.query(
      `SELECT cl.id FROM checklists cl
       JOIN tasks t ON t.id = cl.task_id
       WHERE cl.id = $1 AND t.user_id = $2`,
      [id, userId]
    );
    if (ownerCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Checklist item not found' });
    }

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

    params.push(id);

    const result = await pool.query(
      `UPDATE checklists SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      params
    );

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

    const ownerCheck = await pool.query(
      `SELECT cl.id FROM checklists cl
       JOIN tasks t ON t.id = cl.task_id
       WHERE cl.id = $1 AND t.user_id = $2`,
      [id, userId]
    );
    if (ownerCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Checklist item not found' });
    }

    const result = await pool.query(
      `UPDATE checklists SET is_completed = NOT is_completed WHERE id = $1 RETURNING *`,
      [id]
    );

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

    const ownerCheck = await pool.query(
      `SELECT cl.id FROM checklists cl
       JOIN tasks t ON t.id = cl.task_id
       WHERE cl.id = $1 AND t.user_id = $2`,
      [id, userId]
    );
    if (ownerCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Checklist item not found' });
    }

    await pool.query('DELETE FROM checklists WHERE id = $1', [id]);

    res.json({ message: 'Checklist item deleted', id });
  } catch (error) {
    console.error('Delete checklist item error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
