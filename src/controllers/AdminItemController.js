const { ItemService } = require('../services');
const logger = require('../config/logger');

/**
 * Controller for admin item management
 */
class AdminItemController {
  constructor() {
    this.itemService = new ItemService();
  }

  /**
   * Get all items
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getAllItems(req, res) {
    try {
      logger.debug('Admin getting all items with filters:', req.query);

      const filters = this.buildFilters(req.query);
      const options = this.buildOptions(req.query);

      const result = await this.itemService.getAllItems(filters, options);

      res.status(200).json({
        success: true,
        message: 'Items retrieved successfully',
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error getting all items:', error);
      this.handleError(res, error, 'ITEMS_FETCH_ERROR', 'Failed to retrieve items');
    }
  }

  /**
   * Get item by ID
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getItemById(req, res) {
    try {
      const { id } = req.params;
      logger.debug('Admin getting item by ID:', id);

      const item = await this.itemService.getItemById(id);

      if (!item) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'ITEM_NOT_FOUND',
            message: 'Item not found',
            details: {}
          },
          timestamp: new Date().toISOString()
        });
      }

      res.status(200).json({
        success: true,
        message: 'Item retrieved successfully',
        data: { item },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error getting item by ID:', error);
      this.handleError(res, error, 'ITEM_FETCH_ERROR', 'Failed to retrieve item');
    }
  }

  /**
   * Create new item
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async createItem(req, res) {
    try {
      logger.debug('Admin creating item:', req.body.name);

      const item = await this.itemService.createItem(req.body);

      logger.info('Item created by admin:', { itemId: item._id, adminId: req.user.id });

      res.status(201).json({
        success: true,
        message: 'Item created successfully',
        data: { item },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error creating item:', error);
      this.handleError(res, error, 'ITEM_CREATE_ERROR', 'Failed to create item');
    }
  }

  /**
   * Update item
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async updateItem(req, res) {
    try {
      const { id } = req.params;
      logger.debug('Admin updating item:', id);

      const updatedItem = await this.itemService.updateItem(id, req.body);

      if (!updatedItem) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'ITEM_NOT_FOUND',
            message: 'Item not found',
            details: {}
          },
          timestamp: new Date().toISOString()
        });
      }

      logger.info('Item updated by admin:', { itemId: id, adminId: req.user.id });

      res.status(200).json({
        success: true,
        message: 'Item updated successfully',
        data: { item: updatedItem },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error updating item:', error);
      this.handleError(res, error, 'ITEM_UPDATE_ERROR', 'Failed to update item');
    }
  }

  /**
   * Delete item
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async deleteItem(req, res) {
    try {
      const { id } = req.params;
      logger.debug('Admin deleting item:', id);

      const result = await this.itemService.deleteItem(id);

      if (!result.success) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'ITEM_NOT_FOUND',
            message: 'Item not found',
            details: {}
          },
          timestamp: new Date().toISOString()
        });
      }

      logger.info('Item deleted by admin:', { itemId: id, adminId: req.user.id });

      res.status(200).json({
        success: true,
        message: 'Item deleted successfully',
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error deleting item:', error);
      this.handleError(res, error, 'ITEM_DELETE_ERROR', 'Failed to delete item');
    }
  }

  /**
   * Update item availability
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async updateAvailability(req, res) {
    try {
      const { id } = req.params;
      const { isAvailable } = req.body;
      
      logger.debug('Admin updating item availability:', { id, isAvailable });

      const updatedItem = await this.itemService.updateAvailability(id, isAvailable);

      if (!updatedItem) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'ITEM_NOT_FOUND',
            message: 'Item not found',
            details: {}
          },
          timestamp: new Date().toISOString()
        });
      }

      logger.info('Item availability updated by admin:', { itemId: id, isAvailable, adminId: req.user.id });

      res.status(200).json({
        success: true,
        message: 'Item availability updated successfully',
        data: { item: updatedItem },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error updating item availability:', error);
      this.handleError(res, error, 'AVAILABILITY_UPDATE_ERROR', 'Failed to update item availability');
    }
  }

  /**
   * Get items by category
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getItemsByCategory(req, res) {
    try {
      const { categoryId } = req.params;
      logger.debug('Admin getting items by category:', categoryId);

      const options = this.buildOptions(req.query);
      const result = await this.itemService.getItemsByCategory(categoryId, options);

      res.status(200).json({
        success: true,
        message: 'Items retrieved successfully',
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error getting items by category:', error);
      this.handleError(res, error, 'CATEGORY_ITEMS_ERROR', 'Failed to retrieve items by category');
    }
  }

  /**
   * Search items
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async searchItems(req, res) {
    try {
      const { q: searchTerm } = req.query;
      logger.debug('Admin searching items:', searchTerm);

      const options = this.buildOptions(req.query);
      const result = await this.itemService.searchItems(searchTerm, options);

      res.status(200).json({
        success: true,
        message: 'Search completed successfully',
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error searching items:', error);
      this.handleError(res, error, 'ITEM_SEARCH_ERROR', 'Failed to search items');
    }
  }

  /**
   * Get item statistics
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getItemStatistics(req, res) {
    try {
      logger.debug('Admin getting item statistics');

      const stats = await this.itemService.getItemStatistics();

      res.status(200).json({
        success: true,
        message: 'Statistics retrieved successfully',
        data: { statistics: stats },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error getting item statistics:', error);
      this.handleError(res, error, 'STATISTICS_ERROR', 'Failed to retrieve statistics');
    }
  }

  /**
   * Get all unique colors
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getAllColors(req, res) {
    try {
      logger.debug('Admin getting all colors');

      const colors = await this.itemService.getAllColors();

      res.status(200).json({
        success: true,
        message: 'Colors retrieved successfully',
        data: { colors },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error getting all colors:', error);
      this.handleError(res, error, 'COLORS_ERROR', 'Failed to retrieve colors');
    }
  }

  /**
   * Get items needing restock
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getItemsNeedingRestock(req, res) {
    try {
      logger.debug('Admin getting items needing restock');

      const options = this.buildOptions(req.query);
      const result = await this.itemService.getItemsNeedingRestock(options);

      res.status(200).json({
        success: true,
        message: 'Items needing restock retrieved successfully',
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error getting items needing restock:', error);
      this.handleError(res, error, 'RESTOCK_ERROR', 'Failed to retrieve items needing restock');
    }
  }

  /**
   * Build filters from query parameters
   * @param {Object} query - Query parameters
   * @returns {Object} Filters object
   */
  buildFilters(query) {
    const filters = {};

    if (query.categoryId) {
      filters.categoryId = query.categoryId;
    }

    if (query.isAvailable !== undefined) {
      filters.isAvailable = query.isAvailable === 'true';
    }

    if (query.pricingType) {
      filters.pricingType = query.pricingType;
    }

    if (query.color) {
      filters.color = query.color;
    }

    if (query.minPrice !== undefined) {
      filters.minPrice = parseFloat(query.minPrice);
    }

    if (query.maxPrice !== undefined) {
      filters.maxPrice = parseFloat(query.maxPrice);
    }

    return filters;
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
      case 'ITEM_NOT_FOUND':
        return 404;
      case 'INVALID_PRICING_TYPE':
      case 'INVALID_FIXED_PRICE':
      case 'INVALID_PRICE_RANGE':
      case 'INVALID_COLORS_FORMAT':
      case 'TOO_MANY_COLORS':
      case 'INVALID_COLOR_NAME':
      case 'DUPLICATE_COLORS':
        return 400;
      default:
        return 500;
    }
  }
}

module.exports = AdminItemController;