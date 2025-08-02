/**
 * @swagger
 * /public/orders:
 *   post:
 *     tags: [Public Orders]
 *     summary: Create new order
 *     description: Create a new order for customers to place orders
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               customerName:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *                 example: "Sarah Johnson"
 *                 description: Customer's full name
 *               customerEmail:
 *                 type: string
 *                 format: email
 *                 example: "sarah.johnson@email.com"
 *                 description: Customer's email address
 *               customerPhone:
 *                 type: string
 *                 example: "+1-555-0123"
 *                 description: Customer's phone number (optional)
 *               shippingAddress:
 *                 type: string
 *                 minLength: 10
 *                 maxLength: 500
 *                 example: "123 Main St, Anytown, ST 12345, USA"
 *                 description: Complete shipping address
 *               items:
 *                 type: array
 *                 minItems: 1
 *                 items:
 *                   type: object
 *                   properties:
 *                     itemId:
 *                       type: string
 *                       format: objectid
 *                       example: "507f1f77bcf86cd799439011"
 *                       description: ID of the item to order
 *                     quantity:
 *                       type: integer
 *                       minimum: 1
 *                       maximum: 100
 *                       example: 2
 *                       description: Quantity of the item
 *                     selectedColor:
 *                       type: string
 *                       maxLength: 50
 *                       example: "Blue & White"
 *                       description: Selected color from available colors
 *                     customRequirements:
 *                       type: string
 *                       maxLength: 1000
 *                       example: "Please add custom embroidery with initials 'SJ'"
 *                       description: Any custom requirements or special instructions
 *                   required:
 *                     - itemId
 *                     - quantity
 *                 description: Array of items to order
 *               notes:
 *                 type: string
 *                 maxLength: 1000
 *                 example: "This is a gift, please include gift wrapping"
 *                 description: Additional notes or special instructions
 *             required:
 *               - customerName
 *               - customerEmail
 *               - shippingAddress
 *               - items
 *           examples:
 *             standardOrder:
 *               summary: Standard order with fixed pricing
 *               value:
 *                 customerName: "Sarah Johnson"
 *                 customerEmail: "sarah.johnson@email.com"
 *                 customerPhone: "+1-555-0123"
 *                 shippingAddress: "123 Main St, Anytown, ST 12345, USA"
 *                 items:
 *                   - itemId: "507f1f77bcf86cd799439011"
 *                     quantity: 1
 *                     selectedColor: "Blue & White"
 *                 notes: "Please handle with care"
 *             customOrder:
 *               summary: Custom order requiring quote
 *               value:
 *                 customerName: "Emily Rodriguez"
 *                 customerEmail: "emily.rodriguez@email.com"
 *                 customerPhone: "+1-555-0789"
 *                 shippingAddress: "789 Pine Rd, Riverside, ST 13579, USA"
 *                 items:
 *                   - itemId: "507f1f77bcf86cd799439012"
 *                     quantity: 1
 *                     selectedColor: "Custom - Please specify in order"
 *                     customRequirements: "Wedding colors: blush pink and gold. Include initials 'E&J' and wedding date '06/15/2024'"
 *                 notes: "This is for my wedding, please let me know timeline"
 *             multipleItems:
 *               summary: Order with multiple items
 *               value:
 *                 customerName: "Michael Chen"
 *                 customerEmail: "michael.chen@email.com"
 *                 shippingAddress: "456 Oak Ave, Springfield, ST 67890, USA"
 *                 items:
 *                   - itemId: "507f1f77bcf86cd799439013"
 *                     quantity: 2
 *                     selectedColor: "Charcoal Gray"
 *                   - itemId: "507f1f77bcf86cd799439014"
 *                     quantity: 1
 *                     selectedColor: "Gray"
 *     responses:
 *       201:
 *         description: Order created successfully
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
 *                         estimatedTotal:
 *                           type: number
 *                           example: 85.00
 *                           description: Estimated total for items with fixed/range pricing
 *                         requiresQuote:
 *                           type: boolean
 *                           example: false
 *                           description: Whether the order requires a custom quote
 *                         nextSteps:
 *                           type: string
 *                           example: "Your order has been received. You will receive a confirmation email shortly."
 *                           description: Information about what happens next
 *             examples:
 *               standardOrderResponse:
 *                 summary: Standard order response
 *                 value:
 *                   success: true
 *                   message: "Order created successfully"
 *                   data:
 *                     order:
 *                       _id: "507f1f77bcf86cd799439015"
 *                       customerName: "Sarah Johnson"
 *                       customerEmail: "sarah.johnson@email.com"
 *                       status: "confirmed"
 *                       totalAmount: 85.00
 *                       hasCustomItems: false
 *                     estimatedTotal: 85.00
 *                     requiresQuote: false
 *                     nextSteps: "Your order has been confirmed. You will receive a confirmation email shortly."
 *                   timestamp: "2024-01-01T00:00:00.000Z"
 *               customOrderResponse:
 *                 summary: Custom order response
 *                 value:
 *                   success: true
 *                   message: "Order created successfully"
 *                   data:
 *                     order:
 *                       _id: "507f1f77bcf86cd799439016"
 *                       customerName: "Emily Rodriguez"
 *                       customerEmail: "emily.rodriguez@email.com"
 *                       status: "quote_needed"
 *                       hasCustomItems: true
 *                     estimatedTotal: null
 *                     requiresQuote: true
 *                     nextSteps: "Your custom order has been received. We will review your requirements and provide a quote within 24-48 hours."
 *                   timestamp: "2024-01-01T00:00:00.000Z"
 *       400:
 *         description: Validation error or invalid order data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               validationError:
 *                 summary: Validation error
 *                 value:
 *                   success: false
 *                   error:
 *                     code: "VALIDATION_ERROR"
 *                     message: "Validation failed"
 *                     details:
 *                       customerEmail: "Invalid email format"
 *                       items: "At least one item is required"
 *                   timestamp: "2024-01-01T00:00:00.000Z"
 *               itemNotAvailable:
 *                 summary: Item not available
 *                 value:
 *                   success: false
 *                   error:
 *                     code: "ITEM_NOT_AVAILABLE"
 *                     message: "One or more items are not available"
 *                     details:
 *                       unavailableItems: ["507f1f77bcf86cd799439011"]
 *                   timestamp: "2024-01-01T00:00:00.000Z"
 *               invalidColor:
 *                 summary: Invalid color selection
 *                 value:
 *                   success: false
 *                   error:
 *                     code: "INVALID_COLOR"
 *                     message: "Selected color is not available for this item"
 *                     details:
 *                       itemId: "507f1f77bcf86cd799439011"
 *                       selectedColor: "Purple"
 *                       availableColors: ["Blue & White", "Pink & White", "Multi-color"]
 *                   timestamp: "2024-01-01T00:00:00.000Z"
 *       404:
 *         description: One or more items not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               error:
 *                 code: "ITEM_NOT_FOUND"
 *                 message: "One or more items were not found"
 *                 details:
 *                   notFoundItems: ["507f1f77bcf86cd799439999"]
 *               timestamp: "2024-01-01T00:00:00.000Z"
 *       500:
 *         description: Server error during order creation
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               error:
 *                 code: "ORDER_CREATION_FAILED"
 *                 message: "Failed to create order due to server error"
 *               timestamp: "2024-01-01T00:00:00.000Z"
 */