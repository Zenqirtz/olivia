import { useState, useEffect } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { Line } from 'react-chartjs-2';
import { useTheme } from '../contexts/ThemeContext';
import sensorService from '../services/sensorService';

// Register ChartJS components locally for this page
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const DataKelembapanSuhuAmonia = () => {
  const { isDarkMode } = useTheme();

  // State variables
  const [latestSensor, setLatestSensor] = useState(null);
  const [chartPeriod, setChartPeriod] = useState('24h');
  const [chartData, setChartData] = useState({ labels: [], datasets: [] });
  const [chartLoading, setChartLoading] = useState(true);
  
  const [logs, setLogs] = useState([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [logPage, setLogPage] = useState(1);
  const [pagination, setPagination] = useState({
    current_page: 1,
    total_pages: 1,
    total_records: 0,
    per_page: 10,
    has_next: false,
    has_prev: false
  });
  const [logsLoading, setLogsLoading] = useState(true);
  
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [error, setError] = useState(null);

  // Helper formatting functions
  const formatDateForDisplay = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatTimeForDisplay = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  // Threshold evaluation functions based on poultry farming standards
  const getTemperatureStatus = (temp) => {
    const t = parseFloat(temp);
    if (isNaN(t)) return { label: 'Unknown', color: 'gray', bg: 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200' };
    if (t < 30.0) {
      return { label: 'Optimal', color: 'green', bg: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' };
    } else if (t >= 30.0 && t <= 32.0) {
      return { label: 'Waspada', color: 'orange', bg: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400' };
    } else {
      return { label: 'Bahaya', color: 'red', bg: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' };
    }
  };

  const getHumidityStatus = (humidity) => {
    const h = parseFloat(humidity);
    if (isNaN(h)) return { label: 'Unknown', color: 'gray', bg: 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200' };
    if (h >= 60.0 && h <= 70.0) {
      return { label: 'Optimal', color: 'green', bg: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' };
    } else if ((h >= 50.0 && h < 60.0) || (h > 70.0 && h <= 80.0)) {
      return { label: 'Waspada', color: 'orange', bg: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400' };
    } else {
      return { label: 'Bahaya', color: 'red', bg: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' };
    }
  };

  const getAmmoniaStatus = (ammonia) => {
    const a = parseFloat(ammonia);
    if (isNaN(a)) return { label: 'Unknown', color: 'gray', bg: 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200' };
    if (a < 15.0) {
      return { label: 'Optimal', color: 'green', bg: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' };
    } else if (a >= 15.0 && a < 20.0) {
      return { label: 'Waspada', color: 'orange', bg: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400' };
    } else {
      return { label: 'Bahaya', color: 'red', bg: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' };
    }
  };

  // Overall log entry status evaluator
  const getOverallStatus = (temp, hum, amm) => {
    const tStat = getTemperatureStatus(temp).label;
    const hStat = getHumidityStatus(hum).label;
    const aStat = getAmmoniaStatus(amm).label;

    if (tStat === 'Bahaya' || hStat === 'Bahaya' || aStat === 'Bahaya') {
      return { label: 'Bahaya', bg: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800/50' };
    }
    if (tStat === 'Waspada' || hStat === 'Waspada' || aStat === 'Waspada') {
      return { label: 'Waspada', bg: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-800/50' };
    }
    return { label: 'Optimal', bg: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800/50' };
  };

  // Load latest readings & trend data
  const loadSensorDashboard = async (period = chartPeriod, showLoading = false) => {
    try {
      if (showLoading) setChartLoading(true);
      setError(null);

      const [readingsRes, latestRes] = await Promise.all([
        sensorService.getSensorReadings(period),
        sensorService.getLatestSensorReading()
      ]);

      if (latestRes.success && latestRes.data.latest) {
        setLatestSensor(latestRes.data.latest);
      }

      if (readingsRes.success && readingsRes.data.readings) {
        const readings = readingsRes.data.readings;
        setChartData({
          labels: readings.map(r => r.label),
          datasets: [
            {
              label: 'Suhu (°C)',
              data: readings.map(r => r.temperature),
              borderColor: '#f97316',
              backgroundColor: 'rgba(249, 115, 22, 0.08)',
              fill: true,
              tension: 0.4,
              borderWidth: 2.5,
              pointRadius: readings.length > 50 ? 0 : 3,
              pointHoverRadius: 6,
              yAxisID: 'y',
            },
            {
              label: 'Kelembapan (%)',
              data: readings.map(r => r.humidity),
              borderColor: '#3b82f6',
              backgroundColor: 'rgba(59, 130, 246, 0.08)',
              fill: true,
              tension: 0.4,
              borderWidth: 2.5,
              pointRadius: readings.length > 50 ? 0 : 3,
              pointHoverRadius: 6,
              yAxisID: 'y',
            },
            {
              label: 'Amonia (ppm)',
              data: readings.map(r => r.ammonia),
              borderColor: '#22c55e',
              backgroundColor: 'rgba(34, 197, 94, 0.08)',
              fill: true,
              tension: 0.4,
              borderWidth: 2.5,
              pointRadius: readings.length > 50 ? 0 : 3,
              pointHoverRadius: 6,
              yAxisID: 'y1',
            }
          ]
        });
      } else {
        setError('Gagal memuat data grafik sensor.');
      }
    } catch (err) {
      console.error('Error loading sensor dashboard:', err);
      setError('Terjadi kesalahan koneksi saat memuat data sensor.');
    } finally {
      setChartLoading(false);
      setLastUpdated(new Date());
    }
  };

  // Load historical logs
  const loadSensorLogs = async (page = logPage, date = selectedDate, showLoading = false) => {
    try {
      if (showLoading) setLogsLoading(true);
      const response = await sensorService.getSensorLogs({ page, limit: 10, date });

      if (response.success && response.data) {
        setLogs(response.data.logs || []);
        setPagination(response.data.pagination || {
          current_page: page,
          total_pages: 1,
          total_records: 0,
          per_page: 10,
          has_next: false,
          has_prev: false
        });
      }
    } catch (err) {
      console.error('Error loading sensor logs:', err);
    } finally {
      setLogsLoading(false);
    }
  };

  // Manual & auto trigger handlers
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([
      loadSensorDashboard(chartPeriod, false),
      loadSensorLogs(logPage, selectedDate, false)
    ]);
    setIsRefreshing(false);
  };

  const handlePeriodChange = (period) => {
    setChartPeriod(period);
    loadSensorDashboard(period, true);
  };

  const handleDateChange = (e) => {
    const date = e.target.value;
    setSelectedDate(date);
    setLogPage(1); // Reset to first page
    loadSensorLogs(1, date, true);
  };

  const handlePageChange = (newPage) => {
    setLogPage(newPage);
    loadSensorLogs(newPage, selectedDate, true);
  };

  const handleResetFilters = () => {
    setSelectedDate('');
    setLogPage(1);
    loadSensorLogs(1, '', true);
  };

  // Initialize and schedule regular background refreshes (every 10s)
  useEffect(() => {
    loadSensorDashboard(chartPeriod, true);
    loadSensorLogs(logPage, selectedDate, true);

    const interval = setInterval(() => {
      loadSensorDashboard(chartPeriod, false);
      loadSensorLogs(logPage, selectedDate, false);
    }, 10000);

    return () => clearInterval(interval);
  }, [chartPeriod]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-6 md:p-8 page-enter">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-amber-700 to-amber-800 dark:from-amber-800 dark:to-amber-900 rounded-2xl shadow-xl mb-8 overflow-hidden animate-fade-in-up">
        <div className="px-6 py-8 sm:px-8 sm:py-10 text-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">Data Kelembapan, Suhu, dan Amonia</h1>
            <p className="text-amber-100 text-sm sm:text-base">Monitoring real-time iklim dan kadar amonia kandang ayam</p>
            <p className="text-xs text-amber-200/80 mt-1">
              Terakhir diperbarui: {lastUpdated.toLocaleTimeString('id-ID')}
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 bg-white/20 hover:bg-white/30 disabled:opacity-50 text-white border border-white/25 rounded-xl px-4 py-2.5 backdrop-blur-sm transition-all btn-press ripple-effect"
          >
            <i className={`fas fa-sync-alt ${isRefreshing ? 'animate-spin' : ''}`}></i>
            <span>Perbarui Data</span>
          </button>
        </div>
      </div>

      {/* Connection / Backend Error Notification */}
      {error && (
        <div className="bg-red-100 dark:bg-red-900/50 border border-red-300 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3.5 rounded-xl mb-6 flex items-center gap-2 animate-fade-in-up">
          <i className="fas fa-exclamation-triangle"></i>
          <span className="text-sm font-medium">{error}</span>
          <button onClick={() => loadSensorDashboard(chartPeriod, true)} className="ml-auto hover:underline text-sm font-semibold flex items-center gap-1">
            <i className="fas fa-redo"></i> Coba Lagi
          </button>
        </div>
      )}

      {/* Real-time Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Temperature Card */}
        {(() => {
          const status = latestSensor ? getTemperatureStatus(latestSensor.temperature) : { label: '-', bg: 'bg-gray-100 dark:bg-gray-800 text-gray-400' };
          return (
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md border border-gray-100 dark:border-gray-700 relative overflow-hidden group transition-all duration-300 card-hover-amber">
              <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-bl-full -mt-4 -mr-4 group-hover:bg-orange-500/10 transition-all"></div>
              <div className="relative z-10 flex flex-col justify-between h-full">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Suhu Udara</span>
                    <h3 className="text-3xl font-extrabold text-gray-850 dark:text-gray-100 mt-1">
                      {latestSensor ? `${latestSensor.temperature}°C` : '--°C'}
                    </h3>
                  </div>
                  <div className="p-3 rounded-xl bg-orange-50 dark:bg-orange-950/30 text-orange-500 dark:text-orange-400">
                    <i className="fas fa-thermometer-half text-xl animate-float"></i>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${status.bg}`}>
                    {status.label}
                  </span>
                  <span className="text-xs text-gray-550 dark:text-gray-450">Aman: &lt; 30°C</span>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Humidity Card */}
        {(() => {
          const status = latestSensor ? getHumidityStatus(latestSensor.humidity) : { label: '-', bg: 'bg-gray-100 dark:bg-gray-800 text-gray-400' };
          return (
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md border border-gray-100 dark:border-gray-700 relative overflow-hidden group transition-all duration-300 card-hover-blue">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-bl-full -mt-4 -mr-4 group-hover:bg-blue-500/10 transition-all"></div>
              <div className="relative z-10 flex flex-col justify-between h-full">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Kelembapan</span>
                    <h3 className="text-3xl font-extrabold text-gray-850 dark:text-gray-100 mt-1">
                      {latestSensor ? `${latestSensor.humidity}%` : '--%'}
                    </h3>
                  </div>
                  <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 text-blue-500 dark:text-blue-400">
                    <i className="fas fa-tint text-xl animate-float"></i>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${status.bg}`}>
                    {status.label}
                  </span>
                  <span className="text-xs text-gray-550 dark:text-gray-450">Aman: 60% - 70%</span>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Ammonia Card */}
        {(() => {
          const status = latestSensor ? getAmmoniaStatus(latestSensor.ammonia) : { label: '-', bg: 'bg-gray-100 dark:bg-gray-800 text-gray-400' };
          return (
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md border border-gray-100 dark:border-gray-700 relative overflow-hidden group transition-all duration-300 card-hover-green">
              <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/5 rounded-bl-full -mt-4 -mr-4 group-hover:bg-green-500/10 transition-all"></div>
              <div className="relative z-10 flex flex-col justify-between h-full">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Gas Amonia</span>
                    <h3 className="text-3xl font-extrabold text-gray-850 dark:text-gray-100 mt-1">
                      {latestSensor ? `${latestSensor.ammonia} ppm` : '-- ppm'}
                    </h3>
                  </div>
                  <div className="p-3 rounded-xl bg-green-50 dark:bg-green-950/30 text-green-500 dark:text-green-400">
                    <i className="fas fa-wind text-xl animate-float"></i>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${status.bg}`}>
                    {status.label}
                  </span>
                  <span className="text-xs text-gray-550 dark:text-gray-450">Aman: &lt; 20 ppm</span>
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Environmental Trend Chart */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md border border-gray-100 dark:border-gray-700 mb-8 card-hover-amber transition-all">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3">
          <div>
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-150">Grafik Analisis Tren</h2>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Pantau dinamika iklim kandang ayam secara visual</p>
          </div>
          <div className="flex gap-2">
            {[
              { key: '24h', label: '24 Jam' },
              { key: '7d', label: '7 Hari' },
              { key: '30d', label: '30 Hari' }
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => handlePeriodChange(key)}
                className={`px-3.5 py-1.5 rounded-xl text-sm font-medium transition-all btn-press ripple-effect ${
                  chartPeriod === key
                    ? 'bg-amber-600 dark:bg-amber-700 text-white shadow-sm'
                    : 'bg-gray-50 dark:bg-gray-700 text-gray-650 dark:text-gray-300 border border-gray-200 dark:border-gray-650 hover:bg-gray-100 dark:hover:bg-gray-600'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="h-80 relative">
          {chartLoading ? (
            <div className="flex justify-center items-center h-full absolute inset-0">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
            </div>
          ) : chartData.labels.length > 0 ? (
            <div className="h-full chart-container">
              <Line
                data={chartData}
                options={{
                  maintainAspectRatio: false,
                  interaction: {
                    mode: 'index',
                    intersect: false
                  },
                  plugins: {
                    legend: {
                      display: true,
                      position: 'bottom',
                      labels: {
                        color: isDarkMode ? '#9ca3af' : '#4b5563',
                        usePointStyle: true,
                        padding: 24,
                        font: { size: 12, weight: '500' }
                      }
                    },
                    tooltip: {
                      backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                      titleColor: isDarkMode ? '#f3f4f6' : '#111827',
                      bodyColor: isDarkMode ? '#d1d5db' : '#374151',
                      borderColor: isDarkMode ? '#374151' : '#e5e7eb',
                      borderWidth: 1,
                      padding: 12,
                      cornerRadius: 8,
                      callbacks: {
                        label: function (context) {
                          const label = context.dataset.label || '';
                          const value = context.parsed.y;
                          if (label.includes('Suhu')) return `${label}: ${value}°C`;
                          if (label.includes('Kelembapan')) return `${label}: ${value}%`;
                          if (label.includes('Amonia')) return `${label}: ${value} ppm`;
                          return `${label}: ${value}`;
                        }
                      }
                    }
                  },
                  scales: {
                    y: {
                      type: 'linear',
                      display: true,
                      position: 'left',
                      title: {
                        display: true,
                        text: 'Suhu (°C) / Kelembapan (%)',
                        color: isDarkMode ? '#9ca3af' : '#6b7280',
                        font: { size: 11, weight: 'bold' }
                      },
                      grid: {
                        color: isDarkMode ? '#2d3748' : '#edf2f7'
                      },
                      ticks: {
                        color: isDarkMode ? '#9ca3af' : '#4b5563'
                      }
                    },
                    y1: {
                      type: 'linear',
                      display: true,
                      position: 'right',
                      title: {
                        display: true,
                        text: 'Amonia (ppm)',
                        color: isDarkMode ? '#9ca3af' : '#6b7280',
                        font: { size: 11, weight: 'bold' }
                      },
                      grid: {
                        drawOnChartArea: false
                      },
                      ticks: {
                        color: isDarkMode ? '#9ca3af' : '#4b5563'
                      }
                    },
                    x: {
                      grid: {
                        color: isDarkMode ? '#2d3748' : '#edf2f7'
                      },
                      ticks: {
                        color: isDarkMode ? '#9ca3af' : '#4b5563',
                        maxRotation: 45,
                        font: { size: 10 },
                        maxTicksLimit: 24,
                        autoSkip: true
                      }
                    }
                  }
                }}
              />
            </div>
          ) : (
            <div className="flex flex-col justify-center items-center h-full text-gray-400 dark:text-gray-500">
              <i className="fas fa-thermometer-half text-4xl mb-2"></i>
              <p className="text-sm font-medium">Tidak ada data sensor yang terekam dalam periode ini</p>
            </div>
          )}
        </div>
      </div>

      {/* Historical Logs Section */}
      <div className="bg-white dark:bg-gray-800 p-6 sm:p-8 rounded-2xl shadow-md border border-gray-100 dark:border-gray-700 card-hover-amber transition-all">
        {/* Table Filter / Controls */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 border-b border-gray-100 dark:border-gray-700/60 pb-5">
          <div>
            <h2 className="text-lg font-bold text-gray-850 dark:text-gray-150">Riwayat Pembacaan Sensor</h2>
            <p className="text-xs text-gray-400 dark:text-gray-550 mt-0.5">Daftar rekaman mentah sensor kandang</p>
          </div>
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:flex-initial">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400">
                <i className="far fa-calendar-alt text-amber-500"></i>
              </div>
              <input
                type="date"
                value={selectedDate}
                onChange={handleDateChange}
                className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-250 dark:border-gray-600 text-gray-800 dark:text-gray-150 text-sm rounded-xl pl-9 pr-3 py-2 focus:ring-2 focus:ring-amber-500 focus:outline-none transition-all"
              />
            </div>
            {selectedDate && (
              <button
                onClick={handleResetFilters}
                className="text-sm px-3.5 py-2 rounded-xl border border-gray-250 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 font-medium btn-press transition-all"
              >
                Reset Filter
              </button>
            )}
          </div>
        </div>

        {/* Logs Table */}
        {logsLoading && logs.length === 0 ? (
          <div className="flex justify-center items-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
            <span className="ml-3 text-sm text-gray-500 dark:text-gray-400 font-medium">Memuat data sensor...</span>
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-16">
            <i className="fas fa-history text-4xl text-gray-300 dark:text-gray-600 mb-3"></i>
            <p className="text-gray-500 dark:text-gray-400 text-base font-semibold">Tidak ditemukan data logs</p>
            <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">Coba sesuaikan filter pencarian tanggal Anda</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-gray-700">
              <table className="w-full text-left bg-white dark:bg-gray-800 border-collapse">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800/80 border-b border-gray-200 dark:border-gray-700">
                    <th className="py-4 px-5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">No</th>
                    <th className="py-4 px-5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tanggal</th>
                    <th className="py-4 px-5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Waktu</th>
                    <th className="py-4 px-5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Suhu</th>
                    <th className="py-4 px-5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Kelembapan</th>
                    <th className="py-4 px-5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Amonia</th>
                    <th className="py-4 px-5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-750 tbody-stagger">
                  {logs.map((log, index) => {
                    const rowNumber = ((pagination.current_page - 1) * pagination.per_page) + index + 1;
                    const overallStat = getOverallStatus(log.temperature, log.humidity, log.ammonia);
                    const tempStat = getTemperatureStatus(log.temperature);
                    const humStat = getHumidityStatus(log.humidity);
                    const ammStat = getAmmoniaStatus(log.ammonia);

                    return (
                      <tr key={log.reading_id || index} className="hover:bg-amber-500/[0.02] dark:hover:bg-gray-700/25 transition-all table-row-animated">
                        <td className="py-4 px-5 font-semibold text-gray-400 dark:text-gray-500 text-sm">{rowNumber}</td>
                        <td className="py-4 px-5 font-medium text-gray-800 dark:text-gray-250 text-sm whitespace-nowrap">
                          {formatDateForDisplay(log.recorded_at)}
                        </td>
                        <td className="py-4 px-5 text-gray-600 dark:text-gray-400 text-sm whitespace-nowrap">
                          {formatTimeForDisplay(log.recorded_at)}
                        </td>
                        <td className="py-4 px-5 text-sm">
                          <span className={tempStat.color === 'red' ? 'text-red-500 dark:text-red-400 font-bold' : tempStat.color === 'orange' ? 'text-orange-500 dark:text-orange-400 font-semibold' : 'text-gray-800 dark:text-gray-250'}>
                            {log.temperature}°C
                          </span>
                        </td>
                        <td className="py-4 px-5 text-sm">
                          <span className={humStat.color === 'red' ? 'text-red-500 dark:text-red-400 font-bold' : humStat.color === 'orange' ? 'text-orange-500 dark:text-orange-400 font-semibold' : 'text-gray-800 dark:text-gray-250'}>
                            {log.humidity}%
                          </span>
                        </td>
                        <td className="py-4 px-5 text-sm font-medium">
                          <span className={ammStat.color === 'red' ? 'text-red-500 dark:text-red-400 font-extrabold animate-pulse' : ammStat.color === 'orange' ? 'text-orange-500 dark:text-orange-400 font-semibold' : 'text-gray-800 dark:text-gray-250'}>
                            {log.ammonia} ppm
                          </span>
                        </td>
                        <td className="py-4 px-5 text-center whitespace-nowrap">
                          <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${overallStat.bg}`}>
                            {overallStat.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {pagination.total_pages > 1 && (
              <div className="flex flex-col sm:flex-row justify-between items-center mt-6 gap-4 pt-4 border-t border-gray-100 dark:border-gray-700/60">
                <div className="text-xs text-gray-500 dark:text-gray-450 font-medium">
                  Menampilkan {((pagination.current_page - 1) * pagination.per_page) + 1}-{Math.min(pagination.current_page * pagination.per_page, pagination.total_records)} dari {pagination.total_records} data sensor
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    disabled={!pagination.has_prev}
                    onClick={() => handlePageChange(pagination.current_page - 1)}
                    className="px-3 py-2 border border-gray-200 dark:border-gray-600 hover:bg-gray-55 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed btn-press transition-all"
                  >
                    <i className="fas fa-chevron-left text-xs"></i>
                  </button>
                  
                  {Array.from({ length: pagination.total_pages }, (_, i) => {
                    const pageNum = i + 1;
                    // Limit visible page numbers
                    if (pageNum === 1 || pageNum === pagination.total_pages || Math.abs(pageNum - pagination.current_page) <= 1) {
                      return (
                        <button
                          key={pageNum}
                          onClick={() => handlePageChange(pageNum)}
                          className={`px-3.5 py-1.5 rounded-xl text-sm font-semibold transition-all btn-press ${
                            pageNum === pagination.current_page
                              ? 'bg-gradient-to-r from-amber-600 to-amber-700 text-white shadow-sm'
                              : 'border border-gray-200 dark:border-gray-650 text-gray-650 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    } else if (pageNum === 2 || pageNum === pagination.total_pages - 1) {
                      return <span key={pageNum} className="text-gray-400 dark:text-gray-500 px-1 font-medium">...</span>;
                    }
                    return null;
                  })}

                  <button
                    disabled={!pagination.has_next}
                    onClick={() => handlePageChange(pagination.current_page + 1)}
                    className="px-3 py-2 border border-gray-200 dark:border-gray-600 hover:bg-gray-55 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed btn-press transition-all"
                  >
                    <i className="fas fa-chevron-right text-xs"></i>
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default DataKelembapanSuhuAmonia;
