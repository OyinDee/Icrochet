const express = require('express');
const AdminOrderController = require('../controllers/AdminOrderController');
const { validateBody, validateParams, validateQuery, validateObjectId } = require('../middleware/validation');
const { authenticateAdmin } = require('../middleware/auth');
const { orderValidation, queryValidation } = require('../utils/validation');
const Joi = require('joi');

const router = express.Router();
const adminOrderController = new AdminOrderController();

// All routes require admin authentication
router.use(authenticateAdmin());

/**
 * @route GET /api/v1/admin/orders
 * @desc Get all orders with filtering and pagination
 * @access Private (Admin)
 */
router.get('/',
  validateQuery(Joi.object({
    ...queryValidation.pagination.describe().keys,
    ...queryValidation.sorting.describe().keys,
    ...queryValidation.orderFilter.describe().keys,
    ...queryValidation.dateRange.describe().keys,
    minAmount: Joi.number().min(0),
    maxAmount: Joi.number().min(0)
  })),
  adminOrderController.getAllOrders.bind(adminOrderController)
);

/**
 * @route GET /api/v1/admin/orders/statistics
 * @desc Get order statistics
 * @access Private (Admin)
 */
router.get('/statistics',
  validateQuery(Joi.object({
    ...queryValidation.dateRange.describe().keys,
    status: Joi.string().valid('pending', 'quote_needed', 'quoted', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled')
  })),
  adminOrderController.getOrderStatistics.bind(adminOrderController)
);

/**
 * @route GET /api/v1/admin/orders/recent
 * @desc Get recent orders
 * @access Private (Admin)
 */
router.get('/recent',
  validateQuery(Joi.object({
    limit: Joi.number().integer().min(1).max(50).default(10)
  })),
  adminOrderController.getRecentOrders.bind(adminOrderController)
);

/**
 * @route GET /api/v1/admin/orders/quotes-needed
 * @desc Get orders needing quotes
 * @access Private (Admin)
 */
router.get('/quotes-needed',
  validateQuery(Joi.object({
    ...queryValidation.pagination.describe().keys,
    ...queryValidation.sorting.describe().keys
  })),
  adminOrderController.getOrdersNeedingQuotes.bind(adminOrderController)
);

/**
 * @route GET /api/v1/admin/orders/attention
 * @desc Get orders requiring attention
 * @access Private (Admin)
 */
router.get('/attention',
  validateQuery(Joi.object({
    ...queryValidation.pagination.describe().keys,
    ...queryValidation.sorting.describe().keys
  })),
  adminOrderController.getOrdersRequiringAttention.bind(adminOrderController)
);

/**
 * @route GET /api/v1/admin/orders/search
 * @desc Search orders
 * @access Private (Admin)
 */
router.get('/search',
  validateQuery(Joi.object({
    q: Joi.string().trim().min(1).required(),
    ...queryValidation.pagination.describe().keys,
    ...queryValidation.sorting.describe().keys
  })),
  adminOrderController.searchOrders.bind(adminOrderController)
);

/**
 * @route GET /api/v1/admin/orders/status/:status
 * @desc Get orders by status
 * @access Private (Admin)
 */
router.get('/status/:status',
  validateParams(Joi.object({
    status: Joi.string().valid('pending', 'quote_needed', 'quoted', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled').required()
  })),
  validateQuery(Joi.object({
    ...queryValidation.pagination.describe().keys,
    ...queryValidation.sorting.describe().keys
  })),
  adminOrderController.getOrdersByStatus.bind(adminOrderController)
);

/**
 * @route GET /api/v1/admin/orders/customer/:customerEmail
 * @desc Get customer order history
 * @access Private (Admin)
 */
router.get('/customer/:customerEmail',
  validateParams(Joi.object({
    customerEmail: Joi.string().email().required()
  })),
  validateQuery(Joi.object({
    ...queryValidation.pagination.describe().keys,
    ...queryValidation.sorting.describe().keys
  })),
  adminOrderController.getCustomerOrderHistory.bind(adminOrderController)
);

/**
 * @route GET /api/v1/admin/orders/:id
 * @desc Get order by ID
 * @access Private (Admin)
 */
router.get('/:id',
  validateObjectId(),
  adminOrderController.getOrderById.bind(adminOrderController)
);

/**
 * @route GET /api/v1/admin/orders/:id/status-transitions
 * @desc Get valid status transitions for order
 * @access Private (Admin)
 */
router.get('/:id/status-transitions',
  validateObjectId(),
  adminOrderController.getValidStatusTransitions.bind(adminOrderController)
);

/**
 * @route PUT /api/v1/admin/orders/:id/status
 * @desc Update order status
 * @access Private (Admin)
 */
router.put('/:id/status',
  validateObjectId(),
  validateBody(orderValidation.updateStatus),
  adminOrderController.updateOrderStatus.bind(adminOrderController)
);

/**
 * @route PUT /api/v1/admin/orders/:id/quote
 * @desc Set custom quote for order
 * @access Private (Admin)
 */
router.put('/:id/quote',
  validateObjectId(),
  validateBody(orderValidation.quote),
  adminOrderController.setOrderQuote.bind(adminOrderController)
);

module.exports = router;