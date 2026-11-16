import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import newLogo from '../assets/logo.png';

const Sidebar = ({ isOpen, onClose, collapsed }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isSuperAdmin, logout } = useAuth();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const menuItems = [
    {
      path: '/dashboard',
      name: 'Dashboard',
      icon: 'fas fa-tachometer-alt',
      requiredRole: null
    },
    {
      path: '/data-kualitas-telur',
      name: 'Data Kualitas Telur',
      icon: 'fas fa-egg',
      requiredRole: null
    },
    {
      path: '/data-kelembapan-suhu-amonia',
      name: 'Data Kelembapan, Suhu, dan Amonia',
      icon: 'fas fa-thermometer-half',
      requiredRole: null
    },
    {
      path: '/unduh-laporan',
      name: 'Unduh Laporan',
      icon: 'fas fa-download',
      requiredRole: null
    },
    {
      path: '/manajemen-akun',
      name: 'Manajemen Akun',
      icon: 'fas fa-users-cog',
      requiredRole: 'superadmin',
      superAdminOnly: true
    },
    {
      path: '/pengaturan',
      name: 'Pengaturan',
      icon: 'fas fa-cog',
      requiredRole: null
    }
  ];

  const handleLogout = () => {
    logout();
    setShowLogoutModal(false);
  };

  const goToSettings = () => {
    navigate('/pengaturan');
    onClose();
  };

  // Filter menu items based on user role
  const filteredMenuItems = menuItems.filter(item => {
    if (item.superAdminOnly && !isSuperAdmin()) {
      return false;
    }
    return true;
  });

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        ></div>
      )}

      {/* Sidebar */}
      <div className={`fixed left-0 top-0 h-full ${collapsed ? 'lg:w-20' : 'lg:w-64'} w-64 bg-[#1e1b4b] dark:bg-[#0f0d2e] shadow-lg transform transition-all duration-300 ease-in-out z-50 ${isOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 lg:static lg:z-auto border-r border-indigo-900/50 dark:border-indigo-950 flex flex-col`}>

        {/* Header with Logo — tinggi diselaraskan dengan top bar di Layout (h-20) */}
        <div className="h-20 px-4 flex items-center justify-between border-b border-indigo-900 dark:border-indigo-950 bg-gradient-to-br from-[#1e1b4b] to-[#252262] dark:from-[#0f0d2e] dark:to-[#1a1750] shrink-0 overflow-hidden">
          <div className="flex-1 flex justify-center items-center">
            <div className="h-12 w-auto flex items-center justify-center">
              <img
                src={newLogo}
                alt="GardaOva Logo"
                className={`h-full w-auto object-contain transition-all duration-300 ${collapsed ? 'max-w-[40px]' : ''}`}
              />
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden text-white hover:text-gray-200 p-1 rounded-lg hover:bg-indigo-800 dark:hover:bg-indigo-900 transition-colors"
          >
            <i className="fas fa-times text-lg"></i>
          </button>
        </div>

        {/* User Info */}
        <div className={`px-4 py-3 border-b border-indigo-800/50 dark:border-indigo-900 bg-[#1e1b4b] dark:bg-[#0f0d2e] transition-all ${collapsed ? 'lg:px-2' : ''}`}>
          <div className={`flex items-center ${collapsed ? 'lg:justify-center' : ''}`}>
            <div
              onClick={goToSettings}
              className="w-10 h-10 shrink-0 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-medium overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
              title={collapsed ? `${user?.name} (${user?.role})` : 'Edit Profile'}
            >
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                user?.name?.charAt(0)?.toUpperCase() || 'U'
              )}
            </div>
            {!collapsed && (
              <div className="ml-3 truncate">
                <p className="text-sm font-medium text-white truncate">{user?.name}</p>
                <p className="text-xs text-indigo-200 capitalize truncate">{user?.role}</p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 overflow-y-auto overflow-x-hidden">
          {!collapsed && (
            <div className="text-xs font-semibold text-indigo-400 dark:text-indigo-500 uppercase tracking-wider mb-2 px-3">
              Menu Utama
            </div>
          )}
          <ul className="space-y-1">
            {filteredMenuItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    onClick={onClose}
                    title={collapsed ? item.name : ''}
                    className={`flex items-center ${collapsed ? 'lg:justify-center lg:px-2' : 'px-3'} py-2.5 rounded-lg transition-all duration-200 group focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 btn-press ripple-effect ${isActive
                      ? 'bg-white dark:bg-white/10 text-[#1e1b4b] dark:text-white font-semibold shadow-sm border-r-0'
                      : 'text-indigo-200/80 dark:text-indigo-300/70 hover:bg-white/10 dark:hover:bg-white/5 hover:text-white dark:hover:text-white'
                      }`}
                  >
                    <i className={`${item.icon} w-5 text-center shrink-0 transition-colors ${collapsed ? 'lg:mr-0 mr-3' : 'mr-3'} ${isActive ? 'text-[#1e1b4b] dark:text-white' : 'text-indigo-400 dark:text-indigo-500 group-hover:text-white dark:group-hover:text-white'
                      }`}></i>
                    {!collapsed && (
                      <>
                        <span className="font-medium text-sm leading-normal truncate">{item.name}</span>
                        {item.superAdminOnly && (
                          <span className="ml-auto text-xs bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300 px-2 py-1 rounded-full shrink-0">
                            Super
                          </span>
                        )}
                      </>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Logout Button */}
        <div className={`p-3 border-t border-indigo-800/50 dark:border-indigo-900 bg-indigo-950/50 dark:bg-indigo-950/70 ${collapsed ? 'lg:px-2' : ''}`}>
          {!collapsed && (
            <div className="text-xs font-semibold text-indigo-400 dark:text-indigo-500 uppercase tracking-wider mb-2 px-3">
              Akun
            </div>
          )}
          <button
            onClick={() => setShowLogoutModal(true)}
            title={collapsed ? 'Logout' : ''}
            className={`w-full flex items-center ${collapsed ? 'lg:justify-center lg:px-2' : 'px-3'} py-2.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 btn-press`}
          >
            <i className={`fas fa-sign-out-alt w-5 text-center shrink-0 ${collapsed ? 'lg:mr-0 mr-3' : 'mr-3'}`}></i>
            {!collapsed && <span className="font-medium text-sm leading-normal">Logout</span>}
          </button>
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-sm w-full border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="bg-blue-50 dark:bg-blue-900/20 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Konfirmasi Logout</h3>
            </div>
            <div className="p-6">
              <p className="text-gray-600 dark:text-gray-300 mb-6">Apakah Anda yakin ingin keluar dari akun Anda?</p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowLogoutModal(false)}
                  className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800 text-white rounded-lg transition-colors"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar; 