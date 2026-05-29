const { executeQuery } = require('../config/database');

// Get all eggs with filtering and pagination
const getAllEggs = async (req, res) => {
  try {
    // For Postman testing, use: GET /api/eggs?page=1&limit=10&date=2023-12-01&quality=good&sort_by=scanned_at&sort_order=DESC
    const { 
      page = 1, 
      limit = 10, 
      date, 
      quality, 
      sort_by = 'scanned_at',
      sort_order = 'DESC'
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;
    
    let whereConditions = [];
    let queryParams = [];

    // Build WHERE conditions
    if (date) {
      whereConditions.push('DATE(scanned_at) = ?');
      queryParams.push(date);
    }

    if (quality && quality !== 'all') {
      whereConditions.push('quality = ?');
      queryParams.push(quality);
    }

    const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM egg_scans
      ${whereClause}
    `;

    const countResult = await executeQuery(countQuery, queryParams);
    const totalRecords = countResult.data[0].total;

    // Get eggs data - using string interpolation for LIMIT/OFFSET to avoid MySQL driver bug
    const eggsQuery = `SELECT scan_id, egg_code, quality, image, scanned_at, created_at FROM egg_scans ${whereClause} ORDER BY ${sort_by} ${sort_order} LIMIT ${limitNum} OFFSET ${offset}`;

    // Only use search/filter params, not limit/offset
    const eggsParams = [...queryParams];
    const eggsResult = await executeQuery(eggsQuery, eggsParams);

    // Calculate pagination info
    const totalPages = Math.ceil(totalRecords / limitNum);

    res.json({
      success: true,
      data: {
        eggs: eggsResult.data || [],
        pagination: {
          current_page: pageNum,
          total_pages: totalPages,
          total_records: totalRecords,
          per_page: limitNum,
          has_next: pageNum < totalPages,
          has_prev: pageNum > 1
        }
      }
    });
  } catch (error) {
    console.error('Get all eggs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch eggs data'
    });
  }
};

// Get egg statistics by date
const getEggStatistics = async (req, res) => {
  try {
    const { date, start_date, end_date } = req.query;
    
    let whereCondition = '';
    let queryParams = [];

    if (date) {
      whereCondition = 'WHERE DATE(scanned_at) = ?';
      queryParams.push(date);
    } else if (start_date && end_date) {
      whereCondition = 'WHERE DATE(scanned_at) BETWEEN ? AND ?';
      queryParams.push(start_date, end_date);
    } else {
      whereCondition = 'WHERE DATE(scanned_at) = CURDATE()';
    }

    const statsQuery = `
      SELECT 
        DATE(scanned_at) as scan_date,
        COUNT(*) as total_eggs,
        SUM(CASE WHEN quality = 'good' THEN 1 ELSE 0 END) as good_eggs,
        SUM(CASE WHEN quality = 'bad' THEN 1 ELSE 0 END) as bad_eggs,
        ROUND((SUM(CASE WHEN quality = 'good' THEN 1 ELSE 0 END) / COUNT(*)) * 100, 2) as good_percentage,
        ROUND((SUM(CASE WHEN quality = 'bad' THEN 1 ELSE 0 END) / COUNT(*)) * 100, 2) as bad_percentage,
        MIN(scanned_at) as first_scan,
        MAX(scanned_at) as last_scan
      FROM egg_scans 
      ${whereCondition}
      GROUP BY DATE(scanned_at)
      ORDER BY scan_date DESC
    `;

    const statsResult = await executeQuery(statsQuery, queryParams);

    res.json({
      success: true,
      data: {
        statistics: statsResult.data || []
      }
    });
  } catch (error) {
    console.error('Get egg statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch egg statistics'
    });
  }
};

// Get egg details by ID
const getEggById = async (req, res) => {
  try {
    const { id } = req.params;

    const eggQuery = `
      SELECT 
        scan_id,
        egg_code,
        quality,
        image,
        scanned_at,
        created_at
      FROM egg_scans
      WHERE scan_id = ?
    `;

    const eggResult = await executeQuery(eggQuery, [id]);

    if (!eggResult.data || eggResult.data.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Egg data not found'
      });
    }

    res.json({
      success: true,
      data: {
        egg: eggResult.data[0]
      }
    });
  } catch (error) {
    console.error('Get egg by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch egg details'
    });
  }
};

// Get recent eggs
const getRecentEggs = async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const limitNum = parseInt(limit);

    const recentEggsQuery = `SELECT scan_id, egg_code, quality, scanned_at FROM egg_scans ORDER BY scanned_at DESC LIMIT ${limitNum}`;

    const recentEggsResult = await executeQuery(recentEggsQuery, []);

    res.json({
      success: true,
      data: {
        recent_eggs: recentEggsResult.data || []
      }
    });
  } catch (error) {
    console.error('Get recent eggs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch recent eggs data'
    });
  }
};

// Get daily egg summary for dashboard
const getDailyEggSummary = async (req, res) => {
  try {
    const { date } = req.query;
    let targetDate = date;
    if (!targetDate) {
      const d = new Date();
      targetDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }

    const summaryQuery = `
      SELECT 
        COUNT(*) as total_eggs,
        SUM(CASE WHEN quality = 'good' THEN 1 ELSE 0 END) as good_eggs,
        SUM(CASE WHEN quality = 'bad' THEN 1 ELSE 0 END) as bad_eggs,
        ROUND((SUM(CASE WHEN quality = 'good' THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0)) * 100, 2) as good_percentage,
        MIN(scanned_at) as first_scan,
        MAX(scanned_at) as last_scan
      FROM egg_scans 
      WHERE DATE(scanned_at) = ?
    `;

    const yesterdayQuery = `
      SELECT COUNT(*) as total_eggs
      FROM egg_scans
      WHERE DATE(scanned_at) = DATE_SUB(?, INTERVAL 1 DAY)
    `;

    const [summaryResult, yesterdayResult] = await Promise.all([
      executeQuery(summaryQuery, [targetDate]),
      executeQuery(yesterdayQuery, [targetDate])
    ]);

    const summary = summaryResult.data[0] || {
      total_eggs: 0,
      good_eggs: 0,
      bad_eggs: 0,
      good_percentage: 0,
      first_scan: null,
      last_scan: null
    };

    const yesterdayTotal = yesterdayResult.data && yesterdayResult.data.length > 0
      ? yesterdayResult.data[0].total_eggs
      : 0;

    let trend = 0;
    if (yesterdayTotal > 0) {
      trend = ((summary.total_eggs - yesterdayTotal) / yesterdayTotal) * 100;
    } else if (summary.total_eggs > 0) {
      trend = 100.0;
    } else {
      trend = 0.0;
    }

    // Batasi trend peningkatan maksimal 100% dan minimal -100%
    trend = Math.max(-100.0, Math.min(100.0, trend));

    summary.trend = trend;

    res.json({
      success: true,
      data: {
        date: targetDate,
        summary: summary
      }
    });
  } catch (error) {
    console.error('Get daily egg summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch daily egg summary'
    });
  }
};

// Get available dates with egg data
const getAvailableDates = async (req, res) => {
  try {
    const { limit = 30 } = req.query;
    const limitNum = parseInt(limit);

    const datesQuery = `SELECT DATE(scanned_at) as scan_date, COUNT(*) as total_eggs, SUM(CASE WHEN quality = 'good' THEN 1 ELSE 0 END) as good_eggs, SUM(CASE WHEN quality = 'bad' THEN 1 ELSE 0 END) as bad_eggs FROM egg_scans GROUP BY DATE(scanned_at) ORDER BY scan_date DESC LIMIT ${limitNum}`;

    const datesResult = await executeQuery(datesQuery, []);

    res.json({
      success: true,
      data: {
        available_dates: datesResult.data || []
      }
    });
  } catch (error) {
    console.error('Get available dates error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch available dates'
    });
  }
};

// Get weekly egg summary for dashboard donut chart (weekly mode)
const getWeeklyEggSummary = async (req, res) => {
  try {
    const summaryQuery = `
      SELECT 
        COUNT(*) as total_eggs,
        SUM(CASE WHEN quality = 'good' THEN 1 ELSE 0 END) as good_eggs,
        SUM(CASE WHEN quality = 'bad' THEN 1 ELSE 0 END) as bad_eggs,
        ROUND((SUM(CASE WHEN quality = 'good' THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0)) * 100, 2) as good_percentage,
        MIN(DATE(scanned_at)) as start_date,
        MAX(DATE(scanned_at)) as end_date
      FROM egg_scans 
      WHERE DATE(scanned_at) >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
    `;

    const summaryResult = await executeQuery(summaryQuery, []);
    const summary = summaryResult.data[0] || {
      total_eggs: 0,
      good_eggs: 0,
      bad_eggs: 0,
      good_percentage: 0,
      start_date: null,
      end_date: null
    };

    res.json({
      success: true,
      data: {
        period: '7days',
        summary: summary
      }
    });
  } catch (error) {
    console.error('Get weekly egg summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch weekly egg summary'
    });
  }
};

// POST /api/eggs - Add a new egg scan
const addEggScan = async (req, res) => {
  try {
    const { 
      egg_code, 
      quality, 
      ai_confidence, 
      quality_score, 
      image, 
      weight, 
      length, 
      width, 
      height 
    } = req.body;

    if (!quality) {
      return res.status(400).json({
        success: false,
        message: 'Quality is required'
      });
    }

    // Generate a unique egg code if not provided
    const finalEggCode = egg_code || `EGG-${new Date().toISOString().replace(/[-:T.]/g, '').substring(0, 14)}-${Math.floor(1000 + Math.random() * 9000)}`;

    const query = `
      INSERT INTO egg_scans (
        egg_code, 
        quality, 
        ai_confidence, 
        quality_score, 
        image, 
        weight, 
        length, 
        width, 
        height, 
        scanned_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;

    const result = await executeQuery(query, [
      finalEggCode,
      quality,
      ai_confidence || null,
      quality_score || null,
      image || null,
      weight || null,
      length || null,
      width || null,
      height || null
    ]);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to save egg scan to database',
        error: result.error
      });
    }

    res.status(201).json({
      success: true,
      message: 'Data scan telur berhasil disimpan',
      data: {
        scan_id: result.insertId,
        egg_code: finalEggCode,
        quality
      }
    });
  } catch (error) {
    console.error('Add egg scan error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal menyimpan data scan telur'
    });
  }
};

module.exports = {
  getAllEggs,
  getEggStatistics,
  getEggById,
  getRecentEggs,
  getDailyEggSummary,
  getAvailableDates,
  getWeeklyEggSummary,
  addEggScan
}; 