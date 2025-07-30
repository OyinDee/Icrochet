const express = require('express');
const AdminItemController = require('../controllers/AdminItemController');
const { validateBody, validateParams, validateQuery, validateObjectId } = require('../middleware/validation');
const { authenticateAdmin } = require('../middleware/auth');
const { itemValidation, queryValidation } = require('../utils/validation');
const Joi = require('joi');

const router = express.Router();
const adminItemController = new AdminItemController();

// All routes require admin authentication
router.use(authenticateAdmin());

/**
 * @route GET /api/v1/admin/items
 * @desc Get all items with filtering and pagination
 * @access Private (Admin)
 */
router.get('/',
  validateQuery(Joi.object({
    ...queryValidation.pagination.describe().keys,
    ...queryValidation.sorting.describe().keys,
    ...queryValidation.itemFilter.describe().keys,
    minPrice: Joi.number().min(0),
    maxPrice: Joi.number().min(0),
    color: Joi.string().trim()
  })),
  adminItemController.getAllItems.bind(adminItemController)
);

/**
 * @route GET /api/v1/admin/items/statistics
 * @desc Get item statistics
 * @access Private (Admin)
 */
router.get('/statistics',
  adminItemController.getItemStatistics.bind(adminItemController)
);

/**
 * @route GET /api/v1/admin/items/colors
 * @desc Get all unique colors
 * @access Private (Admin)
 */
router.get('/colors',
  adminItemController.getAllColors.bind(adminItemController)
);

/**
 * @route GET /api/v1/admin/items/restock
 * @desc Get items needing restock
 * @access Private (Admin)
 */
router.get('/restock',
  validateQuery(Joi.object({
    ...queryValidation.pagination.describe().keys,
    ...queryValidation.sorting.describe().keys
  })),
  adminItemController.getItemsNeedingRestock.bind(adminItemController)
);

/**
 * @route GET /api/v1/admin/items/search
 * @desc Search items
 * @access Private (Admin)
 */
router.get('/search',
  validateQuery(Joi.object({
    q: Joi.string().trim().min(1).required(),
    ...queryValidation.pagination.describe().keys,
    ...queryValidation.sorting.describe().keys
  })),
  adminItemController.searchItems.bind(adminItemController)
);

/**
 * @route GET /api/v1/admin/items/category/:categoryId
 * @desc Get items by category
 * @access Private (Admin)
 */
router.get('/category/:categoryId',
  validateObjectId('categoryId'),
  validateQuery(Joi.object({
    ...queryValidation.pagination.describe().keys,
    ...queryValidation.sorting.describe().keys
  })),
  adminItemController.getItemsByCategory.bind(adminItemController)
);

/**
 * @route GET /api/v1/admin/items/:id
 * @desc Get item by ID
 * @access Private (Admin)
 */
router.get('/:id',
  validateObjectId(),
  adminItemController.getItemById.bind(adminItemController)
);

/**
 * @route POST /api/v1/admin/items
 * @desc Create new item
 * @access Private (Admin)
 */
router.post('/',
  validateBody(itemValidation.create),
  adminItemController.createItem.bind(adminItemController)
);

/**
 * @route PUT /api/v1/admin/items/:id
 * @desc Update item
 * @access Private (Admin)
 */
router.put('/:id',
  validateObjectId(),
  validateBody(itemValidation.update),
  adminItemController.updateItem.bind(adminItemController)
);

/**
 * @route PUT /api/v1/admin/items/:id/availability
 * @desc Update item availability
 * @access Private (Admin)
 */
router.put('/:id/availability',
  validateObjectId(),
  validateBody(Joi.object({
    isAvailable: Joi.boolean().required()
  })),
  adminItemController.updateAvailability.bind(adminItemController)
);

/**
 * @route DELETE /api/v1/admin/items/:id
 * @desc Delete item
 * @access Private (Admin)
 */
router.delete('/:id',
  validateObjectId(),
  adminItemController.deleteItem.bind(adminItemController)
);

module.exports = router;