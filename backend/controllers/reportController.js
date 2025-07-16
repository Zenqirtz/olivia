const { executeQuery } = require('../config/database');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');

// Check if egg_scans table exists and has data
const checkEggScansTable = async () => {
  try {
    // Check if table exists
    const tableCheckQuery = `
      SELECT 1 
      FROM information_schema.tables 
      WHERE table_schema = DATABASE() 
      AND table_name = 'egg_scans'
    `;
    
    const tableResult = await executeQuery(tableCheckQuery);
    
    if (!tableResult.success || tableResult.data.length === 0) {
      console.error('egg_scans table does not exist in the database');
      return { exists: false, hasData: false, error: 'Table does not exist' };
    }
    
    // Check if table has data
    const dataCheckQuery = 'SELECT COUNT(*) as count FROM egg_scans';
    const dataResult = await executeQuery(dataCheckQuery);
    
    if (!dataResult.success) {
      console.error('Error checking data in egg_scans table:', dataResult.error);
      return { exists: true, hasData: false, error: dataResult.error };
    }
    
    const count = dataResult.data[0].count;
    console.log(`egg_scans table has ${count} records`);
    
    return { 
      exists: true, 
      hasData: count > 0,
      count: count
    };
  } catch (error) {
    console.error('Error checking egg_scans table:', error);
    return { exists: false, hasData: false, error: error.message };
  }
};

// Generate and download report
const generateReport = async (req, res) => {
  let filePath = null;
  try {
    const { report_type, period, date, start_date, end_date, format } = req.body;
    const userId = req.user.user_id;

    // Validate required fields
    if (!report_type || !period || !format) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: report_type, period, format'
      });
    }

    console.log('Report request:', { report_type, period, date, start_date, end_date, format });
    
    // Check if egg_scans table exists and has data
    const tableCheck = await checkEggScansTable();
    console.log('Table check result:', tableCheck);
    
    if (!tableCheck.exists) {
      return res.status(500).json({
        success: false,
        message: 'Database table does not exist. Please set up the database correctly.'
      });
    }
    
    if (!tableCheck.hasData) {
      console.warn('egg_scans table has no data');
    }

    // Format date properly for database query
    let dateData;
    
    if (period === 'custom' && date) {
      // For custom date (single date)
      const dateObj = new Date(date);
      dateData = dateObj.toISOString().split('T')[0];
      console.log('Formatted single date for query:', dateData);
    } else if (period === 'date_range' && start_date && end_date) {
      // For date range period
      const startDateObj = new Date(start_date);
      const endDateObj = new Date(end_date);
      
      dateData = {
        startDate: startDateObj.toISOString().split('T')[0],
        endDate: endDateObj.toISOString().split('T')[0]
      };
      console.log('Formatted date range for query:', dateData);
    }

    // Get data based on report type and period
    const reportData = await getReportData(report_type, period, dateData || date);
    
    // Check if there's actual data before generating report
    if (!reportData.hasData) {
      return res.status(400).json({
        success: false,
        message: reportData.message,
        noData: true,
        period: reportData.period,
        date: reportData.date
      });
    }
    
    // Generate file based on format
    let fileName, mimeType, result;
    
    try {
    switch (format.toLowerCase()) {
      case 'pdf':
          result = await generatePDFReport(reportData, report_type, period, dateData || date);
        mimeType = 'application/pdf';
        break;
      case 'excel':
          result = await generateExcelReport(reportData, report_type, period, dateData || date);
        mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        break;
      case 'csv':
          result = await generateCSVReport(reportData, report_type, period, dateData || date);
        mimeType = 'text/csv';
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Unsupported format. Use pdf, excel, or csv'
        });
    }
      
      filePath = result.filePath;
      fileName = result.fileName;
    } catch (error) {
      console.error(`Error generating ${format} report:`, error);
      return res.status(500).json({
        success: false,
        message: `Failed to generate ${format} report: ${error.message}`
      });
    }
    
    if (!fs.existsSync(filePath)) {
      return res.status(500).json({
        success: false,
        message: `Failed to create file at ${filePath}`
      });
    }

    // Get file stats
    const fileStats = fs.statSync(filePath);
    console.log(`File created: ${fileName}, size: ${fileStats.size} bytes`);

    // Save report record to database using existing table structure
    const reportName = `${getReportTypeDisplayName(report_type)} - ${formatPeriodForDisplay(period, dateData || date)}`;
    const parameters = JSON.stringify({ report_type, period, date: dateData || date, format });
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // Expire after 30 days
    
    const insertQuery = `
      INSERT INTO reports (
        user_id, 
        report_name, 
        report_type, 
        parameters, 
        file_path, 
        file_format, 
        file_size, 
        generated_at, 
        expires_at, 
        download_count
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), ?, 0)
    `;
    
    try {
    await executeQuery(insertQuery, [
      userId,
      reportName,
      report_type,
      parameters,
      fileName,
      format,
      fileStats.size,
      expiresAt
    ]);
    } catch (error) {
      console.error('Error saving report record to database:', error);
      // Continue with file download even if DB insert fails
    }

    // Send file to client
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', fileStats.size);

    const fileStream = fs.createReadStream(filePath);
    fileStream.on('error', (err) => {
      console.error('Error reading file stream:', err);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: 'Error reading file'
        });
      }
    });

    fileStream.pipe(res);

    // Clean up file after sending (optional)
    fileStream.on('end', () => {
      fs.unlink(filePath, (err) => {
        if (err) console.error('Error deleting temp file:', err);
        else console.log(`Temporary file deleted: ${filePath}`);
      });
    });

  } catch (error) {
    console.error('Generate report error:', error);
    
    // Clean up file if it was created
    if (filePath && fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
        console.log(`Cleaned up file after error: ${filePath}`);
      } catch (unlinkError) {
        console.error('Error cleaning up file:', unlinkError);
      }
    }
    
    if (!res.headersSent) {
    res.status(500).json({
      success: false,
        message: 'Failed to generate report: ' + (error.message || 'Unknown error')
    });
    }
  }
};

// Get report history
const getReportHistory = async (req, res) => {
  try {
    const { limit = 10, offset = 0, report_type, format } = req.query;
    const userId = req.user.user_id;
    
    const limitNum = parseInt(limit);
    const offsetNum = parseInt(offset);

    let query = `
      SELECT 
        report_id as id,
        report_name,
        report_type,
        parameters,
        file_format as format,
        file_size,
        generated_at as created_at,
        expires_at,
        download_count
      FROM reports 
      WHERE user_id = ? AND (expires_at IS NULL OR expires_at > NOW())
    `;
    
    const params = [userId];

    // Add filters
    if (report_type) {
      query += ' AND report_type = ?';
      params.push(report_type);
    }

    if (format) {
      query += ' AND file_format = ?';
      params.push(format);
    }

    query += ` ORDER BY generated_at DESC LIMIT ${limitNum} OFFSET ${offsetNum}`;

    const result = await executeQuery(query, params);

    if (result.success) {
      // Parse parameters for each report
      const reports = result.data.map(report => {
        let parsedParams = {};
        try {
          parsedParams = JSON.parse(report.parameters || '{}');
        } catch (e) {
          console.error('Error parsing parameters:', e);
        }
        
        return {
          ...report,
          period: parsedParams.period || 'unknown',
          date: parsedParams.date || null
        };
      });

      res.json({
        success: true,
        data: {
          reports: reports,
          total: reports.length
        }
      });
    } else {
      throw new Error('Database query failed');
    }

  } catch (error) {
    console.error('Get report history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch report history'
    });
  }
};

// Download existing report
const downloadReport = async (req, res) => {
  try {
    const { reportId } = req.params;
    const userId = req.user.user_id;

    // Get report info from database
    const query = 'SELECT * FROM reports WHERE report_id = ? AND user_id = ? AND (expires_at IS NULL OR expires_at > NOW())';
    const result = await executeQuery(query, [reportId, userId]);

    if (!result.success || result.data.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Report not found or expired'
      });
    }

    const report = result.data[0];
    const filePath = path.join(__dirname, '../uploads/reports', report.file_path);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'Report file not found'
      });
    }

    // Increment download count
    const updateQuery = 'UPDATE reports SET download_count = download_count + 1 WHERE report_id = ?';
    await executeQuery(updateQuery, [reportId]);

    // Send file
    const mimeTypes = {
      'pdf': 'application/pdf',
      'excel': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'csv': 'text/csv'
    };

    res.setHeader('Content-Type', mimeTypes[report.file_format] || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${report.file_path}"`);
    
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

  } catch (error) {
    console.error('Download report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to download report'
    });
  }
};

// Delete report from history
const deleteReport = async (req, res) => {
  try {
    const { reportId } = req.params;
    const userId = req.user.user_id;

    // Get report info from database to verify ownership and get file path
    const selectQuery = 'SELECT file_path FROM reports WHERE report_id = ? AND user_id = ?';
    const selectResult = await executeQuery(selectQuery, [reportId, userId]);

    if (!selectResult.success || selectResult.data.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Report not found or you do not have permission to delete it'
      });
    }

    const report = selectResult.data[0];

    // Delete from database first
    const deleteQuery = 'DELETE FROM reports WHERE report_id = ? AND user_id = ?';
    const deleteResult = await executeQuery(deleteQuery, [reportId, userId]);

    if (!deleteResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to delete report from database'
      });
    }

    // Try to delete the physical file (if it exists)
    if (report.file_path) {
      const filePath = path.join(__dirname, '../uploads/reports', report.file_path);
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log(`Deleted file: ${filePath}`);
        }
      } catch (fileError) {
        console.error('Error deleting file:', fileError);
        // Don't fail the entire operation if file deletion fails
      }
    }

    res.json({
      success: true,
      message: 'Report deleted successfully'
    });

  } catch (error) {
    console.error('Delete report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete report'
    });
  }
};

// Helper function to get no data message
const getNoDataMessage = (period, date) => {
  let periodText = '';
  
  switch (period) {
    case 'today':
      periodText = 'hari ini';
      break;
    case 'last7days':
      periodText = '7 hari terakhir';
      break;
    case 'last30days':
      periodText = '30 hari terakhir';
      break;
    case 'custom':
      if (date) {
        const dateObj = new Date(date);
        periodText = `tanggal ${dateObj.toLocaleDateString('id-ID')}`;
      } else {
        periodText = 'tanggal yang dipilih';
      }
      break;
    case 'date_range':
      if (date && typeof date === 'object' && date.startDate && date.endDate) {
        const startDate = new Date(date.startDate);
        const endDate = new Date(date.endDate);
        periodText = `periode ${startDate.toLocaleDateString('id-ID')} - ${endDate.toLocaleDateString('id-ID')}`;
      } else {
        periodText = 'periode yang dipilih';
      }
      break;
    default:
      periodText = 'periode yang dipilih';
  }
  
  return `Tidak ada data telur untuk ${periodText}. Silakan pilih periode yang berbeda atau pastikan data telah diinput ke sistem.`;
};

// Helper function to get report data
const getReportData = async (reportType, period, date) => {
  let query = '';
  let params = [];
  
  // Build date filter based on period
  let dateFilter = '';
  const now = new Date();
  
  switch (period) {
    case 'today':
      dateFilter = 'DATE(scanned_at) = CURDATE()';
      break;
    case 'last7days':
      dateFilter = 'scanned_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
      break;
    case 'last30days':
      dateFilter = 'scanned_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)';
      break;
    case 'custom':
      if (date) {
        dateFilter = 'DATE(scanned_at) = ?';
        params.push(date);
      }
      break;
    case 'date_range':
      // Handle date range period
      if (date && typeof date === 'object' && date.startDate && date.endDate) {
        dateFilter = 'DATE(scanned_at) BETWEEN ? AND ?';
        params.push(date.startDate, date.endDate);
      }
      break;
  }

  // First, get the actual columns from the table
  try {
    const columnsQuery = `SHOW COLUMNS FROM egg_scans`;
    const columnsResult = await executeQuery(columnsQuery);
    
    if (columnsResult.success) {
      console.log('Actual columns in egg_scans table:', columnsResult.data.map(col => col.Field).join(', '));
    }
  } catch (error) {
    console.error('Error fetching columns:', error);
  }

  // Build query based on report type
  switch (reportType) {
    case 'kualitas-telur':
      query = `
        SELECT 
          scan_id as egg_id,
          egg_code,
          quality,
          scanned_at as created_at
        FROM egg_scans
        ${dateFilter ? `WHERE ${dateFilter}` : ''}
        ORDER BY scanned_at DESC
      `;
      break;
      
    case 'statistik-produksi':
      query = `
        SELECT 
          DATE(scanned_at) as date,
          COUNT(*) as total_eggs,
          SUM(CASE WHEN quality = 'good' THEN 1 ELSE 0 END) as good_eggs,
          SUM(CASE WHEN quality = 'bad' THEN 1 ELSE 0 END) as bad_eggs,
          MIN(scanned_at) as first_scan,
          MAX(scanned_at) as last_scan
        FROM egg_scans
        ${dateFilter ? `WHERE ${dateFilter}` : ''}
        GROUP BY DATE(scanned_at)
        ORDER BY date DESC
      `;
      break;
      
    case 'riwayat-aktivitas':
      // Mock data for activity logs
      return {
        activities: [
          { timestamp: new Date(), action: 'System Start', user: 'System', details: 'Monitoring system started' },
          { timestamp: new Date(), action: 'Scan Complete', user: 'Scanner-001', details: 'Egg batch scanned successfully' }
        ],
        period: period,
        date: date
      };
      
    default:
      throw new Error('Unknown report type');
  }

  console.log('Executing query:', query, 'with params:', params);
  const result = await executeQuery(query, params);
  console.log('Query result:', result);
  
  // If no data found for the specified period, return proper no-data response
  if (!result.success || result.data.length === 0) {
    console.log(`No data found for period: ${period}, date: ${date}`);
    
    // Return proper structure indicating no data
    return {
      data: [],
      message: getNoDataMessage(period, date),
      period: period,
      date: date,
      isEmpty: true,
      hasData: false
    };
  }
  
  return {
    data: result.data,
    period: period,
    date: date,
    isEmpty: false,
    hasData: true
  };
};

// Generate PDF Report
const generatePDFReport = async (data, reportType, period, date) => {
  try {
  const fileName = `${reportType}_${period}_${Date.now()}.pdf`;
  const filePath = path.join(__dirname, '../uploads/reports', fileName);
  
  // Ensure directory exists
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
      console.log(`Creating directory: ${dir}`);
    fs.mkdirSync(dir, { recursive: true });
  }

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument();
      const writeStream = fs.createWriteStream(filePath);

      // Handle stream errors
      writeStream.on('error', (err) => {
        console.error('PDF write stream error:', err);
        reject(err);
      });
      
      // Resolve when the stream is finished
      writeStream.on('finish', () => {
        console.log(`PDF created successfully at: ${filePath}`);
        resolve({ filePath, fileName });
      });
      
      // Pipe the PDF to the file
      doc.pipe(writeStream);

      // Add header with title and logo
      doc.fontSize(20).text('Eggspire IoT Monitoring', { align: 'center' });
      doc.fontSize(16).text(`Laporan ${getReportTypeDisplayName(reportType)}`, { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text(`Periode: ${formatPeriodForDisplay(period, date)}`, { align: 'left' });
      doc.text(`Tanggal Generate: ${new Date().toLocaleDateString('id-ID')}`, { align: 'left' });
      doc.moveDown();

      // Draw a line separator
      doc.moveTo(50, doc.y)
         .lineTo(doc.page.width - 50, doc.y)
         .stroke();
      doc.moveDown();

      // At this point, we know we have data (checked in main function)
      const reportData = data.data;

      // Add report content based on report type
      if (reportType === 'kualitas-telur') {
        // Table headers
        const tableTop = doc.y + 20;
        const tableHeaders = ['No', 'Kode Telur', 'Kualitas', 'Tanggal Scan'];
        const columnWidths = [40, 150, 120, 180];
        
        // Draw table headers
        doc.font('Helvetica-Bold');
        let xPosition = 50;
        tableHeaders.forEach((header, i) => {
          doc.text(header, xPosition, tableTop, { width: columnWidths[i], align: 'center' });
          xPosition += columnWidths[i];
        });
        
        // Draw table rows
        doc.font('Helvetica');
        let yPosition = tableTop + 25;
        
        // Only show first 30 rows to avoid very large files
        const displayData = reportData.slice(0, 30);
        
        displayData.forEach((item, index) => {
          xPosition = 50;
          
          // No
          doc.text(index + 1, xPosition, yPosition, { width: columnWidths[0], align: 'center' });
          xPosition += columnWidths[0];
          
          // Kode Telur
          doc.text(item.egg_code, xPosition, yPosition, { width: columnWidths[1], align: 'left' });
          xPosition += columnWidths[1];
          
          // Kualitas
          doc.text(item.quality, xPosition, yPosition, { width: columnWidths[2], align: 'center' });
          xPosition += columnWidths[2];
          
          // Tanggal Scan
          const scanDate = new Date(item.created_at).toLocaleString('id-ID');
          doc.text(scanDate, xPosition, yPosition, { width: columnWidths[3], align: 'left' });
          
          // Move to next row
          yPosition += 20;
          
          // Add a new page if needed
          if (yPosition > doc.page.height - 50) {
            doc.addPage();
            yPosition = 50;
          }
        });
        
        // Add summary if there are more rows
        if (reportData.length > 30) {
          doc.moveDown(2);
          doc.font('Helvetica-Oblique');
          doc.text(`* Hanya menampilkan ${displayData.length} dari total ${reportData.length} data.`, { align: 'center' });
        }
        
      } else if (reportType === 'statistik-produksi') {
        // Table headers
        const tableTop = doc.y + 20;
        const tableHeaders = ['Tanggal', 'Total', 'Kualitas Baik', 'Kualitas Buruk', 'Rentang Waktu'];
        const columnWidths = [120, 80, 100, 100, 130];
        
        // Draw table headers
        doc.font('Helvetica-Bold');
        let xPosition = 50;
        tableHeaders.forEach((header, i) => {
          doc.text(header, xPosition, tableTop, { width: columnWidths[i], align: 'center' });
          xPosition += columnWidths[i];
        });
        
        // Draw table rows
        doc.font('Helvetica');
        let yPosition = tableTop + 25;
        
        reportData.forEach((item) => {
          xPosition = 50;
          
          // Format date
          const date = new Date(item.date).toLocaleDateString('id-ID', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          });
          
          // Tanggal
          doc.text(date, xPosition, yPosition, { width: columnWidths[0], align: 'left' });
          xPosition += columnWidths[0];
          
          // Total
          doc.text(item.total_eggs.toString(), xPosition, yPosition, { width: columnWidths[1], align: 'center' });
          xPosition += columnWidths[1];
          
          // Kualitas Baik
          const goodPercentage = item.total_eggs > 0 ? (item.good_eggs / item.total_eggs * 100).toFixed(1) + '%' : '0%';
          doc.text(`${item.good_eggs} (${goodPercentage})`, xPosition, yPosition, { width: columnWidths[2], align: 'center' });
          xPosition += columnWidths[2];
          
          // Kualitas Buruk
          const badPercentage = item.total_eggs > 0 ? (item.bad_eggs / item.total_eggs * 100).toFixed(1) + '%' : '0%';
          doc.text(`${item.bad_eggs} (${badPercentage})`, xPosition, yPosition, { width: columnWidths[3], align: 'center' });
          xPosition += columnWidths[3];
          
          // Rentang Waktu
          let timeRange = '-';
          if (item.first_scan && item.last_scan) {
            const firstTime = new Date(item.first_scan).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
            const lastTime = new Date(item.last_scan).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
            timeRange = `${firstTime} - ${lastTime}`;
          }
          doc.text(timeRange, xPosition, yPosition, { width: columnWidths[4], align: 'center' });
          
          // Move to next row
      yPosition += 20;
          
          // Add a new page if needed
          if (yPosition > doc.page.height - 50) {
            doc.addPage();
            yPosition = 50;
          }
        });
      }
      
      // Add footer with page number
      const totalPages = doc.bufferedPageRange().count;
      for (let i = 0; i < totalPages; i++) {
        doc.switchToPage(i);
        doc.fontSize(8).text(
          `Halaman ${i + 1} dari ${totalPages}`,
          50,
          doc.page.height - 50,
          { align: 'center' }
        );
  }

      // Finalize the PDF
      doc.end();
    });
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
};

// Generate Excel Report
const generateExcelReport = async (data, reportType, period, date) => {
  try {
  const fileName = `${reportType}_${period}_${Date.now()}.xlsx`;
  const filePath = path.join(__dirname, '../uploads/reports', fileName);
  
  // Ensure directory exists
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
      console.log(`Creating directory: ${dir}`);
    fs.mkdirSync(dir, { recursive: true });
  }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Report');
    
    // Add title and metadata
    worksheet.mergeCells('A1:D1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = 'Eggspire IoT Monitoring';
    titleCell.font = { size: 16, bold: true };
    titleCell.alignment = { horizontal: 'center' };
    
    worksheet.mergeCells('A2:D2');
    const reportTitleCell = worksheet.getCell('A2');
    reportTitleCell.value = getReportTypeDisplayName(reportType);
    reportTitleCell.font = { size: 14, bold: true };
    reportTitleCell.alignment = { horizontal: 'center' };
    
    worksheet.getCell('A3').value = `Periode: ${formatPeriodForDisplay(period, date)}`;
    worksheet.getCell('A4').value = `Tanggal Generate: ${new Date().toLocaleDateString('id-ID')}`;
    
    // Style metadata row
    ['A3', 'A4'].forEach(cell => {
      worksheet.getCell(cell).font = { size: 12 };
    });
    
    // Add empty row
  worksheet.addRow([]);

    // At this point, we know we have data (checked in main function)
    const reportData = data.data;

    // Add report data based on report type
    if (reportType === 'kualitas-telur') {
      // Add headers
      const headers = ['No', 'Kode Telur', 'Kualitas', 'Tanggal Scan'];
      const headerRow = worksheet.addRow(headers);
    
      // Style header row
      headerRow.eachCell((cell) => {
        cell.font = { bold: true };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE0E0E0' }
        };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
      
      // Add data rows
      reportData.forEach((item, index) => {
        const row = worksheet.addRow([
          index + 1,
          item.egg_code,
          item.quality,
          new Date(item.created_at).toLocaleString('id-ID')
        ]);
      });
      
      // Auto-fit columns
      worksheet.columns.forEach(column => {
        column.width = 20;
      });
      
    } else if (reportType === 'statistik-produksi') {
      // Add headers
      const headers = ['Tanggal', 'Total Telur', 'Telur Kualitas Baik', '% Baik', 'Telur Kualitas Buruk', '% Buruk', 'Scan Pertama', 'Scan Terakhir'];
      const headerRow = worksheet.addRow(headers);
      
      // Style header row
      headerRow.eachCell((cell) => {
        cell.font = { bold: true };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE0E0E0' }
        };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
      
      // Add data rows
      reportData.forEach((item) => {
        const goodPercentage = item.total_eggs > 0 ? item.good_eggs / item.total_eggs : 0;
        const badPercentage = item.total_eggs > 0 ? item.bad_eggs / item.total_eggs : 0;
        
        const row = worksheet.addRow([
          new Date(item.date).toLocaleDateString('id-ID'),
          item.total_eggs,
          item.good_eggs,
          goodPercentage,
          item.bad_eggs,
          badPercentage,
          item.first_scan ? new Date(item.first_scan).toLocaleString('id-ID') : '-',
          item.last_scan ? new Date(item.last_scan).toLocaleString('id-ID') : '-'
        ]);
        
        // Format cells
        row.getCell(4).numFmt = '0.00%'; // % Baik
        row.getCell(6).numFmt = '0.00%'; // % Buruk
      });
      
      // Auto-fit columns
      worksheet.columns.forEach(column => {
        column.width = 20;
      });
  }

  await workbook.xlsx.writeFile(filePath);
    console.log(`Excel file created successfully at: ${filePath}`);
  return { filePath, fileName };
  } catch (error) {
    console.error('Error generating Excel report:', error);
    throw error;
  }
};

// Generate CSV Report
const generateCSVReport = async (data, reportType, period, date) => {
  try {
  const fileName = `${reportType}_${period}_${Date.now()}.csv`;
  const filePath = path.join(__dirname, '../uploads/reports', fileName);
  
  // Ensure directory exists
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
      console.log(`Creating directory: ${dir}`);
    fs.mkdirSync(dir, { recursive: true });
  }

    let csvContent = `"Eggspire IoT Monitoring"\n`;
    csvContent += `"Laporan: ${getReportTypeDisplayName(reportType)}"\n`;
    csvContent += `"Periode: ${formatPeriodForDisplay(period, date)}"\n`;
    csvContent += `"Tanggal Generate: ${new Date().toLocaleDateString('id-ID')}"\n\n`;

    // At this point, we know we have data (checked in main function)
    const reportData = data.data;

    // Add data based on report type
    if (reportType === 'kualitas-telur') {
      // Headers
      csvContent += '"No","Kode Telur","Kualitas","Tanggal Scan"\n';
      
      // Data rows
      reportData.forEach((item, index) => {
        csvContent += `${index + 1},`;
        csvContent += `"${item.egg_code}",`;
        csvContent += `"${item.quality}",`;
        csvContent += `"${new Date(item.created_at).toLocaleString('id-ID')}"\n`;
      });
      
    } else if (reportType === 'statistik-produksi') {
      // Headers
      csvContent += '"Tanggal","Total Telur","Telur Kualitas Baik","% Baik","Telur Kualitas Buruk","% Buruk","Scan Pertama","Scan Terakhir"\n';
      
      // Data rows
      reportData.forEach((item) => {
        const goodPercentage = item.total_eggs > 0 ? (item.good_eggs / item.total_eggs * 100).toFixed(2) + '%' : '0%';
        const badPercentage = item.total_eggs > 0 ? (item.bad_eggs / item.total_eggs * 100).toFixed(2) + '%' : '0%';
        
        csvContent += `"${new Date(item.date).toLocaleDateString('id-ID')}",`;
        csvContent += `${item.total_eggs},`;
        csvContent += `${item.good_eggs},`;
        csvContent += `"${goodPercentage}",`;
        csvContent += `${item.bad_eggs},`;
        csvContent += `"${badPercentage}",`;
        csvContent += `"${item.first_scan ? new Date(item.first_scan).toLocaleString('id-ID') : '-'}",`;
        csvContent += `"${item.last_scan ? new Date(item.last_scan).toLocaleString('id-ID') : '-'}"\n`;
      });
  }

  fs.writeFileSync(filePath, csvContent, 'utf8');
    console.log(`CSV file created successfully at: ${filePath}`);
  return { filePath, fileName };
  } catch (error) {
    console.error('Error generating CSV report:', error);
    throw error;
  }
};

// Helper functions
const getReportTypeDisplayName = (reportType) => {
  const names = {
    'kualitas-telur': 'Laporan Kualitas Telur',
    'statistik-produksi': 'Laporan Statistik Produksi',
    'riwayat-aktivitas': 'Laporan Riwayat Aktivitas'
  };
  
  const result = names[reportType] || `Laporan Tidak Diketahui (${reportType})`;
  
  return result;
};

const formatPeriodForDisplay = (period, date) => {
  const periods = {
    'today': 'Hari Ini',
    'last7days': '7 Hari Terakhir',
    'last30days': '30 Hari Terakhir',
    'custom': date ? `Tanggal ${new Date(date).toLocaleDateString('id-ID')}` : 'Tanggal Tertentu',
    'date_range': 'Periode Tertentu'
  };
  
  // Handle date range format
  if (period === 'date_range' && date && typeof date === 'object') {
    const startDate = date.startDate ? new Date(date.startDate).toLocaleDateString('id-ID') : '';
    const endDate = date.endDate ? new Date(date.endDate).toLocaleDateString('id-ID') : '';
    
    if (startDate && endDate) {
      return `Periode ${startDate} - ${endDate}`;
    }
  }
  
  const result = periods[period] || `Periode Tidak Diketahui (${period})`;
  
  return result;
};

module.exports = {
  generateReport,
  getReportHistory,
  downloadReport,
  deleteReport
}; 