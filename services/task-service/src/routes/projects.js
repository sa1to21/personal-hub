const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { createProjectSchema, updateProjectSchema } = require('../utils/validation');

const router = express.Router();

router.use(authenticateToken);

// List user's projects
router.get('/', async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await pool.query(
      `SELECT p.*,
        COUNT(t.id) FILTER (WHERE t.status = 'todo') AS todo_count,
        COUNT(t.id) FILTER (WHERE t.status = 'in_progress') AS in_progress_count,
        COUNT(t.id) FILTER (WHERE t.status = 'review') AS review_count,
        COUNT(t.id) FILTER (WHERE t.status = 'done') AS done_count,
        COUNT(t.id) AS total_tasks
       FROM projects p
       LEFT JOIN tasks t ON t.project_id = p.id
       WHERE p.user_id = $1
       GROUP BY p.id
       ORDER BY p.position ASC, p.created_at DESC`,
      [userId]
    );

    res.json({ projects: result.rows });
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create project
router.post('/', async (req, res) => {
  try {
    const { error, value } = createProjectSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { name, description, color } = value;
    const userId = req.user.userId;

    const result = await pool.query(
      `INSERT INTO projects (user_id, name, description, color, position)
       VALUES ($1, $2, $3, $4, (SELECT COALESCE(MAX(position), -1) + 1 FROM projects WHERE user_id = $1))
       RETURNING *`,
      [userId, name, description || null, color]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single project with task counts
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const result = await pool.query(
      `SELECT p.*,
        COUNT(t.id) FILTER (WHERE t.status = 'todo') AS todo_count,
        COUNT(t.id) FILTER (WHERE t.status = 'in_progress') AS in_progress_count,
        COUNT(t.id) FILTER (WHERE t.status = 'review') AS review_count,
        COUNT(t.id) FILTER (WHERE t.status = 'done') AS done_count,
        COUNT(t.id) AS total_tasks
       FROM projects p
       LEFT JOIN tasks t ON t.project_id = p.id
       WHERE p.id = $1 AND p.user_id = $2
       GROUP BY p.id`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get project error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update project
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const { error, value } = updateProjectSchema.validate(req.body);
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

    updates.push('updated_at = NOW()');
    params.push(id, userId);

    const query = `
      UPDATE projects
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
      RETURNING *
    `;

    const result = await pool.query(query, params);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Reorder projects
router.put('/reorder', async (req, res) => {
  const client = await pool.connect();
  try {
    const userId = req.user.userId;
    const { orderedIds } = req.body;

    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
      return res.status(400).json({ error: 'orderedIds must be a non-empty array' });
    }

    await client.query('BEGIN');
    for (let i = 0; i < orderedIds.length; i++) {
      await client.query(
        'UPDATE projects SET position = $1, updated_at = NOW() WHERE id = $2 AND user_id = $3',
        [i, orderedIds[i], userId]
      );
    }
    await client.query('COMMIT');

    res.json({ message: 'Projects reordered' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Reorder projects error:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// Delete project
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const result = await pool.query(
      'DELETE FROM projects WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json({ message: 'Project deleted successfully', id: result.rows[0].id });
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
