const { CategoryService } = require('../services');
const logger = require('../config/logger');

/**
 * Controller for admin category management
 */
class AdminCategoryController {
  constructor() {
    this.categoryService = new CategoryService();
  }

  /**
   * Get all categories
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getAllCategories(req, res) {
    try {
      logger.debug('Admin getting all categories');

      const options = this.buildOptions(req.query);
      const result = await this.categoryService.getAllCategories(options);

      res.status(200).json({
        success: true,
        message: 'Categories retrieved successfully',
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error getting all categories:', error);
      this.handleError(res, error, 'CATEGORIES_FETCH_ERROR', 'Failed to retrieve categories');
    }
  }

  /**
   * Get category by ID
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getCategoryById(req, res) {
    try {
      const { id } = req.params;
      logger.debug('Admin getting category by ID:', id);

      const category = await this.categoryService.getCategoryById(id);

      if (!category) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'CATEGORY_NOT_FOUND',
            message: 'Category not found',
            details: {}
          },
          timestamp: new Date().toISOString()
        });
      }

      res.status(200).json({
        success: true,
        message: 'Category retrieved successfully',
        data: { category },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error getting category by ID:', error);
      this.handleError(res, error, 'CATEGORY_FETCH_ERROR', 'Failed to retrieve category');
    }
  }

  /**
   * Create new category
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async createCategory(req, res) {
    try {
      logger.debug('Admin creating category:', req.body.name);

      const category = await this.categoryService.createCategory(req.body);

      logger.info('Category created by admin:', { categoryId: category._id, adminId: req.user.id });

      res.status(201).json({
        success: true,
        message: 'Category created successfully',
        data: { category },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error creating category:', error);
      this.handleError(res, error, 'CATEGORY_CREATE_ERROR', 'Failed to create category');
    }
  }

  /**
   * Update category
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async updateCategory(req, res) {
    try {
      const { id } = req.params;
      logger.debug('Admin updating category:', id);

      const updatedCategory = await this.categoryService.updateCategory(id, req.body);

      if (!updatedCategory) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'CATEGORY_NOT_FOUND',
            message: 'Category not found',
            details: {}
          },
          timestamp: new Date().toISOString()
        });
      }

      logger.info('Category updated by admin:', { categoryId: id, adminId: req.user.id });

      res.status(200).json({
        success: true,
        message: 'Category updated successfully',
        data: { category: updatedCategory },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error updating category:', error);
      this.handleError(res, error, 'CATEGORY_UPDATE_ERROR', 'Failed to update category');
    }
  }

  /**
   * Delete category
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async deleteCategory(req, res) {
    try {
      const { id } = req.params;
      const { force, moveItemsToCategory, deleteItems } = req.query;
      
      logger.debug('Admin deleting category:', { id, force, moveItemsToCategory, deleteItems });

      const options = {};
      if (force === 'true') {
        options.force = true;
        if (moveItemsToCategory) {
          options.moveItemsToCategory = moveItemsToCategory;
        } else if (deleteItems === 'true') {
          options.deleteItems = true;
        }
      }

      const result = await this.categoryService.deleteCategory(id, options);

      if (!result.success) {
        const statusCode = result.message.includes('associated item') ? 409 : 404;
        return res.status(statusCode).json({
          success: false,
          error: {
            code: result.message.includes('associated item') ? 'CATEGORY_HAS_ITEMS' : 'CATEGORY_NOT_FOUND',
            message: result.message,
            details: { itemCount: result.itemsAffected || 0 }
          },
          timestamp: new Date().toISOString()
        });
      }

      logger.info('Category deleted by admin:', { categoryId: id, adminId: req.user.id, itemsAffected: result.itemsAffected });

      res.status(200).json({
        success: true,
        message: result.message,
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error deleting category:', error);
      this.handleError(res, error, 'CATEGORY_DELETE_ERROR', 'Failed to delete category');
    }
  }

  /**
   * Check if category can be deleted
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async checkDeletion(req, res) {
    try {
      const { id } = req.params;
      logger.debug('Admin checking category deletion:', id);

      const result = await this.categoryService.canDeleteCategory(id);

      res.status(200).json({
        success: true,
        message: 'Deletion check completed',
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error checking category deletion:', error);
      this.handleError(res, error, 'DELETION_CHECK_ERROR', 'Failed to check category deletion');
    }
  }

  /**
   * Search categories
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async searchCategories(req, res) {
    try {
      const { q: searchTerm } = req.query;
      logger.debug('Admin searching categories:', searchTerm);

      const options = this.buildOptions(req.query);
      const result = await this.categoryService.searchCategories(searchTerm, options);

      res.status(200).json({
        success: true,
        message: 'Search completed successfully',
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error searching categories:', error);
      this.handleError(res, error, 'CATEGORY_SEARCH_ERROR', 'Failed to search categories');
    }
  }

  /**
   * Get category statistics
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getCategoryStatistics(req, res) {
    try {
      logger.debug('Admin getting category statistics');

      const stats = await this.categoryService.getCategoryStatistics();

      res.status(200).json({
        success: true,
        message: 'Statistics retrieved successfully',
        data: { statistics: stats },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error getting category statistics:', error);
      this.handleError(res, error, 'STATISTICS_ERROR', 'Failed to retrieve statistics');
    }
  }

  /**
   * Get top categories by item count
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getTopCategories(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 5;
      logger.debug('Admin getting top categories:', limit);

      const categories = await this.categoryService.getTopCategoriesByItemCount(limit);

      res.status(200).json({
        success: true,
        message: 'Top categories retrieved successfully',
        data: { categories },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error getting top categories:', error);
      this.handleError(res, error, 'TOP_CATEGORIES_ERROR', 'Failed to retrieve top categories');
    }
  }

  /**
   * Get empty categories
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getEmptyCategories(req, res) {
    try {
      logger.debug('Admin getting empty categories');

      const options = this.buildOptions(req.query);
      const result = await this.categoryService.getEmptyCategories(options);

      res.status(200).json({
        success: true,
        message: 'Empty categories retrieved successfully',
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error getting empty categories:', error);
      this.handleError(res, error, 'EMPTY_CATEGORIES_ERROR', 'Failed to retrieve empty categories');
    }
  }

  /**
   * Bulk create categories
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async bulkCreateCategories(req, res) {
    try {
      const { categories } = req.body;
      logger.debug('Admin bulk creating categories:', categories.length);

      const result = await this.categoryService.bulkCreateCategories(categories);

      logger.info('Bulk category creation by admin:', { 
        created: result.created.length, 
        failed: result.failed.length,
        duplicates: result.duplicates.length,
        adminId: req.user.id 
      });

      const statusCode = result.failed.length > 0 ? 207 : 201; // 207 Multi-Status if some failed

      res.status(statusCode).json({
        success: true,
        message: 'Bulk category creation completed',
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error in bulk category creation:', error);
      this.handleError(res, error, 'BULK_CREATE_ERROR', 'Failed to bulk create categories');
    }
  }

  /**
   * Build options from query parameters
   * @param {Object} query - Query parameters
   * @returns {Object} Options object
   */
  buildOptions(query) {
    const options = {};

    if (query.page) {
      options.page = parseInt(query.page);
    }

    if (query.limit) {
      options.limit = parseInt(query.limit);
    }

    if (query.sortBy) {
      options.sort = {};
      options.sort[query.sortBy] = query.sortOrder === 'asc' ? 1 : -1;
    }

    if (query.search) {
      options.search = query.search;
    }

    return options;
  }

  /**
   * Handle errors consistently
   * @param {Object} res - Express response object
   * @param {Error} error - Error object
   * @param {string} code - Error code
   * @param {string} message - Error message
   */
  handleError(res, error, code, message) {
    const statusCode = this.getStatusCodeFromError(error);
    
    res.status(statusCode).json({
      success: false,
      error: {
        code: error.code || code,
        message: error.message || message,
        details: error.details || {}
      },
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Get appropriate HTTP status code from error
   * @param {Error} error - Error object
   * @returns {number} HTTP status code
   */
  getStatusCodeFromError(error) {
    switch (error.code) {
      case 'CATEGORY_NOT_FOUND':
        return 404;
      case 'CATEGORY_NAME_EXISTS':
      case 'DUPLICATE_CATEGORY_NAME':
      case 'INVALID_CATEGORY_NAME':
      case 'CATEGORY_NAME_TOO_LONG':
      case 'CATEGORY_DESCRIPTION_TOO_LONG':
      case 'INVALID_CATEGORY_NAME_CHARACTERS':
        return 400;
      case 'CATEGORY_HAS_ITEMS':
        return 409;
      default:
        return 500;
    }
  }
}

module.exports = AdminCategoryController;