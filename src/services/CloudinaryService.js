const cloudinary = require('cloudinary').v2;
const logger = require('../config/logger');

class CloudinaryService {
  constructor() {
    // Configure Cloudinary
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET
    });
  }

  /**
   * Upload multiple images to Cloudinary
   * @param {Array} files - Array of file objects from multer
   * @param {Object} options - Upload options
   * @returns {Promise<Array>} Array of upload results
   */
  async uploadImages(files, options = {}) {
    try {
      const uploadPromises = files.map(file => this.uploadSingleImage(file, options));
      const results = await Promise.all(uploadPromises);
      
      logger.info(`Successfully uploaded ${results.length} images to Cloudinary`);
      return results;
    } catch (error) {
      logger.error('Error uploading images to Cloudinary:', error);
      throw new Error('Failed to upload images');
    }
  }

  /**
   * Upload a single image to Cloudinary
   * @param {Object} file - File object from multer
   * @param {Object} options - Upload options
   * @returns {Promise<Object>} Upload result
   */
  async uploadSingleImage(file, options = {}) {
    return new Promise((resolve, reject) => {
      const uploadOptions = {
        folder: options.folder || 'crochet-items',
        resource_type: 'image',
        transformation: [
          { width: 1000, height: 1000, crop: 'limit' },
          { quality: 'auto' },
          { format: 'auto' }
        ],
        ...options
      };

      cloudinary.uploader.upload_stream(
        uploadOptions,
        (error, result) => {
          if (error) {
            logger.error('Cloudinary upload error:', error);
            reject(error);
          } else {
            resolve({
              publicId: result.public_id,
              url: result.secure_url,
              width: result.width,
              height: result.height,
              format: result.format,
              bytes: result.bytes
            });
          }
        }
      ).end(file.buffer);
    });
  }

  /**
   * Delete an image from Cloudinary
   * @param {string} publicId - The public ID of the image to delete
   * @returns {Promise<Object>} Deletion result
   */
  async deleteImage(publicId) {
    try {
      const result = await cloudinary.uploader.destroy(publicId);
      
      if (result.result === 'ok') {
        logger.info(`Successfully deleted image with public ID: ${publicId}`);
        return { success: true, publicId };
      } else {
        logger.warn(`Failed to delete image with public ID: ${publicId}. Result: ${result.result}`);
        return { success: false, publicId, error: result.result };
      }
    } catch (error) {
      logger.error(`Error deleting image with public ID ${publicId}:`, error);
      throw new Error('Failed to delete image');
    }
  }

  /**
   * Delete multiple images from Cloudinary
   * @param {Array} publicIds - Array of public IDs to delete
   * @returns {Promise<Array>} Array of deletion results
   */
  async deleteImages(publicIds) {
    try {
      const deletePromises = publicIds.map(publicId => this.deleteImage(publicId));
      const results = await Promise.all(deletePromises);
      
      logger.info(`Processed deletion of ${results.length} images`);
      return results;
    } catch (error) {
      logger.error('Error deleting multiple images:', error);
      throw new Error('Failed to delete images');
    }
  }

  /**
   * Get image details from Cloudinary
   * @param {string} publicId - The public ID of the image
   * @returns {Promise<Object>} Image details
   */
  async getImageDetails(publicId) {
    try {
      const result = await cloudinary.api.resource(publicId);
      return {
        publicId: result.public_id,
        url: result.secure_url,
        width: result.width,
        height: result.height,
        format: result.format,
        bytes: result.bytes,
        createdAt: result.created_at
      };
    } catch (error) {
      logger.error(`Error getting image details for public ID ${publicId}:`, error);
      throw new Error('Failed to get image details');
    }
  }

  /**
   * Generate a transformation URL for an image
   * @param {string} publicId - The public ID of the image
   * @param {Object} transformations - Transformation options
   * @returns {string} Transformed image URL
   */
  generateTransformationUrl(publicId, transformations = {}) {
    return cloudinary.url(publicId, {
      secure: true,
      ...transformations
    });
  }
}

module.exports = new CloudinaryService();