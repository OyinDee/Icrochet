/**
 * @swagger
 * /admin/orders:
 *   get:
 *     tags: [Admin Orders]
 *     summary: Get all orders
 *     description: Retrieve all orders with filtering, searching, and pagination
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of orders per page
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [createdAt, updatedAt, totalAmount, status, customerName]
 *           default: createdAt
 *         description: Field to sort by
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, quote_needed, quoted, confirmed, processing, shipped, delivered, cancelled]
 *         description: Filter by order status
 *       - in: query
 *         name: hasCustomItems
 *         schema:
 *           type: boolean
 *         description: Filter by custom items presence
 *       - in: query
 *         name: customerEmail
 *         schema:
 *           type: string
 *           format: email
 *         description: Filter by customer email
 *       - in: query
 *         name: minAmount
 *         schema:
 *           type: number
 *           minimum: 0
 *         description: Minimum order amount filter
 *       - in: query
 *         name: maxAmount
 *         schema:
 *           type: number
 *           minimum: 0
 *         description: Maximum order amount filter
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter orders from this date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter orders until this date
 *     responses:
 *       200:
 *         description: Orders retrieved successfully
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
 *                         orders:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/Order'
 *                         pagination:
 *                           $ref: '#/components/schemas/PaginationMeta'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *
 * /admin/orders/statistics:
 *   get:
 *     tags: [Admin Orders]
 *     summary: Get order statistics
 *     description: Get comprehensive statistics about orders
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for statistics
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for statistics
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, quote_needed, quoted, confirmed, processing, shipped, delivered, cancelled]
 *         description: Filter statistics by status
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
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
 *                         totalOrders:
 *                           type: integer
 *                           example: 150
 *                         totalRevenue:
 *                           type: number
 *                           example: 12500.00
 *                         averageOrderValue:
 *                           type: number
 *                           example: 83.33
 *                         ordersByStatus:
 *                           type: object
 *                           additionalProperties:
 *                             type: integer
 *                           example:
 *                             pending: 10
 *                             confirmed: 25
 *                             processing: 15
 *                             shipped: 80
 *                             delivered: 20
 *                         customOrdersCount:
 *                           type: integer
 *                           example: 35
 *                         revenueByMonth:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               month:
 *                                 type: string
 *                                 example: "2024-01"
 *                               revenue:
 *                                 type: number
 *                                 example: 2500.00
 *                               orders:
 *                                 type: integer
 *                                 example: 30
 *
 * /admin/orders/recent:
 *   get:
 *     tags: [Admin Orders]
 *     summary: Get recent orders
 *     description: Get the most recent orders
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 10
 *         description: Number of recent orders to retrieve
 *     responses:
 *       200:
 *         description: Recent orders retrieved successfully
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
 *                         orders:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/Order'
 *
 * /admin/orders/quotes-needed:
 *   get:
 *     tags: [Admin Orders]
 *     summary: Get orders needing quotes
 *     description: Get orders that require custom quotes
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of orders per page
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [createdAt, updatedAt, customerName]
 *           default: createdAt
 *         description: Field to sort by
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Orders needing quotes retrieved successfully
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
 *                         orders:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/Order'
 *                         pagination:
 *                           $ref: '#/components/schemas/PaginationMeta'
 *
 * /admin/orders/search:
 *   get:
 *     tags: [Admin Orders]
 *     summary: Search orders
 *     description: Search orders by customer name, email, or order details
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *           minLength: 1
 *         description: Search query
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of orders per page
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [createdAt, updatedAt, totalAmount, customerName]
 *           default: createdAt
 *         description: Field to sort by
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Search results retrieved successfully
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
 *                         orders:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/Order'
 *                         pagination:
 *                           $ref: '#/components/schemas/PaginationMeta'
 *                         searchQuery:
 *                           type: string
 *                           example: "sarah"
 *
 * /admin/orders/status/{status}:
 *   get:
 *     tags: [Admin Orders]
 *     summary: Get orders by status
 *     description: Retrieve orders filtered by specific status
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: status
 *         required: true
 *         schema:
 *           type: string
 *           enum: [pending, quote_needed, quoted, confirmed, processing, shipped, delivered, cancelled]
 *         description: Order status to filter by
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of orders per page
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [createdAt, updatedAt, totalAmount, customerName]
 *           default: createdAt
 *         description: Field to sort by
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Orders retrieved successfully
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
 *                         orders:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/Order'
 *                         pagination:
 *                           $ref: '#/components/schemas/PaginationMeta'
 *                         status:
 *                           type: string
 *                           example: "confirmed"
 *
 * /admin/orders/{id}:
 *   get:
 *     tags: [Admin Orders]
 *     summary: Get order by ID
 *     description: Retrieve a specific order by its ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: objectid
 *         description: Order ID
 *     responses:
 *       200:
 *         description: Order retrieved successfully
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
 *                         order:
 *                           $ref: '#/components/schemas/Order'
 *       404:
 *         description: Order not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *
 * /admin/orders/{id}/status:
 *   put:
 *     tags: [Admin Orders]
 *     summary: Update order status
 *     description: Update the status of an existing order
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: objectid
 *         description: Order ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, quote_needed, quoted, confirmed, processing, shipped, delivered, cancelled]
 *                 example: "processing"
 *               notes:
 *                 type: string
 *                 maxLength: 1000
 *                 example: "Order is now being processed"
 *             required:
 *               - status
 *     responses:
 *       200:
 *         description: Order status updated successfully
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
 *                         order:
 *                           $ref: '#/components/schemas/Order'
 *       400:
 *         description: Invalid status transition
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Order not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *
 * /admin/orders/{id}/quote:
 *   put:
 *     tags: [Admin Orders]
 *     summary: Set custom quote for order
 *     description: Set a custom quote amount for orders requiring quotes
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: objectid
 *         description: Order ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               estimatedAmount:
 *                 type: number
 *                 minimum: 0
 *                 example: 145.00
 *               notes:
 *                 type: string
 *                 maxLength: 1000
 *                 example: "Custom quote includes premium materials and rush delivery"
 *             required:
 *               - estimatedAmount
 *     responses:
 *       200:
 *         description: Quote set successfully
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
 *                         order:
 *                           $ref: '#/components/schemas/Order'
 *       400:
 *         description: Invalid quote amount or order doesn't require quote
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Order not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */