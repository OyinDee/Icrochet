const { OrderRepository, ItemRepository, ConversationRepository } = require('../repositories');
const logger = require('../config/logger');

/**
 * Service for Order business logic and processing
 */
class OrderService {
  constructor() {
    this.orderRepository = new OrderRepository();
    this.itemRepository = new ItemRepository();
    this.conversationRepository = new ConversationRepository();
  }

  /**
   * Get all orders with filtering and pagination
   * @param {Object} filters - Filter options
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Orders with pagination
   */
  async getAllOrders(filters = {}, options = {}) {
    try {
      logger.debug('Getting all orders with filters:', filters);

      // Build criteria from filters
      const criteria = this.buildFilterCriteria(filters);
      
      const result = await this.orderRepository.findWithItems(criteria, options);
      
      logger.info(`Retrieved ${result.data.length} orders`);
      return result;
    } catch (error) {
      logger.error('Error getting all orders:', error);
      throw error;
    }
  }

  /**
   * Get order by ID with items
   * @param {string} orderId - Order ID
   * @returns {Promise<Object|null>} Order with items or null
   */
  async getOrderById(orderId) {
    try {
      logger.debug('Getting order by ID:', orderId);

      const order = await this.orderRepository.findById(orderId, {
        populate: {
          path: 'items.itemId',
          select: 'name description pricingType price availableColors imageUrls'
        }
      });

      if (!order) {
        logger.warn('Order not found:', orderId);
        return null;
      }

      logger.debug('Order retrieved successfully:', orderId);
      return order;
    } catch (error) {
      logger.error('Error getting order by ID:', error);
      throw error;
    }
  }

  /**
   * Create new order with validation
   * @param {Object} orderData - Order data
   * @returns {Promise<Object>} Created order with processing result
   */
  async createOrder(orderData) {
    try {
      logger.debug('Creating order for customer:', orderData.customerEmail);

      // Validate order data
      this.validateOrderData(orderData);

      // Create order with validation (repository handles item validation)
      const order = await this.orderRepository.createWithValidation(orderData);

      // Create conversation if order has custom items
      if (order.hasCustomItems) {
        await this.conversationRepository.createForOrder(order._id, {
          customerEmail: order.customerEmail,
          customerName: order.customerName
        });
        logger.info('Conversation created for custom order:', order._id);
      }

      logger.info('Order created successfully:', order._id);
      
      return {
        success: true,
        order,
        message: order.hasCustomItems 
          ? 'Order created successfully. A quote will be provided soon.'
          : 'Order created successfully.',
        requiresQuote: order.hasCustomItems
      };
    } catch (error) {
      logger.error('Error creating order:', error);
      throw error;
    }
  }

  /**
   * Update order status with validation
   * @param {string} orderId - Order ID
   * @param {string} newStatus - New status
   * @param {Object} additionalData - Additional update data
   * @returns {Promise<Object>} Update result
   */
  async updateOrderStatus(orderId, newStatus, additionalData = {}) {
    try {
      logger.debug('Updating order status:', { orderId, newStatus });

      const updatedOrder = await this.orderRepository.updateStatus(orderId, newStatus, additionalData);

      if (!updatedOrder) {
        return {
          success: false,
          message: 'Order not found'
        };
      }

      logger.info('Order status updated successfully:', { orderId, newStatus });
      
      return {
        success: true,
        order: updatedOrder,
        message: `Order status updated to ${newStatus}`
      };
    } catch (error) {
      logger.error('Error updating order status:', error);
      throw error;
    }
  }

  /**
   * Set custom quote for order
   * @param {string} orderId - Order ID
   * @param {number} totalAmount - Quoted total amount
   * @param {string} notes - Quote notes
   * @returns {Promise<Object>} Quote result
   */
  async setOrderQuote(orderId, totalAmount, notes = '') {
    try {
      logger.debug('Setting quote for order:', { orderId, totalAmount });

      // Validate quote amount
      this.validateQuoteAmount(totalAmount);

      const updatedOrder = await this.orderRepository.setQuote(orderId, totalAmount, notes);

      if (!updatedOrder) {
        return {
          success: false,
          message: 'Order not found'
        };
      }

      logger.info('Quote set for order:', { orderId, totalAmount });
      
      return {
        success: true,
        order: updatedOrder,
        message: 'Quote has been set for the order'
      };
    } catch (error) {
      logger.error('Error setting order quote:', error);
      throw error;
    }
  }

  /**
   * Get orders by status
   * @param {string} status - Order status
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Orders with specified status
   */
  async getOrdersByStatus(status, options = {}) {
    try {
      logger.debug('Getting orders by status:', status);

      this.validateOrderStatus(status);

      const result = await this.orderRepository.findByStatus(status, options);
      
      logger.info(`Retrieved ${result.data.length} orders with status ${status}`);
      return result;
    } catch (error) {
      logger.error('Error getting orders by status:', error);
      throw error;
    }
  }

  /**
   * Get orders by customer email
   * @param {string} customerEmail - Customer email
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Customer orders
   */
  async getOrdersByCustomer(customerEmail, options = {}) {
    try {
      logger.debug('Getting orders by customer:', customerEmail);

      const result = await this.orderRepository.findByCustomerEmail(customerEmail, options);
      
      logger.info(`Retrieved ${result.data.length} orders for customer ${customerEmail}`);
      return result;
    } catch (error) {
      logger.error('Error getting orders by customer:', error);
      throw error;
    }
  }

  /**
   * Get orders within date range
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Orders within date range
   */
  async getOrdersByDateRange(startDate, endDate, options = {}) {
    try {
      logger.debug('Getting orders by date range:', { startDate, endDate });

      this.validateDateRange(startDate, endDate);

      const result = await this.orderRepository.findByDateRange(startDate, endDate, options);
      
      logger.info(`Retrieved ${result.data.length} orders in date range`);
      return result;
    } catch (error) {
      logger.error('Error getting orders by date range:', error);
      throw error;
    }
  }

  /**
   * Get orders needing quotes
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Orders needing quotes
   */
  async getOrdersNeedingQuotes(options = {}) {
    try {
      logger.debug('Getting orders needing quotes');

      const result = await this.orderRepository.findNeedingQuotes(options);
      
      logger.info(`Found ${result.data.length} orders needing quotes`);
      return result;
    } catch (error) {
      logger.error('Error getting orders needing quotes:', error);
      throw error;
    }
  }

  /**
   * Get orders requiring attention
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Orders requiring attention
   */
  async getOrdersRequiringAttention(options = {}) {
    try {
      logger.debug('Getting orders requiring attention');

      const result = await this.orderRepository.getOrdersRequiringAttention(options);
      
      logger.info(`Found ${result.data.length} orders requiring attention`);
      return result;
    } catch (error) {
      logger.error('Error getting orders requiring attention:', error);
      throw error;
    }
  }

  /**
   * Search orders
   * @param {string} searchTerm - Search term
   * @param {Object} options - Search options
   * @returns {Promise<Object>} Search results
   */
  async searchOrders(searchTerm, options = {}) {
    try {
      logger.debug('Searching orders:', searchTerm);

      const result = await this.orderRepository.search(searchTerm, options);
      
      logger.info(`Found ${result.data.length} orders matching search term`);
      return result;
    } catch (error) {
      logger.error('Error searching orders:', error);
      throw error;
    }
  }

  /**
   * Get order statistics
   * @param {Object} filters - Optional filters
   * @returns {Promise<Object>} Order statistics
   */
  async getOrderStatistics(filters = {}) {
    try {
      logger.debug('Getting order statistics with filters:', filters);

      const stats = await this.orderRepository.getStatistics(filters);
      
      logger.info('Order statistics retrieved');
      return stats;
    } catch (error) {
      logger.error('Error getting order statistics:', error);
      throw error;
    }
  }

  /**
   * Get recent orders
   * @param {number} limit - Number of recent orders
   * @returns {Promise<Array>} Recent orders
   */
  async getRecentOrders(limit = 10) {
    try {
      logger.debug('Getting recent orders:', limit);

      const orders = await this.orderRepository.getRecentOrders(limit);
      
      logger.info(`Retrieved ${orders.length} recent orders`);
      return orders;
    } catch (error) {
      logger.error('Error getting recent orders:', error);
      throw error;
    }
  }

  /**
   * Get customer order history with statistics
   * @param {string} customerEmail - Customer email
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Customer order history and stats
   */
  async getCustomerOrderHistory(customerEmail, options = {}) {
    try {
      logger.debug('Getting customer order history:', customerEmail);

      const result = await this.orderRepository.getCustomerHistory(customerEmail, options);
      
      logger.info(`Retrieved customer history for ${customerEmail}`);
      return result;
    } catch (error) {
      logger.error('Error getting customer order history:', error);
      throw error;
    }
  }

  /**
   * Calculate order total for items with fixed pricing
   * @param {Array} items - Order items
   * @returns {Promise<Object>} Calculation result
   */
  async calculateOrderTotal(items) {
    try {
      logger.debug('Calculating order total for items');

      let totalAmount = 0;
      let estimatedAmount = 0;
      let hasCustomItems = false;
      const processedItems = [];

      for (const orderItem of items) {
        const item = await this.itemRepository.findById(orderItem.itemId);
        
        if (!item) {
          const error = new Error(`Item not found: ${orderItem.itemId}`);
          error.code = 'ITEM_NOT_FOUND';
          throw error;
        }

        if (!item.isAvailable) {
          const error = new Error(`Item not available: ${item.name}`);
          error.code = 'ITEM_NOT_AVAILABLE';
          throw error;
        }

        const processedItem = {
          itemId: orderItem.itemId,
          quantity: orderItem.quantity,
          selectedColor: orderItem.selectedColor,
          customRequirements: orderItem.customRequirements
        };

        switch (item.pricingType) {
          case 'fixed':
            processedItem.unitPrice = item.price.fixed;
            processedItem.subtotal = item.price.fixed * orderItem.quantity;
            totalAmount += processedItem.subtotal;
            estimatedAmount += processedItem.subtotal;
            break;

          case 'range':
            const avgPrice = (item.price.min + item.price.max) / 2;
            processedItem.unitPrice = avgPrice;
            processedItem.subtotal = avgPrice * orderItem.quantity;
            estimatedAmount += processedItem.subtotal;
            break;

          case 'custom':
            hasCustomItems = true;
            processedItem.unitPrice = null;
            processedItem.subtotal = null;
            break;
        }

        processedItems.push(processedItem);
      }

      return {
        items: processedItems,
        totalAmount: hasCustomItems ? null : totalAmount,
        estimatedAmount: estimatedAmount > 0 ? estimatedAmount : null,
        hasCustomItems,
        canCalculateTotal: !hasCustomItems
      };
    } catch (error) {
      logger.error('Error calculating order total:', error);
      throw error;
    }
  }

  /**
   * Get valid status transitions for order
   * @param {string} orderId - Order ID
   * @returns {Promise<Object>} Valid transitions
   */
  async getValidStatusTransitions(orderId) {
    try {
      logger.debug('Getting valid status transitions for order:', orderId);

      const order = await this.orderRepository.findById(orderId);
      
      if (!order) {
        return {
          success: false,
          message: 'Order not found'
        };
      }

      const validTransitions = this.orderRepository.getValidStatusTransitions(order.status);
      
      return {
        success: true,
        currentStatus: order.status,
        validTransitions,
        statusDescriptions: this.getStatusDescriptions()
      };
    } catch (error) {
      logger.error('Error getting valid status transitions:', error);
      throw error;
    }
  }

  /**
   * Build filter criteria from filters object
   * @param {Object} filters - Filter options
   * @returns {Object} MongoDB criteria
   */
  buildFilterCriteria(filters) {
    const criteria = {};

    if (filters.status) {
      criteria.status = filters.status;
    }

    if (filters.customerEmail) {
      criteria.customerEmail = filters.customerEmail.toLowerCase();
    }

    if (filters.hasCustomItems !== undefined) {
      criteria.hasCustomItems = filters.hasCustomItems;
    }

    if (filters.dateFrom || filters.dateTo) {
      criteria.createdAt = {};
      if (filters.dateFrom) {
        criteria.createdAt.$gte = new Date(filters.dateFrom);
      }
      if (filters.dateTo) {
        criteria.createdAt.$lte = new Date(filters.dateTo);
      }
    }

    if (filters.minAmount !== undefined || filters.maxAmount !== undefined) {
      criteria.totalAmount = {};
      if (filters.minAmount !== undefined) {
        criteria.totalAmount.$gte = filters.minAmount;
      }
      if (filters.maxAmount !== undefined) {
        criteria.totalAmount.$lte = filters.maxAmount;
      }
    }

    return criteria;
  }

  /**
   * Validate order data
   * @param {Object} orderData - Order data
   * @throws {Error} If order data is invalid
   */
  validateOrderData(orderData) {
    if (!orderData.customerName || orderData.customerName.trim().length < 2) {
      const error = new Error('Customer name is required and must be at least 2 characters');
      error.code = 'INVALID_CUSTOMER_NAME';
      throw error;
    }

    if (!orderData.customerEmail || !this.isValidEmail(orderData.customerEmail)) {
      const error = new Error('Valid customer email is required');
      error.code = 'INVALID_CUSTOMER_EMAIL';
      throw error;
    }

    if (!orderData.shippingAddress || orderData.shippingAddress.trim().length < 10) {
      const error = new Error('Shipping address is required and must be at least 10 characters');
      error.code = 'INVALID_SHIPPING_ADDRESS';
      throw error;
    }

    if (!orderData.items || !Array.isArray(orderData.items) || orderData.items.length === 0) {
      const error = new Error('Order must contain at least one item');
      error.code = 'NO_ITEMS';
      throw error;
    }

    // Validate each item
    for (const item of orderData.items) {
      this.validateOrderItem(item);
    }
  }

  /**
   * Validate order item
   * @param {Object} item - Order item
   * @throws {Error} If item is invalid
   */
  validateOrderItem(item) {
    if (!item.itemId) {
      const error = new Error('Item ID is required');
      error.code = 'MISSING_ITEM_ID';
      throw error;
    }

    if (!item.quantity || item.quantity < 1 || item.quantity > 100) {
      const error = new Error('Quantity must be between 1 and 100');
      error.code = 'INVALID_QUANTITY';
      throw error;
    }

    if (item.selectedColor && typeof item.selectedColor !== 'string') {
      const error = new Error('Selected color must be a string');
      error.code = 'INVALID_COLOR';
      throw error;
    }
  }

  /**
   * Validate order status
   * @param {string} status - Order status
   * @throws {Error} If status is invalid
   */
  validateOrderStatus(status) {
    const validStatuses = ['pending', 'quote_needed', 'quoted', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
    
    if (!validStatuses.includes(status)) {
      const error = new Error('Invalid order status');
      error.code = 'INVALID_ORDER_STATUS';
      error.validStatuses = validStatuses;
      throw error;
    }
  }

  /**
   * Validate quote amount
   * @param {number} amount - Quote amount
   * @throws {Error} If amount is invalid
   */
  validateQuoteAmount(amount) {
    if (typeof amount !== 'number' || amount <= 0) {
      const error = new Error('Quote amount must be a positive number');
      error.code = 'INVALID_QUOTE_AMOUNT';
      throw error;
    }

    if (amount > 10000) {
      const error = new Error('Quote amount seems unusually high');
      error.code = 'HIGH_QUOTE_AMOUNT';
      throw error;
    }
  }

  /**
   * Validate date range
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @throws {Error} If date range is invalid
   */
  validateDateRange(startDate, endDate) {
    if (startDate && endDate && new Date(startDate) >= new Date(endDate)) {
      const error = new Error('Start date must be before end date');
      error.code = 'INVALID_DATE_RANGE';
      throw error;
    }
  }

  /**
   * Validate email format
   * @param {string} email - Email address
   * @returns {boolean} True if valid
   */
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Get status descriptions
   * @returns {Object} Status descriptions
   */
  getStatusDescriptions() {
    return {
      pending: 'Order is pending confirmation',
      quote_needed: 'Order requires custom pricing quote',
      quoted: 'Quote has been provided, awaiting customer approval',
      confirmed: 'Order has been confirmed and will be processed',
      processing: 'Order is being processed',
      shipped: 'Order has been shipped',
      delivered: 'Order has been delivered',
      cancelled: 'Order has been cancelled'
    };
  }
}

module.exports = OrderService;