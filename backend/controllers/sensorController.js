const { executeQuery } = require('../config/database');
const https = require('https');

// No rate limiting — send Telegram alert on every reading above 20 ppm

const sendTelegramNotification = (ammoniaValue) => {
  return new Promise((resolve, reject) => {
    const token = process.env.TELEGRAM_BOT_TOKEN || '8907343340:AAGcEKEujL36M6NoEp9UAYsfdc4q-qnKOSU';
    const chatId = process.env.TELEGRAM_CHAT_ID || '-5003036425';
    const message = `⚠️ *PERINGATAN KRITIS AMONIA* ⚠️\n\nKadar gas amonia di dalam kandang terdeteksi sebesar *${ammoniaValue} ppm* (melebihi batas aman *20 ppm*).\n\nMohon segera periksa kondisi ventilasi udara, kipas angin, atau lakukan penanganan sekam kandang!`;

    const payload = JSON.stringify({
      chat_id: chatId,
      text: message,
      parse_mode: 'Markdown'
    });

    const options = {
      hostname: 'api.telegram.org',
      port: 443,
      path: `/bot${token}/sendMessage`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.ok) {
            console.log('Telegram alert sent successfully');
            resolve(parsed);
          } else {
            console.error('Telegram API error:', parsed);
            reject(new Error(parsed.description || 'Unknown error'));
          }
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', (error) => {
      console.error('Telegram request error:', error);
      reject(error);
    });

    req.write(payload);
    req.end();
  });
};

// Get sensor readings for chart
const getSensorReadings = async (req, res) => {
  try {
    const { period = '24h' } = req.query;

    let intervalClause;
    let groupBy;
    let dateFormat;

    switch (period) {
      case '7d':
        intervalClause = 'INTERVAL 7 DAY';
        // Group by 6-hour blocks for 7-day view
        groupBy = `DATE(recorded_at), FLOOR(HOUR(recorded_at) / 6)`;
        dateFormat = `DATE_FORMAT(MIN(recorded_at), '%d/%m %Hh')`;
        break;
      case '30d':
        intervalClause = 'INTERVAL 30 DAY';
        // Group by day for 30-day view
        groupBy = `DATE(recorded_at)`;
        dateFormat = `DATE_FORMAT(MIN(recorded_at), '%d/%m')`;
        break;
      case '24h':
      default:
        intervalClause = 'INTERVAL 24 HOUR';
        // Group by 5-minute intervals for 24h view (max ~288 data points)
        groupBy = `DATE(recorded_at), FLOOR(HOUR(recorded_at) * 12 + MINUTE(recorded_at) / 5)`;
        dateFormat = `DATE_FORMAT(MIN(recorded_at), '%H:%i')`;
        break;
    }

    const query = `
      SELECT
        ${dateFormat} as label,
        ROUND(AVG(temperature), 1) as temperature,
        ROUND(AVG(humidity), 1) as humidity,
        ROUND(AVG(ammonia), 1) as ammonia,
        MIN(recorded_at) as recorded_at
      FROM sensor_readings
      WHERE recorded_at >= DATE_SUB(NOW(), ${intervalClause})
      GROUP BY ${groupBy}
      ORDER BY MIN(recorded_at) ASC
    `;

    const result = await executeQuery(query, []);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: 'Gagal mengambil data sensor dari database',
        error: result.error
      });
    }

    res.json({
      success: true,
      data: {
        readings: result.data || [],
        period: period
      }
    });
  } catch (error) {
    console.error('Get sensor readings error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil data sensor'
    });
  }
};

// Get latest sensor reading
const getLatestSensorReading = async (req, res) => {
  try {
    const query = `
      SELECT
        temperature,
        humidity,
        ammonia,
        recorded_at
      FROM sensor_readings
      ORDER BY recorded_at DESC
      LIMIT 1
    `;

    const result = await executeQuery(query, []);
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: 'Gagal mengambil data sensor terbaru dari database',
        error: result.error
      });
    }

    const latest = result.data && result.data.length > 0 ? result.data[0] : null;

    res.json({
      success: true,
      data: {
        latest: latest
      }
    });
  } catch (error) {
    console.error('Get latest sensor reading error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil data sensor terbaru'
    });
  }
};

// POST endpoint for ESP32 to send sensor data
const addSensorReading = async (req, res) => {
  try {
    const { device_id, temperature, humidity, ammonia } = req.body;

    if (temperature === undefined || humidity === undefined || ammonia === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Temperature, humidity, dan ammonia wajib diisi'
      });
    }

    const query = `
      INSERT INTO sensor_readings (device_id, temperature, humidity, ammonia, recorded_at)
      VALUES (?, ?, ?, ?, NOW())
    `;

    const result = await executeQuery(query, [device_id || null, temperature, humidity, ammonia]);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: 'Gagal menyimpan data sensor ke database',
        error: result.error
      });
    }

    // Trigger Telegram notification immediately on every reading above 20 ppm
    const parsedAmmonia = parseFloat(ammonia);
    if (!isNaN(parsedAmmonia) && parsedAmmonia > 20) {
      console.log(`⚠️ Ammonia ${parsedAmmonia} ppm > 20 ppm — sending Telegram alert...`);
      sendTelegramNotification(parsedAmmonia).catch(err => {
        console.error('Background Telegram notification alert failed:', err);
      });
    }

    res.status(201).json({
      success: true,
      message: 'Data sensor berhasil disimpan'
    });
  } catch (error) {
    console.error('Add sensor reading error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal menyimpan data sensor'
    });
  }
};

module.exports = {
  getSensorReadings,
  getLatestSensorReading,
  addSensorReading
};
