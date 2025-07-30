const express = require('express');
const PublicItemController = require('../controllers/PublicItemController');
const { validateMultiple } = require('../middleware/validation');
const { publicItemValidation } = require('../utils/validation');

const router = express.Router();
const publicItemController = new PublicItemController();

/**
 * Public Item Routes
 * Base path: /api/v1/public/items
 */

/**
 * @route GET /api/v1/public/items
 * @desc Get all available items with filtering and pagination
 * @access Public
 * @query {string} [categoryId] - Filter by category ID
 * @query {string} [pricingType] - Filter by pricing type (fixed, range, custom)
 * @query {string} [color] - Filter by available color
 * @query {number} [minPrice] - Minimum price filter
 * @query {number} [maxPrice] - Maximum price filter
 * @query {number} [page=1] - Page number for pagination
 * @query {number} [limit=10] - Items per page (max 50)
 * @query {string} [sortBy] - Sort field (name, createdAt, etc.)
 * @query {string} [sortOrder=desc] - Sort order (asc, desc)
 */
router.get('/', 
  validateMultiple(publicItemValidation.getAllItems),
  publicItemController.getAllItems.bind(publicItemController)
);

/**
 * @route GET /api/v1/public/items/search
 * @desc Search available items by name, description, or category
 * @access Public
 * @query {string} q - Search term (required)
 * @query {number} [page=1] - Page number for pagination
 * @query {number} [limit=10] - Items per page (max 50)
 * @query {string} [sortBy] - Sort field
 * @query {string} [sortOrder=desc] - Sort order (asc, desc)
 */
router.get('/search',
  validateMultiple(publicItemValidation.searchItems),
  publicItemController.searchItems.bind(publicItemController)
);

/**
 * @route GET /api/v1/public/items/colors
 * @desc Get all available colors from items
 * @access Public
 */
router.get('/colors',
  publicItemController.getAllColors.bind(publicItemController)
);

/**
 * @route GET /api/v1/public/items/pricing/:pricingType
 * @desc Get items by pricing type
 * @access Public
 * @param {string} pricingType - Pricing type (fixed, range, custom)
 */
router.get('/pricing/:pricingType',
  validateMultiple(publicItemValidation.getItemsByPricingType),
  publicItemController.getItemsByPricingType.bind(publicItemController)
);

/**
 * @route GET /api/v1/public/items/color/:color
 * @desc Get items by color
 * @access Public
 * @param {string} color - Color name
 */
router.get('/color/:color',
  validateMultiple(publicItemValidation.getItemsByColor),
  publicItemController.getItemsByColor.bind(publicItemController)
);

/**
 * @route GET /api/v1/public/items/category/:categoryId
 * @desc Get available items by category
 * @access Public
 * @param {string} categoryId - Category ID
 * @query {number} [page=1] - Page number for pagination
 * @query {number} [limit=10] - Items per page (max 50)
 * @query {string} [sortBy] - Sort field
 * @query {string} [sortOrder=desc] - Sort order (asc, desc)
 */
router.get('/category/:categoryId',
  validateMultiple(publicItemValidation.getItemsByCategory),
  publicItemController.getItemsByCategory.bind(publicItemController)
);

/**
 * @route GET /api/v1/public/items/:id
 * @desc Get specific available item by ID
 * @access Public
 * @param {string} id - Item ID
 */
router.get('/:id',
  validateMultiple(publicItemValidation.getItemById),
  publicItemController.getItemById.bind(publicItemController)
);

module.exports = router;