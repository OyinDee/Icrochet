const { ConversationRepository, OrderRepository } = require('../repositories');
const logger = require('../config/logger');

/**
 * Service for Conversation business logic and messaging
 */
class ConversationService {
  constructor() {
    this.conversationRepository = new ConversationRepository();
    this.orderRepository = new OrderRepository();
  }

  /**
   * Get all conversations with unread counts
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Conversations with pagination
   */
  async getAllConversations(options = {}) {
    try {
      logger.debug('Getting all conversations');

      const result = await this.conversationRepository.findWithUnreadCounts(options);
      
      logger.info(`Retrieved ${result.data.length} conversations`);
      return result;
    } catch (error) {
      logger.error('Error getting all conversations:', error);
      throw error;
    }
  }

  /**
   * Get conversation by order ID
   * @param {string} orderId - Order ID
   * @returns {Promise<Object|null>} Conversation or null
   */
  async getConversationByOrderId(orderId) {
    try {
      logger.debug('Getting conversation by order ID:', orderId);

      const conversation = await this.conversationRepository.findByOrderId(orderId);

      if (!conversation) {
        logger.warn('Conversation not found for order:', orderId);
        return null;
      }

      logger.debug('Conversation retrieved successfully for order:', orderId);
      return conversation;
    } catch (error) {
      logger.error('Error getting conversation by order ID:', error);
      throw error;
    }
  }

  /**
   * Create conversation for order
   * @param {string} orderId - Order ID
   * @returns {Promise<Object>} Created conversation
   */
  async createConversationForOrder(orderId) {
    try {
      logger.debug('Creating conversation for order:', orderId);

      // Get order details
      const order = await this.orderRepository.findById(orderId);
      if (!order) {
        const error = new Error('Order not found');
        error.code = 'ORDER_NOT_FOUND';
        throw error;
      }

      const conversation = await this.conversationRepository.createForOrder(orderId, {
        customerEmail: order.customerEmail,
        customerName: order.customerName
      });

      logger.info('Conversation created for order:', orderId);
      return conversation;
    } catch (error) {
      logger.error('Error creating conversation for order:', error);
      throw error;
    }
  }

  /**
   * Send message in conversation
   * @param {string} orderId - Order ID
   * @param {string} sender - Message sender ('admin' or 'customer')
   * @param {string} content - Message content
   * @param {Object} options - Message options
   * @returns {Promise<Object>} Updated conversation
   */
  async sendMessage(orderId, sender, content, options = {}) {
    try {
      logger.debug('Sending message:', { orderId, sender, content: content.substring(0, 50) + '...' });

      // Validate message data
      this.validateMessageData(sender, content, options);

      const conversation = await this.conversationRepository.addMessage(orderId, sender, content, options);

      logger.info('Message sent successfully:', { orderId, sender });
      return conversation;
    } catch (error) {
      logger.error('Error sending message:', error);
      throw error;
    }
  }

  /**
   * Send quote message
   * @param {string} orderId - Order ID
   * @param {string} content - Quote message content
   * @param {number} quoteAmount - Quote amount
   * @returns {Promise<Object>} Updated conversation and order
   */
  async sendQuoteMessage(orderId, content, quoteAmount) {
    try {
      logger.debug('Sending quote message:', { orderId, quoteAmount });

      // Validate quote amount
      this.validateQuoteAmount(quoteAmount);

      // Send quote message
      const conversation = await this.conversationRepository.addMessage(orderId, 'admin', content, {
        isQuote: true,
        quoteAmount
      });

      // Update order with quote
      await this.orderRepository.setQuote(orderId, quoteAmount, content);

      logger.info('Quote message sent and order updated:', { orderId, quoteAmount });
      return conversation;
    } catch (error) {
      logger.error('Error sending quote message:', error);
      throw error;
    }
  }

  /**
   * Mark messages as read
   * @param {string} orderId - Order ID
   * @param {string} reader - Who is marking as read ('admin' or 'customer')
   * @returns {Promise<Object|null>} Updated conversation or null
   */
  async markMessagesAsRead(orderId, reader) {
    try {
      logger.debug('Marking messages as read:', { orderId, reader });

      this.validateReader(reader);

      const conversation = await this.conversationRepository.markMessagesAsRead(orderId, reader);

      if (conversation) {
        logger.info('Messages marked as read:', { orderId, reader });
      } else {
        logger.warn('Conversation not found for marking as read:', orderId);
      }

      return conversation;
    } catch (error) {
      logger.error('Error marking messages as read:', error);
      throw error;
    }
  }

  /**
   * Get conversations by customer email
   * @param {string} customerEmail - Customer email
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Customer conversations
   */
  async getConversationsByCustomer(customerEmail, options = {}) {
    try {
      logger.debug('Getting conversations by customer:', customerEmail);

      const result = await this.conversationRepository.findByCustomerEmail(customerEmail, options);
      
      logger.info(`Retrieved ${result.data.length} conversations for customer ${customerEmail}`);
      return result;
    } catch (error) {
      logger.error('Error getting conversations by customer:', error);
      throw error;
    }
  }

  /**
   * Search conversations
   * @param {string} searchTerm - Search term
   * @param {Object} options - Search options
   * @returns {Promise<Object>} Search results
   */
  async searchConversations(searchTerm, options = {}) {
    try {
      logger.debug('Searching conversations:', searchTerm);

      const result = await this.conversationRepository.search(searchTerm, options);
      
      logger.info(`Found ${result.data.length} conversations matching search term`);
      return result;
    } catch (error) {
      logger.error('Error searching conversations:', error);
      throw error;
    }
  }

  /**
   * Get conversations requiring admin attention
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Conversations needing attention
   */
  async getConversationsRequiringAttention(options = {}) {
    try {
      logger.debug('Getting conversations requiring attention');

      const result = await this.conversationRepository.getRequiringAttention(options);
      
      logger.info(`Found ${result.data.length} conversations requiring attention`);
      return result;
    } catch (error) {
      logger.error('Error getting conversations requiring attention:', error);
      throw error;
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

      const conversations = await this.conversationRepository.getRecentConversations(limit);
      
      logger.info(`Retrieved ${conversations.length} recent conversations`);
      return conversations;
    } catch (error) {
      logger.error('Error getting recent conversations:', error);
      throw error;
    }
  }

  /**
   * Archive conversation
   * @param {string} orderId - Order ID
   * @returns {Promise<Object>} Archive result
   */
  async archiveConversation(orderId) {
    try {
      logger.debug('Archiving conversation:', orderId);

      const conversation = await this.conversationRepository.archive(orderId);

      if (conversation) {
        logger.info('Conversation archived successfully:', orderId);
        return {
          success: true,
          message: 'Conversation archived successfully',
          conversation
        };
      } else {
        logger.warn('Conversation not found for archiving:', orderId);
        return {
          success: false,
          message: 'Conversation not found'
        };
      }
    } catch (error) {
      logger.error('Error archiving conversation:', error);
      throw error;
    }
  }

  /**
   * Reactivate conversation
   * @param {string} orderId - Order ID
   * @returns {Promise<Object>} Reactivation result
   */
  async reactivateConversation(orderId) {
    try {
      logger.debug('Reactivating conversation:', orderId);

      const conversation = await this.conversationRepository.reactivate(orderId);

      if (conversation) {
        logger.info('Conversation reactivated successfully:', orderId);
        return {
          success: true,
          message: 'Conversation reactivated successfully',
          conversation
        };
      } else {
        logger.warn('Conversation not found for reactivation:', orderId);
        return {
          success: false,
          message: 'Conversation not found'
        };
      }
    } catch (error) {
      logger.error('Error reactivating conversation:', error);
      throw error;
    }
  }

  /**
   * Get conversation statistics
   * @returns {Promise<Object>} Conversation statistics
   */
  async getConversationStatistics() {
    try {
      logger.debug('Getting conversation statistics');

      const stats = await this.conversationRepository.getStatistics();
      
      logger.info('Conversation statistics retrieved');
      return stats;
    } catch (error) {
      logger.error('Error getting conversation statistics:', error);
      throw error;
    }
  }

  /**
   * Get conversation summary for order
   * @param {string} orderId - Order ID
   * @returns {Promise<Object|null>} Conversation summary or null
   */
  async getConversationSummary(orderId) {
    try {
      logger.debug('Getting conversation summary for order:', orderId);

      const conversation = await this.conversationRepository.findByOrderId(orderId);

      if (!conversation) {
        return null;
      }

      const summary = {
        orderId: conversation.orderId,
        customerName: conversation.customerName,
        customerEmail: conversation.customerEmail,
        messageCount: conversation.messages.length,
        lastMessageAt: conversation.lastMessageAt,
        isActive: conversation.isActive,
        unreadByAdmin: conversation.messages.filter(msg => msg.sender === 'customer' && !msg.isRead).length,
        unreadByCustomer: conversation.messages.filter(msg => msg.sender === 'admin' && !msg.isRead).length,
        hasQuotes: conversation.messages.some(msg => msg.isQuote),
        quoteCount: conversation.messages.filter(msg => msg.isQuote).length,
        lastMessage: conversation.messages.length > 0 ? conversation.messages[conversation.messages.length - 1] : null
      };

      logger.debug('Conversation summary generated for order:', orderId);
      return summary;
    } catch (error) {
      logger.error('Error getting conversation summary:', error);
      throw error;
    }
  }

  /**
   * Validate message data
   * @param {string} sender - Message sender
   * @param {string} content - Message content
   * @param {Object} options - Message options
   * @throws {Error} If message data is invalid
   */
  validateMessageData(sender, content, options = {}) {
    if (!['admin', 'customer'].includes(sender)) {
      const error = new Error('Invalid sender. Must be "admin" or "customer"');
      error.code = 'INVALID_SENDER';
      throw error;
    }

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      const error = new Error('Message content is required and cannot be empty');
      error.code = 'EMPTY_MESSAGE_CONTENT';
      throw error;
    }

    if (content.length > 2000) {
      const error = new Error('Message content cannot exceed 2000 characters');
      error.code = 'MESSAGE_TOO_LONG';
      throw error;
    }

    if (options.isQuote && (!options.quoteAmount || options.quoteAmount <= 0)) {
      const error = new Error('Quote amount is required for quote messages');
      error.code = 'MISSING_QUOTE_AMOUNT';
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
   * Validate reader
   * @param {string} reader - Reader type
   * @throws {Error} If reader is invalid
   */
  validateReader(reader) {
    if (!['admin', 'customer'].includes(reader)) {
      const error = new Error('Invalid reader. Must be "admin" or "customer"');
      error.code = 'INVALID_READER';
      throw error;
    }
  }

  /**
   * Format conversation for response
   * @param {Object} conversation - Conversation object
   * @returns {Object} Formatted conversation
   */
  formatConversationResponse(conversation) {
    if (!conversation) return null;

    return {
      id: conversation._id,
      orderId: conversation.orderId,
      customerName: conversation.customerName,
      customerEmail: conversation.customerEmail,
      messages: conversation.messages.map(msg => ({
        id: msg._id,
        sender: msg.sender,
        content: msg.content,
        timestamp: msg.timestamp,
        isQuote: msg.isQuote,
        quoteAmount: msg.quoteAmount,
        isRead: msg.isRead
      })),
      messageCount: conversation.messages.length,
      unreadByAdmin: conversation.messages.filter(msg => msg.sender === 'customer' && !msg.isRead).length,
      unreadByCustomer: conversation.messages.filter(msg => msg.sender === 'admin' && !msg.isRead).length,
      isActive: conversation.isActive,
      lastMessageAt: conversation.lastMessageAt,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt
    };
  }

  /**
   * Format conversations list for response
   * @param {Object} result - Repository result with data and pagination
   * @returns {Object} Formatted result
   */
  formatConversationsResponse(result) {
    return {
      ...result,
      data: result.data.map(conversation => this.formatConversationResponse(conversation))
    };
  }
}

module.exports = ConversationService;