const { CategoryRepository } = require('../repositories');
const logger = require('../config/logger');

/**
 * Service for Category business logic
 */
class CategoryService {
  constructor() {
    this.categoryRepository = new CategoryRepository();
  }

  /**
   * Get all categories with item counts
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Categories with pagination and item counts
   */
  async getAllCategories(options = {}) {
    try {
      logger.debug('Getting all categories with item counts');

      const result = await this.categoryRepository.findAllWithItemCounts(options);
      
      logger.info(`Retrieved ${result.data.length} categories`);
      return result;
    } catch (error) {
      logger.error('Error getting all categories:', error);
      throw error;
    }
  }

  /**
   * Get category by ID
   * @param {string} categoryId - Category ID
   * @returns {Promise<Object|null>} Category or null
   */
  async getCategoryById(categoryId) {
    try {
      logger.debug('Getting category by ID:', categoryId);

      const category = await this.categoryRepository.findById(categoryId);

      if (!category) {
        logger.warn('Category not found:', categoryId);
        return null;
      }

      logger.debug('Category retrieved successfully:', categoryId);
      return category;
    } catch (error) {
      logger.error('Error getting category by ID:', error);
      throw error;
    }
  }

  /**
   * Create new category
   * @param {Object} categoryData - Category data
   * @returns {Promise<Object>} Created category
   */
  async createCategory(categoryData) {
    try {
      logger.debug('Creating category:', categoryData.name);

      // Validate category data
      this.validateCategoryData(categoryData);

      // Check if category name already exists
      const existingCategory = await this.categoryRepository.findByName(categoryData.name);
      if (existingCategory) {
        const error = new Error('Category name already exists');
        error.code = 'CATEGORY_NAME_EXISTS';
        error.existingCategory = existingCategory.name;
        throw error;
      }

      const category = await this.categoryRepository.create(categoryData);
      
      logger.info('Category created successfully:', category._id);
      return category;
    } catch (error) {
      logger.error('Error creating category:', error);
      throw error;
    }
  }

  /**
   * Update category
   * @param {string} categoryId - Category ID
   * @param {Object} updateData - Update data
   * @returns {Promise<Object|null>} Updated category or null
   */
  async updateCategory(categoryId, updateData) {
    try {
      logger.debug('Updating category:', categoryId);

      // Validate update data
      this.validateCategoryData(updateData, true);

      const updatedCategory = await this.categoryRepository.updateWithValidation(categoryId, updateData);

      if (updatedCategory) {
        logger.info('Category updated successfully:', categoryId);
      } else {
        logger.warn('Category not found for update:', categoryId);
      }

      return updatedCategory;
    } catch (error) {
      logger.error('Error updating category:', error);
      throw error;
    }
  }

  /**
   * Delete category with safety checks
   * @param {string} categoryId - Category ID
   * @param {Object} options - Deletion options
   * @returns {Promise<Object>} Deletion result
   */
  async deleteCategory(categoryId, options = {}) {
    try {
      logger.debug('Deleting category:', categoryId);

      const result = await this.categoryRepository.safeDelete(categoryId, options);
      
      if (result.success) {
        logger.info('Category deleted successfully:', categoryId);
      } else {
        logger.warn('Category deletion failed:', result.message);
      }

      return result;
    } catch (error) {
      logger.error('Error deleting category:', error);
      throw error;
    }
  }

  /**
   * Check if category can be deleted
   * @param {string} categoryId - Category ID
   * @returns {Promise<Object>} Deletion check result
   */
  async canDeleteCategory(categoryId) {
    try {
      logger.debug('Checking if category can be deleted:', categoryId);

      const result = await this.categoryRepository.canDelete(categoryId);
      
      logger.debug('Category deletion check result:', result);
      return result;
    } catch (error) {
      logger.error('Error checking category deletion:', error);
      throw error;
    }
  }

  /**
   * Search categories
   * @param {string} searchTerm - Search term
   * @param {Object} options - Search options
   * @returns {Promise<Object>} Search results
   */
  async searchCategories(searchTerm, options = {}) {
    try {
      logger.debug('Searching categories:', searchTerm);

      const result = await this.categoryRepository.search(searchTerm, options);
      
      logger.info(`Found ${result.data.length} categories matching search term`);
      return result;
    } catch (error) {
      logger.error('Error searching categories:', error);
      throw error;
    }
  }

  /**
   * Get category statistics
   * @returns {Promise<Object>} Category statistics
   */
  async getCategoryStatistics() {
    try {
      logger.debug('Getting category statistics');

      const stats = await this.categoryRepository.getStatistics();
      
      logger.info('Category statistics retrieved');
      return stats;
    } catch (error) {
      logger.error('Error getting category statistics:', error);
      throw error;
    }
  }

  /**
   * Get top categories by item count
   * @param {number} limit - Number of categories to return
   * @returns {Promise<Array>} Top categories
   */
  async getTopCategoriesByItemCount(limit = 5) {
    try {
      logger.debug('Getting top categories by item count:', limit);

      const categories = await this.categoryRepository.findTopByItemCount(limit);
      
      logger.info(`Retrieved ${categories.length} top categories`);
      return categories;
    } catch (error) {
      logger.error('Error getting top categories:', error);
      throw error;
    }
  }

  /**
   * Get category by name
   * @param {string} name - Category name
   * @returns {Promise<Object|null>} Category or null
   */
  async getCategoryByName(name) {
    try {
      logger.debug('Getting category by name:', name);

      const category = await this.categoryRepository.findByName(name);

      if (category) {
        logger.debug('Category found by name:', name);
      } else {
        logger.debug('Category not found by name:', name);
      }

      return category;
    } catch (error) {
      logger.error('Error getting category by name:', error);
      throw error;
    }
  }

  /**
   * Bulk create categories
   * @param {Array} categoriesData - Array of category data
   * @returns {Promise<Object>} Bulk creation result
   */
  async bulkCreateCategories(categoriesData) {
    try {
      logger.debug('Bulk creating categories:', categoriesData.length);

      const results = {
        created: [],
        failed: [],
        duplicates: []
      };

      for (const categoryData of categoriesData) {
        try {
          // Validate category data
          this.validateCategoryData(categoryData);

          // Check for duplicates
          const existingCategory = await this.categoryRepository.findByName(categoryData.name);
          if (existingCategory) {
            results.duplicates.push({
              name: categoryData.name,
              reason: 'Category name already exists'
            });
            continue;
          }

          const category = await this.categoryRepository.create(categoryData);
          results.created.push(category);
          
        } catch (error) {
          results.failed.push({
            categoryData,
            error: error.message
          });
        }
      }

      logger.info('Bulk category creation completed:', {
        created: results.created.length,
        failed: results.failed.length,
        duplicates: results.duplicates.length
      });

      return results;
    } catch (error) {
      logger.error('Error in bulk category creation:', error);
      throw error;
    }
  }

  /**
   * Get categories with no items
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Empty categories
   */
  async getEmptyCategories(options = {}) {
    try {
      logger.debug('Getting empty categories');

      // Use the findAllWithItemCounts method and filter for zero items
      const allCategories = await this.categoryRepository.findAllWithItemCounts(options);
      
      const emptyCategories = {
        ...allCategories,
        data: allCategories.data.filter(category => category.itemCount === 0)
      };

      // Update pagination info
      emptyCategories.pagination.totalCount = emptyCategories.data.length;
      emptyCategories.pagination.totalPages = Math.ceil(emptyCategories.data.length / options.limit || 10);

      logger.info(`Found ${emptyCategories.data.length} empty categories`);
      return emptyCategories;
    } catch (error) {
      logger.error('Error getting empty categories:', error);
      throw error;
    }
  }

  /**
   * Validate category data
   * @param {Object} categoryData - Category data
   * @param {boolean} isUpdate - Whether this is an update operation
   * @throws {Error} If category data is invalid
   */
  validateCategoryData(categoryData, isUpdate = false) {
    if (!isUpdate && (!categoryData.name || categoryData.name.trim().length < 2)) {
      const error = new Error('Category name is required and must be at least 2 characters');
      error.code = 'INVALID_CATEGORY_NAME';
      throw error;
    }

    if (categoryData.name && categoryData.name.trim().length < 2) {
      const error = new Error('Category name must be at least 2 characters');
      error.code = 'INVALID_CATEGORY_NAME';
      throw error;
    }

    if (categoryData.name && categoryData.name.length > 100) {
      const error = new Error('Category name cannot exceed 100 characters');
      error.code = 'CATEGORY_NAME_TOO_LONG';
      throw error;
    }

    if (categoryData.description && categoryData.description.length > 500) {
      const error = new Error('Category description cannot exceed 500 characters');
      error.code = 'CATEGORY_DESCRIPTION_TOO_LONG';
      throw error;
    }

    // Check for invalid characters in name
    if (categoryData.name && !/^[a-zA-Z0-9\s\-_&]+$/.test(categoryData.name)) {
      const error = new Error('Category name contains invalid characters');
      error.code = 'INVALID_CATEGORY_NAME_CHARACTERS';
      throw error;
    }
  }

  /**
   * Format category for response
   * @param {Object} category - Category object
   * @returns {Object} Formatted category
   */
  formatCategoryResponse(category) {
    if (!category) return null;

    return {
      id: category._id,
      name: category.name,
      description: category.description,
      itemCount: category.itemCount || 0,
      availableItemCount: category.availableItemCount || 0,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt
    };
  }

  /**
   * Format categories list for response
   * @param {Object} result - Repository result with data and pagination
   * @returns {Object} Formatted result
   */
  formatCategoriesResponse(result) {
    return {
      ...result,
      data: result.data.map(category => this.formatCategoryResponse(category))
    };
  }
}

module.exports = CategoryService;