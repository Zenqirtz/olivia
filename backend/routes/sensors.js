const express = require('express');
const router = express.Router();
const {
  getSensorReadings,
  getLatestSensorReading,
  addSensorReading
} = require('../controllers/sensorController');

// GET /api/sensors/readings?period=24h|7d|30d - Get sensor readings for chart
router.get('/readings', getSensorReadings);

// GET /api/sensors/latest - Get latest sensor reading
router.get('/latest', getLatestSensorReading);

// POST /api/sensors/readings - ESP32 sends sensor data
router.post('/readings', addSensorReading);

module.exports = router;
