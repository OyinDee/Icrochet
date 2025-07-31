const { ItemRepository, CategoryRepository } = require('../repositories');
const logger = require('../config/logger');

/**
 * Service for Item business logic
 */
class ItemService {
  constructor() {
    this.itemRepository = new ItemRepository();
    this.categoryRepository = new CategoryRepository();
  }

  /**
   * Get all items with category information
   * @param {Object} filters - Filter options
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Items with pagination
   */
  async getAllItems(filters = {}, options = {}) {
    try {
      logger.debug('Getting all items with filters:', filters);

      // Build criteria from filters
      const criteria = this.buildFilterCriteria(filters);
      
      const result = await this.itemRepository.findWithCategory(criteria, options);
      const transformedResult = this.transformResult(result);
      
      logger.info(`Retrieved ${transformedResult.data.length} items`);
      return transformedResult;
    } catch (error) {
      logger.error('Error getting all items:', error);
      throw error;
    }
  }

  /**
   * Get item by ID with category information
   * @param {string} itemId - Item ID
   * @returns {Promise<Object|null>} Item with category or null
   */
  async getItemById(itemId) {
    try {
      logger.debug('Getting item by ID:', itemId);

      const item = await this.itemRepository.findById(itemId, {
        populate: {
          path: 'categoryId',
          select: 'name description'
        }
      });

      if (!item) {
        logger.warn('Item not found:', itemId);
        return null;
      }

      logger.debug('Item retrieved successfully:', itemId);
      return item;
    } catch (error) {
      logger.error('Error getting item by ID:', error);
      throw error;
    }
  }

  /**
   * Create new item with validation
   * @param {Object} itemData - Item data
   * @returns {Promise<Object>} Created item
   */
  async createItem(itemData) {
    try {
      logger.debug('Creating item:', itemData.name);

      // Validate category exists
      await this.validateCategory(itemData.categoryId);

      // Validate pricing data
      this.validatePricingData(itemData);

      // Validate colors
      this.validateColors(itemData.availableColors);

      // Create item
      const item = await this.itemRepository.create(itemData);
      
      logger.info('Item created successfully:', item._id);
      return item;
    } catch (error) {
      logger.error('Error creating item:', error);
      throw error;
    }
  }

  /**
   * Update item with validation
   * @param {string} itemId - Item ID
   * @param {Object} updateData - Update data
   * @returns {Promise<Object|null>} Updated item or null
   */
  async updateItem(itemId, updateData) {
    try {
      logger.debug('Updating item:', itemId);

      // Validate category if being updated
      if (updateData.categoryId) {
        await this.validateCategory(updateData.categoryId);
      }

      // Validate pricing data if being updated
      if (updateData.pricingType || updateData.price) {
        this.validatePricingData({
          pricingType: updateData.pricingType,
          price: updateData.price
        });
      }

      // Validate colors if being updated
      if (updateData.availableColors) {
        this.validateColors(updateData.availableColors);
      }

      const updatedItem = await this.itemRepository.updateById(itemId, updateData, {
        populate: {
          path: 'categoryId',
          select: 'name description'
        }
      });

      if (updatedItem) {
        logger.info('Item updated successfully:', itemId);
      } else {
        logger.warn('Item not found for update:', itemId);
      }

      return updatedItem;
    } catch (error) {
      logger.error('Error updating item:', error);
      throw error;
    }
  }

  /**
   * Delete item
   * @param {string} itemId - Item ID
   * @returns {Promise<Object>} Deletion result
   */
  async deleteItem(itemId) {
    try {
      logger.debug('Deleting item:', itemId);

      const deletedItem = await this.itemRepository.deleteById(itemId);

      if (deletedItem) {
        logger.info('Item deleted successfully:', itemId);
        return {
          success: true,
          message: 'Item deleted successfully',
          item: deletedItem
        };
      } else {
        logger.warn('Item not found for deletion:', itemId);
        return {
          success: false,
          message: 'Item not found'
        };
      }
    } catch (error) {
      logger.error('Error deleting item:', error);
      throw error;
    }
  }

  /**
   * Get items by category
   * @param {string} categoryId - Category ID
   * @param {Object} options - Query options
   * @param {boolean} validateCategory - Whether to validate category exists (default: true)
   * @param {boolean} availableOnly - Whether to return only available items (default: false)
   * @returns {Promise<Object>} Items in category
   */
  async getItemsByCategory(categoryId, options = {}, validateCategory = true, availableOnly = false) {
    try {
      logger.debug('Getting items by category:', categoryId);

      // Validate category exists only if requested (skip for public API)
      if (validateCategory) {
        await this.validateCategory(categoryId);
      }

      let result;
      if (availableOnly) {
        result = await this.itemRepository.findAvailable({ categoryId }, options);
      } else {
        result = await this.itemRepository.findByCategory(categoryId, options);
      }
      
      const transformedResult = this.transformResult(result);
      
      logger.info(`Retrieved ${transformedResult.data.length} items for category ${categoryId}`);
      return transformedResult;
    } catch (error) {
      logger.error('Error getting items by category:', error);
      throw error;
    }
  }

  /**
   * Search items
   * @param {string} searchTerm - Search term
   * @param {Object} options - Search options
   * @param {boolean} availableOnly - Whether to return only available items (default: false)
   * @returns {Promise<Object>} Search results
   */
  async searchItems(searchTerm, options = {}, availableOnly = false) {
    try {
      logger.debug('Searching items:', searchTerm);

      const result = await this.itemRepository.search(searchTerm, options, availableOnly);
      const transformedResult = this.transformResult(result);
      
      logger.info(`Found ${transformedResult.data.length} items matching search term`);
      return transformedResult;
    } catch (error) {
      logger.error('Error searching items:', error);
      throw error;
    }
  }

  /**
   * Get available items only
   * @param {Object} filters - Additional filters
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Available items
   */
  async getAvailableItems(filters = {}, options = {}) {
    try {
      logger.debug('Getting available items');

      const result = await this.itemRepository.findAvailable(filters, options);
      const transformedResult = this.transformResult(result);
      
      logger.info(`Retrieved ${transformedResult.data.length} available items`);
      return transformedResult;
    } catch (error) {
      logger.error('Error getting available items:', error);
      throw error;
    }
  }

  /**
   * Get items by pricing type
   * @param {string} pricingType - Pricing type (fixed, range, custom)
   * @param {Object} options - Query options
   * @param {boolean} availableOnly - Whether to return only available items (default: false)
   * @returns {Promise<Object>} Items with specified pricing type
   */
  async getItemsByPricingType(pricingType, options = {}, availableOnly = false) {
    try {
      logger.debug('Getting items by pricing type:', pricingType);

      this.validatePricingType(pricingType);

      let result;
      if (availableOnly) {
        result = await this.itemRepository.findAvailable({ pricingType }, options);
      } else {
        result = await this.itemRepository.findByPricingType(pricingType, options);
      }
      
      const transformedResult = this.transformResult(result);
      
      logger.info(`Retrieved ${transformedResult.data.length} items with ${pricingType} pricing`);
      return transformedResult;
    } catch (error) {
      logger.error('Error getting items by pricing type:', error);
      throw error;
    }
  }

  /**
   * Get items by price range
   * @param {number} minPrice - Minimum price
   * @param {number} maxPrice - Maximum price
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Items within price range
   */
  async getItemsByPriceRange(minPrice, maxPrice, options = {}) {
    try {
      logger.debug('Getting items by price range:', { minPrice, maxPrice });

      this.validatePriceRange(minPrice, maxPrice);

      const result = await this.itemRepository.findByPriceRange(minPrice, maxPrice, options);
      
      logger.info(`Retrieved ${result.data.length} items in price range $${minPrice}-$${maxPrice}`);
      return result;
    } catch (error) {
      logger.error('Error getting items by price range:', error);
      throw error;
    }
  }

  /**
   * Get items by color
   * @param {string} color - Color name
   * @param {Object} options - Query options
   * @param {boolean} availableOnly - Whether to return only available items (default: false)
   * @returns {Promise<Object>} Items with specified color
   */
  async getItemsByColor(color, options = {}, availableOnly = false) {
    try {
      logger.debug('Getting items by color:', color);

      let result;
      if (availableOnly) {
        result = await this.itemRepository.findAvailable({ availableColors: { $regex: new RegExp(color, 'i') } }, options);
      } else {
        result = await this.itemRepository.findByColor(color, options);
      }
      
      const transformedResult = this.transformResult(result);
      
      logger.info(`Retrieved ${transformedResult.data.length} items with color ${color}`);
      return transformedResult;
    } catch (error) {
      logger.error('Error getting items by color:', error);
      throw error;
    }
  }

  /**
   * Update item availability
   * @param {string} itemId - Item ID
   * @param {boolean} isAvailable - Availability status
   * @returns {Promise<Object|null>} Updated item or null
   */
  async updateAvailability(itemId, isAvailable) {
    try {
      logger.debug('Updating item availability:', { itemId, isAvailable });

      const updatedItem = await this.itemRepository.updateAvailability(itemId, isAvailable);

      if (updatedItem) {
        logger.info(`Item availability updated: ${itemId} -> ${isAvailable}`);
      } else {
        logger.warn('Item not found for availability update:', itemId);
      }

      return updatedItem;
    } catch (error) {
      logger.error('Error updating item availability:', error);
      throw error;
    }
  }

  /**
   * Validate color for item
   * @param {string} itemId - Item ID
   * @param {string} color - Color to validate
   * @returns {Promise<Object>} Validation result
   */
  async validateItemColor(itemId, color) {
    try {
      logger.debug('Validating color for item:', { itemId, color });

      const result = await this.itemRepository.validateColor(itemId, color);
      
      logger.debug('Color validation result:', result);
      return result;
    } catch (error) {
      logger.error('Error validating item color:', error);
      throw error;
    }
  }

  /**
   * Get price information for item
   * @param {string} itemId - Item ID
   * @returns {Promise<Object|null>} Price information or null
   */
  async getItemPriceInfo(itemId) {
    try {
      logger.debug('Getting price info for item:', itemId);

      const priceInfo = await this.itemRepository.getPriceInfo(itemId);
      
      if (priceInfo) {
        logger.debug('Price info retrieved:', priceInfo);
      } else {
        logger.warn('Item not found for price info:', itemId);
      }

      return priceInfo;
    } catch (error) {
      logger.error('Error getting item price info:', error);
      throw error;
    }
  }

  /**
   * Get all unique colors
   * @returns {Promise<Array>} Array of unique colors with item counts
   */
  async getAllColors() {
    try {
      logger.debug('Getting all unique colors');

      const colors = await this.itemRepository.getAllColors();
      
      logger.info(`Retrieved ${colors.length} unique colors`);
      return colors;
    } catch (error) {
      logger.error('Error getting all colors:', error);
      throw error;
    }
  }

  /**
   * Get item statistics
   * @returns {Promise<Object>} Item statistics
   */
  async getItemStatistics() {
    try {
      logger.debug('Getting item statistics');

      const stats = await this.itemRepository.getStatistics();
      
      logger.info('Item statistics retrieved');
      return stats;
    } catch (error) {
      logger.error('Error getting item statistics:', error);
      throw error;
    }
  }

  /**
   * Get items needing restock
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Items needing restock
   */
  async getItemsNeedingRestock(options = {}) {
    try {
      logger.debug('Getting items needing restock');

      const result = await this.itemRepository.findNeedingRestock(options);
      const transformedResult = this.transformResult(result);
      
      logger.info(`Found ${transformedResult.data.length} items needing restock`);
      return transformedResult;
    } catch (error) {
      logger.error('Error getting items needing restock:', error);
      throw error;
    }
  }

  /**
   * Build filter criteria from filters object
   * @param {Object} filters - Filter options
   * @returns {Object} MongoDB criteria
   */
  buildFilterCriteria(filters) {
    const criteria = {};

    if (filters.categoryId) {
      criteria.categoryId = filters.categoryId;
    }

    if (filters.isAvailable !== undefined) {
      criteria.isAvailable = filters.isAvailable;
    }

    if (filters.pricingType) {
      criteria.pricingType = filters.pricingType;
    }

    if (filters.color) {
      criteria.availableColors = { $in: [new RegExp(filters.color, 'i')] };
    }

    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
      const priceQuery = [];
      
      if (filters.minPrice !== undefined && filters.maxPrice !== undefined) {
        // Both min and max specified
        priceQuery.push(
          {
            pricingType: 'fixed',
            'price.fixed': { $gte: filters.minPrice, $lte: filters.maxPrice }
          },
          {
            pricingType: 'range',
            'price.min': { $lte: filters.maxPrice },
            'price.max': { $gte: filters.minPrice }
          }
        );
      } else if (filters.minPrice !== undefined) {
        // Only min price specified
        priceQuery.push(
          {
            pricingType: 'fixed',
            'price.fixed': { $gte: filters.minPrice }
          },
          {
            pricingType: 'range',
            'price.max': { $gte: filters.minPrice }
          }
        );
      } else {
        // Only max price specified
        priceQuery.push(
          {
            pricingType: 'fixed',
            'price.fixed': { $lte: filters.maxPrice }
          },
          {
            pricingType: 'range',
            'price.min': { $lte: filters.maxPrice }
          }
        );
      }

      if (priceQuery.length > 0) {
        criteria.$or = priceQuery;
      }
    }

    return criteria;
  }

  /**
   * Validate category exists
   * @param {string} categoryId - Category ID
   * @throws {Error} If category doesn't exist
   */
  async validateCategory(categoryId) {
    const category = await this.categoryRepository.findById(categoryId);
    if (!category) {
      const error = new Error('Category not found');
      error.code = 'CATEGORY_NOT_FOUND';
      error.categoryId = categoryId;
      throw error;
    }
  }

  /**
   * Validate pricing data
   * @param {Object} itemData - Item data with pricing
   * @throws {Error} If pricing data is invalid
   */
  validatePricingData(itemData) {
    const { pricingType, price } = itemData;

    if (!pricingType) {
      return; // Skip validation if no pricing type provided (for updates)
    }

    if (!['fixed', 'range', 'custom'].includes(pricingType)) {
      const error = new Error('Invalid pricing type');
      error.code = 'INVALID_PRICING_TYPE';
      error.validTypes = ['fixed', 'range', 'custom'];
      throw error;
    }

    if (!price) {
      return; // Skip validation if no price provided (for updates)
    }

    switch (pricingType) {
      case 'fixed':
        if (!price.fixed || price.fixed <= 0) {
          const error = new Error('Fixed price must be a positive number');
          error.code = 'INVALID_FIXED_PRICE';
          throw error;
        }
        break;

      case 'range':
        if (!price.min || !price.max || price.min < 0 || price.max <= 0 || price.min >= price.max) {
          const error = new Error('Price range must have valid min and max values with min < max');
          error.code = 'INVALID_PRICE_RANGE';
          throw error;
        }
        break;

      case 'custom':
        // Custom pricing doesn't require specific price values
        break;
    }
  }

  /**
   * Validate pricing type
   * @param {string} pricingType - Pricing type
   * @throws {Error} If pricing type is invalid
   */
  validatePricingType(pricingType) {
    if (!['fixed', 'range', 'custom'].includes(pricingType)) {
      const error = new Error('Invalid pricing type');
      error.code = 'INVALID_PRICING_TYPE';
      error.validTypes = ['fixed', 'range', 'custom'];
      throw error;
    }
  }

  /**
   * Validate price range
   * @param {number} minPrice - Minimum price
   * @param {number} maxPrice - Maximum price
   * @throws {Error} If price range is invalid
   */
  validatePriceRange(minPrice, maxPrice) {
    if (minPrice < 0 || maxPrice < 0) {
      const error = new Error('Prices cannot be negative');
      error.code = 'NEGATIVE_PRICE';
      throw error;
    }

    if (minPrice >= maxPrice) {
      const error = new Error('Minimum price must be less than maximum price');
      error.code = 'INVALID_PRICE_RANGE';
      throw error;
    }
  }

  /**
   * Validate colors array
   * @param {Array} colors - Array of color names
   * @throws {Error} If colors are invalid
   */
  validateColors(colors) {
    if (!colors) {
      return; // Colors are optional
    }

    if (!Array.isArray(colors)) {
      const error = new Error('Colors must be an array');
      error.code = 'INVALID_COLORS_FORMAT';
      throw error;
    }

    if (colors.length > 20) {
      const error = new Error('Too many colors (maximum 20 allowed)');
      error.code = 'TOO_MANY_COLORS';
      throw error;
    }

    for (const color of colors) {
      if (!color || typeof color !== 'string' || color.trim().length < 2) {
        const error = new Error('Each color must be a string with at least 2 characters');
        error.code = 'INVALID_COLOR_NAME';
        throw error;
      }
    }

    // Check for duplicates (case-insensitive)
    const uniqueColors = new Set(colors.map(color => color.toLowerCase()));
    if (uniqueColors.size !== colors.length) {
      const error = new Error('Duplicate colors are not allowed');
      error.code = 'DUPLICATE_COLORS';
      throw error;
    }
  }

  /**
   * Transform repository result to expected service format
   * @param {Object} result - Repository result
   * @returns {Object} Transformed result
   */
  transformResult(result) {
    if (!result) {
      return {
        data: [],
        pagination: {
          currentPage: 1,
          totalPages: 0,
          totalCount: 0,
          limit: 10,
          hasNextPage: false,
          hasPrevPage: false
        }
      };
    }

    return {
      data: result.documents || [],
      pagination: {
        currentPage: result.pagination?.currentPage || 1,
        totalPages: result.pagination?.totalPages || 0,
        totalCount: result.pagination?.totalDocuments || 0,
        limit: result.pagination?.limit || 10,
        hasNextPage: result.pagination?.hasNextPage || false,
        hasPrevPage: result.pagination?.hasPrevPage || false
      }
    };
  }
}

module.exports = ItemService;