const cloudinaryService = require('../services/CloudinaryService');
const logger = require('../config/logger');

class AdminUploadController {
  /**
   * Upload multiple images to Cloudinary
   * POST /api/v1/admin/upload/images
   */
  async uploadImages(req, res) {
    try {
      // Check if files were uploaded
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'NO_FILES',
            message: 'No files were uploaded'
          }
        });
      }

      // Validate file types and sizes (already handled by multer middleware)
      const files = req.files;
      
      // Upload files to Cloudinary
      const uploadResults = await cloudinaryService.uploadImages(files, {
        folder: 'crochet-items'
      });

      logger.info(`Admin uploaded ${uploadResults.length} images`);

      res.status(201).json({
        success: true,
        data: {
          message: `Successfully uploaded ${uploadResults.length} images`,
          images: uploadResults
        }
      });

    } catch (error) {
      logger.error('Error in uploadImages controller:', error);
      
      res.status(500).json({
        success: false,
        error: {
          code: 'UPLOAD_FAILED',
          message: 'Failed to upload images'
        }
      });
    }
  }

  /**
   * Delete an image from Cloudinary
   * DELETE /api/v1/admin/upload/images/:publicId
   */
  async deleteImage(req, res) {
    try {
      const { publicId } = req.params;

      if (!publicId) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_PUBLIC_ID',
            message: 'Public ID is required'
          }
        });
      }

      // Delete image from Cloudinary
      const result = await cloudinaryService.deleteImage(publicId);

      if (result.success) {
        logger.info(`Admin deleted image with public ID: ${publicId}`);
        
        res.status(200).json({
          success: true,
          data: {
            message: 'Image deleted successfully',
            publicId: result.publicId
          }
        });
      } else {
        res.status(404).json({
          success: false,
          error: {
            code: 'IMAGE_NOT_FOUND',
            message: 'Image not found or already deleted'
          }
        });
      }

    } catch (error) {
      logger.error('Error in deleteImage controller:', error);
      
      res.status(500).json({
        success: false,
        error: {
          code: 'DELETE_FAILED',
          message: 'Failed to delete image'
        }
      });
    }
  }

  /**
   * Get image details from Cloudinary
   * GET /api/v1/admin/upload/images/:publicId
   */
  async getImageDetails(req, res) {
    try {
      const { publicId } = req.params;

      if (!publicId) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_PUBLIC_ID',
            message: 'Public ID is required'
          }
        });
      }

      const imageDetails = await cloudinaryService.getImageDetails(publicId);

      res.status(200).json({
        success: true,
        data: imageDetails
      });

    } catch (error) {
      logger.error('Error in getImageDetails controller:', error);
      
      if (error.message.includes('not found')) {
        res.status(404).json({
          success: false,
          error: {
            code: 'IMAGE_NOT_FOUND',
            message: 'Image not found'
          }
        });
      } else {
        res.status(500).json({
          success: false,
          error: {
            code: 'FETCH_FAILED',
            message: 'Failed to get image details'
          }
        });
      }
    }
  }
}

module.exports = new AdminUploadController();