const BaseRepository = require('./BaseRepository');
const { Item, Category } = require('../models');
const DatabaseUtils = require('../utils/database');
const logger = require('../config/logger');

/**
 * Repository for Item operations
 */
class ItemRepository extends BaseRepository {
  constructor() {
    super(Item);
  }

  /**
   * Find all items with category information
   * @param {Object} criteria - Search criteria
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Items with pagination and category info
   */
  async findWithCategory(criteria = {}, options = {}) {
    try {
      logger.debug('Finding items with category:', { criteria, options });
      
      const populateOptions = {
        path: 'categoryId',
        select: 'name description'
      };

      const queryOptions = {
        ...options,
        populate: populateOptions
      };

      return await this.find(criteria, queryOptions);
    } catch (error) {
      logger.error('Error finding items with category:', error);
      throw this._handleError(error);
    }
  }

  /**
   * Find items by category
   * @param {string} categoryId - Category ID
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Items in category with pagination
   */
  async findByCategory(categoryId, options = {}) {
    try {
      logger.debug('Finding items by category:', categoryId);
      
      if (!DatabaseUtils.isValidObjectId(categoryId)) {
        return {
          data: [],
          pagination: {
            currentPage: 1,
            totalPages: 0,
            totalCount: 0,
            limit: options.limit || 10,
            hasNextPage: false,
            hasPrevPage: false
          }
        };
      }

      const criteria = { categoryId };
      return await this.findWithCategory(criteria, options);
    } catch (error) {
      logger.error('Error finding items by category:', error);
      throw this._handleError(error);
    }
  }

  /**
   * Find available items only
   * @param {Object} additionalCriteria - Additional search criteria
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Available items with pagination
   */
  async findAvailable(additionalCriteria = {}, options = {}) {
    try {
      logger.debug('Finding available items');
      
      const criteria = {
        isAvailable: true,
        ...additionalCriteria
      };

      return await this.findWithCategory(criteria, options);
    } catch (error) {
      logger.error('Error finding available items:', error);
      throw this._handleError(error);
    }
  }

  /**
   * Find items by pricing type
   * @param {string} pricingType - Pricing type (fixed, range, custom)
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Items with specified pricing type
   */
  async findByPricingType(pricingType, options = {}) {
    try {
      logger.debug('Finding items by pricing type:', pricingType);
      
      const criteria = { pricingType };
      return await this.findWithCategory(criteria, options);
    } catch (error) {
      logger.error('Error finding items by pricing type:', error);
      throw this._handleError(error);
    }
  }

  /**
   * Search items by name, description, or category
   * @param {string} searchTerm - Search term
   * @param {Object} options - Search options
   * @param {boolean} availableOnly - Whether to return only available items (default: false)
   * @returns {Promise<Object>} Search results with pagination
   */
  async search(searchTerm, options = {}, availableOnly = false) {
    try {
      logger.debug('Searching items:', searchTerm);
      
      if (!searchTerm || searchTerm.trim().length === 0) {
        const baseCriteria = availableOnly ? { isAvailable: true } : {};
        return await this.findWithCategory(baseCriteria, options);
      }

      const searchRegex = new RegExp(searchTerm.trim(), 'i');
      
      // First, find matching categories
      const matchingCategories = await Category.find({
        $or: [
          { name: searchRegex },
          { description: searchRegex }
        ]
      }).select('_id');

      const categoryIds = matchingCategories.map(cat => cat._id);

      // Build search criteria
      const criteria = {
        $or: [
          { name: searchRegex },
          { description: searchRegex },
          { availableColors: { $in: [searchRegex] } },
          ...(categoryIds.length > 0 ? [{ categoryId: { $in: categoryIds } }] : [])
        ]
      };

      // Add availability filter if requested
      if (availableOnly) {
        criteria.isAvailable = true;
      }

      return await this.findWithCategory(criteria, options);
    } catch (error) {
      logger.error('Error searching items:', error);
      throw this._handleError(error);
    }
  }

  /**
   * Find items within price range
   * @param {number} minPrice - Minimum price
   * @param {number} maxPrice - Maximum price
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Items within price range
   */
  async findByPriceRange(minPrice, maxPrice, options = {}) {
    try {
      logger.debug('Finding items by price range:', { minPrice, maxPrice });
      
      const criteria = {
        $or: [
          // Fixed pricing within range
          {
            pricingType: 'fixed',
            'price.fixed': { $gte: minPrice, $lte: maxPrice }
          },
          // Range pricing that overlaps with search range
          {
            pricingType: 'range',
            'price.min': { $lte: maxPrice },
            'price.max': { $gte: minPrice }
          }
          // Custom pricing is excluded as it has no predetermined price
        ]
      };

      return await this.findWithCategory(criteria, options);
    } catch (error) {
      logger.error('Error finding items by price range:', error);
      throw this._handleError(error);
    }
  }

  /**
   * Find items by available color
   * @param {string} color - Color name
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Items with specified color
   */
  async findByColor(color, options = {}) {
    try {
      logger.debug('Finding items by color:', color);
      
      const criteria = {
        availableColors: { $in: [new RegExp(color, 'i')] }
      };

      return await this.findWithCategory(criteria, options);
    } catch (error) {
      logger.error('Error finding items by color:', error);
      throw this._handleError(error);
    }
  }

  /**
   * Get item statistics
   * @returns {Promise<Object>} Item statistics
   */
  async getStatistics() {
    try {
      logger.debug('Getting item statistics');
      
      const pipeline = [
        {
          $group: {
            _id: null,
            totalItems: { $sum: 1 },
            availableItems: {
              $sum: { $cond: ['$isAvailable', 1, 0] }
            },
            unavailableItems: {
              $sum: { $cond: ['$isAvailable', 0, 1] }
            },
            fixedPriceItems: {
              $sum: { $cond: [{ $eq: ['$pricingType', 'fixed'] }, 1, 0] }
            },
            rangePriceItems: {
              $sum: { $cond: [{ $eq: ['$pricingType', 'range'] }, 1, 0] }
            },
            customPriceItems: {
              $sum: { $cond: [{ $eq: ['$pricingType', 'custom'] }, 1, 0] }
            },
            avgFixedPrice: {
              $avg: {
                $cond: [
                  { $eq: ['$pricingType', 'fixed'] },
                  '$price.fixed',
                  null
                ]
              }
            },
            minFixedPrice: {
              $min: {
                $cond: [
                  { $eq: ['$pricingType', 'fixed'] },
                  '$price.fixed',
                  null
                ]
              }
            },
            maxFixedPrice: {
              $max: {
                $cond: [
                  { $eq: ['$pricingType', 'fixed'] },
                  '$price.fixed',
                  null
                ]
              }
            },
            totalColors: {
              $sum: { $size: { $ifNull: ['$availableColors', []] } }
            },
            avgColorsPerItem: {
              $avg: { $size: { $ifNull: ['$availableColors', []] } }
            }
          }
        }
      ];

      const [stats] = await this.aggregate(pipeline);
      
      return stats || {
        totalItems: 0,
        availableItems: 0,
        unavailableItems: 0,
        fixedPriceItems: 0,
        rangePriceItems: 0,
        customPriceItems: 0,
        avgFixedPrice: 0,
        minFixedPrice: 0,
        maxFixedPrice: 0,
        totalColors: 0,
        avgColorsPerItem: 0
      };
    } catch (error) {
      logger.error('Error getting item statistics:', error);
      throw this._handleError(error);
    }
  }

  /**
   * Get all unique colors from items
   * @returns {Promise<Array>} Array of unique colors
   */
  async getAllColors() {
    try {
      logger.debug('Getting all unique colors');
      
      const pipeline = [
        { $match: { isAvailable: true } }, // Only include available items
        { $unwind: '$availableColors' },
        {
          $group: {
            _id: { $toLower: '$availableColors' },
            originalName: { $first: '$availableColors' },
            itemCount: { $sum: 1 }
          }
        },
        { $sort: { itemCount: -1, originalName: 1 } },
        {
          $project: {
            _id: 0,
            color: '$originalName',
            itemCount: 1
          }
        }
      ];

      return await this.aggregate(pipeline);
    } catch (error) {
      logger.error('Error getting all colors:', error);
      throw this._handleError(error);
    }
  }

  /**
   * Validate color availability for item
   * @param {string} itemId - Item ID
   * @param {string} color - Color to validate
   * @returns {Promise<Object>} Validation result
   */
  async validateColor(itemId, color) {
    try {
      logger.debug('Validating color for item:', { itemId, color });
      
      const item = await this.findById(itemId);
      if (!item) {
        return {
          isValid: false,
          message: 'Item not found'
        };
      }

      if (!item.availableColors || item.availableColors.length === 0) {
        return {
          isValid: true,
          message: 'No color restrictions for this item'
        };
      }

      const colorMatch = item.availableColors.some(
        availableColor => availableColor.toLowerCase() === color.toLowerCase()
      );

      return {
        isValid: colorMatch,
        message: colorMatch 
          ? 'Color is available for this item'
          : `Color '${color}' is not available for this item. Available colors: ${item.availableColors.join(', ')}`,
        availableColors: item.availableColors
      };
    } catch (error) {
      logger.error('Error validating color:', error);
      this._handleError(error);
    }
  }

  /**
   * Get price information for item
   * @param {string} itemId - Item ID
   * @returns {Promise<Object>} Price information
   */
  async getPriceInfo(itemId) {
    try {
      logger.debug('Getting price info for item:', itemId);
      
      const item = await this.findById(itemId);
      if (!item) {
        return null;
      }

      const priceInfo = {
        itemId: item._id,
        pricingType: item.pricingType,
        priceDisplay: item.priceDisplay
      };

      switch (item.pricingType) {
        case 'fixed':
          priceInfo.price = item.price.fixed;
          priceInfo.canCalculateTotal = true;
          break;
        case 'range':
          priceInfo.minPrice = item.price.min;
          priceInfo.maxPrice = item.price.max;
          priceInfo.canCalculateTotal = false;
          priceInfo.estimatedPrice = (item.price.min + item.price.max) / 2;
          break;
        case 'custom':
          priceInfo.canCalculateTotal = false;
          priceInfo.requiresQuote = true;
          break;
      }

      return priceInfo;
    } catch (error) {
      logger.error('Error getting price info:', error);
      this._handleError(error);
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
      
      return await this.updateById(itemId, { isAvailable });
    } catch (error) {
      logger.error('Error updating item availability:', error);
      this._handleError(error);
    }
  }

  /**
   * Find items that need restocking (unavailable items)
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Items needing restock
   */
  async findNeedingRestock(options = {}) {
    try {
      logger.debug('Finding items needing restock');
      
      const criteria = { isAvailable: false };
      return await this.findWithCategory(criteria, options);
    } catch (error) {
      logger.error('Error finding items needing restock:', error);
      this._handleError(error);
    }
  }

  /**
   * Get items by category with statistics
   * @param {string} categoryId - Category ID
   * @returns {Promise<Object>} Category items with statistics
   */
  async getCategoryItemsWithStats(categoryId) {
    try {
      logger.debug('Getting category items with stats:', categoryId);
      
      if (!DatabaseUtils.isValidObjectId(categoryId)) {
        return null;
      }

      const pipeline = [
        { $match: { categoryId: DatabaseUtils.toObjectId(categoryId) } },
        {
          $group: {
            _id: '$categoryId',
            totalItems: { $sum: 1 },
            availableItems: {
              $sum: { $cond: ['$isAvailable', 1, 0] }
            },
            fixedPriceItems: {
              $sum: { $cond: [{ $eq: ['$pricingType', 'fixed'] }, 1, 0] }
            },
            rangePriceItems: {
              $sum: { $cond: [{ $eq: ['$pricingType', 'range'] }, 1, 0] }
            },
            customPriceItems: {
              $sum: { $cond: [{ $eq: ['$pricingType', 'custom'] }, 1, 0] }
            },
            items: { $push: '$$ROOT' }
          }
        },
        {
          $lookup: {
            from: 'categories',
            localField: '_id',
            foreignField: '_id',
            as: 'category'
          }
        },
        {
          $project: {
            category: { $arrayElemAt: ['$category', 0] },
            statistics: {
              totalItems: '$totalItems',
              availableItems: '$availableItems',
              fixedPriceItems: '$fixedPriceItems',
              rangePriceItems: '$rangePriceItems',
              customPriceItems: '$customPriceItems'
            },
            items: 1
          }
        }
      ];

      const [result] = await this.aggregate(pipeline);
      return result || null;
    } catch (error) {
      logger.error('Error getting category items with stats:', error);
      this._handleError(error);
    }
  }
}

module.exports = ItemRepository;