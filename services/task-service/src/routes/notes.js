const express = require('express');
const { pool, queryWithRetry } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);

// Get quick note
router.get('/quick', async (req, res) => {
  try {
    const result = await queryWithRetry(
      'SELECT id, content, updated_at FROM quick_notes WHERE user_id = $1',
      [req.user.userId]
    );
    res.json(result.rows[0] || { content: '' });
  } catch (error) {
    console.error('Get quick note error:', error);
    res.status(500).json({ error: 'Failed to get note' });
  }
});

// Save quick note (upsert)
router.put('/quick', async (req, res) => {
  try {
    const { content } = req.body;
    if (typeof content !== 'string') {
      return res.status(400).json({ error: '"content" must be a string' });
    }

    const result = await queryWithRetry(
      `INSERT INTO quick_notes (user_id, content, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (user_id)
       DO UPDATE SET content = $2, updated_at = NOW()
       RETURNING id, content, updated_at`,
      [req.user.userId, content]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Save quick note error:', error);
    res.status(500).json({ error: 'Failed to save note' });
  }
});

module.exports = router;
