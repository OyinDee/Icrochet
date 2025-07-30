const mongoose = require('mongoose');
const DatabaseUtils = require('../../../src/utils/database');

describe('DatabaseUtils', () => {
  describe('isValidObjectId()', () => {
    it('should return true for valid ObjectId', () => {
      const validId = new mongoose.Types.ObjectId().toString();
      expect(DatabaseUtils.isValidObjectId(validId)).toBe(true);
    });

    it('should return false for invalid ObjectId', () => {
      expect(DatabaseUtils.isValidObjectId('invalid-id')).toBe(false);
      expect(DatabaseUtils.isValidObjectId('123')).toBe(false);
      expect(DatabaseUtils.isValidObjectId('')).toBe(false);
    });
  });

  describe('toObjectId()', () => {
    it('should convert valid string to ObjectId', () => {
      const validId = new mongoose.Types.ObjectId().toString();
      const objectId = DatabaseUtils.toObjectId(validId);
      expect(objectId).toBeInstanceOf(mongoose.Types.ObjectId);
      expect(objectId.toString()).toBe(validId);
    });

    it('should throw error for invalid ObjectId', () => {
      expect(() => DatabaseUtils.toObjectId('invalid-id')).toThrow('Invalid ObjectId: invalid-id');
    });
  });

  describe('getPaginationOptions()', () => {
    it('should return correct pagination options', () => {
      const options = DatabaseUtils.getPaginationOptions(2, 20);
      expect(options).toEqual({
        skip: 20,
        limit: 20,
        page: 2,
      });
    });

    it('should handle default values', () => {
      const options = DatabaseUtils.getPaginationOptions();
      expect(options).toEqual({
        skip: 0,
        limit: 10,
        page: 1,
      });
    });

    it('should enforce minimum page number', () => {
      const options = DatabaseUtils.getPaginationOptions(0, 10);
      expect(options.page).toBe(1);
      expect(options.skip).toBe(0);
    });

    it('should enforce maximum limit', () => {
      const options = DatabaseUtils.getPaginationOptions(1, 200);
      expect(options.limit).toBe(100);
    });
  });

  describe('getSortOptions()', () => {
    it('should return correct sort options for ascending order', () => {
      const options = DatabaseUtils.getSortOptions('name', 'asc');
      expect(options).toEqual({ name: 1 });
    });

    it('should return correct sort options for descending order', () => {
      const options = DatabaseUtils.getSortOptions('createdAt', 'desc');
      expect(options).toEqual({ createdAt: -1 });
    });

    it('should handle default values', () => {
      const options = DatabaseUtils.getSortOptions();
      expect(options).toEqual({ createdAt: -1 });
    });
  });

  describe('buildSearchQuery()', () => {
    it('should build search query for multiple fields', () => {
      const query = DatabaseUtils.buildSearchQuery('test', ['name', 'description']);
      expect(query).toHaveProperty('$or');
      expect(query.$or).toHaveLength(2);
      expect(query.$or[0]).toHaveProperty('name');
      expect(query.$or[1]).toHaveProperty('description');
    });

    it('should return empty object for empty search term', () => {
      const query = DatabaseUtils.buildSearchQuery('', ['name']);
      expect(query).toEqual({});
    });

    it('should return empty object for empty fields array', () => {
      const query = DatabaseUtils.buildSearchQuery('test', []);
      expect(query).toEqual({});
    });
  });

  describe('buildDateRangeQuery()', () => {
    it('should build date range query with both dates', () => {
      const startDate = '2023-01-01';
      const endDate = '2023-12-31';
      const query = DatabaseUtils.buildDateRangeQuery(startDate, endDate);
      
      expect(query).toHaveProperty('createdAt');
      expect(query.createdAt).toHaveProperty('$gte');
      expect(query.createdAt).toHaveProperty('$lte');
    });

    it('should build query with only start date', () => {
      const startDate = '2023-01-01';
      const query = DatabaseUtils.buildDateRangeQuery(startDate, null);
      
      expect(query).toHaveProperty('createdAt');
      expect(query.createdAt).toHaveProperty('$gte');
      expect(query.createdAt).not.toHaveProperty('$lte');
    });

    it('should return empty object for no dates', () => {
      const query = DatabaseUtils.buildDateRangeQuery(null, null);
      expect(query).toEqual({});
    });
  });

  describe('createCountPipeline()', () => {
    it('should create aggregation pipeline for counting', () => {
      const matchQuery = { status: 'active' };
      const pipeline = DatabaseUtils.createCountPipeline(matchQuery);
      
      expect(pipeline).toHaveLength(2);
      expect(pipeline[0]).toEqual({ $match: matchQuery });
      expect(pipeline[1]).toEqual({ $count: 'total' });
    });

    it('should handle empty match query', () => {
      const pipeline = DatabaseUtils.createCountPipeline();
      expect(pipeline[0]).toEqual({ $match: {} });
    });
  });

  describe('handleDuplicateKeyError()', () => {
    it('should handle duplicate key error', () => {
      const error = {
        code: 11000,
        keyPattern: { email: 1 }
      };
      
      const result = DatabaseUtils.handleDuplicateKeyError(error);
      expect(result).toEqual({
        field: 'email',
        message: 'email already exists',
        code: 'DUPLICATE_KEY'
      });
    });

    it('should return null for non-duplicate key error', () => {
      const error = { code: 12345 };
      const result = DatabaseUtils.handleDuplicateKeyError(error);
      expect(result).toBeNull();
    });
  });

  describe('handleValidationError()', () => {
    it('should handle validation error', () => {
      const error = {
        name: 'ValidationError',
        errors: {
          name: { message: 'Name is required' },
          email: { message: 'Email is invalid' }
        }
      };
      
      const result = DatabaseUtils.handleValidationError(error);
      expect(result).toEqual({
        errors: {
          name: 'Name is required',
          email: 'Email is invalid'
        },
        message: 'Validation failed',
        code: 'VALIDATION_ERROR'
      });
    });

    it('should return null for non-validation error', () => {
      const error = { name: 'SomeOtherError' };
      const result = DatabaseUtils.handleValidationError(error);
      expect(result).toBeNull();
    });
  });
});