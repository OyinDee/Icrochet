const adminUploadController = require('../../../src/controllers/AdminUploadController');

// Mock CloudinaryService
jest.mock('../../../src/services/CloudinaryService', () => ({
  uploadImages: jest.fn(),
  deleteImage: jest.fn(),
  getImageDetails: jest.fn()
}));

// Mock logger
jest.mock('../../../src/config/logger', () => ({
  info: jest.fn(),
  error: jest.fn()
}));

const cloudinaryService = require('../../../src/services/CloudinaryService');
const logger = require('../../../src/config/logger');

describe('AdminUploadController', () => {
  let req, res;

  beforeEach(() => {
    req = {
      files: [],
      params: {},
      body: {}
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    jest.clearAllMocks();
  });

  describe('uploadImages', () => {
    it('should upload images successfully', async () => {
      const mockFiles = [
        { buffer: Buffer.from('image1'), originalname: 'test1.jpg' },
        { buffer: Buffer.from('image2'), originalname: 'test2.jpg' }
      ];
      
      const mockUploadResults = [
        {
          publicId: 'crochet-items/test-image-1',
          url: 'https://res.cloudinary.com/test/image/upload/test-image-1.jpg',
          width: 1000,
          height: 1000,
          format: 'jpg',
          bytes: 50000
        },
        {
          publicId: 'crochet-items/test-image-2',
          url: 'https://res.cloudinary.com/test/image/upload/test-image-2.jpg',
          width: 800,
          height: 600,
          format: 'jpg',
          bytes: 40000
        }
      ];

      req.files = mockFiles;
      cloudinaryService.uploadImages.mockResolvedValue(mockUploadResults);

      await adminUploadController.uploadImages(req, res);

      expect(cloudinaryService.uploadImages).toHaveBeenCalledWith(mockFiles, {
        folder: 'crochet-items'
      });
      expect(logger.info).toHaveBeenCalledWith('Admin uploaded 2 images');
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          message: 'Successfully uploaded 2 images',
          images: mockUploadResults
        }
      });
    });

    it('should return 400 when no files are uploaded', async () => {
      req.files = [];

      await adminUploadController.uploadImages(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'NO_FILES',
          message: 'No files were uploaded'
        }
      });
      expect(cloudinaryService.uploadImages).not.toHaveBeenCalled();
    });

    it('should return 400 when files array is undefined', async () => {
      req.files = undefined;

      await adminUploadController.uploadImages(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'NO_FILES',
          message: 'No files were uploaded'
        }
      });
    });

    it('should handle cloudinary upload errors', async () => {
      const mockFiles = [{ buffer: Buffer.from('image1'), originalname: 'test1.jpg' }];
      req.files = mockFiles;

      cloudinaryService.uploadImages.mockRejectedValue(new Error('Cloudinary error'));

      await adminUploadController.uploadImages(req, res);

      expect(logger.error).toHaveBeenCalledWith('Error in uploadImages controller:', expect.any(Error));
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'UPLOAD_FAILED',
          message: 'Failed to upload images'
        }
      });
    });
  });

  describe('deleteImage', () => {
    it('should delete image successfully', async () => {
      const publicId = 'crochet-items/test-image-1';
      req.params.publicId = publicId;

      const mockDeleteResult = { success: true, publicId };
      cloudinaryService.deleteImage.mockResolvedValue(mockDeleteResult);

      await adminUploadController.deleteImage(req, res);

      expect(cloudinaryService.deleteImage).toHaveBeenCalledWith(publicId);
      expect(logger.info).toHaveBeenCalledWith(`Admin deleted image with public ID: ${publicId}`);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          message: 'Image deleted successfully',
          publicId
        }
      });
    });

    it('should return 400 when publicId is missing', async () => {
      req.params.publicId = undefined;

      await adminUploadController.deleteImage(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'MISSING_PUBLIC_ID',
          message: 'Public ID is required'
        }
      });
      expect(cloudinaryService.deleteImage).not.toHaveBeenCalled();
    });

    it('should return 404 when image is not found', async () => {
      const publicId = 'crochet-items/non-existent';
      req.params.publicId = publicId;

      const mockDeleteResult = { success: false, publicId, error: 'not found' };
      cloudinaryService.deleteImage.mockResolvedValue(mockDeleteResult);

      await adminUploadController.deleteImage(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'IMAGE_NOT_FOUND',
          message: 'Image not found or already deleted'
        }
      });
    });

    it('should handle cloudinary delete errors', async () => {
      const publicId = 'crochet-items/test-image-1';
      req.params.publicId = publicId;

      cloudinaryService.deleteImage.mockRejectedValue(new Error('Cloudinary error'));

      await adminUploadController.deleteImage(req, res);

      expect(logger.error).toHaveBeenCalledWith('Error in deleteImage controller:', expect.any(Error));
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'DELETE_FAILED',
          message: 'Failed to delete image'
        }
      });
    });
  });

  describe('getImageDetails', () => {
    it('should get image details successfully', async () => {
      const publicId = 'crochet-items/test-image-1';
      req.params.publicId = publicId;

      const mockImageDetails = {
        publicId,
        url: 'https://res.cloudinary.com/test/image/upload/test-image-1.jpg',
        width: 1000,
        height: 1000,
        format: 'jpg',
        bytes: 50000,
        createdAt: '2023-01-01T00:00:00.000Z'
      };

      cloudinaryService.getImageDetails.mockResolvedValue(mockImageDetails);

      await adminUploadController.getImageDetails(req, res);

      expect(cloudinaryService.getImageDetails).toHaveBeenCalledWith(publicId);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockImageDetails
      });
    });

    it('should return 400 when publicId is missing', async () => {
      req.params.publicId = undefined;

      await adminUploadController.getImageDetails(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'MISSING_PUBLIC_ID',
          message: 'Public ID is required'
        }
      });
      expect(cloudinaryService.getImageDetails).not.toHaveBeenCalled();
    });

    it('should return 404 when image is not found', async () => {
      const publicId = 'crochet-items/non-existent';
      req.params.publicId = publicId;

      cloudinaryService.getImageDetails.mockRejectedValue(new Error('Resource not found'));

      await adminUploadController.getImageDetails(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'IMAGE_NOT_FOUND',
          message: 'Image not found'
        }
      });
    });

    it('should handle cloudinary fetch errors', async () => {
      const publicId = 'crochet-items/test-image-1';
      req.params.publicId = publicId;

      cloudinaryService.getImageDetails.mockRejectedValue(new Error('Cloudinary error'));

      await adminUploadController.getImageDetails(req, res);

      expect(logger.error).toHaveBeenCalledWith('Error in getImageDetails controller:', expect.any(Error));
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'FETCH_FAILED',
          message: 'Failed to get image details'
        }
      });
    });
  });
});