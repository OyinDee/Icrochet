const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const config = require('../config');
const logger = require('../config/logger');
const AuthService = require('./AuthService');

/**
 * Socket.io service for real-time messaging
 */
class SocketService {
  constructor() {
    this.io = null;
    this.authService = new AuthService();
    this.connectedUsers = new Map(); // Track connected users
    this.orderRooms = new Map(); // Track order-specific rooms
  }

  /**
   * Initialize Socket.io server
   * @param {Object} server - HTTP server instance
   * @param {Object} options - Socket.io configuration options
   */
  initialize(server, options = {}) {
    const defaultOptions = {
      cors: {
        origin: process.env.NODE_ENV === 'production' 
          ? ['https://yourdomain.com'] // Replace with actual domain
          : true, // Allow all origins in development
        credentials: true,
        methods: ['GET', 'POST']
      },
      transports: ['websocket', 'polling'],
      pingTimeout: 60000,
      pingInterval: 25000
    };

    this.io = new Server(server, { ...defaultOptions, ...options });
    
    this.setupConnectionHandling();
    this.setupErrorHandling();
    
    logger.info('Socket.io server initialized');
  }

  /**
   * Setup connection handling and authentication
   */
  setupConnectionHandling() {
    this.io.use(async (socket, next) => {
      try {
        await this.authenticateSocket(socket);
        next();
      } catch (error) {
        logger.warn('Socket authentication failed:', error.message);
        next(new Error('Authentication failed'));
      }
    });

    this.io.on('connection', (socket) => {
      this.handleConnection(socket);
    });
  }

  /**
   * Authenticate socket connection
   * @param {Object} socket - Socket.io socket instance
   */
  async authenticateSocket(socket) {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization;
    
    if (!token) {
      throw new Error('No authentication token provided');
    }

    // Extract token from Bearer format if needed
    const cleanToken = token.startsWith('Bearer ') ? token.slice(7) : token;
    
    try {
      // Verify JWT token
      const decoded = jwt.verify(cleanToken, config.jwt.secret);
      
      // Store user info in socket
      socket.userId = decoded.userId;
      socket.userType = decoded.userType || 'admin'; // Default to admin for now
      socket.username = decoded.username;
      
      logger.info(`Socket authenticated for user: ${socket.username} (${socket.userType})`);
    } catch (error) {
      throw new Error('Invalid authentication token');
    }
  }

  /**
   * Handle new socket connection
   * @param {Object} socket - Socket.io socket instance
   */
  handleConnection(socket) {
    const { userId, userType, username } = socket;
    
    logger.info(`User connected: ${username} (${userType}) - Socket ID: ${socket.id}`);
    
    // Store connected user
    this.connectedUsers.set(socket.id, {
      userId,
      userType,
      username,
      connectedAt: new Date()
    });

    // Setup event handlers
    this.setupSocketEventHandlers(socket);

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      this.handleDisconnection(socket, reason);
    });

    // Send connection confirmation
    socket.emit('connected', {
      message: 'Successfully connected to chat server',
      userType,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Setup socket event handlers
   * @param {Object} socket - Socket.io socket instance
   */
  setupSocketEventHandlers(socket) {
    // Join order-specific room
    socket.on('join_order_room', (data) => {
      this.handleJoinOrderRoom(socket, data);
    });

    // Leave order-specific room
    socket.on('leave_order_room', (data) => {
      this.handleLeaveOrderRoom(socket, data);
    });

    // Handle typing indicators
    socket.on('typing_start', (data) => {
      this.handleTypingStart(socket, data);
    });

    socket.on('typing_stop', (data) => {
      this.handleTypingStop(socket, data);
    });

    // Handle message events
    socket.on('send_message', (data) => {
      this.handleSendMessage(socket, data);
    });

    // Handle message read confirmations
    socket.on('message_read', (data) => {
      this.handleMessageRead(socket, data);
    });

    // Handle status updates
    socket.on('status_update', (data) => {
      this.handleStatusUpdate(socket, data);
    });

    // Handle error events
    socket.on('error', (error) => {
      logger.error(`Socket error for user ${socket.username}:`, error);
    });
  }

  /**
   * Handle joining order-specific room
   * @param {Object} socket - Socket.io socket instance
   * @param {Object} data - Room data containing orderId
   */
  handleJoinOrderRoom(socket, data) {
    const { orderId } = data;
    
    if (!orderId) {
      socket.emit('error', { message: 'Order ID is required to join room' });
      return;
    }

    const roomName = `order_${orderId}`;
    
    // Join the room
    socket.join(roomName);
    
    // Track room membership
    if (!this.orderRooms.has(orderId)) {
      this.orderRooms.set(orderId, new Set());
    }
    this.orderRooms.get(orderId).add(socket.id);
    
    logger.info(`User ${socket.username} joined room: ${roomName}`);
    
    // Notify user of successful room join
    socket.emit('room_joined', {
      orderId,
      roomName,
      message: `Joined conversation for order ${orderId}`,
      timestamp: new Date().toISOString()
    });

    // Notify other users in the room (except the sender)
    socket.to(roomName).emit('user_joined_room', {
      username: socket.username,
      userType: socket.userType,
      orderId,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Handle leaving order-specific room
   * @param {Object} socket - Socket.io socket instance
   * @param {Object} data - Room data containing orderId
   */
  handleLeaveOrderRoom(socket, data) {
    const { orderId } = data;
    
    if (!orderId) {
      socket.emit('error', { message: 'Order ID is required to leave room' });
      return;
    }

    const roomName = `order_${orderId}`;
    
    // Leave the room
    socket.leave(roomName);
    
    // Remove from room tracking
    if (this.orderRooms.has(orderId)) {
      this.orderRooms.get(orderId).delete(socket.id);
      
      // Clean up empty room tracking
      if (this.orderRooms.get(orderId).size === 0) {
        this.orderRooms.delete(orderId);
      }
    }
    
    logger.info(`User ${socket.username} left room: ${roomName}`);
    
    // Notify user of successful room leave
    socket.emit('room_left', {
      orderId,
      roomName,
      message: `Left conversation for order ${orderId}`,
      timestamp: new Date().toISOString()
    });

    // Notify other users in the room
    socket.to(roomName).emit('user_left_room', {
      username: socket.username,
      userType: socket.userType,
      orderId,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Handle typing start indicator
   * @param {Object} socket - Socket.io socket instance
   * @param {Object} data - Typing data containing orderId
   */
  handleTypingStart(socket, data) {
    const { orderId } = data;
    
    if (!orderId) {
      return;
    }

    const roomName = `order_${orderId}`;
    
    // Broadcast typing indicator to other users in the room
    socket.to(roomName).emit('user_typing_start', {
      username: socket.username,
      userType: socket.userType,
      orderId,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Handle typing stop indicator
   * @param {Object} socket - Socket.io socket instance
   * @param {Object} data - Typing data containing orderId
   */
  handleTypingStop(socket, data) {
    const { orderId } = data;
    
    if (!orderId) {
      return;
    }

    const roomName = `order_${orderId}`;
    
    // Broadcast typing stop to other users in the room
    socket.to(roomName).emit('user_typing_stop', {
      username: socket.username,
      userType: socket.userType,
      orderId,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Handle sending message
   * @param {Object} socket - Socket.io socket instance
   * @param {Object} data - Message data containing orderId, content, and optional isQuote/quoteAmount
   */
  async handleSendMessage(socket, data) {
    const { orderId, content, isQuote = false, quoteAmount } = data;
    
    // Validate required fields
    if (!orderId || !content) {
      socket.emit('message_error', {
        message: 'Order ID and message content are required',
        timestamp: new Date().toISOString()
      });
      return;
    }

    try {
      // Create message object
      const message = {
        id: this.generateMessageId(),
        orderId,
        sender: socket.userType,
        senderName: socket.username,
        content,
        isQuote,
        quoteAmount: isQuote ? quoteAmount : undefined,
        timestamp: new Date().toISOString(),
        delivered: false,
        read: false
      };

      // Store message (in a real app, this would be saved to database)
      // For now, we'll just broadcast it
      
      const roomName = `order_${orderId}`;
      
      // Broadcast message to all users in the room
      this.io.to(roomName).emit('new_message', message);
      
      // Send delivery confirmation to sender
      socket.emit('message_sent', {
        messageId: message.id,
        orderId,
        timestamp: message.timestamp,
        delivered: true
      });

      // Send delivery confirmation to other users in room
      socket.to(roomName).emit('message_delivered', {
        messageId: message.id,
        orderId,
        timestamp: new Date().toISOString()
      });

      logger.info(`Message sent from ${socket.username} to order ${orderId}:`, {
        messageId: message.id,
        isQuote,
        contentLength: content.length
      });

    } catch (error) {
      logger.error(`Error sending message from ${socket.username}:`, error);
      socket.emit('message_error', {
        message: 'Failed to send message',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Generate unique message ID
   * @returns {string} Unique message ID
   */
  generateMessageId() {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Handle message read confirmation
   * @param {Object} socket - Socket.io socket instance
   * @param {Object} data - Read confirmation data
   */
  handleMessageRead(socket, data) {
    const { messageId, orderId } = data;
    
    if (!messageId || !orderId) {
      socket.emit('error', { message: 'Message ID and Order ID are required' });
      return;
    }

    const roomName = `order_${orderId}`;
    
    // Broadcast read confirmation to other users in the room
    socket.to(roomName).emit('message_read', {
      messageId,
      orderId,
      readBy: socket.username,
      readAt: new Date().toISOString()
    });

    logger.info(`Message ${messageId} marked as read by ${socket.username}`);
  }

  /**
   * Handle online status updates
   * @param {Object} socket - Socket.io socket instance
   * @param {Object} data - Status data
   */
  handleStatusUpdate(socket, data) {
    const { orderId, status } = data;
    
    if (!orderId || !status) {
      return;
    }

    const roomName = `order_${orderId}`;
    
    // Broadcast status update to other users in the room
    socket.to(roomName).emit('user_status_update', {
      username: socket.username,
      userType: socket.userType,
      status, // 'online', 'away', 'offline'
      orderId,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Handle socket disconnection
   * @param {Object} socket - Socket.io socket instance
   * @param {string} reason - Disconnection reason
   */
  handleDisconnection(socket, reason) {
    const user = this.connectedUsers.get(socket.id);
    
    if (user) {
      logger.info(`User disconnected: ${user.username} (${user.userType}) - Reason: ${reason}`);
      
      // Clean up user from all order rooms
      for (const [orderId, socketIds] of this.orderRooms.entries()) {
        if (socketIds.has(socket.id)) {
          socketIds.delete(socket.id);
          
          // Notify other users in the room
          const roomName = `order_${orderId}`;
          socket.to(roomName).emit('user_left_room', {
            username: user.username,
            userType: user.userType,
            orderId,
            reason: 'disconnected',
            timestamp: new Date().toISOString()
          });
          
          // Clean up empty room tracking
          if (socketIds.size === 0) {
            this.orderRooms.delete(orderId);
          }
        }
      }
      
      // Remove from connected users
      this.connectedUsers.delete(socket.id);
    }
  }

  /**
   * Setup error handling for Socket.io
   */
  setupErrorHandling() {
    this.io.engine.on('connection_error', (error) => {
      logger.error('Socket.io connection error:', {
        message: error.message,
        description: error.description,
        context: error.context,
        type: error.type
      });
    });
  }

  /**
   * Get Socket.io server instance
   * @returns {Object} Socket.io server instance
   */
  getIO() {
    return this.io;
  }

  /**
   * Get connected users count
   * @returns {number} Number of connected users
   */
  getConnectedUsersCount() {
    return this.connectedUsers.size;
  }

  /**
   * Get active order rooms count
   * @returns {number} Number of active order rooms
   */
  getActiveRoomsCount() {
    return this.orderRooms.size;
  }

  /**
   * Get users in specific order room
   * @param {string} orderId - Order ID
   * @returns {Array} Array of user info in the room
   */
  getUsersInOrderRoom(orderId) {
    const socketIds = this.orderRooms.get(orderId);
    if (!socketIds) {
      return [];
    }

    return Array.from(socketIds).map(socketId => {
      const user = this.connectedUsers.get(socketId);
      return user ? {
        socketId,
        userId: user.userId,
        username: user.username,
        userType: user.userType,
        connectedAt: user.connectedAt
      } : null;
    }).filter(Boolean);
  }

  /**
   * Broadcast message to specific order room (utility method for task 8.2)
   * @param {string} orderId - Order ID
   * @param {string} event - Event name
   * @param {Object} data - Data to broadcast
   */
  broadcastToOrderRoom(orderId, event, data) {
    if (!this.io) {
      logger.error('Socket.io not initialized');
      return;
    }

    const roomName = `order_${orderId}`;
    this.io.to(roomName).emit(event, data);
    
    logger.info(`Broadcasted ${event} to room ${roomName}:`, data);
  }
}

module.exports = SocketService;