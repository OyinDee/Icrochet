const jwt = require('jsonwebtoken');
const AuthService = require('../../../src/services/AuthService');
const { AdminUserRepository } = require('../../../src/repositories');

// Mock the repository
jest.mock('../../../src/repositories');
jest.mock('../../../src/config', () => ({
  jwt: {
    secret: 'test-secret',
    expiresIn: '1h',
    refreshSecret: 'test-refresh-secret',
    refreshExpiresIn: '7d'
  }
}));

describe('AuthService', () => {
  let authService;
  let mockAdminUserRepository;
  let mockUser;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create mock user
    mockUser = {
      _id: 'user123',
      username: 'testuser',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      fullName: 'Test User',
      isActive: true,
      lastLoginAt: new Date(),
      verifyPassword: jest.fn(),
      updateLastLogin: jest.fn()
    };

    // Mock repository methods
    mockAdminUserRepository = {
      verifyCredentials: jest.fn(),
      findById: jest.fn(),
      createWithPassword: jest.fn(),
      updatePassword: jest.fn()
    };

    AdminUserRepository.mockImplementation(() => mockAdminUserRepository);
    
    authService = new AuthService();
  });

  describe('authenticateAdmin', () => {
    it('should authenticate admin with valid credentials', async () => {
      mockAdminUserRepository.verifyCredentials.mockResolvedValue(mockUser);

      const result = await authService.authenticateAdmin('testuser', 'password123');

      expect(result.success).toBe(true);
      expect(result.user.username).toBe('testuser');
      expect(result.tokens).toBeDefined();
      expect(result.tokens.accessToken).toBeDefined();
      expect(result.tokens.refreshToken).toBeDefined();
      expect(mockAdminUserRepository.verifyCredentials).toHaveBeenCalledWith('testuser', 'password123');
    });

    it('should throw error with invalid credentials', async () => {
      mockAdminUserRepository.verifyCredentials.mockResolvedValue(null);

      await expect(authService.authenticateAdmin('testuser', 'wrongpassword'))
        .rejects.toThrow('Invalid credentials');
    });
  });

  describe('generateTokens', () => {
    it('should generate access and refresh tokens', async () => {
      const tokens = await authService.generateTokens(mockUser);

      expect(tokens.accessToken).toBeDefined();
      expect(tokens.refreshToken).toBeDefined();
      expect(tokens.tokenType).toBe('Bearer');
      expect(tokens.accessTokenExpiry).toBeInstanceOf(Date);
      expect(tokens.refreshTokenExpiry).toBeInstanceOf(Date);

      // Verify token contents
      const decodedAccess = jwt.decode(tokens.accessToken);
      expect(decodedAccess.userId).toBe(mockUser._id);
      expect(decodedAccess.username).toBe(mockUser.username);
      expect(decodedAccess.type).toBe('admin');

      const decodedRefresh = jwt.decode(tokens.refreshToken);
      expect(decodedRefresh.userId).toBe(mockUser._id);
      expect(decodedRefresh.type).toBe('refresh');
    });
  });

  describe('verifyAccessToken', () => {
    it('should verify valid access token', async () => {
      const tokens = await authService.generateTokens(mockUser);
      mockAdminUserRepository.findById.mockResolvedValue(mockUser);

      const result = await authService.verifyAccessToken(tokens.accessToken);

      expect(result.userId).toBe(mockUser._id);
      expect(result.username).toBe(mockUser.username);
      expect(result.user).toBeDefined();
      expect(mockAdminUserRepository.findById).toHaveBeenCalledWith(mockUser._id);
    });

    it('should throw error for invalid token', async () => {
      await expect(authService.verifyAccessToken('invalid-token'))
        .rejects.toThrow('Invalid token');
    });

    it('should throw error for expired token', async () => {
      // Create expired token
      const expiredToken = jwt.sign(
        { userId: mockUser._id, username: mockUser.username, type: 'admin' },
        'test-secret',
        { expiresIn: '-1h', issuer: 'crochet-business-api', audience: 'crochet-business-admin' }
      );

      await expect(authService.verifyAccessToken(expiredToken))
        .rejects.toThrow('Token expired');
    });

    it('should throw error if user not found', async () => {
      const tokens = await authService.generateTokens(mockUser);
      mockAdminUserRepository.findById.mockResolvedValue(null);

      await expect(authService.verifyAccessToken(tokens.accessToken))
        .rejects.toThrow('User not found or inactive');
    });

    it('should throw error if user is inactive', async () => {
      const tokens = await authService.generateTokens(mockUser);
      mockAdminUserRepository.findById.mockResolvedValue({ ...mockUser, isActive: false });

      await expect(authService.verifyAccessToken(tokens.accessToken))
        .rejects.toThrow('User not found or inactive');
    });
  });

  describe('verifyRefreshToken', () => {
    it('should verify valid refresh token', async () => {
      const tokens = await authService.generateTokens(mockUser);
      mockAdminUserRepository.findById.mockResolvedValue(mockUser);

      const result = await authService.verifyRefreshToken(tokens.refreshToken);

      expect(result.userId).toBe(mockUser._id);
      expect(result.type).toBe('refresh');
      expect(result.user).toBeDefined();
    });

    it('should throw error for invalid refresh token', async () => {
      await expect(authService.verifyRefreshToken('invalid-token'))
        .rejects.toThrow('Invalid refresh token');
    });

    it('should throw error for wrong token type', async () => {
      const tokens = await authService.generateTokens(mockUser);
      
      await expect(authService.verifyRefreshToken(tokens.accessToken))
        .rejects.toThrow('Invalid token type');
    });
  });

  describe('refreshTokens', () => {
    it('should refresh tokens with valid refresh token', async () => {
      const originalTokens = await authService.generateTokens(mockUser);
      mockAdminUserRepository.findById.mockResolvedValue(mockUser);

      const result = await authService.refreshTokens(originalTokens.refreshToken);

      expect(result.success).toBe(true);
      expect(result.user.username).toBe(mockUser.username);
      expect(result.tokens.accessToken).toBeDefined();
      expect(result.tokens.refreshToken).toBeDefined();
      expect(result.tokens.accessToken).not.toBe(originalTokens.accessToken);
    });

    it('should throw error with invalid refresh token', async () => {
      await expect(authService.refreshTokens('invalid-token'))
        .rejects.toThrow('Invalid refresh token');
    });
  });

  describe('hashPassword', () => {
    it('should hash password', async () => {
      const password = 'testpassword123';
      const hashedPassword = await authService.hashPassword(password);

      expect(hashedPassword).toBeDefined();
      expect(hashedPassword).not.toBe(password);
      expect(hashedPassword.length).toBeGreaterThan(50); // bcrypt hashes are long
    });
  });

  describe('verifyPassword', () => {
    it('should verify correct password', async () => {
      const password = 'testpassword123';
      const hashedPassword = await authService.hashPassword(password);

      const isValid = await authService.verifyPassword(password, hashedPassword);
      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const password = 'testpassword123';
      const hashedPassword = await authService.hashPassword(password);

      const isValid = await authService.verifyPassword('wrongpassword', hashedPassword);
      expect(isValid).toBe(false);
    });
  });

  describe('extractTokenFromHeader', () => {
    it('should extract token from valid Bearer header', () => {
      const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9';
      const header = `Bearer ${token}`;

      const extracted = authService.extractTokenFromHeader(header);
      expect(extracted).toBe(token);
    });

    it('should return null for invalid header format', () => {
      expect(authService.extractTokenFromHeader('InvalidHeader')).toBeNull();
      expect(authService.extractTokenFromHeader('Basic token')).toBeNull();
      expect(authService.extractTokenFromHeader('')).toBeNull();
      expect(authService.extractTokenFromHeader(null)).toBeNull();
    });
  });

  describe('parseExpirationTime', () => {
    it('should parse various time formats', () => {
      expect(authService.parseExpirationTime('30s')).toBe(30 * 1000);
      expect(authService.parseExpirationTime('15m')).toBe(15 * 60 * 1000);
      expect(authService.parseExpirationTime('24h')).toBe(24 * 60 * 60 * 1000);
      expect(authService.parseExpirationTime('7d')).toBe(7 * 24 * 60 * 60 * 1000);
    });

    it('should throw error for invalid format', () => {
      expect(() => authService.parseExpirationTime('invalid')).toThrow();
      expect(() => authService.parseExpirationTime('1x')).toThrow();
      expect(() => authService.parseExpirationTime('')).toThrow();
    });
  });

  describe('isValidTokenFormat', () => {
    it('should validate JWT token format', () => {
      const validToken = 'header.payload.signature';
      const invalidToken = 'invalid-token';

      expect(authService.isValidTokenFormat(validToken)).toBe(true);
      expect(authService.isValidTokenFormat(invalidToken)).toBe(false);
      expect(authService.isValidTokenFormat('')).toBe(false);
      expect(authService.isValidTokenFormat(null)).toBe(false);
    });
  });

  describe('getTokenExpiration', () => {
    it('should get token expiration date', async () => {
      const tokens = await authService.generateTokens(mockUser);
      const expiration = authService.getTokenExpiration(tokens.accessToken);

      expect(expiration).toBeInstanceOf(Date);
      expect(expiration.getTime()).toBeGreaterThan(Date.now());
    });

    it('should return null for invalid token', () => {
      const expiration = authService.getTokenExpiration('invalid-token');
      expect(expiration).toBeNull();
    });
  });

  describe('isTokenExpired', () => {
    it('should detect expired token', () => {
      const expiredToken = jwt.sign(
        { userId: 'test' },
        'test-secret',
        { expiresIn: '-1h' }
      );

      expect(authService.isTokenExpired(expiredToken)).toBe(true);
    });

    it('should detect valid token', async () => {
      const tokens = await authService.generateTokens(mockUser);
      expect(authService.isTokenExpired(tokens.accessToken)).toBe(false);
    });

    it('should return true for invalid token', () => {
      expect(authService.isTokenExpired('invalid-token')).toBe(true);
    });
  });

  describe('createAdminUser', () => {
    it('should create admin user', async () => {
      const userData = {
        username: 'newuser',
        email: 'new@example.com',
        firstName: 'New',
        lastName: 'User'
      };

      mockAdminUserRepository.createWithPassword.mockResolvedValue({
        ...mockUser,
        ...userData
      });

      const result = await authService.createAdminUser(userData, 'password123');

      expect(result.username).toBe(userData.username);
      expect(result.email).toBe(userData.email);
      expect(result.id).toBeDefined();
      expect(mockAdminUserRepository.createWithPassword).toHaveBeenCalledWith(userData, 'password123');
    });
  });

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      mockAdminUserRepository.updatePassword.mockResolvedValue(mockUser);

      const result = await authService.changePassword('user123', 'oldpass', 'newpass');

      expect(result.success).toBe(true);
      expect(result.message).toBe('Password changed successfully');
      expect(mockAdminUserRepository.updatePassword).toHaveBeenCalledWith('user123', 'oldpass', 'newpass');
    });

    it('should throw error if user not found', async () => {
      mockAdminUserRepository.updatePassword.mockResolvedValue(null);

      await expect(authService.changePassword('user123', 'oldpass', 'newpass'))
        .rejects.toThrow('User not found');
    });
  });
});