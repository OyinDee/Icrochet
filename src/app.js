// Load environment variables first
require('dotenv').config();

const express = require('express');
const http = require('http');
const cors = require('cors');
const config = require('./config');
const database = require('./config/database');
const logger = require('./config/logger');
const routes = require('./routes');
const SocketService = require('./services/SocketService');
const { specs, swaggerUi } = require('./config/swagger');

/**
 * Express application setup
 */
class App {
  constructor() {
    this.app = express();
    this.server = http.createServer(this.app);
    this.port = config.port;
    this.socketService = new SocketService();
    
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
    this.setupSocketIO();
  }

  /**
   * Setup middleware
   */
  setupMiddleware() {
    // CORS configuration
    this.app.use(cors({
      origin: process.env.NODE_ENV === 'production' 
        ? ['https://yourdomain.com'] // Replace with actual domain
        : true, // Allow all origins in development
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization']
    }));

    // Body parsing middleware
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Request logging middleware
    this.app.use((req, res, next) => {
      logger.http(`${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        body: req.method !== 'GET' ? req.body : undefined
      });
      next();
    });

    // Security headers
    this.app.use((req, res, next) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('X-XSS-Protection', '1; mode=block');
      next();
    });
  }

  /**
   * Setup routes
   */
  setupRoutes() {
    // Swagger documentation
    this.app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
      explorer: true,
      customCss: '.swagger-ui .topbar { display: none }',
      customSiteTitle: 'Crochet Business API Documentation',
      swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
        filter: true,
        showExtensions: true,
        showCommonExtensions: true
      }
    }));

    // API routes
    this.app.use('/api/v1', routes);

    // Root endpoint
    this.app.get('/', (req, res) => {
      res.status(200).json({
        success: true,
        message: 'Welcome to Crochet Business API',
        data: {
          name: 'Crochet Business API',
          version: '1.0.0',
          documentation: '/api-docs',
          apiInfo: '/api/v1/info',
          health: '/api/v1/health'
        },
        timestamp: new Date().toISOString()
      });
    });

    // 404 handler for non-API routes
    this.app.use('*', (req, res) => {
      res.status(404).json({
        success: false,
        error: {
          code: 'ROUTE_NOT_FOUND',
          message: `Route not found: ${req.method} ${req.originalUrl}`,
          details: {
            method: req.method,
            path: req.originalUrl,
            suggestion: 'Check /api/v1/info for available endpoints'
          }
        },
        timestamp: new Date().toISOString()
      });
    });
  }

  /**
   * Setup error handling
   */
  setupErrorHandling() {
    // Global error handler
    this.app.use((error, req, res, next) => {
      logger.error('Unhandled error:', error);

      // Don't send error details in production
      const isDevelopment = process.env.NODE_ENV === 'development';

      res.status(error.status || 500).json({
        success: false,
        error: {
          code: error.code || 'INTERNAL_SERVER_ERROR',
          message: error.message || 'An unexpected error occurred',
          details: isDevelopment ? {
            stack: error.stack,
            ...error.details
          } : {}
        },
        timestamp: new Date().toISOString()
      });
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      process.exit(1);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
      process.exit(1);
    });
  }

  /**
   * Connect to database
   */
  async connectDatabase() {
    try {
      await database.connect();
      logger.info('Database connected successfully');
    } catch (error) {
      logger.error('Database connection failed:', error);
      throw error;
    }
  }

  /**
   * Start the server
   */
  async start() {
    try {
      // Connect to database first
      await this.connectDatabase();

      // Start server
      this.server.listen(this.port, () => {
        logger.info(`Server running on port ${this.port}`);
        logger.info(`Environment: ${config.nodeEnv}`);
        logger.info(`API Documentation: http://localhost:${this.port}/api-docs`);
        logger.info(`API Info: http://localhost:${this.port}/api/v1/info`);
        logger.info(`Socket.io enabled for real-time messaging`);
      });

      // Graceful shutdown
      this.setupGracefulShutdown();

    } catch (error) {
      logger.error('Failed to start server:', error);
      process.exit(1);
    }
  }

  /**
   * Setup Socket.io server
   */
  setupSocketIO() {
    try {
      this.socketService.initialize(this.server);
      logger.info('Socket.io service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Socket.io service:', error);
      throw error;
    }
  }

  /**
   * Setup graceful shutdown
   */
  setupGracefulShutdown() {
    const shutdown = async (signal) => {
      logger.info(`Received ${signal}. Starting graceful shutdown...`);

      // Stop accepting new connections
      this.server.close(async () => {
        logger.info('HTTP server closed');

        try {
          // Close database connection
          await database.disconnect();
          logger.info('Database disconnected');

          logger.info('Graceful shutdown completed');
          process.exit(0);
        } catch (error) {
          logger.error('Error during shutdown:', error);
          process.exit(1);
        }
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  }

  /**
   * Get Express app instance
   */
  getApp() {
    return this.app;
  }

  /**
   * Get HTTP server instance
   */
  getServer() {
    return this.server;
  }

  /**
   * Get Socket.io service instance
   */
  getSocketService() {
    return this.socketService;
  }
}

// Create and export app instance
const appInstance = new App();

// Start server if this file is run directly
if (require.main === module) {
  appInstance.start();
}

module.exports = appInstance.getApp();