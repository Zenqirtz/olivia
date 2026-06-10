import { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import AiChat from './AiChat';
import sensorService from '../services/sensorService';

const Layout = ({ children }) => {
  const { isDarkMode, toggleTheme } = useTheme();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [latestSensor, setLatestSensor] = useState(null);
  const [hasNotified, setHasNotified] = useState(false);

  useEffect(() => {
    const fetchLatestSensor = async () => {
      try {
        const response = await sensorService.getLatestSensorReading();
        if (response.success && response.data.latest) {
          setLatestSensor(response.data.latest);
        }
      } catch (error) {
        console.error('Error fetching latest sensor reading for notification:', error);
      }
    };

    fetchLatestSensor();
    const interval = setInterval(fetchLatestSensor, 5000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (latestSensor && latestSensor.ammonia > 20) {
      if (!hasNotified) {
        if ('Notification' in window) {
          if (Notification.permission === 'granted') {
            new Notification('⚠️ Peringatan Kadar Amonia Tinggi!', {
              body: `Kadar amonia kandang saat ini mencapai ${latestSensor.ammonia} ppm (melebihi batas aman 20 ppm).`,
            });
            setHasNotified(true);
          } else if (Notification.permission !== 'denied') {
            Notification.requestPermission().then(permission => {
              if (permission === 'granted') {
                new Notification('⚠️ Peringatan Kadar Amonia Tinggi!', {
                  body: `Kadar amonia kandang saat ini mencapai ${latestSensor.ammonia} ppm (melebihi batas aman 20 ppm).`,
                });
                setHasNotified(true);
              }
            });
          }
        }
      }
    } else {
      setHasNotified(false);
    }
  }, [latestSensor, hasNotified]);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  const goToSettings = () => {
    navigate('/pengaturan');
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />
      
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-0">
        {/* Sticky Header Block */}
        <div className="sticky top-0 z-30 flex flex-col">
          {/* Top Bar — h-20 diselaraskan dengan header sidebar */}
          <div className="h-20 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 md:px-6 flex items-center">
            <div className="flex items-center justify-between w-full">
              {/* Mobile menu button */}
              <button
                onClick={toggleSidebar}
                className="lg:hidden p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                <i className="fas fa-bars text-gray-600 dark:text-gray-300"></i>
              </button>

              {/* Page title for mobile */}
              <div className="lg:hidden">
                <h1 className="text-lg font-semibold text-gray-900 dark:text-white">GardaOva</h1>
              </div>

              {/* Right side controls */}
              <div className="flex items-center gap-3 ml-auto">
                {/* Theme toggle */}
                <button
                  onClick={toggleTheme}
                  className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                >
                  {isDarkMode ? (
                    <i className="fas fa-sun text-yellow-500 text-lg"></i>
                  ) : (
                    <i className="fas fa-moon text-gray-600 text-lg"></i>
                  )}
                </button>

                {/* User info (hidden on mobile) */}
                <div className="hidden md:flex items-center gap-3 ml-2">
                  <div 
                    onClick={goToSettings} 
                    className="w-8 h-8 bg-gradient-to-r from-amber-500 to-amber-600 rounded-full flex items-center justify-center text-white font-medium text-sm overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                    title="Pengaturan Profil"
                  >
                    {user?.avatar_url ? (
                      <img src={user.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      user?.name?.charAt(0)?.toUpperCase() || 'U'
                    )}
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{user?.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{user?.role}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Alert Banner — hanya muncul jika amonia > 20 ppm */}
          {latestSensor && latestSensor.ammonia > 20 && (
            <div className="relative overflow-hidden bg-gradient-to-r from-red-600 via-red-500 to-orange-500 dark:from-red-800 dark:via-red-700 dark:to-orange-700 px-4 md:px-6 py-2.5 flex items-center gap-3 shadow-sm">
              {/* Animated shimmer layer */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-[shimmer_2s_linear_infinite] bg-[length:200%_100%] pointer-events-none" />

              {/* Icon */}
              <div className="shrink-0 flex items-center justify-center w-7 h-7 bg-white/20 rounded-full">
                <i className="fas fa-exclamation-triangle text-sm text-white animate-bounce"></i>
              </div>

              {/* Message */}
              <p className="text-white text-sm leading-snug flex-1 min-w-0">
                <span className="font-bold">Peringatan Kritis: </span>
                Kadar amonia tinggi terdeteksi di kandang&nbsp;
                <span className="inline-flex items-center gap-1 font-extrabold bg-white/20 rounded-md px-1.5 py-0.5 text-xs">
                  <i className="fas fa-wind text-xs"></i>
                  {latestSensor.ammonia} ppm
                </span>
                . Batas aman 20 ppm — segera periksa ventilasi!
              </p>

              {/* Live badge */}
              <div className="shrink-0 hidden sm:flex items-center gap-1.5 bg-white/20 rounded-full px-2.5 py-1 text-white text-xs font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse inline-block"></span>
                LIVE
              </div>
            </div>
          )}
        </div>
        
        {/* Main content */}
        <div className="flex-1 overflow-auto">
          <div className="p-4 md:p-6">
            {children}
          </div>
        </div>
      </div>
      <AiChat />
    </div>
  );
};

export default Layout; 