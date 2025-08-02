/**
 * @swagger
 * /public/conversations/{orderId}:
 *   get:
 *     tags: [Public Conversations]
 *     summary: Get conversation by order ID
 *     description: Retrieve conversation messages for a specific order (customer access)
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *           format: objectid
 *         description: Order ID to get conversation for
 *       - in: query
 *         name: customerEmail
 *         required: true
 *         schema:
 *           type: string
 *           format: email
 *         description: Customer email for verification
 *     responses:
 *       200:
 *         description: Conversation retrieved successfully
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
 *                         conversation:
 *                           allOf:
 *                             - $ref: '#/components/schemas/Conversation'
 *                             - type: object
 *                               properties:
 *                                 order:
 *                                   type: object
 *                                   properties:
 *                                     _id:
 *                                       type: string
 *                                       format: objectid
 *                                     status:
 *                                       type: string
 *                                     totalAmount:
 *                                       type: number
 *                                     estimatedAmount:
 *                                       type: number
 *                                     items:
 *                                       type: array
 *                                       items:
 *                                         $ref: '#/components/schemas/OrderItem'
 *                         hasUnreadMessages:
 *                           type: boolean
 *                           example: true
 *                           description: Whether there are unread messages from admin
 *       400:
 *         description: Missing or invalid parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               missingEmail:
 *                 summary: Missing customer email
 *                 value:
 *                   success: false
 *                   error:
 *                     code: "MISSING_CUSTOMER_EMAIL"
 *                     message: "Customer email is required for verification"
 *                   timestamp: "2024-01-01T00:00:00.000Z"
 *               invalidEmail:
 *                 summary: Invalid email format
 *                 value:
 *                   success: false
 *                   error:
 *                     code: "INVALID_EMAIL_FORMAT"
 *                     message: "Invalid email address format"
 *                   timestamp: "2024-01-01T00:00:00.000Z"
 *       403:
 *         description: Access denied - email doesn't match order
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               error:
 *                 code: "ACCESS_DENIED"
 *                 message: "You don't have permission to access this conversation"
 *               timestamp: "2024-01-01T00:00:00.000Z"
 *       404:
 *         description: Order or conversation not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               orderNotFound:
 *                 summary: Order not found
 *                 value:
 *                   success: false
 *                   error:
 *                     code: "ORDER_NOT_FOUND"
 *                     message: "Order not found"
 *                   timestamp: "2024-01-01T00:00:00.000Z"
 *               conversationNotFound:
 *                 summary: Conversation not found
 *                 value:
 *                   success: false
 *                   error:
 *                     code: "CONVERSATION_NOT_FOUND"
 *                     message: "No conversation found for this order"
 *                   timestamp: "2024-01-01T00:00:00.000Z"
 *
 *   post:
 *     tags: [Public Conversations]
 *     summary: Add message to conversation
 *     description: Add a new message to the conversation (customer message)
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *           format: objectid
 *         description: Order ID to add message to
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               customerEmail:
 *                 type: string
 *                 format: email
 *                 example: "sarah.johnson@email.com"
 *                 description: Customer email for verification
 *               content:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 2000
 *                 example: "Hi! I was wondering if you could add some gold accents to my blanket order?"
 *                 description: Message content
 *             required:
 *               - customerEmail
 *               - content
 *           examples:
 *             standardMessage:
 *               summary: Standard customer message
 *               value:
 *                 customerEmail: "sarah.johnson@email.com"
 *                 content: "Hi! I was wondering if you could add some gold accents to my blanket order?"
 *             urgentMessage:
 *               summary: Urgent customer message
 *               value:
 *                 customerEmail: "emily.rodriguez@email.com"
 *                 content: "Hi, I need to update my shipping address. The wedding venue has changed. Please let me know if this is possible."
 *             questionMessage:
 *               summary: Customer question
 *               value:
 *                 customerEmail: "michael.chen@email.com"
 *                 content: "What's the estimated delivery time for my order? I need it by next Friday."
 *     responses:
 *       201:
 *         description: Message added successfully
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
 *                         message:
 *                           $ref: '#/components/schemas/ConversationMessage'
 *                         conversation:
 *                           type: object
 *                           properties:
 *                             _id:
 *                               type: string
 *                               format: objectid
 *                             messageCount:
 *                               type: integer
 *                               example: 6
 *                             lastMessageAt:
 *                               type: string
 *                               format: date-time
 *                         notification:
 *                           type: object
 *                           properties:
 *                             sent:
 *                               type: boolean
 *                               example: true
 *                             message:
 *                               type: string
 *                               example: "Admin has been notified of your message"
 *       400:
 *         description: Validation error or invalid message data
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
 *                       content: "Message content is required"
 *                       customerEmail: "Invalid email format"
 *                   timestamp: "2024-01-01T00:00:00.000Z"
 *               messageTooLong:
 *                 summary: Message too long
 *                 value:
 *                   success: false
 *                   error:
 *                     code: "MESSAGE_TOO_LONG"
 *                     message: "Message content cannot exceed 2000 characters"
 *                   timestamp: "2024-01-01T00:00:00.000Z"
 *       403:
 *         description: Access denied - email doesn't match order
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               error:
 *                 code: "ACCESS_DENIED"
 *                 message: "You don't have permission to add messages to this conversation"
 *               timestamp: "2024-01-01T00:00:00.000Z"
 *       404:
 *         description: Order not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               error:
 *                 code: "ORDER_NOT_FOUND"
 *                 message: "Order not found"
 *               timestamp: "2024-01-01T00:00:00.000Z"
 *
 * /public/conversations/{orderId}/mark-read:
 *   put:
 *     tags: [Public Conversations]
 *     summary: Mark admin messages as read
 *     description: Mark all admin messages in the conversation as read by customer
 *     parameters:
 *       - in: path
 *         name: orderId
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
 *               customerEmail:
 *                 type: string
 *                 format: email
 *                 example: "sarah.johnson@email.com"
 *                 description: Customer email for verification
 *             required:
 *               - customerEmail
 *     responses:
 *       200:
 *         description: Messages marked as read successfully
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
 *                         markedAsRead:
 *                           type: integer
 *                           example: 3
 *                           description: Number of messages marked as read
 *                         conversation:
 *                           type: object
 *                           properties:
 *                             _id:
 *                               type: string
 *                               format: objectid
 *                             unreadByCustomer:
 *                               type: integer
 *                               example: 0
 *       400:
 *         description: Missing or invalid customer email
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Access denied - email doesn't match order
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Order or conversation not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */