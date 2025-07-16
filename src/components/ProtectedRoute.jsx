import { useAuth } from '../contexts/AuthContext';
import { Navigate, useLocation } from 'react-router-dom';

const ProtectedRoute = ({ children, requiredRole = null }) => {
  const { user, loading, hasPermission } = useAuth();
  const location = useLocation();

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Memuat...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check role-based permissions
  if (requiredRole && !hasPermission(requiredRole)) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center border border-gray-100 dark:border-gray-700">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="fas fa-exclamation-triangle text-red-600 dark:text-red-400 text-2xl"></i>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Akses Ditolak
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Anda tidak memiliki izin untuk mengakses halaman ini.
          </p>
          <div className="space-y-2 text-sm text-gray-500 dark:text-gray-400">
            <p>Role Anda: <span className="font-medium text-blue-600 dark:text-blue-400">{user.role}</span></p>
            <p>Role yang diperlukan: <span className="font-medium text-red-600 dark:text-red-400">{requiredRole}</span></p>
          </div>
          <button
            onClick={() => window.history.back()}
            className="mt-6 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Kembali
          </button>
        </div>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute; 