const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;

/**
 * Connect to in-memory MongoDB instance for testing
 */
async function connectDB() {
  try {
    // Create in-memory MongoDB instance
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();

    // Connect to the in-memory database
    await mongoose.connect(mongoUri);

    console.log('Connected to in-memory MongoDB for testing');
  } catch (error) {
    console.error('Error connecting to test database:', error);
    throw error;
  }
}

/**
 * Disconnect from MongoDB and stop the in-memory server
 */
async function disconnectDB() {
  try {
    // Close mongoose connection
    await mongoose.connection.close();

    // Stop the in-memory MongoDB server
    if (mongoServer) {
      await mongoServer.stop();
    }

    console.log('Disconnected from test database');
  } catch (error) {
    console.error('Error disconnecting from test database:', error);
    throw error;
  }
}

/**
 * Clear all data from the test database
 */
async function clearDB() {
  try {
    const collections = mongoose.connection.collections;

    // Clear all collections
    for (const key in collections) {
      const collection = collections[key];
      await collection.deleteMany({});
    }

    console.log('Test database cleared');
  } catch (error) {
    console.error('Error clearing test database:', error);
    throw error;
  }
}

/**
 * Drop the entire test database
 */
async function dropDB() {
  try {
    await mongoose.connection.dropDatabase();
    console.log('Test database dropped');
  } catch (error) {
    console.error('Error dropping test database:', error);
    throw error;
  }
}

/**
 * Get database connection status
 */
function getConnectionStatus() {
  return mongoose.connection.readyState;
}

/**
 * Wait for database connection to be ready
 */
async function waitForConnection(timeout = 10000) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();

    const checkConnection = () => {
      if (mongoose.connection.readyState === 1) {
        resolve();
      } else if (Date.now() - startTime > timeout) {
        reject(new Error('Database connection timeout'));
      } else {
        setTimeout(checkConnection, 100);
      }
    };

    checkConnection();
  });
}

/**
 * Create test data helper
 */
async function createTestData(modelName, data) {
  try {
    const Model = mongoose.model(modelName);
    const document = new Model(data);
    await document.save();
    return document;
  } catch (error) {
    console.error(`Error creating test ${modelName}:`, error);
    throw error;
  }
}

/**
 * Find test data helper
 */
async function findTestData(modelName, query = {}) {
  try {
    const Model = mongoose.model(modelName);
    return await Model.find(query);
  } catch (error) {
    console.error(`Error finding test ${modelName}:`, error);
    throw error;
  }
}

/**
 * Count documents in collection
 */
async function countDocuments(modelName, query = {}) {
  try {
    const Model = mongoose.model(modelName);
    return await Model.countDocuments(query);
  } catch (error) {
    console.error(`Error counting ${modelName}:`, error);
    throw error;
  }
}

module.exports = {
  connectDB,
  disconnectDB,
  clearDB,
  dropDB,
  getConnectionStatus,
  waitForConnection,
  createTestData,
  findTestData,
  countDocuments
};