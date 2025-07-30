const logger = require('../config/logger');

/**
 * Validation middleware factory
 * @param {Object} schema - Joi validation schema
 * @param {string} source - Source of data to validate ('body', 'params', 'query')
 * @returns {Function} Express middleware function
 */
const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    const dataToValidate = req[source];
    
    if (!dataToValidate) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: `No ${source} data provided`,
          details: {}
        },
        timestamp: new Date().toISOString()
      });
    }

    const { error, value } = schema.validate(dataToValidate, {
      abortEarly: false, // Return all validation errors
      stripUnknown: true, // Remove unknown fields
      convert: true // Convert types when possible
    });

    if (error) {
      const validationErrors = {};
      
      error.details.forEach(detail => {
        const field = detail.path.join('.');
        validationErrors[field] = detail.message;
      });

      logger.warn('Validation failed:', {
        source,
        errors: validationErrors,
        originalData: dataToValidate
      });

      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: validationErrors
        },
        timestamp: new Date().toISOString()
      });
    }

    // Replace the original data with validated and sanitized data
    req[source] = value;
    next();
  };
};

/**
 * Validate request body
 * @param {Object} schema - Joi validation schema
 * @returns {Function} Express middleware function
 */
const validateBody = (schema) => validate(schema, 'body');

/**
 * Validate request parameters
 * @param {Object} schema - Joi validation schema
 * @returns {Function} Express middleware function
 */
const validateParams = (schema) => validate(schema, 'params');

/**
 * Validate query parameters
 * @param {Object} schema - Joi validation schema
 * @returns {Function} Express middleware function
 */
const validateQuery = (schema) => validate(schema, 'query');

/**
 * Combine multiple validation schemas for different sources
 * @param {Object} schemas - Object containing schemas for different sources
 * @returns {Function} Express middleware function
 */
const validateMultiple = (schemas) => {
  return (req, res, next) => {
    const validationPromises = [];
    
    Object.keys(schemas).forEach(source => {
      if (schemas[source] && req[source]) {
        validationPromises.push(
          new Promise((resolve, reject) => {
            const { error, value } = schemas[source].validate(req[source], {
              abortEarly: false,
              stripUnknown: true,
              convert: true
            });
            
            if (error) {
              reject({ source, error });
            } else {
              req[source] = value;
              resolve();
            }
          })
        );
      }
    });

    // If no validation promises, proceed immediately
    if (validationPromises.length === 0) {
      return next();
    }

    Promise.all(validationPromises)
      .then(() => next())
      .catch(({ source, error }) => {
        const validationErrors = {};
        
        error.details.forEach(detail => {
          const field = detail.path.join('.');
          validationErrors[field] = detail.message;
        });

        logger.warn('Multiple validation failed:', {
          source,
          errors: validationErrors
        });

        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: `Validation failed for ${source}`,
            details: validationErrors
          },
          timestamp: new Date().toISOString()
        });
      });
  };
};

/**
 * Validate ObjectId parameter
 * @param {string} paramName - Name of the parameter to validate
 * @returns {Function} Express middleware function
 */
const validateObjectId = (paramName = 'id') => {
  const Joi = require('joi');
  const schema = Joi.object({
    [paramName]: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required()
  });
  
  return validateParams(schema);
};

module.exports = {
  validate,
  validateBody,
  validateParams,
  validateQuery,
  validateMultiple,
  validateObjectId
};