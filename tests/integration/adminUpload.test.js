const request = require('supertest');
const path = require('path');
const fs = require('fs');
const app = require('../../src/app');
const database = require('../../src/config/database');
const AdminUser = require('../../src/models/AdminUser');
const bcrypt = require('bcrypt');

// Mock Cloudinary service
jest.mock('../../src/services/CloudinaryService', () => ({
  uploadImages: jest.fn(),
  deleteImage: jest.fn(),
  getImageDetails: jest.fn()
}));

const cloudinaryService = require('../../src/services/CloudinaryService');

describe('Admin Upload Integration Tests', () => {
  let adminToken;
  let adminUser;

  beforeAll(async () => {
    await database.connect();
  });

  afterAll(async () => {
    await database.disconnect();
  });

  beforeEach(async () => {
    await database.clearDatabase();

    // Create admin user
    const hashedPassword = await bcrypt.hash('admin123', 10);
    adminUser = await AdminUser.create({
      username: 'admin',
      email: 'admin@test.com',
      passwordHash: hashedPassword
    });

    // Get admin token
    const loginResponse = await request(app)
      .post('/api/v1/admin/auth/login')
      .send({
        username: 'admin',
        password: 'admin123'
      });

    adminToken = loginResponse.body.data.token;

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('POST /api/v1/admin/upload/images', () => {
    const createTestImageBuffer = () => {
      // Create a simple test image buffer (1x1 pixel PNG)
      return Buffer.from([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
        0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
        0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
        0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
        0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41,
        0x54, 0x08, 0x99, 0x01, 0x01, 0x00, 0x00, 0x00,
        0xFF, 0xFF, 0x00, 0x00, 0x00, 0x02, 0x00, 0x01,
        0xE2, 0x21, 0xBC, 0x33, 0x00, 0x00, 0x00, 0x00,
        0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
      ]);
    };

    it('should upload images successfully with valid authentication', async () => {
      const mockUploadResults = [
        {
          publicId: 'crochet-items/test-image-1',
          url: 'https://res.cloudinary.com/test/image/upload/v1234567890/crochet-items/test-image-1.jpg',
          width: 1000,
          height: 1000,
          format: 'jpg',
          bytes: 50000
        },
        {
          publicId: 'crochet-items/test-image-2',
          url: 'https://res.cloudinary.com/test/image/upload/v1234567890/crochet-items/test-image-2.jpg',
          width: 800,
          height: 600,
          format: 'jpg',
          bytes: 40000
        }
      ];

      cloudinaryService.uploadImages.mockResolvedValue(mockUploadResults);

      const response = await request(app)
        .post('/api/v1/admin/upload/images')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('images', createTestImageBuffer(), 'test1.png')
        .attach('images', createTestImageBuffer(), 'test2.png');

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toContain('Successfully uploaded 2 images');
      expect(response.body.data.images).toEqual(mockUploadResults);
      expect(cloudinaryService.uploadImages).toHaveBeenCalledWith(
        expect.any(Array),
        { folder: 'crochet-items' }
      );
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .post('/api/v1/admin/upload/images')
        .attach('images', createTestImageBuffer(), 'test.png');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NO_TOKEN');
    });

    it('should return 400 when no files are uploaded', async () => {
      const response = await request(app)
        .post('/api/v1/admin/upload/images')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NO_FILES');
      expect(response.body.error.message).toBe('No files were uploaded');
    });

    it('should return 400 for non-image files', async () => {
      const textBuffer = Buffer.from('This is not an image');

      const response = await request(app)
        .post('/api/v1/admin/upload/images')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('images', textBuffer, 'test.txt');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toContain('Only image files are allowed');
    });

    it('should handle Cloudinary upload errors', async () => {
      cloudinaryService.uploadImages.mockRejectedValue(new Error('Cloudinary error'));

      const response = await request(app)
        .post('/api/v1/admin/upload/images')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('images', createTestImageBuffer(), 'test.png');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UPLOAD_FAILED');
      expect(response.body.error.message).toBe('Failed to upload images');
    });

    it('should handle file size limit exceeded', async () => {
      // Create a large buffer (simulate file too large)
      const largeBuffer = Buffer.alloc(11 * 1024 * 1024); // 11MB

      const response = await request(app)
        .post('/api/v1/admin/upload/images')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('images', largeBuffer, 'large.png');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('FILE_TOO_LARGE');
    });
  });

  describe('DELETE /api/v1/admin/upload/images/:publicId', () => {
    it('should delete image successfully', async () => {
      const publicId = 'crochet-items/test-image-1';
      const mockDeleteResult = { success: true, publicId };

      cloudinaryService.deleteImage.mockResolvedValue(mockDeleteResult);

      const response = await request(app)
        .delete(`/api/v1/admin/upload/images/${encodeURIComponent(publicId)}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toBe('Image deleted successfully');
      expect(response.body.data.publicId).toBe(publicId);
      expect(cloudinaryService.deleteImage).toHaveBeenCalledWith(publicId);
    });

    it('should return 401 without authentication', async () => {
      const publicId = 'crochet-items/test-image-1';

      const response = await request(app)
        .delete(`/api/v1/admin/upload/images/${encodeURIComponent(publicId)}`);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NO_TOKEN');
    });

    it('should return 404 when image not found', async () => {
      const publicId = 'crochet-items/non-existent';
      const mockDeleteResult = { success: false, publicId, error: 'not found' };

      cloudinaryService.deleteImage.mockResolvedValue(mockDeleteResult);

      const response = await request(app)
        .delete(`/api/v1/admin/upload/images/${encodeURIComponent(publicId)}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('IMAGE_NOT_FOUND');
    });

    it('should handle Cloudinary delete errors', async () => {
      const publicId = 'crochet-items/test-image-1';
      cloudinaryService.deleteImage.mockRejectedValue(new Error('Cloudinary error'));

      const response = await request(app)
        .delete(`/api/v1/admin/upload/images/${encodeURIComponent(publicId)}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('DELETE_FAILED');
    });
  });

  describe('GET /api/v1/admin/upload/images/:publicId', () => {
    it('should get image details successfully', async () => {
      const publicId = 'crochet-items/test-image-1';
      const mockImageDetails = {
        publicId,
        url: 'https://res.cloudinary.com/test/image/upload/v1234567890/crochet-items/test-image-1.jpg',
        width: 1000,
        height: 1000,
        format: 'jpg',
        bytes: 50000,
        createdAt: '2023-01-01T00:00:00.000Z'
      };

      cloudinaryService.getImageDetails.mockResolvedValue(mockImageDetails);

      const response = await request(app)
        .get(`/api/v1/admin/upload/images/${encodeURIComponent(publicId)}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockImageDetails);
      expect(cloudinaryService.getImageDetails).toHaveBeenCalledWith(publicId);
    });

    it('should return 401 without authentication', async () => {
      const publicId = 'crochet-items/test-image-1';

      const response = await request(app)
        .get(`/api/v1/admin/upload/images/${encodeURIComponent(publicId)}`);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NO_TOKEN');
    });

    it('should return 404 when image not found', async () => {
      const publicId = 'crochet-items/non-existent';
      cloudinaryService.getImageDetails.mockRejectedValue(new Error('Resource not found'));

      const response = await request(app)
        .get(`/api/v1/admin/upload/images/${encodeURIComponent(publicId)}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('IMAGE_NOT_FOUND');
    });

    it('should handle Cloudinary fetch errors', async () => {
      const publicId = 'crochet-items/test-image-1';
      cloudinaryService.getImageDetails.mockRejectedValue(new Error('Cloudinary error'));

      const response = await request(app)
        .get(`/api/v1/admin/upload/images/${encodeURIComponent(publicId)}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('FETCH_FAILED');
    });
  });
});