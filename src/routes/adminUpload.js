const express = require('express');
const router = express.Router();
const adminUploadController = require('../controllers/AdminUploadController');
const authMiddleware = require('../middleware/auth');
const { uploadImages } = require('../middleware/upload');

// Apply authentication middleware to all admin upload routes
router.use(authMiddleware.authenticateAdmin);

/**
 * @route   POST /api/v1/admin/upload/images
 * @desc    Upload multiple images to Cloudinary
 * @access  Admin only
 */
router.post('/images', uploadImages, adminUploadController.uploadImages);

/**
 * @route   DELETE /api/v1/admin/upload/images/:publicId
 * @desc    Delete an image from Cloudinary
 * @access  Admin only
 */
router.delete('/images/:publicId', adminUploadController.deleteImage);

/**
 * @route   GET /api/v1/admin/upload/images/:publicId
 * @desc    Get image details from Cloudinary
 * @access  Admin only
 */
router.get('/images/:publicId', adminUploadController.getImageDetails);

module.exports = router;