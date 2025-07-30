const BaseRepository = require('./BaseRepository');
const { Category, Item } = require('../models');
const logger = require('../config/logger');

/**
 * Repository for Category operations
 */
class CategoryRepository extends BaseRepository {
  constructor() {
    super(Category);
  }

  /**
   * Find all categories with item counts
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Categories with pagination and item counts
   */
  async findAllWithItemCounts(options = {}) {
    try {
      logger.debug('Finding categories with item counts');
      
      const {
        page = 1,
        limit = 10,
        sort = { name: 1 },
        search
      } = options;

      // Build match criteria
      let matchCriteria = {};
      if (search) {
        matchCriteria = {
          $or: [
            { name: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } }
          ]
        };
      }

      // Aggregation pipeline to get categories with item counts
      const pipeline = [
        { $match: matchCriteria },
        {
          $lookup: {
            from: 'items',
            localField: '_id',
            foreignField: 'categoryId',
            as: 'items'
          }
        },
        {
          $addFields: {
            itemCount: { $size: '$items' },
            availableItemCount: {
              $size: {
                $filter: {
                  input: '$items',
                  cond: { $eq: ['$$this.isAvailable', true] }
                }
              }
            }
          }
        },
        {
          $project: {
            items: 0 // Remove the items array, keep only counts
          }
        },
        { $sort: sort }
      ];

      // Get total count
      const countPipeline = [
        { $match: matchCriteria },
        { $count: 'total' }
      ];

      const [countResult] = await this.aggregate(countPipeline);
      const totalCount = countResult ? countResult.total : 0;

      // Add pagination to main pipeline
      const skip = (page - 1) * limit;
      pipeline.push({ $skip: skip }, { $limit: limit });

      // Execute aggregation
      const categories = await this.aggregate(pipeline);

      const totalPages = Math.ceil(totalCount / limit);

      return {
        data: categories,
        pagination: {
          currentPage: page,
          totalPages,
          totalCount,
          limit,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      };
    } catch (error) {
      logger.error('Error finding categories with item counts:', error);
      this.handleError(error);
    }
  }

  /**
   * Find category by name
   * @param {string} name - Category name
   * @returns {Promise<Object|null>} Found category or null
   */
  async findByName(name) {
    try {
      logger.debug('Finding category by name:', name);
      return await this.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
    } catch (error) {
      logger.error('Error finding category by name:', error);
      this.handleError(error);
    }
  }

  /**
   * Check if category can be deleted (has no associated items)
   * @param {string} categoryId - Category ID
   * @returns {Promise<Object>} Deletion check result
   */
  async canDelete(categoryId) {
    try {
      logger.debug('Checking if category can be deleted:', categoryId);
      
      const itemCount = await Item.countDocuments({ categoryId });
      
      return {
        canDelete: itemCount === 0,
        itemCount,
        message: itemCount > 0 
          ? `Cannot delete category. It has ${itemCount} associated item(s).`
          : 'Category can be safely deleted.'
      };
    } catch (error) {
      logger.error('Error checking category deletion:', error);
      this.handleError(error);
    }
  }

  /**
   * Delete category with validation
   * @param {string} categoryId - Category ID
   * @param {Object} options - Deletion options
   * @returns {Promise<Object>} Deletion result
   */
  async safeDelete(categoryId, options = {}) {
    try {
      logger.debug('Attempting safe category deletion:', categoryId);
      
      // Check if category can be deleted
      const deleteCheck = await this.canDelete(categoryId);
      
      if (!deleteCheck.canDelete && !options.force) {
        const error = new Error(deleteCheck.message);
        error.code = 'CATEGORY_HAS_ITEMS';
        error.itemCount = deleteCheck.itemCount;
        throw error;
      }

      // If forced deletion, optionally handle associated items
      if (options.force && deleteCheck.itemCount > 0) {
        if (options.moveItemsToCategory) {
          // Move items to another category
          await Item.updateMany(
            { categoryId },
            { categoryId: options.moveItemsToCategory }
          );
          logger.info(`Moved ${deleteCheck.itemCount} items to category ${options.moveItemsToCategory}`);
        } else if (options.deleteItems) {
          // Delete associated items
          await Item.deleteMany({ categoryId });
          logger.info(`Deleted ${deleteCheck.itemCount} associated items`);
        }
      }

      // Delete the category
      const deletedCategory = await this.deleteById(categoryId);
      
      if (deletedCategory) {
        logger.info('Category deleted successfully:', categoryId);
      }

      return {
        success: !!deletedCategory,
        category: deletedCategory,
        itemsAffected: deleteCheck.itemCount,
        message: deletedCategory 
          ? 'Category deleted successfully'
          : 'Category not found'
      };
    } catch (error) {
      logger.error('Error in safe category deletion:', error);
      this.handleError(error);
    }
  }

  /**
   * Get category statistics
   * @returns {Promise<Object>} Category statistics
   */
  async getStatistics() {
    try {
      logger.debug('Getting category statistics');
      
      const pipeline = [
        {
          $lookup: {
            from: 'items',
            localField: '_id',
            foreignField: 'categoryId',
            as: 'items'
          }
        },
        {
          $group: {
            _id: null,
            totalCategories: { $sum: 1 },
            categoriesWithItems: {
              $sum: {
                $cond: [{ $gt: [{ $size: '$items' }, 0] }, 1, 0]
              }
            },
            categoriesWithoutItems: {
              $sum: {
                $cond: [{ $eq: [{ $size: '$items' }, 0] }, 1, 0]
              }
            },
            totalItems: { $sum: { $size: '$items' } },
            avgItemsPerCategory: { $avg: { $size: '$items' } }
          }
        }
      ];

      const [stats] = await this.aggregate(pipeline);
      
      return stats || {
        totalCategories: 0,
        categoriesWithItems: 0,
        categoriesWithoutItems: 0,
        totalItems: 0,
        avgItemsPerCategory: 0
      };
    } catch (error) {
      logger.error('Error getting category statistics:', error);
      this.handleError(error);
    }
  }

  /**
   * Find categories with most items
   * @param {number} limit - Number of categories to return
   * @returns {Promise<Array>} Top categories by item count
   */
  async findTopByItemCount(limit = 5) {
    try {
      logger.debug('Finding top categories by item count');
      
      const pipeline = [
        {
          $lookup: {
            from: 'items',
            localField: '_id',
            foreignField: 'categoryId',
            as: 'items'
          }
        },
        {
          $addFields: {
            itemCount: { $size: '$items' },
            availableItemCount: {
              $size: {
                $filter: {
                  input: '$items',
                  cond: { $eq: ['$$this.isAvailable', true] }
                }
              }
            }
          }
        },
        {
          $project: {
            items: 0
          }
        },
        { $sort: { itemCount: -1 } },
        { $limit: limit }
      ];

      return await this.aggregate(pipeline);
    } catch (error) {
      logger.error('Error finding top categories by item count:', error);
      this.handleError(error);
    }
  }

  /**
   * Search categories by name or description
   * @param {string} searchTerm - Search term
   * @param {Object} options - Search options
   * @returns {Promise<Object>} Search results with pagination
   */
  async search(searchTerm, options = {}) {
    try {
      logger.debug('Searching categories:', searchTerm);
      
      if (!searchTerm || searchTerm.trim().length === 0) {
        return this.find({}, options);
      }

      const searchRegex = new RegExp(searchTerm.trim(), 'i');
      const criteria = {
        $or: [
          { name: searchRegex },
          { description: searchRegex }
        ]
      };

      return await this.find(criteria, options);
    } catch (error) {
      logger.error('Error searching categories:', error);
      this.handleError(error);
    }
  }

  /**
   * Update category with name uniqueness check
   * @param {string} categoryId - Category ID
   * @param {Object} updateData - Update data
   * @returns {Promise<Object|null>} Updated category or null
   */
  async updateWithValidation(categoryId, updateData) {
    try {
      logger.debug('Updating category with validation:', { categoryId, updateData });
      
      // If name is being updated, check for uniqueness
      if (updateData.name) {
        const existingCategory = await this.findByName(updateData.name);
        if (existingCategory && existingCategory._id.toString() !== categoryId) {
          const error = new Error('Category name already exists');
          error.code = 'DUPLICATE_CATEGORY_NAME';
          error.field = 'name';
          throw error;
        }
      }

      return await this.updateById(categoryId, updateData);
    } catch (error) {
      logger.error('Error updating category with validation:', error);
      this.handleError(error);
    }
  }
}

module.exports = CategoryRepository;