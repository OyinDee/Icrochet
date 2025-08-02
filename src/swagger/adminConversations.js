/**
 * @swagger
 * /admin/conversations:
 *   get:
 *     tags: [Admin Conversations]
 *     summary: Get all conversations
 *     description: Retrieve all conversations with filtering and pagination
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
 *         description: Number of conversations per page
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [lastMessageAt, createdAt, updatedAt, customerName]
 *           default: lastMessageAt
 *         description: Field to sort by
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *       - in: query
 *         name: hasUnreadMessages
 *         schema:
 *           type: boolean
 *         description: Filter conversations with unread messages
 *       - in: query
 *         name: customerEmail
 *         schema:
 *           type: string
 *           format: email
 *         description: Filter by customer email
 *     responses:
 *       200:
 *         description: Conversations retrieved successfully
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
 *                         conversations:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/Conversation'
 *                         pagination:
 *                           $ref: '#/components/schemas/PaginationMeta'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *
 * /admin/conversations/statistics:
 *   get:
 *     tags: [Admin Conversations]
 *     summary: Get conversation statistics
 *     description: Get statistics about conversations and messages
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
 *                         totalConversations:
 *                           type: integer
 *                           example: 25
 *                         activeConversations:
 *                           type: integer
 *                           example: 20
 *                         conversationsWithUnreadMessages:
 *                           type: integer
 *                           example: 5
 *                         totalMessages:
 *                           type: integer
 *                           example: 150
 *                         averageMessagesPerConversation:
 *                           type: number
 *                           example: 6.0
 *                         totalQuoteMessages:
 *                           type: integer
 *                           example: 12
 *                         responseTimeStats:
 *                           type: object
 *                           properties:
 *                             averageResponseTime:
 *                               type: number
 *                               description: Average response time in hours
 *                               example: 2.5
 *                             fastestResponse:
 *                               type: number
 *                               description: Fastest response time in hours
 *                               example: 0.25
 *                             slowestResponse:
 *                               type: number
 *                               description: Slowest response time in hours
 *                               example: 24.0
 *
 * /admin/conversations/unread:
 *   get:
 *     tags: [Admin Conversations]
 *     summary: Get conversations with unread messages
 *     description: Get conversations that have unread messages from customers
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
 *         description: Number of conversations per page
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [lastMessageAt, unreadByAdmin]
 *           default: lastMessageAt
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
 *         description: Unread conversations retrieved successfully
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
 *                         conversations:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/Conversation'
 *                         pagination:
 *                           $ref: '#/components/schemas/PaginationMeta'
 *                         totalUnreadMessages:
 *                           type: integer
 *                           example: 15
 *
 * /admin/conversations/search:
 *   get:
 *     tags: [Admin Conversations]
 *     summary: Search conversations
 *     description: Search conversations by customer name, email, or message content
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
 *         description: Number of conversations per page
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [lastMessageAt, createdAt, customerName]
 *           default: lastMessageAt
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
 *                         conversations:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/Conversation'
 *                         pagination:
 *                           $ref: '#/components/schemas/PaginationMeta'
 *                         searchQuery:
 *                           type: string
 *                           example: "wedding"
 *
 * /admin/conversations/{id}:
 *   get:
 *     tags: [Admin Conversations]
 *     summary: Get conversation by ID
 *     description: Retrieve a specific conversation with all messages
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: objectid
 *         description: Conversation ID
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
 *                           $ref: '#/components/schemas/Conversation'
 *       404:
 *         description: Conversation not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *
 * /admin/conversations/{id}/messages:
 *   post:
 *     tags: [Admin Conversations]
 *     summary: Add message to conversation
 *     description: Add a new message to an existing conversation
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: objectid
 *         description: Conversation ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               content:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 2000
 *                 example: "Thank you for your inquiry. I'll start working on your custom order right away."
 *               isQuote:
 *                 type: boolean
 *                 default: false
 *                 example: false
 *               quoteAmount:
 *                 type: number
 *                 minimum: 0
 *                 example: 145.00
 *                 description: Required if isQuote is true
 *             required:
 *               - content
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
 *                           $ref: '#/components/schemas/Conversation'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Conversation not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *
 * /admin/conversations/{id}/mark-read:
 *   put:
 *     tags: [Admin Conversations]
 *     summary: Mark messages as read
 *     description: Mark all customer messages in the conversation as read by admin
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: objectid
 *         description: Conversation ID
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
 *                         conversation:
 *                           $ref: '#/components/schemas/Conversation'
 *                         markedAsRead:
 *                           type: integer
 *                           example: 3
 *       404:
 *         description: Conversation not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *
 * /admin/conversations/{id}/archive:
 *   put:
 *     tags: [Admin Conversations]
 *     summary: Archive conversation
 *     description: Archive a conversation (set isActive to false)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: objectid
 *         description: Conversation ID
 *     responses:
 *       200:
 *         description: Conversation archived successfully
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
 *                           $ref: '#/components/schemas/Conversation'
 *       404:
 *         description: Conversation not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *
 * /admin/conversations/{id}/reactivate:
 *   put:
 *     tags: [Admin Conversations]
 *     summary: Reactivate conversation
 *     description: Reactivate an archived conversation (set isActive to true)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: objectid
 *         description: Conversation ID
 *     responses:
 *       200:
 *         description: Conversation reactivated successfully
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
 *                           $ref: '#/components/schemas/Conversation'
 *       404:
 *         description: Conversation not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */