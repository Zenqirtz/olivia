const { executeQuery } = require('../config/database');

// Get dashboard summary data
const getDashboardSummary = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    // Get today's egg statistics
    const eggStatsQuery = `
      SELECT 
        COUNT(*) as total_eggs_scanned,
        SUM(CASE WHEN quality = 'good' THEN 1 ELSE 0 END) as good_eggs,
        SUM(CASE WHEN quality = 'bad' THEN 1 ELSE 0 END) as bad_eggs,
        SUM(CASE WHEN quality = 'uncertain' THEN 1 ELSE 0 END) as uncertain_eggs,
        AVG(ai_confidence) as avg_ai_confidence,
        MAX(scanned_at) as last_scan_time
      FROM egg_ai_scans 
      WHERE DATE(scanned_at) = ?
    `;

    const eggStatsResult = await executeQuery(eggStatsQuery, [today]);

    // Get detection count (from HC-SR04 sensor)
    const detectionQuery = `
      SELECT COUNT(*) as total_eggs_detected
      FROM egg_detection_data 
      WHERE DATE(detected_at) = ?
    `;

    const detectionResult = await executeQuery(detectionQuery, [today]);

    // Get sorting statistics
    const sortingQuery = `
      SELECT 
        COUNT(*) as total_sorting_actions,
        SUM(CASE WHEN action_success = TRUE THEN 1 ELSE 0 END) as successful_sorting,
        SUM(CASE WHEN sorting_decision = 'sort_right' AND action_success = TRUE THEN 1 ELSE 0 END) as good_eggs_sorted,
        SUM(CASE WHEN sorting_decision = 'sort_left' AND action_success = TRUE THEN 1 ELSE 0 END) as bad_eggs_sorted
      FROM egg_sorting_actions 
      WHERE DATE(executed_at) = ?
    `;

    const sortingResult = await executeQuery(sortingQuery, [today]);

    // Get device status
    const deviceStatusQuery = `
      SELECT 
        COUNT(*) as total_devices,
        SUM(CASE WHEN status = 'online' THEN 1 ELSE 0 END) as online_devices,
        SUM(CASE WHEN status = 'offline' THEN 1 ELSE 0 END) as offline_devices,
        SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as error_devices
      FROM esp32_devices 
      WHERE is_active = TRUE
    `;

    const deviceStatusResult = await executeQuery(deviceStatusQuery);

    // Get active alerts
    const alertsQuery = `
      SELECT 
        COUNT(*) as total_alerts,
        SUM(CASE WHEN severity = 'critical' THEN 1 ELSE 0 END) as critical_alerts,
        SUM(CASE WHEN severity = 'high' THEN 1 ELSE 0 END) as high_alerts
      FROM alerts 
      WHERE status = 'active'
    `;

    const alertsResult = await executeQuery(alertsQuery);

    // Calculate statistics
    const eggStats = eggStatsResult.data[0];
    const detectionStats = detectionResult.data[0];
    const sortingStats = sortingResult.data[0];
    const deviceStats = deviceStatusResult.data[0];
    const alertStats = alertsResult.data[0];

    const totalScanned = eggStats.total_eggs_scanned || 0;
    const totalDetected = detectionStats.total_eggs_detected || 0;
    const goodEggs = eggStats.good_eggs || 0;
    const badEggs = eggStats.bad_eggs || 0;

    const goodPercentage = totalScanned > 0 ? (goodEggs / totalScanned) * 100 : 0;
    const scanCoverage = totalDetected > 0 ? (totalScanned / totalDetected) * 100 : 0;
    const sortingSuccessRate = sortingStats.total_sorting_actions > 0 
      ? (sortingStats.successful_sorting / sortingStats.total_sorting_actions) * 100 
      : 0;

    res.json({
      success: true,
      data: {
        summary: {
          total_eggs_detected: totalDetected,
          total_eggs_scanned: totalScanned,
          good_eggs: goodEggs,
          bad_eggs: badEggs,
          uncertain_eggs: eggStats.uncertain_eggs || 0,
          good_percentage: Math.round(goodPercentage * 100) / 100,
          scan_coverage_percentage: Math.round(scanCoverage * 100) / 100,
          avg_ai_confidence: eggStats.avg_ai_confidence || 0,
          last_scan_time: eggStats.last_scan_time
        },
        sorting: {
          total_actions: sortingStats.total_sorting_actions || 0,
          successful_actions: sortingStats.successful_sorting || 0,
          success_rate: Math.round(sortingSuccessRate * 100) / 100,
          good_eggs_sorted: sortingStats.good_eggs_sorted || 0,
          bad_eggs_sorted: sortingStats.bad_eggs_sorted || 0
        },
        devices: {
          total: deviceStats.total_devices || 0,
          online: deviceStats.online_devices || 0,
          offline: deviceStats.offline_devices || 0,
          error: deviceStats.error_devices || 0
        },
        alerts: {
          total: alertStats.total_alerts || 0,
          critical: alertStats.critical_alerts || 0,
          high: alertStats.high_alerts || 0
        },
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Dashboard summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard data'
    });
  }
};

// Get weekly statistics for charts
const getWeeklyStats = async (req, res) => {
  try {
    const weeklyQuery = `
      SELECT 
        DATE(scanned_at) as scan_date,
        COUNT(*) as total_scanned,
        SUM(CASE WHEN quality = 'good' THEN 1 ELSE 0 END) as good_eggs,
        SUM(CASE WHEN quality = 'bad' THEN 1 ELSE 0 END) as bad_eggs,
        AVG(ai_confidence) as avg_confidence
      FROM egg_ai_scans 
      WHERE scanned_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
      GROUP BY DATE(scanned_at)
      ORDER BY scan_date ASC
    `;

    const weeklyResult = await executeQuery(weeklyQuery);

    // Fill missing dates with zero values
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayData = weeklyResult.data.find(row => row.scan_date === dateStr);
      last7Days.push({
        date: dateStr,
        total_scanned: dayData ? dayData.total_scanned : 0,
        good_eggs: dayData ? dayData.good_eggs : 0,
        bad_eggs: dayData ? dayData.bad_eggs : 0,
        avg_confidence: dayData ? dayData.avg_confidence : 0
      });
    }

    res.json({
      success: true,
      data: {
        weekly_stats: last7Days
      }
    });
  } catch (error) {
    console.error('Weekly stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch weekly statistics'
    });
  }
};

// Get recent eggs data
const getRecentEggs = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const limitNum = parseInt(limit);
    const recentEggsQuery = `SELECT eas.scan_id, eas.egg_code, eas.quality, eas.ai_confidence, eas.quality_score, eas.scanned_at, eas.weight, eas.length, eas.width, eas.height FROM egg_ai_scans eas ORDER BY eas.scanned_at DESC LIMIT ${limitNum}`;

    const recentEggsResult = await executeQuery(recentEggsQuery, []);

    res.json({
      success: true,
      data: {
        recent_eggs: recentEggsResult.data || []
      }
    });
  } catch (error) {
    console.error('Recent eggs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch recent eggs data'
    });
  }
};

// Get system health status
const getSystemHealth = async (req, res) => {
  try {
    // Check database connection
    const dbHealthQuery = 'SELECT 1 as db_status';
    const dbHealthResult = await executeQuery(dbHealthQuery);

    // Get ESP32 devices health
    const devicesHealthQuery = `
      SELECT 
        device_id,
        device_name,
        device_type,
        status,
        last_heartbeat,
        signal_strength,
        TIMESTAMPDIFF(SECOND, last_heartbeat, NOW()) as seconds_since_heartbeat
      FROM esp32_devices 
      WHERE is_active = TRUE
    `;

    const devicesHealthResult = await executeQuery(devicesHealthQuery);

    // Check for recent errors
    const recentErrorsQuery = `
      SELECT COUNT(*) as error_count
      FROM esp32_device_logs 
      WHERE log_level = 'error' 
      AND created_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)
    `;

    const recentErrorsResult = await executeQuery(recentErrorsQuery);

    // Calculate overall health score
    const devices = devicesHealthResult.data || [];
    const onlineDevices = devices.filter(d => d.status === 'online').length;
    const totalDevices = devices.length;
    const deviceHealthScore = totalDevices > 0 ? (onlineDevices / totalDevices) * 100 : 100;

    const dbHealthy = dbHealthResult.success;
    const recentErrors = recentErrorsResult.data[0].error_count || 0;
    const errorHealthScore = Math.max(0, 100 - (recentErrors * 10));

    const overallHealthScore = (deviceHealthScore + errorHealthScore + (dbHealthy ? 100 : 0)) / 3;

    let healthStatus = 'excellent';
    if (overallHealthScore < 50) healthStatus = 'critical';
    else if (overallHealthScore < 70) healthStatus = 'warning';
    else if (overallHealthScore < 90) healthStatus = 'good';

    res.json({
      success: true,
      data: {
        overall_health: {
          score: Math.round(overallHealthScore),
          status: healthStatus
        },
        database: {
          status: dbHealthy ? 'healthy' : 'error',
          connected: dbHealthy
        },
        devices: {
          total: totalDevices,
          online: onlineDevices,
          offline: totalDevices - onlineDevices,
          health_score: Math.round(deviceHealthScore)
        },
        errors: {
          recent_count: recentErrors,
          health_score: Math.round(errorHealthScore)
        },
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('System health error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch system health'
    });
  }
};

module.exports = {
  getDashboardSummary,
  getWeeklyStats,
  getRecentEggs,
  getSystemHealth
}; 