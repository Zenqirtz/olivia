import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import logo2 from '../assets/logo2.png';

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
      name: 'Data Sensor',
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
      <div className={`fixed left-0 top-0 h-full ${collapsed ? 'lg:w-20' : 'lg:w-64'} w-64 bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg transform transition-all duration-300 ease-in-out z-50 ${isOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 lg:static lg:z-auto border-r border-white/20 flex flex-col`}>

        {/* Header with Logo — tinggi diselaraskan dengan top bar di Layout (h-20) */}
        <div className="h-20 px-4 flex items-center justify-between border-b border-white/20 bg-white/5 shrink-0 overflow-hidden">
          <div className={`flex-1 flex items-center ${collapsed ? 'justify-center' : 'justify-start gap-3 pl-2'}`}>
            <div className="h-11 w-11 flex items-center justify-center shrink-0">
              <img
                src={logo2}
                alt="GardaOva Logo"
                className="h-full w-auto object-contain transition-all duration-300"
              />
            </div>
            {!collapsed && (
              <span className="text-xl font-extrabold tracking-wider text-white select-none">
                GardaOva
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="lg:hidden text-white hover:text-gray-200 p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          >
            <i className="fas fa-times text-lg"></i>
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 overflow-y-auto overflow-x-hidden">
          {!collapsed && (
            <div className="text-xs font-bold text-white uppercase tracking-wider mb-2 px-3">
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
                    className={`flex items-center ${collapsed ? 'lg:justify-center lg:px-2' : 'px-3'} py-2.5 rounded-lg transition-all duration-200 group focus:outline-none focus-visible:ring-2 focus-visible:ring-white btn-press ripple-effect ${isActive
                      ? 'bg-white text-blue-600 font-semibold shadow-md border-r-0'
                      : 'text-white hover:bg-white/15 hover:text-white'
                      }`}
                  >
                    <i className={`${item.icon} w-5 text-center shrink-0 transition-colors ${collapsed ? 'lg:mr-0 mr-3' : 'mr-3'} ${isActive ? 'text-blue-600' : 'text-white'
                      }`}></i>
                    {!collapsed && (
                      <>
                        <span className={`font-medium text-sm leading-normal truncate ${isActive ? 'text-blue-600 font-semibold' : 'text-white'}`}>{item.name}</span>
                        {item.superAdminOnly && (
                          <span className={`ml-auto text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${isActive ? 'bg-blue-100 text-blue-700' : 'bg-white/25 text-white'}`}>
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

        {/* Footer: User Profile + Logout */}
        <div className={`p-3 border-t border-white/20 bg-white/5 space-y-2 shrink-0 ${collapsed ? 'lg:px-2' : ''}`}>
          {/* User Info */}
          <div
            onClick={goToSettings}
            className={`flex items-center p-2 rounded-xl hover:bg-white/10 cursor-pointer transition-colors ${collapsed ? 'lg:justify-center' : ''}`}
            title={collapsed ? `${user?.name} (${user?.role})` : 'Edit Profil'}
          >
            <div className="w-10 h-10 shrink-0 bg-white/20 border border-white/30 rounded-full flex items-center justify-center text-white font-medium overflow-hidden">
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                user?.name?.charAt(0)?.toUpperCase() || 'U'
              )}
            </div>
            {!collapsed && (
              <div className="ml-3 truncate flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{user?.name}</p>
                <p className="text-xs text-white/80 capitalize truncate">{user?.role}</p>
              </div>
            )}
          </div>

          {/* Logout Button */}
          <button
            onClick={() => setShowLogoutModal(true)}
            title={collapsed ? 'Logout' : ''}
            className={`w-full flex items-center ${collapsed ? 'lg:justify-center lg:px-2' : 'px-3'} py-2.5 text-white hover:bg-white/15 rounded-lg transition-colors duration-200 group focus:outline-none focus-visible:ring-2 focus-visible:ring-white btn-press`}
          >
            <i className={`fas fa-sign-out-alt w-5 text-center shrink-0 text-white ${collapsed ? 'lg:mr-0 mr-3' : 'mr-3'}`}></i>
            {!collapsed && <span className="font-medium text-sm leading-normal text-white">Logout</span>}
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