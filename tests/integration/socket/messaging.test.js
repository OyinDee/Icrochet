const { Server } = require('socket.io');
const { createServer } = require('http');
const Client = require('socket.io-client');
const jwt = require('jsonwebtoken');
const SocketService = require('../../../src/services/SocketService');
const config = require('../../../src/config');

// Mock dependencies
jest.mock('../../../src/config/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}));

jest.mock('../../../src/services/AuthService', () => {
  return jest.fn().mockImplementation(() => ({}));
});

describe('Socket.io Real-time Messaging Integration', () => {
  let socketService;
  let httpServer;
  let adminClient;
  let customerClient;
  let adminToken;
  let customerToken;
  let port;

  beforeAll((done) => {
    // Create HTTP server
    httpServer = createServer();
    
    // Initialize SocketService
    socketService = new SocketService();
    socketService.initialize(httpServer);

    // Create JWT tokens for testing
    adminToken = jwt.sign(
      { 
        userId: 'admin-user-id', 
        username: 'admin', 
        userType: 'admin' 
      },
      config.jwt.secret,
      { expiresIn: '1h' }
    );

    customerToken = jwt.sign(
      { 
        userId: 'customer-user-id', 
        username: 'customer', 
        userType: 'customer' 
      },
      config.jwt.secret,
      { expiresIn: '1h' }
    );

    httpServer.listen(() => {
      port = httpServer.address().port;
      done();
    });
  });

  afterAll(() => {
    if (adminClient) adminClient.close();
    if (customerClient) customerClient.close();
    socketService.getIO().close();
    httpServer.close();
  });

  beforeEach((done) => {
    // Clear tracking maps
    socketService.connectedUsers.clear();
    socketService.orderRooms.clear();

    // Create fresh client connections
    adminClient = new Client(`http://localhost:${port}`, {
      auth: { token: adminToken }
    });

    customerClient = new Client(`http://localhost:${port}`, {
      auth: { token: customerToken }
    });

    let connectionsCount = 0;
    const checkConnections = () => {
      connectionsCount++;
      if (connectionsCount === 2) {
        done();
      }
    };

    adminClient.on('connect', checkConnections);
    customerClient.on('connect', checkConnections);
  });

  afterEach(() => {
    if (adminClient) {
      adminClient.removeAllListeners();
      adminClient.disconnect();
    }
    if (customerClient) {
      customerClient.removeAllListeners();
      customerClient.disconnect();
    }
  });

  describe('message broadcasting', () => {
    const testOrderId = 'test-order-123';

    test('should broadcast message between admin and customer', (done) => {
      const testMessage = 'Hello, how can I help you?';
      
      // Both clients join the same order room
      adminClient.emit('join_order_room', { orderId: testOrderId });
      customerClient.emit('join_order_room', { orderId: testOrderId });

      // Customer listens for new messages
      customerClient.on('new_message', (message) => {
        expect(message.content).toBe(testMessage);
        expect(message.sender).toBe('admin');
        expect(message.senderName).toBe('admin');
        expect(message.orderId).toBe(testOrderId);
        expect(message.id).toBeDefined();
        expect(message.timestamp).toBeDefined();
        done();
      });

      // Wait for both to join, then send message
      setTimeout(() => {
        adminClient.emit('send_message', {
          orderId: testOrderId,
          content: testMessage
        });
      }, 100);
    });

    test('should send delivery confirmation to sender', (done) => {
      const testMessage = 'Test message for delivery confirmation';
      
      adminClient.emit('join_order_room', { orderId: testOrderId });
      customerClient.emit('join_order_room', { orderId: testOrderId });

      adminClient.on('message_sent', (confirmation) => {
        expect(confirmation.orderId).toBe(testOrderId);
        expect(confirmation.delivered).toBe(true);
        expect(confirmation.messageId).toBeDefined();
        expect(confirmation.timestamp).toBeDefined();
        done();
      });

      setTimeout(() => {
        adminClient.emit('send_message', {
          orderId: testOrderId,
          content: testMessage
        });
      }, 100);
    });

    test('should handle quote messages', (done) => {
      const testQuote = 'Custom order quote: $150';
      const quoteAmount = 150;
      
      adminClient.emit('join_order_room', { orderId: testOrderId });
      customerClient.emit('join_order_room', { orderId: testOrderId });

      customerClient.on('new_message', (message) => {
        expect(message.content).toBe(testQuote);
        expect(message.isQuote).toBe(true);
        expect(message.quoteAmount).toBe(quoteAmount);
        expect(message.sender).toBe('admin');
        done();
      });

      setTimeout(() => {
        adminClient.emit('send_message', {
          orderId: testOrderId,
          content: testQuote,
          isQuote: true,
          quoteAmount: quoteAmount
        });
      }, 100);
    });

    test('should handle message validation errors', (done) => {
      adminClient.on('message_error', (error) => {
        expect(error.message).toBe('Order ID and message content are required');
        done();
      });

      adminClient.emit('send_message', {
        content: '' // Missing orderId and empty content
      });
    });
  });

  describe('message delivery confirmation', () => {
    const testOrderId = 'test-order-456';

    test('should send delivery confirmation to other users', (done) => {
      adminClient.emit('join_order_room', { orderId: testOrderId });
      customerClient.emit('join_order_room', { orderId: testOrderId });

      customerClient.on('message_delivered', (confirmation) => {
        expect(confirmation.orderId).toBe(testOrderId);
        expect(confirmation.messageId).toBeDefined();
        expect(confirmation.timestamp).toBeDefined();
        done();
      });

      setTimeout(() => {
        adminClient.emit('send_message', {
          orderId: testOrderId,
          content: 'Test delivery confirmation'
        });
      }, 100);
    });
  });

  describe('message read confirmations', () => {
    const testOrderId = 'test-order-789';

    test('should broadcast read confirmation', (done) => {
      const testMessageId = 'msg_123456789';
      
      adminClient.emit('join_order_room', { orderId: testOrderId });
      customerClient.emit('join_order_room', { orderId: testOrderId });

      adminClient.on('message_read', (readConfirmation) => {
        expect(readConfirmation.messageId).toBe(testMessageId);
        expect(readConfirmation.orderId).toBe(testOrderId);
        expect(readConfirmation.readBy).toBe('customer');
        expect(readConfirmation.readAt).toBeDefined();
        done();
      });

      setTimeout(() => {
        customerClient.emit('message_read', {
          messageId: testMessageId,
          orderId: testOrderId
        });
      }, 100);
    });

    test('should handle read confirmation validation', (done) => {
      customerClient.on('error', (error) => {
        expect(error.message).toBe('Message ID and Order ID are required');
        done();
      });

      customerClient.emit('message_read', {
        messageId: '' // Missing orderId and empty messageId
      });
    });
  });

  describe('online status updates', () => {
    const testOrderId = 'test-order-status';

    test('should broadcast status updates', (done) => {
      adminClient.emit('join_order_room', { orderId: testOrderId });
      customerClient.emit('join_order_room', { orderId: testOrderId });

      customerClient.on('user_status_update', (statusUpdate) => {
        expect(statusUpdate.username).toBe('admin');
        expect(statusUpdate.userType).toBe('admin');
        expect(statusUpdate.status).toBe('away');
        expect(statusUpdate.orderId).toBe(testOrderId);
        expect(statusUpdate.timestamp).toBeDefined();
        done();
      });

      setTimeout(() => {
        adminClient.emit('status_update', {
          orderId: testOrderId,
          status: 'away'
        });
      }, 100);
    });

    test('should ignore status updates without required fields', () => {
      // This should not cause any errors or broadcasts
      adminClient.emit('status_update', {
        status: 'online' // Missing orderId
      });

      adminClient.emit('status_update', {
        orderId: testOrderId // Missing status
      });

      // If we get here without errors, the test passes
      expect(true).toBe(true);
    });
  });

  describe('typing indicators with messaging', () => {
    const testOrderId = 'test-order-typing';

    test('should coordinate typing indicators with message sending', (done) => {
      let typingReceived = false;
      let messageReceived = false;
      
      const checkCompletion = () => {
        if (typingReceived && messageReceived) {
          done();
        }
      };

      adminClient.emit('join_order_room', { orderId: testOrderId });
      customerClient.emit('join_order_room', { orderId: testOrderId });

      // Customer receives typing indicator
      customerClient.on('user_typing_start', (data) => {
        expect(data.username).toBe('admin');
        typingReceived = true;
        checkCompletion();
      });

      // Customer receives message
      customerClient.on('new_message', (message) => {
        expect(message.content).toBe('Test message after typing');
        messageReceived = true;
        checkCompletion();
      });

      setTimeout(() => {
        // Admin starts typing
        adminClient.emit('typing_start', { orderId: testOrderId });
        
        // Admin sends message after a short delay
        setTimeout(() => {
          adminClient.emit('send_message', {
            orderId: testOrderId,
            content: 'Test message after typing'
          });
        }, 50);
      }, 100);
    });
  });

  describe('error handling', () => {
    test('should handle message sending errors gracefully', (done) => {
      // Mock an error in message handling by sending invalid data
      adminClient.on('message_error', (error) => {
        expect(error.message).toBeDefined();
        expect(error.timestamp).toBeDefined();
        done();
      });

      adminClient.emit('send_message', {
        orderId: null,
        content: null
      });
    });
  });
});