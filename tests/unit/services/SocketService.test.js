const { Server } = require('socket.io');
const { createServer } = require('http');
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
  return jest.fn().mockImplementation(() => ({
    // Mock AuthService methods if needed
  }));
});

describe('SocketService', () => {
  let socketService;
  let httpServer;
  let validToken;

  beforeAll(() => {
    // Create HTTP server
    httpServer = createServer();
    
    // Initialize SocketService
    socketService = new SocketService();
    
    // Create valid JWT token for testing
    validToken = jwt.sign(
      { 
        userId: 'test-user-id', 
        username: 'testadmin', 
        userType: 'admin' 
      },
      config.jwt.secret || 'test-secret',
      { expiresIn: '1h' }
    );
  });

  afterAll(() => {
    try {
      if (socketService.getIO() && typeof socketService.getIO().close === 'function') {
        socketService.getIO().close();
      }
    } catch (error) {
      // Ignore cleanup errors
    }
    
    try {
      if (httpServer) {
        httpServer.close();
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  beforeEach(() => {
    // Clear tracking maps
    socketService.connectedUsers.clear();
    socketService.orderRooms.clear();
  });

  describe('initialization', () => {
    test('should initialize Socket.io server', () => {
      socketService.initialize(httpServer);
      expect(socketService.getIO()).toBeInstanceOf(Server);
    });

    test('should have default configuration options', () => {
      socketService.initialize(httpServer);
      const io = socketService.getIO();
      expect(io).toBeDefined();
    });
  });

  describe('authentication', () => {
    test('should authenticate valid token', (done) => {
      const testSocket = {
        handshake: {
          auth: { token: validToken },
          headers: {}
        }
      };

      socketService.authenticateSocket(testSocket)
        .then(() => {
          expect(testSocket.userId).toBe('test-user-id');
          expect(testSocket.username).toBe('testadmin');
          expect(testSocket.userType).toBe('admin');
          done();
        })
        .catch(done);
    });

    test('should reject missing token', async () => {
      const testSocket = {
        handshake: {
          auth: {},
          headers: {}
        }
      };

      await expect(socketService.authenticateSocket(testSocket))
        .rejects.toThrow('No authentication token provided');
    });

    test('should reject invalid token', async () => {
      const testSocket = {
        handshake: {
          auth: { token: 'invalid-token' },
          headers: {}
        }
      };

      await expect(socketService.authenticateSocket(testSocket))
        .rejects.toThrow('Invalid authentication token');
    });

    test('should handle Bearer token format', async () => {
      const testSocket = {
        handshake: {
          auth: {},
          headers: { authorization: `Bearer ${validToken}` }
        }
      };

      await expect(socketService.authenticateSocket(testSocket))
        .resolves.not.toThrow();
    });
  });

  describe('connection handling', () => {
    test('should handle connection with user tracking', () => {
      const mockSocket = {
        id: 'test-socket-id',
        userId: 'test-user-id',
        userType: 'admin',
        username: 'testadmin',
        emit: jest.fn(),
        on: jest.fn(),
        to: jest.fn(() => ({ emit: jest.fn() }))
      };

      socketService.initialize(httpServer);
      socketService.handleConnection(mockSocket);

      expect(socketService.getConnectedUsersCount()).toBe(1);
      expect(mockSocket.emit).toHaveBeenCalledWith('connected', expect.objectContaining({
        message: 'Successfully connected to chat server',
        userType: 'admin'
      }));
    });

    test('should handle disconnection cleanup', () => {
      const mockSocket = {
        id: 'test-socket-id',
        userId: 'test-user-id',
        userType: 'admin',
        username: 'testadmin',
        emit: jest.fn(),
        on: jest.fn(),
        to: jest.fn(() => ({ emit: jest.fn() }))
      };

      socketService.initialize(httpServer);
      socketService.handleConnection(mockSocket);
      
      const initialCount = socketService.getConnectedUsersCount();
      expect(initialCount).toBe(1);

      socketService.handleDisconnection(mockSocket, 'client disconnect');
      expect(socketService.getConnectedUsersCount()).toBe(0);
    });
  });

  describe('room management', () => {
    const testOrderId = 'test-order-123';

    test('should join order room', () => {
      const mockSocket = {
        id: 'test-socket-id',
        userId: 'test-user-id',
        userType: 'admin',
        username: 'testadmin',
        emit: jest.fn(),
        join: jest.fn(),
        to: jest.fn(() => ({ emit: jest.fn() }))
      };

      socketService.initialize(httpServer);
      socketService.handleJoinOrderRoom(mockSocket, { orderId: testOrderId });

      expect(mockSocket.join).toHaveBeenCalledWith(`order_${testOrderId}`);
      expect(mockSocket.emit).toHaveBeenCalledWith('room_joined', expect.objectContaining({
        orderId: testOrderId,
        roomName: `order_${testOrderId}`
      }));
      expect(socketService.getActiveRoomsCount()).toBe(1);
    });

    test('should leave order room', () => {
      const mockSocket = {
        id: 'test-socket-id',
        userId: 'test-user-id',
        userType: 'admin',
        username: 'testadmin',
        emit: jest.fn(),
        join: jest.fn(),
        leave: jest.fn(),
        to: jest.fn(() => ({ emit: jest.fn() }))
      };

      socketService.initialize(httpServer);
      
      // First join the room
      socketService.handleJoinOrderRoom(mockSocket, { orderId: testOrderId });
      expect(socketService.getActiveRoomsCount()).toBe(1);

      // Then leave the room
      socketService.handleLeaveOrderRoom(mockSocket, { orderId: testOrderId });
      expect(mockSocket.leave).toHaveBeenCalledWith(`order_${testOrderId}`);
      expect(mockSocket.emit).toHaveBeenCalledWith('room_left', expect.objectContaining({
        orderId: testOrderId,
        roomName: `order_${testOrderId}`
      }));
    });

    test('should handle join room without orderId', () => {
      const mockSocket = {
        emit: jest.fn()
      };

      socketService.handleJoinOrderRoom(mockSocket, {});
      expect(mockSocket.emit).toHaveBeenCalledWith('error', {
        message: 'Order ID is required to join room'
      });
    });

    test('should handle leave room without orderId', () => {
      const mockSocket = {
        emit: jest.fn()
      };

      socketService.handleLeaveOrderRoom(mockSocket, {});
      expect(mockSocket.emit).toHaveBeenCalledWith('error', {
        message: 'Order ID is required to leave room'
      });
    });
  });

  describe('typing indicators', () => {
    const testOrderId = 'test-order-456';

    test('should handle typing start', () => {
      const mockSocket = {
        username: 'testadmin',
        userType: 'admin',
        to: jest.fn(() => ({ emit: jest.fn() }))
      };

      const mockToEmit = jest.fn();
      mockSocket.to.mockReturnValue({ emit: mockToEmit });

      socketService.handleTypingStart(mockSocket, { orderId: testOrderId });

      expect(mockSocket.to).toHaveBeenCalledWith(`order_${testOrderId}`);
      expect(mockToEmit).toHaveBeenCalledWith('user_typing_start', expect.objectContaining({
        username: 'testadmin',
        userType: 'admin',
        orderId: testOrderId
      }));
    });

    test('should handle typing stop', () => {
      const mockSocket = {
        username: 'testadmin',
        userType: 'admin',
        to: jest.fn(() => ({ emit: jest.fn() }))
      };

      const mockToEmit = jest.fn();
      mockSocket.to.mockReturnValue({ emit: mockToEmit });

      socketService.handleTypingStop(mockSocket, { orderId: testOrderId });

      expect(mockSocket.to).toHaveBeenCalledWith(`order_${testOrderId}`);
      expect(mockToEmit).toHaveBeenCalledWith('user_typing_stop', expect.objectContaining({
        username: 'testadmin',
        userType: 'admin',
        orderId: testOrderId
      }));
    });

    test('should ignore typing events without orderId', () => {
      const mockSocket = {
        username: 'testadmin',
        userType: 'admin',
        to: jest.fn(() => ({ emit: jest.fn() }))
      };

      socketService.handleTypingStart(mockSocket, {});
      socketService.handleTypingStop(mockSocket, {});

      expect(mockSocket.to).not.toHaveBeenCalled();
    });
  });

  describe('utility methods', () => {
    test('should get users in order room', () => {
      const testOrderId = 'test-order-789';
      const testSocketId = 'test-socket-id';
      
      // Simulate user joining room
      socketService.orderRooms.set(testOrderId, new Set([testSocketId]));
      socketService.connectedUsers.set(testSocketId, {
        userId: 'test-user-id',
        username: 'testadmin',
        userType: 'admin',
        connectedAt: new Date()
      });

      const users = socketService.getUsersInOrderRoom(testOrderId);
      expect(users).toHaveLength(1);
      expect(users[0].username).toBe('testadmin');
      expect(users[0].userType).toBe('admin');
    });

    test('should return empty array for non-existent room', () => {
      const users = socketService.getUsersInOrderRoom('non-existent-order');
      expect(users).toEqual([]);
    });

    test('should broadcast to order room', () => {
      socketService.initialize(httpServer);
      const testOrderId = 'test-order-broadcast';
      const testEvent = 'test_event';
      const testData = { message: 'test message' };

      // This should not throw an error
      expect(() => {
        socketService.broadcastToOrderRoom(testOrderId, testEvent, testData);
      }).not.toThrow();
    });

    test('should handle broadcast without initialized IO', () => {
      const newSocketService = new SocketService();
      const testOrderId = 'test-order-broadcast';
      const testEvent = 'test_event';
      const testData = { message: 'test message' };

      // This should not throw an error but should log an error
      expect(() => {
        newSocketService.broadcastToOrderRoom(testOrderId, testEvent, testData);
      }).not.toThrow();
    });
  });

  describe('message handling', () => {
    test('should handle send message event', async () => {
      const mockSocket = {
        username: 'testadmin',
        userType: 'admin',
        emit: jest.fn(),
        to: jest.fn(() => ({ emit: jest.fn() }))
      };

      const mockIO = {
        to: jest.fn(() => ({ emit: jest.fn() }))
      };

      socketService.initialize(httpServer);
      socketService.io = mockIO;

      const testData = { 
        orderId: 'test-order', 
        content: 'test message' 
      };

      await socketService.handleSendMessage(mockSocket, testData);
      
      expect(mockSocket.emit).toHaveBeenCalledWith('message_sent', expect.objectContaining({
        orderId: 'test-order',
        delivered: true
      }));
      expect(mockIO.to).toHaveBeenCalledWith('order_test-order');
    });

    test('should handle message validation errors', async () => {
      const mockSocket = {
        emit: jest.fn()
      };

      await socketService.handleSendMessage(mockSocket, {});
      
      expect(mockSocket.emit).toHaveBeenCalledWith('message_error', {
        message: 'Order ID and message content are required',
        timestamp: expect.any(String)
      });
    });

    test('should handle quote messages', async () => {
      const mockSocket = {
        username: 'testadmin',
        userType: 'admin',
        emit: jest.fn(),
        to: jest.fn(() => ({ emit: jest.fn() }))
      };

      const mockIO = {
        to: jest.fn(() => ({ emit: jest.fn() }))
      };

      socketService.initialize(httpServer);
      socketService.io = mockIO;

      const testData = { 
        orderId: 'test-order', 
        content: 'Quote: $150',
        isQuote: true,
        quoteAmount: 150
      };

      await socketService.handleSendMessage(mockSocket, testData);
      
      expect(mockIO.to).toHaveBeenCalledWith('order_test-order');
    });

    test('should generate unique message IDs', () => {
      const id1 = socketService.generateMessageId();
      const id2 = socketService.generateMessageId();
      
      expect(id1).toMatch(/^msg_\d+_[a-z0-9]+$/);
      expect(id2).toMatch(/^msg_\d+_[a-z0-9]+$/);
      expect(id1).not.toBe(id2);
    });

    test('should handle message read confirmations', () => {
      const mockSocket = {
        username: 'testadmin',
        to: jest.fn(() => ({ emit: jest.fn() }))
      };

      const mockToEmit = jest.fn();
      mockSocket.to.mockReturnValue({ emit: mockToEmit });

      socketService.handleMessageRead(mockSocket, {
        messageId: 'msg_123',
        orderId: 'test-order'
      });

      expect(mockSocket.to).toHaveBeenCalledWith('order_test-order');
      expect(mockToEmit).toHaveBeenCalledWith('message_read', expect.objectContaining({
        messageId: 'msg_123',
        orderId: 'test-order',
        readBy: 'testadmin'
      }));
    });

    test('should handle status updates', () => {
      const mockSocket = {
        username: 'testadmin',
        userType: 'admin',
        to: jest.fn(() => ({ emit: jest.fn() }))
      };

      const mockToEmit = jest.fn();
      mockSocket.to.mockReturnValue({ emit: mockToEmit });

      socketService.handleStatusUpdate(mockSocket, {
        orderId: 'test-order',
        status: 'online'
      });

      expect(mockSocket.to).toHaveBeenCalledWith('order_test-order');
      expect(mockToEmit).toHaveBeenCalledWith('user_status_update', expect.objectContaining({
        username: 'testadmin',
        userType: 'admin',
        status: 'online',
        orderId: 'test-order'
      }));
    });
  });
});