const express = require('express');
const router = express.Router();
const { verifyToken, requireSuperAdmin } = require('../middleware/auth');
const { 
  getAllUsers, 
  getUserById, 
  createUser, 
  updateUser, 
  deleteUser, 
  toggleUserStatus 
} = require('../controllers/userController');

// Test route
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Users routes working',
    timestamp: new Date().toISOString()
  });
});

// Get all users (SuperAdmin only)
router.get('/', verifyToken, requireSuperAdmin, getAllUsers);

// Get user by ID (SuperAdmin only)
router.get('/:id', verifyToken, requireSuperAdmin, getUserById);

// Create new user (SuperAdmin only)
router.post('/', verifyToken, requireSuperAdmin, createUser);

// Update user (SuperAdmin only)
router.put('/:id', verifyToken, requireSuperAdmin, updateUser);

// Delete user (SuperAdmin only)
router.delete('/:id', verifyToken, requireSuperAdmin, deleteUser);

// Toggle user status (SuperAdmin only)
router.put('/:id/toggle-status', verifyToken, requireSuperAdmin, toggleUserStatus);

module.exports = router; 