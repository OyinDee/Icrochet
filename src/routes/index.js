const express = require('express');

// Import route modules
const adminAuthRoutes = require('./adminAuth');
const adminItemRoutes = require('./adminItems');
const adminCategoryRoutes = require('./adminCategories');
const adminOrderRoutes = require('./adminOrders');
const adminConversationRoutes = require('./adminConversations');
const adminUploadRoutes = require('./adminUpload');
const adminEmailRoutes = require('./adminEmails');
const publicItemRoutes = require('./publicItems');
const publicOrderRoutes = require('./publicOrders');
const publicConversationRoutes = require('./publicConversations');

const router = express.Router();

/**
 * API Routes Structure:
 * 
 * /api/v1/admin/auth/*     - Admin authentication routes
 * /api/v1/admin/items/*    - Admin item management routes
 * /api/v1/admin/categories/* - Admin category management routes
 * /api/v1/admin/upload/*   - Admin image upload routes
 * /api/v1/admin/orders/*   - Admin order management routes
 * /api/v1/admin/conversations/* - Admin conversation routes
 * /api/v1/admin/emails/*   - Admin email management routes
 * /api/v1/public/items/*   - Public item browsing routes
 * /api/v1/public/orders/*  - Public order placement routes
 * /api/v1/public/conversations/* - Public conversation routes
 */

// Admin routes
router.use('/admin/auth', adminAuthRoutes);
router.use('/admin/items', adminItemRoutes);
router.use('/admin/categories', adminCategoryRoutes);
router.use('/admin/orders', adminOrderRoutes);
router.use('/admin/upload', adminUploadRoutes);
router.use('/admin/conversations', adminConversationRoutes);
router.use('/admin/emails', adminEmailRoutes);

// Public routes
router.use('/public/items', publicItemRoutes);
router.use('/public/orders', publicOrderRoutes);
router.use('/public/conversations', publicConversationRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API is healthy',
    data: {
      status: 'operational',
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    },
    timestamp: new Date().toISOString()
  });
});

// API info endpoint
router.get('/info', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Crochet Business API',
    data: {
      name: 'Crochet Business API',
      version: '1.0.0',
      description: 'API for ICrochet with custom orders, messaging, and flexible pricing',
      endpoints: {
        admin: {
          auth: '/api/v1/admin/auth',
          items: '/api/v1/admin/items',
          categories: '/api/v1/admin/categories',
          orders: '/api/v1/admin/orders',
          upload: '/api/v1/admin/upload',
          conversations: '/api/v1/admin/conversations',
          emails: '/api/v1/admin/emails'
        },
        public: {
          items: '/api/v1/public/items',
          orders: '/api/v1/public/orders',
          conversations: '/api/v1/public/conversations'
        },
        utility: {
          health: '/api/v1/health',
          info: '/api/v1/info'
        }
      }
    },
    timestamp: new Date().toISOString()
  });
});

// 404 handler for API routes
router.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'ENDPOINT_NOT_FOUND',
      message: `API endpoint not found: ${req.method} ${req.originalUrl}`,
      details: {
        method: req.method,
        path: req.originalUrl,
        availableEndpoints: '/api/v1/info'
      }
    },
    timestamp: new Date().toISOString()
  });
});

module.exports = router;