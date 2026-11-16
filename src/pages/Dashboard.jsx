import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { Line, Doughnut } from 'react-chartjs-2';
import { useTheme } from '../contexts/ThemeContext';
import {
  getDailyEggSummary,
  getRecentEggs,
  getEggStatistics,
  getWeeklyEggSummary,
  formatDateForDisplay,
  getQualityText
} from '../services/eggService';
import sensorService from '../services/sensorService';

// Register ChartJS components
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Title, Tooltip, Legend, Filler);

const Dashboard = () => {
  // Helper function untuk format percentage yang aman
  const formatPercentage = (value, decimals = 1) => {
    const num = parseFloat(value);
    return isNaN(num) ? '0.0' : num.toFixed(decimals);
  };

  const { isDarkMode } = useTheme();
  const navigate = useNavigate();

  const [weeklyData, setWeeklyData] = useState({
    labels: ['Minggu 1', 'Minggu 2', 'Minggu 3', 'Minggu 4'],
    datasets: [
      {
        label: 'Telur Bagus',
        data: [0, 0, 0, 0],
        borderColor: '#3498db',
        backgroundColor: 'rgba(52, 152, 219, 0.1)',
        fill: true,
        tension: 0.4,
      },
      {
        label: 'Telur Jelek',
        data: [0, 0, 0, 0],
        borderColor: '#f04438',
        backgroundColor: 'rgba(240, 68, 56, 0.1)',
        fill: true,
        tension: 0.4,
      }
    ]
  });

  const [donutData, setDonutData] = useState({
    labels: ['Telur Bagus', 'Telur Jelek'],
    datasets: [
      {
        label: 'Kualitas Telur',
        data: [0, 0],
        backgroundColor: ['#3498db', '#f04438'],
        borderColor: ['#3498db', '#f04438'],
        cutout: '70%',
      }
    ]
  });

  const [recentEggs, setRecentEggs] = useState([]);
  const [activeDate, setActiveDate] = useState(new Date().toISOString().split('T')[0]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // State untuk donut mode (harian/mingguan)
  const [donutMode, setDonutMode] = useState('harian');
  const [donutStats, setDonutStats] = useState({
    totalEggs: 0,
    goodEggs: 0,
    badEggs: 0,
    goodPercentage: 0,
  });

  // State untuk sensor/IoT chart
  const [sensorPeriod, setSensorPeriod] = useState('24h');
  const [sensorChartData, setSensorChartData] = useState({
    labels: [],
    datasets: []
  });
  const [latestSensor, setLatestSensor] = useState(null);
  const [sensorLoading, setSensorLoading] = useState(false);

  // State untuk data dashboard yang bisa di-refresh
  const [dashboardStats, setDashboardStats] = useState({
    totalEggs: 0,
    goodEggs: 0,
    badEggs: 0,
    goodPercentage: 0,
    trend: 0
  });

  // Load sensor data
  const loadSensorData = async (period = sensorPeriod, showLoading = false) => {
    try {
      if (showLoading) {
        setSensorLoading(true);
      }
      const [readingsRes, latestRes] = await Promise.all([
        sensorService.getSensorReadings(period),
        sensorService.getLatestSensorReading()
      ]);

      if (readingsRes.success && readingsRes.data.readings) {
        const readings = readingsRes.data.readings;
        setSensorChartData({
          labels: readings.map(r => r.label),
          datasets: [
            {
              label: 'Suhu (°C)',
              data: readings.map(r => r.temperature),
              borderColor: '#f97316',
              backgroundColor: 'rgba(249, 115, 22, 0.1)',
              fill: true,
              tension: 0.4,
              borderWidth: 2,
              pointRadius: 0,
              pointHoverRadius: 5,
              yAxisID: 'y',
            },
            {
              label: 'Kelembapan (%)',
              data: readings.map(r => r.humidity),
              borderColor: '#3b82f6',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              fill: true,
              tension: 0.4,
              borderWidth: 2,
              pointRadius: 0,
              pointHoverRadius: 5,
              yAxisID: 'y',
            },
            {
              label: 'Amonia (ppm)',
              data: readings.map(r => r.ammonia),
              borderColor: '#22c55e',
              backgroundColor: 'rgba(34, 197, 94, 0.1)',
              fill: true,
              tension: 0.4,
              borderWidth: 2,
              pointRadius: 0,
              pointHoverRadius: 5,
              yAxisID: 'y1',
            }
          ]
        });
      }

      if (latestRes.success && latestRes.data.latest) {
        setLatestSensor(latestRes.data.latest);
      }
    } catch (error) {
      console.error('Error loading sensor data:', error);
    } finally {
      setSensorLoading(false);
    }
  };

  // Load donut data based on mode
  const loadDonutData = async (mode = donutMode) => {
    try {
      if (mode === 'harian') {
        const summaryResponse = await getDailyEggSummary();
        if (summaryResponse.success) {
          const summary = summaryResponse.data.summary;
          const stats = {
            totalEggs: summary.total_eggs || 0,
            goodEggs: summary.good_eggs || 0,
            badEggs: summary.bad_eggs || 0,
            goodPercentage: summary.good_percentage || 0,
          };
          setDonutStats(stats);
          setDonutData(prev => ({
            ...prev,
            datasets: [{
              ...prev.datasets[0],
              data: [stats.goodEggs, stats.badEggs]
            }]
          }));
        }
      } else {
        const weeklyRes = await getWeeklyEggSummary();
        if (weeklyRes.success) {
          const summary = weeklyRes.data.summary;
          const stats = {
            totalEggs: summary.total_eggs || 0,
            goodEggs: summary.good_eggs || 0,
            badEggs: summary.bad_eggs || 0,
            goodPercentage: summary.good_percentage || 0,
          };
          setDonutStats(stats);
          setDonutData(prev => ({
            ...prev,
            datasets: [{
              ...prev.datasets[0],
              data: [stats.goodEggs, stats.badEggs]
            }]
          }));
        }
      }
    } catch (error) {
      console.error('Error loading donut data:', error);
    }
  };

  // Load dashboard data
  const loadDashboardData = async () => {
    try {
      setError(null);

      // Load daily summary
      const summaryResponse = await getDailyEggSummary();
      if (summaryResponse.success) {
        const summary = summaryResponse.data.summary;
        setDashboardStats({
          totalEggs: summary.total_eggs || 0,
          goodEggs: summary.good_eggs || 0,
          badEggs: summary.bad_eggs || 0,
          goodPercentage: summary.good_percentage || 0,
          trend: summary.trend || 0
        });

        // Also set donut data if in harian mode
        if (donutMode === 'harian') {
          const stats = {
            totalEggs: summary.total_eggs || 0,
            goodEggs: summary.good_eggs || 0,
            badEggs: summary.bad_eggs || 0,
            goodPercentage: summary.good_percentage || 0,
          };
          setDonutStats(stats);
          setDonutData(prev => ({
            ...prev,
            datasets: [{
              ...prev.datasets[0],
              data: [summary.good_eggs || 0, summary.bad_eggs || 0]
            }]
          }));
        }
      }

      // Load recent eggs
      const recentResponse = await getRecentEggs(5);
      if (recentResponse.success) {
        setRecentEggs(recentResponse.data.recent_eggs || []);
      }

      // Load weekly statistics for line chart
      await loadWeeklyStatistics();

      // Load sensor data
      await loadSensorData();

      // Load donut in weekly mode if needed
      if (donutMode === 'mingguan') {
        await loadDonutData('mingguan');
      }

    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setError('Gagal memuat data dashboard');
    } finally {
      setLoading(false);
    }
  };

  // Load weekly statistics
  const loadWeeklyStatistics = async () => {
    try {
      const labels = [];
      const goodEggsData = [];
      const badEggsData = [];

      // Get data for last 7 days
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        // Use local date (not UTC) to avoid timezone issues (e.g. UTC+7 at 2AM would show yesterday in UTC)
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;

        const response = await getEggStatistics({ date: dateStr });

        if (response.success && response.data.statistics.length > 0) {
          const stats = response.data.statistics[0];
          goodEggsData.push(stats.good_eggs || 0);
          badEggsData.push(stats.bad_eggs || 0);
        } else {
          goodEggsData.push(0);
          badEggsData.push(0);
        }

        labels.push(date.toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'short'
        }));
      }

      setWeeklyData({
        labels: labels,
        datasets: [
          {
            label: 'Telur Bagus',
            data: goodEggsData,
            borderColor: '#3498db',
            backgroundColor: 'rgba(52, 152, 219, 0.1)',
            fill: true,
            tension: 0.4,
          },
          {
            label: 'Telur Jelek',
            data: badEggsData,
            borderColor: '#f04438',
            backgroundColor: 'rgba(240, 68, 56, 0.1)',
            fill: true,
            tension: 0.4,
          }
        ]
      });

    } catch (error) {
      console.error('Error loading weekly statistics:', error);
    }
  };

  // Fungsi untuk refresh data
  const handleRefresh = async () => {
    setIsRefreshing(true);

    try {
      await loadDashboardData();
      setLastRefresh(new Date());

      console.log('Data refreshed successfully');

    } catch (error) {
      console.error('Error refreshing data:', error);
      setError('Gagal memperbarui data');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Fungsi untuk navigasi ke Data Kualitas Telur
  const handleViewAllData = () => {
    navigate('/data-kualitas-telur');
  };

  // Handle donut mode change
  const handleDonutModeChange = (mode) => {
    setDonutMode(mode);
  };

  // Handle sensor period change
  const handleSensorPeriodChange = (period) => {
    setSensorPeriod(period);
    setSensorLoading(true);
  };

  // Load data on component mount and setup auto-update (polling) every 5 seconds
  useEffect(() => {
    // Initial load
    loadDashboardData();

    // Set interval to auto-update every 5 seconds
    const intervalId = setInterval(() => {
      loadDashboardData();
      setLastRefresh(new Date());
    }, 5000);

    // Clean up the interval on unmount
    return () => clearInterval(intervalId);
  }, [donutMode, sensorPeriod]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto page-enter space-y-6 md:space-y-8">
        {/* Skeleton Header */}
        <div className="rounded-3xl bg-gray-200 dark:bg-gray-700 p-6 md:p-8 animate-pulse">
          <div className="skeleton h-4 w-48 mb-2"></div>
          <div className="skeleton h-8 w-64 mb-2"></div>
          <div className="skeleton h-4 w-56"></div>
        </div>
        {/* Skeleton Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 animate-pulse" style={{ animationDelay: `${i * 75}ms` }}>
              <div className="skeleton h-10 w-10 rounded-xl mb-3"></div>
              <div className="skeleton h-8 w-16 mb-2"></div>
              <div className="skeleton h-3 w-24"></div>
            </div>
          ))}
        </div>
        {/* Skeleton Chart */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 animate-pulse">
          <div className="skeleton h-5 w-48 mb-2"></div>
          <div className="skeleton h-4 w-64 mb-6"></div>
          <div className="skeleton h-72 w-full rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto page-enter space-y-6 md:space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 rounded-3xl bg-gradient-to-br from-emerald-800 via-emerald-700 to-teal-700 p-6 md:p-8 text-white shadow-lg shadow-emerald-900/10 animate-fade-in-up">
        <div>
          <p className="text-sm font-medium text-emerald-100">Ringkasan operasional peternakan</p>
          <h1 className="mt-1 text-2xl md:text-3xl font-bold">Selamat datang di Olivia</h1>
          <p className="mt-2 text-sm text-emerald-100">Pantau produksi telur dan kondisi kandang dalam satu tempat.</p>
          <p className="mt-3 text-xs text-emerald-200">
            <span className="mr-2 inline-block h-2 w-2 rounded-full bg-lime-300"></span>
            Diperbarui {lastRefresh.toLocaleTimeString('id-ID')}
          </p>
        </div>
        <div className="flex w-full sm:w-auto gap-2">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex flex-1 sm:flex-none items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/20 disabled:opacity-60"
          >
            <i className={`fas fa-sync-alt ${isRefreshing ? 'animate-spin' : ''}`}></i>
            <span>Perbarui</span>
          </button>
          <button
            onClick={handleViewAllData}
            className="flex flex-1 sm:flex-none items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-emerald-800 shadow-sm transition hover:bg-emerald-50"
          >
            <i className="fas fa-list"></i>
            <span>Lihat Data</span>
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded-xl mb-6 animate-fade-in-up">
          <div className="flex items-center">
            <i className="fas fa-exclamation-triangle mr-2"></i>
            <span>{error}</span>
            <button
              onClick={() => {
                setError(null);
                handleRefresh();
              }}
              className="ml-auto text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200"
            >
              <i className="fas fa-redo"></i>
            </button>
          </div>
        </div>
      )}

      {/* Stat Cards */}
      <div className={`grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5 transition-opacity duration-300 ${isRefreshing ? 'opacity-70' : 'opacity-100'
        }`}>
        {/* Total Telur */}
        <div className="group bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 transition-all hover:shadow-md animate-fade-in-up delay-75">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <i className="fas fa-egg text-lg"></i>
            </div>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${dashboardStats.trend >= 0
                ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300'
                : 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300'
              }`}>
              <i className={`fas ${dashboardStats.trend >= 0 ? 'fa-arrow-up' : 'fa-arrow-down'} mr-1 text-[10px]`}></i>
              {formatPercentage(Math.abs(dashboardStats.trend || 0))}%
            </span>
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">{dashboardStats.totalEggs}</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Total Telur Hari Ini</p>
        </div>

        {/* Telur Bagus */}
        <div className="group bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 transition-all hover:shadow-md animate-fade-in-up delay-100">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <i className="fas fa-check-circle text-lg"></i>
            </div>
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300">
              {formatPercentage(dashboardStats.goodPercentage, 1)}%
            </span>
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">{dashboardStats.goodEggs}</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Telur Bagus</p>
        </div>

        {/* Telur Jelek */}
        <div className="group bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 transition-all hover:shadow-md animate-fade-in-up delay-150">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/50 flex items-center justify-center text-red-600 dark:text-red-400">
              <i className="fas fa-times-circle text-lg"></i>
            </div>
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300">
              {formatPercentage((dashboardStats.badEggs / (dashboardStats.totalEggs || 1)) * 100, 1)}%
            </span>
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">{dashboardStats.badEggs}</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Telur Jelek</p>
        </div>

        {/* Status Sistem */}
        <div className="group bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 transition-all hover:shadow-md animate-fade-in-up delay-200">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-900/50 flex items-center justify-center text-violet-600 dark:text-violet-400">
              <i className="fas fa-server text-lg"></i>
            </div>
            <span className="flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 active-dot"></span>
              Aktif
            </span>
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">Online</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Status Sistem</p>
        </div>
      </div>

      {/* Sensor Cards Row */}
      {latestSensor && (
        <div className="grid grid-cols-3 gap-3 md:gap-5 animate-fade-in-up delay-250">
          <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/40 dark:to-orange-900/30 rounded-2xl p-4 md:p-5 border border-orange-200/60 dark:border-orange-800/40">
            <div className="flex items-center gap-2 mb-2">
              <i className="fas fa-temperature-high text-orange-500 dark:text-orange-400"></i>
              <span className="text-xs font-medium text-orange-600 dark:text-orange-300">Suhu</span>
            </div>
            <p className="text-2xl md:text-3xl font-bold text-orange-700 dark:text-orange-300">{latestSensor.temperature}<span className="text-base font-normal">°C</span></p>
          </div>
          <div className="bg-gradient-to-br from-sky-50 to-sky-100 dark:from-sky-950/40 dark:to-sky-900/30 rounded-2xl p-4 md:p-5 border border-sky-200/60 dark:border-sky-800/40">
            <div className="flex items-center gap-2 mb-2">
              <i className="fas fa-tint text-sky-500 dark:text-sky-400"></i>
              <span className="text-xs font-medium text-sky-600 dark:text-sky-300">Kelembapan</span>
            </div>
            <p className="text-2xl md:text-3xl font-bold text-sky-700 dark:text-sky-300">{latestSensor.humidity}<span className="text-base font-normal">%</span></p>
          </div>
          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/40 dark:to-emerald-900/30 rounded-2xl p-4 md:p-5 border border-emerald-200/60 dark:border-emerald-800/40">
            <div className="flex items-center gap-2 mb-2">
              <i className="fas fa-wind text-emerald-500 dark:text-emerald-400"></i>
              <span className="text-xs font-medium text-emerald-600 dark:text-emerald-300">Amonia</span>
            </div>
            <p className="text-2xl md:text-3xl font-bold text-emerald-700 dark:text-emerald-300">{latestSensor.ammonia}<span className="text-base font-normal"> ppm</span></p>
          </div>
        </div>
      )}

      {/* Sensor Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 md:p-6 shadow-sm border border-gray-100 dark:border-gray-700 animate-fade-in-up delay-250">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-5 gap-3">
          <div>
            <h3 className="font-semibold text-base text-gray-900 dark:text-gray-100">Pemantauan Sensor</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Suhu, Kelembapan & Gas Amonia</p>
          </div>
          <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            {[
              { key: '24h', label: '24 Jam' },
              { key: '7d', label: '7 Hari' },
              { key: '30d', label: '30 Hari' },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => handleSensorPeriodChange(key)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${sensorPeriod === key
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                  }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="h-56 md:h-72">
          {sensorLoading ? (
            <div className="flex justify-center items-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
            </div>
          ) : sensorChartData.labels.length > 0 ? (
            <div className="h-full chart-container">
              <Line
                data={sensorChartData}
                options={{
                  maintainAspectRatio: false,
                  interaction: {
                    mode: 'index',
                    intersect: false,
                  },
                  plugins: {
                    legend: {
                      display: true,
                      position: 'bottom',
                      labels: {
                        color: isDarkMode ? '#9ca3af' : '#6b7280',
                        usePointStyle: true,
                        padding: 20,
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
                          let label = context.dataset.label || '';
                          let value = context.parsed.y;
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
                        font: { size: 11 }
                      },
                      grid: {
                        color: isDarkMode ? '#374151' : '#f3f4f6'
                      },
                      ticks: {
                        color: isDarkMode ? '#9ca3af' : '#6b7280'
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
                        font: { size: 11 }
                      },
                      grid: {
                        drawOnChartArea: false,
                      },
                      ticks: {
                        color: isDarkMode ? '#9ca3af' : '#6b7280'
                      }
                    },
                    x: {
                      grid: {
                        color: isDarkMode ? '#374151' : '#f3f4f6'
                      },
                      ticks: {
                        color: isDarkMode ? '#9ca3af' : '#6b7280',
                        maxRotation: 45,
                        font: { size: 10 },
                        maxTicksLimit: 20,
                        autoSkip: true,
                        autoSkipPadding: 8,
                      }
                    }
                  }
                }}
              />
            </div>
          ) : (
            <div className="flex justify-center items-center h-full text-gray-400 dark:text-gray-500">
              <div className="text-center">
                <i className="fas fa-thermometer-half text-4xl mb-2"></i>
                <p>Belum ada data sensor</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 md:gap-5">
        {/* Weekly Line Chart */}
        <div className="lg:col-span-3 bg-white dark:bg-gray-800 rounded-2xl p-5 md:p-6 shadow-sm border border-gray-100 dark:border-gray-700 animate-fade-in-up delay-300">
          <div className="flex justify-between items-center mb-5">
            <div>
              <h3 className="font-semibold text-base text-gray-900 dark:text-gray-100">Produksi 7 Hari Terakhir</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Grafik mingguan</p>
            </div>
            <span className="text-xs font-medium px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300">Mingguan</span>
          </div>
          <div className="h-52 md:h-64">
            <Line
              data={weeklyData}
              options={{
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    display: true,
                    position: 'bottom',
                    labels: {
                      color: isDarkMode ? '#9ca3af' : '#6b7280',
                      usePointStyle: true,
                      padding: 16,
                    }
                  }
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    grid: {
                      color: isDarkMode ? '#374151' : '#f3f4f6'
                    },
                    ticks: {
                      color: isDarkMode ? '#9ca3af' : '#6b7280'
                    }
                  },
                  x: {
                    grid: {
                      color: isDarkMode ? '#374151' : '#f3f4f6'
                    },
                    ticks: {
                      color: isDarkMode ? '#9ca3af' : '#6b7280'
                    }
                  }
                }
              }}
            />
          </div>
        </div>

        {/* Donut Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl p-5 md:p-6 shadow-sm border border-gray-100 dark:border-gray-700 animate-fade-in-up delay-350">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="font-semibold text-base text-gray-900 dark:text-gray-100">Kualitas Telur</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {donutMode === 'harian'
                    ? formatDateForDisplay(activeDate)
                    : '7 hari terakhir'
                }
              </p>
            </div>
            <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              <button
                onClick={() => handleDonutModeChange('harian')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${donutMode === 'harian'
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                  }`}
              >
                Harian
              </button>
            </div>
          </div>

          <div className="h-44 md:h-52 flex justify-center items-center">
            <Doughnut
              data={donutData}
              options={{
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    display: false
                  },
                  tooltip: {
                    callbacks: {
                      label: function (context) {
                        const label = context.label || '';
                        const value = context.raw || 0;
                        const total = donutStats.totalEggs;
                        const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
                        return `${label}: ${value} (${percentage}%)`;
                      }
                    }
                  }
                },
                cutout: '70%'
              }}
            />
          </div>

          <div className="flex justify-center gap-5 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div>
              <span className="text-xs text-gray-600 dark:text-gray-300">
                Bagus: {donutStats.goodEggs} ({formatPercentage(donutStats.goodPercentage, 0)}%)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
              <span className="text-xs text-gray-600 dark:text-gray-300">
                Jelek: {donutStats.badEggs} ({formatPercentage((donutStats.badEggs / (donutStats.totalEggs || 1)) * 100, 0)}%)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Eggs Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 md:p-6 shadow-sm border border-gray-100 dark:border-gray-700 animate-fade-in-up delay-400">
        <div className="flex justify-between items-center mb-5">
          <div>
            <h3 className="font-semibold text-base text-gray-900 dark:text-gray-100">Telur Terbaru</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">5 telur terakhir yang terdeteksi</p>
          </div>
          <button
            onClick={handleViewAllData}
            className="text-emerald-600 dark:text-emerald-400 text-xs font-medium hover:text-emerald-700 dark:hover:text-emerald-300 transition-all flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/50"
          >
            <span>Lihat Semua</span>
            <i className="fas fa-arrow-right text-[10px]"></i>
          </button>
        </div>

        <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-gray-700">
          <table className="min-w-full">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-750 text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
                <th className="py-3 px-4 text-left text-xs font-semibold uppercase tracking-wider">Kode</th>
                <th className="py-3 px-4 text-left text-xs font-semibold uppercase tracking-wider">Kualitas</th>
                <th className="py-3 px-4 text-left text-xs font-semibold uppercase tracking-wider">Tanggal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {recentEggs.length > 0 ? (
                recentEggs.map((egg, index) => (
                  <tr key={egg.scan_id || index} className="hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                    <td className="py-3 px-4 text-sm font-medium text-gray-900 dark:text-gray-200">{egg.egg_code}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${egg.quality === 'good'
                          ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300'
                          : 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300'
                        }`}>
                        <i className={`fas ${egg.quality === 'good' ? 'fa-check' : 'fa-times'} text-[10px]`}></i>
                        {getQualityText(egg.quality)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-500 dark:text-gray-400">{formatDateForDisplay(egg.scanned_at)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="3" className="py-10 text-center text-gray-400 dark:text-gray-500">
                    <i className="fas fa-inbox text-3xl mb-2 block"></i>
                    Belum ada data telur hari ini
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;