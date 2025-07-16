import { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';

const Pengaturan = () => {
  const { isDarkMode, toggleTheme } = useTheme();
  const { user, updateProfile, changePassword } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isAvatarLoading, setIsAvatarLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    phone: '',
    role: '',
    avatar_url: null,
    bio: ''
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [passwordErrors, setPasswordErrors] = useState({});
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState({ type: '', text: '' });
  const [showPasswords, setShowPasswords] = useState({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false
  });

  const [securitySettings, setSecuritySettings] = useState({
    twoFactor: false,
    loginNotifications: true,
    sessionTimeout: '30',
    passwordLastChanged: '2023-05-15'
  });

  const tabs = [
    { id: 'profile', label: 'Profil', icon: 'user' },
    { id: 'account', label: 'Akun', icon: 'cog' }
  ];

  // Load user data when component mounts or user changes
  useEffect(() => {
    if (user) {
      setProfileData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        role: user.role || '',
        avatar_url: user.avatar_url || null,
        bio: user.bio || ''
      });
    }
  }, [user]);

  // Reset message states when switching tabs
  useEffect(() => {
    // Reset any error/success messages when switching tabs
    setMessage({ type: '', text: '' });
    setPasswordMessage({ type: '', text: '' });
    setPasswordErrors({});
  }, [activeTab]);

  // Handle password input changes
  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear error when user starts typing
    if (passwordErrors[name]) {
      setPasswordErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  // Validate password form
  const validatePasswordForm = () => {
    const errors = {};
    
    if (!passwordData.currentPassword) {
      errors.currentPassword = 'Password lama harus diisi';
    }
    
    if (!passwordData.newPassword) {
      errors.newPassword = 'Password baru harus diisi';
    } else if (passwordData.newPassword.length < 6) {
      errors.newPassword = 'Password baru minimal 6 karakter';
    } else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(passwordData.newPassword)) {
      errors.newPassword = 'Password harus mengandung huruf kecil, huruf besar, dan angka';
    }
    
    if (!passwordData.confirmPassword) {
      errors.confirmPassword = 'Konfirmasi password harus diisi';
    } else if (passwordData.newPassword !== passwordData.confirmPassword) {
      errors.confirmPassword = 'Konfirmasi password tidak cocok';
    }
    
    setPasswordErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle password update
  const handleUpdatePassword = async () => {
    if (!validatePasswordForm()) return;
    
    try {
      setIsUpdatingPassword(true);
      setPasswordMessage({ type: '', text: '' });
      
      const result = await changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
        confirmPassword: passwordData.confirmPassword
      });
      
      if (result.success) {
        setPasswordMessage({ 
          type: 'success', 
          text: 'Password berhasil diperbarui' 
        });
        
        // Reset form
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
      } else {
        setPasswordMessage({ 
          type: 'error', 
          text: result.message || 'Gagal memperbarui password' 
        });
      }
    } catch (error) {
      console.error('Password update error:', error);
      setPasswordMessage({ 
        type: 'error', 
        text: 'Terjadi kesalahan saat memperbarui password' 
      });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleProfileSave = async () => {
    try {
      setIsSaving(true);
      setMessage({ type: '', text: '' });

      const result = await updateProfile({
        name: profileData.name,
        phone: profileData.phone,
        bio: profileData.bio,
        avatar_url: profileData.avatar_url
      });

      if (result.success) {
        setMessage({ type: 'success', text: 'Profil berhasil diperbarui' });
        setIsEditing(false);
      } else {
        setMessage({ type: 'error', text: result.message || 'Gagal memperbarui profil' });
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      setMessage({ type: 'error', text: error.message || 'Terjadi kesalahan saat menyimpan profil' });
    } finally {
      setIsSaving(false);
      // Auto hide message after 5 seconds
      setTimeout(() => {
        setMessage({ type: '', text: '' });
      }, 5000);
    }
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setMessage({ type: 'error', text: 'File harus berupa gambar' });
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setMessage({ type: 'error', text: 'Ukuran gambar terlalu besar (maks 5MB)' });
        return;
      }

      // Show loading indicator
      setIsAvatarLoading(true);

      const reader = new FileReader();
      reader.onload = (e) => {
        setProfileData(prev => ({ ...prev, avatar_url: e.target.result }));
        setIsAvatarLoading(false);
      };
      reader.onerror = () => {
        setMessage({ type: 'error', text: 'Gagal memproses gambar' });
        setIsAvatarLoading(false);
      };
      reader.readAsDataURL(file);
    }
  };

  // Toggle password visibility
  const togglePasswordVisibility = (field) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  // Generate a secure password
  const generateSecurePassword = () => {
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const special = '!@#$%^&*()_-+=<>?';
    
    let password = '';
    
    // Ensure at least one of each character type
    password += lowercase.charAt(Math.floor(Math.random() * lowercase.length));
    password += uppercase.charAt(Math.floor(Math.random() * uppercase.length));
    password += numbers.charAt(Math.floor(Math.random() * numbers.length));
    
    // Add more random characters to reach minimum length of 8
    const allChars = lowercase + uppercase + numbers;
    for (let i = password.length; i < 8; i++) {
      password += allChars.charAt(Math.floor(Math.random() * allChars.length));
    }
    
    // Shuffle the password characters
    password = password.split('').sort(() => 0.5 - Math.random()).join('');
    
    setPasswordData(prev => ({
      ...prev,
      newPassword: password,
      confirmPassword: password
    }));
  };

  // Determine if current user can delete their own account
  const canDeleteOwnAccount = () => {
    if (!user) return false;
    
    // Default superadmin (user_id = 1) cannot delete their own account
    if (user.user_id === 1) return false;
    
    // Regular superadmin and admin cannot delete their own accounts
    // Only allow deletion by other superadmins
    return false;
  };

  const renderProfileTab = () => (
    <div className="space-y-6">
      {/* Status Message - Only show success/error messages within the tab content */}
      {message.text && (
        <div className={`${
          message.type === 'success' 
            ? 'bg-green-100 dark:bg-green-900/30 border-green-400 dark:border-green-700 text-green-700 dark:text-green-300' 
            : 'bg-red-100 dark:bg-red-900/30 border-red-400 dark:border-red-700 text-red-700 dark:text-red-300'
        } px-4 py-3 rounded-xl border`}>
          <div className="flex items-center">
            <i className={`fas fa-${message.type === 'success' ? 'check-circle' : 'exclamation-triangle'} mr-2`}></i>
            <span>{message.text}</span>
          </div>
        </div>
      )}
      
      {/* Theme Toggle */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md border border-gray-100 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">Tema Aplikasi</h3>
        <div className="flex justify-between items-center p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
          <div>
            <h4 className="font-medium text-gray-800 dark:text-gray-200">Mode Gelap</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">Ubah tampilan aplikasi ke mode gelap</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={isDarkMode}
              onChange={toggleTheme}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
          </label>
        </div>
      </div>

      {/* Avatar Section */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md border border-gray-100 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">Foto Profil</h3>
        <div className="flex items-center space-x-6">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold">
              {isAvatarLoading ? (
                <div className="flex items-center justify-center">
                  <i className="fas fa-spinner fa-spin text-white"></i>
                </div>
              ) : profileData.avatar_url ? (
                <img src={profileData.avatar_url} alt="Avatar" className="w-24 h-24 rounded-full object-cover" />
              ) : (
                profileData.name.charAt(0)
              )}
            </div>
            {isEditing && (
              <label className="absolute bottom-0 right-0 bg-blue-500 text-white p-2 rounded-full cursor-pointer hover:bg-blue-600 transition-colors">
                <i className="fas fa-camera text-sm"></i>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  disabled={isAvatarLoading}
                  className="hidden"
                />
              </label>
            )}
          </div>
          <div>
            <h4 className="text-xl font-semibold text-gray-800 dark:text-gray-100">{profileData.name}</h4>
            <p className="text-gray-600 dark:text-gray-300">{profileData.role}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{profileData.email}</p>
          </div>
        </div>
      </div>

      {/* Profile Information */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md border border-gray-100 dark:border-gray-700">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Informasi Profil</h3>
          <button
            onClick={() => isEditing ? handleProfileSave() : setIsEditing(true)}
            disabled={isSaving}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              isEditing 
                ? 'bg-green-500 hover:bg-green-600 text-white' 
                : 'bg-blue-500 hover:bg-blue-600 text-white'
            } ${isSaving ? 'opacity-75 cursor-not-allowed' : ''}`}
          >
            {isSaving ? (
              <>
                <i className="fas fa-spinner fa-spin mr-2"></i>
                Menyimpan...
              </>
            ) : (
              <>
                <i className={`fas fa-${isEditing ? 'save' : 'edit'} mr-2`}></i>
                {isEditing ? 'Simpan' : 'Edit'}
              </>
            )}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Nama Lengkap</label>
            <input
              type="text"
              value={profileData.name}
              onChange={(e) => setProfileData(prev => ({ ...prev, name: e.target.value }))}
              disabled={!isEditing || isSaving}
              className={`w-full border rounded-lg px-4 py-2 ${
                isEditing 
                  ? 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500' 
                  : 'border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
              } focus:outline-none ${isSaving ? 'opacity-75 cursor-not-allowed' : ''}`}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email</label>
            <input
              type="email"
              value={profileData.email}
              disabled={true} // Email can't be edited
              className="w-full border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 rounded-lg px-4 py-2 text-gray-900 dark:text-gray-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Nomor Telepon</label>
            <input
              type="tel"
              value={profileData.phone}
              onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
              disabled={!isEditing || isSaving}
              className={`w-full border rounded-lg px-4 py-2 ${
                isEditing 
                  ? 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500' 
                  : 'border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
              } focus:outline-none ${isSaving ? 'opacity-75 cursor-not-allowed' : ''}`}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Role</label>
            <input
              type="text"
              value={profileData.role}
              disabled
              className="w-full border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 rounded-lg px-4 py-2 text-gray-600 dark:text-gray-400"
            />
          </div>
        </div>

        <div className="mt-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Bio</label>
          <textarea
            value={profileData.bio}
            onChange={(e) => setProfileData(prev => ({ ...prev, bio: e.target.value }))}
            disabled={!isEditing || isSaving}
            rows={3}
            className={`w-full border rounded-lg px-4 py-2 ${
              isEditing 
                ? 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500' 
                : 'border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
            } focus:outline-none ${isSaving ? 'opacity-75 cursor-not-allowed' : ''}`}
          />
        </div>
      </div>
    </div>
  );

  const renderAccountTab = () => {
    return (
      <div className="space-y-6">
        {/* Change Password */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md border border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">Ubah Password</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Password Lama</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <i className="fas fa-lock text-gray-400 dark:text-gray-500"></i>
                </div>
              <input
                  type={showPasswords.currentPassword ? "text" : "password"}
                  name="currentPassword"
                  value={passwordData.currentPassword}
                  onChange={handlePasswordChange}
                  className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    passwordErrors.currentPassword 
                      ? 'border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/20' 
                      : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700'
                  } text-gray-900 dark:text-gray-100`}
                placeholder="Masukkan password lama"
              />
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    togglePasswordVisibility('currentPassword');
                  }}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-500 dark:text-gray-500"
                >
                  <i className={`fas fa-${showPasswords.currentPassword ? 'eye-slash' : 'eye'}`}></i>
                </button>
              </div>
              {passwordErrors.currentPassword && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{passwordErrors.currentPassword}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Password Baru</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <i className="fas fa-key text-gray-400 dark:text-gray-500"></i>
                </div>
              <input
                  type={showPasswords.newPassword ? "text" : "password"}
                  name="newPassword"
                  value={passwordData.newPassword}
                  onChange={handlePasswordChange}
                  className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    passwordErrors.newPassword 
                      ? 'border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/20' 
                      : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700'
                  } text-gray-900 dark:text-gray-100`}
                placeholder="Masukkan password baru"
              />
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    togglePasswordVisibility('newPassword');
                  }}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-500 dark:text-gray-500"
                >
                  <i className={`fas fa-${showPasswords.newPassword ? 'eye-slash' : 'eye'}`}></i>
                </button>
              </div>
              {passwordErrors.newPassword && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{passwordErrors.newPassword}</p>
              )}
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Password harus minimal 6 karakter, terdiri dari huruf kecil, huruf besar, dan angka.</p>
              <button
                type="button"
                onClick={generateSecurePassword}
                className="mt-1 text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 flex items-center"
              >
                <i className="fas fa-magic mr-1"></i> Generate password aman
              </button>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Konfirmasi Password Baru</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <i className="fas fa-check-circle text-gray-400 dark:text-gray-500"></i>
                </div>
              <input
                  type={showPasswords.confirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  value={passwordData.confirmPassword}
                  onChange={handlePasswordChange}
                  className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    passwordErrors.confirmPassword 
                      ? 'border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/20' 
                      : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700'
                  } text-gray-900 dark:text-gray-100`}
                placeholder="Konfirmasi password baru"
              />
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    togglePasswordVisibility('confirmPassword');
                  }}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-500 dark:text-gray-500"
                >
                  <i className={`fas fa-${showPasswords.confirmPassword ? 'eye-slash' : 'eye'}`}></i>
                </button>
              </div>
              {passwordErrors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{passwordErrors.confirmPassword}</p>
              )}
            </div>
            <button
              onClick={handleUpdatePassword}
              disabled={isUpdatingPassword}
              className={`bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors ${isUpdatingPassword ? 'opacity-70 cursor-not-allowed' : ''} flex items-center justify-center`}
            >
              {isUpdatingPassword ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                  Memperbarui...
                </>
              ) : (
                <>
                  <i className="fas fa-save mr-2"></i>
              Update Password
                </>
              )}
            </button>
          </div>
          {passwordMessage.text && (
            <div className={`${
              passwordMessage.type === 'success' 
                ? 'bg-green-100 dark:bg-green-900/30 border-green-400 dark:border-green-700 text-green-700 dark:text-green-300' 
                : 'bg-red-100 dark:bg-red-900/30 border-red-400 dark:border-red-700 text-red-700 dark:text-red-300'
            } px-4 py-3 rounded-xl border mt-4`}>
              <div className="flex items-center">
                <i className={`fas fa-${passwordMessage.type === 'success' ? 'check-circle' : 'exclamation-triangle'} mr-2`}></i>
                <span>{passwordMessage.text}</span>
                <button 
                  onClick={() => setPasswordMessage({ type: '', text: '' })}
                  className="ml-auto text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Account Actions */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md border border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">Aksi Akun</h3>
          <div className="space-y-4">
            {canDeleteOwnAccount() ? (
              <div className="flex justify-between items-center p-4 border border-red-200 dark:border-red-800 rounded-lg bg-red-50 dark:bg-red-900/20">
                <div>
                  <h4 className="font-medium text-red-800 dark:text-red-300">Hapus Akun</h4>
                  <p className="text-sm text-red-600 dark:text-red-400">Hapus akun secara permanen (tidak dapat dibatalkan)</p>
                </div>
                <button className="bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">
                  Hapus Akun
                </button>
              </div>
            ) : (
              <div className="flex justify-between items-center p-4 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700/20">
                <div>
                  <h4 className="font-medium text-gray-600 dark:text-gray-400">Hapus Akun</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-500">
                    {user?.user_id === 1 
                      ? "Superadmin default tidak dapat menghapus akun sendiri"
                      : user?.role === 'superadmin'
                      ? "Akun superadmin hanya dapat dihapus oleh superadmin default"
                      : "Akun admin hanya dapat dihapus oleh superadmin"
                    }
                  </p>
                </div>
                <button 
                  disabled
                  className="bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 px-4 py-2 rounded-lg font-medium cursor-not-allowed"
                >
                  Hapus Akun
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 dark:from-blue-700 dark:to-indigo-800 rounded-2xl mb-8 shadow-lg">
        <div className="px-8 py-10 text-white">
          <h1 className="text-3xl font-bold mb-2">Pengaturan</h1>
          <p className="text-blue-100">Kelola profil, akun, dan preferensi sistem Anda.</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar Navigation */}
        <div className="lg:w-1/4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md border border-gray-100 dark:border-gray-700 p-4">
            <nav className="space-y-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                  }}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors ${
                    activeTab === tab.id
                      ? 'bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <i className={`fas fa-${tab.icon} text-lg`}></i>
                  <span className="font-medium">{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:w-3/4">
          {activeTab === 'profile' && renderProfileTab()}
          {activeTab === 'account' && renderAccountTab()}
        </div>
      </div>
    </div>
  );
};

export default Pengaturan; 