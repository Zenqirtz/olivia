import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import DataKualitasTelur from './pages/DataKualitasTelur';
import UnduhLaporan from './pages/UnduhLaporan';
import ManajemenAkun from './pages/ManajemenAkun';
import Pengaturan from './pages/Pengaturan';

// Component to handle authenticated routes
const AuthenticatedApp = () => {
  const { user } = useAuth();

  return (
    <Routes>
      {/* Redirect root to dashboard if authenticated */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      
      {/* Protected Routes */}
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <Layout>
            <Dashboard />
          </Layout>
        </ProtectedRoute>
      } />
      
      <Route path="/data-kualitas-telur" element={
        <ProtectedRoute>
          <Layout>
            <DataKualitasTelur />
          </Layout>
        </ProtectedRoute>
      } />
      
      <Route path="/unduh-laporan" element={
        <ProtectedRoute>
          <Layout>
            <UnduhLaporan />
          </Layout>
        </ProtectedRoute>
      } />
      
      <Route path="/manajemen-akun" element={
        <ProtectedRoute requiredRole="superadmin">
          <Layout>
            <ManajemenAkun />
          </Layout>
        </ProtectedRoute>
      } />
      
      <Route path="/pengaturan" element={
        <ProtectedRoute>
          <Layout>
            <Pengaturan />
          </Layout>
        </ProtectedRoute>
      } />

      {/* Redirect to login if accessing login while authenticated */}
      <Route path="/login" element={<Navigate to="/dashboard" replace />} />
      
      {/* Catch all route */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

// Component to handle unauthenticated routes
const UnauthenticatedApp = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};

// Main App Router
const AppRouter = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Memuat aplikasi...</p>
        </div>
      </div>
    );
  }

  return user ? <AuthenticatedApp /> : <UnauthenticatedApp />;
};

function App() {
  return (
    <Router>
      <ThemeProvider>
        <AuthProvider>
          <AppRouter />
        </AuthProvider>
      </ThemeProvider>
    </Router>
  );
}

export default App;
