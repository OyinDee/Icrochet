const { ConversationService } = require('../services');
const logger = require('../config/logger');

/**
 * Controller for admin conversation management
 */
class AdminConversationController {
  constructor() {
    this.conversationService = new ConversationService();
  }

  /**
   * Get all conversations
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getAllConversations(req, res) {
    try {
      logger.debug('Admin getting all conversations with filters:', req.query);

      const options = this.buildOptions(req.query);
      const result = await this.conversationService.getAllConversations(options);

      res.status(200).json({
        success: true,
        message: 'Conversations retrieved successfully',
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error getting all conversations:', error);
      this.handleError(res, error, 'CONVERSATIONS_FETCH_ERROR', 'Failed to retrieve conversations');
    }
  }

  /**
   * Get conversation by order ID
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getConversationByOrderId(req, res) {
    try {
      const { orderId } = req.params;
      logger.debug('Admin getting conversation by order ID:', orderId);

      const conversation = await this.conversationService.getConversationByOrderId(orderId);

      if (!conversation) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'CONVERSATION_NOT_FOUND',
            message: 'Conversation not found for this order',
            details: { orderId }
          },
          timestamp: new Date().toISOString()
        });
      }

      res.status(200).json({
        success: true,
        message: 'Conversation retrieved successfully',
        data: { conversation },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error getting conversation by order ID:', error);
      this.handleError(res, error, 'CONVERSATION_FETCH_ERROR', 'Failed to retrieve conversation');
    }
  }

  /**
   * Send message in conversation
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async sendMessage(req, res) {
    try {
      const { orderId } = req.params;
      const { content, isQuote, quoteAmount } = req.body;
      
      logger.debug('Admin sending message:', { orderId, content: content?.substring(0, 50) + '...', isQuote });

      let conversation;
      
      if (isQuote && quoteAmount) {
        // Send quote message
        conversation = await this.conversationService.sendQuoteMessage(orderId, content, quoteAmount);
      } else {
        // Send regular message
        conversation = await this.conversationService.sendMessage(orderId, 'admin', content);
      }

      logger.info('Message sent by admin:', { orderId, adminId: req.user?.id, isQuote });

      res.status(201).json({
        success: true,
        message: isQuote ? 'Quote message sent successfully' : 'Message sent successfully',
        data: { conversation },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error sending message:', error);
      this.handleError(res, error, 'MESSAGE_SEND_ERROR', 'Failed to send message');
    }
  }

  /**
   * Get conversations requiring attention
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getConversationsRequiringAttention(req, res) {
    try {
      logger.debug('Admin getting conversations requiring attention');

      const options = this.buildOptions(req.query);
      const result = await this.conversationService.getConversationsRequiringAttention(options);

      res.status(200).json({
        success: true,
        message: 'Conversations requiring attention retrieved successfully',
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error getting conversations requiring attention:', error);
      this.handleError(res, error, 'ATTENTION_CONVERSATIONS_ERROR', 'Failed to retrieve conversations requiring attention');
    }
  }

  /**
   * Search conversations
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async searchConversations(req, res) {
    try {
      const { q: searchTerm } = req.query;
      logger.debug('Admin searching conversations:', searchTerm);

      const options = this.buildOptions(req.query);
      const result = await this.conversationService.searchConversations(searchTerm, options);

      res.status(200).json({
        success: true,
        message: 'Search completed successfully',
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error searching conversations:', error);
      this.handleError(res, error, 'CONVERSATION_SEARCH_ERROR', 'Failed to search conversations');
    }
  }

  /**
   * Get conversation statistics
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getConversationStatistics(req, res) {
    try {
      logger.debug('Admin getting conversation statistics');

      const stats = await this.conversationService.getConversationStatistics();

      res.status(200).json({
        success: true,
        message: 'Statistics retrieved successfully',
        data: { statistics: stats },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error getting conversation statistics:', error);
      this.handleError(res, error, 'STATISTICS_ERROR', 'Failed to retrieve statistics');
    }
  }

  /**
   * Get recent conversations
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getRecentConversations(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 10;
      logger.debug('Admin getting recent conversations:', limit);

      const conversations = await this.conversationService.getRecentConversations(limit);

      res.status(200).json({
        success: true,
        message: 'Recent conversations retrieved successfully',
        data: { conversations },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error getting recent conversations:', error);
      this.handleError(res, error, 'RECENT_CONVERSATIONS_ERROR', 'Failed to retrieve recent conversations');
    }
  }

  /**
   * Get conversations by customer
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getConversationsByCustomer(req, res) {
    try {
      const { customerEmail } = req.params;
      logger.debug('Admin getting conversations by customer:', customerEmail);

      const options = this.buildOptions(req.query);
      const result = await this.conversationService.getConversationsByCustomer(customerEmail, options);

      res.status(200).json({
        success: true,
        message: 'Customer conversations retrieved successfully',
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error getting conversations by customer:', error);
      this.handleError(res, error, 'CUSTOMER_CONVERSATIONS_ERROR', 'Failed to retrieve customer conversations');
    }
  }

  /**
   * Mark messages as read
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async markMessagesAsRead(req, res) {
    try {
      const { orderId } = req.params;
      logger.debug('Admin marking messages as read for order:', orderId);

      const conversation = await this.conversationService.markMessagesAsRead(orderId, 'admin');

      if (!conversation) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'CONVERSATION_NOT_FOUND',
            message: 'Conversation not found for this order',
            details: { orderId }
          },
          timestamp: new Date().toISOString()
        });
      }

      res.status(200).json({
        success: true,
        message: 'Messages marked as read successfully',
        data: { conversation },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error marking messages as read:', error);
      this.handleError(res, error, 'MARK_READ_ERROR', 'Failed to mark messages as read');
    }
  }

  /**
   * Archive conversation
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async archiveConversation(req, res) {
    try {
      const { orderId } = req.params;
      logger.debug('Admin archiving conversation:', orderId);

      const result = await this.conversationService.archiveConversation(orderId);

      if (!result.success) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'CONVERSATION_NOT_FOUND',
            message: result.message,
            details: { orderId }
          },
          timestamp: new Date().toISOString()
        });
      }

      logger.info('Conversation archived by admin:', { orderId, adminId: req.user?.id });

      res.status(200).json({
        success: true,
        message: result.message,
        data: { conversation: result.conversation },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error archiving conversation:', error);
      this.handleError(res, error, 'ARCHIVE_ERROR', 'Failed to archive conversation');
    }
  }

  /**
   * Reactivate conversation
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async reactivateConversation(req, res) {
    try {
      const { orderId } = req.params;
      logger.debug('Admin reactivating conversation:', orderId);

      const result = await this.conversationService.reactivateConversation(orderId);

      if (!result.success) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'CONVERSATION_NOT_FOUND',
            message: result.message,
            details: { orderId }
          },
          timestamp: new Date().toISOString()
        });
      }

      logger.info('Conversation reactivated by admin:', { orderId, adminId: req.user?.id });

      res.status(200).json({
        success: true,
        message: result.message,
        data: { conversation: result.conversation },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error reactivating conversation:', error);
      this.handleError(res, error, 'REACTIVATE_ERROR', 'Failed to reactivate conversation');
    }
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
      case 'CONVERSATION_NOT_FOUND':
      case 'ORDER_NOT_FOUND':
        return 404;
      case 'INVALID_SENDER':
      case 'EMPTY_MESSAGE_CONTENT':
      case 'MESSAGE_TOO_LONG':
      case 'MISSING_QUOTE_AMOUNT':
      case 'INVALID_QUOTE_AMOUNT':
      case 'HIGH_QUOTE_AMOUNT':
      case 'INVALID_READER':
        return 400;
      default:
        return 500;
    }
  }
}

module.exports = AdminConversationController;