const { ConversationService } = require('../services');
const logger = require('../config/logger');

/**
 * Controller for public conversation management (customer-facing)
 */
class PublicConversationController {
  constructor() {
    this.conversationService = new ConversationService();
  }

  /**
   * Get conversation by order ID for customer view
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getConversationByOrderId(req, res) {
    try {
      const { orderId } = req.params;
      logger.debug('Customer getting conversation by order ID:', orderId);

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

      // Format conversation for customer view (hide admin-specific data)
      const customerConversation = this.formatConversationForCustomer(conversation);

      res.status(200).json({
        success: true,
        message: 'Conversation retrieved successfully',
        data: { conversation: customerConversation },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error getting conversation by order ID:', error);
      this.handleError(res, error, 'CONVERSATION_FETCH_ERROR', 'Failed to retrieve conversation');
    }
  }

  /**
   * Send customer message in conversation
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async sendMessage(req, res) {
    try {
      const { orderId } = req.params;
      const { content } = req.body;
      
      logger.debug('Customer sending message:', { orderId, content: content?.substring(0, 50) + '...' });

      // Send customer message
      const conversation = await this.conversationService.sendMessage(orderId, 'customer', content);

      // Format conversation for customer view
      const customerConversation = this.formatConversationForCustomer(conversation);

      logger.info('Message sent by customer:', { orderId });

      res.status(201).json({
        success: true,
        message: 'Message sent successfully',
        data: { conversation: customerConversation },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error sending customer message:', error);
      this.handleError(res, error, 'MESSAGE_SEND_ERROR', 'Failed to send message');
    }
  }

  /**
   * Format conversation for customer view
   * @param {Object} conversation - Conversation object
   * @returns {Object} Customer-formatted conversation
   */
  formatConversationForCustomer(conversation) {
    if (!conversation) return null;

    return {
      id: conversation._id,
      orderId: conversation.orderId,
      messages: conversation.messages.map(msg => ({
        id: msg._id,
        sender: msg.sender,
        content: msg.content,
        timestamp: msg.timestamp,
        isQuote: msg.isQuote || false,
        quoteAmount: msg.quoteAmount || null
      })),
      messageCount: conversation.messages.length,
      unreadByCustomer: conversation.messages.filter(msg => msg.sender === 'admin' && !msg.isRead).length,
      isActive: conversation.isActive,
      lastMessageAt: conversation.lastMessageAt,
      createdAt: conversation.createdAt
    };
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
        return 400;
      default:
        return 500;
    }
  }
}

module.exports = PublicConversationController;