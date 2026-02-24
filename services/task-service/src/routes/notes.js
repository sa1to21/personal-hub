const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { upsertDailyNoteSchema } = require('../utils/validation');

const router = express.Router();
router.use(authenticateToken);

// Get daily note for a specific date (defaults to today)
router.get('/daily', async (req, res) => {
  try {
    const date = req.query.date || new Date().toISOString().split('T')[0];
    const result = await pool.query(
      'SELECT id, content, date, updated_at FROM daily_notes WHERE user_id = $1 AND date = $2',
      [req.user.userId, date]
    );
    res.json(result.rows[0] || { content: '', date });
  } catch (error) {
    console.error('Get daily note error:', error);
    res.status(500).json({ error: 'Failed to get daily note' });
  }
});

// Create or update daily note (upsert)
router.put('/daily', async (req, res) => {
  try {
    const { error, value } = upsertDailyNoteSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const date = value.date
      ? new Date(value.date).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0];

    const result = await pool.query(
      `INSERT INTO daily_notes (user_id, date, content, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (user_id, date)
       DO UPDATE SET content = $3, updated_at = NOW()
       RETURNING id, content, date, updated_at`,
      [req.user.userId, date, value.content]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Upsert daily note error:', error);
    res.status(500).json({ error: 'Failed to save daily note' });
  }
});

module.exports = router;
