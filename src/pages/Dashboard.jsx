import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { Line, Doughnut, Bar } from 'react-chartjs-2';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
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
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler);

const Dashboard = () => {
  // Helper function untuk format percentage yang aman
  const formatPercentage = (value, decimals = 1) => {
    const num = parseFloat(value);
    return isNaN(num) ? '0.0' : num.toFixed(decimals);
  };

  const { isDarkMode } = useTheme();
  const { user } = useAuth();
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
            backgroundColor: '#2b2796',
            hoverBackgroundColor: '#3a34c0',
            borderRadius: 6,
            borderSkipped: false,
            maxBarThickness: 21,
            categoryPercentage: 0.62,
            barPercentage: 0.72,
          },
          {
            label: 'Telur Jelek',
            data: badEggsData,
            backgroundColor: '#f4536a',
            hoverBackgroundColor: '#e8384f',
            borderRadius: 6,
            borderSkipped: false,
            maxBarThickness: 21,
            categoryPercentage: 0.62,
            barPercentage: 0.72,
          },
          {
            label: 'Total',
            data: goodEggsData.map((g, i) => g + (badEggsData[i] || 0)),
            backgroundColor: '#f9b02b',
            hoverBackgroundColor: '#eda11c',
            borderRadius: 6,
            borderSkipped: false,
            maxBarThickness: 21,
            categoryPercentage: 0.62,
            barPercentage: 0.72,
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

  // Circular gauge helper (ring progress indicator)
  const GaugeRing = ({ value, color, size = 48, label }) => {
    const stroke = 5;
    const radius = (size - stroke) / 2;
    const circumference = 2 * Math.PI * radius;
    const progress = Math.min(100, Math.max(0, Number(value) || 0));
    const offset = circumference - (progress / 100) * circumference;
    return (
      <div className="relative flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="rgba(156, 163, 175, 0.18)"
            strokeWidth={stroke}
            fill="none"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={stroke}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="font-bold text-gray-900 dark:text-white">{label}</div>
          <div className="text-[10px] text-gray-500 dark:text-gray-400">{progress}%</div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto page-enter space-y-6 md:space-y-8">
      {/* Welcome Card moved to top position */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl p-5 md:p-6 shadow-sm border border-gray-100 dark:border-gray-700 animate-fade-in-up">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
              <i className="fas fa-user text-base"></i>
            </div>
            <div className="text-left min-w-0">
              <p className="text-xs text-gray-500 dark:text-gray-400">Hai, kembali lagi</p>
              <h3 className="font-semibold text-base text-gray-900 dark:text-white truncate">{user?.name || 'Peternak'}</h3>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-800 transition-colors" aria-label="Notifikasi">
              <i className="fas fa-bell text-sm"></i>
            </button>
            <button className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-800 transition-colors" aria-label="Pesan">
              <i className="fas fa-comment text-sm"></i>
            </button>
          </div>
        </div>
        <div className="rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 p-4 md:p-5 shadow-lg shadow-blue-500/25 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-bl-full -mt-4 -mr-4 pointer-events-none"></div>
          <p className="text-xs text-blue-100 font-medium mb-1 relative">Selamat datang di Olivia</p>
          <h2 className="text-xl md:text-2xl font-bold text-white mb-1 relative">Sistem monitoring kandang siap digunakan</h2>
          <p className="text-xs text-blue-100/80 relative">Pantau suhu, kelembapan, dan amonia secara real-time melalui dashboard ini.</p>
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


        {/* Metric Cards (4 cards with circular rings) */}
        <div className={`grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4 transition-opacity duration-300 ${isRefreshing ? 'opacity-70' : 'opacity-100'}`}>
          {/* Total Telur */}
          <div className="group bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 transition-all hover:shadow-md animate-fade-in-up delay-75">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <i className="fas fa-egg text-lg"></i>
              </div>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${dashboardStats.trend >= 0
                  ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                  : 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300'
                }`}>
                <i className={`fas ${dashboardStats.trend >= 0 ? 'fa-arrow-up' : 'fa-arrow-down'} mr-1 text-[10px]`}></i>
                {formatPercentage(Math.abs(dashboardStats.trend || 0))}%
              </span>
            </div>
            <GaugeRing value={Math.min(dashboardStats.totalEggs, 100)} color="#2b2796" label={dashboardStats.totalEggs} size={48} />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">Total Telur Hari Ini</p>
          </div>

          {/* Telur Bagus — highlighted active card like reference */}
          <div className="group bg-[#2b2796] dark:bg-[#252075] text-white rounded-2xl p-5 shadow-lg shadow-indigo-900/20 border border-indigo-400/20 transition-all hover:shadow-indigo-500/25 animate-fade-in-up delay-100">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-200/20 flex items-center justify-center text-indigo-100 border border-indigo-400/30">
                <i className="fas fa-check-circle text-lg"></i>
              </div>
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-white/10 text-white backdrop-blur-sm">
                {formatPercentage(dashboardStats.goodPercentage, 1)}%
              </span>
            </div>
            <GaugeRing value={dashboardStats.goodPercentage} color="#60a5fa" label={dashboardStats.goodEggs} size={48} />
            <p className="text-xs text-indigo-200 mt-3">Telur Bagus</p>
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
            <GaugeRing value={formatPercentage((dashboardStats.badEggs / (dashboardStats.totalEggs || 1)) * 100, 0)} color="#f4536a" label={dashboardStats.badEggs} size={48} />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">Telur Jelek</p>
          </div>

          {/* Akurasi / Status Sistem */}
          <div className="group bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 transition-all hover:shadow-md animate-fade-in-up delay-200">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <i className="fas fa-shield-halved text-lg"></i>
              </div>
              <span className="flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 active-dot"></span>
                Aman
              </span>
            </div>
            <GaugeRing value={98} color="#34d399" label="98%" size={48} />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">Akurasi Sistem</p>
          </div>
        </div>

        {/* Sensors Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          {/* Left stacked sensor cards */}
          <div className="space-y-4">
            {/* Suhu Kandang */}
            <div className="bg-white dark:bg-gray-800 rounded-3xl p-5 md:p-6 shadow-sm border border-gray-100 dark:border-gray-700 group relative overflow-hidden animate-fade-in-up delay-250">
              <div className="absolute top-0 right-0 w-24 h-24 bg-orange-50 dark:bg-orange-900/10 rounded-bl-full -mt-4 -mr-4 z-0"></div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-9 h-9 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 dark:text-orange-400 shadow-sm">
                      <i className="fas fa-temperature-high"></i>
                    </div>
                    <span className="text-xs font-medium text-orange-600 dark:text-orange-300">Suhu Kandang</span>
                  </div>
                  <p className="text-3xl md:text-4xl font-bold text-orange-700 dark:text-orange-300">
                    {latestSensor ? latestSensor.temperature : 0}<span className="text-base font-normal">°C</span>
                  </p>
                </div>
                <div className="h-12 w-px bg-orange-200 dark:bg-orange-800/50 mx-4"></div>
                <div className="flex flex-col items-center gap-1.5">
                  <div className="w-2 h-5 bg-orange-400 rounded-full"></div>
                  <div className="w-2 h-6 bg-orange-500 rounded-full"></div>
                  <div className="w-2 h-8 bg-orange-600 rounded-full"></div>
                  <div className="w-2 h-5 bg-orange-400 rounded-full"></div>
                </div>
              </div>
            </div>

            {/* Kelembapan */}
            <div className="bg-white dark:bg-gray-800 rounded-3xl p-5 md:p-6 shadow-sm border border-gray-100 dark:border-gray-700 group relative overflow-hidden animate-fade-in-up delay-300">
              <div className="absolute top-0 right-0 w-24 h-24 bg-sky-50 dark:bg-sky-900/10 rounded-bl-full -mt-4 -mr-4 z-0"></div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-9 h-9 rounded-xl bg-sky-100 dark:bg-sky-900/30 flex items-center justify-center text-sky-600 dark:text-sky-400 shadow-sm">
                      <i className="fas fa-tint"></i>
                    </div>
                    <span className="text-xs font-medium text-sky-600 dark:text-sky-300">Kelembapan Udara</span>
                  </div>
                  <p className="text-3xl md:text-4xl font-bold text-sky-700 dark:text-sky-300">
                    {latestSensor ? latestSensor.humidity : 0}<span className="text-base font-normal">%</span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button className="w-7 h-7 rounded-full bg-sky-50 dark:bg-sky-900/30 flex items-center justify-center text-sky-600 dark:text-sky-300 hover:bg-sky-100 transition-colors">
                    <i className="fas fa-chevron-up text-[10px]"></i>
                  </button>
                  <button className="w-7 h-7 rounded-full bg-sky-50 dark:bg-sky-900/30 flex items-center justify-center text-sky-600 dark:text-sky-300 hover:bg-sky-100 transition-colors">
                    <i className="fas fa-chevron-down text-[10px]"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Amonia Arc Gauge */}
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-5 md:p-6 shadow-sm border border-gray-100 dark:border-gray-700 relative overflow-hidden animate-fade-in-up delay-350">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 dark:bg-emerald-900/10 rounded-bl-full -mt-6 -mr-6 z-0"></div>
            <div className="flex flex-col items-center justify-center h-full">
              <div className="flex flex-col items-center gap-1">
                <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Kadar Amonia & Udara</span>
                <p className="text-4xl md:text-5xl font-bold text-emerald-700 dark:text-emerald-300">
                  {latestSensor ? latestSensor.ammonia : 12}<span className="text-lg font-normal"> ppm</span>
                </p>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  latestSensor && latestSensor.ammonia <= 20
                    ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                    : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                }`}>
                  {latestSensor && latestSensor.ammonia <= 20 ? 'Aman' : 'Tinggi'}
                </span>
              </div>
              {/* Arc Gauge */}
              <div className="relative w-48 h-24 mt-6">
                <svg width="200" height="100" viewBox="0 0 200 100" className="w-full h-full block">
                  <defs>
                    <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#f4536a" />
                      <stop offset="40%" stopColor="#f9b02b" />
                      <stop offset="100%" stopColor="#2b2796" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M 20 80 Q 100 20 180 80"
                    stroke="rgba(156,163,175,0.12)"
                    strokeWidth="14"
                    fill="none"
                    strokeLinecap="round"
                  />
                  <path
                    id="gaugeArc"
                    d="M 20 80 Q 100 20 180 80"
                    stroke="url(#gaugeGradient)"
                    strokeWidth="14"
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray="220"
                    strokeDashoffset={220 - (Math.min(Math.max(latestSensor ? latestSensor.ammonia : 12, 0), 50) / 50) * 220}
                    className="transition-all duration-1000 ease-out"
                  />
                </svg>
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 flex items-center gap-1 text-[10px] text-gray-400 font-medium uppercase tracking-wider">
                  <span>0</span>
                  <span>50 ppm</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Weekly Production Bar Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-5 md:p-6 shadow-sm border border-gray-100 dark:border-gray-700 animate-fade-in-up delay-400">
          <div className="flex justify-between items-center mb-6">
            <div>
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-1">
                <i className="fas fa-chart-bar"></i>
                <span>Produksi Telur Mingguan</span>
              </div>
              <h3 className="font-semibold text-base text-gray-900 dark:text-gray-100">Produksi 7 Hari Terakhir</h3>
            </div>
            <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 rounded-xl p-1">
              <span className="text-xs font-medium text-gray-900 dark:text-white bg-white dark:bg-gray-600 px-2 py-1 rounded-md">Mingguan</span>
              <i className="fas fa-chevron-down text-xs text-gray-500"></i>
            </div>
          </div>

          {/* Chart Legend */}
          <div className="flex justify-center gap-5 mb-6">
            <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-[#2b2796]"></span>
              Telur Bagus
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-[#f4536a]"></span>
              Telur Jelek
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-[#f9b02b]"></span>
              Total
            </div>
          </div>

          <div className="h-56 md:h-72">
            <Bar
              data={weeklyData}
              options={{
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: false },
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
                        return `${context.dataset.label}: ${context.raw}`;
                      }
                    }
                  }
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    grid: { color: isDarkMode ? '#374151' : '#f3f4f6', drawBorder: false },
                    ticks: { color: isDarkMode ? '#9ca3af' : '#6b7280', font: { size: 10 }, stepSize: 1 },
                    maxTicksLimit: 5
                  },
                  x: {
                    grid: { display: false },
                    ticks: { color: isDarkMode ? '#9ca3af' : '#6b7280', font: { size: 11 }, maxRotation: 0 }
                  }
                }
              }}
            />
          </div>
        </div>

        {/* Recent Eggs Table */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-5 md:p-6 shadow-sm border border-gray-100 dark:border-gray-700 animate-fade-in-up delay-450">
          <div className="flex justify-between items-center mb-5">
            <div>
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-1">
                <i className="fas fa-egg"></i>
                <span>Terbaru</span>
              </div>
              <h3 className="font-semibold text-base text-gray-900 dark:text-gray-100">Telur Terbaru</h3>
            </div>
            <button
              onClick={handleViewAllData}
              className="text-blue-600 dark:text-blue-400 text-xs font-medium hover:text-blue-700 dark:hover:text-blue-300 transition-all flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50"
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
                            ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
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