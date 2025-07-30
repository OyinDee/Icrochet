const BaseRepository = require('./BaseRepository');
const { Conversation, Order } = require('../models');
const DatabaseUtils = require('../utils/database');
const logger = require('../config/logger');

/**
 * Repository for Conversation operations
 */
class ConversationRepository extends BaseRepository {
  constructor() {
    super(Conversation);
  }

  /**
   * Find conversation by order ID
   * @param {string} orderId - Order ID
   * @returns {Promise<Object|null>} Conversation or null
   */
  async findByOrderId(orderId) {
    try {
      logger.debug('Finding conversation by order ID:', orderId);
      
      if (!DatabaseUtils.isValidObjectId(orderId)) {
        return null;
      }

      return await this.findOne({ orderId });
    } catch (error) {
      logger.error('Error finding conversation by order ID:', error);
      throw this._handleError(error);
    }
  }

  /**
   * Create conversation for order
   * @param {string} orderId - Order ID
   * @param {Object} orderData - Order data for customer info
   * @returns {Promise<Object>} Created conversation
   */
  async createForOrder(orderId, orderData) {
    try {
      logger.debug('Creating conversation for order:', orderId);
      
      // Check if conversation already exists
      const existingConversation = await this.findByOrderId(orderId);
      if (existingConversation) {
        logger.info('Conversation already exists for order:', orderId);
        return existingConversation;
      }

      const conversationData = {
        orderId,
        customerEmail: orderData.customerEmail,
        customerName: orderData.customerName,
        messages: []
      };

      const conversation = await this.create(conversationData);
      logger.info('Conversation created for order:', orderId);
      
      return conversation;
    } catch (error) {
      logger.error('Error creating conversation for order:', error);
      throw this._handleError(error);
    }
  }

  /**
   * Add message to conversation
   * @param {string} orderId - Order ID
   * @param {string} sender - Message sender ('admin' or 'customer')
   * @param {string} content - Message content
   * @param {Object} options - Message options (isQuote, quoteAmount)
   * @returns {Promise<Object>} Updated conversation
   */
  async addMessage(orderId, sender, content, options = {}) {
    try {
      logger.debug('Adding message to conversation:', { orderId, sender, content, options });
      
      let conversation = await this.findByOrderId(orderId);
      
      // If conversation doesn't exist, create it
      if (!conversation) {
        const order = await Order.findById(orderId);
        if (!order) {
          const error = new Error('Order not found');
          error.code = 'ORDER_NOT_FOUND';
          throw error;
        }
        
        conversation = await this.createForOrder(orderId, order);
      }

      // Create message object
      const message = {
        sender,
        content,
        timestamp: new Date(),
        isQuote: options.isQuote || false,
        quoteAmount: options.isQuote ? options.quoteAmount : null,
        isRead: false
      };

      // Add message to conversation
      const updateData = {
        $push: { messages: message },
        lastMessageAt: message.timestamp,
        updatedAt: new Date()
      };

      const updatedConversation = await this.updateById(conversation._id, updateData);
      logger.info('Message added to conversation:', { orderId, sender });
      
      return updatedConversation;
    } catch (error) {
      logger.error('Error adding message to conversation:', error);
      throw this._handleError(error);
    }
  }

  /**
   * Mark messages as read
   * @param {string} orderId - Order ID
   * @param {string} reader - Who is marking as read ('admin' or 'customer')
   * @returns {Promise<Object|null>} Updated conversation
   */
  async markMessagesAsRead(orderId, reader) {
    try {
      logger.debug('Marking messages as read:', { orderId, reader });
      
      const conversation = await this.findByOrderId(orderId);
      if (!conversation) {
        return null;
      }

      // Mark messages from the other party as read
      const otherSender = reader === 'admin' ? 'customer' : 'admin';
      
      const updateData = {
        $set: {
          'messages.$[elem].isRead': true,
          updatedAt: new Date()
        }
      };

      const arrayFilters = [
        { 'elem.sender': otherSender, 'elem.isRead': false }
      ];

      const updatedConversation = await this.model.findByIdAndUpdate(
        conversation._id,
        updateData,
        { 
          new: true,
          arrayFilters
        }
      );

      logger.info('Messages marked as read:', { orderId, reader });
      return updatedConversation;
    } catch (error) {
      logger.error('Error marking messages as read:', error);
      throw this._handleError(error);
    }
  }

  /**
   * Get conversations with unread message counts
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Conversations with unread counts
   */
  async findWithUnreadCounts(options = {}) {
    try {
      logger.debug('Finding conversations with unread counts');
      
      const {
        page = 1,
        limit = 10,
        sort = { lastMessageAt: -1 },
        isActive = true
      } = options;

      const criteria = { isActive };
      
      const pipeline = [
        { $match: criteria },
        {
          $addFields: {
            unreadByAdmin: {
              $size: {
                $filter: {
                  input: '$messages',
                  cond: {
                    $and: [
                      { $eq: ['$$this.sender', 'customer'] },
                      { $eq: ['$$this.isRead', false] }
                    ]
                  }
                }
              }
            },
            unreadByCustomer: {
              $size: {
                $filter: {
                  input: '$messages',
                  cond: {
                    $and: [
                      { $eq: ['$$this.sender', 'admin'] },
                      { $eq: ['$$this.isRead', false] }
                    ]
                  }
                }
              }
            },
            messageCount: { $size: '$messages' },
            lastMessage: {
              $cond: [
                { $gt: [{ $size: '$messages' }, 0] },
                { $arrayElemAt: ['$messages', -1] },
                null
              ]
            }
          }
        },
        {
          $lookup: {
            from: 'orders',
            localField: 'orderId',
            foreignField: '_id',
            as: 'order'
          }
        },
        {
          $addFields: {
            order: { $arrayElemAt: ['$order', 0] }
          }
        },
        { $sort: sort }
      ];

      // Get total count
      const countPipeline = [
        { $match: criteria },
        { $count: 'total' }
      ];

      const [countResult] = await this.model.aggregate(countPipeline);
      const totalCount = countResult ? countResult.total : 0;

      // Add pagination
      const skip = (page - 1) * limit;
      pipeline.push({ $skip: skip }, { $limit: limit });

      const conversations = await this.model.aggregate(pipeline);
      const totalPages = Math.ceil(totalCount / limit);

      return {
        data: conversations,
        pagination: {
          currentPage: page,
          totalPages,
          totalCount,
          limit,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      };
    } catch (error) {
      logger.error('Error finding conversations with unread counts:', error);
      throw this._handleError(error);
    }
  }

  /**
   * Get conversation statistics
   * @returns {Promise<Object>} Conversation statistics
   */
  async getStatistics() {
    try {
      logger.debug('Getting conversation statistics');
      
      const pipeline = [
        {
          $group: {
            _id: null,
            totalConversations: { $sum: 1 },
            activeConversations: {
              $sum: { $cond: ['$isActive', 1, 0] }
            },
            totalMessages: {
              $sum: { $size: '$messages' }
            },
            averageMessagesPerConversation: {
              $avg: { $size: '$messages' }
            },
            conversationsWithQuotes: {
              $sum: {
                $cond: [
                  {
                    $gt: [
                      {
                        $size: {
                          $filter: {
                            input: '$messages',
                            cond: { $eq: ['$$this.isQuote', true] }
                          }
                        }
                      },
                      0
                    ]
                  },
                  1,
                  0
                ]
              }
            },
            totalUnreadByAdmin: {
              $sum: {
                $size: {
                  $filter: {
                    input: '$messages',
                    cond: {
                      $and: [
                        { $eq: ['$$this.sender', 'customer'] },
                        { $eq: ['$$this.isRead', false] }
                      ]
                    }
                  }
                }
              }
            },
            totalUnreadByCustomer: {
              $sum: {
                $size: {
                  $filter: {
                    input: '$messages',
                    cond: {
                      $and: [
                        { $eq: ['$$this.sender', 'admin'] },
                        { $eq: ['$$this.isRead', false] }
                      ]
                    }
                  }
                }
              }
            }
          }
        }
      ];

      const [stats] = await this.model.aggregate(pipeline);
      
      return stats || {
        totalConversations: 0,
        activeConversations: 0,
        totalMessages: 0,
        averageMessagesPerConversation: 0,
        conversationsWithQuotes: 0,
        totalUnreadByAdmin: 0,
        totalUnreadByCustomer: 0
      };
    } catch (error) {
      logger.error('Error getting conversation statistics:', error);
      throw this._handleError(error);
    }
  }

  /**
   * Find conversations by customer email
   * @param {string} customerEmail - Customer email
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Customer conversations
   */
  async findByCustomerEmail(customerEmail, options = {}) {
    try {
      logger.debug('Finding conversations by customer email:', customerEmail);
      
      const criteria = { customerEmail: customerEmail.toLowerCase() };
      const result = await this.find(criteria, options);
      
      // Convert documents to data for consistency with other methods
      return {
        data: result.documents,
        pagination: result.pagination
      };
    } catch (error) {
      logger.error('Error finding conversations by customer email:', error);
      throw this._handleError(error);
    }
  }

  /**
   * Get recent conversations
   * @param {number} limit - Number of recent conversations
   * @returns {Promise<Array>} Recent conversations
   */
  async getRecentConversations(limit = 10) {
    try {
      logger.debug('Getting recent conversations:', limit);
      
      const options = {
        limit,
        sort: { lastMessageAt: -1 }
      };

      const result = await this.findWithUnreadCounts(options);
      return result.data;
    } catch (error) {
      logger.error('Error getting recent conversations:', error);
      throw this._handleError(error);
    }
  }

  /**
   * Search conversations by customer info or message content
   * @param {string} searchTerm - Search term
   * @param {Object} options - Search options
   * @returns {Promise<Object>} Search results
   */
  async search(searchTerm, options = {}) {
    try {
      logger.debug('Searching conversations:', searchTerm);
      
      if (!searchTerm || searchTerm.trim().length === 0) {
        return await this.findWithUnreadCounts(options);
      }

      const searchRegex = new RegExp(searchTerm.trim(), 'i');
      
      const criteria = {
        $or: [
          { customerName: searchRegex },
          { customerEmail: searchRegex },
          { 'messages.content': searchRegex }
        ]
      };

      // Use aggregation for search with message content
      const pipeline = [
        { $match: criteria },
        {
          $addFields: {
            unreadByAdmin: {
              $size: {
                $filter: {
                  input: '$messages',
                  cond: {
                    $and: [
                      { $eq: ['$$this.sender', 'customer'] },
                      { $eq: ['$$this.isRead', false] }
                    ]
                  }
                }
              }
            },
            messageCount: { $size: '$messages' },
            lastMessage: {
              $cond: [
                { $gt: [{ $size: '$messages' }, 0] },
                { $arrayElemAt: ['$messages', -1] },
                null
              ]
            }
          }
        },
        {
          $lookup: {
            from: 'orders',
            localField: 'orderId',
            foreignField: '_id',
            as: 'order'
          }
        },
        {
          $addFields: {
            order: { $arrayElemAt: ['$order', 0] }
          }
        },
        { $sort: { lastMessageAt: -1 } }
      ];

      // Add pagination
      const { page = 1, limit = 10 } = options;
      const skip = (page - 1) * limit;
      
      // Get count
      const countPipeline = [...pipeline, { $count: 'total' }];
      const [countResult] = await this.model.aggregate(countPipeline);
      const totalCount = countResult ? countResult.total : 0;
      
      // Add pagination to main pipeline
      pipeline.push({ $skip: skip }, { $limit: limit });
      
      const conversations = await this.model.aggregate(pipeline);
      const totalPages = Math.ceil(totalCount / limit);

      return {
        data: conversations,
        pagination: {
          currentPage: page,
          totalPages,
          totalCount,
          limit,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      };
    } catch (error) {
      logger.error('Error searching conversations:', error);
      throw this._handleError(error);
    }
  }

  /**
   * Archive conversation (set as inactive)
   * @param {string} orderId - Order ID
   * @returns {Promise<Object|null>} Updated conversation
   */
  async archive(orderId) {
    try {
      logger.debug('Archiving conversation:', orderId);
      
      const conversation = await this.findByOrderId(orderId);
      if (!conversation) {
        return null;
      }

      const updatedConversation = await this.updateById(conversation._id, { 
        isActive: false,
        updatedAt: new Date()
      });

      logger.info('Conversation archived:', orderId);
      return updatedConversation;
    } catch (error) {
      logger.error('Error archiving conversation:', error);
      throw this._handleError(error);
    }
  }

  /**
   * Reactivate conversation
   * @param {string} orderId - Order ID
   * @returns {Promise<Object|null>} Updated conversation
   */
  async reactivate(orderId) {
    try {
      logger.debug('Reactivating conversation:', orderId);
      
      const conversation = await this.findByOrderId(orderId);
      if (!conversation) {
        return null;
      }

      const updatedConversation = await this.updateById(conversation._id, { 
        isActive: true,
        updatedAt: new Date()
      });

      logger.info('Conversation reactivated:', orderId);
      return updatedConversation;
    } catch (error) {
      logger.error('Error reactivating conversation:', error);
      throw this._handleError(error);
    }
  }

  /**
   * Get conversations requiring admin attention (unread customer messages)
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Conversations needing attention
   */
  async getRequiringAttention(options = {}) {
    try {
      logger.debug('Getting conversations requiring attention');
      
      const pipeline = [
        { $match: { isActive: true } },
        {
          $addFields: {
            unreadByAdmin: {
              $size: {
                $filter: {
                  input: '$messages',
                  cond: {
                    $and: [
                      { $eq: ['$$this.sender', 'customer'] },
                      { $eq: ['$$this.isRead', false] }
                    ]
                  }
                }
              }
            }
          }
        },
        { $match: { unreadByAdmin: { $gt: 0 } } },
        {
          $lookup: {
            from: 'orders',
            localField: 'orderId',
            foreignField: '_id',
            as: 'order'
          }
        },
        {
          $addFields: {
            order: { $arrayElemAt: ['$order', 0] },
            lastMessage: { $arrayElemAt: ['$messages', -1] }
          }
        },
        { $sort: { lastMessageAt: 1 } } // Oldest unread first
      ];

      // Add pagination
      const { page = 1, limit = 10 } = options;
      const skip = (page - 1) * limit;
      
      // Get count
      const countPipeline = [...pipeline, { $count: 'total' }];
      const [countResult] = await this.model.aggregate(countPipeline);
      const totalCount = countResult ? countResult.total : 0;
      
      // Add pagination to main pipeline
      pipeline.push({ $skip: skip }, { $limit: limit });
      
      const conversations = await this.model.aggregate(pipeline);
      const totalPages = Math.ceil(totalCount / limit);

      return {
        data: conversations,
        pagination: {
          currentPage: page,
          totalPages,
          totalCount,
          limit,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      };
    } catch (error) {
      logger.error('Error getting conversations requiring attention:', error);
      throw this._handleError(error);
    }
  }
}

module.exports = ConversationRepository;