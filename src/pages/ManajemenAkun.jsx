import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { userService } from '../services/userService';

const ManajemenAkun = () => {
  const { user, isSuperAdmin } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('create'); // 'create', 'edit', 'delete'
  const [selectedUser, setSelectedUser] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'admin',
    phone: '',
    bio: ''
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Load users from API
  const loadUsers = async () => {
    setLoading(true);
    try {
      const response = await userService.getAllUsers();
      if (response.success) {
        setUsers(response.data);
      } else {
        setErrors({ general: response.message });
      }
    } catch (error) {
      console.error('Error loading users:', error);
      setErrors({ general: 'Gagal memuat data pengguna' });
    } finally {
      setLoading(false);
    }
  };

  // Check if current user can delete target user
  const canDeleteUser = (targetUser) => {
    // Cannot delete yourself
    if (targetUser.user_id === user.user_id) return false;

    // Default superadmin (user_id = 1) can delete anyone except themselves
    if (user.user_id === 1) return true;

    // Regular superadmin can only delete admin users
    if (user.role === 'superadmin' && targetUser.role === 'admin') return true;

    // Regular superadmin cannot delete other superadmins (including default superadmin)
    if (user.role === 'superadmin' && targetUser.role === 'superadmin') return false;

    // Admin cannot delete anyone
    if (user.role === 'admin') return false;

    return false;
  };

  // Check if current user can edit target user
  const canEditUser = (targetUser) => {
    // Users can edit their own profile
    if (targetUser.user_id === user.user_id) return true;

    // Default superadmin (user_id = 1) can edit anyone
    if (user.user_id === 1) return true;

    // Regular superadmin can only edit admin users (not other superadmins)
    if (user.role === 'superadmin' && targetUser.role === 'admin') return true;

    // Regular superadmin cannot edit other superadmins (including default superadmin)
    if (user.role === 'superadmin' && targetUser.role === 'superadmin') return false;

    // Admin cannot edit others
    if (user.role === 'admin') return false;

    return false;
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const roleOptions = [
    { value: 'superadmin', label: 'Super Admin', color: 'amber' },
    { value: 'admin', label: 'Admin', color: 'orange' }
  ];

  const getRoleColor = (role) => {
    const roleOption = roleOptions.find(option => option.value === role);
    return roleOption ? roleOption.color : 'gray';
  };

  const handleOpenModal = (type, userData = null) => {
    setModalType(type);
    setSelectedUser(userData);

    if (type === 'create') {
      setFormData({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        role: 'admin',
        phone: '',
        bio: ''
      });
    } else if (type === 'edit' && userData) {
      setFormData({
        name: userData.name,
        email: userData.email,
        password: '',
        confirmPassword: '',
        role: userData.role,
        phone: userData.phone || '',
        bio: userData.bio || ''
      });
    }

    setErrors({});
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedUser(null);
    setFormData({
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      role: 'admin',
      phone: '',
      bio: ''
    });
    setErrors({});
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Nama harus diisi';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email harus diisi';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Format email tidak valid';
    } else {
      // Check if email already exists (except for current user in edit mode)
      const existingUser = users.find(u =>
        u.email === formData.email &&
        (modalType === 'create' || u.user_id !== selectedUser?.user_id)
      );
      if (existingUser) {
        newErrors.email = 'Email sudah digunakan';
      }
    }

    if (modalType === 'create' || formData.password) {
      if (!formData.password) {
        newErrors.password = 'Password harus diisi';
      } else if (formData.password.length < 6) {
        newErrors.password = 'Password minimal 6 karakter';
      }

      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Konfirmasi password tidak cocok';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setSubmitting(true);

    try {
      let response;

      if (modalType === 'create') {
        response = await userService.createUser(formData);
      } else if (modalType === 'edit') {
        const updateData = { ...formData };
        // Remove password fields if empty
        if (!updateData.password) {
          delete updateData.password;
          delete updateData.confirmPassword;
        }
        response = await userService.updateUser(selectedUser.user_id, updateData);
      }

      if (response.success) {
        handleCloseModal();
        await loadUsers(); // Reload users list
      } else {
        setErrors({ general: response.message });
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      setErrors({ general: 'Terjadi kesalahan saat menyimpan data' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedUser) return;

    // Check permission before attempting to delete
    if (!canDeleteUser(selectedUser)) {
      setErrors({
        general: 'Anda tidak memiliki izin untuk menghapus akun ini.'
      });
      return;
    }

    setSubmitting(true);

    try {
      const response = await userService.deleteUser(selectedUser.user_id);

      if (response.success) {
        handleCloseModal();
        await loadUsers(); // Reload users list
      } else {
        setErrors({ general: response.message });
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      setErrors({ general: 'Terjadi kesalahan saat menghapus akun' });
    } finally {
      setSubmitting(false);
    }
  };

  const toggleUserStatus = async (userId) => {
    try {
      const response = await userService.toggleUserStatus(userId);

      if (response.success) {
        await loadUsers(); // Reload users list
      } else {
        console.error('Error toggling user status:', response.message);
      }
    } catch (error) {
      console.error('Error toggling user status:', error);
    }
  };

  if (!isSuperAdmin()) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center">
          <i className="fas fa-exclamation-triangle text-red-500 text-3xl mb-4"></i>
          <h2 className="text-xl font-semibold text-red-800 dark:text-red-300 mb-2">Akses Ditolak</h2>
          <p className="text-red-600 dark:text-red-400">Anda tidak memiliki izin untuk mengakses halaman ini.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 page-enter">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-700 to-amber-800 dark:from-amber-800 dark:to-amber-900 rounded-2xl mb-6 md:mb-8 shadow-lg animate-fade-in-up">
        <div className="px-4 md:px-8 py-6 md:py-10 text-white">
          <h1 className="text-2xl md:text-3xl font-bold mb-2">Manajemen Akun</h1>
          <p className="text-amber-100 text-sm md:text-base">Kelola akun pengguna sistem GardaOva</p>
        </div>
      </div>

      {/* Error Message */}
      {errors.general && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 animate-fadeIn">
          {errors.general}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md border border-gray-100 dark:border-gray-700 card-hover-amber animate-fade-in-up delay-75">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-amber-100 dark:bg-amber-900 text-amber-600 dark:text-amber-300">
              <i className="fas fa-users text-xl animate-float"></i>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Akun</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{users.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md border border-gray-100 dark:border-gray-700 card-hover-green animate-fade-in-up delay-100">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-300">
              <i className="fas fa-user-check text-xl animate-float"></i>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Akun Aktif</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {users.filter(u => u.is_active).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md border border-gray-100 dark:border-gray-700 card-hover-amber animate-fade-in-up delay-150">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-amber-100 dark:bg-amber-900 text-amber-600 dark:text-amber-300">
              <i className="fas fa-user-shield text-xl animate-float"></i>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Super Admin</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {users.filter(u => u.role === 'superadmin').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md border border-gray-100 dark:border-gray-700 animate-fade-in-up delay-200 card-hover-amber">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Daftar Akun</h2>
            <button
              onClick={() => handleOpenModal('create')}
              className="bg-gradient-to-r from-amber-600 to-amber-700 text-white px-4 py-2 rounded-lg hover:opacity-90 transition-all flex items-center gap-2 btn-press ripple-effect"
            >
              <i className="fas fa-plus animate-float"></i>
              Tambah Akun
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Pengguna
                  </th>
                  <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="hidden sm:table-cell px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Dibuat
                  </th>
                  <th className="px-3 md:px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700 tbody-stagger">
                {users.map((userData) => (
                  <tr key={userData.user_id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-amber-50/30 dark:hover:bg-gray-700/30 table-row-animated">
                    <td className="px-3 md:px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-8 w-8 md:h-10 md:w-10">
                          <div className="h-8 w-8 md:h-10 md:w-10 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 flex items-center justify-center text-white font-medium text-sm">
                            {userData.name.charAt(0).toUpperCase()}
                          </div>
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {userData.name}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">
                            {userData.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 md:px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-${getRoleColor(userData.role)}-100 dark:bg-${getRoleColor(userData.role)}-900 text-${getRoleColor(userData.role)}-800 dark:text-${getRoleColor(userData.role)}-200`}>
                        {roleOptions.find(r => r.value === userData.role)?.label}
                      </span>
                    </td>
                    <td className="px-3 md:px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => toggleUserStatus(userData.user_id)}
                        disabled={userData.user_id === user.user_id}
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${userData.is_active
                            ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                            : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                          } ${userData.user_id === user.user_id ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-80 cursor-pointer'}`}
                      >
                        {userData.is_active ? 'Aktif' : 'Nonaktif'}
                      </button>
                    </td>
                    <td className="hidden sm:table-cell px-3 md:px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {new Date(userData.created_at).toLocaleDateString('id-ID')}
                    </td>
                    <td className="px-3 md:px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        {canEditUser(userData) && (
                          <button
                            onClick={() => handleOpenModal('edit', userData)}
                            className="text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300 p-2 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/20"
                          >
                            <i className="fas fa-edit"></i>
                          </button>
                        )}
                        {canDeleteUser(userData) && (
                          <button
                            onClick={() => handleOpenModal('delete', userData)}
                            className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                          >
                            <i className="fas fa-trash"></i>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 modal-backdrop-animate">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto modal-content-animate">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {modalType === 'create' && 'Tambah Akun Baru'}
                {modalType === 'edit' && 'Edit Akun'}
                {modalType === 'delete' && 'Hapus Akun'}
              </h3>
            </div>

            <div className="px-6 py-4">
              {modalType === 'delete' ? (
                <div>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    Apakah Anda yakin ingin menghapus akun <strong>{selectedUser?.name}</strong>?
                    Tindakan ini tidak dapat dibatalkan.
                  </p>
                  {errors.general && (
                    <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
                      {errors.general}
                    </div>
                  )}
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {errors.general && (
                    <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
                      {errors.general}
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Nama Lengkap
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 input-glow ${errors.name ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
                        } bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
                      placeholder="Masukkan nama lengkap"
                    />
                    {errors.name && <p className="mt-1 text-sm text-red-600 dark:text-red-400 animate-fadeIn">{errors.name}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 input-glow ${errors.email ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
                        } bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
                      placeholder="Masukkan email"
                    />
                    {errors.email && <p className="mt-1 text-sm text-red-600 dark:text-red-400 animate-fadeIn">{errors.email}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Role
                    </label>
                    <select
                      name="role"
                      value={formData.role}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white input-glow"
                    >
                      {roleOptions.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Password {modalType === 'edit' && '(kosongkan jika tidak ingin mengubah)'}
                    </label>
                    <input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 input-glow ${errors.password ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
                        } bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
                      placeholder="Masukkan password"
                    />
                    {errors.password && <p className="mt-1 text-sm text-red-600 dark:text-red-400 animate-fadeIn">{errors.password}</p>}
                  </div>

                  {(modalType === 'create' || formData.password) && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Konfirmasi Password
                      </label>
                      <input
                        type="password"
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleInputChange}
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 input-glow ${errors.confirmPassword ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
                          } bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
                        placeholder="Konfirmasi password"
                      />
                      {errors.confirmPassword && <p className="mt-1 text-sm text-red-600 dark:text-red-400 animate-fadeIn">{errors.confirmPassword}</p>}
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Nomor Telepon
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white input-glow"
                      placeholder="Masukkan nomor telepon"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Bio
                    </label>
                    <textarea
                      name="bio"
                      value={formData.bio}
                      onChange={handleInputChange}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white input-glow"
                      placeholder="Masukkan bio singkat"
                    />
                  </div>
                </form>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
              <button
                onClick={handleCloseModal}
                disabled={submitting}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
              >
                Batal
              </button>
              {modalType === 'delete' ? (
                <button
                  onClick={handleDelete}
                  disabled={submitting}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {submitting && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
                  Hapus
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="px-4 py-2 bg-gradient-to-r from-amber-600 to-amber-700 text-white rounded-lg hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
                >
                  {submitting && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
                  {modalType === 'create' ? 'Tambah' : 'Simpan'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManajemenAkun; 