import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ImageModal from '../components/ImageModal';
import { 
  getAllEggs, 
  getEggStatistics, 
  getAvailableDates,
  formatDateForAPI,
  formatDateForDisplay,
  formatTimeForDisplay,
  getQualityBadgeClass,
  getQualityText
} from '../services/eggService';

const DataKualitasTelur = () => {
  const navigate = useNavigate();

  // Helper function untuk format percentage yang aman
  const formatPercentage = (value, decimals = 1) => {
    const num = parseFloat(value);
    return isNaN(num) ? '0.0' : num.toFixed(decimals);
  };

  // State untuk modal gambar
  const [modalState, setModalState] = useState({
    isOpen: false,
    imageData: null,
    eggCode: ''
  });

  const [activeDate, setActiveDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterVisible, setFilterVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [eggData, setEggData] = useState([]);
  const [statistics, setStatistics] = useState({
    total_eggs: 0,
    good_eggs: 0,
    bad_eggs: 0,
    good_percentage: 0,
    bad_percentage: 0
  });
  const [availableDates, setAvailableDates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    current_page: 1,
    total_pages: 1,
    total_records: 0,
    per_page: 10
  });
  const [filters, setFilters] = useState({
    quality: 'all',
    page: 1,
    limit: 10
  });

  // Load eggs data
  const loadEggsData = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        date: formatDateForAPI(activeDate),
        quality: filters.quality !== 'all' ? filters.quality : undefined,
        page: filters.page,
        limit: filters.limit,
        sort_by: 'scanned_at',
        sort_order: 'DESC'
      };
  
      const response = await getAllEggs(params);
      
      if (response.success) {
        setEggData(response.data.eggs || []);
        setPagination(response.data.pagination || {});
      } else {
        setError('Gagal memuat data telur');
      }
    } catch (error) {
      console.error('Error loading eggs data:', error);
      setError('Terjadi kesalahan saat memuat data telur');
    } finally {
      setLoading(false);
    }
  };

  // Load statistics
  const loadStatistics = async () => {
    try {
      const response = await getEggStatistics({ 
        date: formatDateForAPI(activeDate) 
      });
      
      if (response.success && response.data.statistics.length > 0) {
        const stats = response.data.statistics[0];
        setStatistics({
          total_eggs: stats.total_eggs || 0,
          good_eggs: stats.good_eggs || 0,
          bad_eggs: stats.bad_eggs || 0,
          good_percentage: stats.good_percentage || 0,
          bad_percentage: stats.bad_percentage || 0
        });
      } else {
        setStatistics({
          total_eggs: 0,
          good_eggs: 0,
          bad_eggs: 0,
          good_percentage: 0,
          bad_percentage: 0
        });
      }
    } catch (error) {
      console.error('Error loading statistics:', error);
    }
  };

  // Load available dates
  const loadAvailableDates = async () => {
    try {
      const response = await getAvailableDates(30);
      
      if (response.success) {
        setAvailableDates(response.data.available_dates || []);
      }
    } catch (error) {
      console.error('Error loading available dates:', error);
    }
  };

  // Handle date change
  const handleDateChange = (event) => {
    const newDate = event.target.value;
    setSelectedDate(newDate);
    setActiveDate(newDate);
    setFilters(prev => ({ ...prev, page: 1 })); // Reset to first page
  };
  
  // Handle filter apply
  const handleApplyFilter = () => {
    setActiveDate(selectedDate);
    setFilters(prev => ({ ...prev, page: 1 })); // Reset to first page
    setFilterVisible(false);
  };
  
  // Handle filter reset
  const handleReset = () => {
    const today = new Date().toISOString().split('T')[0];
    setSelectedDate(today);
    setActiveDate(today);
    setFilters({
      quality: 'all',
      page: 1,
      limit: 10
    });
    setFilterVisible(false);
  };

  // Handle quality filter change
  const handleQualityFilterChange = (quality) => {
    setFilters(prev => ({ 
      ...prev, 
      quality: quality,
      page: 1 
    }));
  };

  // Handle pagination
  const handlePageChange = (newPage) => {
    setFilters(prev => ({ ...prev, page: newPage }));
  };

  // Handle modal functions
  const handleViewImage = (egg) => {
    setModalState({
      isOpen: true,
      imageData: egg.image,
      eggCode: egg.egg_code
    });
  };

  const handleCloseModal = () => {
    setModalState({
      isOpen: false,
      imageData: null,
      eggCode: ''
    });
  };

  // Handle export data navigation
  const handleExportData = () => {
    navigate('/unduh-laporan');
  };

  // Load data when dependencies change
  useEffect(() => {
    loadEggsData();
    loadStatistics();
  }, [activeDate, filters]);

  // Load available dates on component mount
  useEffect(() => {
    loadAvailableDates();
  }, []);

  if (loading && eggData.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <span className="ml-3 text-gray-600 dark:text-gray-300">Memuat data telur...</span>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 dark:from-blue-800 dark:to-indigo-900 rounded-2xl shadow-xl mb-8 overflow-hidden">
        <div className="px-8 py-10 text-white">
          <h1 className="text-3xl font-bold mb-2">Data Kualitas Telur</h1>
          <p className="text-blue-100">Monitoring dan analisis kualitas produksi telur</p>
          
          <div className="flex flex-wrap gap-4 mt-6 items-center">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <i className="far fa-calendar-alt text-blue-300"></i>
              </div>
              <input
                type="date"
                className="bg-white/20 border border-blue-300/30 text-white placeholder-blue-200 text-sm rounded-xl focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 p-2.5 backdrop-blur-sm"
                value={selectedDate}
                onChange={handleDateChange}
              />
            </div>
            
            <div className="flex gap-3 ml-auto">
              <button 
                className="flex items-center gap-2 bg-white/20 backdrop-blur-sm border border-blue-300/30 rounded-xl px-4 py-2.5 text-white hover:bg-white/30 transition-all"
                onClick={() => setFilterVisible(!filterVisible)}
              >
                <i className="fas fa-filter"></i>
                <span>Filter</span>
              </button>
              <button 
                className="flex items-center gap-2 bg-white text-indigo-600 rounded-xl px-4 py-2.5 hover:bg-blue-50 transition-all shadow-sm font-medium"
                onClick={handleExportData}
              >
                <i className="fas fa-download"></i>
                <span>Ekspor Data</span>
              </button>
            </div>
          </div>
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
                loadEggsData();
                loadStatistics();
              }}
              className="ml-auto text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200"
            >
              <i className="fas fa-redo"></i>
            </button>
          </div>
        </div>
      )}
      
      {/* Filter Panel */}
      {filterVisible && (
        <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg mb-8 border border-gray-100 dark:border-gray-700 relative animate-fadeIn">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Filter Data</h3>
            <button 
              className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 absolute top-6 right-6 bg-gray-100 dark:bg-gray-700 p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
              onClick={() => setFilterVisible(false)}
            >
              <i className="fas fa-times"></i>
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tanggal</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <i className="far fa-calendar-alt text-gray-400 dark:text-gray-500"></i>
                </div>
                <input
                  type="date"
                  className="bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 text-sm rounded-xl focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 p-3"
                  value={selectedDate}
                  onChange={handleDateChange}
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Kualitas</label>
              <div className="flex gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="radio" 
                    name="quality"
                    value="all"
                    checked={filters.quality === 'all'}
                    onChange={(e) => handleQualityFilterChange(e.target.value)}
                    className="w-5 h-5 text-blue-600 rounded-md focus:ring-blue-500" 
                  />
                  <span className="text-sm text-gray-900 dark:text-gray-100">Semua</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="radio" 
                    name="quality"
                    value="good"
                    checked={filters.quality === 'good'}
                    onChange={(e) => handleQualityFilterChange(e.target.value)}
                    className="w-5 h-5 text-blue-600 rounded-md focus:ring-blue-500" 
                  />
                  <span className="text-sm text-gray-900 dark:text-gray-100">Bagus</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="radio" 
                    name="quality"
                    value="bad"
                    checked={filters.quality === 'bad'}
                    onChange={(e) => handleQualityFilterChange(e.target.value)}
                    className="w-5 h-5 text-blue-600 rounded-md focus:ring-blue-500" 
                  />
                  <span className="text-sm text-gray-900 dark:text-gray-100">Jelek</span>
                </label>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end mt-8 gap-3">
            <button 
              onClick={handleReset}
              className="px-6 py-3 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition-all"
            >
              Reset
            </button>
            <button 
              onClick={handleApplyFilter}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:opacity-90 shadow-md font-medium transition-all"
            >
              Terapkan Filter
            </button>
          </div>
        </div>
      )}
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md hover:shadow-lg transition-all relative overflow-hidden group border border-gray-100 dark:border-gray-700">
          <div className="absolute top-0 right-0 w-40 h-40 bg-blue-50 dark:bg-blue-900 rounded-bl-full -mt-8 -mr-8 opacity-70 z-0 group-hover:bg-blue-100 dark:group-hover:bg-blue-800 transition-all"></div>
          <div className="relative z-10">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Total Telur</p>
            <h2 className="text-4xl font-bold text-gray-800 dark:text-gray-100 mb-1">{statistics.total_eggs}</h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm flex items-center gap-1">
              <i className="far fa-calendar-alt"></i> {formatDateForDisplay(activeDate)}
            </p>
          </div>
          <div className="absolute top-6 right-6 z-10">
            <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-800 text-blue-500 dark:text-blue-300 group-hover:bg-blue-200 dark:group-hover:bg-blue-700 group-hover:text-blue-600 dark:group-hover:text-blue-200 transition-all">
              <i className="fas fa-egg text-lg"></i>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md hover:shadow-lg transition-all relative overflow-hidden group border border-gray-100 dark:border-gray-700">
          <div className="absolute top-0 right-0 w-40 h-40 bg-green-50 dark:bg-green-900 rounded-bl-full -mt-8 -mr-8 opacity-70 z-0 group-hover:bg-green-100 dark:group-hover:bg-green-800 transition-all"></div>
          <div className="relative z-10">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Telur Bagus</p>
            <h2 className="text-4xl font-bold text-gray-800 dark:text-gray-100 mb-1">{statistics.good_eggs}</h2>
            <div className="flex items-center gap-2">
              <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-1.5">
                <div className="bg-green-500 h-1.5 rounded-full" style={{ width: `${formatPercentage(statistics.good_percentage)}%` }}></div>
              </div>
              <p className="text-green-500 dark:text-green-400 text-sm font-medium">
                {formatPercentage(statistics.good_percentage)}%
              </p>
            </div>
          </div>
          <div className="absolute top-6 right-6 z-10">
            <div className="p-3 rounded-full bg-green-100 dark:bg-green-800 text-green-500 dark:text-green-300 group-hover:bg-green-200 dark:group-hover:bg-green-700 group-hover:text-green-600 dark:group-hover:text-green-200 transition-all">
              <i className="fas fa-check-circle text-lg"></i>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md hover:shadow-lg transition-all relative overflow-hidden group border border-gray-100 dark:border-gray-700">
          <div className="absolute top-0 right-0 w-40 h-40 bg-red-50 dark:bg-red-900 rounded-bl-full -mt-8 -mr-8 opacity-70 z-0 group-hover:bg-red-100 dark:group-hover:bg-red-800 transition-all"></div>
          <div className="relative z-10">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Telur Jelek</p>
            <h2 className="text-4xl font-bold text-gray-800 dark:text-gray-100 mb-1">{statistics.bad_eggs}</h2>
            <div className="flex items-center gap-2">
              <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-1.5">
                <div className="bg-red-500 h-1.5 rounded-full" style={{ width: `${formatPercentage(statistics.bad_percentage)}%` }}></div>
              </div>
              <p className="text-red-500 dark:text-red-400 text-sm font-medium">
                {formatPercentage(statistics.bad_percentage)}%
              </p>
            </div>
          </div>
          <div className="absolute top-6 right-6 z-10">
            <div className="p-3 rounded-full bg-red-100 dark:bg-red-800 text-red-500 dark:text-red-300 group-hover:bg-red-200 dark:group-hover:bg-red-700 group-hover:text-red-600 dark:group-hover:text-red-200 transition-all">
              <i className="fas fa-exclamation-circle text-lg"></i>
            </div>
          </div>
        </div>
      </div>
      
      {/* Data Table */}
      <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-md mb-8 border border-gray-100 dark:border-gray-700">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Daftar Telur</h2>
          <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900 px-3 py-1.5 rounded-lg">
            <i className="fas fa-egg text-blue-500 dark:text-blue-300"></i>
            <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Total: {statistics.total_eggs} telur</span>
          </div>
        </div>
        
        {loading ? (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <span className="ml-3 text-gray-600 dark:text-gray-300">Memuat data...</span>
          </div>
        ) : eggData.length === 0 ? (
          <div className="text-center py-12">
            <i className="fas fa-egg text-4xl text-gray-300 dark:text-gray-600 mb-4"></i>
            <p className="text-gray-500 dark:text-gray-400 text-lg">Tidak ada data telur untuk tanggal ini</p>
            <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">Pilih tanggal lain atau periksa filter yang diterapkan</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full bg-white dark:bg-gray-800">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                    <th className="py-4 px-6 text-left font-semibold text-gray-600 dark:text-gray-300 uppercase text-xs tracking-wider">Kode</th>
                    <th className="py-4 px-6 text-left font-semibold text-gray-600 dark:text-gray-300 uppercase text-xs tracking-wider">Kualitas</th>
                    <th className="py-4 px-6 text-left font-semibold text-gray-600 dark:text-gray-300 uppercase text-xs tracking-wider">Tanggal</th>
                    <th className="py-4 px-6 text-left font-semibold text-gray-600 dark:text-gray-300 uppercase text-xs tracking-wider">Waktu</th>
                    <th className="py-4 px-6 text-right font-semibold text-gray-600 dark:text-gray-300 uppercase text-xs tracking-wider">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {eggData.map((egg, index) => (
                    <tr key={egg.scan_id || index} className="hover:bg-blue-50/50 dark:hover:bg-gray-700 transition-colors">
                      <td className="py-4 px-6 font-medium text-gray-900 dark:text-gray-100">{egg.egg_code}</td>
                      <td className="py-4 px-6">
                        <span className={getQualityBadgeClass(egg.quality)}>
                          {getQualityText(egg.quality)}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-gray-600 dark:text-gray-300">
                        <div className="flex items-center gap-2">
                          <i className="far fa-calendar-alt text-gray-400 dark:text-gray-500"></i>
                          {formatDateForDisplay(egg.scanned_at)}
                        </div>
                      </td>
                      <td className="py-4 px-6 text-gray-600 dark:text-gray-300">
                        <div className="flex items-center gap-2">
                          <i className="far fa-clock text-gray-400 dark:text-gray-500"></i>
                          {formatTimeForDisplay(egg.scanned_at)}
                        </div>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <button 
                          className="text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 bg-blue-50 dark:bg-blue-900 p-2 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-800 transition-colors"
                          onClick={() => handleViewImage(egg)}
                          title="Lihat foto telur"
                        >
                          <i className="fas fa-eye"></i>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Pagination */}
            <div className="flex flex-wrap justify-between items-center mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
              <div className="text-sm text-gray-500 dark:text-gray-400 mb-4 md:mb-0">
                Menampilkan {((pagination.current_page - 1) * pagination.per_page) + 1}-{Math.min(pagination.current_page * pagination.per_page, pagination.total_records)} dari {pagination.total_records} data
              </div>
              <div className="flex gap-2">
                <button 
                  className="px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed" 
                  disabled={!pagination.has_prev}
                  onClick={() => handlePageChange(pagination.current_page - 1)}
                >
                  <i className="fas fa-chevron-left"></i>
                </button>
                
                {/* Page numbers */}
                {Array.from({ length: Math.min(5, pagination.total_pages) }, (_, i) => {
                  const pageNum = Math.max(1, pagination.current_page - 2) + i;
                  if (pageNum <= pagination.total_pages) {
                    return (
                      <button
                        key={pageNum}
                        className={`px-4 py-2 rounded-lg font-medium transition-all ${
                          pageNum === pagination.current_page
                            ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white'
                            : 'border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                        onClick={() => handlePageChange(pageNum)}
                      >
                        {pageNum}
                      </button>
                    );
                  }
                  return null;
                })}
                
                <button 
                  className="px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed" 
                  disabled={!pagination.has_next}
                  onClick={() => handlePageChange(pagination.current_page + 1)}
                >
                  <i className="fas fa-chevron-right"></i>
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Image Modal */}
      <ImageModal
        isOpen={modalState.isOpen}
        onClose={handleCloseModal}
        imageData={modalState.imageData}
        eggCode={modalState.eggCode}
      />
    </div>
  );
};

export default DataKualitasTelur;