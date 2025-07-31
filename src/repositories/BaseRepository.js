const logger = require('../config/logger');

class BaseRepository {
  constructor(model) {
    this.model = model;
  }

  /**
   * Create a new document
   * @param {Object} data - Document data
   * @returns {Promise<Object>} Created document
   */
  async create(data) {
    try {
      const document = new this.model(data);
      const savedDocument = await document.save();
      logger.info(`${this.model.modelName} created:`, { id: savedDocument._id });
      return savedDocument;
    } catch (error) {
      logger.error(`Error creating ${this.model.modelName}:`, error);
      throw this._handleError(error);
    }
  }

  /**
   * Find document by ID
   * @param {string} id - Document ID
   * @param {Object} options - Query options (populate, select, etc.)
   * @returns {Promise<Object|null>} Found document or null
   */
  async findById(id, options = {}) {
    try {
      let query = this.model.findById(id);
      
      if (options.populate) {
        query = query.populate(options.populate);
      }
      
      if (options.select) {
        query = query.select(options.select);
      }
      
      const document = await query.exec();
      return document;
    } catch (error) {
      logger.error(`Error finding ${this.model.modelName} by ID:`, error);
      throw this._handleError(error);
    }
  }

  /**
   * Find one document by criteria
   * @param {Object} criteria - Search criteria
   * @param {Object} options - Query options
   * @returns {Promise<Object|null>} Found document or null
   */
  async findOne(criteria, options = {}) {
    try {
      let query = this.model.findOne(criteria);
      
      if (options.populate) {
        query = query.populate(options.populate);
      }
      
      if (options.select) {
        query = query.select(options.select);
      }
      
      const document = await query.exec();
      return document;
    } catch (error) {
      logger.error(`Error finding ${this.model.modelName}:`, error);
      throw this._handleError(error);
    }
  }

  /**
   * Find multiple documents with pagination
   * @param {Object} criteria - Search criteria
   * @param {Object} options - Query options (page, limit, sort, populate, select)
   * @returns {Promise<Object>} Paginated results
   */
  async find(criteria = {}, options = {}) {
    try {
      const {
        page = 1,
        limit = 10,
        sort = '-createdAt',
        populate,
        select
      } = options;

      const skip = (page - 1) * limit;

      let query = this.model.find(criteria);
      
      if (populate) {
        query = query.populate(populate);
      }
      
      if (select) {
        query = query.select(select);
      }
      
      const [documents, total] = await Promise.all([
        query.sort(sort).skip(skip).limit(limit).exec(),
        this.model.countDocuments(criteria)
      ]);

      const totalPages = Math.ceil(total / limit);
      const hasNextPage = page < totalPages;
      const hasPrevPage = page > 1;

      return {
        documents,
        pagination: {
          currentPage: page,
          totalPages,
          totalDocuments: total,
          hasNextPage,
          hasPrevPage,
          limit
        }
      };
    } catch (error) {
      logger.error(`Error finding ${this.model.modelName} documents:`, error);
      throw this._handleError(error);
    }
  }

  /**
   * Update document by ID
   * @param {string} id - Document ID
   * @param {Object} updateData - Update data
   * @param {Object} options - Update options
   * @returns {Promise<Object|null>} Updated document or null
   */
  async updateById(id, updateData, options = {}) {
    try {
      const defaultOptions = {
        new: true,
        runValidators: true,
        ...options
      };

      const updatedDocument = await this.model.findByIdAndUpdate(
        id,
        updateData,
        defaultOptions
      );

      if (updatedDocument) {
        logger.info(`${this.model.modelName} updated:`, { id: updatedDocument._id });
      }

      return updatedDocument;
    } catch (error) {
      logger.error(`Error updating ${this.model.modelName}:`, error);
      throw this._handleError(error);
    }
  }

  /**
   * Update one document by criteria
   * @param {Object} criteria - Search criteria
   * @param {Object} updateData - Update data
   * @param {Object} options - Update options
   * @returns {Promise<Object|null>} Updated document or null
   */
  async updateOne(criteria, updateData, options = {}) {
    try {
      const defaultOptions = {
        new: true,
        runValidators: true,
        ...options
      };

      const updatedDocument = await this.model.findOneAndUpdate(
        criteria,
        updateData,
        defaultOptions
      );

      if (updatedDocument) {
        logger.info(`${this.model.modelName} updated:`, { id: updatedDocument._id });
      }

      return updatedDocument;
    } catch (error) {
      logger.error(`Error updating ${this.model.modelName}:`, error);
      throw this._handleError(error);
    }
  }

  /**
   * Delete document by ID
   * @param {string} id - Document ID
   * @returns {Promise<Object|null>} Deleted document or null
   */
  async deleteById(id) {
    try {
      const deletedDocument = await this.model.findByIdAndDelete(id);
      
      if (deletedDocument) {
        logger.info(`${this.model.modelName} deleted:`, { id: deletedDocument._id });
      }

      return deletedDocument;
    } catch (error) {
      logger.error(`Error deleting ${this.model.modelName}:`, error);
      throw this._handleError(error);
    }
  }

  /**
   * Delete one document by criteria
   * @param {Object} criteria - Search criteria
   * @returns {Promise<Object|null>} Deleted document or null
   */
  async deleteOne(criteria) {
    try {
      const deletedDocument = await this.model.findOneAndDelete(criteria);
      
      if (deletedDocument) {
        logger.info(`${this.model.modelName} deleted:`, { id: deletedDocument._id });
      }

      return deletedDocument;
    } catch (error) {
      logger.error(`Error deleting ${this.model.modelName}:`, error);
      throw this._handleError(error);
    }
  }

  /**
   * Count documents by criteria
   * @param {Object} criteria - Search criteria
   * @returns {Promise<number>} Document count
   */
  async count(criteria = {}) {
    try {
      return await this.model.countDocuments(criteria);
    } catch (error) {
      logger.error(`Error counting ${this.model.modelName} documents:`, error);
      throw this._handleError(error);
    }
  }

  /**
   * Check if document exists
   * @param {Object} criteria - Search criteria
   * @returns {Promise<boolean>} True if exists, false otherwise
   */
  async exists(criteria) {
    try {
      const document = await this.model.findOne(criteria).select('_id').lean();
      return !!document;
    } catch (error) {
      logger.error(`Error checking ${this.model.modelName} existence:`, error);
      throw this._handleError(error);
    }
  }

  /**
   * Execute aggregation pipeline
   * @param {Array} pipeline - Aggregation pipeline
   * @returns {Promise<Array>} Aggregation results
   */
  async aggregate(pipeline) {
    try {
      return await this.model.aggregate(pipeline);
    } catch (error) {
      logger.error(`Error executing aggregation on ${this.model.modelName}:`, error);
      throw this._handleError(error);
    }
  }

  /**
   * Handle database errors and convert to application errors
   * @param {Error} error - Database error
   * @returns {Error} Application error
   * @private
   */
  _handleError(error) {
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message,
        value: err.value
      }));
      
      const appError = new Error('Validation failed');
      appError.code = 'VALIDATION_ERROR';
      appError.statusCode = 400;
      appError.details = validationErrors;
      return appError;
    }

    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      const appError = new Error(`${field} already exists`);
      appError.code = 'DUPLICATE_ERROR';
      appError.statusCode = 409;
      appError.field = field;
      return appError;
    }

    if (error.name === 'CastError') {
      const appError = new Error('Invalid ID format');
      appError.code = 'INVALID_ID';
      appError.statusCode = 400;
      return appError;
    }

    // Default to internal server error
    error.statusCode = error.statusCode || 500;
    error.code = error.code || 'INTERNAL_ERROR';
    return error;
  }
}

module.exports = BaseRepository;