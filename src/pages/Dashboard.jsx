import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Title, Tooltip, Legend } from 'chart.js';
import { Line, Doughnut } from 'react-chartjs-2';
import { useTheme } from '../contexts/ThemeContext';
import { 
  getDailyEggSummary, 
  getRecentEggs, 
  getEggStatistics,
  formatDateForDisplay,
  getQualityText 
} from '../services/eggService';

// Register ChartJS components
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Title, Tooltip, Legend);

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
  
  // State untuk data dashboard yang bisa di-refresh
  const [dashboardStats, setDashboardStats] = useState({
    totalEggs: 0,
    goodEggs: 0,
    badEggs: 0,
    goodPercentage: 0,
    trend: 0
  });

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
          trend: 0 // We'll calculate this later with historical data
        });

        // Update donut chart
        setDonutData(prev => ({
          ...prev,
          datasets: [{
            ...prev.datasets[0],
            data: [summary.good_eggs || 0, summary.bad_eggs || 0]
          }]
        }));
      }

      // Load recent eggs
      const recentResponse = await getRecentEggs(5);
      if (recentResponse.success) {
        setRecentEggs(recentResponse.data.recent_eggs || []);
      }

      // Load weekly statistics for chart
      await loadWeeklyStatistics();

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
      const last7Days = [];
      const labels = [];
      const goodEggsData = [];
      const badEggsData = [];

      // Get data for last 7 days
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
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
      
      // Show success notification (optional)
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

  // Load data on component mount
  useEffect(() => {
    loadDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <span className="ml-3 text-gray-600 dark:text-gray-300">Memuat dashboard...</span>
        </div>
      </div>
    );
  }
  
  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Dashboard</h1>
          <p className="text-sm text-blue-600 dark:text-gray-400 mt-1">
            Terakhir diperbarui: {lastRefresh.toLocaleTimeString('id-ID')}
          </p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={handleRefresh}
            disabled={isRefreshing}
            className={`flex items-center gap-2 border border-blue-200 dark:border-gray-600 rounded-lg px-4 py-2 text-blue-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-gray-700 transition-all ${
              isRefreshing ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            <i className={`fas fa-sync-alt ${isRefreshing ? 'animate-spin' : ''}`}></i>
            <span>{isRefreshing ? 'Memperbarui...' : 'Refresh'}</span>
          </button>
          <button 
            onClick={handleViewAllData}
            className="flex items-center gap-2 bg-blue-600 dark:bg-blue-700 text-white rounded-lg px-4 py-2 hover:bg-blue-700 dark:hover:bg-blue-800 transition-all shadow-sm"
          >
            <i className="fas fa-list"></i>
            <span>Lihat Data</span>
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded-xl mb-6">
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
      <div className={`grid grid-cols-1 md:grid-cols-4 gap-6 mb-8 transition-opacity duration-300 ${
        isRefreshing ? 'opacity-70' : 'opacity-100'
      }`}>
        <div className="bg-blue-50 dark:bg-gray-800 p-5 rounded-xl shadow-sm hover:shadow-md transition-all relative overflow-hidden border border-blue-100 dark:border-gray-700">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-100 dark:bg-blue-900 rounded-bl-full -mt-4 -mr-4 z-0"></div>
          <div className="relative z-10">
            <p className="text-blue-600 dark:text-gray-400 mb-1">Jumlah Telur Hari ini</p>
            <h2 className="text-3xl font-bold text-blue-800 dark:text-gray-100">{dashboardStats.totalEggs}</h2>
            <p className={`text-sm flex items-center gap-1 mt-1 ${
              dashboardStats.trend >= 0 
                ? 'text-green-500 dark:text-green-400' 
                : 'text-red-500 dark:text-red-400'
            }`}>
              <i className={`fas ${dashboardStats.trend >= 0 ? 'fa-arrow-up' : 'fa-arrow-down'} text-xs`}></i>
              <span>{formatPercentage(Math.abs(dashboardStats.trend || 0))}% dari kemarin</span>
            </p>
          </div>
          <div className="absolute top-4 right-4 z-10">
            <div className="p-2 rounded-full bg-blue-500 dark:bg-blue-800 text-white dark:text-blue-300">
              <i className="fas fa-chart-line"></i>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm hover:shadow-md transition-all relative overflow-hidden border border-blue-100 dark:border-gray-700">
          <div className="absolute top-0 right-0 w-24 h-24 bg-green-50 dark:bg-green-900 rounded-bl-full -mt-4 -mr-4 z-0"></div>
          <div className="relative z-10">
            <p className="text-blue-600 dark:text-gray-400 mb-1">Jumlah Telur Bagus</p>
            <h2 className="text-3xl font-bold text-blue-800 dark:text-gray-100">{formatPercentage(dashboardStats.goodPercentage)}%</h2>
            <p className="text-green-500 dark:text-green-400 text-sm flex items-center gap-1 mt-1">
              <i className="fas fa-arrow-up text-xs"></i>
              <span>{dashboardStats.goodEggs} telur bagus</span>
            </p>
          </div>
          <div className="absolute top-4 right-4 z-10">
            <div className="p-2 rounded-full bg-green-500 dark:bg-green-800 text-white dark:text-green-300">
              <i className="fas fa-check-circle"></i>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm hover:shadow-md transition-all relative overflow-hidden border border-blue-100 dark:border-gray-700">
          <div className="absolute top-0 right-0 w-24 h-24 bg-red-50 dark:bg-red-900 rounded-bl-full -mt-4 -mr-4 z-0"></div>
          <div className="relative z-10">
            <p className="text-blue-600 dark:text-gray-400 mb-1">Jumlah Telur Jelek</p>
            <h2 className="text-3xl font-bold text-blue-800 dark:text-gray-100">{dashboardStats.badEggs}</h2>
            <p className="text-red-500 dark:text-red-400 text-sm flex items-center gap-1 mt-1">
              <i className="fas fa-arrow-up text-xs"></i>
              <span>{formatPercentage((dashboardStats.badEggs / (dashboardStats.totalEggs || 1)) * 100, 0)}%</span>
            </p>
          </div>
          <div className="absolute top-4 right-4 z-10">
            <div className="p-2 rounded-full bg-red-500 dark:bg-red-800 text-white dark:text-red-300">
              <i className="fas fa-exclamation-circle"></i>
            </div>
          </div>
        </div>
        
        {/* Card keempat - Status Sistem */}
        <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm hover:shadow-md transition-all relative overflow-hidden border border-blue-100 dark:border-gray-700">
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-50 dark:bg-purple-900 rounded-bl-full -mt-4 -mr-4 z-0"></div>
          <div className="relative z-10">
            <p className="text-blue-600 dark:text-gray-400 mb-1">Status Sistem</p>
            <h2 className="text-3xl font-bold text-blue-800 dark:text-gray-100">Online</h2>
            <p className="text-green-500 dark:text-green-400 text-sm flex items-center gap-1 mt-1">
              <i className="fas fa-circle text-xs"></i>
              <span>Semua sistem berjalan</span>
            </p>
          </div>
          <div className="absolute top-4 right-4 z-10">
            <div className="p-2 rounded-full bg-purple-500 dark:bg-purple-800 text-white dark:text-purple-300">
              <i className="fas fa-server"></i>
            </div>
          </div>
        </div>
      </div>

      {/* Charts and Recent Data */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Weekly Chart */}
        <div className="bg-blue-50 dark:bg-gray-800 p-6 rounded-xl shadow-sm hover:shadow-md transition-all border border-blue-100 dark:border-gray-700">
          <div className="flex justify-between items-center mb-4">
            <div>
              <p className="text-blue-600 dark:text-gray-400 text-sm">Grafik Mingguan</p>
              <h3 className="font-semibold text-lg text-blue-800 dark:text-gray-100">Produksi Telur 7 Hari Terakhir</h3>
            </div>
            <button className="bg-purple-600 dark:bg-purple-700 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-purple-700 dark:hover:bg-purple-800 transition-all shadow-sm">
              Mingguan
            </button>
          </div>
          
          <div className="h-64">
            <Line 
              data={weeklyData} 
              options={{ 
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    display: true,
                    position: 'bottom'
                  }
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    grid: {
                      color: isDarkMode ? '#374151' : '#e5e7eb'
                    },
                    ticks: {
                      color: isDarkMode ? '#9ca3af' : '#6b7280'
                    }
                  },
                  x: {
                    grid: {
                      color: isDarkMode ? '#374151' : '#e5e7eb'
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
        <div className="bg-blue-50 dark:bg-gray-800 p-6 rounded-xl shadow-sm hover:shadow-md transition-all border border-blue-100 dark:border-gray-700">
          <div className="flex justify-between items-center mb-4">
            <div>
              <p className="text-blue-600 dark:text-gray-400 text-sm">Statistik Telur</p>
              <h3 className="font-semibold text-lg text-blue-800 dark:text-gray-100">Statistik Telur Harian ({formatDateForDisplay(activeDate)})</h3>
            </div>
            <button className="bg-purple-600 dark:bg-purple-700 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-purple-700 dark:hover:bg-purple-800 transition-all shadow-sm">
              Harian
            </button>
          </div>
          
          <div className="h-64 flex justify-center items-center">
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
                      label: function(context) {
                        const label = context.label || '';
                        const value = context.raw || 0;
                        const total = dashboardStats.totalEggs;
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
          
          <div className="flex justify-center gap-6 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <span className="text-sm text-blue-700 dark:text-gray-300">
                Telur Bagus: {dashboardStats.goodEggs} ({formatPercentage(dashboardStats.goodPercentage, 0)}%)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span className="text-sm text-blue-700 dark:text-gray-300">
                Telur Jelek: {dashboardStats.badEggs} ({formatPercentage((dashboardStats.badEggs / (dashboardStats.totalEggs || 1)) * 100, 0)}%)
              </span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Recent Eggs */}
      <div className="grid grid-cols-1 gap-8 mb-8">
        <div className="bg-blue-50 dark:bg-gray-800 p-6 rounded-xl shadow-sm hover:shadow-md transition-all border border-blue-100 dark:border-gray-700">
          <div className="flex justify-between items-center mb-5">
            <h2 className="text-lg font-semibold text-blue-800 dark:text-gray-100">Daftar Telur Terbaru</h2>
            <button 
              onClick={handleViewAllData}
              className="text-blue-600 dark:text-blue-400 text-sm hover:text-blue-700 dark:hover:text-blue-300 transition-all flex items-center gap-1"
            >
              <span>Lihat Semua Data</span>
              <i className="fas fa-chevron-right text-xs"></i>
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="text-blue-600 dark:text-gray-400 border-b border-blue-200 dark:border-gray-700">
                  <th className="py-3 px-4 text-left font-medium">KODE</th>
                  <th className="py-3 px-4 text-left font-medium">KUALITAS</th>
                  <th className="py-3 px-4 text-left font-medium">TANGGAL</th>
                </tr>
              </thead>
              <tbody>
                {recentEggs.length > 0 ? (
                  recentEggs.map((egg, index) => (
                    <tr key={egg.scan_id || index} className="border-b border-blue-100 dark:border-gray-700 hover:bg-blue-100 dark:hover:bg-gray-700 transition-all">
                      <td className="py-3 px-4 text-blue-800 dark:text-gray-200">{egg.egg_code}</td>
                      <td className="py-3 px-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          egg.quality === 'good' 
                            ? 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-300'
                            : 'bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-300'
                        }`}>
                          {getQualityText(egg.quality)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-blue-600 dark:text-gray-300">{formatDateForDisplay(egg.scanned_at)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="3" className="py-6 text-center text-gray-500 dark:text-gray-400">
                      Belum ada data telur hari ini
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          <div className="mt-5">
            <button 
              onClick={handleViewAllData}
              className="text-blue-600 dark:text-blue-400 flex items-center gap-1 hover:text-blue-700 dark:hover:text-blue-300 transition-all"
            >
              <span>Lihat semua data telur</span>
              <i className="fas fa-arrow-right ml-1 text-xs"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 