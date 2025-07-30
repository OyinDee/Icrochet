const BaseRepository = require('./BaseRepository');
const { AdminUser } = require('../models');
const logger = require('../config/logger');

/**
 * Repository for AdminUser operations
 */
class AdminUserRepository extends BaseRepository {
  constructor() {
    super(AdminUser);
  }

  /**
   * Find admin user by username or email
   * @param {string} identifier - Username or email
   * @returns {Promise<Object|null>} Admin user or null
   */
  async findByUsernameOrEmail(identifier) {
    try {
      logger.debug('Finding admin user by username or email:', identifier);
      
      const criteria = {
        $or: [
          { username: identifier },
          { email: identifier.toLowerCase() }
        ],
        isActive: true
      };

      const user = await this.findOne(criteria);
      logger.debug('Admin user found:', !!user);
      
      return user;
    } catch (error) {
      logger.error('Error finding admin user by username or email:', error);
      this.handleError(error);
    }
  }

  /**
   * Find admin user by username
   * @param {string} username - Username
   * @returns {Promise<Object|null>} Admin user or null
   */
  async findByUsername(username) {
    try {
      logger.debug('Finding admin user by username:', username);
      
      const criteria = { 
        username,
        isActive: true
      };

      return await this.findOne(criteria);
    } catch (error) {
      logger.error('Error finding admin user by username:', error);
      this.handleError(error);
    }
  }

  /**
   * Find admin user by email
   * @param {string} email - Email address
   * @returns {Promise<Object|null>} Admin user or null
   */
  async findByEmail(email) {
    try {
      logger.debug('Finding admin user by email:', email);
      
      const criteria = { 
        email: email.toLowerCase(),
        isActive: true
      };

      return await this.findOne(criteria);
    } catch (error) {
      logger.error('Error finding admin user by email:', error);
      this.handleError(error);
    }
  }

  /**
   * Create admin user with password hashing
   * @param {Object} userData - User data
   * @param {string} password - Plain text password
   * @returns {Promise<Object>} Created admin user
   */
  async createWithPassword(userData, password) {
    try {
      logger.debug('Creating admin user with password:', { 
        username: userData.username, 
        email: userData.email 
      });
      
      // Check if username already exists
      const existingByUsername = await this.findByUsername(userData.username);
      if (existingByUsername) {
        const error = new Error('Username already exists');
        error.code = 'USERNAME_EXISTS';
        error.field = 'username';
        throw error;
      }

      // Check if email already exists
      const existingByEmail = await this.findByEmail(userData.email);
      if (existingByEmail) {
        const error = new Error('Email already exists');
        error.code = 'EMAIL_EXISTS';
        error.field = 'email';
        throw error;
      }

      // Create user instance and hash password
      const user = new this.model(userData);
      await user.hashPassword(password);
      
      const savedUser = await user.save();
      logger.info('Admin user created successfully:', savedUser.username);
      
      return savedUser;
    } catch (error) {
      logger.error('Error creating admin user with password:', error);
      this.handleError(error);
    }
  }

  /**
   * Verify user credentials
   * @param {string} identifier - Username or email
   * @param {string} password - Plain text password
   * @returns {Promise<Object|null>} Admin user if credentials are valid, null otherwise
   */
  async verifyCredentials(identifier, password) {
    try {
      logger.debug('Verifying admin user credentials:', identifier);
      
      const user = await this.findByUsernameOrEmail(identifier);
      if (!user) {
        logger.debug('Admin user not found for credentials verification');
        return null;
      }

      const isPasswordValid = await user.verifyPassword(password);
      if (!isPasswordValid) {
        logger.debug('Invalid password for admin user:', identifier);
        return null;
      }

      // Update last login time
      await user.updateLastLogin();
      
      logger.info('Admin user credentials verified successfully:', identifier);
      return user;
    } catch (error) {
      logger.error('Error verifying admin user credentials:', error);
      this.handleError(error);
    }
  }

  /**
   * Update admin user password
   * @param {string} userId - User ID
   * @param {string} currentPassword - Current password
   * @param {string} newPassword - New password
   * @returns {Promise<Object|null>} Updated user or null
   */
  async updatePassword(userId, currentPassword, newPassword) {
    try {
      logger.debug('Updating admin user password:', userId);
      
      const user = await this.findById(userId);
      if (!user) {
        return null;
      }

      // Verify current password
      const isCurrentPasswordValid = await user.verifyPassword(currentPassword);
      if (!isCurrentPasswordValid) {
        const error = new Error('Current password is incorrect');
        error.code = 'INVALID_CURRENT_PASSWORD';
        throw error;
      }

      // Hash and set new password
      await user.hashPassword(newPassword);
      const updatedUser = await user.save();
      
      logger.info('Admin user password updated successfully:', userId);
      return updatedUser;
    } catch (error) {
      logger.error('Error updating admin user password:', error);
      this.handleError(error);
    }
  }

  /**
   * Update admin user profile
   * @param {string} userId - User ID
   * @param {Object} updateData - Update data
   * @returns {Promise<Object|null>} Updated user or null
   */
  async updateProfile(userId, updateData) {
    try {
      logger.debug('Updating admin user profile:', { userId, updateData });
      
      // Remove sensitive fields that shouldn't be updated directly
      const sanitizedData = { ...updateData };
      delete sanitizedData.passwordHash;
      delete sanitizedData.username; // Username changes require special handling
      
      // If email is being updated, check for uniqueness
      if (sanitizedData.email) {
        const existingUser = await this.findByEmail(sanitizedData.email);
        if (existingUser && existingUser._id.toString() !== userId) {
          const error = new Error('Email already exists');
          error.code = 'EMAIL_EXISTS';
          error.field = 'email';
          throw error;
        }
        sanitizedData.email = sanitizedData.email.toLowerCase();
      }

      const updatedUser = await this.updateById(userId, sanitizedData);
      
      if (updatedUser) {
        logger.info('Admin user profile updated successfully:', userId);
      }
      
      return updatedUser;
    } catch (error) {
      logger.error('Error updating admin user profile:', error);
      this.handleError(error);
    }
  }

  /**
   * Deactivate admin user
   * @param {string} userId - User ID
   * @returns {Promise<Object|null>} Updated user or null
   */
  async deactivate(userId) {
    try {
      logger.debug('Deactivating admin user:', userId);
      
      const updatedUser = await this.updateById(userId, { 
        isActive: false,
        updatedAt: new Date()
      });
      
      if (updatedUser) {
        logger.info('Admin user deactivated successfully:', userId);
      }
      
      return updatedUser;
    } catch (error) {
      logger.error('Error deactivating admin user:', error);
      this.handleError(error);
    }
  }

  /**
   * Reactivate admin user
   * @param {string} userId - User ID
   * @returns {Promise<Object|null>} Updated user or null
   */
  async reactivate(userId) {
    try {
      logger.debug('Reactivating admin user:', userId);
      
      const updatedUser = await this.updateById(userId, { 
        isActive: true,
        updatedAt: new Date()
      });
      
      if (updatedUser) {
        logger.info('Admin user reactivated successfully:', userId);
      }
      
      return updatedUser;
    } catch (error) {
      logger.error('Error reactivating admin user:', error);
      this.handleError(error);
    }
  }

  /**
   * Get all active admin users
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Active admin users with pagination
   */
  async findActive(options = {}) {
    try {
      logger.debug('Finding active admin users');
      
      const criteria = { isActive: true };
      const queryOptions = {
        ...options,
        select: '-passwordHash' // Exclude password hash from results
      };

      return await this.find(criteria, queryOptions);
    } catch (error) {
      logger.error('Error finding active admin users:', error);
      this.handleError(error);
    }
  }

  /**
   * Get admin user statistics
   * @returns {Promise<Object>} Admin user statistics
   */
  async getStatistics() {
    try {
      logger.debug('Getting admin user statistics');
      
      const pipeline = [
        {
          $group: {
            _id: null,
            totalUsers: { $sum: 1 },
            activeUsers: {
              $sum: { $cond: ['$isActive', 1, 0] }
            },
            inactiveUsers: {
              $sum: { $cond: ['$isActive', 0, 1] }
            },
            usersWithLastLogin: {
              $sum: {
                $cond: [
                  { $ne: ['$lastLoginAt', null] },
                  1,
                  0
                ]
              }
            },
            recentLogins: {
              $sum: {
                $cond: [
                  {
                    $gte: [
                      '$lastLoginAt',
                      new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
                    ]
                  },
                  1,
                  0
                ]
              }
            },
            oldestUser: { $min: '$createdAt' },
            newestUser: { $max: '$createdAt' }
          }
        }
      ];

      const [stats] = await this.aggregate(pipeline);
      
      return stats || {
        totalUsers: 0,
        activeUsers: 0,
        inactiveUsers: 0,
        usersWithLastLogin: 0,
        recentLogins: 0,
        oldestUser: null,
        newestUser: null
      };
    } catch (error) {
      logger.error('Error getting admin user statistics:', error);
      this.handleError(error);
    }
  }

  /**
   * Search admin users by username, email, or name
   * @param {string} searchTerm - Search term
   * @param {Object} options - Search options
   * @returns {Promise<Object>} Search results
   */
  async search(searchTerm, options = {}) {
    try {
      logger.debug('Searching admin users:', searchTerm);
      
      if (!searchTerm || searchTerm.trim().length === 0) {
        return await this.findActive(options);
      }

      const searchRegex = new RegExp(searchTerm.trim(), 'i');
      
      const criteria = {
        isActive: true,
        $or: [
          { username: searchRegex },
          { email: searchRegex },
          { firstName: searchRegex },
          { lastName: searchRegex }
        ]
      };

      const queryOptions = {
        ...options,
        select: '-passwordHash'
      };

      return await this.find(criteria, queryOptions);
    } catch (error) {
      logger.error('Error searching admin users:', error);
      this.handleError(error);
    }
  }

  /**
   * Get recently active admin users
   * @param {number} days - Number of days to look back
   * @param {number} limit - Maximum number of users to return
   * @returns {Promise<Array>} Recently active users
   */
  async getRecentlyActive(days = 7, limit = 10) {
    try {
      logger.debug('Getting recently active admin users:', { days, limit });
      
      const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      
      const criteria = {
        isActive: true,
        lastLoginAt: { $gte: cutoffDate }
      };

      const options = {
        limit,
        sort: { lastLoginAt: -1 },
        select: '-passwordHash'
      };

      const result = await this.find(criteria, options);
      return result.data;
    } catch (error) {
      logger.error('Error getting recently active admin users:', error);
      this.handleError(error);
    }
  }

  /**
   * Check if username is available
   * @param {string} username - Username to check
   * @param {string} excludeUserId - User ID to exclude from check (for updates)
   * @returns {Promise<boolean>} True if username is available
   */
  async isUsernameAvailable(username, excludeUserId = null) {
    try {
      logger.debug('Checking username availability:', username);
      
      const criteria = { username };
      if (excludeUserId) {
        criteria._id = { $ne: excludeUserId };
      }

      const existingUser = await this.findOne(criteria);
      return !existingUser;
    } catch (error) {
      logger.error('Error checking username availability:', error);
      this.handleError(error);
    }
  }

  /**
   * Check if email is available
   * @param {string} email - Email to check
   * @param {string} excludeUserId - User ID to exclude from check (for updates)
   * @returns {Promise<boolean>} True if email is available
   */
  async isEmailAvailable(email, excludeUserId = null) {
    try {
      logger.debug('Checking email availability:', email);
      
      const criteria = { email: email.toLowerCase() };
      if (excludeUserId) {
        criteria._id = { $ne: excludeUserId };
      }

      const existingUser = await this.findOne(criteria);
      return !existingUser;
    } catch (error) {
      logger.error('Error checking email availability:', error);
      this.handleError(error);
    }
  }

  /**
   * Update last login time for user
   * @param {string} userId - User ID
   * @returns {Promise<Object|null>} Updated user or null
   */
  async updateLastLogin(userId) {
    try {
      logger.debug('Updating last login time:', userId);
      
      const updatedUser = await this.updateById(userId, { 
        lastLoginAt: new Date(),
        updatedAt: new Date()
      });
      
      if (updatedUser) {
        logger.debug('Last login time updated successfully:', userId);
      }
      
      return updatedUser;
    } catch (error) {
      logger.error('Error updating last login time:', error);
      this.handleError(error);
    }
  }
}

module.exports = AdminUserRepository;