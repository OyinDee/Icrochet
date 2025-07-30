const cloudinaryService = require('../../../src/services/CloudinaryService');

// Mock cloudinary
jest.mock('cloudinary', () => ({
  v2: {
    config: jest.fn(),
    uploader: {
      upload_stream: jest.fn(),
      destroy: jest.fn()
    },
    api: {
      resource: jest.fn()
    },
    url: jest.fn()
  }
}));

const cloudinary = require('cloudinary').v2;

describe('CloudinaryService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('uploadImages', () => {
    it('should upload multiple images successfully', async () => {
      const mockFiles = [
        { buffer: Buffer.from('image1') },
        { buffer: Buffer.from('image2') }
      ];

      const mockUploadResult = {
        public_id: 'crochet-items/test-image',
        secure_url: 'https://res.cloudinary.com/test/image/upload/test-image.jpg',
        width: 1000,
        height: 1000,
        format: 'jpg',
        bytes: 50000
      };

      // Mock upload_stream to call success callback
      cloudinary.uploader.upload_stream.mockImplementation((options, callback) => {
        const stream = {
          end: jest.fn(() => {
            callback(null, mockUploadResult);
          })
        };
        return stream;
      });

      const result = await cloudinaryService.uploadImages(mockFiles);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        publicId: mockUploadResult.public_id,
        url: mockUploadResult.secure_url,
        width: mockUploadResult.width,
        height: mockUploadResult.height,
        format: mockUploadResult.format,
        bytes: mockUploadResult.bytes
      });
      expect(cloudinary.uploader.upload_stream).toHaveBeenCalledTimes(2);
    });

    it('should handle upload errors', async () => {
      const mockFiles = [{ buffer: Buffer.from('image1') }];

      cloudinary.uploader.upload_stream.mockImplementation((options, callback) => {
        const stream = {
          end: jest.fn(() => {
            callback(new Error('Upload failed'), null);
          })
        };
        return stream;
      });

      await expect(cloudinaryService.uploadImages(mockFiles)).rejects.toThrow('Failed to upload images');
    });

    it('should use custom options', async () => {
      const mockFiles = [{ buffer: Buffer.from('image1') }];
      const customOptions = { folder: 'custom-folder' };

      const mockUploadResult = {
        public_id: 'custom-folder/test-image',
        secure_url: 'https://res.cloudinary.com/test/image/upload/test-image.jpg',
        width: 800,
        height: 600,
        format: 'png',
        bytes: 30000
      };

      cloudinary.uploader.upload_stream.mockImplementation((options, callback) => {
        expect(options.folder).toBe('custom-folder');
        const stream = {
          end: jest.fn(() => {
            callback(null, mockUploadResult);
          })
        };
        return stream;
      });

      await cloudinaryService.uploadImages(mockFiles, customOptions);

      expect(cloudinary.uploader.upload_stream).toHaveBeenCalledWith(
        expect.objectContaining({
          folder: 'custom-folder',
          resource_type: 'image',
          transformation: expect.any(Array)
        }),
        expect.any(Function)
      );
    });
  });

  describe('uploadSingleImage', () => {
    it('should upload a single image successfully', async () => {
      const mockFile = { buffer: Buffer.from('image1') };

      const mockUploadResult = {
        public_id: 'crochet-items/test-image',
        secure_url: 'https://res.cloudinary.com/test/image/upload/test-image.jpg',
        width: 1000,
        height: 1000,
        format: 'jpg',
        bytes: 50000
      };

      cloudinary.uploader.upload_stream.mockImplementation((options, callback) => {
        const stream = {
          end: jest.fn(() => {
            callback(null, mockUploadResult);
          })
        };
        return stream;
      });

      const result = await cloudinaryService.uploadSingleImage(mockFile);

      expect(result).toEqual({
        publicId: mockUploadResult.public_id,
        url: mockUploadResult.secure_url,
        width: mockUploadResult.width,
        height: mockUploadResult.height,
        format: mockUploadResult.format,
        bytes: mockUploadResult.bytes
      });
    });

    it('should handle single image upload errors', async () => {
      const mockFile = { buffer: Buffer.from('image1') };

      cloudinary.uploader.upload_stream.mockImplementation((options, callback) => {
        const stream = {
          end: jest.fn(() => {
            callback(new Error('Upload failed'), null);
          })
        };
        return stream;
      });

      await expect(cloudinaryService.uploadSingleImage(mockFile)).rejects.toThrow('Upload failed');
    });
  });

  describe('deleteImage', () => {
    it('should delete image successfully', async () => {
      const publicId = 'crochet-items/test-image';
      const mockDeleteResult = { result: 'ok' };

      cloudinary.uploader.destroy.mockResolvedValue(mockDeleteResult);

      const result = await cloudinaryService.deleteImage(publicId);

      expect(result).toEqual({ success: true, publicId });
      expect(cloudinary.uploader.destroy).toHaveBeenCalledWith(publicId);
    });

    it('should handle image not found', async () => {
      const publicId = 'crochet-items/non-existent';
      const mockDeleteResult = { result: 'not found' };

      cloudinary.uploader.destroy.mockResolvedValue(mockDeleteResult);

      const result = await cloudinaryService.deleteImage(publicId);

      expect(result).toEqual({ success: false, publicId, error: 'not found' });
    });

    it('should handle delete errors', async () => {
      const publicId = 'crochet-items/test-image';

      cloudinary.uploader.destroy.mockRejectedValue(new Error('Delete failed'));

      await expect(cloudinaryService.deleteImage(publicId)).rejects.toThrow('Failed to delete image');
    });
  });

  describe('deleteImages', () => {
    it('should delete multiple images successfully', async () => {
      const publicIds = ['image1', 'image2'];
      const mockDeleteResult = { result: 'ok' };

      cloudinary.uploader.destroy.mockResolvedValue(mockDeleteResult);

      const result = await cloudinaryService.deleteImages(publicIds);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ success: true, publicId: 'image1' });
      expect(result[1]).toEqual({ success: true, publicId: 'image2' });
      expect(cloudinary.uploader.destroy).toHaveBeenCalledTimes(2);
    });

    it('should handle mixed success/failure results', async () => {
      const publicIds = ['image1', 'image2'];

      cloudinary.uploader.destroy
        .mockResolvedValueOnce({ result: 'ok' })
        .mockResolvedValueOnce({ result: 'not found' });

      const result = await cloudinaryService.deleteImages(publicIds);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ success: true, publicId: 'image1' });
      expect(result[1]).toEqual({ success: false, publicId: 'image2', error: 'not found' });
    });
  });

  describe('getImageDetails', () => {
    it('should get image details successfully', async () => {
      const publicId = 'crochet-items/test-image';
      const mockImageDetails = {
        public_id: publicId,
        secure_url: 'https://res.cloudinary.com/test/image/upload/test-image.jpg',
        width: 1000,
        height: 1000,
        format: 'jpg',
        bytes: 50000,
        created_at: '2023-01-01T00:00:00.000Z'
      };

      cloudinary.api.resource.mockResolvedValue(mockImageDetails);

      const result = await cloudinaryService.getImageDetails(publicId);

      expect(result).toEqual({
        publicId: mockImageDetails.public_id,
        url: mockImageDetails.secure_url,
        width: mockImageDetails.width,
        height: mockImageDetails.height,
        format: mockImageDetails.format,
        bytes: mockImageDetails.bytes,
        createdAt: mockImageDetails.created_at
      });
      expect(cloudinary.api.resource).toHaveBeenCalledWith(publicId);
    });

    it('should handle get details errors', async () => {
      const publicId = 'crochet-items/non-existent';

      cloudinary.api.resource.mockRejectedValue(new Error('Resource not found'));

      await expect(cloudinaryService.getImageDetails(publicId)).rejects.toThrow('Failed to get image details');
    });
  });

  describe('generateTransformationUrl', () => {
    it('should generate transformation URL', () => {
      const publicId = 'crochet-items/test-image';
      const transformations = { width: 300, height: 300 };
      const expectedUrl = 'https://res.cloudinary.com/test/image/upload/w_300,h_300/test-image.jpg';

      cloudinary.url.mockReturnValue(expectedUrl);

      const result = cloudinaryService.generateTransformationUrl(publicId, transformations);

      expect(result).toBe(expectedUrl);
      expect(cloudinary.url).toHaveBeenCalledWith(publicId, {
        secure: true,
        ...transformations
      });
    });

    it('should generate URL with default options', () => {
      const publicId = 'crochet-items/test-image';
      const expectedUrl = 'https://res.cloudinary.com/test/image/upload/test-image.jpg';

      cloudinary.url.mockReturnValue(expectedUrl);

      const result = cloudinaryService.generateTransformationUrl(publicId);

      expect(result).toBe(expectedUrl);
      expect(cloudinary.url).toHaveBeenCalledWith(publicId, {
        secure: true
      });
    });
  });
});