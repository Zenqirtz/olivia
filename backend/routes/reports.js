const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const {
  generateReport,
  getReportHistory,
  downloadReport,
  deleteReport
} = require('../controllers/reportController');

// Apply authentication middleware to all routes
router.use(verifyToken);

// Generate and download report
router.post('/generate', generateReport);

// Get report history
router.get('/history', getReportHistory);

// Download existing report
router.get('/download/:reportId', downloadReport);

// Delete report from history
router.delete('/:reportId', deleteReport);

module.exports = router; 