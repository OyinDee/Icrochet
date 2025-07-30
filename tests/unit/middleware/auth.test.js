const { 
  authenticateAdmin, 
  optionalAuth, 
  requireActiveUser,
  validateTokenFormat,
  checkTokenExpiration,
  rateLimitAuth,
  logAuthEvents,
  AuthMiddleware 
} = require('../../../src/middleware/auth');
const AuthService = require('../../../src/services/AuthService');

// Mock AuthService
jest.mock('../../../src/services/AuthService');

describe('Auth Middleware', () => {
  let req, res, next;
  let mockAuthService;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup request/response mocks
    req = {
      headers: {},
      ip: '127.0.0.1',
      path: '/api/admin/test',
      method: 'GET',
      get: jest.fn(),
      connection: { remoteAddress: '127.0.0.1' }
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      send: jest.fn()
    };

    next = jest.fn();

    // Mock AuthService methods
    mockAuthService = {
      extractTokenFromHeader: jest.fn(),
      verifyAccessToken: jest.fn(),
      isValidTokenFormat: jest.fn(),
      isTokenExpired: jest.fn()
    };

    AuthService.mockImplementation(() => mockAuthService);
  });

  describe('authenticateAdmin', () => {
    it('should authenticate valid admin token', async () => {
      const token = 'valid-token';
      const decodedUser = {
        user: {
          id: 'user123',
          username: 'admin',
          email: 'admin@example.com',
          isActive: true
        },
        userId: 'user123',
        username: 'admin'
      };

      req.headers.authorization = `Bearer ${token}`;
      mockAuthService.extractTokenFromHeader.mockReturnValue(token);
      mockAuthService.verifyAccessToken.mockResolvedValue(decodedUser);

      const middleware = authenticateAdmin();
      await middleware(req, res, next);

      expect(req.user).toEqual(decodedUser.user);
      expect(req.tokenPayload).toEqual(decodedUser);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should reject request without token', async () => {
      mockAuthService.extractTokenFromHeader.mockReturnValue(null);

      const middleware = authenticateAdmin();
      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'UNAUTHORIZED',
            message: 'No token provided'
          })
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle expired token', async () => {
      const token = 'expired-token';
      const error = new Error('Token expired');
      error.code = 'TOKEN_EXPIRED';

      req.headers.authorization = `Bearer ${token}`;
      mockAuthService.extractTokenFromHeader.mockReturnValue(token);
      mockAuthService.verifyAccessToken.mockRejectedValue(error);

      const middleware = authenticateAdmin();
      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'TOKEN_EXPIRED',
            message: 'Token expired'
          })
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle invalid token', async () => {
      const token = 'invalid-token';
      const error = new Error('Invalid token');
      error.code = 'INVALID_TOKEN';

      req.headers.authorization = `Bearer ${token}`;
      mockAuthService.extractTokenFromHeader.mockReturnValue(token);
      mockAuthService.verifyAccessToken.mockRejectedValue(error);

      const middleware = authenticateAdmin();
      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'INVALID_TOKEN',
            message: 'Invalid token'
          })
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle user not found', async () => {
      const token = 'valid-token';
      const error = new Error('User not found');
      error.code = 'USER_NOT_FOUND';

      req.headers.authorization = `Bearer ${token}`;
      mockAuthService.extractTokenFromHeader.mockReturnValue(token);
      mockAuthService.verifyAccessToken.mockRejectedValue(error);

      const middleware = authenticateAdmin();
      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'USER_NOT_FOUND',
            message: 'User not found or inactive'
          })
        })
      );
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('optionalAuth', () => {
    it('should authenticate when valid token provided', async () => {
      const token = 'valid-token';
      const decodedUser = {
        user: {
          id: 'user123',
          username: 'admin',
          isActive: true
        }
      };

      req.headers.authorization = `Bearer ${token}`;
      mockAuthService.extractTokenFromHeader.mockReturnValue(token);
      mockAuthService.verifyAccessToken.mockResolvedValue(decodedUser);

      const middleware = optionalAuth();
      await middleware(req, res, next);

      expect(req.user).toEqual(decodedUser.user);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should continue without authentication when no token provided', async () => {
      mockAuthService.extractTokenFromHeader.mockReturnValue(null);

      const middleware = optionalAuth();
      await middleware(req, res, next);

      expect(req.user).toBeUndefined();
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should continue without authentication when token is invalid', async () => {
      const token = 'invalid-token';
      const error = new Error('Invalid token');

      req.headers.authorization = `Bearer ${token}`;
      mockAuthService.extractTokenFromHeader.mockReturnValue(token);
      mockAuthService.verifyAccessToken.mockRejectedValue(error);

      const middleware = optionalAuth();
      await middleware(req, res, next);

      expect(req.user).toBeUndefined();
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('requireActiveUser', () => {
    it('should allow active user to proceed', () => {
      req.user = { isActive: true, username: 'admin' };

      const middleware = requireActiveUser();
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should reject request without user', () => {
      const middleware = requireActiveUser();
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            message: 'Authentication required'
          })
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject inactive user', () => {
      req.user = { isActive: false, username: 'admin' };

      const middleware = requireActiveUser();
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            message: 'User account is inactive'
          })
        })
      );
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('validateTokenFormat', () => {
    it('should validate correct token format', () => {
      const token = 'header.payload.signature';
      req.headers.authorization = `Bearer ${token}`;
      mockAuthService.extractTokenFromHeader.mockReturnValue(token);
      mockAuthService.isValidTokenFormat.mockReturnValue(true);

      const middleware = validateTokenFormat();
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should reject invalid token format', () => {
      const token = 'invalid-format';
      req.headers.authorization = `Bearer ${token}`;
      mockAuthService.extractTokenFromHeader.mockReturnValue(token);
      mockAuthService.isValidTokenFormat.mockReturnValue(false);

      const middleware = validateTokenFormat();
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'INVALID_TOKEN_FORMAT',
            message: 'Invalid token format'
          })
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject request without token', () => {
      mockAuthService.extractTokenFromHeader.mockReturnValue(null);

      const middleware = validateTokenFormat();
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('checkTokenExpiration', () => {
    it('should allow valid token to proceed', () => {
      const token = 'valid-token';
      req.headers.authorization = `Bearer ${token}`;
      mockAuthService.extractTokenFromHeader.mockReturnValue(token);
      mockAuthService.isTokenExpired.mockReturnValue(false);

      const middleware = checkTokenExpiration();
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should reject expired token', () => {
      const token = 'expired-token';
      req.headers.authorization = `Bearer ${token}`;
      mockAuthService.extractTokenFromHeader.mockReturnValue(token);
      mockAuthService.isTokenExpired.mockReturnValue(true);

      const middleware = checkTokenExpiration();
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'TOKEN_EXPIRED',
            message: 'Token expired'
          })
        })
      );
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('rateLimitAuth', () => {
    it('should allow requests within rate limit', () => {
      const middleware = rateLimitAuth(5, 60000); // 5 attempts per minute

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should block requests exceeding rate limit', () => {
      const middleware = rateLimitAuth(2, 60000); // 2 attempts per minute

      // First two requests should pass
      middleware(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);

      middleware(req, res, next);
      expect(next).toHaveBeenCalledTimes(2);

      // Third request should be blocked
      middleware(req, res, next);
      expect(res.status).toHaveBeenCalledWith(429);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many authentication attempts. Please try again later.'
          })
        })
      );
      expect(next).toHaveBeenCalledTimes(2); // Should not call next for third request
    });
  });

  describe('logAuthEvents', () => {
    it('should log successful authentication', () => {
      req.user = { username: 'admin' };
      req.get = jest.fn().mockReturnValue('Mozilla/5.0');

      const middleware = logAuthEvents();
      middleware(req, res, next);

      // Simulate successful response
      res.statusCode = 200;
      res.send('success');

      expect(next).toHaveBeenCalled();
    });

    it('should log failed authentication', () => {
      req.get = jest.fn().mockReturnValue('Mozilla/5.0');

      const middleware = logAuthEvents();
      middleware(req, res, next);

      // Simulate failed response
      res.statusCode = 401;
      res.send('unauthorized');

      expect(next).toHaveBeenCalled();
    });
  });

  describe('AuthMiddleware class', () => {
    let authMiddleware;

    beforeEach(() => {
      authMiddleware = new AuthMiddleware();
    });

    describe('getClientIdentifier', () => {
      it('should return IP address as client identifier', () => {
        req.ip = '192.168.1.1';
        const identifier = authMiddleware.getClientIdentifier(req);
        expect(identifier).toBe('192.168.1.1');
      });

      it('should fallback to connection remote address', () => {
        delete req.ip;
        req.connection.remoteAddress = '192.168.1.2';
        const identifier = authMiddleware.getClientIdentifier(req);
        expect(identifier).toBe('192.168.1.2');
      });

      it('should return unknown if no IP available', () => {
        delete req.ip;
        delete req.connection.remoteAddress;
        const identifier = authMiddleware.getClientIdentifier(req);
        expect(identifier).toBe('unknown');
      });
    });

    describe('combine', () => {
      it('should combine multiple middlewares', () => {
        const middleware1 = jest.fn((req, res, next) => next());
        const middleware2 = jest.fn((req, res, next) => next());
        const middleware3 = jest.fn((req, res, next) => next());

        const combined = authMiddleware.combine([middleware1, middleware2, middleware3]);
        combined(req, res, next);

        expect(middleware1).toHaveBeenCalled();
        expect(middleware2).toHaveBeenCalled();
        expect(middleware3).toHaveBeenCalled();
        expect(next).toHaveBeenCalled();
      });

      it('should stop on middleware error', () => {
        const error = new Error('Middleware error');
        const middleware1 = jest.fn((req, res, next) => next());
        const middleware2 = jest.fn((req, res, next) => next(error));
        const middleware3 = jest.fn((req, res, next) => next());

        const combined = authMiddleware.combine([middleware1, middleware2, middleware3]);
        combined(req, res, next);

        expect(middleware1).toHaveBeenCalled();
        expect(middleware2).toHaveBeenCalled();
        expect(middleware3).not.toHaveBeenCalled();
        expect(next).toHaveBeenCalledWith(error);
      });
    });

    describe('createAdminAuthChain', () => {
      it('should create complete authentication chain', () => {
        const chain = authMiddleware.createAdminAuthChain();
        expect(typeof chain).toBe('function');
      });

      it('should create chain with custom options', () => {
        const chain = authMiddleware.createAdminAuthChain({
          enableRateLimit: false,
          enableLogging: false
        });
        expect(typeof chain).toBe('function');
      });
    });
  });
});