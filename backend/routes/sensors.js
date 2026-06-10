const express = require('express');
const router = express.Router();
const {
  getSensorReadings,
  getLatestSensorReading,
  addSensorReading,
  getSensorLogs
} = require('../controllers/sensorController');

// GET /api/sensors/readings?period=24h|7d|30d - Get sensor readings for chart
router.get('/readings', getSensorReadings);

// GET /api/sensors/latest - Get latest sensor reading
router.get('/latest', getLatestSensorReading);

// GET /api/sensors/logs - Get paginated/filtered sensor readings list
router.get('/logs', getSensorLogs);

// POST /api/sensors/readings - ESP32 sends sensor data
router.post('/readings', addSensorReading);

module.exports = router;
