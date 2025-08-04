const mongoose = require('mongoose');
const logger = require('./logger');

class Database {
  async connect() {
    const uri = process.env.NODE_ENV === 'test'
      ? process.env.MONGODB_TEST_URI
      : process.env.MONGODB_URI;

    if (!uri) throw new Error('MongoDB URI is not defined');

    try {
      await mongoose.connect(uri, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        bufferCommands: false,
      });

      logger.info(`MongoDB connected to ${uri.replace(/\/\/.*@/, '//***:***@')}`);
    } catch (err) {
      logger.error('MongoDB connection failed:', err);
      throw err;
    }
  }

  async disconnect() {
    try {
      await mongoose.disconnect();
      logger.info('MongoDB disconnected');
    } catch (err) {
      logger.error('Error disconnecting MongoDB:', err);
    }
  }
}

module.exports = new Database();
