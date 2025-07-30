const express = require('express');
const AdminCategoryController = require('../controllers/AdminCategoryController');
const { validateBody, validateParams, validateQuery, validateObjectId } = require('../middleware/validation');
const { authenticateAdmin } = require('../middleware/auth');
const { categoryValidation, queryValidation } = require('../utils/validation');
const Joi = require('joi');

const router = express.Router();
const adminCategoryController = new AdminCategoryController();

// All routes require admin authentication
router.use(authenticateAdmin());

/**
 * @route GET /api/v1/admin/categories
 * @desc Get all categories with item counts
 * @access Private (Admin)
 */
router.get('/',
  validateQuery(Joi.object({
    ...queryValidation.pagination.describe().keys,
    ...queryValidation.sorting.describe().keys,
    search: Joi.string().trim().min(1)
  })),
  adminCategoryController.getAllCategories.bind(adminCategoryController)
);

/**
 * @route GET /api/v1/admin/categories/statistics
 * @desc Get category statistics
 * @access Private (Admin)
 */
router.get('/statistics',
  adminCategoryController.getCategoryStatistics.bind(adminCategoryController)
);

/**
 * @route GET /api/v1/admin/categories/top
 * @desc Get top categories by item count
 * @access Private (Admin)
 */
router.get('/top',
  validateQuery(Joi.object({
    limit: Joi.number().integer().min(1).max(20).default(5)
  })),
  adminCategoryController.getTopCategories.bind(adminCategoryController)
);

/**
 * @route GET /api/v1/admin/categories/empty
 * @desc Get categories with no items
 * @access Private (Admin)
 */
router.get('/empty',
  validateQuery(Joi.object({
    ...queryValidation.pagination.describe().keys,
    ...queryValidation.sorting.describe().keys
  })),
  adminCategoryController.getEmptyCategories.bind(adminCategoryController)
);

/**
 * @route GET /api/v1/admin/categories/search
 * @desc Search categories
 * @access Private (Admin)
 */
router.get('/search',
  validateQuery(Joi.object({
    q: Joi.string().trim().min(1).required(),
    ...queryValidation.pagination.describe().keys,
    ...queryValidation.sorting.describe().keys
  })),
  adminCategoryController.searchCategories.bind(adminCategoryController)
);

/**
 * @route GET /api/v1/admin/categories/:id
 * @desc Get category by ID
 * @access Private (Admin)
 */
router.get('/:id',
  validateObjectId(),
  adminCategoryController.getCategoryById.bind(adminCategoryController)
);

/**
 * @route GET /api/v1/admin/categories/:id/check-deletion
 * @desc Check if category can be deleted
 * @access Private (Admin)
 */
router.get('/:id/check-deletion',
  validateObjectId(),
  adminCategoryController.checkDeletion.bind(adminCategoryController)
);

/**
 * @route POST /api/v1/admin/categories
 * @desc Create new category
 * @access Private (Admin)
 */
router.post('/',
  validateBody(categoryValidation.create),
  adminCategoryController.createCategory.bind(adminCategoryController)
);

/**
 * @route POST /api/v1/admin/categories/bulk
 * @desc Bulk create categories
 * @access Private (Admin)
 */
router.post('/bulk',
  validateBody(Joi.object({
    categories: Joi.array().items(categoryValidation.create).min(1).max(50).required()
  })),
  adminCategoryController.bulkCreateCategories.bind(adminCategoryController)
);

/**
 * @route PUT /api/v1/admin/categories/:id
 * @desc Update category
 * @access Private (Admin)
 */
router.put('/:id',
  validateObjectId(),
  validateBody(categoryValidation.update),
  adminCategoryController.updateCategory.bind(adminCategoryController)
);

/**
 * @route DELETE /api/v1/admin/categories/:id
 * @desc Delete category
 * @access Private (Admin)
 */
router.delete('/:id',
  validateObjectId(),
  validateQuery(Joi.object({
    force: Joi.string().valid('true', 'false'),
    moveItemsToCategory: Joi.string().pattern(/^[0-9a-fA-F]{24}$/),
    deleteItems: Joi.string().valid('true', 'false')
  })),
  adminCategoryController.deleteCategory.bind(adminCategoryController)
);

module.exports = router;