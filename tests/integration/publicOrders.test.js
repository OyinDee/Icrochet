const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../src/app');
const { Item, Category, Order } = require('../../src/models');
const { connectDB, disconnectDB } = require('../utils/database');

describe('Public Orders API', () => {
  let testCategory;
  let fixedPriceItem;
  let rangePriceItem;
  let customPriceItem;
  let unavailableItem;

  beforeAll(async () => {
    await connectDB();
  });

  afterAll(async () => {
    await disconnectDB();
  });

  beforeEach(async () => {
    // Clean up collections
    await Order.deleteMany({});
    await Item.deleteMany({});
    await Category.deleteMany({});

    // Create test category
    testCategory = await Category.create({
      name: 'Test Category',
      description: 'Category for testing'
    });

    // Create test items with different pricing types
    fixedPriceItem = await Item.create({
      name: 'Fixed Price Scarf',
      description: 'A beautiful scarf with fixed pricing',
      pricingType: 'fixed',
      price: { fixed: 25.99 },
      categoryId: testCategory._id,
      isAvailable: true,
      availableColors: ['red', 'blue', 'green'],
      imageUrls: ['https://example.com/scarf1.jpg']
    });

    rangePriceItem = await Item.create({
      name: 'Range Price Hat',
      description: 'A hat with range pricing',
      pricingType: 'range',
      price: { min: 15.00, max: 30.00 },
      categoryId: testCategory._id,
      isAvailable: true,
      availableColors: ['black', 'white', 'gray'],
      imageUrls: ['https://example.com/hat1.jpg']
    });

    customPriceItem = await Item.create({
      name: 'Custom Blanket',
      description: 'A custom blanket requiring measurements',
      pricingType: 'custom',
      price: {},
      categoryId: testCategory._id,
      isAvailable: true,
      availableColors: ['pink', 'purple', 'yellow'],
      imageUrls: ['https://example.com/blanket1.jpg']
    });

    unavailableItem = await Item.create({
      name: 'Unavailable Item',
      description: 'An unavailable item',
      pricingType: 'fixed',
      price: { fixed: 20.00 },
      categoryId: testCategory._id,
      isAvailable: false,
      availableColors: ['brown'],
      imageUrls: ['https://example.com/unavailable.jpg']
    });
  });

  describe('POST /api/v1/public/orders', () => {
    const validOrderData = {
      customerName: 'John Doe',
      customerEmail: 'john.doe@example.com',
      customerPhone: '+1234567890',
      shippingAddress: '123 Main St, Anytown, ST 12345',
      items: [],
      notes: 'Please handle with care'
    };

    it('should create order with fixed price item successfully', async () => {
      const orderData = {
        ...validOrderData,
        items: [{
          itemId: fixedPriceItem._id.toString(),
          quantity: 2,
          selectedColor: 'red'
        }]
      };

      const response = await request(app)
        .post('/api/v1/public/orders')
        .send(orderData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Order created successfully.');
      expect(response.body.data.order).toMatchObject({
        customerName: 'John Doe',
        customerEmail: 'john.doe@example.com',
        status: 'pending',
        hasCustomItems: false,
        totalAmount: 51.98 // 25.99 * 2
      });
      expect(response.body.data.requiresQuote).toBe(false);
      expect(response.body.data.order.items).toHaveLength(1);
      expect(response.body.data.order.items[0]).toMatchObject({
        itemId: fixedPriceItem._id.toString(),
        quantity: 2,
        selectedColor: 'red',
        unitPrice: 25.99,
        subtotal: 51.98
      });
    });

    it('should create order with range price item successfully', async () => {
      const orderData = {
        ...validOrderData,
        items: [{
          itemId: rangePriceItem._id.toString(),
          quantity: 1,
          selectedColor: 'black'
        }]
      };

      const response = await request(app)
        .post('/api/v1/public/orders')
        .send(orderData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.order.status).toBe('pending');
      expect(response.body.data.order.hasCustomItems).toBe(false);
      expect(response.body.data.order.totalAmount).toBeNull();
      expect(response.body.data.order.estimatedAmount).toBe(22.5); // (15 + 30) / 2
      expect(response.body.data.requiresQuote).toBe(false);
    });

    it('should create order with custom price item requiring quote', async () => {
      const orderData = {
        ...validOrderData,
        items: [{
          itemId: customPriceItem._id.toString(),
          quantity: 1,
          selectedColor: 'pink',
          customRequirements: 'King size, extra soft'
        }]
      };

      const response = await request(app)
        .post('/api/v1/public/orders')
        .send(orderData)
        .expect(202);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Order created successfully. A quote will be provided soon.');
      expect(response.body.data.order.status).toBe('quote_needed');
      expect(response.body.data.order.hasCustomItems).toBe(true);
      expect(response.body.data.order.totalAmount).toBeNull();
      expect(response.body.data.requiresQuote).toBe(true);
      expect(response.body.data.order.items[0].customRequirements).toBe('King size, extra soft');
    });

    it('should create order with mixed pricing types', async () => {
      const orderData = {
        ...validOrderData,
        items: [
          {
            itemId: fixedPriceItem._id.toString(),
            quantity: 1,
            selectedColor: 'blue'
          },
          {
            itemId: customPriceItem._id.toString(),
            quantity: 1,
            selectedColor: 'purple',
            customRequirements: 'Medium size'
          }
        ]
      };

      const response = await request(app)
        .post('/api/v1/public/orders')
        .send(orderData)
        .expect(202);

      expect(response.body.success).toBe(true);
      expect(response.body.data.order.status).toBe('quote_needed');
      expect(response.body.data.order.hasCustomItems).toBe(true);
      expect(response.body.data.order.totalAmount).toBeNull();
      expect(response.body.data.order.estimatedAmount).toBe(25.99);
      expect(response.body.data.requiresQuote).toBe(true);
    });

    it('should validate customer name is required', async () => {
      const orderData = {
        ...validOrderData,
        customerName: '',
        items: [{
          itemId: fixedPriceItem._id.toString(),
          quantity: 1
        }]
      };

      const response = await request(app)
        .post('/api/v1/public/orders')
        .send(orderData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details).toHaveProperty('customerName');
    });

    it('should validate customer email format', async () => {
      const orderData = {
        ...validOrderData,
        customerEmail: 'invalid-email',
        items: [{
          itemId: fixedPriceItem._id.toString(),
          quantity: 1
        }]
      };

      const response = await request(app)
        .post('/api/v1/public/orders')
        .send(orderData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details).toHaveProperty('customerEmail');
    });

    it('should validate shipping address is required and minimum length', async () => {
      const orderData = {
        ...validOrderData,
        shippingAddress: 'Short',
        items: [{
          itemId: fixedPriceItem._id.toString(),
          quantity: 1
        }]
      };

      const response = await request(app)
        .post('/api/v1/public/orders')
        .send(orderData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details).toHaveProperty('shippingAddress');
    });

    it('should validate items array is required and not empty', async () => {
      const orderData = {
        ...validOrderData,
        items: []
      };

      const response = await request(app)
        .post('/api/v1/public/orders')
        .send(orderData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details).toHaveProperty('items');
    });

    it('should validate item quantity is within valid range', async () => {
      const orderData = {
        ...validOrderData,
        items: [{
          itemId: fixedPriceItem._id.toString(),
          quantity: 0
        }]
      };

      const response = await request(app)
        .post('/api/v1/public/orders')
        .send(orderData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details['items.0.quantity']).toBeDefined();
    });

    it('should validate item ID format', async () => {
      const orderData = {
        ...validOrderData,
        items: [{
          itemId: 'invalid-id',
          quantity: 1
        }]
      };

      const response = await request(app)
        .post('/api/v1/public/orders')
        .send(orderData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details['items.0.itemId']).toBeDefined();
    });

    it('should return error for non-existent item', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const orderData = {
        ...validOrderData,
        items: [{
          itemId: nonExistentId.toString(),
          quantity: 1
        }]
      };

      const response = await request(app)
        .post('/api/v1/public/orders')
        .send(orderData)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('ITEMS_NOT_FOUND');
      expect(response.body.error.message).toContain('Items not found');
    });

    it('should return error for unavailable item', async () => {
      const orderData = {
        ...validOrderData,
        items: [{
          itemId: unavailableItem._id.toString(),
          quantity: 1
        }]
      };

      const response = await request(app)
        .post('/api/v1/public/orders')
        .send(orderData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('ITEMS_UNAVAILABLE');
      expect(response.body.error.message).toBe('Some items are not available');
    });

    it('should validate color selection against available colors', async () => {
      const orderData = {
        ...validOrderData,
        items: [{
          itemId: fixedPriceItem._id.toString(),
          quantity: 1,
          selectedColor: 'orange' // Not in available colors
        }]
      };

      const response = await request(app)
        .post('/api/v1/public/orders')
        .send(orderData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('COLOR_NOT_AVAILABLE');
      expect(response.body.error.message).toContain("Color 'orange' not available");
    });

    it('should allow valid color selection', async () => {
      const orderData = {
        ...validOrderData,
        items: [{
          itemId: fixedPriceItem._id.toString(),
          quantity: 1,
          selectedColor: 'green' // Valid color
        }]
      };

      const response = await request(app)
        .post('/api/v1/public/orders')
        .send(orderData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.order.items[0].selectedColor).toBe('green');
    });

    it('should allow order without color selection for items with available colors', async () => {
      const orderData = {
        ...validOrderData,
        items: [{
          itemId: fixedPriceItem._id.toString(),
          quantity: 1
          // No selectedColor
        }]
      };

      const response = await request(app)
        .post('/api/v1/public/orders')
        .send(orderData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.order.items[0].selectedColor).toBeUndefined();
    });

    it('should handle case-insensitive color matching', async () => {
      const orderData = {
        ...validOrderData,
        items: [{
          itemId: fixedPriceItem._id.toString(),
          quantity: 1,
          selectedColor: 'RED' // Uppercase
        }]
      };

      const response = await request(app)
        .post('/api/v1/public/orders')
        .send(orderData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.order.items[0].selectedColor).toBe('RED');
    });

    it('should validate phone number format when provided', async () => {
      const orderData = {
        ...validOrderData,
        customerPhone: 'invalid-phone',
        items: [{
          itemId: fixedPriceItem._id.toString(),
          quantity: 1
        }]
      };

      const response = await request(app)
        .post('/api/v1/public/orders')
        .send(orderData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details).toHaveProperty('customerPhone');
    });

    it('should allow empty phone number', async () => {
      const orderData = {
        ...validOrderData,
        customerPhone: '',
        items: [{
          itemId: fixedPriceItem._id.toString(),
          quantity: 1
        }]
      };

      const response = await request(app)
        .post('/api/v1/public/orders')
        .send(orderData)
        .expect(201);

      expect(response.body.success).toBe(true);
    });

    it('should validate custom requirements length', async () => {
      const longRequirements = 'x'.repeat(1001); // Exceeds 1000 character limit
      const orderData = {
        ...validOrderData,
        items: [{
          itemId: customPriceItem._id.toString(),
          quantity: 1,
          customRequirements: longRequirements
        }]
      };

      const response = await request(app)
        .post('/api/v1/public/orders')
        .send(orderData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details['items.0.customRequirements']).toBeDefined();
    });

    it('should validate notes length', async () => {
      const longNotes = 'x'.repeat(1001); // Exceeds 1000 character limit
      const orderData = {
        ...validOrderData,
        notes: longNotes,
        items: [{
          itemId: fixedPriceItem._id.toString(),
          quantity: 1
        }]
      };

      const response = await request(app)
        .post('/api/v1/public/orders')
        .send(orderData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details).toHaveProperty('notes');
    });

    it('should create order with multiple items of same type', async () => {
      
      const orderData = {
        ...validOrderData,
        items: [
          {
            itemId: fixedPriceItem._id.toString(),
            quantity: 2,
            selectedColor: 'red'
          },
          {
            itemId: fixedPriceItem._id.toString(),
            quantity: 1,
            selectedColor: 'blue'
          }
        ]
      };

      const response = await request(app)
        .post('/api/v1/public/orders')
        .send(orderData)
        .expect(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.order.items).toHaveLength(2);
      expect(response.body.data.order.totalAmount).toBe(77.97); // (25.99 * 2) + (25.99 * 1)
    });

    it('should normalize customer email to lowercase', async () => {
      const orderData = {
        ...validOrderData,
        customerEmail: 'JOHN.DOE@EXAMPLE.COM',
        items: [{
          itemId: fixedPriceItem._id.toString(),
          quantity: 1
        }]
      };

      const response = await request(app)
        .post('/api/v1/public/orders')
        .send(orderData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.order.customerEmail).toBe('john.doe@example.com');
    });

    it('should persist order to database', async () => {
      const orderData = {
        ...validOrderData,
        items: [{
          itemId: fixedPriceItem._id.toString(),
          quantity: 1,
          selectedColor: 'red'
        }]
      };

      const response = await request(app)
        .post('/api/v1/public/orders')
        .send(orderData)
        .expect(201);

      const orderId = response.body.data.order._id;
      const savedOrder = await Order.findById(orderId).populate('items.itemId');
      
      expect(savedOrder).toBeTruthy();
      expect(savedOrder.customerName).toBe('John Doe');
      expect(savedOrder.customerEmail).toBe('john.doe@example.com');
      expect(savedOrder.items).toHaveLength(1);
      expect(savedOrder.items[0].itemId._id.toString()).toBe(fixedPriceItem._id.toString());
    });
  });
});