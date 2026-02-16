const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { createLabelSchema } = require('../utils/validation');

const router = express.Router();

router.use(authenticateToken);

// List project labels
router.get('/project/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user.userId;

    // Verify project ownership
    const projectCheck = await pool.query(
      'SELECT id FROM projects WHERE id = $1 AND user_id = $2',
      [projectId, userId]
    );
    if (projectCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const result = await pool.query(
      'SELECT * FROM labels WHERE project_id = $1 ORDER BY name ASC',
      [projectId]
    );

    res.json({ labels: result.rows });
  } catch (error) {
    console.error('Get labels error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create label for project
router.post('/project/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user.userId;

    const projectCheck = await pool.query(
      'SELECT id FROM projects WHERE id = $1 AND user_id = $2',
      [projectId, userId]
    );
    if (projectCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const { error, value } = createLabelSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const result = await pool.query(
      `INSERT INTO labels (project_id, name, color)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [projectId, value.name, value.color]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create label error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete label
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const ownerCheck = await pool.query(
      `SELECT l.id FROM labels l
       JOIN projects p ON p.id = l.project_id
       WHERE l.id = $1 AND p.user_id = $2`,
      [id, userId]
    );
    if (ownerCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Label not found' });
    }

    await pool.query('DELETE FROM labels WHERE id = $1', [id]);

    res.json({ message: 'Label deleted', id });
  } catch (error) {
    console.error('Delete label error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Attach label to task
router.post('/task/:taskId/:labelId', async (req, res) => {
  try {
    const { taskId, labelId } = req.params;
    const userId = req.user.userId;

    // Verify task ownership
    const taskCheck = await pool.query(
      'SELECT id FROM tasks WHERE id = $1 AND user_id = $2',
      [taskId, userId]
    );
    if (taskCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    await pool.query(
      `INSERT INTO task_labels (task_id, label_id)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [taskId, labelId]
    );

    res.json({ message: 'Label attached', taskId, labelId });
  } catch (error) {
    console.error('Attach label error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Remove label from task
router.delete('/task/:taskId/:labelId', async (req, res) => {
  try {
    const { taskId, labelId } = req.params;
    const userId = req.user.userId;

    const taskCheck = await pool.query(
      'SELECT id FROM tasks WHERE id = $1 AND user_id = $2',
      [taskId, userId]
    );
    if (taskCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    await pool.query(
      'DELETE FROM task_labels WHERE task_id = $1 AND label_id = $2',
      [taskId, labelId]
    );

    res.json({ message: 'Label removed', taskId, labelId });
  } catch (error) {
    console.error('Remove label error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
