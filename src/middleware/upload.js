const multer = require('multer');
const logger = require('../config/logger');

// Configure multer for memory storage (files will be stored in memory as Buffer)
const storage = multer.memoryStorage();

// File filter function to validate uploaded files
const fileFilter = (req, file, cb) => {
  // Check if file is an image
  if (file.mimetype.startsWith('image/')) {
    // Accept common image formats
    const allowedMimeTypes = [
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/gif',
      'image/webp'
    ];

    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported image format: ${file.mimetype}. Allowed formats: JPEG, PNG, GIF, WebP`), false);
    }
  } else {
    cb(new Error('Only image files are allowed'), false);
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB per file
    files: 10 // Maximum 10 files per request
  }
});

// Middleware for handling multiple image uploads
const uploadImages = upload.array('images', 10);

// Middleware wrapper to handle multer errors
const handleUploadErrors = (req, res, next) => {
  uploadImages(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      logger.error('Multer error:', err);
      
      let errorMessage = 'File upload error';
      let errorCode = 'UPLOAD_ERROR';

      switch (err.code) {
        case 'LIMIT_FILE_SIZE':
          errorMessage = 'File size too large. Maximum size is 10MB per file';
          errorCode = 'FILE_TOO_LARGE';
          break;
        case 'LIMIT_FILE_COUNT':
          errorMessage = 'Too many files. Maximum is 10 files per request';
          errorCode = 'TOO_MANY_FILES';
          break;
        case 'LIMIT_UNEXPECTED_FILE':
          errorMessage = 'Unexpected field name. Use "images" as the field name';
          errorCode = 'UNEXPECTED_FIELD';
          break;
        default:
          errorMessage = err.message;
      }

      return res.status(400).json({
        success: false,
        error: {
          code: errorCode,
          message: errorMessage
        }
      });
    } else if (err) {
      logger.error('File validation error:', err);
      
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: err.message
        }
      });
    }

    next();
  });
};

// Middleware for single image upload
const uploadSingleImage = upload.single('image');

// Middleware wrapper for single image upload errors
const handleSingleUploadErrors = (req, res, next) => {
  uploadSingleImage(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      logger.error('Multer error:', err);
      
      let errorMessage = 'File upload error';
      let errorCode = 'UPLOAD_ERROR';

      switch (err.code) {
        case 'LIMIT_FILE_SIZE':
          errorMessage = 'File size too large. Maximum size is 10MB';
          errorCode = 'FILE_TOO_LARGE';
          break;
        case 'LIMIT_UNEXPECTED_FILE':
          errorMessage = 'Unexpected field name. Use "image" as the field name';
          errorCode = 'UNEXPECTED_FIELD';
          break;
        default:
          errorMessage = err.message;
      }

      return res.status(400).json({
        success: false,
        error: {
          code: errorCode,
          message: errorMessage
        }
      });
    } else if (err) {
      logger.error('File validation error:', err);
      
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: err.message
        }
      });
    }

    next();
  });
};

module.exports = {
  uploadImages: handleUploadErrors,
  uploadSingleImage: handleSingleUploadErrors,
  upload
};