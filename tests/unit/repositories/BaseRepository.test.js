const mongoose = require('mongoose');
const BaseRepository = require('../../../src/repositories/BaseRepository');

// Create a test model for testing
const testSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, unique: true },
  age: { type: Number, min: 0 },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

const TestModel = mongoose.model('TestModel', testSchema);

describe('BaseRepository', () => {
  let repository;
  let testDocument;

  beforeEach(async () => {
    repository = new BaseRepository(TestModel);
    
    // Create a test document
    testDocument = await TestModel.create({
      name: 'Test User',
      email: 'test@example.com',
      age: 25
    });
  });

  afterEach(async () => {
    // Clean up test data
    await TestModel.deleteMany({});
  });

  describe('constructor', () => {
    it('should create repository with model', () => {
      expect(repository.model).toBe(TestModel);
      expect(repository.modelName).toBe('TestModel');
    });

    it('should throw error without model', () => {
      expect(() => new BaseRepository()).toThrow('Model is required for repository');
    });
  });

  describe('create', () => {
    it('should create new document', async () => {
      const data = {
        name: 'New User',
        email: 'new@example.com',
        age: 30
      };

      const result = await repository.create(data);
      
      expect(result).toBeDefined();
      expect(result.name).toBe(data.name);
      expect(result.email).toBe(data.email);
      expect(result.age).toBe(data.age);
      expect(result._id).toBeDefined();
    });

    it('should handle validation errors', async () => {
      const invalidData = {
        // Missing required name field
        email: 'invalid@example.com'
      };

      await expect(repository.create(invalidData)).rejects.toThrow();
    });
  });

  describe('findById', () => {
    it('should find document by valid ID', async () => {
      const result = await repository.findById(testDocument._id);
      
      expect(result).toBeDefined();
      expect(result._id.toString()).toBe(testDocument._id.toString());
      expect(result.name).toBe(testDocument.name);
    });

    it('should return null for invalid ID', async () => {
      const result = await repository.findById('invalid-id');
      expect(result).toBeNull();
    });

    it('should return null for non-existent ID', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const result = await repository.findById(nonExistentId);
      expect(result).toBeNull();
    });
  });

  describe('findOne', () => {
    it('should find one document by criteria', async () => {
      const result = await repository.findOne({ name: 'Test User' });
      
      expect(result).toBeDefined();
      expect(result.name).toBe('Test User');
    });

    it('should return null if not found', async () => {
      const result = await repository.findOne({ name: 'Non-existent User' });
      expect(result).toBeNull();
    });
  });

  describe('find', () => {
    beforeEach(async () => {
      // Create additional test documents
      await TestModel.create([
        { name: 'User 1', email: 'user1@example.com', age: 20 },
        { name: 'User 2', email: 'user2@example.com', age: 30 }
      ]);
    });

    it('should find documents with pagination', async () => {
      const result = await repository.find({}, { page: 1, limit: 2 });
      
      expect(result.data).toHaveLength(2);
      expect(result.pagination.currentPage).toBe(1);
      expect(result.pagination.totalCount).toBe(3); // Including testDocument
      expect(result.pagination.hasNextPage).toBe(true);
      expect(result.pagination.hasPrevPage).toBe(false);
    });

    it('should find documents with criteria', async () => {
      const result = await repository.find({ age: { $gte: 25 } });
      
      expect(result.data.length).toBeGreaterThan(0);
      result.data.forEach(doc => {
        expect(doc.age).toBeGreaterThanOrEqual(25);
      });
    });
  });

  describe('updateById', () => {
    it('should update document by ID', async () => {
      const updateData = { name: 'Updated User', age: 35 };
      const result = await repository.updateById(testDocument._id, updateData);
      
      expect(result).toBeDefined();
      expect(result.name).toBe('Updated User');
      expect(result.age).toBe(35);
      expect(result.email).toBe(testDocument.email); // Should remain unchanged
    });

    it('should return null for invalid ID', async () => {
      const result = await repository.updateById('invalid-id', { name: 'Updated' });
      expect(result).toBeNull();
    });
  });

  describe('deleteById', () => {
    it('should delete document by ID', async () => {
      const result = await repository.deleteById(testDocument._id);
      
      expect(result).toBeDefined();
      expect(result._id.toString()).toBe(testDocument._id.toString());
      
      // Verify document is deleted
      const found = await TestModel.findById(testDocument._id);
      expect(found).toBeNull();
    });

    it('should return null for invalid ID', async () => {
      const result = await repository.deleteById('invalid-id');
      expect(result).toBeNull();
    });
  });

  describe('count', () => {
    it('should count all documents', async () => {
      const count = await repository.count();
      expect(count).toBe(1); // Just testDocument
    });

    it('should count documents with criteria', async () => {
      const count = await repository.count({ age: { $gte: 25 } });
      expect(count).toBe(1);
    });
  });

  describe('exists', () => {
    it('should return true if document exists', async () => {
      const exists = await repository.exists({ name: 'Test User' });
      expect(exists).toBe(true);
    });

    it('should return false if document does not exist', async () => {
      const exists = await repository.exists({ name: 'Non-existent User' });
      expect(exists).toBe(false);
    });
  });
});