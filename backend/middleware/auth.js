const jwt = require('jsonwebtoken');
const { executeQuery } = require('../config/database');

// Verify JWT token
const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access token required'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if user still exists
    const userQuery = 'SELECT user_id, name, email, role, is_active FROM users WHERE user_id = ? AND is_active = TRUE';
    const userResult = await executeQuery(userQuery, [decoded.userId]);
    
    if (!userResult.success || userResult.data.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token - user not found'
      });
    }

    // Add user info to request
    req.user = userResult.data[0];
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    } else if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired'
      });
    }
    
    console.error('Auth middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authentication error'
    });
  }
};

// Check if user has required role
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const userRole = req.user.role;
    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
    }

    next();
  };
};

// Check if user is superadmin
const requireSuperAdmin = requireRole('superadmin');

// Check if user is admin or superadmin
const requireAdmin = requireRole(['admin', 'superadmin']);

// Optional authentication (doesn't fail if no token)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const userQuery = 'SELECT user_id, name, email, role, is_active FROM users WHERE user_id = ? AND is_active = TRUE';
    const userResult = await executeQuery(userQuery, [decoded.userId]);
    
    if (userResult.success && userResult.data.length > 0) {
      req.user = userResult.data[0];
    }
    
    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
};

module.exports = {
  verifyToken,
  requireRole,
  requireSuperAdmin,
  requireAdmin,
  optionalAuth
}; 