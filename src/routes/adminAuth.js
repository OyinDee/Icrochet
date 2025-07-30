const express = require('express');
const AdminAuthController = require('../controllers/AdminAuthController');
const { validateBody } = require('../middleware/validation');
const { authenticateAdmin } = require('../middleware/auth');
const { adminUserValidation } = require('../utils/validation');

const router = express.Router();
const adminAuthController = new AdminAuthController();

/**
 * @route POST /api/v1/admin/auth/login
 * @desc Admin login
 * @access Public
 */
router.post('/login', 
  validateBody(adminUserValidation.login),
  adminAuthController.login.bind(adminAuthController)
);

/**
 * @route POST /api/v1/admin/auth/refresh
 * @desc Refresh access token
 * @access Public
 */
router.post('/refresh',
  adminAuthController.refresh.bind(adminAuthController)
);

/**
 * @route GET /api/v1/admin/auth/profile
 * @desc Get current admin profile
 * @access Private (Admin)
 */
router.get('/profile',
  authenticateAdmin(),
  adminAuthController.getProfile.bind(adminAuthController)
);

/**
 * @route PUT /api/v1/admin/auth/change-password
 * @desc Change admin password
 * @access Private (Admin)
 */
router.put('/change-password',
  authenticateAdmin(),
  validateBody(adminUserValidation.changePassword),
  adminAuthController.changePassword.bind(adminAuthController)
);

/**
 * @route POST /api/v1/admin/auth/logout
 * @desc Admin logout
 * @access Private (Admin)
 */
router.post('/logout',
  authenticateAdmin(),
  adminAuthController.logout.bind(adminAuthController)
);

/**
 * @route GET /api/v1/admin/auth/validate
 * @desc Validate token
 * @access Private (Admin)
 */
router.get('/validate',
  authenticateAdmin(),
  adminAuthController.validateToken.bind(adminAuthController)
);

module.exports = router;