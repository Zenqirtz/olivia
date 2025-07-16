const express = require('express');
const router = express.Router();

// Import controllers
const authController = require('../controllers/authController');

// Import middleware
const { verifyToken, requireSuperAdmin } = require('../middleware/auth');
const { 
  validateLogin, 
  validateUserRegistration, 
  validateUserUpdate, 
  validatePasswordChange 
} = require('../middleware/validation');

// Test route
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Auth routes working',
    timestamp: new Date().toISOString()
  });
});

// Public routes (no authentication required)
router.post('/login', validateLogin, authController.login);

// Protected routes (authentication required)
router.use(verifyToken); // All routes below require authentication

// Profile management
router.get('/profile', authController.getProfile);
router.put('/profile', validateUserUpdate, authController.updateProfile);
router.put('/change-password', validatePasswordChange, authController.changePassword);

// Token verification
router.get('/verify', authController.verifyToken);
router.post('/logout', authController.logout);

// SuperAdmin only routes
router.post('/register', requireSuperAdmin, validateUserRegistration, authController.register);

module.exports = router; 