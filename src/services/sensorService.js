import { apiClient } from './api';

const sensorService = {
  // Get sensor readings for chart
  getSensorReadings: async (period = '24h') => {
    const response = await apiClient.get(`/sensors/readings?period=${period}`);
    return response;
  },

  // Get latest sensor reading
  getLatestSensorReading: async () => {
    const response = await apiClient.get('/sensors/latest');
    return response;
  },

  // Get paginated and filtered sensor logs
  getSensorLogs: async (params = {}) => {
    const { page = 1, limit = 10, date = '' } = params;
    const query = `page=${page}&limit=${limit}${date ? `&date=${date}` : ''}`;
    const response = await apiClient.get(`/sensors/logs?${query}`);
    return response;
  },
};

export default sensorService;
