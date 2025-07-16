import { apiClient } from './api';

// Get all eggs with filtering and pagination
export const getAllEggs = async (params = {}) => {
  try {
    const queryParams = new URLSearchParams();
    
    // Add parameters to query string
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
        queryParams.append(key, params[key]);
      }
    });

    const response = await apiClient.get(`/eggs?${queryParams.toString()}`);
    return response;
  } catch (error) {
    console.error('Get all eggs error:', error);
    throw error;
  }
};

// Get egg statistics by date
export const getEggStatistics = async (params = {}) => {
  try {
    const queryParams = new URLSearchParams();
    
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
        queryParams.append(key, params[key]);
      }
    });

    const response = await apiClient.get(`/eggs/statistics?${queryParams.toString()}`);
    return response;
  } catch (error) {
    console.error('Get egg statistics error:', error);
    throw error;
  }
};

// Get egg details by ID
export const getEggById = async (id) => {
  try {
    const response = await apiClient.get(`/eggs/${id}`);
    return response;
  } catch (error) {
    console.error('Get egg by ID error:', error);
    throw error;
  }
};

// Get recent eggs
export const getRecentEggs = async (limit = 10) => {
  try {
    const response = await apiClient.get(`/eggs/recent?limit=${limit}`);
    return response;
  } catch (error) {
    console.error('Get recent eggs error:', error);
    throw error;
  }
};

// Get daily egg summary
export const getDailyEggSummary = async (date = null) => {
  try {
    const queryParams = date ? `?date=${date}` : '';
    const response = await apiClient.get(`/eggs/daily-summary${queryParams}`);
    return response;
  } catch (error) {
    console.error('Get daily egg summary error:', error);
    throw error;
  }
};

// Get available dates with egg data
export const getAvailableDates = async (limit = 30) => {
  try {
    const response = await apiClient.get(`/eggs/available-dates?limit=${limit}`);
    return response;
  } catch (error) {
    console.error('Get available dates error:', error);
    throw error;
  }
};

// Helper function to format date for API
export const formatDateForAPI = (date) => {
  if (!date) return null;
  
  if (typeof date === 'string') {
    return date;
  }
  
  if (date instanceof Date) {
    return date.toISOString().split('T')[0];
  }
  
  return null;
};

// Helper function to format date for display
export const formatDateForDisplay = (dateString) => {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  return date.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

// Helper function to format time for display
export const formatTimeForDisplay = (dateTimeString) => {
  if (!dateTimeString) return '';
  
  const date = new Date(dateTimeString);
  return date.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Helper function to get quality badge class
export const getQualityBadgeClass = (quality) => {
  switch (quality) {
    case 'good':
      return 'px-3 py-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded-full text-xs font-medium';
    case 'bad':
      return 'px-3 py-1 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded-full text-xs font-medium';
    default:
      return 'px-3 py-1 bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300 rounded-full text-xs font-medium';
  }
};

// Helper function to get quality text in Indonesian
export const getQualityText = (quality) => {
  switch (quality) {
    case 'good':
      return 'Bagus';
    case 'bad':
      return 'Jelek';
    default:
      return 'Tidak Diketahui';
  }
};

export default {
  getAllEggs,
  getEggStatistics,
  getEggById,
  getRecentEggs,
  getDailyEggSummary,
  getAvailableDates,
  formatDateForAPI,
  formatDateForDisplay,
  formatTimeForDisplay,
  getQualityBadgeClass,
  getQualityText
}; 