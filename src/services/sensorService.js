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
};

export default sensorService;
