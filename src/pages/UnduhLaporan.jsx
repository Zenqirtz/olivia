import { useState, useEffect, useRef } from 'react';
import {
  generateReport,
  getReportHistory,
  downloadExistingReport,
  formatPeriodForDisplay,
  getReportTypeDisplayName,
  formatFileSize
} from '../services/reportService';

const UnduhLaporan = () => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedPeriod, setSelectedPeriod] = useState('today');
  const [selectedReportType, setSelectedReportType] = useState('kualitas-telur');
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportHistory, setReportHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  
  // Add new state for date range
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  // Add state for dropdown menu and selected report
  const [openDropdownId, setOpenDropdownId] = useState(null);
  const dropdownRefs = useRef({});

  const periodOptions = [
    { id: 'today', label: 'Hari Ini', description: 'Data hari ini saja' },
    { id: 'last7days', label: '7 Hari Terakhir', description: 'Data 7 hari terakhir' },
    { id: 'last30days', label: '30 Hari Terakhir', description: 'Data 30 hari terakhir' },
    { id: 'custom', label: 'Tanggal Tertentu', description: 'Pilih tanggal spesifik' },
    { id: 'date_range', label: 'Periode Tertentu', description: 'Pilih rentang tanggal' }
  ];

  const reportTypes = [
    {
      id: 'kualitas-telur',
      title: 'Laporan Kualitas Telur',
      description: 'Data lengkap kualitas telur berdasarkan hasil pemindaian',
      icon: 'egg',
      formats: ['pdf', 'excel', 'csv']
    },
    {
      id: 'statistik-produksi',
      title: 'Statistik Produksi',
      description: 'Laporan statistik produksi telur harian dan bulanan',
      icon: 'chart-bar',
      formats: ['pdf', 'excel']
    }
  ];

  // Load report history with force refresh option
  const loadReportHistory = async (forceRefresh = false) => {
    try {
      setLoading(true);
      // Add timestamp to prevent caching
      const timestamp = new Date().getTime();
      const response = await getReportHistory({ 
        limit: 10, 
        _t: timestamp,
        refresh: forceRefresh ? 'true' : 'false'
      });
      if (response.success) {
        setReportHistory(response.data.reports || []);
      }
    } catch (error) {
      console.error('Error loading report history:', error);
      setReportHistory([]);
    } finally {
      setLoading(false);
    }
  };

  // Force refresh report history
  const handleForceRefresh = async () => {
    await loadReportHistory(true);
    setSuccessMessage('Data riwayat laporan berhasil diperbarui');
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  // Handle report generation and download
  const handleGenerateReport = async (format) => {
    try {
      setIsGenerating(true);
      setError(null);
      setSuccessMessage(null);

      // Validate inputs based on selected period
      if (selectedPeriod === 'custom' && !selectedDate) {
        setError('Silakan pilih tanggal terlebih dahulu');
        return;
      }
      
      if (selectedPeriod === 'date_range') {
        // Validate date range
        if (!startDate || !endDate) {
          setError('Silakan pilih tanggal mulai dan tanggal akhir');
          return;
        }
        
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        if (start > end) {
          setError('Tanggal mulai tidak boleh lebih besar dari tanggal akhir');
          return;
        }
      }

      // Prepare request data based on selected period
      let requestData = {
        reportType: selectedReportType,
        period: selectedPeriod,
        format: format
      };
      
      // Add appropriate date parameters based on period type
      if (selectedPeriod === 'custom') {
        requestData.date = selectedDate;
      } else if (selectedPeriod === 'date_range') {
        requestData.startDate = startDate;
        requestData.endDate = endDate;
      }

      const result = await generateReport(
        selectedReportType,
        selectedPeriod,
        selectedPeriod === 'date_range' ? { startDate, endDate } : selectedDate,
        format
      );

      if (result.success) {
        setSuccessMessage(`Laporan ${format.toUpperCase()} berhasil diunduh`);
        // Reload report history to show the new report
        await loadReportHistory();
        
        // Clear success message after 5 seconds
        setTimeout(() => setSuccessMessage(null), 5000);
      }
    } catch (error) {
      console.error('Error generating report:', error);
      setError(error.message || 'Gagal mengunduh laporan. Silakan coba lagi.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle download of existing report
  const handleDownloadExisting = async (reportId) => {
    try {
      setError(null);
      const result = await downloadExistingReport(reportId);
      if (result.success) {
        setSuccessMessage('Laporan berhasil diunduh');
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } catch (error) {
      console.error('Error downloading existing report:', error);
      setError('Gagal mengunduh laporan. Silakan coba lagi.');
    }
  };

  // Handle toggling the dropdown menu
  const toggleDropdown = (reportId) => {
    if (openDropdownId === reportId) {
      setOpenDropdownId(null);
    } else {
      setOpenDropdownId(reportId);
    }
  };

  // Handle viewing file details
  const handleViewDetails = (report) => {
    // Close dropdown
    setOpenDropdownId(null);
    
    // Show file details in a modal or alert for now
    alert(`Detail Laporan:\n\nNama: ${report.report_name || getReportTypeDisplayName(report.report_type)}\nUkuran: ${formatFileSize(report.file_size || 0)}\nFormat: ${(report.file_format || report.format)?.toUpperCase()}\nDibuat: ${new Date(report.generated_at || report.created_at).toLocaleString('id-ID')}`);
    
    // In a real app, you might show a modal with more details
  };

  // Load report history on component mount
  useEffect(() => {
    loadReportHistory();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (openDropdownId !== null) {
        const ref = dropdownRefs.current[openDropdownId];
        if (ref && !ref.contains(event.target)) {
          setOpenDropdownId(null);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openDropdownId]);

  // Function to set dropdown ref
  const setDropdownRef = (id, el) => {
    dropdownRefs.current[id] = el;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Header Section with Gradient Background */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 dark:from-blue-700 dark:to-indigo-800 rounded-2xl mb-8 shadow-lg">
        <div className="px-8 py-10 text-white">
          <h1 className="text-3xl font-bold mb-2">Unduh Laporan</h1>
          <p className="text-blue-100">Unduh berbagai jenis laporan untuk analisis dan dokumentasi.</p>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded-xl mb-6">
          <div className="flex items-center">
            <i className="fas fa-exclamation-triangle mr-2"></i>
            <span>{error}</span>
            <button 
              onClick={() => setError(null)}
              className="ml-auto text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200"
            >
              <i className="fas fa-times"></i>
            </button>
          </div>
        </div>
      )}

      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-100 dark:bg-green-900 border border-green-400 dark:border-green-700 text-green-700 dark:text-green-300 px-4 py-3 rounded-xl mb-6">
          <div className="flex items-center">
            <i className="fas fa-check-circle mr-2"></i>
            <span>{successMessage}</span>
            <button 
              onClick={() => setSuccessMessage(null)}
              className="ml-auto text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-200"
            >
              <i className="fas fa-times"></i>
            </button>
          </div>
        </div>
      )}

      {/* Date Range Selector */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md mb-8 border border-gray-100 dark:border-gray-700">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-4">Pilih Periode Laporan</h2>
        
        {/* Period Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Periode</label>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {periodOptions.map((option) => (
              <button
                key={option.id}
                onClick={() => setSelectedPeriod(option.id)}
                className={`p-4 rounded-xl border-2 transition-all text-left ${
                  selectedPeriod === option.id
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                    : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:border-blue-300 dark:hover:border-blue-500'
                }`}
              >
                <div className="font-medium text-sm">{option.label}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{option.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Custom Date Input - Only show when custom is selected */}
        {selectedPeriod === 'custom' && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Pilih Tanggal</label>
            <div className="relative max-w-md">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <i className="far fa-calendar-alt text-gray-400 dark:text-gray-500"></i>
              </div>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        )}

        {/* Date Range Input - Only show when date_range is selected */}
        {selectedPeriod === 'date_range' && (
          <div className="mb-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tanggal Mulai</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <i className="far fa-calendar-alt text-gray-400 dark:text-gray-500"></i>
                  </div>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tanggal Akhir</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <i className="far fa-calendar-alt text-gray-400 dark:text-gray-500"></i>
                  </div>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Selected Period Info */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <i className="fas fa-info-circle text-blue-500 dark:text-blue-400"></i>
            <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
              Periode yang dipilih: {periodOptions.find(p => p.id === selectedPeriod)?.label}
            </span>
          </div>
          {selectedPeriod === 'custom' && (
            <div className="text-sm text-blue-600 dark:text-blue-400 mt-1">
              Tanggal: {new Date(selectedDate).toLocaleDateString('id-ID', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </div>
          )}
          {selectedPeriod === 'date_range' && (
            <div className="text-sm text-blue-600 dark:text-blue-400 mt-1">
              Dari: {new Date(startDate).toLocaleDateString('id-ID', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
              <br />
              Sampai: {new Date(endDate).toLocaleDateString('id-ID', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </div>
          )}
        </div>
      </div>

      {/* Report Types */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {reportTypes.map((report) => (
          <div 
            key={report.id}
            onClick={() => setSelectedReportType(report.id)}
            className={`p-6 rounded-2xl shadow-md border transition-all cursor-pointer ${
              selectedReportType === report.id 
                ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/30 transform scale-[1.02]' 
                : 'border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-blue-200 dark:hover:border-blue-600 hover:bg-blue-50/30 dark:hover:bg-blue-900/10'
            }`}
          >
            <div className="flex items-start">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mr-4 ${
                selectedReportType === report.id ? 'bg-blue-500 text-white' : 'bg-blue-100 dark:bg-blue-800 text-blue-500 dark:text-blue-300'
              }`}>
                <i className={`fas fa-${report.icon} text-xl`}></i>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-1">{report.title}</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">{report.description}</p>
                
                <div className="flex flex-wrap gap-2">
                  {report.formats.map((format) => (
                    <button
                      key={format}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleGenerateReport(format);
                      }}
                      disabled={isGenerating || (selectedPeriod === 'custom' && !selectedDate) || (selectedPeriod === 'date_range' && (!startDate || !endDate)) || selectedReportType !== report.id}
                      className={`px-4 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-all
                        ${isGenerating || selectedReportType !== report.id ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed' : 
                          format === 'pdf' ? 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-800' :
                          format === 'excel' ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-800' :
                          'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800'
                        }
                        ${((selectedPeriod === 'custom' && !selectedDate) || (selectedPeriod === 'date_range' && (!startDate || !endDate)) || selectedReportType !== report.id) ? 'opacity-50 cursor-not-allowed' : ''}
                      `}
                    >
                      {isGenerating ? (
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current"></div>
                      ) : (
                        <i className={`fas fa-${
                          format === 'pdf' ? 'file-pdf' :
                          format === 'excel' ? 'file-excel' :
                          'file-csv'
                        }`}></i>
                      )}
                      <span className="uppercase">{format}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Downloads */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md border border-gray-100 dark:border-gray-700">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Unduhan Terakhir</h2>
          <button 
            onClick={handleForceRefresh}
            disabled={loading}
            className="bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white p-2 rounded-lg transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            title="Refresh Riwayat"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <i className="fas fa-sync-alt"></i>
            )}
          </button>
        </div>
        
        {loading && reportHistory.length === 0 ? (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <span className="ml-3 text-gray-600 dark:text-gray-300">Memuat riwayat unduhan...</span>
          </div>
        ) : reportHistory.length === 0 ? (
          <div className="text-center py-12">
            <i className="fas fa-download text-4xl text-gray-300 dark:text-gray-600 mb-4"></i>
            <p className="text-gray-500 dark:text-gray-400 text-lg">Belum ada riwayat unduhan</p>
            <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">Unduh laporan pertama Anda untuk melihat riwayat di sini</p>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-6">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Nama Laporan</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden md:table-cell">Periode</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Format</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden sm:table-cell">Ukuran</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden md:table-cell">Tanggal</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden lg:table-cell">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Aksi</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {reportHistory.map((report, index) => (
                  <tr key={report.id || index} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                      {report.report_name ? 
                        report.report_name.split(' - ')[0] || getReportTypeDisplayName(report.report_type) :
                        getReportTypeDisplayName(report.report_type)
                      }
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 hidden md:table-cell">
                      {report.report_name ? 
                        report.report_name.split(' - ').slice(1).join(' - ') || 'Hari Ini' : 
                        formatPeriodForDisplay(report.period, report.date)
                      }
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        report.file_format === 'pdf' ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200' :
                        report.file_format === 'excel' ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' :
                        'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
                      }`}>
                        {(report.file_format || report.format)?.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 hidden sm:table-cell">
                      {formatFileSize(report.file_size || 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 hidden md:table-cell">
                      {new Date(report.generated_at || report.created_at).toLocaleDateString('id-ID')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm hidden lg:table-cell">
                      <span className="flex items-center gap-1.5">
                        <i className="fas fa-check-circle text-green-500 dark:text-green-400"></i>
                        <span className="text-gray-600 dark:text-gray-300">
                          Terunduh
                        </span>
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div 
                        className="relative" 
                        ref={(el) => setDropdownRef(report.id || report.report_id || index, el)}
                      >
                        <button 
                          onClick={() => toggleDropdown(report.id || report.report_id || index)}
                          className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 focus:outline-none"
                        >
                          <i className="fas fa-ellipsis-v"></i>
                        </button>
                        
                        {openDropdownId === (report.id || report.report_id || index) && (
                          <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-700 rounded-md shadow-lg z-10 border border-gray-200 dark:border-gray-600">
                            <div className="py-1">
                              <button
                                onClick={() => handleViewDetails(report)}
                                className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600"
                              >
                                <i className="fas fa-info-circle mr-2"></i>
                                Lihat Detail
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default UnduhLaporan; 