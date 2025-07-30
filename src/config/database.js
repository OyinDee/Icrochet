const mongoose = require('mongoose');
const logger = require('./logger');

class Database {
  constructor() {
    this.connection = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
  }

  async connect() {
    try {
      if (this.isConnected) {
        logger.info('MongoDB is already connected');
        return this.connection;
      }

      const mongoUri = process.env.NODE_ENV === 'test' 
        ? process.env.MONGODB_TEST_URI 
        : process.env.MONGODB_URI;

      if (!mongoUri) {
        throw new Error('MongoDB URI is not defined in environment variables');
      }

      const options = {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        bufferCommands: false,
      };

      this.connection = await mongoose.connect(mongoUri, options);
      this.isConnected = true;
      this.reconnectAttempts = 0;
      
      logger.info(`MongoDB connected successfully to ${mongoUri.replace(/\/\/.*@/, '//***:***@')}`);
      
      // Handle connection events
      mongoose.connection.on('connected', () => {
        this.isConnected = true;
        logger.info('MongoDB connected');
      });

      mongoose.connection.on('error', (error) => {
        this.isConnected = false;
        logger.error('MongoDB connection error:', error);
        this.handleReconnection();
      });

      mongoose.connection.on('disconnected', () => {
        this.isConnected = false;
        logger.warn('MongoDB disconnected');
        if (process.env.NODE_ENV !== 'test') {
          this.handleReconnection();
        }
      });

      mongoose.connection.on('reconnected', () => {
        this.isConnected = true;
        this.reconnectAttempts = 0;
        logger.info('MongoDB reconnected successfully');
      });

      return this.connection;
    } catch (error) {
      this.isConnected = false;
      logger.error('Failed to connect to MongoDB:', error);
      throw error;
    }
  }

  async handleReconnection() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.error(`Max reconnection attempts (${this.maxReconnectAttempts}) reached. Giving up.`);
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000); // Exponential backoff, max 30s
    
    logger.info(`Attempting to reconnect to MongoDB (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${delay}ms`);
    
    setTimeout(async () => {
      try {
        await this.connect();
      } catch (error) {
        logger.error('Reconnection attempt failed:', error);
      }
    }, delay);
  }

  async disconnect() {
    try {
      if (this.connection) {
        this.isConnected = false;
        await mongoose.disconnect();
        logger.info('MongoDB disconnected successfully');
      }
    } catch (error) {
      logger.error('Error disconnecting from MongoDB:', error);
      throw error;
    }
  }

  getConnectionState() {
    return {
      isConnected: this.isConnected,
      readyState: mongoose.connection.readyState,
      host: mongoose.connection.host,
      port: mongoose.connection.port,
      name: mongoose.connection.name,
    };
  }

  async healthCheck() {
    try {
      if (!this.isConnected) {
        return { status: 'disconnected', message: 'Database is not connected' };
      }

      // Perform a simple ping to check database responsiveness
      await mongoose.connection.db.admin().ping();
      
      return {
        status: 'healthy',
        message: 'Database connection is healthy',
        details: this.getConnectionState(),
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: 'Database health check failed',
        error: error.message,
      };
    }
  }

  async clearDatabase() {
    if (process.env.NODE_ENV !== 'test') {
      throw new Error('Database clearing is only allowed in test environment');
    }
    
    try {
      const collections = mongoose.connection.collections;
      for (const key in collections) {
        await collections[key].deleteMany({});
      }
      logger.info('Test database cleared successfully');
    } catch (error) {
      logger.error('Error clearing test database:', error);
      throw error;
    }
  }
}

module.exports = new Database();