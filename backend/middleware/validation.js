const { body, param, query, validationResult } = require('express-validator');

// Handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

// Login validation
const validateLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  handleValidationErrors
];

// User registration validation
const validateUserRegistration = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 6 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
  body('role')
    .optional()
    .isIn(['admin', 'superadmin'])
    .withMessage('Role must be either admin or superadmin'),
  body('phone')
    .optional()
    .isMobilePhone()
    .withMessage('Valid phone number is required'),
  handleValidationErrors
];

// User update validation
const validateUserUpdate = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('phone')
    .optional()
    .isMobilePhone()
    .withMessage('Valid phone number is required'),
  body('bio')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Bio must not exceed 500 characters'),
  body('role')
    .optional()
    .isIn(['admin', 'superadmin'])
    .withMessage('Role must be either admin or superadmin'),
  body('avatar_url')
    .optional()
    .custom((value) => {
      // Check if it's a base64 string starting with data:image
      if (value && !value.startsWith('data:image/')) {
        throw new Error('Avatar must be a valid base64 encoded image');
      }
      // Optional: Check size limit (approximately)
      if (value && value.length > 5000000) { // ~5MB limit
        throw new Error('Avatar image is too large (max 5MB)');
      }
      return true;
    }),
  handleValidationErrors
];

// Password change validation
const validatePasswordChange = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 6 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('New password must contain at least one lowercase letter, one uppercase letter, and one number'),
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Password confirmation does not match');
      }
      return true;
    }),
  handleValidationErrors
];

// ESP32 device validation
const validateESP32Device = [
  body('device_name')
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Device name must be between 3 and 100 characters'),
  body('device_type')
    .isIn(['esp32_cam_ai_scanner', 'esp32_devkit_controller'])
    .withMessage('Device type must be esp32_cam_ai_scanner or esp32_devkit_controller'),
  body('mac_address')
    .matches(/^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/)
    .withMessage('Valid MAC address is required'),
  body('ip_address')
    .optional()
    .isIP()
    .withMessage('Valid IP address is required'),
  body('wifi_ssid')
    .optional()
    .isLength({ max: 100 })
    .withMessage('WiFi SSID must not exceed 100 characters'),
  handleValidationErrors
];

// Egg scan data validation
const validateEggScan = [
  body('egg_code')
    .trim()
    .matches(/^EGG-\d{8}-\d{4}$/)
    .withMessage('Egg code must follow format: EGG-YYYYMMDD-NNNN'),
  body('cam_device_id')
    .isInt({ min: 1 })
    .withMessage('Valid camera device ID is required'),
  body('controller_device_id')
    .isInt({ min: 1 })
    .withMessage('Valid controller device ID is required'),
  body('quality')
    .isIn(['good', 'bad', 'uncertain'])
    .withMessage('Quality must be good, bad, or uncertain'),
  body('ai_confidence')
    .isFloat({ min: 0, max: 1 })
    .withMessage('AI confidence must be between 0 and 1'),
  body('weight')
    .optional()
    .isFloat({ min: 0, max: 200 })
    .withMessage('Weight must be between 0 and 200 grams'),
  body('length')
    .optional()
    .isFloat({ min: 0, max: 20 })
    .withMessage('Length must be between 0 and 20 cm'),
  body('width')
    .optional()
    .isFloat({ min: 0, max: 20 })
    .withMessage('Width must be between 0 and 20 cm'),
  body('height')
    .optional()
    .isFloat({ min: 0, max: 20 })
    .withMessage('Height must be between 0 and 20 cm'),
  handleValidationErrors
];

// Pagination validation
const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('sort')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort must be asc or desc'),
  handleValidationErrors
];

// Date range validation
const validateDateRange = [
  query('start_date')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid ISO 8601 date'),
  query('end_date')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid ISO 8601 date'),
  handleValidationErrors
];

// ID parameter validation
const validateId = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID must be a positive integer'),
  handleValidationErrors
];

module.exports = {
  handleValidationErrors,
  validateLogin,
  validateUserRegistration,
  validateUserUpdate,
  validatePasswordChange,
  validateESP32Device,
  validateEggScan,
  validatePagination,
  validateDateRange,
  validateId
}; 