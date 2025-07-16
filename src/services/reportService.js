import { apiClient } from './api';

// Generate and download report
export const generateReport = async (reportType, period, dateData, format) => {
  try {
    // Create request data object
    const requestData = {
      report_type: reportType,
      period: period,
      format: format
    };
    
    // Add date info based on period type
    if (period === 'date_range' && typeof dateData === 'object') {
      // For date range period, include start and end dates
      requestData.start_date = dateData.startDate;
      requestData.end_date = dateData.endDate;
    } else if (dateData) {
      // For single date (custom period)
      requestData.date = dateData;
    }

    // Make request to generate report
    const response = await apiClient.post('/reports/generate', requestData, {
      responseType: 'blob' // Important for file downloads
    });

    if (response) {
      // Create blob URL and trigger download
      const blob = new Blob([response], { 
        type: getContentType(format) 
      });
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = generateFileName(reportType, period, dateData, format);
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      return { success: true, message: 'Laporan berhasil diunduh' };
    }
  } catch (error) {
    console.error('Generate report error:', error);
    throw error;
  }
};

// Get report history
export const getReportHistory = async (params = {}) => {
  try {
    const queryParams = new URLSearchParams();
    
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
        queryParams.append(key, params[key]);
      }
    });

    const response = await apiClient.get(`/reports/history?${queryParams.toString()}`);
    return response;
  } catch (error) {
    console.error('Get report history error:', error);
    throw error;
  }
};

// Download existing report
export const downloadExistingReport = async (reportId) => {
  try {
    const response = await apiClient.get(`/reports/download/${reportId}`, {
      responseType: 'blob'
    });

    if (response) {
      // Get filename from response headers or generate one
      const contentDisposition = response.headers?.['content-disposition'];
      let filename = 'laporan.pdf';
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      const blob = new Blob([response]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      return { success: true, message: 'Laporan berhasil diunduh' };
    }
  } catch (error) {
    console.error('Download existing report error:', error);
    throw error;
  }
};

// Delete report from history
export const deleteReport = async (reportId) => {
  try {
    const response = await apiClient.delete(`/reports/${reportId}`);
    return response;
  } catch (error) {
    console.error('Delete report error:', error);
    throw error;
  }
};

// Helper function to get content type based on format
const getContentType = (format) => {
  switch (format.toLowerCase()) {
    case 'pdf':
      return 'application/pdf';
    case 'excel':
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    case 'csv':
      return 'text/csv';
    default:
      return 'application/octet-stream';
  }
};

// Helper function to generate filename
const generateFileName = (reportType, period, dateData, format) => {
  const reportNames = {
    'kualitas-telur': 'Laporan_Kualitas_Telur',
    'statistik-produksi': 'Statistik_Produksi',
    'riwayat-aktivitas': 'Riwayat_Aktivitas'
  };

  const periodNames = {
    'today': 'Hari_Ini',
    'yesterday': 'Kemarin',
    'last7days': '7_Hari_Terakhir',
    'last30days': '30_Hari_Terakhir',
    'thisMonth': 'Bulan_Ini',
    'lastMonth': 'Bulan_Lalu',
    'custom': 'Tanggal',
    'date_range': 'Periode'
  };

  const reportName = reportNames[reportType] || 'Laporan';
  const periodName = periodNames[period] || 'Custom';
  
  let dateStr = '';
  if (period === 'date_range' && typeof dateData === 'object') {
    // For date range, use start and end dates in the filename
    const startDateStr = dateData.startDate ? dateData.startDate.replace(/-/g, '') : '';
    const endDateStr = dateData.endDate ? dateData.endDate.replace(/-/g, '') : '';
    dateStr = `${startDateStr}_${endDateStr}`;
  } else {
    // For single date or other periods
    dateStr = dateData ? dateData.replace(/-/g, '') : new Date().toISOString().split('T')[0].replace(/-/g, '');
  }
  
  const extension = format.toLowerCase() === 'excel' ? 'xlsx' : format.toLowerCase();

  return `${reportName}_${periodName}_${dateStr}.${extension}`;
};

// Helper function to format period for display
export const formatPeriodForDisplay = (period, dateData) => {
  const periodLabels = {
    'today': 'Hari Ini',
    'yesterday': 'Kemarin',
    'last7days': '7 Hari Terakhir',
    'last30days': '30 Hari Terakhir',
    'thisMonth': 'Bulan Ini',
    'lastMonth': 'Bulan Lalu',
    'custom': `Tanggal ${typeof dateData === 'string' ? new Date(dateData).toLocaleDateString('id-ID') : ''}`,
    'date_range': 'Periode Tertentu'
  };

  // Handle date_range period
  if (period === 'date_range' && typeof dateData === 'object') {
    const startDateFormatted = dateData.startDate ? new Date(dateData.startDate).toLocaleDateString('id-ID') : '';
    const endDateFormatted = dateData.endDate ? new Date(dateData.endDate).toLocaleDateString('id-ID') : '';
    
    if (startDateFormatted && endDateFormatted) {
      return `Periode ${startDateFormatted} - ${endDateFormatted}`;
    }
  }

  return periodLabels[period] || 'Periode Tidak Diketahui';
};

// Helper function to get report type display name
export const getReportTypeDisplayName = (reportType) => {
  const reportNames = {
    'kualitas-telur': 'Laporan Kualitas Telur',
    'statistik-produksi': 'Statistik Produksi',
    'riwayat-aktivitas': 'Riwayat Aktivitas'
  };

  return reportNames[reportType] || 'Laporan Tidak Diketahui';
};

// Helper function to format file size
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export default {
  generateReport,
  getReportHistory,
  downloadExistingReport,
  deleteReport,
  formatPeriodForDisplay,
  getReportTypeDisplayName,
  formatFileSize
}; 