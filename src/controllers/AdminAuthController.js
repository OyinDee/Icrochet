const { AuthService } = require('../services');
const logger = require('../config/logger');

/**
 * Controller for admin authentication
 */
class AdminAuthController {
  constructor() {
    this.authService = new AuthService();
  }

  /**
   * Admin login
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async login(req, res) {
    try {
      logger.debug('Admin login attempt:', req.body.username);

      const { username, password } = req.body;

      const result = await this.authService.authenticateAdmin(username, password);

      logger.info('Admin login successful:', username);

      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.warn('Admin login failed:', error.message);

      if (error.code === 'INVALID_CREDENTIALS') {
        return res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid username or password',
            details: {}
          },
          timestamp: new Date().toISOString()
        });
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'LOGIN_ERROR',
          message: 'An error occurred during login',
          details: {}
        },
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Refresh access token
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async refresh(req, res) {
    try {
      logger.debug('Token refresh attempt');

      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_REFRESH_TOKEN',
            message: 'Refresh token is required',
            details: {}
          },
          timestamp: new Date().toISOString()
        });
      }

      const result = await this.authService.refreshTokens(refreshToken);

      logger.info('Token refresh successful');

      res.status(200).json({
        success: true,
        message: 'Tokens refreshed successfully',
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.warn('Token refresh failed:', error.message);

      if (error.code === 'INVALID_REFRESH_TOKEN') {
        return res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_REFRESH_TOKEN',
            message: 'Invalid refresh token',
            details: {}
          },
          timestamp: new Date().toISOString()
        });
      }

      if (error.code === 'REFRESH_TOKEN_EXPIRED') {
        return res.status(401).json({
          success: false,
          error: {
            code: 'REFRESH_TOKEN_EXPIRED',
            message: 'Refresh token has expired',
            details: {}
          },
          timestamp: new Date().toISOString()
        });
      }

      if (error.code === 'USER_NOT_FOUND') {
        return res.status(401).json({
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found or inactive',
            details: {}
          },
          timestamp: new Date().toISOString()
        });
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'REFRESH_ERROR',
          message: 'An error occurred during token refresh',
          details: {}
        },
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get current user profile
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getProfile(req, res) {
    try {
      logger.debug('Getting admin profile:', req.user.username);

      // User info is already available from auth middleware
      const userProfile = {
        id: req.user.id,
        username: req.user.username,
        email: req.user.email,
        firstName: req.user.firstName,
        lastName: req.user.lastName,
        fullName: req.user.fullName,
        isActive: req.user.isActive
      };

      res.status(200).json({
        success: true,
        message: 'Profile retrieved successfully',
        data: { user: userProfile },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error getting admin profile:', error);

      res.status(500).json({
        success: false,
        error: {
          code: 'PROFILE_ERROR',
          message: 'An error occurred while retrieving profile',
          details: {}
        },
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Change password
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async changePassword(req, res) {
    try {
      logger.debug('Password change attempt for user:', req.user.username);

      const { currentPassword, newPassword } = req.body;

      const result = await this.authService.changePassword(
        req.user.id,
        currentPassword,
        newPassword
      );

      logger.info('Password changed successfully for user:', req.user.username);

      res.status(200).json({
        success: true,
        message: 'Password changed successfully',
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.warn('Password change failed:', error.message);

      if (error.code === 'INVALID_CURRENT_PASSWORD') {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_CURRENT_PASSWORD',
            message: 'Current password is incorrect',
            details: {}
          },
          timestamp: new Date().toISOString()
        });
      }

      if (error.code === 'USER_NOT_FOUND') {
        return res.status(404).json({
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found',
            details: {}
          },
          timestamp: new Date().toISOString()
        });
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'PASSWORD_CHANGE_ERROR',
          message: 'An error occurred while changing password',
          details: {}
        },
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Logout (client-side token invalidation)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async logout(req, res) {
    try {
      logger.info('Admin logout:', req.user.username);

      // Since we're using stateless JWT tokens, logout is handled client-side
      // by removing the tokens from storage. We just acknowledge the logout.
      
      res.status(200).json({
        success: true,
        message: 'Logout successful',
        data: {},
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error during logout:', error);

      res.status(500).json({
        success: false,
        error: {
          code: 'LOGOUT_ERROR',
          message: 'An error occurred during logout',
          details: {}
        },
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Validate token (health check for authentication)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async validateToken(req, res) {
    try {
      // If we reach here, the token is valid (auth middleware passed)
      res.status(200).json({
        success: true,
        message: 'Token is valid',
        data: {
          user: {
            id: req.user.id,
            username: req.user.username,
            email: req.user.email,
            isActive: req.user.isActive
          },
          tokenInfo: {
            userId: req.tokenPayload.userId,
            type: req.tokenPayload.type,
            iat: req.tokenPayload.iat,
            exp: req.tokenPayload.exp
          }
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error validating token:', error);

      res.status(500).json({
        success: false,
        error: {
          code: 'TOKEN_VALIDATION_ERROR',
          message: 'An error occurred while validating token',
          details: {}
        },
        timestamp: new Date().toISOString()
      });
    }
  }
}

module.exports = AdminAuthController;