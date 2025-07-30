const mongoose = require('mongoose');

/**
 * Database utility functions
 */
class DatabaseUtils {
  /**
   * Check if a string is a valid MongoDB ObjectId
   * @param {string} id - The ID to validate
   * @returns {boolean} - True if valid ObjectId
   */
  static isValidObjectId(id) {
    return mongoose.Types.ObjectId.isValid(id);
  }

  /**
   * Convert string to ObjectId
   * @param {string} id - The ID string to convert
   * @returns {mongoose.Types.ObjectId} - MongoDB ObjectId
   */
  static toObjectId(id) {
    if (!this.isValidObjectId(id)) {
      throw new Error(`Invalid ObjectId: ${id}`);
    }
    return new mongoose.Types.ObjectId(id);
  }

  /**
   * Create pagination options for MongoDB queries
   * @param {number} page - Page number (1-based)
   * @param {number} limit - Items per page
   * @returns {object} - Pagination options with skip and limit
   */
  static getPaginationOptions(page = 1, limit = 10) {
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.max(1, Math.min(100, parseInt(limit))); // Max 100 items per page
    
    return {
      skip: (pageNum - 1) * limitNum,
      limit: limitNum,
      page: pageNum,
    };
  }

  /**
   * Create sort options for MongoDB queries
   * @param {string} sortBy - Field to sort by
   * @param {string} sortOrder - Sort order ('asc' or 'desc')
   * @returns {object} - Sort options object
   */
  static getSortOptions(sortBy = 'createdAt', sortOrder = 'desc') {
    const order = sortOrder.toLowerCase() === 'asc' ? 1 : -1;
    return { [sortBy]: order };
  }

  /**
   * Build search query for text fields
   * @param {string} searchTerm - Search term
   * @param {string[]} fields - Fields to search in
   * @returns {object} - MongoDB query object
   */
  static buildSearchQuery(searchTerm, fields = []) {
    if (!searchTerm || !fields.length) {
      return {};
    }

    const regex = new RegExp(searchTerm, 'i'); // Case-insensitive search
    
    return {
      $or: fields.map(field => ({ [field]: regex }))
    };
  }

  /**
   * Build date range query
   * @param {Date|string} startDate - Start date
   * @param {Date|string} endDate - End date
   * @param {string} field - Date field name
   * @returns {object} - MongoDB query object
   */
  static buildDateRangeQuery(startDate, endDate, field = 'createdAt') {
    const query = {};
    
    if (startDate || endDate) {
      query[field] = {};
      
      if (startDate) {
        query[field].$gte = new Date(startDate);
      }
      
      if (endDate) {
        query[field].$lte = new Date(endDate);
      }
    }
    
    return query;
  }

  /**
   * Create aggregation pipeline for counting documents
   * @param {object} matchQuery - Match query for filtering
   * @returns {Array} - Aggregation pipeline
   */
  static createCountPipeline(matchQuery = {}) {
    return [
      { $match: matchQuery },
      { $count: 'total' }
    ];
  }

  /**
   * Handle MongoDB duplicate key error
   * @param {Error} error - MongoDB error
   * @returns {object} - Formatted error response
   */
  static handleDuplicateKeyError(error) {
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return {
        field,
        message: `${field} already exists`,
        code: 'DUPLICATE_KEY'
      };
    }
    return null;
  }

  /**
   * Handle MongoDB validation error
   * @param {Error} error - Mongoose validation error
   * @returns {object} - Formatted error response
   */
  static handleValidationError(error) {
    if (error.name === 'ValidationError') {
      const errors = {};
      
      for (const field in error.errors) {
        errors[field] = error.errors[field].message;
      }
      
      return {
        errors,
        message: 'Validation failed',
        code: 'VALIDATION_ERROR'
      };
    }
    return null;
  }
}

module.exports = DatabaseUtils;