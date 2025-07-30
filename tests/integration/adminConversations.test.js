const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../src/app');
const database = require('../../src/config/database');
const { Order, Conversation, AdminUser } = require('../../src/models');
const { AuthService } = require('../../src/services');

describe('Admin Conversations API', () => {
  let authToken;
  let adminUser;
  let testOrder;
  let testConversation;

  beforeAll(async () => {
    await database.connect();
  });

  beforeEach(async () => {
    // Create admin user
    const authService = new AuthService();
    adminUser = await AdminUser.create({
      username: 'testadmin',
      email: 'admin@test.com',
      passwordHash: await authService.hashPassword('password123')
    });

    // Generate auth token
    const tokens = await authService.generateTokens(adminUser);
    authToken = tokens.accessToken;

    // Create test order
    testOrder = await Order.create({
      customerName: 'John Doe',
      customerEmail: 'john@example.com',
      customerPhone: '+1234567890',
      shippingAddress: '123 Main St, City, State 12345',
      items: [{
        itemId: new mongoose.Types.ObjectId(),
        quantity: 2,
        selectedColor: 'blue',
        unitPrice: 25.00,
        subtotal: 50.00,
        customRequirements: 'Custom size needed'
      }],
      totalAmount: 50.00,
      status: 'quote_needed',
      hasCustomItems: true
    });

    // Create test conversation
    testConversation = await Conversation.create({
      orderId: testOrder._id,
      customerName: testOrder.customerName,
      customerEmail: testOrder.customerEmail,
      messages: [
        {
          sender: 'customer',
          content: 'Hello, I have a question about my order.',
          timestamp: new Date(),
          isRead: false
        },
        {
          sender: 'admin',
          content: 'Hi! How can I help you?',
          timestamp: new Date(),
          isRead: true
        }
      ],
      isActive: true,
      lastMessageAt: new Date()
    });
  });

  afterEach(async () => {
    await Order.deleteMany({});
    await Conversation.deleteMany({});
    await AdminUser.deleteMany({});
  });

  describe('GET /api/v1/admin/conversations', () => {
    it('should get all conversations successfully', async () => {
      const response = await request(app)
        .get('/api/v1/admin/conversations')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Conversations retrieved successfully');
      expect(response.body.data).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('pagination');
      expect(Array.isArray(response.body.data.data)).toBe(true);
      expect(response.body.data.data.length).toBeGreaterThan(0);
    });

    it('should support pagination parameters', async () => {
      const response = await request(app)
        .get('/api/v1/admin/conversations?page=1&limit=5')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.pagination.currentPage).toBe(1);
      expect(response.body.data.pagination.limit).toBe(5);
    });

    it('should require authentication', async () => {
      await request(app)
        .get('/api/v1/admin/conversations')
        .expect(401);
    });

    it('should reject invalid pagination parameters', async () => {
      await request(app)
        .get('/api/v1/admin/conversations?page=0&limit=101')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
    });
  });

  describe('GET /api/v1/admin/conversations/:orderId', () => {
    it('should get conversation by order ID successfully', async () => {
      const response = await request(app)
        .get(`/api/v1/admin/conversations/${testOrder._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Conversation retrieved successfully');
      expect(response.body.data.conversation).toHaveProperty('orderId');
      expect(response.body.data.conversation.orderId.toString()).toBe(testOrder._id.toString());
      expect(response.body.data.conversation).toHaveProperty('messages');
      expect(Array.isArray(response.body.data.conversation.messages)).toBe(true);
    });

    it('should return 404 for non-existent conversation', async () => {
      const nonExistentOrderId = new mongoose.Types.ObjectId();
      
      const response = await request(app)
        .get(`/api/v1/admin/conversations/${nonExistentOrderId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('CONVERSATION_NOT_FOUND');
    });

    it('should require authentication', async () => {
      await request(app)
        .get(`/api/v1/admin/conversations/${testOrder._id}`)
        .expect(401);
    });

    it('should reject invalid order ID format', async () => {
      await request(app)
        .get('/api/v1/admin/conversations/invalid-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
    });
  });

  describe('POST /api/v1/admin/conversations/:orderId/messages', () => {
    it('should send regular message successfully', async () => {
      const messageData = {
        content: 'Thank you for your inquiry. Let me help you with that.',
        isQuote: false
      };

      const response = await request(app)
        .post(`/api/v1/admin/conversations/${testOrder._id}/messages`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(messageData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Message sent successfully');
      expect(response.body.data.conversation).toHaveProperty('messages');
      
      const messages = response.body.data.conversation.messages;
      const lastMessage = messages[messages.length - 1];
      expect(lastMessage.sender).toBe('admin');
      expect(lastMessage.content).toBe(messageData.content);
      expect(lastMessage.isQuote).toBe(false);
    });

    it('should send quote message successfully', async () => {
      const quoteData = {
        content: 'Based on your requirements, the total cost would be $75.',
        isQuote: true,
        quoteAmount: 75.00
      };

      const response = await request(app)
        .post(`/api/v1/admin/conversations/${testOrder._id}/messages`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(quoteData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Quote message sent successfully');
      expect(response.body.data.conversation).toHaveProperty('messages');
      
      const messages = response.body.data.conversation.messages;
      const lastMessage = messages[messages.length - 1];
      expect(lastMessage.sender).toBe('admin');
      expect(lastMessage.content).toBe(quoteData.content);
      expect(lastMessage.isQuote).toBe(true);
      expect(lastMessage.quoteAmount).toBe(quoteData.quoteAmount);
    });

    it('should require authentication', async () => {
      const messageData = {
        content: 'Test message',
        isQuote: false
      };

      await request(app)
        .post(`/api/v1/admin/conversations/${testOrder._id}/messages`)
        .send(messageData)
        .expect(401);
    });

    it('should validate message content', async () => {
      const invalidData = {
        content: '',
        isQuote: false
      };

      await request(app)
        .post(`/api/v1/admin/conversations/${testOrder._id}/messages`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);
    });

    it('should require quote amount for quote messages', async () => {
      const invalidQuoteData = {
        content: 'This is a quote message',
        isQuote: true
        // Missing quoteAmount
      };

      await request(app)
        .post(`/api/v1/admin/conversations/${testOrder._id}/messages`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidQuoteData)
        .expect(400);
    });

    it('should reject invalid order ID format', async () => {
      const messageData = {
        content: 'Test message',
        isQuote: false
      };

      await request(app)
        .post('/api/v1/admin/conversations/invalid-id/messages')
        .set('Authorization', `Bearer ${authToken}`)
        .send(messageData)
        .expect(400);
    });

    it('should reject message content that is too long', async () => {
      const longContent = 'a'.repeat(2001); // Exceeds 2000 character limit
      const messageData = {
        content: longContent,
        isQuote: false
      };

      const response = await request(app)
        .post(`/api/v1/admin/conversations/${testOrder._id}/messages`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(messageData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/admin/conversations/attention', () => {
    it('should get conversations requiring attention', async () => {
      const response = await request(app)
        .get('/api/v1/admin/conversations/attention')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Conversations requiring attention retrieved successfully');
      expect(response.body.data).toHaveProperty('data');
      expect(Array.isArray(response.body.data.data)).toBe(true);
    });

    it('should require authentication', async () => {
      await request(app)
        .get('/api/v1/admin/conversations/attention')
        .expect(401);
    });
  });

  describe('GET /api/v1/admin/conversations/recent', () => {
    it('should get recent conversations', async () => {
      const response = await request(app)
        .get('/api/v1/admin/conversations/recent')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Recent conversations retrieved successfully');
      expect(response.body.data).toHaveProperty('conversations');
      expect(Array.isArray(response.body.data.conversations)).toBe(true);
    });

    it('should support limit parameter', async () => {
      const response = await request(app)
        .get('/api/v1/admin/conversations/recent?limit=5')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should require authentication', async () => {
      await request(app)
        .get('/api/v1/admin/conversations/recent')
        .expect(401);
    });
  });

  describe('GET /api/v1/admin/conversations/search', () => {
    it('should search conversations successfully', async () => {
      const response = await request(app)
        .get('/api/v1/admin/conversations/search?q=question')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Search completed successfully');
      expect(response.body.data).toHaveProperty('data');
      expect(Array.isArray(response.body.data.data)).toBe(true);
    });

    it('should require search query', async () => {
      await request(app)
        .get('/api/v1/admin/conversations/search')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
    });

    it('should require authentication', async () => {
      await request(app)
        .get('/api/v1/admin/conversations/search?q=test')
        .expect(401);
    });
  });

  describe('GET /api/v1/admin/conversations/statistics', () => {
    it('should get conversation statistics', async () => {
      const response = await request(app)
        .get('/api/v1/admin/conversations/statistics')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Statistics retrieved successfully');
      expect(response.body.data).toHaveProperty('statistics');
    });

    it('should require authentication', async () => {
      await request(app)
        .get('/api/v1/admin/conversations/statistics')
        .expect(401);
    });
  });

  describe('GET /api/v1/admin/conversations/customer/:customerEmail', () => {
    it('should get conversations by customer email', async () => {
      const response = await request(app)
        .get(`/api/v1/admin/conversations/customer/${testOrder.customerEmail}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Customer conversations retrieved successfully');
      expect(response.body.data).toHaveProperty('data');
      expect(Array.isArray(response.body.data.data)).toBe(true);
    });

    it('should require authentication', async () => {
      await request(app)
        .get(`/api/v1/admin/conversations/customer/${testOrder.customerEmail}`)
        .expect(401);
    });

    it('should validate email format', async () => {
      await request(app)
        .get('/api/v1/admin/conversations/customer/invalid-email')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
    });
  });

  describe('PUT /api/v1/admin/conversations/:orderId/read', () => {
    it('should mark messages as read successfully', async () => {
      const response = await request(app)
        .put(`/api/v1/admin/conversations/${testOrder._id}/read`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Messages marked as read successfully');
      expect(response.body.data).toHaveProperty('conversation');
    });

    it('should return 404 for non-existent conversation', async () => {
      const nonExistentOrderId = new mongoose.Types.ObjectId();
      
      await request(app)
        .put(`/api/v1/admin/conversations/${nonExistentOrderId}/read`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should require authentication', async () => {
      await request(app)
        .put(`/api/v1/admin/conversations/${testOrder._id}/read`)
        .expect(401);
    });
  });

  describe('PUT /api/v1/admin/conversations/:orderId/archive', () => {
    it('should archive conversation successfully', async () => {
      const response = await request(app)
        .put(`/api/v1/admin/conversations/${testOrder._id}/archive`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Conversation archived successfully');
      expect(response.body.data).toHaveProperty('conversation');
    });

    it('should return 404 for non-existent conversation', async () => {
      const nonExistentOrderId = new mongoose.Types.ObjectId();
      
      await request(app)
        .put(`/api/v1/admin/conversations/${nonExistentOrderId}/archive`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should require authentication', async () => {
      await request(app)
        .put(`/api/v1/admin/conversations/${testOrder._id}/archive`)
        .expect(401);
    });
  });

  describe('PUT /api/v1/admin/conversations/:orderId/reactivate', () => {
    beforeEach(async () => {
      // Archive the conversation first
      await Conversation.findOneAndUpdate(
        { orderId: testOrder._id },
        { isActive: false }
      );
    });

    it('should reactivate conversation successfully', async () => {
      const response = await request(app)
        .put(`/api/v1/admin/conversations/${testOrder._id}/reactivate`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Conversation reactivated successfully');
      expect(response.body.data).toHaveProperty('conversation');
    });

    it('should return 404 for non-existent conversation', async () => {
      const nonExistentOrderId = new mongoose.Types.ObjectId();
      
      await request(app)
        .put(`/api/v1/admin/conversations/${nonExistentOrderId}/reactivate`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should require authentication', async () => {
      await request(app)
        .put(`/api/v1/admin/conversations/${testOrder._id}/reactivate`)
        .expect(401);
    });
  });
});