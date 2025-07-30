const express = require('express');
const AdminEmailController = require('../controllers/AdminEmailController');
const { authenticateAdmin } = require('../middleware/auth');
const { validateBody } = require('../middleware/validation');
const { emailValidation } = require('../utils/validation');

const router = express.Router();
const adminEmailController = new AdminEmailController();

/**
 * Admin Email Routes
 * All routes require admin authentication
 */

// Apply admin authentication middleware to all routes
router.use(authenticateAdmin);

/**
 * @route   POST /api/v1/admin/emails/send
 * @desc    Send custom email to customer
 * @access  Admin
 * @body    {customerEmail, customerName, subject, message, template?, orderId?}
 */
router.post('/send', 
  validateBody(emailValidation.send),
  (req, res) => adminEmailController.sendCustomEmail(req, res)
);

/**
 * @route   GET /api/v1/admin/emails/templates
 * @desc    Get available email templates
 * @access  Admin
 */
router.get('/templates', 
  (req, res) => adminEmailController.getEmailTemplates(req, res)
);

module.exports = router;