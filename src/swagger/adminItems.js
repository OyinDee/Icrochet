/**
 * @swagger
 * /admin/items:
 *   get:
 *     tags: [Admin Items]
 *     summary: Get all items
 *     description: Retrieve all items with filtering, searching, and pagination
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
 *         description: Number of items per page
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [name, createdAt, updatedAt, pricingType]
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
 *         name: categoryId
 *         schema:
 *           type: string
 *           format: objectid
 *         description: Filter by category ID
 *       - in: query
 *         name: pricingType
 *         schema:
 *           type: string
 *           enum: [fixed, range, custom]
 *         description: Filter by pricing type
 *       - in: query
 *         name: isAvailable
 *         schema:
 *           type: boolean
 *         description: Filter by availability status
 *       - in: query
 *         name: minPrice
 *         schema:
 *           type: number
 *           minimum: 0
 *         description: Minimum price filter
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *           minimum: 0
 *         description: Maximum price filter
 *       - in: query
 *         name: color
 *         schema:
 *           type: string
 *         description: Filter by available color
 *     responses:
 *       200:
 *         description: Items retrieved successfully
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
 *                         items:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/Item'
 *                         pagination:
 *                           $ref: '#/components/schemas/PaginationMeta'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *
 *   post:
 *     tags: [Admin Items]
 *     summary: Create new item
 *     description: Create a new item with flexible pricing
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 200
 *                 example: "Custom Baby Blanket"
 *               description:
 *                 type: string
 *                 maxLength: 2000
 *                 example: "Soft and cozy baby blanket made with premium yarn"
 *               pricingType:
 *                 type: string
 *                 enum: [fixed, range, custom]
 *                 example: "range"
 *               price:
 *                 type: object
 *                 properties:
 *                   fixed:
 *                     type: number
 *                     minimum: 0
 *                     example: 85.00
 *                   min:
 *                     type: number
 *                     minimum: 0
 *                     example: 45.00
 *                   max:
 *                     type: number
 *                     minimum: 0
 *                     example: 65.00
 *                 example:
 *                   min: 45.00
 *                   max: 65.00
 *               categoryId:
 *                 type: string
 *                 format: objectid
 *                 example: "507f1f77bcf86cd799439011"
 *               isAvailable:
 *                 type: boolean
 *                 default: true
 *                 example: true
 *               imageUrls:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uri
 *                 example: ["https://res.cloudinary.com/demo/image/upload/sample.jpg"]
 *               availableColors:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["Pink", "Blue", "Yellow", "White"]
 *             required:
 *               - name
 *               - pricingType
 *               - categoryId
 *     responses:
 *       201:
 *         description: Item created successfully
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
 *                         item:
 *                           $ref: '#/components/schemas/Item'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *
 * /admin/items/statistics:
 *   get:
 *     tags: [Admin Items]
 *     summary: Get item statistics
 *     description: Get comprehensive statistics about items
 *     security:
 *       - bearerAuth: []
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
 *                         totalItems:
 *                           type: integer
 *                           example: 50
 *                         availableItems:
 *                           type: integer
 *                           example: 45
 *                         unavailableItems:
 *                           type: integer
 *                           example: 5
 *                         itemsByPricingType:
 *                           type: object
 *                           properties:
 *                             fixed:
 *                               type: integer
 *                               example: 20
 *                             range:
 *                               type: integer
 *                               example: 25
 *                             custom:
 *                               type: integer
 *                               example: 5
 *                         itemsByCategory:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               categoryId:
 *                                 type: string
 *                               categoryName:
 *                                 type: string
 *                               itemCount:
 *                                 type: integer
 *                         averagePrice:
 *                           type: number
 *                           example: 67.50
 *                         priceRange:
 *                           type: object
 *                           properties:
 *                             min:
 *                               type: number
 *                               example: 15.00
 *                             max:
 *                               type: number
 *                               example: 150.00
 *
 * /admin/items/colors:
 *   get:
 *     tags: [Admin Items]
 *     summary: Get all unique colors
 *     description: Get all unique colors available across all items
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Colors retrieved successfully
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
 *                         colors:
 *                           type: array
 *                           items:
 *                             type: string
 *                           example: ["Pink", "Blue", "White", "Yellow", "Green", "Red"]
 *                         totalColors:
 *                           type: integer
 *                           example: 6
 *
 * /admin/items/search:
 *   get:
 *     tags: [Admin Items]
 *     summary: Search items
 *     description: Search items by name, description, or category
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
 *         description: Number of items per page
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [name, createdAt, updatedAt, pricingType]
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
 *                         items:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/Item'
 *                         pagination:
 *                           $ref: '#/components/schemas/PaginationMeta'
 *                         searchQuery:
 *                           type: string
 *                           example: "blanket"
 *
 * /admin/items/category/{categoryId}:
 *   get:
 *     tags: [Admin Items]
 *     summary: Get items by category
 *     description: Retrieve items filtered by category
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: categoryId
 *         required: true
 *         schema:
 *           type: string
 *           format: objectid
 *         description: Category ID
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
 *         description: Number of items per page
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [name, createdAt, updatedAt, pricingType]
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
 *         description: Items retrieved successfully
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
 *                         items:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/Item'
 *                         pagination:
 *                           $ref: '#/components/schemas/PaginationMeta'
 *                         category:
 *                           $ref: '#/components/schemas/Category'
 *
 * /admin/items/{id}:
 *   get:
 *     tags: [Admin Items]
 *     summary: Get item by ID
 *     description: Retrieve a specific item by its ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: objectid
 *         description: Item ID
 *     responses:
 *       200:
 *         description: Item retrieved successfully
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
 *                         item:
 *                           $ref: '#/components/schemas/Item'
 *       404:
 *         description: Item not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *
 *   put:
 *     tags: [Admin Items]
 *     summary: Update item
 *     description: Update an existing item
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: objectid
 *         description: Item ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 200
 *                 example: "Updated Item Name"
 *               description:
 *                 type: string
 *                 maxLength: 2000
 *                 example: "Updated item description"
 *               pricingType:
 *                 type: string
 *                 enum: [fixed, range, custom]
 *                 example: "fixed"
 *               price:
 *                 type: object
 *                 properties:
 *                   fixed:
 *                     type: number
 *                     minimum: 0
 *                   min:
 *                     type: number
 *                     minimum: 0
 *                   max:
 *                     type: number
 *                     minimum: 0
 *                 example:
 *                   fixed: 95.00
 *               categoryId:
 *                 type: string
 *                 format: objectid
 *                 example: "507f1f77bcf86cd799439011"
 *               isAvailable:
 *                 type: boolean
 *                 example: true
 *               imageUrls:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uri
 *                 example: ["https://res.cloudinary.com/demo/image/upload/updated.jpg"]
 *               availableColors:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["Pink", "Blue", "Green"]
 *     responses:
 *       200:
 *         description: Item updated successfully
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
 *                         item:
 *                           $ref: '#/components/schemas/Item'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Item not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *
 *   delete:
 *     tags: [Admin Items]
 *     summary: Delete item
 *     description: Delete an existing item
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: objectid
 *         description: Item ID
 *     responses:
 *       200:
 *         description: Item deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       404:
 *         description: Item not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *
 * /admin/items/{id}/availability:
 *   put:
 *     tags: [Admin Items]
 *     summary: Update item availability
 *     description: Update the availability status of an item
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: objectid
 *         description: Item ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               isAvailable:
 *                 type: boolean
 *                 example: false
 *             required:
 *               - isAvailable
 *     responses:
 *       200:
 *         description: Item availability updated successfully
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
 *                         item:
 *                           $ref: '#/components/schemas/Item'
 *       404:
 *         description: Item not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */