const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const config = require('../config');
const {AdminUserRepository} = require('../repositories');
const logger = require('../config/logger');

/**
 * Authentication service for JWT token management
 */
class AuthService {
  constructor() {
    this.adminUserRepository = new AdminUserRepository();
    this.jwtSecret = config.jwt.secret;
    this.jwtExpiresIn = config.jwt.expiresIn;
    this.refreshSecret = config.jwt.refreshSecret;
    this.refreshExpiresIn = config.jwt.refreshExpiresIn;
  }

  /**
   * Authenticate admin user with credentials
   * @param {string} identifier - Username or email
   * @param {string} password - Plain text password
   * @returns {Promise<Object>} Authentication result with tokens
   */
  async authenticateAdmin(identifier, password) {
    try {
      logger.debug('Authenticating admin user:', identifier);

      // Verify credentials using repository
      const user = await this.adminUserRepository.verifyCredentials(identifier, password);
      
      if (!user) {
        const error = new Error('Invalid credentials');
        error.code = 'INVALID_CREDENTIALS';
        throw error;
      }

      // Generate tokens
      const tokens = await this.generateTokens(user);
      
      logger.info('Admin user authenticated successfully:', user.username);
      
      return {
        success: true,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          fullName: user.fullName,
          lastLoginAt: user.lastLoginAt
        },
        tokens
      };
    } catch (error) {
      logger.error('Error authenticating admin user:', error);
      throw error;
    }
  }

  /**
   * Generate JWT access and refresh tokens
   * @param {Object} user - User object
   * @returns {Promise<Object>} Generated tokens
   */
  async generateTokens(user) {
    try {
      logger.debug('Generating tokens for user:', user.username);

      const payload = {
        userId: user._id,
        username: user.username,
        email: user.email,
        type: 'admin'
      };

      // Generate access token
      const accessToken = jwt.sign(payload, this.jwtSecret, {
        expiresIn: this.jwtExpiresIn,
        issuer: 'crochet-business-api',
        audience: 'crochet-business-admin'
      });

      // Generate refresh token
      const refreshToken = jwt.sign(
        { userId: user._id, type: 'refresh' },
        this.refreshSecret,
        {
          expiresIn: this.refreshExpiresIn,
          issuer: 'crochet-business-api',
          audience: 'crochet-business-admin'
        }
      );

      // Calculate expiration times
      const accessTokenExpiry = new Date(Date.now() + this.parseExpirationTime(this.jwtExpiresIn));
      const refreshTokenExpiry = new Date(Date.now() + this.parseExpirationTime(this.refreshExpiresIn));

      logger.debug('Tokens generated successfully for user:', user.username);

      return {
        accessToken,
        refreshToken,
        accessTokenExpiry,
        refreshTokenExpiry,
        tokenType: 'Bearer'
      };
    } catch (error) {
      logger.error('Error generating tokens:', error);
      throw error;
    }
  }

  /**
   * Verify JWT access token
   * @param {string} token - JWT token
   * @returns {Promise<Object>} Decoded token payload
   */
  async verifyAccessToken(token) {
    try {
      logger.debug('Verifying access token');

      const decoded = jwt.verify(token, this.jwtSecret, {
        issuer: 'crochet-business-api',
        audience: 'crochet-business-admin'
      });

      // Check if user still exists and is active
      const user = await this.adminUserRepository.findById(decoded.userId);
      if (!user || !user.isActive) {
        const error = new Error('User not found or inactive');
        error.code = 'USER_NOT_FOUND';
        throw error;
      }

      logger.debug('Access token verified successfully');
      
      return {
        ...decoded,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          fullName: user.fullName,
          isActive: user.isActive
        }
      };
    } catch (error) {
      logger.debug('Access token verification failed:', error.message);
      
      if (error.name === 'JsonWebTokenError') {
        const customError = new Error('Invalid token');
        customError.code = 'INVALID_TOKEN';
        throw customError;
      }
      
      if (error.name === 'TokenExpiredError') {
        const customError = new Error('Token expired');
        customError.code = 'TOKEN_EXPIRED';
        throw customError;
      }
      
      throw error;
    }
  }

  /**
   * Verify JWT refresh token
   * @param {string} token - Refresh token
   * @returns {Promise<Object>} Decoded token payload
   */
  async verifyRefreshToken(token) {
    try {
      logger.debug('Verifying refresh token');

      const decoded = jwt.verify(token, this.refreshSecret, {
        issuer: 'crochet-business-api',
        audience: 'crochet-business-admin'
      });

      if (decoded.type !== 'refresh') {
        const error = new Error('Invalid token type');
        error.code = 'INVALID_TOKEN_TYPE';
        throw error;
      }

      // Check if user still exists and is active
      const user = await this.adminUserRepository.findById(decoded.userId);
      if (!user || !user.isActive) {
        const error = new Error('User not found or inactive');
        error.code = 'USER_NOT_FOUND';
        throw error;
      }

      logger.debug('Refresh token verified successfully');
      return { ...decoded, user };
    } catch (error) {
      logger.debug('Refresh token verification failed:', error.message);
      
      if (error.name === 'JsonWebTokenError') {
        const customError = new Error('Invalid refresh token');
        customError.code = 'INVALID_REFRESH_TOKEN';
        throw customError;
      }
      
      if (error.name === 'TokenExpiredError') {
        const customError = new Error('Refresh token expired');
        customError.code = 'REFRESH_TOKEN_EXPIRED';
        throw customError;
      }
      
      throw error;
    }
  }

  /**
   * Refresh access token using refresh token
   * @param {string} refreshToken - Refresh token
   * @returns {Promise<Object>} New tokens
   */
  async refreshTokens(refreshToken) {
    try {
      logger.debug('Refreshing tokens');

      // Verify refresh token
      const decoded = await this.verifyRefreshToken(refreshToken);
      
      // Generate new tokens
      const tokens = await this.generateTokens(decoded.user);
      
      logger.info('Tokens refreshed successfully for user:', decoded.user.username);
      
      return {
        success: true,
        user: {
          id: decoded.user._id,
          username: decoded.user.username,
          email: decoded.user.email,
          firstName: decoded.user.firstName,
          lastName: decoded.user.lastName,
          fullName: decoded.user.fullName
        },
        tokens
      };
    } catch (error) {
      logger.error('Error refreshing tokens:', error);
      throw error;
    }
  }

  /**
   * Hash password using bcrypt
   * @param {string} password - Plain text password
   * @returns {Promise<string>} Hashed password
   */
  async hashPassword(password) {
    try {
      logger.debug('Hashing password');
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);
      logger.debug('Password hashed successfully');
      return hashedPassword;
    } catch (error) {
      logger.error('Error hashing password:', error);
      throw error;
    }
  }

  /**
   * Verify password against hash
   * @param {string} password - Plain text password
   * @param {string} hash - Hashed password
   * @returns {Promise<boolean>} True if password matches
   */
  async verifyPassword(password, hash) {
    try {
      logger.debug('Verifying password');
      const isMatch = await bcrypt.compare(password, hash);
      logger.debug('Password verification result:', isMatch);
      return isMatch;
    } catch (error) {
      logger.error('Error verifying password:', error);
      throw error;
    }
  }

  /**
   * Extract token from Authorization header
   * @param {string} authHeader - Authorization header value
   * @returns {string|null} Extracted token or null
   */
  extractTokenFromHeader(authHeader) {
    if (!authHeader) {
      return null;
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return null;
    }

    return parts[1];
  }

  /**
   * Parse expiration time string to milliseconds
   * @param {string} expirationTime - Expiration time (e.g., '24h', '7d')
   * @returns {number} Milliseconds
   */
  parseExpirationTime(expirationTime) {
    const units = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000
    };

    const match = expirationTime.match(/^(\d+)([smhd])$/);
    if (!match) {
      throw new Error(`Invalid expiration time format: ${expirationTime}`);
    }

    const [, value, unit] = match;
    return parseInt(value) * units[unit];
  }

  /**
   * Validate token format
   * @param {string} token - Token to validate
   * @returns {boolean} True if token format is valid
   */
  isValidTokenFormat(token) {
    if (!token || typeof token !== 'string') {
      return false;
    }

    // JWT tokens have 3 parts separated by dots
    const parts = token.split('.');
    return parts.length === 3;
  }

  /**
   * Get token expiration time
   * @param {string} token - JWT token
   * @returns {Date|null} Expiration date or null if invalid
   */
  getTokenExpiration(token) {
    try {
      if (!this.isValidTokenFormat(token)) {
        return null;
      }

      // Decode without verification to get expiration
      const decoded = jwt.decode(token);
      if (!decoded || !decoded.exp) {
        return null;
      }

      return new Date(decoded.exp * 1000);
    } catch (error) {
      logger.debug('Error getting token expiration:', error.message);
      return null;
    }
  }

  /**
   * Check if token is expired
   * @param {string} token - JWT token
   * @returns {boolean} True if token is expired
   */
  isTokenExpired(token) {
    const expiration = this.getTokenExpiration(token);
    if (!expiration) {
      return true;
    }

    return expiration < new Date();
  }

  /**
   * Create admin user
   * @param {Object} userData - User data
   * @param {string} password - Plain text password
   * @returns {Promise<Object>} Created user (without password)
   */
  async createAdminUser(userData, password) {
    try {
      logger.debug('Creating admin user:', userData.username);

      const user = await this.adminUserRepository.createWithPassword(userData, password);
      
      logger.info('Admin user created successfully:', user.username);
      
      return {
        id: user._id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: user.fullName,
        isActive: user.isActive,
        createdAt: user.createdAt
      };
    } catch (error) {
      logger.error('Error creating admin user:', error);
      throw error;
    }
  }

  /**
   * Change admin user password
   * @param {string} userId - User ID
   * @param {string} currentPassword - Current password
   * @param {string} newPassword - New password
   * @returns {Promise<Object>} Update result
   */
  async changePassword(userId, currentPassword, newPassword) {
    try {
      logger.debug('Changing password for user:', userId);

      const updatedUser = await this.adminUserRepository.updatePassword(
        userId,
        currentPassword,
        newPassword
      );

      if (!updatedUser) {
        const error = new Error('User not found');
        error.code = 'USER_NOT_FOUND';
        throw error;
      }

      logger.info('Password changed successfully for user:', userId);
      
      return {
        success: true,
        message: 'Password changed successfully'
      };
    } catch (error) {
      logger.error('Error changing password:', error);
      throw error;
    }
  }
}

module.exports = AuthService;