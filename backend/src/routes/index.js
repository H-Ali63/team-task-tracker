const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const taskRoutes = require('./taskRoutes');
const userRoutes = require('./userRoutes');

router.use('/auth', authRoutes);
router.use('/tasks', taskRoutes);
router.use('/users', userRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
  });
});

module.exports = router;
