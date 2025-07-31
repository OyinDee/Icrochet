const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../src/app');
const { Order, Conversation, Item, Category } = require('../../src/models');
const { connectDB, disconnectDB } = require('../utils/database');

describe('Public Conversations API', () => {
  let testOrder;
  let testConversation;
  let testItem;
  let testCategory;

  beforeAll(async () => {
    await connectDB();
  });

  afterAll(async () => {
    await disconnectDB();
  });

  beforeEach(async () => {
    // Clean up existing data
    await Conversation.deleteMany({});
    await Order.deleteMany({});
    await Item.deleteMany({});
    await Category.deleteMany({});

    // Create test category
    testCategory = await Category.create({
      name: 'Test Category',
      description: 'Test category for conversations'
    });

    // Create test item
    testItem = await Item.create({
      name: 'Test Item',
      description: 'A test item for conversations',
      pricingType: 'fixed',
      price: { fixed: 25.99 },
      categoryId: testCategory._id,
      isAvailable: true,
      availableColors: ['Red', 'Blue']
    });

    // Create test order
    testOrder = await Order.create({
      customerName: 'John Doe',
      customerEmail: 'john.doe@example.com',
      customerPhone: '+1234567890',
      shippingAddress: '123 Test Street, Test City, TC 12345',
      items: [{
        itemId: testItem._id,
        quantity: 2,
        selectedColor: 'Red',
        unitPrice: 25.99,
        subtotal: 51.98
      }],
      totalAmount: 51.98,
      status: 'pending'
    });

    // Create test conversation
    testConversation = await Conversation.create({
      orderId: testOrder._id,
      customerName: testOrder.customerName,
      customerEmail: testOrder.customerEmail,
      messages: [
        {
          sender: 'admin',
          content: 'Hello! Thank you for your order. How can I help you?',
          timestamp: new Date(),
          isRead: false
        },
        {
          sender: 'customer',
          content: 'Hi! I wanted to ask about the delivery time.',
          timestamp: new Date(),
          isRead: true
        }
      ],
      isActive: true,
      lastMessageAt: new Date()
    });
  });

  describe('GET /api/v1/public/conversations/:orderId', () => {
    it('should get conversation by order ID for customer', async () => {
      const response = await request(app)
        .get(`/api/v1/public/conversations/${testOrder._id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.conversation).toBeDefined();
      expect(response.body.data.conversation.orderId).toBe(testOrder._id.toString());
      expect(response.body.data.conversation.messages).toHaveLength(2);
      
      // Verify customer-specific formatting
      expect(response.body.data.conversation).toHaveProperty('unreadByCustomer');
      expect(response.body.data.conversation).not.toHaveProperty('unreadByAdmin');
      expect(response.body.data.conversation.unreadByCustomer).toBe(1); // One unread admin message
    });

    it('should include all message details for customer', async () => {
      const response = await request(app)
        .get(`/api/v1/public/conversations/${testOrder._id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      const messages = response.body.data.conversation.messages;
      
      messages.forEach(message => {
        expect(message).toHaveProperty('id');
        expect(message).toHaveProperty('sender');
        expect(message).toHaveProperty('content');
        expect(message).toHaveProperty('timestamp');
        expect(message).toHaveProperty('isQuote');
        expect(['admin', 'customer']).toContain(message.sender);
      });
    });

    it('should return 404 for non-existent order', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      
      const response = await request(app)
        .get(`/api/v1/public/conversations/${nonExistentId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('CONVERSATION_NOT_FOUND');
    });

    it('should return 400 for invalid order ID', async () => {
      const response = await request(app)
        .get('/api/v1/public/conversations/invalid-id')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should handle conversation with quote messages', async () => {
      // Add a quote message to the conversation
      await Conversation.findByIdAndUpdate(testConversation._id, {
        $push: {
          messages: {
            sender: 'admin',
            content: 'Here is your custom quote for the modifications.',
            timestamp: new Date(),
            isQuote: true,
            quoteAmount: 75.50,
            isRead: false
          }
        }
      });

      const response = await request(app)
        .get(`/api/v1/public/conversations/${testOrder._id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      const messages = response.body.data.conversation.messages;
      const quoteMessage = messages.find(msg => msg.isQuote);
      
      expect(quoteMessage).toBeDefined();
      expect(quoteMessage.quoteAmount).toBe(75.50);
      expect(quoteMessage.sender).toBe('admin');
    });
  });

  describe('POST /api/v1/public/conversations/:orderId/messages', () => {
    it('should send customer message successfully', async () => {
      const messageContent = 'Thank you for the quick response! When will it be ready?';
      
      const response = await request(app)
        .post(`/api/v1/public/conversations/${testOrder._id}/messages`)
        .send({ content: messageContent })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Message sent successfully');
      expect(response.body.data.conversation).toBeDefined();
      
      // Verify the message was added
      const messages = response.body.data.conversation.messages;
      const newMessage = messages[messages.length - 1];
      expect(newMessage.content).toBe(messageContent);
      expect(newMessage.sender).toBe('customer');
    });

    it('should update conversation message count', async () => {
      const initialResponse = await request(app)
        .get(`/api/v1/public/conversations/${testOrder._id}`)
        .expect(200);
      
      const initialCount = initialResponse.body.data.conversation.messageCount;

      await request(app)
        .post(`/api/v1/public/conversations/${testOrder._id}/messages`)
        .send({ content: 'New customer message' })
        .expect(201);

      const updatedResponse = await request(app)
        .get(`/api/v1/public/conversations/${testOrder._id}`)
        .expect(200);

      expect(updatedResponse.body.data.conversation.messageCount).toBe(initialCount + 1);
    });

    it('should return 400 for empty message content', async () => {
      const response = await request(app)
        .post(`/api/v1/public/conversations/${testOrder._id}/messages`)
        .send({ content: '' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for missing message content', async () => {
      const response = await request(app)
        .post(`/api/v1/public/conversations/${testOrder._id}/messages`)
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for message content too long', async () => {
      const longContent = 'a'.repeat(2001); // Exceeds 2000 character limit
      
      const response = await request(app)
        .post(`/api/v1/public/conversations/${testOrder._id}/messages`)
        .send({ content: longContent })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for invalid order ID', async () => {
      const response = await request(app)
        .post('/api/v1/public/conversations/invalid-id/messages')
        .send({ content: 'Test message' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should handle non-existent order gracefully', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      
      const response = await request(app)
        .post(`/api/v1/public/conversations/${nonExistentId}/messages`)
        .send({ content: 'Test message' })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('ORDER_NOT_FOUND');
    });

    it('should trim whitespace from message content', async () => {
      const messageContent = '  This message has whitespace  ';
      
      const response = await request(app)
        .post(`/api/v1/public/conversations/${testOrder._id}/messages`)
        .send({ content: messageContent })
        .expect(201);

      expect(response.body.success).toBe(true);
      const messages = response.body.data.conversation.messages;
      const newMessage = messages[messages.length - 1];
      expect(newMessage.content).toBe(messageContent.trim());
    });

    it('should handle special characters in message content', async () => {
      const messageContent = 'Hello! Can you make it in blue? 💙 Thanks! 😊';
      
      const response = await request(app)
        .post(`/api/v1/public/conversations/${testOrder._id}/messages`)
        .send({ content: messageContent })
        .expect(201);

      expect(response.body.success).toBe(true);
      const messages = response.body.data.conversation.messages;
      const newMessage = messages[messages.length - 1];
      expect(newMessage.content).toBe(messageContent);
    });
  });

  describe('Conversation creation for new orders', () => {
    it('should create conversation when sending first message to order without conversation', async () => {
      // Create a new order without conversation
      const newOrder = await Order.create({
        customerName: 'Jane Smith',
        customerEmail: 'jane.smith@example.com',
        shippingAddress: '456 Another Street, Test City, TC 12345',
        items: [{
          itemId: testItem._id,
          quantity: 1,
          selectedColor: 'Blue',
          unitPrice: 25.99,
          subtotal: 25.99
        }],
        totalAmount: 25.99,
        status: 'pending'
      });

      const response = await request(app)
        .post(`/api/v1/public/conversations/${newOrder._id}/messages`)
        .send({ content: 'Hello, I have a question about my order.' })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.conversation).toBeDefined();
      expect(response.body.data.conversation.orderId).toBe(newOrder._id.toString());
      expect(response.body.data.conversation.messages).toHaveLength(1);
    });
  });

  describe('Response format consistency', () => {
    it('should return consistent response format for GET', async () => {
      const response = await request(app)
        .get(`/api/v1/public/conversations/${testOrder._id}`)
        .expect(200);

      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body.data).toHaveProperty('conversation');
    });

    it('should return consistent response format for POST', async () => {
      const response = await request(app)
        .post(`/api/v1/public/conversations/${testOrder._id}/messages`)
        .send({ content: 'Test message' })
        .expect(201);

      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body.data).toHaveProperty('conversation');
    });

    it('should return consistent error format', async () => {
      const response = await request(app)
        .get('/api/v1/public/conversations/invalid-id')
        .expect(400);

      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body.error).toHaveProperty('code');
      expect(response.body.error).toHaveProperty('message');
      expect(response.body.success).toBe(false);
    });
  });

  describe('Customer data privacy', () => {
    it('should not expose admin-specific data to customers', async () => {
      const response = await request(app)
        .get(`/api/v1/public/conversations/${testOrder._id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      const conversation = response.body.data.conversation;
      
      // Should not have admin-specific fields
      expect(conversation).not.toHaveProperty('unreadByAdmin');
      expect(conversation).not.toHaveProperty('adminNotes');
      expect(conversation).not.toHaveProperty('internalFlags');
      
      // Should have customer-relevant fields
      expect(conversation).toHaveProperty('unreadByCustomer');
      expect(conversation).toHaveProperty('messageCount');
      expect(conversation).toHaveProperty('isActive');
    });

    it('should include customer-relevant message information', async () => {
      const response = await request(app)
        .get(`/api/v1/public/conversations/${testOrder._id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      const messages = response.body.data.conversation.messages;
      
      messages.forEach(message => {
        // Should have essential message fields
        expect(message).toHaveProperty('sender');
        expect(message).toHaveProperty('content');
        expect(message).toHaveProperty('timestamp');
        expect(message).toHaveProperty('isQuote');
        
        // Quote messages should include quote amount
        if (message.isQuote) {
          expect(message).toHaveProperty('quoteAmount');
        }
      });
    });
  });

  describe('Error handling', () => {
    it('should handle database errors gracefully', async () => {
      // Mock a database error by closing the connection temporarily
      await mongoose.connection.close();

      const response = await request(app)
        .get(`/api/v1/public/conversations/${testOrder._id}`)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBeDefined();

      // Reconnect for cleanup
      await connectDB();
    });

    it('should validate request parameters', async () => {
      const response = await request(app)
        .post('/api/v1/public/conversations/invalid-id/messages')
        .send({ content: 'Test message' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should validate request body', async () => {
      const response = await request(app)
        .post(`/api/v1/public/conversations/${testOrder._id}/messages`)
        .send({ invalidField: 'invalid value' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });
});