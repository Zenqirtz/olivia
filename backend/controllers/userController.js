const bcrypt = require('bcryptjs');
const { executeQuery } = require('../config/database');

// Get all users (SuperAdmin only)
const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', role = '' } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    // Build search conditions with table aliases
    let whereConditions = [];
    let queryParams = [];

    if (search) {
      whereConditions.push('(u.name LIKE ? OR u.email LIKE ?)');
      queryParams.push(`%${search}%`, `%${search}%`);
    }

    if (role && ['admin', 'superadmin'].includes(role)) {
      whereConditions.push('u.role = ?');
      queryParams.push(role);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM users u ${whereClause}`;
    const countResult = await executeQuery(countQuery, queryParams);
    
    if (!countResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch user count'
      });
    }

    const total = countResult.data[0].total;

    // Get users with pagination - using string interpolation for LIMIT/OFFSET (MySQL driver issue with ? placeholders)
    let usersQuery;
    let usersParams;
    
    if (whereConditions.length > 0) {
      // With search/filter conditions - include JOIN for creator name
      usersQuery = `SELECT u.user_id, u.name, u.email, u.role, u.phone, u.bio, u.avatar_url, u.email_verified_at, u.is_active, u.created_at, u.updated_at, creator.name as created_by_name FROM users u LEFT JOIN users creator ON u.created_by = creator.user_id WHERE ${whereConditions.join(' AND ')} ORDER BY u.created_at DESC LIMIT ${limitNum} OFFSET ${offset}`;
      usersParams = queryParams;
    } else {
      // No search/filter conditions - include JOIN for creator name
      usersQuery = `SELECT u.user_id, u.name, u.email, u.role, u.phone, u.bio, u.avatar_url, u.email_verified_at, u.is_active, u.created_at, u.updated_at, creator.name as created_by_name FROM users u LEFT JOIN users creator ON u.created_by = creator.user_id ORDER BY u.created_at DESC LIMIT ${limitNum} OFFSET ${offset}`;
      usersParams = [];
    }
    const usersResult = await executeQuery(usersQuery, usersParams);

    if (!usersResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch users'
      });
    }

    res.json({
      success: true,
      data: usersResult.data,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users'
    });
  }
};

// Get user by ID (SuperAdmin only)
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const userQuery = `SELECT u.user_id, u.name, u.email, u.role, u.phone, u.bio, u.avatar_url, u.email_verified_at, u.is_active, u.created_at, u.updated_at, creator.name as created_by_name FROM users u LEFT JOIN users creator ON u.created_by = creator.user_id WHERE u.user_id = ?`;

    const userResult = await executeQuery(userQuery, [id]);

    if (!userResult.success || userResult.data.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: userResult.data[0]
    });
  } catch (error) {
    console.error('Get user by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user'
    });
  }
};

// Create new user (SuperAdmin only)
const createUser = async (req, res) => {
  try {
    const { name, email, password, role = 'admin', phone, bio } = req.body;

    // Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required'
      });
    }

    // Validate role
    if (!['admin', 'superadmin'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Must be admin or superadmin'
      });
    }

    // Check if email already exists
    const emailCheckQuery = 'SELECT user_id FROM users WHERE email = ?';
    const emailCheckResult = await executeQuery(emailCheckQuery, [email]);

    if (emailCheckResult.success && emailCheckResult.data.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Email is already registered'
      });
    }

    // Hash password
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user
    const createUserQuery = `INSERT INTO users (name, email, password_hash, role, phone, bio, created_by, is_active, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, TRUE, NOW())`;

    const createResult = await executeQuery(createUserQuery, [
      name, email, hashedPassword, role, phone, bio, req.user.user_id
    ]);

    if (!createResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to create user'
      });
    }

    // Get created user data
    const newUserQuery = `SELECT u.user_id, u.name, u.email, u.role, u.phone, u.bio, u.avatar_url, u.email_verified_at, u.is_active, u.created_at, u.updated_at, creator.name as created_by_name FROM users u LEFT JOIN users creator ON u.created_by = creator.user_id WHERE u.user_id = ?`;

    const insertId = createResult.insertId || createResult.data?.insertId;
    const newUserResult = await executeQuery(newUserQuery, [insertId]);

    if (!newUserResult.success || !newUserResult.data || newUserResult.data.length === 0) {
      return res.status(500).json({
        success: false,
        message: 'User created but failed to retrieve user data'
      });
    }

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: newUserResult.data[0]
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create user'
    });
  }
};

// Update user (SuperAdmin only)
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, role, phone, bio, password } = req.body;

    // Check if user exists
    const existingUserQuery = 'SELECT user_id, email FROM users WHERE user_id = ?';
    const existingUserResult = await executeQuery(existingUserQuery, [id]);

    if (!existingUserResult.success || existingUserResult.data.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if email is already taken by another user
    if (email && email !== existingUserResult.data[0].email) {
      const emailCheckQuery = 'SELECT user_id FROM users WHERE email = ? AND user_id != ?';
      const emailCheckResult = await executeQuery(emailCheckQuery, [email, id]);

      if (emailCheckResult.success && emailCheckResult.data.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Email is already taken by another user'
        });
      }
    }

    // Prevent SuperAdmin from demoting themselves
    if (req.user.user_id == id && req.user.role === 'superadmin' && role === 'admin') {
      return res.status(400).json({
        success: false,
        message: 'SuperAdmin cannot demote themselves'
      });
    }

    // Prepare update query
    let updateQuery = `UPDATE users SET name = COALESCE(?, name), email = COALESCE(?, email), role = COALESCE(?, role), phone = COALESCE(?, phone), bio = COALESCE(?, bio), updated_at = CURRENT_TIMESTAMP`;
    
    let updateParams = [name, email, role, phone, bio];

    // Add password update if provided
    if (password) {
      const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);
      updateQuery += ', password_hash = ?';
      updateParams.push(hashedPassword);
    }

    updateQuery += ' WHERE user_id = ?';
    updateParams.push(id);

    const updateResult = await executeQuery(updateQuery, updateParams);

    if (!updateResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to update user'
      });
    }

    // Get updated user data
    const updatedUserQuery = `SELECT u.user_id, u.name, u.email, u.role, u.phone, u.bio, u.avatar_url, u.email_verified_at, u.is_active, u.created_at, u.updated_at, creator.name as created_by_name FROM users u LEFT JOIN users creator ON u.created_by = creator.user_id WHERE u.user_id = ?`;

    const updatedUserResult = await executeQuery(updatedUserQuery, [id]);

    if (!updatedUserResult.success || !updatedUserResult.data || updatedUserResult.data.length === 0) {
      return res.status(500).json({
        success: false,
        message: 'User updated but failed to retrieve user data'
      });
    }

    res.json({
      success: true,
      message: 'User updated successfully',
      data: updatedUserResult.data[0]
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user'
    });
  }
};

// Delete user (SuperAdmin only)
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent SuperAdmin from deleting themselves
    if (req.user.user_id == id) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete your own account'
      });
    }

    // Check if user exists (check both active and inactive users)
    const userQuery = 'SELECT user_id, name, email, role FROM users WHERE user_id = ?';
    const userResult = await executeQuery(userQuery, [id]);

    if (!userResult.success || userResult.data.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const userToDelete = userResult.data[0];

    // Prevent deletion of the last SuperAdmin
    if (userToDelete.role === 'superadmin') {
      const superAdminCountQuery = 'SELECT COUNT(*) as count FROM users WHERE role = "superadmin"';
      const countResult = await executeQuery(superAdminCountQuery);
      
      if (countResult.success && countResult.data[0].count <= 1) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete the last SuperAdmin account'
        });
      }
    }

    // Hard delete user from database
    // Foreign key constraints will handle related data:
    // - ON DELETE CASCADE: user_sessions, notifications, reports, api_tokens will be deleted
    // - ON DELETE SET NULL: conveyor_logs, alerts, maintenance_logs, audit_logs, system_settings will have user_id set to NULL
    const deleteQuery = 'DELETE FROM users WHERE user_id = ?';
    const deleteResult = await executeQuery(deleteQuery, [id]);

    if (!deleteResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to delete user'
      });
    }

    // Log the deletion for audit purposes
    console.log(`User deleted: ${userToDelete.name} (${userToDelete.email}) by user ${req.user.user_id}`);

    res.json({
      success: true,
      message: 'User permanently deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete user'
    });
  }
};

// Toggle user status (SuperAdmin only)
const toggleUserStatus = async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent SuperAdmin from deactivating themselves
    if (req.user.user_id == id) {
      return res.status(400).json({
        success: false,
        message: 'Cannot toggle your own account status'
      });
    }

    // Check if user exists
    const userQuery = 'SELECT user_id, name, email, is_active FROM users WHERE user_id = ?';
    const userResult = await executeQuery(userQuery, [id]);

    if (!userResult.success || userResult.data.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const currentUser = userResult.data[0];
    const newStatus = !currentUser.is_active;

    // Toggle user status
    const toggleQuery = 'UPDATE users SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?';
    const toggleResult = await executeQuery(toggleQuery, [newStatus, id]);

    if (!toggleResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to toggle user status'
      });
    }

    res.json({
      success: true,
      message: `User ${newStatus ? 'activated' : 'deactivated'} successfully`,
      data: {
        user_id: id,
        is_active: newStatus
      }
    });
  } catch (error) {
    console.error('Toggle user status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle user status'
    });
  }
};

// Reset user password (SuperAdmin only)
const resetUserPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    // Check if user exists
    const userQuery = 'SELECT user_id, name, email FROM users WHERE user_id = ?';
    const userResult = await executeQuery(userQuery, [id]);

    if (!userResult.success || userResult.data.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Hash new password
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    const updatePasswordQuery = `UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?`;

    const updateResult = await executeQuery(updatePasswordQuery, [hashedPassword, id]);

    if (!updateResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to reset password'
      });
    }

    res.json({
      success: true,
      message: 'Password reset successfully'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset password'
    });
  }
};

// Get user statistics (SuperAdmin only)
const getUserStats = async (req, res) => {
  try {
    const statsQuery = `SELECT COUNT(*) as total_users, SUM(CASE WHEN role = 'superadmin' THEN 1 ELSE 0 END) as superadmin_count, SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) as admin_count, SUM(CASE WHEN is_active = TRUE THEN 1 ELSE 0 END) as active_users, SUM(CASE WHEN is_active = FALSE THEN 1 ELSE 0 END) as inactive_users, SUM(CASE WHEN DATE(created_at) = CURDATE() THEN 1 ELSE 0 END) as users_created_today, SUM(CASE WHEN DATE(created_at) >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) THEN 1 ELSE 0 END) as users_created_this_week, SUM(CASE WHEN DATE(created_at) >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) THEN 1 ELSE 0 END) as users_created_this_month FROM users`;

    const statsResult = await executeQuery(statsQuery);

    if (!statsResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch user statistics'
      });
    }

    // Get recent users
    const recentUsersQuery = `SELECT user_id, name, email, role, created_at FROM users WHERE is_active = TRUE ORDER BY created_at DESC LIMIT 5`;

    const recentUsersResult = await executeQuery(recentUsersQuery);

    res.json({
      success: true,
      data: {
        statistics: statsResult.data[0],
        recentUsers: recentUsersResult.data || []
      }
    });
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user statistics'
    });
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  toggleUserStatus,
  resetUserPassword,
  getUserStats
}; 