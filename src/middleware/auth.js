const AuthService = require('../services/AuthService');
const logger = require('../config/logger');

/**
 * Authentication middleware for protecting admin routes
 */
class AuthMiddleware {
  constructor() {
    this.authService = new AuthService();
  }

  /**
   * Middleware to authenticate admin users
   * @returns {Function} Express middleware function
   */
  authenticateAdmin() {
    return async (req, res, next) => {
      try {
        logger.debug('Authenticating admin request');

        // Extract token from Authorization header
        const authHeader = req.headers.authorization;
        const token = this.authService.extractTokenFromHeader(authHeader);

        if (!token) {
          return this.sendUnauthorizedResponse(res, 'No token provided');
        }

        // Verify token
        const decoded = await this.authService.verifyAccessToken(token);
        
        // Add user info to request object
        req.user = decoded.user;
        req.tokenPayload = decoded;

        logger.debug('Admin authenticated successfully:', decoded.user.username);
        next();
      } catch (error) {
        logger.warn('Authentication failed:', error.message);
        
        if (error.code === 'TOKEN_EXPIRED') {
          return this.sendUnauthorizedResponse(res, 'Token expired', 'TOKEN_EXPIRED');
        }
        
        if (error.code === 'INVALID_TOKEN') {
          return this.sendUnauthorizedResponse(res, 'Invalid token', 'INVALID_TOKEN');
        }
        
        if (error.code === 'USER_NOT_FOUND') {
          return this.sendUnauthorizedResponse(res, 'User not found or inactive', 'USER_NOT_FOUND');
        }

        return this.sendUnauthorizedResponse(res, 'Authentication failed');
      }
    };
  }

  /**
   * Optional authentication middleware (doesn't fail if no token)
   * @returns {Function} Express middleware function
   */
  optionalAuth() {
    return async (req, res, next) => {
      try {
        logger.debug('Optional authentication check');

        const authHeader = req.headers.authorization;
        const token = this.authService.extractTokenFromHeader(authHeader);

        if (!token) {
          logger.debug('No token provided for optional auth');
          return next();
        }

        // Try to verify token
        const decoded = await this.authService.verifyAccessToken(token);
        
        // Add user info to request object if token is valid
        req.user = decoded.user;
        req.tokenPayload = decoded;

        logger.debug('Optional auth successful:', decoded.user.username);
        next();
      } catch (error) {
        logger.debug('Optional auth failed, continuing without user:', error.message);
        // Continue without authentication for optional auth
        next();
      }
    };
  }

  /**
   * Middleware to check if user is active
   * @returns {Function} Express middleware function
   */
  requireActiveUser() {
    return (req, res, next) => {
      if (!req.user) {
        return this.sendUnauthorizedResponse(res, 'Authentication required');
      }

      if (!req.user.isActive) {
        return this.sendForbiddenResponse(res, 'User account is inactive');
      }

      next();
    };
  }

  /**
   * Middleware to validate token format before processing
   * @returns {Function} Express middleware function
   */
  validateTokenFormat() {
    return (req, res, next) => {
      const authHeader = req.headers.authorization;
      const token = this.authService.extractTokenFromHeader(authHeader);

      if (!token) {
        return this.sendUnauthorizedResponse(res, 'No token provided');
      }

      if (!this.authService.isValidTokenFormat(token)) {
        return this.sendUnauthorizedResponse(res, 'Invalid token format', 'INVALID_TOKEN_FORMAT');
      }

      next();
    };
  }

  /**
   * Middleware to check token expiration without full verification
   * @returns {Function} Express middleware function
   */
  checkTokenExpiration() {
    return (req, res, next) => {
      const authHeader = req.headers.authorization;
      const token = this.authService.extractTokenFromHeader(authHeader);

      if (!token) {
        return this.sendUnauthorizedResponse(res, 'No token provided');
      }

      if (this.authService.isTokenExpired(token)) {
        return this.sendUnauthorizedResponse(res, 'Token expired', 'TOKEN_EXPIRED');
      }

      next();
    };
  }

  /**
   * Rate limiting middleware for authentication attempts
   * @param {number} maxAttempts - Maximum attempts per window
   * @param {number} windowMs - Time window in milliseconds
   * @returns {Function} Express middleware function
   */
  rateLimitAuth(maxAttempts = 5, windowMs = 15 * 60 * 1000) {
    const attempts = new Map();

    return (req, res, next) => {
      const clientId = this.getClientIdentifier(req);
      const now = Date.now();
      
      // Clean up old entries
      for (const [key, data] of attempts.entries()) {
        if (now - data.firstAttempt > windowMs) {
          attempts.delete(key);
        }
      }

      const clientAttempts = attempts.get(clientId);
      
      if (!clientAttempts) {
        attempts.set(clientId, {
          count: 1,
          firstAttempt: now
        });
        return next();
      }

      if (now - clientAttempts.firstAttempt > windowMs) {
        // Reset window
        attempts.set(clientId, {
          count: 1,
          firstAttempt: now
        });
        return next();
      }

      if (clientAttempts.count >= maxAttempts) {
        logger.warn('Rate limit exceeded for authentication:', clientId);
        return res.status(429).json({
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many authentication attempts. Please try again later.',
            retryAfter: Math.ceil((clientAttempts.firstAttempt + windowMs - now) / 1000)
          },
          timestamp: new Date().toISOString()
        });
      }

      clientAttempts.count++;
      next();
    };
  }

  /**
   * Middleware to log authentication events
   * @returns {Function} Express middleware function
   */
  logAuthEvents() {
    return (req, res, next) => {
      const originalSend = res.send;
      
      res.send = function(data) {
        // Log authentication events
        if (res.statusCode === 401) {
          logger.warn('Authentication failed:', {
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            path: req.path,
            method: req.method
          });
        } else if (req.user) {
          logger.info('Authentication successful:', {
            user: req.user.username,
            ip: req.ip,
            path: req.path,
            method: req.method
          });
        }
        
        originalSend.call(this, data);
      };

      next();
    };
  }

  /**
   * Get client identifier for rate limiting
   * @param {Object} req - Express request object
   * @returns {string} Client identifier
   */
  getClientIdentifier(req) {
    // Use IP address as primary identifier
    // In production, you might want to use a combination of IP and User-Agent
    return req.ip || req.connection.remoteAddress || 'unknown';
  }

  /**
   * Send unauthorized response
   * @param {Object} res - Express response object
   * @param {string} message - Error message
   * @param {string} code - Error code
   */
  sendUnauthorizedResponse(res, message, code = 'UNAUTHORIZED') {
    res.status(401).json({
      success: false,
      error: {
        code,
        message,
        details: {}
      },
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Send forbidden response
   * @param {Object} res - Express response object
   * @param {string} message - Error message
   * @param {string} code - Error code
   */
  sendForbiddenResponse(res, message, code = 'FORBIDDEN') {
    res.status(403).json({
      success: false,
      error: {
        code,
        message,
        details: {}
      },
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Middleware factory for combining multiple auth middlewares
   * @param {Array} middlewares - Array of middleware functions
   * @returns {Function} Combined middleware function
   */
  combine(middlewares) {
    return (req, res, next) => {
      let index = 0;

      const runNext = (error) => {
        if (error) {
          return next(error);
        }

        if (index >= middlewares.length) {
          return next();
        }

        const middleware = middlewares[index++];
        middleware(req, res, runNext);
      };

      runNext();
    };
  }

  /**
   * Create a complete admin authentication middleware chain
   * @param {Object} options - Configuration options
   * @returns {Function} Complete authentication middleware
   */
  createAdminAuthChain(options = {}) {
    const {
      enableRateLimit = true,
      enableLogging = true,
      maxAttempts = 5,
      windowMs = 15 * 60 * 1000
    } = options;

    const middlewares = [];

    if (enableLogging) {
      middlewares.push(this.logAuthEvents());
    }

    if (enableRateLimit) {
      middlewares.push(this.rateLimitAuth(maxAttempts, windowMs));
    }

    middlewares.push(
      this.validateTokenFormat(),
      this.checkTokenExpiration(),
      this.authenticateAdmin(),
      this.requireActiveUser()
    );

    return this.combine(middlewares);
  }
}

// Create singleton instance
const authMiddleware = new AuthMiddleware();

// Export middleware functions
module.exports = {
  // Main authentication middleware
  authenticateAdmin: authMiddleware.authenticateAdmin.bind(authMiddleware),
  optionalAuth: authMiddleware.optionalAuth.bind(authMiddleware),
  requireActiveUser: authMiddleware.requireActiveUser.bind(authMiddleware),
  
  // Utility middlewares
  validateTokenFormat: authMiddleware.validateTokenFormat.bind(authMiddleware),
  checkTokenExpiration: authMiddleware.checkTokenExpiration.bind(authMiddleware),
  rateLimitAuth: authMiddleware.rateLimitAuth.bind(authMiddleware),
  logAuthEvents: authMiddleware.logAuthEvents.bind(authMiddleware),
  
  // Combined middleware
  adminAuthChain: authMiddleware.createAdminAuthChain.bind(authMiddleware),
  
  // Utility functions
  combine: authMiddleware.combine.bind(authMiddleware),
  
  // Class instance for advanced usage
  AuthMiddleware
};