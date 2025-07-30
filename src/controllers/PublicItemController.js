const { ItemService } = require('../services');
const logger = require('../config/logger');

/**
 * Controller for public item browsing
 */
class PublicItemController {
  constructor() {
    this.itemService = new ItemService();
  }

  /**
   * Get all available items for public browsing
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getAllItems(req, res) {
    try {
      logger.debug('Public getting all available items with filters:', req.query);

      const filters = this.buildFilters(req.query);
      const options = this.buildOptions(req.query);

      // Only show available items to public
      filters.isAvailable = true;

      const result = await this.itemService.getAllItems(filters, options);

      res.status(200).json({
        success: true,
        message: 'Items retrieved successfully',
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error getting public items:', error);
      this.handleError(res, error, 'ITEMS_FETCH_ERROR', 'Failed to retrieve items');
    }
  }

  /**
   * Get item by ID for public viewing
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getItemById(req, res) {
    try {
      const { id } = req.params;
      logger.debug('Public getting item by ID:', id);

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

      // Only show available items to public
      if (!item.isAvailable) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'ITEM_NOT_AVAILABLE',
            message: 'Item is not currently available',
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
      logger.error('Error getting public item by ID:', error);
      this.handleError(res, error, 'ITEM_FETCH_ERROR', 'Failed to retrieve item');
    }
  }

  /**
   * Get items by category for public browsing
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getItemsByCategory(req, res) {
    try {
      const { categoryId } = req.params;
      logger.debug('Public getting items by category:', categoryId);

      const options = this.buildOptions(req.query);
      const result = await this.itemService.getItemsByCategory(categoryId, options);

      // Filter out unavailable items from the result if any
      if (result && result.data) {
        result.data = result.data.filter(item => item.isAvailable);
        if (result.pagination) {
          result.pagination.totalCount = result.data.length;
        }
      }

      res.status(200).json({
        success: true,
        message: 'Items retrieved successfully',
        data: result || { data: [], pagination: { currentPage: 1, totalPages: 0, totalCount: 0, limit: options.limit || 10, hasNextPage: false, hasPrevPage: false } },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error getting public items by category:', error);
      this.handleError(res, error, 'CATEGORY_ITEMS_ERROR', 'Failed to retrieve items by category');
    }
  }

  /**
   * Search items for public browsing
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async searchItems(req, res) {
    try {
      const { q: searchTerm } = req.query;
      logger.debug('Public searching items:', searchTerm);

      if (!searchTerm || searchTerm.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_SEARCH_TERM',
            message: 'Search term is required',
            details: {}
          },
          timestamp: new Date().toISOString()
        });
      }

      const options = this.buildOptions(req.query);
      const result = await this.itemService.searchItems(searchTerm, options);

      // Filter out unavailable items from the result if any
      if (result && result.data) {
        result.data = result.data.filter(item => item.isAvailable);
        if (result.pagination) {
          result.pagination.totalCount = result.data.length;
        }
      }

      res.status(200).json({
        success: true,
        message: 'Search completed successfully',
        data: result || { data: [], pagination: { currentPage: 1, totalPages: 0, totalCount: 0, limit: options.limit || 10, hasNextPage: false, hasPrevPage: false } },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error searching public items:', error);
      this.handleError(res, error, 'ITEM_SEARCH_ERROR', 'Failed to search items');
    }
  }

  /**
   * Get items by pricing type for public browsing
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getItemsByPricingType(req, res) {
    try {
      const { pricingType } = req.params;
      logger.debug('Public getting items by pricing type:', pricingType);

      const options = this.buildOptions(req.query);
      const result = await this.itemService.getItemsByPricingType(pricingType, options);

      // Filter out unavailable items from the result if any
      if (result && result.data) {
        result.data = result.data.filter(item => item.isAvailable);
        if (result.pagination) {
          result.pagination.totalCount = result.data.length;
        }
      }

      res.status(200).json({
        success: true,
        message: 'Items retrieved successfully',
        data: result || { data: [], pagination: { currentPage: 1, totalPages: 0, totalCount: 0, limit: options.limit || 10, hasNextPage: false, hasPrevPage: false } },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error getting public items by pricing type:', error);
      this.handleError(res, error, 'PRICING_TYPE_ERROR', 'Failed to retrieve items by pricing type');
    }
  }

  /**
   * Get items by color for public browsing
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getItemsByColor(req, res) {
    try {
      const { color } = req.params;
      logger.debug('Public getting items by color:', color);

      const options = this.buildOptions(req.query);
      const result = await this.itemService.getItemsByColor(color, options);

      // Filter out unavailable items from the result if any
      if (result && result.data) {
        result.data = result.data.filter(item => item.isAvailable);
        if (result.pagination) {
          result.pagination.totalCount = result.data.length;
        }
      }

      res.status(200).json({
        success: true,
        message: 'Items retrieved successfully',
        data: result || { data: [], pagination: { currentPage: 1, totalPages: 0, totalCount: 0, limit: options.limit || 10, hasNextPage: false, hasPrevPage: false } },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error getting public items by color:', error);
      this.handleError(res, error, 'COLOR_ITEMS_ERROR', 'Failed to retrieve items by color');
    }
  }

  /**
   * Get all available colors for public browsing
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getAllColors(req, res) {
    try {
      logger.debug('Public getting all colors');

      const colors = await this.itemService.getAllColors();

      res.status(200).json({
        success: true,
        message: 'Colors retrieved successfully',
        data: { colors },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error getting public colors:', error);
      this.handleError(res, error, 'COLORS_ERROR', 'Failed to retrieve colors');
    }
  }

  /**
   * Build filters from query parameters for public access
   * @param {Object} query - Query parameters
   * @returns {Object} Filters object
   */
  buildFilters(query) {
    const filters = {};

    if (query.categoryId) {
      filters.categoryId = query.categoryId;
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
      options.limit = Math.min(parseInt(query.limit), 50); // Limit max items per page for public
    }

    if (query.sortBy) {
      options.sort = {};
      options.sort[query.sortBy] = query.sortOrder === 'asc' ? 1 : -1;
    } else {
      // Default sort for public: newest first
      options.sort = { createdAt: -1 };
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
      case 'MISSING_SEARCH_TERM':
        return 400;
      default:
        return 500;
    }
  }
}

module.exports = PublicItemController;