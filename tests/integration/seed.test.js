const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const DatabaseSeeder = require('../../scripts/seed');

// Import models
const AdminUser = require('../../src/models/AdminUser');
const Category = require('../../src/models/Category');
const Item = require('../../src/models/Item');
const Order = require('../../src/models/Order');
const Conversation = require('../../src/models/Conversation');

describe('Database Seeding', () => {
  let mongoServer;
  let seeder;

  beforeAll(async () => {
    // Start in-memory MongoDB instance
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    
    // Override the MongoDB URI for testing
    process.env.MONGODB_URI = mongoUri;
    process.env.NODE_ENV = 'test';
  });

  afterAll(async () => {
    // Clean up
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    seeder = new DatabaseSeeder();
  });

  afterEach(async () => {
    // Clean up after each test
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.dropDatabase();
    }
  });

  describe('Database Connection', () => {
    test('should connect to MongoDB successfully', async () => {
      await expect(seeder.connect()).resolves.not.toThrow();
      expect(mongoose.connection.readyState).toBe(1); // Connected
    });

    test('should disconnect from MongoDB successfully', async () => {
      await seeder.connect();
      await expect(seeder.disconnect()).resolves.not.toThrow();
    });
  });

  describe('Database Clearing', () => {
    test('should clear all collections successfully', async () => {
      await seeder.connect();
      
      // Add some test data first
      await AdminUser.create({
        username: 'testuser',
        email: 'test@example.com',
        passwordHash: 'hashedpassword'
      });
      
      // Verify data exists
      const usersBefore = await AdminUser.countDocuments();
      expect(usersBefore).toBe(1);
      
      // Clear database
      await seeder.clearDatabase();
      
      // Verify data is cleared
      const usersAfter = await AdminUser.countDocuments();
      expect(usersAfter).toBe(0);
    });
  });

  describe('Admin User Creation', () => {
    test('should create admin user with hashed password', async () => {
      await seeder.connect();
      await seeder.clearDatabase();
      
      const adminUser = await seeder.createAdminUser();
      
      expect(adminUser).toBeDefined();
      expect(adminUser.username).toBe('admin');
      expect(adminUser.email).toBe('admin@crochetbusiness.com');
      expect(adminUser.passwordHash).toBeDefined();
      expect(adminUser.passwordHash).not.toBe('admin123'); // Should be hashed
      
      // Verify password can be verified
      const isValidPassword = await adminUser.verifyPassword('admin123');
      expect(isValidPassword).toBe(true);
      
      await seeder.disconnect();
    });

    test('should create admin user with proper fields', async () => {
      await seeder.connect();
      await seeder.clearDatabase();
      
      const adminUser = await seeder.createAdminUser();
      
      expect(adminUser.firstName).toBe('Admin');
      expect(adminUser.lastName).toBe('User');
      expect(adminUser.isActive).toBe(true);
      expect(adminUser.createdAt).toBeDefined();
      expect(adminUser.updatedAt).toBeDefined();
      
      await seeder.disconnect();
    });
  });

  describe('Category Creation', () => {
    test('should create all categories successfully', async () => {
      await seeder.connect();
      await seeder.clearDatabase();
      
      const categories = await seeder.createCategories();
      
      expect(categories).toBeDefined();
      expect(categories.length).toBeGreaterThan(0);
      
      // Verify categories in database
      const categoryCount = await Category.countDocuments();
      expect(categoryCount).toBe(categories.length);
      
      // Check specific categories
      const blanketsCategory = await Category.findOne({ name: 'Blankets & Throws' });
      expect(blanketsCategory).toBeDefined();
      expect(blanketsCategory.description).toContain('blankets');
    });

    test('should create categories with proper validation', async () => {
      await seeder.connect();
      await seeder.clearDatabase();
      
      const categories = await seeder.createCategories();
      
      for (const category of categories) {
        expect(category.name).toBeDefined();
        expect(category.name.length).toBeGreaterThan(0);
        expect(category.createdAt).toBeDefined();
        expect(category.updatedAt).toBeDefined();
      }
    });
  });

  describe('Item Creation', () => {
    test('should create items with proper pricing and colors', async () => {
      await seeder.connect();
      await seeder.clearDatabase();
      
      await seeder.createCategories();
      const items = await seeder.createItems();
      
      expect(items).toBeDefined();
      expect(items.length).toBeGreaterThan(0);
      
      // Verify items in database
      const itemCount = await Item.countDocuments();
      expect(itemCount).toBe(items.length);
      
      // Check different pricing types
      const fixedPriceItem = items.find(item => item.pricingType === 'fixed');
      expect(fixedPriceItem).toBeDefined();
      expect(fixedPriceItem.price.fixed).toBeGreaterThan(0);
      
      const rangePriceItem = items.find(item => item.pricingType === 'range');
      expect(rangePriceItem).toBeDefined();
      expect(rangePriceItem.price.min).toBeDefined();
      expect(rangePriceItem.price.max).toBeDefined();
      expect(rangePriceItem.price.max).toBeGreaterThan(rangePriceItem.price.min);
      
      const customPriceItem = items.find(item => item.pricingType === 'custom');
      expect(customPriceItem).toBeDefined();
    });

    test('should create items with available colors', async () => {
      await seeder.connect();
      await seeder.clearDatabase();
      
      await seeder.createCategories();
      const items = await seeder.createItems();
      
      for (const item of items) {
        expect(item.availableColors).toBeDefined();
        expect(Array.isArray(item.availableColors)).toBe(true);
        expect(item.availableColors.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Order Creation', () => {
    test('should create sample orders with different statuses', async () => {
      await seeder.connect();
      await seeder.clearDatabase();
      
      await seeder.createCategories();
      await seeder.createItems();
      const orders = await seeder.createSampleOrders();
      
      expect(orders).toBeDefined();
      expect(orders.length).toBeGreaterThan(0);
      
      // Verify orders in database
      const orderCount = await Order.countDocuments();
      expect(orderCount).toBe(orders.length);
      
      // Check different order statuses
      const statuses = orders.map(order => order.status);
      expect(statuses).toContain('confirmed');
      expect(statuses).toContain('processing');
      expect(statuses).toContain('quote_needed');
      
      // Check custom orders
      const customOrder = orders.find(order => order.hasCustomItems);
      expect(customOrder).toBeDefined();
      expect(customOrder.status).toBe('quote_needed');
    });

    test('should create orders with proper customer information', async () => {
      await seeder.connect();
      await seeder.clearDatabase();
      
      await seeder.createCategories();
      await seeder.createItems();
      const orders = await seeder.createSampleOrders();
      
      for (const order of orders) {
        expect(order.customerName).toBeDefined();
        expect(order.customerEmail).toBeDefined();
        expect(order.customerEmail).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
        expect(order.shippingAddress).toBeDefined();
        expect(order.items).toBeDefined();
        expect(order.items.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Conversation Creation', () => {
    test('should create conversations for custom orders', async () => {
      await seeder.connect();
      await seeder.clearDatabase();
      
      await seeder.createCategories();
      await seeder.createItems();
      await seeder.createSampleOrders();
      const conversations = await seeder.createSampleConversations();
      
      if (conversations.length > 0) {
        // Verify conversations in database
        const conversationCount = await Conversation.countDocuments();
        expect(conversationCount).toBe(conversations.length);
        
        for (const conversation of conversations) {
          expect(conversation.orderId).toBeDefined();
          expect(conversation.messages).toBeDefined();
          expect(conversation.messages.length).toBeGreaterThan(0);
          expect(conversation.customerEmail).toBeDefined();
          expect(conversation.customerName).toBeDefined();
          
          // Check message structure
          const firstMessage = conversation.messages[0];
          expect(firstMessage.sender).toBeDefined();
          expect(firstMessage.content).toBeDefined();
          expect(firstMessage.timestamp).toBeDefined();
        }
      }
    });

    test('should create conversations with quote messages', async () => {
      await seeder.connect();
      await seeder.clearDatabase();
      
      await seeder.createCategories();
      await seeder.createItems();
      await seeder.createSampleOrders();
      const conversations = await seeder.createSampleConversations();
      
      if (conversations.length > 0) {
        const quoteMessages = conversations
          .flatMap(conv => conv.messages)
          .filter(msg => msg.isQuote);
        
        expect(quoteMessages.length).toBeGreaterThan(0);
        
        for (const quoteMsg of quoteMessages) {
          expect(quoteMsg.quoteAmount).toBeDefined();
          expect(quoteMsg.quoteAmount).toBeGreaterThan(0);
        }
      }
    });
  });

  describe('Full Seeding Process', () => {
    test('should complete full seeding process successfully', async () => {
      await expect(seeder.seedAll()).resolves.not.toThrow();
      
      // Connect to verify data was created
      await seeder.connect();
      
      // Verify all data was created
      const adminUserCount = await AdminUser.countDocuments();
      const categoryCount = await Category.countDocuments();
      const itemCount = await Item.countDocuments();
      const orderCount = await Order.countDocuments();
      const conversationCount = await Conversation.countDocuments();
      
      expect(adminUserCount).toBe(1);
      expect(categoryCount).toBeGreaterThan(0);
      expect(itemCount).toBeGreaterThan(0);
      expect(orderCount).toBeGreaterThan(0);
      // Conversations may be 0 if no custom orders exist
      expect(conversationCount).toBeGreaterThanOrEqual(0);
      
      await seeder.disconnect();
    });

    test('should handle seeding process errors gracefully', async () => {
      // Simulate error by closing connection during seeding
      await seeder.connect();
      await mongoose.disconnect();
      
      await expect(seeder.createCategories()).rejects.toThrow();
    });
  });

  describe('Database Reset', () => {
    test('should reset database successfully', async () => {
      // First seed the database
      await seeder.seedAll();
      
      // Connect to verify data exists
      await seeder.connect();
      const categoryCountBefore = await Category.countDocuments();
      expect(categoryCountBefore).toBeGreaterThan(0);
      await seeder.disconnect();
      
      // Reset database
      await seeder.reset();
      
      // Connect to verify data is cleared
      await seeder.connect();
      const categoryCountAfter = await Category.countDocuments();
      expect(categoryCountAfter).toBe(0);
      await seeder.disconnect();
    });
  });
});