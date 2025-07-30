const { MongoMemoryServer } = require('mongodb-memory-server');
const database = require('../src/config/database');

let mongoServer;

// Setup before all tests
beforeAll(async () => {
  // Start in-memory MongoDB instance
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.MONGODB_TEST_URI = mongoUri;
  process.env.JWT_SECRET = 'test-jwt-secret';
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
  
  // Don't auto-connect here - let individual tests handle connection
}, 60000); // Increase timeout for MongoDB Memory Server startup

// Cleanup after each test
afterEach(async () => {
  if (database.isConnected) {
    await database.clearDatabase();
  }
});

// Cleanup after all tests
afterAll(async () => {
  if (database.isConnected) {
    await database.disconnect();
  }
  if (mongoServer) {
    await mongoServer.stop();
  }
}, 60000);