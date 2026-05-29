import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import newLogo from '../assets/logo.png';
import smarternakLogo from '../assets/smarternak.png';

const Sidebar = ({ isOpen, onClose }) => {
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
      <div className={`fixed left-0 top-0 h-full w-64 bg-white dark:bg-gray-800 shadow-lg transform transition-transform duration-300 ease-in-out z-50 ${isOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 lg:static lg:z-auto border-r border-gray-200 dark:border-gray-700`}>

        {/* Header with Logo */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-br from-amber-700 to-amber-800 dark:from-amber-800 dark:to-amber-900">
          <div className="flex items-center justify-between">
            <div className="flex-1 flex justify-center">
              <div className="w-48 h-12">
                <img
                  src={newLogo}
                  alt="Smarternak Logo"
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
            <button
              onClick={onClose}
              className="lg:hidden text-white hover:text-gray-200 p-1 rounded-lg hover:bg-amber-800 dark:hover:bg-amber-900 transition-colors"
            >
              <i className="fas fa-times text-lg"></i>
            </button>
          </div>
        </div>

        {/* User Info */}
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="flex items-center">
            <div
              onClick={goToSettings}
              className="w-10 h-10 bg-gradient-to-r from-amber-500 to-amber-600 rounded-full flex items-center justify-center text-white font-medium overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
              title="Edit Profile"
            >
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                user?.name?.charAt(0)?.toUpperCase() || 'U'
              )}
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900 dark:text-white">{user?.name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{user?.role}</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3">
          <div className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 px-3">
            Menu Utama
          </div>
          <ul className="space-y-1">
            {filteredMenuItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    onClick={onClose}
                    className={`flex items-center px-3 py-2.5 rounded-lg transition-all duration-200 group ${isActive
                      ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-r-2 border-amber-600 dark:border-amber-400'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-amber-600 dark:hover:text-amber-400'
                      }`}
                  >
                    <i className={`${item.icon} w-5 text-center mr-3 ${isActive ? 'text-amber-600 dark:text-amber-400' : 'text-gray-400 dark:text-gray-500 group-hover:text-amber-600 dark:group-hover:text-amber-400'
                      }`}></i>
                    <span className="font-medium">{item.name}</span>
                    {item.superAdminOnly && (
                      <span className="ml-auto text-xs bg-amber-100 dark:bg-amber-900 text-amber-600 dark:text-amber-300 px-2 py-1 rounded-full">
                        Super
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Logout Button */}
        <div className="p-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <div className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 px-3">
            Akun
          </div>
          <button
            onClick={() => setShowLogoutModal(true)}
            className="w-full flex items-center px-3 py-2.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors duration-200"
          >
            <i className="fas fa-sign-out-alt w-5 text-center mr-3"></i>
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-sm w-full border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="bg-amber-50 dark:bg-amber-900/20 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
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