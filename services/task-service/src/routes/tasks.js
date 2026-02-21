const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { createTaskSchema, updateTaskSchema, queryTasksSchema } = require('../utils/validation');

const router = express.Router();

router.use(authenticateToken);

// List tasks for a project
router.get('/project/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user.userId;

    const { error, value } = queryTasksSchema.validate(req.query);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { status, priority, sort_by, order } = value;

    let query = `
      SELECT t.*,
        COALESCE(
          (SELECT json_agg(
            json_build_object('id', cl.id, 'title', cl.title, 'is_completed', cl.is_completed, 'position', cl.position)
            ORDER BY cl.position ASC
          ) FROM checklists cl WHERE cl.task_id = t.id),
          '[]'
        ) AS checklist,
        COALESCE(
          (SELECT json_agg(
            json_build_object('id', l.id, 'name', l.name, 'color', l.color)
          ) FROM task_labels tl JOIN labels l ON l.id = tl.label_id WHERE tl.task_id = t.id),
          '[]'
        ) AS labels
      FROM tasks t
      WHERE t.project_id = $1 AND t.user_id = $2
    `;
    const params = [projectId, userId];
    let paramIndex = 3;

    if (status) {
      query += ` AND t.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (priority) {
      query += ` AND t.priority = $${paramIndex}`;
      params.push(priority);
      paramIndex++;
    }

    const orderByMap = {
      created_at: 't.created_at',
      updated_at: 't.updated_at',
      due_date: 't.due_date',
      priority: `CASE t.priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 END`,
      position: 't.position',
    };

    query += ` ORDER BY ${orderByMap[sort_by]} ${order.toUpperCase()}`;

    const result = await pool.query(query, params);

    res.json({
      tasks: result.rows,
      total: result.rows.length,
    });
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create task in project
router.post('/project/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user.userId;

    const { error, value } = createTaskSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { title, description, status, priority, due_date } = value;

    const result = await pool.query(
      `INSERT INTO tasks (project_id, user_id, title, description, status, priority, due_date, position)
       SELECT $1, $2, $3, $4, $5, $6, $7, COALESCE(MAX(t.position), -1) + 1
       FROM projects p
       LEFT JOIN tasks t ON t.project_id = p.id AND t.status = $5
       WHERE p.id = $1 AND p.user_id = $2
       GROUP BY p.id
       RETURNING *`,
      [projectId, userId, title, description || null, status, priority, due_date || null]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single task with checklists and labels
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const result = await pool.query(
      `SELECT t.*,
        COALESCE(
          (SELECT json_agg(
            json_build_object('id', cl.id, 'title', cl.title, 'is_completed', cl.is_completed, 'position', cl.position)
            ORDER BY cl.position ASC
          ) FROM checklists cl WHERE cl.task_id = t.id),
          '[]'
        ) AS checklist,
        COALESCE(
          (SELECT json_agg(
            json_build_object('id', l.id, 'name', l.name, 'color', l.color)
          ) FROM task_labels tl JOIN labels l ON l.id = tl.label_id WHERE tl.task_id = t.id),
          '[]'
        ) AS labels
      FROM tasks t
      WHERE t.id = $1 AND t.user_id = $2`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get task error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update task
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const { error, value } = updateTaskSchema.validate(req.body);
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
      UPDATE tasks
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
      RETURNING *
    `;

    const result = await pool.query(query, params);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Reorder task (move between columns and/or reorder within column)
router.patch('/:id/reorder', async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const { status, position } = req.body;

    if (!['todo', 'in_progress', 'review', 'done'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    if (typeof position !== 'number' || position < 0) {
      return res.status(400).json({ error: 'Invalid position' });
    }

    await client.query('BEGIN');

    const taskResult = await client.query(
      'SELECT * FROM tasks WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    if (taskResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Task not found' });
    }

    const task = taskResult.rows[0];
    const oldStatus = task.status;
    const oldPosition = task.position;

    if (oldStatus === status) {
      if (oldPosition < position) {
        await client.query(
          `UPDATE tasks SET position = position - 1
           WHERE project_id = $1 AND user_id = $2 AND status = $3
             AND position > $4 AND position <= $5 AND id != $6`,
          [task.project_id, userId, status, oldPosition, position, id]
        );
      } else if (oldPosition > position) {
        await client.query(
          `UPDATE tasks SET position = position + 1
           WHERE project_id = $1 AND user_id = $2 AND status = $3
             AND position >= $4 AND position < $5 AND id != $6`,
          [task.project_id, userId, status, position, oldPosition, id]
        );
      }
    } else {
      await client.query(
        `UPDATE tasks SET position = position - 1
         WHERE project_id = $1 AND user_id = $2 AND status = $3
           AND position > $4`,
        [task.project_id, userId, oldStatus, oldPosition]
      );
      await client.query(
        `UPDATE tasks SET position = position + 1
         WHERE project_id = $1 AND user_id = $2 AND status = $3
           AND position >= $4`,
        [task.project_id, userId, status, position]
      );
    }

    const result = await client.query(
      `UPDATE tasks SET status = $1, position = $2, updated_at = NOW()
       WHERE id = $3 AND user_id = $4
       RETURNING *`,
      [status, position, id, userId]
    );

    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Reorder task error:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// Quick status change
router.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const { status } = req.body;

    if (!['todo', 'in_progress', 'review', 'done'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const result = await pool.query(
      `UPDATE tasks SET status = $1, updated_at = NOW()
       WHERE id = $2 AND user_id = $3
       RETURNING *`,
      [status, id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update task status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete task
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const result = await pool.query(
      'DELETE FROM tasks WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json({ message: 'Task deleted successfully', id: result.rows[0].id });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
