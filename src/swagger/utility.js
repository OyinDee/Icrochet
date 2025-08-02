/**
 * @swagger
 * /health:
 *   get:
 *     tags: [Utility]
 *     summary: Health check
 *     description: Check the health status of the API
 *     responses:
 *       200:
 *         description: API is healthy
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         status:
 *                           type: string
 *                           example: "operational"
 *                         version:
 *                           type: string
 *                           example: "1.0.0"
 *                         uptime:
 *                           type: number
 *                           example: 3600.5
 *                           description: Server uptime in seconds
 *                         database:
 *                           type: object
 *                           properties:
 *                             status:
 *                               type: string
 *                               example: "connected"
 *                             responseTime:
 *                               type: number
 *                               example: 15.2
 *                               description: Database response time in milliseconds
 *                         memory:
 *                           type: object
 *                           properties:
 *                             used:
 *                               type: number
 *                               example: 45.6
 *                               description: Used memory in MB
 *                             total:
 *                               type: number
 *                               example: 512.0
 *                               description: Total available memory in MB
 *                             percentage:
 *                               type: number
 *                               example: 8.9
 *                               description: Memory usage percentage
 *             example:
 *               success: true
 *               message: "API is healthy"
 *               data:
 *                 status: "operational"
 *                 version: "1.0.0"
 *                 uptime: 3600.5
 *                 database:
 *                   status: "connected"
 *                   responseTime: 15.2
 *                 memory:
 *                   used: 45.6
 *                   total: 512.0
 *                   percentage: 8.9
 *               timestamp: "2024-01-01T00:00:00.000Z"
 *       503:
 *         description: API is unhealthy
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               error:
 *                 code: "SERVICE_UNHEALTHY"
 *                 message: "API health check failed"
 *                 details:
 *                   database:
 *                     status: "disconnected"
 *                     error: "Connection timeout"
 *               timestamp: "2024-01-01T00:00:00.000Z"
 *
 * /info:
 *   get:
 *     tags: [Utility]
 *     summary: API information
 *     description: Get information about the API including available endpoints
 *     responses:
 *       200:
 *         description: API information retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         name:
 *                           type: string
 *                           example: "Crochet Business API"
 *                         version:
 *                           type: string
 *                           example: "1.0.0"
 *                         description:
 *                           type: string
 *                           example: "API for ICrochet with custom orders, messaging, and flexible pricing"
 *                         documentation:
 *                           type: string
 *                           format: uri
 *                           example: "http://localhost:3000/api-docs"
 *                         endpoints:
 *                           type: object
 *                           properties:
 *                             admin:
 *                               type: object
 *                               properties:
 *                                 auth:
 *                                   type: string
 *                                   example: "/api/v1/admin/auth"
 *                                 items:
 *                                   type: string
 *                                   example: "/api/v1/admin/items"
 *                                 categories:
 *                                   type: string
 *                                   example: "/api/v1/admin/categories"
 *                                 orders:
 *                                   type: string
 *                                   example: "/api/v1/admin/orders"
 *                                 upload:
 *                                   type: string
 *                                   example: "/api/v1/admin/upload"
 *                                 conversations:
 *                                   type: string
 *                                   example: "/api/v1/admin/conversations"
 *                                 emails:
 *                                   type: string
 *                                   example: "/api/v1/admin/emails"
 *                             public:
 *                               type: object
 *                               properties:
 *                                 items:
 *                                   type: string
 *                                   example: "/api/v1/public/items"
 *                                 orders:
 *                                   type: string
 *                                   example: "/api/v1/public/orders"
 *                                 conversations:
 *                                   type: string
 *                                   example: "/api/v1/public/conversations"
 *                             utility:
 *                               type: object
 *                               properties:
 *                                 health:
 *                                   type: string
 *                                   example: "/api/v1/health"
 *                                 info:
 *                                   type: string
 *                                   example: "/api/v1/info"
 *                         features:
 *                           type: array
 *                           items:
 *                             type: string
 *                           example:
 *                             - "Flexible pricing (fixed, range, custom)"
 *                             - "Real-time messaging with Socket.io"
 *                             - "Image upload with Cloudinary"
 *                             - "Email notifications"
 *                             - "Order management"
 *                             - "Category management"
 *                             - "Admin authentication"
 *                         contact:
 *                           type: object
 *                           properties:
 *                             email:
 *                               type: string
 *                               format: email
 *                               example: "admin@crochetbusiness.com"
 *                             support:
 *                               type: string
 *                               example: "For API support, please contact the development team"
 *             example:
 *               success: true
 *               message: "Crochet Business API"
 *               data:
 *                 name: "Crochet Business API"
 *                 version: "1.0.0"
 *                 description: "API for ICrochet with custom orders, messaging, and flexible pricing"
 *                 documentation: "http://localhost:3000/api-docs"
 *                 endpoints:
 *                   admin:
 *                     auth: "/api/v1/admin/auth"
 *                     items: "/api/v1/admin/items"
 *                     categories: "/api/v1/admin/categories"
 *                     orders: "/api/v1/admin/orders"
 *                     upload: "/api/v1/admin/upload"
 *                     conversations: "/api/v1/admin/conversations"
 *                     emails: "/api/v1/admin/emails"
 *                   public:
 *                     items: "/api/v1/public/items"
 *                     orders: "/api/v1/public/orders"
 *                     conversations: "/api/v1/public/conversations"
 *                   utility:
 *                     health: "/api/v1/health"
 *                     info: "/api/v1/info"
 *                 features:
 *                   - "Flexible pricing (fixed, range, custom)"
 *                   - "Real-time messaging with Socket.io"
 *                   - "Image upload with Cloudinary"
 *                   - "Email notifications"
 *                   - "Order management"
 *                   - "Category management"
 *                   - "Admin authentication"
 *                 contact:
 *                   email: "admin@crochetbusiness.com"
 *                   support: "For API support, please contact the development team"
 *               timestamp: "2024-01-01T00:00:00.000Z"
 */