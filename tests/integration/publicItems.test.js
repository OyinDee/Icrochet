const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../src/app');
const { Item, Category } = require('../../src/models');
const { connectDB, disconnectDB } = require('../utils/database');

describe('Public Items API', () => {
  let testCategory;
  let testItems;

  beforeAll(async () => {
    await connectDB();
  });

  afterAll(async () => {
    await disconnectDB();
  });

  beforeEach(async () => {
    // Clean up existing data
    await Item.deleteMany({});
    await Category.deleteMany({});

    // Create test category
    testCategory = await Category.create({
      name: 'Test Category',
      description: 'Test category for public items'
    });

    // Create test items
    testItems = await Item.create([
      {
        name: 'Available Fixed Price Item',
        description: 'A test item with fixed pricing',
        pricingType: 'fixed',
        price: { fixed: 25.99 },
        categoryId: testCategory._id,
        isAvailable: true,
        imageUrls: ['https://example.com/image1.jpg'],
        availableColors: ['Red', 'Blue', 'Green']
      },
      {
        name: 'Available Range Price Item',
        description: 'A test item with range pricing',
        pricingType: 'range',
        price: { min: 15.00, max: 30.00 },
        categoryId: testCategory._id,
        isAvailable: true,
        imageUrls: ['https://example.com/image2.jpg'],
        availableColors: ['Yellow', 'Purple']
      },
      {
        name: 'Available Custom Price Item',
        description: 'A test item with custom pricing',
        pricingType: 'custom',
        price: {},
        categoryId: testCategory._id,
        isAvailable: true,
        imageUrls: ['https://example.com/image3.jpg'],
        availableColors: ['Black', 'White']
      },
      {
        name: 'Unavailable Item',
        description: 'A test item that is not available',
        pricingType: 'fixed',
        price: { fixed: 20.00 },
        categoryId: testCategory._id,
        isAvailable: false,
        imageUrls: ['https://example.com/image4.jpg'],
        availableColors: ['Gray']
      }
    ]);
  });

  describe('GET /api/v1/public/items', () => {
    it('should get all available items', async () => {
      const response = await request(app)
        .get('/api/v1/public/items')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.data).toHaveLength(3); // Only available items
      expect(response.body.data.pagination.totalCount).toBe(3);
      
      // Verify all returned items are available
      response.body.data.data.forEach(item => {
        expect(item.isAvailable).toBe(true);
      });
    });

    it('should filter items by category', async () => {
      const response = await request(app)
        .get(`/api/v1/public/items?categoryId=${testCategory._id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.data).toHaveLength(3);
      
      response.body.data.data.forEach(item => {
        expect(item.categoryId._id).toBe(testCategory._id.toString());
      });
    });

    it('should filter items by pricing type', async () => {
      const response = await request(app)
        .get('/api/v1/public/items?pricingType=fixed')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.data).toHaveLength(1);
      expect(response.body.data.data[0].pricingType).toBe('fixed');
    });

    it('should filter items by color', async () => {
      const response = await request(app)
        .get('/api/v1/public/items?color=Red')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.data).toHaveLength(1);
      expect(response.body.data.data[0].availableColors).toContain('Red');
    });

    it('should filter items by price range', async () => {
      const response = await request(app)
        .get('/api/v1/public/items?minPrice=20&maxPrice=30')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.data.length).toBeGreaterThan(0);
    });

    it('should paginate results', async () => {
      const response = await request(app)
        .get('/api/v1/public/items?page=1&limit=2')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.data).toHaveLength(2);
      expect(response.body.data.pagination.currentPage).toBe(1);
      expect(response.body.data.pagination.limit).toBe(2);
    });

    it('should sort items', async () => {
      const response = await request(app)
        .get('/api/v1/public/items?sortBy=name&sortOrder=asc')
        .expect(200);

      expect(response.body.success).toBe(true);
      const items = response.body.data.data;
      expect(items[0].name).toBe('Available Custom Price Item');
    });

    it('should return error for invalid price range', async () => {
      const response = await request(app)
        .get('/api/v1/public/items?minPrice=30&maxPrice=20')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/v1/public/items/:id', () => {
    it('should get available item by ID', async () => {
      const availableItem = testItems.find(item => item.isAvailable);
      
      const response = await request(app)
        .get(`/api/v1/public/items/${availableItem._id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.item._id).toBe(availableItem._id.toString());
      expect(response.body.data.item.isAvailable).toBe(true);
    });

    it('should return 404 for unavailable item', async () => {
      const unavailableItem = testItems.find(item => !item.isAvailable);
      
      const response = await request(app)
        .get(`/api/v1/public/items/${unavailableItem._id}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('ITEM_NOT_AVAILABLE');
    });

    it('should return 404 for non-existent item', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      
      const response = await request(app)
        .get(`/api/v1/public/items/${nonExistentId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('ITEM_NOT_FOUND');
    });

    it('should return 400 for invalid item ID', async () => {
      const response = await request(app)
        .get('/api/v1/public/items/invalid-id')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/v1/public/items/category/:categoryId', () => {
    it('should get available items by category', async () => {
      const response = await request(app)
        .get(`/api/v1/public/items/category/${testCategory._id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.data).toHaveLength(3); // Only available items
      
      response.body.data.data.forEach(item => {
        expect(item.isAvailable).toBe(true);
        expect(item.categoryId._id).toBe(testCategory._id.toString());
      });
    });

    it('should return empty array for non-existent category', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      
      const response = await request(app)
        .get(`/api/v1/public/items/category/${nonExistentId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.data).toHaveLength(0);
    });

    it('should return 400 for invalid category ID', async () => {
      const response = await request(app)
        .get('/api/v1/public/items/category/invalid-id')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should paginate category items', async () => {
      const response = await request(app)
        .get(`/api/v1/public/items/category/${testCategory._id}?page=1&limit=2`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.data).toHaveLength(2);
      expect(response.body.data.pagination.currentPage).toBe(1);
      expect(response.body.data.pagination.limit).toBe(2);
    });
  });

  describe('GET /api/v1/public/items/search', () => {
    it('should search items by name', async () => {
      const response = await request(app)
        .get('/api/v1/public/items/search?q=Fixed')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.data).toHaveLength(1);
      expect(response.body.data.data[0].name).toContain('Fixed');
    });

    it('should search items by description', async () => {
      const response = await request(app)
        .get('/api/v1/public/items/search?q=range pricing')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.data).toHaveLength(1);
      expect(response.body.data.data[0].description).toContain('range pricing');
    });

    it('should search items by color', async () => {
      const response = await request(app)
        .get('/api/v1/public/items/search?q=Blue')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.data).toHaveLength(1);
      expect(response.body.data.data[0].availableColors).toContain('Blue');
    });

    it('should return 400 for missing search term', async () => {
      const response = await request(app)
        .get('/api/v1/public/items/search')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for empty search term', async () => {
      const response = await request(app)
        .get('/api/v1/public/items/search?q=')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return empty results for non-matching search', async () => {
      const response = await request(app)
        .get('/api/v1/public/items/search?q=nonexistent')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.data).toHaveLength(0);
    });
  });

  describe('GET /api/v1/public/items/pricing/:pricingType', () => {
    it('should get items by fixed pricing type', async () => {
      const response = await request(app)
        .get('/api/v1/public/items/pricing/fixed')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.data).toHaveLength(1);
      expect(response.body.data.data[0].pricingType).toBe('fixed');
    });

    it('should get items by range pricing type', async () => {
      const response = await request(app)
        .get('/api/v1/public/items/pricing/range')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.data).toHaveLength(1);
      expect(response.body.data.data[0].pricingType).toBe('range');
    });

    it('should get items by custom pricing type', async () => {
      const response = await request(app)
        .get('/api/v1/public/items/pricing/custom')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.data).toHaveLength(1);
      expect(response.body.data.data[0].pricingType).toBe('custom');
    });

    it('should return 400 for invalid pricing type', async () => {
      const response = await request(app)
        .get('/api/v1/public/items/pricing/invalid')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/v1/public/items/color/:color', () => {
    it('should get items by color', async () => {
      const response = await request(app)
        .get('/api/v1/public/items/color/Red')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.data).toHaveLength(1);
      expect(response.body.data.data[0].availableColors).toContain('Red');
    });

    it('should be case insensitive', async () => {
      const response = await request(app)
        .get('/api/v1/public/items/color/red')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.data).toHaveLength(1);
      expect(response.body.data.data[0].availableColors).toContain('Red');
    });

    it('should return empty results for non-existent color', async () => {
      const response = await request(app)
        .get('/api/v1/public/items/color/NonExistentColor')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.data).toHaveLength(0);
    });

    it('should return 400 for invalid color parameter', async () => {
      const response = await request(app)
        .get('/api/v1/public/items/color/a')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/v1/public/items/colors', () => {
    it('should get all available colors', async () => {
      const response = await request(app)
        .get('/api/v1/public/items/colors')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.colors).toBeDefined();
      expect(Array.isArray(response.body.data.colors)).toBe(true);
      expect(response.body.data.colors.length).toBeGreaterThan(0);
      
      // Verify colors from available items only
      const expectedColors = ['Red', 'Blue', 'Green', 'Yellow', 'Purple', 'Black', 'White'];
      response.body.data.colors.forEach(colorInfo => {
        expect(expectedColors).toContain(colorInfo.color);
        expect(colorInfo.itemCount).toBeGreaterThan(0);
      });
    });
  });

  describe('Error handling', () => {
    it('should handle database errors gracefully', async () => {
      // Mock a database error by closing the connection temporarily
      await mongoose.connection.close();

      const response = await request(app)
        .get('/api/v1/public/items')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBeDefined();

      // Reconnect for cleanup
      await connectDB();
    });

    it('should validate query parameters', async () => {
      const response = await request(app)
        .get('/api/v1/public/items?page=0&limit=100')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should limit results per page', async () => {
      const response = await request(app)
        .get('/api/v1/public/items?limit=100')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Response format', () => {
    it('should return consistent response format', async () => {
      const response = await request(app)
        .get('/api/v1/public/items')
        .expect(200);

      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body.data).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('pagination');
    });

    it('should include category information in items', async () => {
      const response = await request(app)
        .get('/api/v1/public/items')
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.data.forEach(item => {
        expect(item.categoryId).toHaveProperty('_id');
        expect(item.categoryId).toHaveProperty('name');
        expect(item.categoryId).toHaveProperty('description');
      });
    });

    it('should include pricing information', async () => {
      const response = await request(app)
        .get('/api/v1/public/items')
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.data.forEach(item => {
        expect(item).toHaveProperty('pricingType');
        expect(item).toHaveProperty('price');
        expect(['fixed', 'range', 'custom']).toContain(item.pricingType);
      });
    });

    it('should include color information', async () => {
      const response = await request(app)
        .get('/api/v1/public/items')
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.data.forEach(item => {
        expect(item).toHaveProperty('availableColors');
        expect(Array.isArray(item.availableColors)).toBe(true);
      });
    });
  });
});