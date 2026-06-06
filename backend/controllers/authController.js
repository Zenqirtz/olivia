const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { executeQuery } = require('../config/database');
const { sendPasswordResetEmail } = require('../services/emailService');

// Generate JWT token
const generateToken = (userId, email, role) => {
  return jwt.sign(
    { userId, email, role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '24h' }
  );
};

// Login user
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if user exists
    const userQuery = 'SELECT * FROM users WHERE email = ? AND is_active = TRUE';
    const userResult = await executeQuery(userQuery, [email]);

    if (!userResult.success || userResult.data.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    const user = userResult.data[0];

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Generate token
    const token = generateToken(user.user_id, user.email, user.role);

    // Update last login (optional)
    const updateLoginQuery = 'UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE user_id = ?';
    await executeQuery(updateLoginQuery, [user.user_id]);

    // Return user data without password
    const { password_hash, ...userWithoutPassword } = user;

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: userWithoutPassword,
        token
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed'
    });
  }
};

// Register new user (SuperAdmin only)
const register = async (req, res) => {
  try {
    const { name, email, password, role = 'admin', phone, bio } = req.body;

    // Check if user already exists
    const existingUserQuery = 'SELECT user_id FROM users WHERE email = ?';
    const existingUserResult = await executeQuery(existingUserQuery, [email]);

    if (existingUserResult.success && existingUserResult.data.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Hash password
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Insert new user
    const insertUserQuery = `
      INSERT INTO users (name, email, password_hash, role, phone, bio, created_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `;
    
    const insertResult = await executeQuery(insertUserQuery, [
      name,
      email,
      hashedPassword,
      role,
      phone || null,
      bio || null,
      req.user.user_id
    ]);

    if (!insertResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to create user'
      });
    }

    // Get created user data
    const newUserQuery = 'SELECT user_id, name, email, role, phone, bio, created_at FROM users WHERE user_id = ?';
    const newUserResult = await executeQuery(newUserQuery, [insertResult.data.insertId]);

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: {
        user: newUserResult.data[0]
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed'
    });
  }
};

// Get current user profile
const getProfile = async (req, res) => {
  try {
    const userId = req.user.user_id;

    const userQuery = `
      SELECT user_id, name, email, role, phone, bio, avatar_url, 
             email_verified_at, created_at, updated_at
      FROM users 
      WHERE user_id = ? AND is_active = TRUE
    `;
    
    const userResult = await executeQuery(userQuery, [userId]);

    if (!userResult.success || userResult.data.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: {
        user: userResult.data[0]
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user profile'
    });
  }
};

// Update user profile
const updateProfile = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { name, phone, bio, avatar_url } = req.body;

    const updateQuery = `
      UPDATE users 
      SET name = COALESCE(?, name),
          phone = COALESCE(?, phone),
          bio = COALESCE(?, bio),
          avatar_url = COALESCE(?, avatar_url),
          updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ? AND is_active = TRUE
    `;

    const updateResult = await executeQuery(updateQuery, [name, phone, bio, avatar_url, userId]);

    if (!updateResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to update profile'
      });
    }

    // Get updated user data
    const userQuery = `
      SELECT user_id, name, email, role, phone, bio, avatar_url, 
             email_verified_at, created_at, updated_at
      FROM users 
      WHERE user_id = ?
    `;
    
    const userResult = await executeQuery(userQuery, [userId]);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: userResult.data[0]
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile'
    });
  }
};

// Change password
const changePassword = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { currentPassword, newPassword } = req.body;

    // Get current user data
    const userQuery = 'SELECT password_hash FROM users WHERE user_id = ? AND is_active = TRUE';
    const userResult = await executeQuery(userQuery, [userId]);

    if (!userResult.success || userResult.data.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, userResult.data[0].password_hash);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Hash new password
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    const updatePasswordQuery = `
      UPDATE users 
      SET password_hash = ?, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ?
    `;

    const updateResult = await executeQuery(updatePasswordQuery, [hashedNewPassword, userId]);

    if (!updateResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to change password'
      });
    }

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to change password'
    });
  }
};

// Verify token (for frontend to check if token is still valid)
const verifyToken = async (req, res) => {
  try {
    // If we reach here, token is valid (middleware already verified it)
    res.json({
      success: true,
      message: 'Token is valid',
      data: {
        user: req.user
      }
    });
  } catch (error) {
    console.error('Verify token error:', error);
    res.status(500).json({
      success: false,
      message: 'Token verification failed'
    });
  }
};

// Logout (optional - mainly for clearing client-side token)
const logout = async (req, res) => {
  try {
    // In a stateless JWT system, logout is mainly handled client-side
    // But we can log the logout action for audit purposes
    res.json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Logout failed'
    });
  }
};

// Forgot Password — kirim link reset ke email via Mailtrap
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email harus diisi' });
    }

    // Cek apakah email terdaftar
    const userQuery = 'SELECT user_id, name, email FROM users WHERE email = ? AND is_active = TRUE';
    const userResult = await executeQuery(userQuery, [email]);

    // Selalu balas sukses agar tidak bocorkan info email terdaftar/tidak
    if (!userResult.success || userResult.data.length === 0) {
      return res.json({
        success: true,
        message: 'Jika email terdaftar, link reset akan dikirim ke email Anda.'
      });
    }

    const user = userResult.data[0];

    // Hapus token lama untuk email ini (jika ada)
    await executeQuery('DELETE FROM password_reset_tokens WHERE email = ?', [email]);

    // Buat token acak yang aman
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 jam dari sekarang
    const expiresAtStr = expiresAt.toISOString().slice(0, 19).replace('T', ' ');

    // Simpan token ke database
    const insertTokenQuery = `
      INSERT INTO password_reset_tokens (email, token, expires_at)
      VALUES (?, ?, ?)
    `;
    const insertResult = await executeQuery(insertTokenQuery, [email, token, expiresAtStr]);

    if (!insertResult.success) {
      return res.status(500).json({ success: false, message: 'Gagal memproses permintaan' });
    }

    // Buat link reset password
    const appUrl = process.env.APP_URL || 'http://localhost:5173';
    const resetLink = `${appUrl}/reset-password?token=${token}`;

    // Kirim email via Mailtrap SMTP
    await sendPasswordResetEmail(user.email, user.name, resetLink);

    console.log(`[ForgotPassword] Link reset dikirim ke: ${email}`);

    res.json({
      success: true,
      message: 'Jika email terdaftar, link reset akan dikirim ke email Anda.'
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ success: false, message: 'Gagal mengirim email reset password' });
  }
};

// Reset Password — validasi token dan update password baru
const resetPassword = async (req, res) => {
  try {
    const { token, newPassword, confirmPassword } = req.body;

    if (!token || !newPassword || !confirmPassword) {
      return res.status(400).json({ success: false, message: 'Token, password baru, dan konfirmasi password harus diisi' });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'Password baru dan konfirmasi password tidak cocok' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Password minimal 6 karakter' });
    }

    // Cari token yang valid (belum dipakai dan belum expired)
    const tokenQuery = `
      SELECT * FROM password_reset_tokens
      WHERE token = ? AND used = 0 AND expires_at > NOW()
    `;
    const tokenResult = await executeQuery(tokenQuery, [token]);

    if (!tokenResult.success || tokenResult.data.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Link reset password tidak valid atau sudah kadaluarsa. Silakan minta link baru.'
      });
    }

    const resetRecord = tokenResult.data[0];

    // Hash password baru
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password di tabel users
    const updateQuery = `
      UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP
      WHERE email = ? AND is_active = TRUE
    `;
    const updateResult = await executeQuery(updateQuery, [hashedPassword, resetRecord.email]);

    if (!updateResult.success) {
      return res.status(500).json({ success: false, message: 'Gagal memperbarui password' });
    }

    // Tandai token sebagai sudah dipakai
    await executeQuery('UPDATE password_reset_tokens SET used = 1 WHERE token = ?', [token]);

    console.log(`[ResetPassword] Password berhasil direset untuk: ${resetRecord.email}`);

    res.json({
      success: true,
      message: 'Password berhasil direset! Silakan login dengan password baru Anda.'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ success: false, message: 'Gagal mereset password' });
  }
};

module.exports = {
  login,
  register,
  getProfile,
  updateProfile,
  changePassword,
  verifyToken,
  logout,
  forgotPassword,
  resetPassword
};