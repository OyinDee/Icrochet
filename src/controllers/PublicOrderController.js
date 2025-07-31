const { OrderService } = require('../services');
const logger = require('../config/logger');

/**
 * Controller for public order placement
 */
class PublicOrderController {
  constructor() {
    this.orderService = new OrderService();
  }

  /**
   * Create new order (customer order placement)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async createOrder(req, res) {
    try {
      logger.debug('Customer placing order:', {
        customerEmail: req.body.customerEmail,
        itemCount: req.body.items?.length || 0
      });

      const result = await this.orderService.createOrder(req.body);

      const statusCode = result.requiresQuote ? 202 : 201;

      logger.info('Order created successfully:', {
        orderId: result.order._id,
        customerEmail: result.order.customerEmail,
        requiresQuote: result.requiresQuote,
        totalAmount: result.order.totalAmount,
        estimatedAmount: result.order.estimatedAmount
      });

      res.status(statusCode).json({
        success: true,
        message: result.message,
        data: {
          order: {
            _id: result.order._id,
            customerName: result.order.customerName,
            customerEmail: result.order.customerEmail,
            customerPhone: result.order.customerPhone,
            shippingAddress: result.order.shippingAddress,
            items: result.order.items,
            totalAmount: result.order.totalAmount,
            estimatedAmount: result.order.estimatedAmount,
            status: result.order.status,
            hasCustomItems: result.order.hasCustomItems,
            createdAt: result.order.createdAt
          },
          requiresQuote: result.requiresQuote
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error creating order:', error);
      this.handleError(res, error, 'ORDER_CREATION_ERROR', 'Failed to create order');
    }
  }

  /**
   * Handle errors consistently
   * @param {Object} res - Express response object
   * @param {Error} error - Error object
   * @param {string} code - Error code
   * @param {string} message - Error message
   */
  handleError(res, error, code, message) {
    const statusCode = this.getStatusCodeFromError(error);
    
    res.status(statusCode).json({
      success: false,
      error: {
        code: error.code || code,
        message: error.message || message,
        details: error.details || {}
      },
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Get appropriate HTTP status code from error
   * @param {Error} error - Error object
   * @returns {number} HTTP status code
   */
  getStatusCodeFromError(error) {
    switch (error.code) {
      case 'ITEM_NOT_FOUND':
      case 'ITEMS_NOT_FOUND':
        return 404;
      case 'ITEM_NOT_AVAILABLE':
      case 'ITEMS_UNAVAILABLE':
      case 'COLOR_NOT_AVAILABLE':
      case 'INVALID_COLOR_SELECTION':
      case 'INVALID_CUSTOMER_NAME':
      case 'INVALID_CUSTOMER_EMAIL':
      case 'INVALID_SHIPPING_ADDRESS':
      case 'NO_ITEMS':
      case 'MISSING_ITEM_ID':
      case 'INVALID_QUANTITY':
      case 'INVALID_COLOR':
        return 400;
      case 'INSUFFICIENT_STOCK':
        return 409;
      default:
        return 500;
    }
  }
}

module.exports = PublicOrderController;