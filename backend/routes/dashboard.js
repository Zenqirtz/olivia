const express = require('express');
const router = express.Router();
const { executeQuery } = require('../config/database');

// Test route
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Dashboard routes working',
    timestamp: new Date().toISOString()
  });
});

// Database test endpoint
router.get('/test-db', async (req, res) => {
  try {
    const result = await executeQuery('SELECT 1 as test');
    res.json({
      success: true,
      message: 'Database connection successful',
      data: result.data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Database connection failed',
      error: error.message
    });
  }
});

// Dashboard summary (placeholder)
router.get('/summary', (req, res) => {
  res.json({
    success: true,
    message: 'Dashboard summary endpoint',
    data: {
      totalEggs: 0,
      goodEggs: 0,
      badEggs: 0,
      devicesOnline: 0,
      alerts: 0
    }
  });
});

// Weekly stats (placeholder)
router.get('/weekly-stats', (req, res) => {
  res.json({
    success: true,
    message: 'Weekly stats endpoint',
    data: []
  });
});

// Recent eggs (placeholder)
router.get('/recent-eggs', (req, res) => {
  res.json({
    success: true,
    message: 'Recent eggs endpoint',
    data: []
  });
});

// System health (placeholder)
router.get('/system-health', (req, res) => {
  res.json({
    success: true,
    message: 'System health endpoint',
    data: {
      database: 'connected',
      server: 'running'
    }
  });
});

module.exports = router; 