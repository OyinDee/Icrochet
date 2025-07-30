// Mock multer
const mockUploadArray = jest.fn();
const mockUploadSingle = jest.fn();

jest.mock('multer', () => {
  const multer = jest.fn(() => ({
    array: jest.fn(() => mockUploadArray),
    single: jest.fn(() => mockUploadSingle)
  }));
  
  multer.MulterError = class MulterError extends Error {
    constructor(code, field) {
      super(`Multer error: ${code}`);
      this.code = code;
      this.field = field;
      this.name = 'MulterError';
    }
  };

  multer.memoryStorage = jest.fn(() => ({}));

  return multer;
});

const multer = require('multer');
const { uploadImages, uploadSingleImage } = require('../../../src/middleware/upload');

describe('Upload Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      files: [],
      file: null
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();

    jest.clearAllMocks();
  });

  describe('uploadImages middleware', () => {
    it('should call next() when upload is successful', () => {
      mockUploadArray.mockImplementation((req, res, callback) => {
        callback(null);
      });

      uploadImages(req, res, next);

      expect(mockUploadArray).toHaveBeenCalledWith(req, res, expect.any(Function));
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should handle LIMIT_FILE_SIZE error', () => {
      const multerError = new multer.MulterError('LIMIT_FILE_SIZE');
      
      mockUploadArray.mockImplementation((req, res, callback) => {
        callback(multerError);
      });

      uploadImages(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'FILE_TOO_LARGE',
          message: 'File size too large. Maximum size is 10MB per file'
        }
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle LIMIT_FILE_COUNT error', () => {
      const multerError = new multer.MulterError('LIMIT_FILE_COUNT');
      
      mockUploadArray.mockImplementation((req, res, callback) => {
        callback(multerError);
      });

      uploadImages(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'TOO_MANY_FILES',
          message: 'Too many files. Maximum is 10 files per request'
        }
      });
    });

    it('should handle LIMIT_UNEXPECTED_FILE error', () => {
      const multerError = new multer.MulterError('LIMIT_UNEXPECTED_FILE');
      
      mockUploadArray.mockImplementation((req, res, callback) => {
        callback(multerError);
      });

      uploadImages(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'UNEXPECTED_FIELD',
          message: 'Unexpected field name. Use "images" as the field name'
        }
      });
    });

    it('should handle generic multer errors', () => {
      const multerError = new multer.MulterError('UNKNOWN_ERROR');
      
      mockUploadArray.mockImplementation((req, res, callback) => {
        callback(multerError);
      });

      uploadImages(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'UPLOAD_ERROR',
          message: 'Multer error: UNKNOWN_ERROR'
        }
      });
    });

    it('should handle validation errors', () => {
      const validationError = new Error('Only image files are allowed');
      
      mockUploadArray.mockImplementation((req, res, callback) => {
        callback(validationError);
      });

      uploadImages(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Only image files are allowed'
        }
      });
    });
  });

  describe('uploadSingleImage middleware', () => {
    it('should call next() when upload is successful', () => {
      mockUploadSingle.mockImplementation((req, res, callback) => {
        callback(null);
      });

      uploadSingleImage(req, res, next);

      expect(mockUploadSingle).toHaveBeenCalledWith(req, res, expect.any(Function));
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should handle LIMIT_FILE_SIZE error for single upload', () => {
      const multerError = new multer.MulterError('LIMIT_FILE_SIZE');
      
      mockUploadSingle.mockImplementation((req, res, callback) => {
        callback(multerError);
      });

      uploadSingleImage(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'FILE_TOO_LARGE',
          message: 'File size too large. Maximum size is 10MB'
        }
      });
    });

    it('should handle LIMIT_UNEXPECTED_FILE error for single upload', () => {
      const multerError = new multer.MulterError('LIMIT_UNEXPECTED_FILE');
      
      mockUploadSingle.mockImplementation((req, res, callback) => {
        callback(multerError);
      });

      uploadSingleImage(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'UNEXPECTED_FIELD',
          message: 'Unexpected field name. Use "image" as the field name'
        }
      });
    });

    it('should handle validation errors for single upload', () => {
      const validationError = new Error('Only image files are allowed');
      
      mockUploadSingle.mockImplementation((req, res, callback) => {
        callback(validationError);
      });

      uploadSingleImage(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Only image files are allowed'
        }
      });
    });
  });

  describe('File filter validation', () => {
    // Note: These tests would require more complex mocking of multer's internal behavior
    // The actual configuration is tested through integration tests
    
    it('should export upload middleware functions', () => {
      expect(typeof uploadImages).toBe('function');
      expect(typeof uploadSingleImage).toBe('function');
    });
  });
});