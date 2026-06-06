import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Link } from 'react-router-dom';
import newLogo from '../assets/logo.png';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const { forgotPassword } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();

  const handleEmailChange = (e) => {
    setEmail(e.target.value);
    if (error) setError('');
  };

  const validateForm = () => {
    if (!email) {
      setError('Email harus diisi');
      return false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Format email tidak valid');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const result = await forgotPassword(email);

      if (result.success) {
        setSuccess(result.message || 'Link reset password telah dikirim ke email Anda. Silakan periksa inbox atau spam folder Anda.');
      } else {
        setError(result.message || 'Gagal memproses permintaan reset password.');
      }
    } catch (err) {
      setError('Terjadi kesalahan saat memproses permintaan.');
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
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">Lupa Password</h2>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Masukkan alamat email Anda untuk mendapatkan link reset password.
            </p>
          </div>

          {error && (
            <div className="mb-5 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg animate-fadeIn">
              <div className="flex items-center">
                <i className="fas fa-exclamation-circle text-red-500 mr-2"></i>
                <span className="text-red-700 dark:text-red-400 text-sm">{error}</span>
              </div>
            </div>
          )}

          {success ? (
            <div className="space-y-6">
              <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg animate-fadeIn text-center">
                <div className="flex justify-center mb-3">
                  <div className="bg-green-100 dark:bg-green-950 p-3 rounded-full">
                    <i className="fas fa-paper-plane text-green-600 dark:text-green-400 text-2xl animate-pulse"></i>
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-green-800 dark:text-green-300 mb-2">Email Terkirim!</h3>
                <p className="text-green-700 dark:text-green-400 text-sm leading-relaxed">
                  {success}
                </p>
              </div>

              <Link
                to="/login"
                className="w-full block text-center bg-gradient-to-br from-amber-700 to-amber-800 dark:from-amber-800 dark:to-amber-900 text-white py-3 px-4 rounded-lg font-medium hover:from-amber-800 hover:to-amber-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 transition-all duration-200 shadow-lg hover:shadow-xl btn-press ripple-effect"
              >
                <i className="fas fa-arrow-left mr-2"></i> Kembali ke Login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <i className="fas fa-envelope text-amber-600 dark:text-amber-400"></i>
                  </div>
                  <input
                    type="email"
                    name="email"
                    value={email}
                    onChange={handleEmailChange}
                    className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all input-glow ${
                      error
                        ? 'border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/20'
                        : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700'
                    } text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400`}
                    placeholder="Masukkan email terdaftar Anda"
                  />
                </div>
                {error && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400 animate-fadeIn">{error}</p>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-br from-amber-700 to-amber-800 dark:from-amber-800 dark:to-amber-900 text-white py-3 px-4 rounded-lg font-medium hover:from-amber-800 hover:to-amber-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl btn-press ripple-effect"
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Mengirim Link...
                  </div>
                ) : (
                  <div className="flex items-center justify-center">
                    <i className="fas fa-paper-plane mr-2"></i>
                    Kirim Link Reset
                  </div>
                )}
              </button>

              <div className="text-center mt-4">
                <Link
                  to="/login"
                  className="text-sm text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 hover:underline transition-colors inline-flex items-center"
                >
                  <i className="fas fa-arrow-left mr-1.5 text-xs"></i>
                  Kembali ke Login
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

export default ForgotPassword;
