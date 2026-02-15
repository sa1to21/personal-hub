require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initDatabase } = require('./config/database');
const authRoutes = require('./routes/auth');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'auth-service' });
});

app.use('/api/auth', authRoutes);

const startServer = async () => {
  try {
    await initDatabase();
    app.listen(PORT, () => {
      console.log(`Auth service running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
