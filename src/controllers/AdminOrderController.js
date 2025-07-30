const { OrderService } = require('../services');
const logger = require('../config/logger');

/**
 * Controller for admin order management
 */
class AdminOrderController {
  constructor() {
    this.orderService = new OrderService();
  }

  /**
   * Get all orders
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getAllOrders(req, res) {
    try {
      logger.debug('Admin getting all orders with filters:', req.query);

      const filters = this.buildFilters(req.query);
      const options = this.buildOptions(req.query);

      const result = await this.orderService.getAllOrders(filters, options);

      res.status(200).json({
        success: true,
        message: 'Orders retrieved successfully',
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error getting all orders:', error);
      this.handleError(res, error, 'ORDERS_FETCH_ERROR', 'Failed to retrieve orders');
    }
  }

  /**
   * Get order by ID
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getOrderById(req, res) {
    try {
      const { id } = req.params;
      logger.debug('Admin getting order by ID:', id);

      const order = await this.orderService.getOrderById(id);

      if (!order) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'ORDER_NOT_FOUND',
            message: 'Order not found',
            details: {}
          },
          timestamp: new Date().toISOString()
        });
      }

      res.status(200).json({
        success: true,
        message: 'Order retrieved successfully',
        data: { order },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error getting order by ID:', error);
      this.handleError(res, error, 'ORDER_FETCH_ERROR', 'Failed to retrieve order');
    }
  }

  /**
   * Update order status
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async updateOrderStatus(req, res) {
    try {
      const { id } = req.params;
      const { status, notes } = req.body;
      
      logger.debug('Admin updating order status:', { id, status });

      const result = await this.orderService.updateOrderStatus(id, status, { notes });

      if (!result.success) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'ORDER_NOT_FOUND',
            message: result.message,
            details: {}
          },
          timestamp: new Date().toISOString()
        });
      }

      logger.info('Order status updated by admin:', { orderId: id, status, adminId: req.user.id });

      res.status(200).json({
        success: true,
        message: result.message,
        data: { order: result.order },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error updating order status:', error);
      this.handleError(res, error, 'ORDER_STATUS_UPDATE_ERROR', 'Failed to update order status');
    }
  }

  /**
   * Set custom quote for order
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async setOrderQuote(req, res) {
    try {
      const { id } = req.params;
      const { totalAmount, notes } = req.body;
      
      logger.debug('Admin setting order quote:', { id, totalAmount });

      const result = await this.orderService.setOrderQuote(id, totalAmount, notes);

      if (!result.success) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'ORDER_NOT_FOUND',
            message: result.message,
            details: {}
          },
          timestamp: new Date().toISOString()
        });
      }

      logger.info('Order quote set by admin:', { orderId: id, totalAmount, adminId: req.user.id });

      res.status(200).json({
        success: true,
        message: result.message,
        data: { order: result.order },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error setting order quote:', error);
      this.handleError(res, error, 'ORDER_QUOTE_ERROR', 'Failed to set order quote');
    }
  }

  /**
   * Get orders by status
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getOrdersByStatus(req, res) {
    try {
      const { status } = req.params;
      logger.debug('Admin getting orders by status:', status);

      const options = this.buildOptions(req.query);
      const result = await this.orderService.getOrdersByStatus(status, options);

      res.status(200).json({
        success: true,
        message: 'Orders retrieved successfully',
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error getting orders by status:', error);
      this.handleError(res, error, 'STATUS_ORDERS_ERROR', 'Failed to retrieve orders by status');
    }
  }

  /**
   * Get orders needing quotes
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getOrdersNeedingQuotes(req, res) {
    try {
      logger.debug('Admin getting orders needing quotes');

      const options = this.buildOptions(req.query);
      const result = await this.orderService.getOrdersNeedingQuotes(options);

      res.status(200).json({
        success: true,
        message: 'Orders needing quotes retrieved successfully',
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error getting orders needing quotes:', error);
      this.handleError(res, error, 'QUOTE_ORDERS_ERROR', 'Failed to retrieve orders needing quotes');
    }
  }

  /**
   * Get orders requiring attention
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getOrdersRequiringAttention(req, res) {
    try {
      logger.debug('Admin getting orders requiring attention');

      const options = this.buildOptions(req.query);
      const result = await this.orderService.getOrdersRequiringAttention(options);

      res.status(200).json({
        success: true,
        message: 'Orders requiring attention retrieved successfully',
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error getting orders requiring attention:', error);
      this.handleError(res, error, 'ATTENTION_ORDERS_ERROR', 'Failed to retrieve orders requiring attention');
    }
  }

  /**
   * Search orders
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async searchOrders(req, res) {
    try {
      const { q: searchTerm } = req.query;
      logger.debug('Admin searching orders:', searchTerm);

      const options = this.buildOptions(req.query);
      const result = await this.orderService.searchOrders(searchTerm, options);

      res.status(200).json({
        success: true,
        message: 'Search completed successfully',
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error searching orders:', error);
      this.handleError(res, error, 'ORDER_SEARCH_ERROR', 'Failed to search orders');
    }
  }

  /**
   * Get order statistics
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getOrderStatistics(req, res) {
    try {
      logger.debug('Admin getting order statistics');

      const filters = this.buildFilters(req.query);
      const stats = await this.orderService.getOrderStatistics(filters);

      res.status(200).json({
        success: true,
        message: 'Statistics retrieved successfully',
        data: { statistics: stats },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error getting order statistics:', error);
      this.handleError(res, error, 'STATISTICS_ERROR', 'Failed to retrieve statistics');
    }
  }

  /**
   * Get recent orders
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getRecentOrders(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 10;
      logger.debug('Admin getting recent orders:', limit);

      const orders = await this.orderService.getRecentOrders(limit);

      res.status(200).json({
        success: true,
        message: 'Recent orders retrieved successfully',
        data: { orders },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error getting recent orders:', error);
      this.handleError(res, error, 'RECENT_ORDERS_ERROR', 'Failed to retrieve recent orders');
    }
  }

  /**
   * Get customer order history
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getCustomerOrderHistory(req, res) {
    try {
      const { customerEmail } = req.params;
      logger.debug('Admin getting customer order history:', customerEmail);

      const options = this.buildOptions(req.query);
      const result = await this.orderService.getCustomerOrderHistory(customerEmail, options);

      res.status(200).json({
        success: true,
        message: 'Customer order history retrieved successfully',
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error getting customer order history:', error);
      this.handleError(res, error, 'CUSTOMER_HISTORY_ERROR', 'Failed to retrieve customer order history');
    }
  }

  /**
   * Get valid status transitions for order
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getValidStatusTransitions(req, res) {
    try {
      const { id } = req.params;
      logger.debug('Admin getting valid status transitions for order:', id);

      const result = await this.orderService.getValidStatusTransitions(id);

      if (!result.success) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'ORDER_NOT_FOUND',
            message: result.message,
            details: {}
          },
          timestamp: new Date().toISOString()
        });
      }

      res.status(200).json({
        success: true,
        message: 'Valid status transitions retrieved successfully',
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error getting valid status transitions:', error);
      this.handleError(res, error, 'STATUS_TRANSITIONS_ERROR', 'Failed to retrieve valid status transitions');
    }
  }

  /**
   * Build filters from query parameters
   * @param {Object} query - Query parameters
   * @returns {Object} Filters object
   */
  buildFilters(query) {
    const filters = {};

    if (query.status) {
      filters.status = query.status;
    }

    if (query.customerEmail) {
      filters.customerEmail = query.customerEmail;
    }

    if (query.hasCustomItems !== undefined) {
      filters.hasCustomItems = query.hasCustomItems === 'true';
    }

    if (query.dateFrom) {
      filters.dateFrom = query.dateFrom;
    }

    if (query.dateTo) {
      filters.dateTo = query.dateTo;
    }

    if (query.minAmount !== undefined) {
      filters.minAmount = parseFloat(query.minAmount);
    }

    if (query.maxAmount !== undefined) {
      filters.maxAmount = parseFloat(query.maxAmount);
    }

    return filters;
  }

  /**
   * Build options from query parameters
   * @param {Object} query - Query parameters
   * @returns {Object} Options object
   */
  buildOptions(query) {
    const options = {};

    if (query.page) {
      options.page = parseInt(query.page);
    }

    if (query.limit) {
      options.limit = parseInt(query.limit);
    }

    if (query.sortBy) {
      options.sort = {};
      options.sort[query.sortBy] = query.sortOrder === 'asc' ? 1 : -1;
    }

    return options;
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
      case 'ORDER_NOT_FOUND':
      case 'ITEM_NOT_FOUND':
        return 404;
      case 'INVALID_ORDER_STATUS':
      case 'INVALID_QUOTE_AMOUNT':
      case 'HIGH_QUOTE_AMOUNT':
      case 'INVALID_DATE_RANGE':
      case 'QUOTE_NOT_REQUIRED':
        return 400;
      case 'INVALID_STATUS_TRANSITION':
        return 409;
      default:
        return 500;
    }
  }
}

module.exports = AdminOrderController;