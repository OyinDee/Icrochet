const express = require('express');
const AdminConversationController = require('../controllers/AdminConversationController');
const { authenticateAdmin } = require('../middleware/auth');
const { validateMultiple, validateParams, validateBody, validateQuery } = require('../middleware/validation');
const { conversationValidation, queryValidation, patterns } = require('../utils/validation');
const Joi = require('joi');

const router = express.Router();
const adminConversationController = new AdminConversationController();

// Apply authentication middleware to all routes
router.use(authenticateAdmin());

/**
 * @route GET /api/v1/admin/conversations
 * @desc Get all conversations with pagination and filtering
 * @access Private (Admin)
 */
router.get('/',
  validateQuery(Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    sortBy: Joi.string().default('createdAt'),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
    q: Joi.string().trim().min(1).max(100),
    isActive: Joi.boolean(),
    hasUnreadMessages: Joi.boolean()
  })),
  (req, res) => adminConversationController.getAllConversations(req, res)
);

/**
 * @route GET /api/v1/admin/conversations/attention
 * @desc Get conversations requiring admin attention
 * @access Private (Admin)
 */
router.get('/attention',
  validateQuery(Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    sortBy: Joi.string().default('createdAt'),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc')
  })),
  (req, res) => adminConversationController.getConversationsRequiringAttention(req, res)
);

/**
 * @route GET /api/v1/admin/conversations/recent
 * @desc Get recent conversations
 * @access Private (Admin)
 */
router.get('/recent',
  validateQuery(Joi.object({
    limit: Joi.number().integer().min(1).max(50).default(10)
  })),
  (req, res) => adminConversationController.getRecentConversations(req, res)
);

/**
 * @route GET /api/v1/admin/conversations/search
 * @desc Search conversations
 * @access Private (Admin)
 */
router.get('/search',
  validateQuery(Joi.object({
    q: Joi.string().trim().min(1).max(100).required(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    sortBy: Joi.string().default('createdAt'),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc')
  })),
  (req, res) => adminConversationController.searchConversations(req, res)
);

/**
 * @route GET /api/v1/admin/conversations/statistics
 * @desc Get conversation statistics
 * @access Private (Admin)
 */
router.get('/statistics',
  (req, res) => adminConversationController.getConversationStatistics(req, res)
);

/**
 * @route GET /api/v1/admin/conversations/customer/:customerEmail
 * @desc Get conversations by customer email
 * @access Private (Admin)
 */
router.get('/customer/:customerEmail',
  validateMultiple({
    params: Joi.object({
      customerEmail: patterns.email.required()
    }),
    query: Joi.object({
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(100).default(10),
      sortBy: Joi.string().default('createdAt'),
      sortOrder: Joi.string().valid('asc', 'desc').default('desc')
    })
  }),
  (req, res) => adminConversationController.getConversationsByCustomer(req, res)
);

/**
 * @route GET /api/v1/admin/conversations/:orderId
 * @desc Get conversation by order ID
 * @access Private (Admin)
 */
router.get('/:orderId',
  validateParams(Joi.object({
    orderId: patterns.objectId.required()
  })),
  (req, res) => adminConversationController.getConversationByOrderId(req, res)
);

/**
 * @route POST /api/v1/admin/conversations/:orderId/messages
 * @desc Send message in conversation
 * @access Private (Admin)
 */
router.post('/:orderId/messages',
  validateMultiple({
    params: Joi.object({
      orderId: patterns.objectId.required()
    }),
    body: conversationValidation.sendMessage
  }),
  (req, res) => adminConversationController.sendMessage(req, res)
);

/**
 * @route PUT /api/v1/admin/conversations/:orderId/read
 * @desc Mark messages as read
 * @access Private (Admin)
 */
router.put('/:orderId/read',
  validateParams(Joi.object({
    orderId: patterns.objectId.required()
  })),
  (req, res) => adminConversationController.markMessagesAsRead(req, res)
);

/**
 * @route PUT /api/v1/admin/conversations/:orderId/archive
 * @desc Archive conversation
 * @access Private (Admin)
 */
router.put('/:orderId/archive',
  validateParams(Joi.object({
    orderId: patterns.objectId.required()
  })),
  (req, res) => adminConversationController.archiveConversation(req, res)
);

/**
 * @route PUT /api/v1/admin/conversations/:orderId/reactivate
 * @desc Reactivate conversation
 * @access Private (Admin)
 */
router.put('/:orderId/reactivate',
  validateParams(Joi.object({
    orderId: patterns.objectId.required()
  })),
  (req, res) => adminConversationController.reactivateConversation(req, res)
);

module.exports = router;