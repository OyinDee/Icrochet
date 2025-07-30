const BaseRepository = require('./BaseRepository');
const { Order, Item } = require('../models');
const DatabaseUtils = require('../utils/database');
const logger = require('../config/logger');

/**
 * Repository for Order operations
 */
class OrderRepository extends BaseRepository {
  constructor() {
    super(Order);
  }

  /**
   * Find orders with populated item details
   * @param {Object} criteria - Search criteria
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Orders with populated items
   */
  async findWithItems(criteria = {}, options = {}) {
    try {
      logger.debug('Finding orders with items:', { criteria, options });
      
      const populateOptions = {
        path: 'items.itemId',
        select: 'name description pricingType price availableColors imageUrls'
      };

      const queryOptions = {
        ...options,
        populate: populateOptions
      };

      return await this.find(criteria, queryOptions);
    } catch (error) {
      logger.error('Error finding orders with items:', error);
      throw this._handleError(error);
    }
  }

  /**
   * Find orders by status
   * @param {string} status - Order status
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Orders with specified status
   */
  async findByStatus(status, options = {}) {
    try {
      logger.debug('Finding orders by status:', status);
      
      const criteria = { status };
      return await this.findWithItems(criteria, options);
    } catch (error) {
      logger.error('Error finding orders by status:', error);
      throw this._handleError(error);
    }
  }

  /**
   * Find orders by customer email
   * @param {string} customerEmail - Customer email
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Customer orders
   */
  async findByCustomerEmail(customerEmail, options = {}) {
    try {
      logger.debug('Finding orders by customer email:', customerEmail);
      
      const criteria = { customerEmail: customerEmail.toLowerCase() };
      return await this.findWithItems(criteria, options);
    } catch (error) {
      logger.error('Error finding orders by customer email:', error);
      throw this._handleError(error);
    }
  }

  /**
   * Find orders within date range
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Orders within date range
   */
  async findByDateRange(startDate, endDate, options = {}) {
    try {
      logger.debug('Finding orders by date range:', { startDate, endDate });
      
      const criteria = DatabaseUtils.buildDateRangeQuery(startDate, endDate, 'createdAt');
      return await this.findWithItems(criteria, options);
    } catch (error) {
      logger.error('Error finding orders by date range:', error);
      throw this._handleError(error);
    }
  }

  /**
   * Find orders that need quotes (custom pricing items)
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Orders needing quotes
   */
  async findNeedingQuotes(options = {}) {
    try {
      logger.debug('Finding orders needing quotes');
      
      const criteria = {
        $or: [
          { status: 'quote_needed' },
          { hasCustomItems: true, status: 'pending' }
        ]
      };

      return await this.findWithItems(criteria, options);
    } catch (error) {
      logger.error('Error finding orders needing quotes:', error);
      throw this._handleError(error);
    }
  }

  /**
   * Create order with item validation
   * @param {Object} orderData - Order data
   * @returns {Promise<Object>} Created order
   */
  async createWithValidation(orderData) {
    try {
      logger.debug('Creating order with validation:', orderData);
      
      // Validate items exist and are available
      const itemIds = orderData.items.map(item => item.itemId);
      const items = await Item.find({ _id: { $in: itemIds } });
      
      if (items.length !== itemIds.length) {
        const foundIds = items.map(item => item._id.toString());
        const missingIds = itemIds.filter(id => !foundIds.includes(id));
        const error = new Error(`Items not found: ${missingIds.join(', ')}`);
        error.code = 'ITEMS_NOT_FOUND';
        error.missingItems = missingIds;
        throw error;
      }

      // Check item availability
      const unavailableItems = items.filter(item => !item.isAvailable);
      if (unavailableItems.length > 0) {
        const error = new Error('Some items are not available');
        error.code = 'ITEMS_UNAVAILABLE';
        error.unavailableItems = unavailableItems.map(item => ({
          id: item._id,
          name: item.name
        }));
        throw error;
      }

      // Validate colors for each item
      for (const orderItem of orderData.items) {
        const item = items.find(i => i._id.toString() === orderItem.itemId);
        if (orderItem.selectedColor && item.availableColors && item.availableColors.length > 0) {
          const colorAvailable = item.availableColors.some(
            color => color.toLowerCase() === orderItem.selectedColor.toLowerCase()
          );
          if (!colorAvailable) {
            const error = new Error(`Color '${orderItem.selectedColor}' not available for item '${item.name}'`);
            error.code = 'COLOR_NOT_AVAILABLE';
            error.item = item.name;
            error.selectedColor = orderItem.selectedColor;
            error.availableColors = item.availableColors;
            throw error;
          }
        }
      }

      // Calculate pricing and determine if custom items exist
      let totalAmount = 0;
      let estimatedAmount = 0;
      let hasCustomItems = false;

      const processedItems = orderData.items.map(orderItem => {
        const item = items.find(i => i._id.toString() === orderItem.itemId);
        const processedItem = { ...orderItem };

        switch (item.pricingType) {
          case 'fixed':
            processedItem.unitPrice = item.price.fixed;
            processedItem.subtotal = item.price.fixed * orderItem.quantity;
            totalAmount += processedItem.subtotal;
            estimatedAmount += processedItem.subtotal;
            break;
          case 'range':
            // Use average of range for estimation
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

        return processedItem;
      });

      // Prepare order data
      const finalOrderData = {
        ...orderData,
        items: processedItems,
        totalAmount: hasCustomItems ? null : totalAmount,
        estimatedAmount: estimatedAmount > 0 ? estimatedAmount : null,
        hasCustomItems,
        status: hasCustomItems ? 'quote_needed' : 'pending'
      };

      const order = await this.create(finalOrderData);
      logger.info('Order created successfully:', order._id);
      
      return order;
    } catch (error) {
      logger.error('Error creating order with validation:', error);
      throw this._handleError(error);
    }
  }

  /**
   * Update order status with validation
   * @param {string} orderId - Order ID
   * @param {string} newStatus - New status
   * @param {Object} additionalData - Additional update data
   * @returns {Promise<Object|null>} Updated order
   */
  async updateStatus(orderId, newStatus, additionalData = {}) {
    try {
      logger.debug('Updating order status:', { orderId, newStatus, additionalData });
      
      // Validate status transition
      const order = await this.findById(orderId);
      if (!order) {
        return null;
      }

      const validTransitions = this.getValidStatusTransitions(order.status);
      if (!validTransitions.includes(newStatus)) {
        const error = new Error(`Invalid status transition from '${order.status}' to '${newStatus}'`);
        error.code = 'INVALID_STATUS_TRANSITION';
        error.currentStatus = order.status;
        error.requestedStatus = newStatus;
        error.validTransitions = validTransitions;
        throw error;
      }

      const updateData = {
        status: newStatus,
        ...additionalData
      };

      return await this.updateById(orderId, updateData);
    } catch (error) {
      logger.error('Error updating order status:', error);
      throw this._handleError(error);
    }
  }

  /**
   * Set custom quote for order
   * @param {string} orderId - Order ID
   * @param {number} totalAmount - Quoted total amount
   * @param {string} notes - Quote notes
   * @returns {Promise<Object|null>} Updated order
   */
  async setQuote(orderId, totalAmount, notes = '') {
    try {
      logger.debug('Setting quote for order:', { orderId, totalAmount, notes });
      
      const order = await this.findById(orderId);
      if (!order) {
        return null;
      }

      if (!order.hasCustomItems && order.status !== 'quote_needed') {
        const error = new Error('Order does not require a custom quote');
        error.code = 'QUOTE_NOT_REQUIRED';
        throw error;
      }

      const updateData = {
        totalAmount,
        status: 'quoted',
        notes: notes || order.notes
      };

      const updatedOrder = await this.updateById(orderId, updateData);
      logger.info('Quote set for order:', orderId);
      
      return updatedOrder;
    } catch (error) {
      logger.error('Error setting quote for order:', error);
      throw this._handleError(error);
    }
  }

  /**
   * Get valid status transitions for current status
   * @param {string} currentStatus - Current order status
   * @returns {Array} Valid next statuses
   */
  getValidStatusTransitions(currentStatus) {
    const transitions = {
      pending: ['confirmed', 'processing', 'cancelled'],
      quote_needed: ['quoted', 'cancelled'],
      quoted: ['confirmed', 'cancelled'],
      confirmed: ['processing', 'cancelled'],
      processing: ['shipped', 'cancelled'],
      shipped: ['delivered'],
      delivered: [], // Final state
      cancelled: [] // Final state
    };

    return transitions[currentStatus] || [];
  }

  /**
   * Get order statistics
   * @param {Object} filters - Optional filters (dateFrom, dateTo, status)
   * @returns {Promise<Object>} Order statistics
   */
  async getStatistics(filters = {}) {
    try {
      logger.debug('Getting order statistics:', filters);
      
      let matchCriteria = {};
      
      // Apply date filter
      if (filters.dateFrom || filters.dateTo) {
        matchCriteria = {
          ...matchCriteria,
          ...DatabaseUtils.buildDateRangeQuery(filters.dateFrom, filters.dateTo, 'createdAt')
        };
      }
      
      // Apply status filter
      if (filters.status) {
        matchCriteria.status = filters.status;
      }

      const pipeline = [
        { $match: matchCriteria },
        {
          $group: {
            _id: null,
            totalOrders: { $sum: 1 },
            totalRevenue: {
              $sum: {
                $cond: [
                  { $ne: ['$totalAmount', null] },
                  '$totalAmount',
                  0
                ]
              }
            },
            estimatedRevenue: {
              $sum: {
                $cond: [
                  { $ne: ['$estimatedAmount', null] },
                  '$estimatedAmount',
                  0
                ]
              }
            },
            averageOrderValue: {
              $avg: {
                $cond: [
                  { $ne: ['$totalAmount', null] },
                  '$totalAmount',
                  '$estimatedAmount'
                ]
              }
            },
            ordersByStatus: {
              $push: '$status'
            },
            customOrders: {
              $sum: { $cond: ['$hasCustomItems', 1, 0] }
            },
            totalItems: {
              $sum: {
                $sum: '$items.quantity'
              }
            }
          }
        },
        {
          $addFields: {
            statusBreakdown: {
              $arrayToObject: {
                $map: {
                  input: {
                    $setUnion: ['$ordersByStatus']
                  },
                  as: 'status',
                  in: {
                    k: '$$status',
                    v: {
                      $size: {
                        $filter: {
                          input: '$ordersByStatus',
                          cond: { $eq: ['$$this', '$$status'] }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      ];

      const [stats] = await this.aggregate(pipeline);
      
      return stats || {
        totalOrders: 0,
        totalRevenue: 0,
        estimatedRevenue: 0,
        averageOrderValue: 0,
        customOrders: 0,
        totalItems: 0,
        statusBreakdown: {}
      };
    } catch (error) {
      logger.error('Error getting order statistics:', error);
      throw this._handleError(error);
    }
  }

  /**
   * Get recent orders
   * @param {number} limit - Number of recent orders to fetch
   * @returns {Promise<Array>} Recent orders
   */
  async getRecentOrders(limit = 10) {
    try {
      logger.debug('Getting recent orders:', limit);
      
      const options = {
        limit,
        sort: { createdAt: -1 },
        populate: {
          path: 'items.itemId',
          select: 'name pricingType'
        }
      };

      const result = await this.find({}, options);
      return result.data;
    } catch (error) {
      logger.error('Error getting recent orders:', error);
      throw this._handleError(error);
    }
  }

  /**
   * Search orders by customer info or order details
   * @param {string} searchTerm - Search term
   * @param {Object} options - Search options
   * @returns {Promise<Object>} Search results
   */
  async search(searchTerm, options = {}) {
    try {
      logger.debug('Searching orders:', searchTerm);
      
      if (!searchTerm || searchTerm.trim().length === 0) {
        return await this.findWithItems({}, options);
      }

      const searchRegex = new RegExp(searchTerm.trim(), 'i');
      
      const criteria = {
        $or: [
          { customerName: searchRegex },
          { customerEmail: searchRegex },
          { customerPhone: searchRegex },
          { shippingAddress: searchRegex },
          { notes: searchRegex }
        ]
      };

      return await this.findWithItems(criteria, options);
    } catch (error) {
      logger.error('Error searching orders:', error);
      throw this._handleError(error);
    }
  }

  /**
   * Get orders requiring attention (quotes needed, processing, etc.)
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Orders requiring attention
   */
  async getOrdersRequiringAttention(options = {}) {
    try {
      logger.debug('Getting orders requiring attention');
      
      const criteria = {
        status: { $in: ['quote_needed', 'quoted', 'processing'] }
      };

      return await this.findWithItems(criteria, {
        ...options,
        sort: { createdAt: 1 } // Oldest first for attention
      });
    } catch (error) {
      logger.error('Error getting orders requiring attention:', error);
      throw this._handleError(error);
    }
  }

  /**
   * Get customer order history
   * @param {string} customerEmail - Customer email
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Customer order history with statistics
   */
  async getCustomerHistory(customerEmail, options = {}) {
    try {
      logger.debug('Getting customer order history:', customerEmail);
      
      const orders = await this.findByCustomerEmail(customerEmail, options);
      
      // Calculate customer statistics
      const pipeline = [
        { $match: { customerEmail: customerEmail.toLowerCase() } },
        {
          $group: {
            _id: null,
            totalOrders: { $sum: 1 },
            totalSpent: {
              $sum: {
                $cond: [
                  { $ne: ['$totalAmount', null] },
                  '$totalAmount',
                  { $ifNull: ['$estimatedAmount', 0] }
                ]
              }
            },
            averageOrderValue: {
              $avg: {
                $cond: [
                  { $ne: ['$totalAmount', null] },
                  '$totalAmount',
                  '$estimatedAmount'
                ]
              }
            },
            lastOrderDate: { $max: '$createdAt' },
            firstOrderDate: { $min: '$createdAt' }
          }
        }
      ];

      const [customerStats] = await this.aggregate(pipeline);
      
      return {
        orders,
        customerStatistics: customerStats || {
          totalOrders: 0,
          totalSpent: 0,
          averageOrderValue: 0,
          lastOrderDate: null,
          firstOrderDate: null
        }
      };
    } catch (error) {
      logger.error('Error getting customer history:', error);
      throw this._handleError(error);
    }
  }
}

module.exports = OrderRepository;
