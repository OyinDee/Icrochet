/**
 * @swagger
 * /public/items:
 *   get:
 *     tags: [Public Items]
 *     summary: Get all available items
 *     description: Retrieve all available items with filtering and pagination for public browsing
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
 *           maximum: 50
 *           default: 10
 *         description: Number of items per page (max 50)
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
 *         name: color
 *         schema:
 *           type: string
 *         description: Filter by available color
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
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [name, createdAt, pricingType]
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
 *                             allOf:
 *                               - $ref: '#/components/schemas/Item'
 *                               - type: object
 *                                 properties:
 *                                   category:
 *                                     $ref: '#/components/schemas/Category'
 *                         pagination:
 *                           $ref: '#/components/schemas/PaginationMeta'
 *                         filters:
 *                           type: object
 *                           properties:
 *                             categoryId:
 *                               type: string
 *                             pricingType:
 *                               type: string
 *                             color:
 *                               type: string
 *                             minPrice:
 *                               type: number
 *                             maxPrice:
 *                               type: number
 *       400:
 *         description: Invalid query parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *
 * /public/items/search:
 *   get:
 *     tags: [Public Items]
 *     summary: Search available items
 *     description: Search items by name, description, or category
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *           minLength: 1
 *         description: Search term (required)
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
 *           maximum: 50
 *           default: 10
 *         description: Number of items per page (max 50)
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [name, createdAt, pricingType]
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
 *                             allOf:
 *                               - $ref: '#/components/schemas/Item'
 *                               - type: object
 *                                 properties:
 *                                   category:
 *                                     $ref: '#/components/schemas/Category'
 *                         pagination:
 *                           $ref: '#/components/schemas/PaginationMeta'
 *                         searchQuery:
 *                           type: string
 *                           example: "blanket"
 *                         totalResults:
 *                           type: integer
 *                           example: 15
 *       400:
 *         description: Invalid search parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *
 * /public/items/colors:
 *   get:
 *     tags: [Public Items]
 *     summary: Get all available colors
 *     description: Get all unique colors available across all items
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
 * /public/items/pricing/{pricingType}:
 *   get:
 *     tags: [Public Items]
 *     summary: Get items by pricing type
 *     description: Retrieve items filtered by pricing type
 *     parameters:
 *       - in: path
 *         name: pricingType
 *         required: true
 *         schema:
 *           type: string
 *           enum: [fixed, range, custom]
 *         description: Pricing type to filter by
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
 *           maximum: 50
 *           default: 10
 *         description: Number of items per page
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [name, createdAt]
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
 *                             allOf:
 *                               - $ref: '#/components/schemas/Item'
 *                               - type: object
 *                                 properties:
 *                                   category:
 *                                     $ref: '#/components/schemas/Category'
 *                         pagination:
 *                           $ref: '#/components/schemas/PaginationMeta'
 *                         pricingType:
 *                           type: string
 *                           example: "fixed"
 *       400:
 *         description: Invalid pricing type
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *
 * /public/items/color/{color}:
 *   get:
 *     tags: [Public Items]
 *     summary: Get items by color
 *     description: Retrieve items that are available in a specific color
 *     parameters:
 *       - in: path
 *         name: color
 *         required: true
 *         schema:
 *           type: string
 *         description: Color name to filter by
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
 *           maximum: 50
 *           default: 10
 *         description: Number of items per page
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [name, createdAt, pricingType]
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
 *                             allOf:
 *                               - $ref: '#/components/schemas/Item'
 *                               - type: object
 *                                 properties:
 *                                   category:
 *                                     $ref: '#/components/schemas/Category'
 *                         pagination:
 *                           $ref: '#/components/schemas/PaginationMeta'
 *                         color:
 *                           type: string
 *                           example: "Pink"
 *
 * /public/items/category/{categoryId}:
 *   get:
 *     tags: [Public Items]
 *     summary: Get items by category
 *     description: Retrieve available items filtered by category
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
 *           maximum: 50
 *           default: 10
 *         description: Number of items per page
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [name, createdAt, pricingType]
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
 *       404:
 *         description: Category not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *
 * /public/items/{id}:
 *   get:
 *     tags: [Public Items]
 *     summary: Get item by ID
 *     description: Retrieve a specific available item by its ID
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
 *                           allOf:
 *                             - $ref: '#/components/schemas/Item'
 *                             - type: object
 *                               properties:
 *                                 category:
 *                                   $ref: '#/components/schemas/Category'
 *                                 relatedItems:
 *                                   type: array
 *                                   items:
 *                                     $ref: '#/components/schemas/Item'
 *                                   description: Items from the same category
 *       404:
 *         description: Item not found or not available
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               error:
 *                 code: "ITEM_NOT_FOUND"
 *                 message: "Item not found or not available"
 *               timestamp: "2024-01-01T00:00:00.000Z"
 */