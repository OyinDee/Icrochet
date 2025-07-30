const { MongoMemoryServer } = require('mongodb-memory-server');
const database = require('../../../src/config/database');

describe('Database Connection', () => {
  let mongoServer;
  let originalTestUri;

  beforeAll(async () => {
    originalTestUri = process.env.MONGODB_TEST_URI;
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    process.env.MONGODB_TEST_URI = mongoUri;
    process.env.NODE_ENV = 'test';
  }, 60000);

  afterAll(async () => {
    await database.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  afterEach(async () => {
    if (database.isConnected) {
      await database.clearDatabase();
    }
  });

  describe('connect()', () => {
    it('should connect to MongoDB successfully', async () => {
      const connection = await database.connect();
      expect(connection).toBeDefined();
      expect(database.isConnected).toBe(true);
    });

    it('should return existing connection if already connected', async () => {
      await database.connect();
      const connection1 = database.connection;
      
      const connection2 = await database.connect();
      expect(connection2).toBe(connection1);
    });

    it('should throw error if MongoDB URI is not defined', async () => {
      // Disconnect first to reset connection state
      await database.disconnect();
      
      const originalUri = process.env.MONGODB_TEST_URI;
      delete process.env.MONGODB_TEST_URI;
      
      await expect(database.connect()).rejects.toThrow('MongoDB URI is not defined in environment variables');
      
      process.env.MONGODB_TEST_URI = originalUri;
    });
  });

  describe('disconnect()', () => {
    it('should disconnect from MongoDB successfully', async () => {
      await database.connect();
      expect(database.isConnected).toBe(true);
      
      await database.disconnect();
      expect(database.isConnected).toBe(false);
    });

    it('should handle disconnect when not connected', async () => {
      await expect(database.disconnect()).resolves.not.toThrow();
    });
  });

  describe('getConnectionState()', () => {
    it('should return connection state information', async () => {
      await database.connect();
      
      const state = database.getConnectionState();
      expect(state).toHaveProperty('isConnected');
      expect(state).toHaveProperty('readyState');
      expect(state).toHaveProperty('host');
      expect(state).toHaveProperty('port');
      expect(state).toHaveProperty('name');
      expect(state.isConnected).toBe(true);
    });
  });

  describe('healthCheck()', () => {
    it('should return healthy status when connected', async () => {
      await database.connect();
      
      const health = await database.healthCheck();
      expect(health.status).toBe('healthy');
      expect(health.message).toBe('Database connection is healthy');
      expect(health.details).toBeDefined();
    });

    it('should return disconnected status when not connected', async () => {
      // Ensure database is disconnected
      await database.disconnect();
      
      const health = await database.healthCheck();
      expect(health.status).toBe('disconnected');
      expect(health.message).toBe('Database is not connected');
    });
  });

  describe('clearDatabase()', () => {
    it('should clear database in test environment', async () => {
      await database.connect();
      
      // This should not throw in test environment
      await expect(database.clearDatabase()).resolves.not.toThrow();
    });

    it('should throw error in non-test environment', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      
      await expect(database.clearDatabase()).rejects.toThrow('Database clearing is only allowed in test environment');
      
      process.env.NODE_ENV = originalEnv;
    });
  });
});