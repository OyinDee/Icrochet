const Joi = require('joi');
const {
  validate,
  validateBody,
  validateParams,
  validateQuery,
  validateMultiple,
  validateObjectId
} = require('../../../src/middleware/validation');

describe('Validation Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      body: {},
      params: {},
      query: {}
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
  });

  describe('validate', () => {
    const testSchema = Joi.object({
      name: Joi.string().required(),
      age: Joi.number().min(0)
    });

    it('should pass validation with valid data', () => {
      req.body = { name: 'John', age: 25 };
      const middleware = validate(testSchema, 'body');
      
      middleware(req, res, next);
      
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should fail validation with invalid data', () => {
      req.body = { age: -5 }; // Missing required name, invalid age
      const middleware = validate(testSchema, 'body');
      
      middleware(req, res, next);
      
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            details: expect.any(Object)
          })
        })
      );
    });

    it('should handle missing data source', () => {
      delete req.body;
      const middleware = validate(testSchema, 'body');
      
      middleware(req, res, next);
      
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            message: 'No body data provided'
          })
        })
      );
    });

    it('should strip unknown fields', () => {
      req.body = { name: 'John', age: 25, unknownField: 'should be removed' };
      const middleware = validate(testSchema, 'body');
      
      middleware(req, res, next);
      
      expect(next).toHaveBeenCalled();
      expect(req.body).toEqual({ name: 'John', age: 25 });
      expect(req.body.unknownField).toBeUndefined();
    });

    it('should convert types when possible', () => {
      req.body = { name: 'John', age: '25' }; // age as string
      const middleware = validate(testSchema, 'body');
      
      middleware(req, res, next);
      
      expect(next).toHaveBeenCalled();
      expect(req.body.age).toBe(25); // Converted to number
    });
  });

  describe('validateBody', () => {
    const testSchema = Joi.object({
      email: Joi.string().email().required()
    });

    it('should validate request body', () => {
      req.body = { email: 'test@example.com' };
      const middleware = validateBody(testSchema);
      
      middleware(req, res, next);
      
      expect(next).toHaveBeenCalled();
    });

    it('should fail with invalid body data', () => {
      req.body = { email: 'invalid-email' };
      const middleware = validateBody(testSchema);
      
      middleware(req, res, next);
      
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('validateParams', () => {
    const testSchema = Joi.object({
      id: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required()
    });

    it('should validate request parameters', () => {
      req.params = { id: '507f1f77bcf86cd799439011' };
      const middleware = validateParams(testSchema);
      
      middleware(req, res, next);
      
      expect(next).toHaveBeenCalled();
    });

    it('should fail with invalid parameters', () => {
      req.params = { id: 'invalid-id' };
      const middleware = validateParams(testSchema);
      
      middleware(req, res, next);
      
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('validateQuery', () => {
    const testSchema = Joi.object({
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(100).default(10)
    });

    it('should validate query parameters', () => {
      req.query = { page: '2', limit: '20' };
      const middleware = validateQuery(testSchema);
      
      middleware(req, res, next);
      
      expect(next).toHaveBeenCalled();
      expect(req.query.page).toBe(2);
      expect(req.query.limit).toBe(20);
    });

    it('should apply default values', () => {
      req.query = {};
      const middleware = validateQuery(testSchema);
      
      middleware(req, res, next);
      
      expect(next).toHaveBeenCalled();
      expect(req.query.page).toBe(1);
      expect(req.query.limit).toBe(10);
    });
  });

  describe('validateMultiple', () => {
    const schemas = {
      body: Joi.object({
        name: Joi.string().required()
      }),
      params: Joi.object({
        id: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required()
      }),
      query: Joi.object({
        page: Joi.number().integer().min(1).default(1)
      })
    };

    it('should validate multiple sources successfully', (done) => {
      req.body = { name: 'Test' };
      req.params = { id: '507f1f77bcf86cd799439011' };
      req.query = { page: '2' };
      
      const middleware = validateMultiple(schemas);
      
      // Override next to check results
      next = jest.fn(() => {
        expect(next).toHaveBeenCalled();
        expect(req.query.page).toBe(2);
        done();
      });
      
      middleware(req, res, next);
    });

    it('should fail if any source validation fails', (done) => {
      req.body = { name: 'Test' };
      req.params = { id: 'invalid-id' }; // Invalid ObjectId
      req.query = { page: '2' };
      
      const middleware = validateMultiple(schemas);
      
      // Override res.json to check results
      res.json = jest.fn(() => {
        expect(next).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(400);
        done();
      });
      
      middleware(req, res, next);
    });

    it('should validate only existing sources', (done) => {
      req.body = { name: 'Test' };
      // params and query don't exist, so they won't be validated
      delete req.params;
      delete req.query;
      
      const middleware = validateMultiple(schemas);
      
      // Override next to check results
      next = jest.fn(() => {
        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
        done();
      });
      
      middleware(req, res, next);
    });
  });

  describe('validateObjectId', () => {
    it('should validate default id parameter', () => {
      req.params = { id: '507f1f77bcf86cd799439011' };
      const middleware = validateObjectId();
      
      middleware(req, res, next);
      
      expect(next).toHaveBeenCalled();
    });

    it('should validate custom parameter name', () => {
      req.params = { userId: '507f1f77bcf86cd799439011' };
      const middleware = validateObjectId('userId');
      
      middleware(req, res, next);
      
      expect(next).toHaveBeenCalled();
    });

    it('should fail with invalid ObjectId', () => {
      req.params = { id: 'invalid-id' };
      const middleware = validateObjectId();
      
      middleware(req, res, next);
      
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should fail with missing parameter', () => {
      req.params = {};
      const middleware = validateObjectId();
      
      middleware(req, res, next);
      
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('Error Response Format', () => {
    it('should return consistent error response format', () => {
      const testSchema = Joi.object({
        name: Joi.string().required()
      });
      
      req.body = {};
      const middleware = validateBody(testSchema);
      
      middleware(req, res, next);
      
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: expect.any(Object)
        },
        timestamp: expect.any(String)
      });
    });

    it('should include all validation errors', () => {
      const testSchema = Joi.object({
        name: Joi.string().required(),
        email: Joi.string().email().required(),
        age: Joi.number().min(0).required()
      });
      
      req.body = {
        name: '', // Invalid - empty
        email: 'invalid-email', // Invalid format
        // Missing age
      };
      
      const middleware = validateBody(testSchema);
      
      middleware(req, res, next);
      
      const errorResponse = res.json.mock.calls[0][0];
      expect(Object.keys(errorResponse.error.details)).toHaveLength(3);
      expect(errorResponse.error.details).toHaveProperty('name');
      expect(errorResponse.error.details).toHaveProperty('email');
      expect(errorResponse.error.details).toHaveProperty('age');
    });
  });
});