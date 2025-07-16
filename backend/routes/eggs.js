const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middleware/auth');
const {
  getAllEggs,
  getEggStatistics,
  getEggById,
  getRecentEggs,
  getDailyEggSummary,
  getAvailableDates
} = require('../controllers/eggController');

// Apply authentication middleware to all routes
// router.use(verifyToken);

// GET /api/eggs - Get all eggs with filtering and pagination
router.get('/', getAllEggs);

// GET /api/eggs/statistics - Get egg statistics by date
router.get('/statistics', getEggStatistics);

// GET /api/eggs/recent - Get recent eggs
router.get('/recent', getRecentEggs);

// GET /api/eggs/daily-summary - Get daily egg summary
router.get('/daily-summary', getDailyEggSummary);

// GET /api/eggs/available-dates - Get available dates with egg data
router.get('/available-dates', getAvailableDates);

// GET /api/eggs/:id - Get egg details by ID
router.get('/:id', getEggById);

module.exports = router; 