import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import newLogo from '../assets/logo.png';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const { resetPassword } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();

  // Redirect if token is missing
  useEffect(() => {
    if (!token) {
      setErrors({ general: 'Token reset password tidak ditemukan. Silakan minta link baru.' });
    }
  }, [token]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
    if (errors.general) {
      setErrors(prev => ({
        ...prev,
        general: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.newPassword) {
      newErrors.newPassword = 'Password baru harus diisi';
    } else if (formData.newPassword.length < 6) {
      newErrors.newPassword = 'Password minimal 6 karakter';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Konfirmasi password harus diisi';
    } else if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Konfirmasi password tidak cocok';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!token) {
      setErrors({ general: 'Token tidak valid. Silakan minta link baru.' });
      return;
    }

    if (!validateForm()) return;

    setLoading(true);
    setSuccess('');

    try {
      const result = await resetPassword(token, formData.newPassword, formData.confirmPassword);

      if (result.success) {
        setSuccess(result.message || 'Password Anda berhasil diubah! Silakan login.');
        setFormData({ newPassword: '', confirmPassword: '' });
      } else {
        setErrors({ general: result.message || 'Gagal mengubah password. Token mungkin tidak valid atau sudah kadaluarsa.' });
      }
    } catch (err) {
      setErrors({ general: 'Terjadi kesalahan saat memproses permintaan.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-r from-amber-600/20 to-amber-700/20 dark:from-amber-900/20 dark:to-amber-950/20 transform -skew-y-6 -translate-y-24 z-0"></div>
      <div className="absolute bottom-0 right-0 w-full h-64 bg-gradient-to-l from-amber-600/20 to-amber-700/20 dark:from-amber-900/20 dark:to-amber-950/20 transform skew-y-6 translate-y-24 z-0"></div>

      <div className="max-w-md w-full z-10 animate-fade-in-scale">
        {/* Theme Toggle Button */}
        <div className="flex justify-end mb-6 animate-fade-in-scale delay-75">
          <button
            onClick={toggleTheme}
            className="p-3 rounded-full bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all duration-200 btn-press ripple-effect"
            title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDarkMode ? (
              <i className="fas fa-sun text-yellow-500 text-xl animate-float"></i>
            ) : (
              <i className="fas fa-moon text-gray-600 text-xl animate-float"></i>
            )}
          </button>
        </div>

        {/* Logo */}
        <div className="text-center mb-8 animate-fade-in-up delay-100">
          <div className="mx-auto bg-gradient-to-br from-amber-700 to-amber-800 dark:from-amber-800 dark:to-amber-900 p-5 rounded-xl shadow-lg w-full max-w-sm transform hover:scale-[1.01] transition-transform duration-300">
            <div className="flex justify-center">
              <div className="w-64 h-16">
                <img
                  src={newLogo}
                  alt="Smarternak Logo"
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Form Container */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-100 dark:border-gray-700 backdrop-blur-sm hover:shadow-2xl transition-all duration-300 animate-fade-in-up delay-150">
          <div className="mb-7 text-center">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">Reset Password</h2>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Buat password baru yang aman untuk akun Anda.
            </p>
          </div>

          {errors.general && (
            <div className="mb-5 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg animate-fadeIn">
              <div className="flex items-center">
                <i className="fas fa-exclamation-circle text-red-500 mr-2"></i>
                <span className="text-red-700 dark:text-red-400 text-sm">{errors.general}</span>
              </div>
              {!token && (
                <div className="mt-3 text-center">
                  <Link
                    to="/forgot-password"
                    className="text-xs text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 hover:underline font-semibold"
                  >
                    Minta link baru
                  </Link>
                </div>
              )}
            </div>
          )}

          {success ? (
            <div className="space-y-6">
              <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg animate-fadeIn text-center">
                <div className="flex justify-center mb-3">
                  <div className="bg-green-100 dark:bg-green-950 p-3 rounded-full">
                    <i className="fas fa-check text-green-600 dark:text-green-400 text-2xl animate-pulse"></i>
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-green-800 dark:text-green-300 mb-2">Berhasil!</h3>
                <p className="text-green-700 dark:text-green-400 text-sm leading-relaxed">
                  {success}
                </p>
              </div>

              <Link
                to="/login"
                className="w-full block text-center bg-gradient-to-br from-amber-700 to-amber-800 dark:from-amber-800 dark:to-amber-900 text-white py-3 px-4 rounded-lg font-medium hover:from-amber-800 hover:to-amber-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 transition-all duration-200 shadow-lg hover:shadow-xl btn-press ripple-effect"
              >
                <i className="fas fa-sign-in-alt mr-2"></i> Masuk Sekarang
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* New Password Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Password Baru
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <i className="fas fa-lock text-amber-600 dark:text-amber-400"></i>
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="newPassword"
                    value={formData.newPassword}
                    onChange={handleChange}
                    className={`w-full pl-10 pr-12 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all input-glow ${
                      errors.newPassword
                        ? 'border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/20'
                        : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700'
                    } text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400`}
                    placeholder="Masukkan password baru"
                    disabled={!token}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-amber-500 dark:text-amber-400 hover:text-amber-600 dark:hover:text-amber-300 transition-colors"
                  >
                    <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                  </button>
                </div>
                {errors.newPassword && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400 animate-fadeIn">{errors.newPassword}</p>
                )}
              </div>

              {/* Confirm Password Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Konfirmasi Password Baru
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <i className="fas fa-lock text-amber-600 dark:text-amber-400"></i>
                  </div>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className={`w-full pl-10 pr-12 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all input-glow ${
                      errors.confirmPassword
                        ? 'border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/20'
                        : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700'
                    } text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400`}
                    placeholder="Ulangi password baru"
                    disabled={!token}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-amber-500 dark:text-amber-400 hover:text-amber-600 dark:hover:text-amber-300 transition-colors"
                  >
                    <i className={`fas ${showConfirmPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400 animate-fadeIn">{errors.confirmPassword}</p>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || !token}
                className="w-full bg-gradient-to-br from-amber-700 to-amber-800 dark:from-amber-800 dark:to-amber-900 text-white py-3 px-4 rounded-lg font-medium hover:from-amber-800 hover:to-amber-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl btn-press ripple-effect"
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Menyimpan Password...
                  </div>
                ) : (
                  <div className="flex items-center justify-center">
                    <i className="fas fa-save mr-2"></i>
                    Simpan Password
                  </div>
                )}
              </button>

              <div className="text-center mt-4">
                <Link
                  to="/forgot-password"
                  className="text-sm text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 hover:underline transition-colors inline-flex items-center"
                >
                  <i className="fas fa-arrow-left mr-1.5 text-xs"></i>
                  Minta link reset baru
                </Link>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-8 animate-fade-in-up delay-200">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            © 2024 Smarternak. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
