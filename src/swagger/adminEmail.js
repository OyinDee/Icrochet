/**
 * @swagger
 * /admin/emails/send:
 *   post:
 *     tags: [Admin Email]
 *     summary: Send email to customer
 *     description: Send a custom email to a customer
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               to:
 *                 type: string
 *                 format: email
 *                 example: "customer@example.com"
 *                 description: Recipient email address
 *               subject:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 200
 *                 example: "Update on your custom order"
 *                 description: Email subject line
 *               message:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 5000
 *                 example: "Hi Sarah, I wanted to update you on the progress of your custom wedding blanket..."
 *                 description: Email message content
 *               orderId:
 *                 type: string
 *                 format: objectid
 *                 example: "507f1f77bcf86cd799439011"
 *                 description: Optional order ID for context
 *               template:
 *                 type: string
 *                 enum: [order_update, quote_ready, order_shipped, custom]
 *                 example: "order_update"
 *                 description: Email template to use
 *               attachments:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     filename:
 *                       type: string
 *                       example: "invoice.pdf"
 *                     url:
 *                       type: string
 *                       format: uri
 *                       example: "https://example.com/files/invoice.pdf"
 *                 description: Optional file attachments
 *             required:
 *               - to
 *               - subject
 *               - message
 *     responses:
 *       200:
 *         description: Email sent successfully
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
 *                         messageId:
 *                           type: string
 *                           example: "<abc123@example.com>"
 *                         to:
 *                           type: string
 *                           format: email
 *                           example: "customer@example.com"
 *                         subject:
 *                           type: string
 *                           example: "Update on your custom order"
 *                         sentAt:
 *                           type: string
 *                           format: date-time
 *                           example: "2024-01-01T00:00:00.000Z"
 *                         template:
 *                           type: string
 *                           example: "order_update"
 *       400:
 *         description: Validation error or email service error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               invalidEmail:
 *                 summary: Invalid email address
 *                 value:
 *                   success: false
 *                   error:
 *                     code: "INVALID_EMAIL"
 *                     message: "Invalid email address format"
 *                   timestamp: "2024-01-01T00:00:00.000Z"
 *               emailServiceError:
 *                 summary: Email service error
 *                 value:
 *                   success: false
 *                   error:
 *                     code: "EMAIL_SERVICE_ERROR"
 *                     message: "Failed to send email"
 *                   timestamp: "2024-01-01T00:00:00.000Z"
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *
 * /admin/emails/templates:
 *   get:
 *     tags: [Admin Email]
 *     summary: Get email templates
 *     description: Get all available email templates
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Email templates retrieved successfully
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
 *                         templates:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: string
 *                                 example: "order_update"
 *                               name:
 *                                 type: string
 *                                 example: "Order Update"
 *                               description:
 *                                 type: string
 *                                 example: "Template for order status updates"
 *                               subject:
 *                                 type: string
 *                                 example: "Update on your order #{orderId}"
 *                               variables:
 *                                 type: array
 *                                 items:
 *                                   type: string
 *                                 example: ["customerName", "orderId", "status", "message"]
 *                               preview:
 *                                 type: string
 *                                 example: "Hi {customerName}, we wanted to update you on order #{orderId}..."
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *
 * /admin/emails/templates/{templateId}:
 *   get:
 *     tags: [Admin Email]
 *     summary: Get email template by ID
 *     description: Get a specific email template with full content
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: templateId
 *         required: true
 *         schema:
 *           type: string
 *           enum: [order_update, quote_ready, order_shipped, custom]
 *         description: Template ID
 *     responses:
 *       200:
 *         description: Email template retrieved successfully
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
 *                         template:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: string
 *                               example: "order_update"
 *                             name:
 *                               type: string
 *                               example: "Order Update"
 *                             description:
 *                               type: string
 *                               example: "Template for order status updates"
 *                             subject:
 *                               type: string
 *                               example: "Update on your order #{orderId}"
 *                             htmlContent:
 *                               type: string
 *                               example: "<html><body><h1>Order Update</h1><p>Hi {customerName}...</p></body></html>"
 *                             textContent:
 *                               type: string
 *                               example: "Hi {customerName}, we wanted to update you on order #{orderId}..."
 *                             variables:
 *                               type: array
 *                               items:
 *                                 type: string
 *                               example: ["customerName", "orderId", "status", "message"]
 *       404:
 *         description: Template not found
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
 * /admin/emails/send-template:
 *   post:
 *     tags: [Admin Email]
 *     summary: Send templated email
 *     description: Send an email using a predefined template with variable substitution
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               to:
 *                 type: string
 *                 format: email
 *                 example: "customer@example.com"
 *                 description: Recipient email address
 *               templateId:
 *                 type: string
 *                 enum: [order_update, quote_ready, order_shipped, custom]
 *                 example: "order_update"
 *                 description: Template ID to use
 *               variables:
 *                 type: object
 *                 additionalProperties:
 *                   type: string
 *                 example:
 *                   customerName: "Sarah Johnson"
 *                   orderId: "ORD-001"
 *                   status: "Processing"
 *                   message: "Your custom blanket is being worked on"
 *                 description: Variables to substitute in the template
 *               orderId:
 *                 type: string
 *                 format: objectid
 *                 example: "507f1f77bcf86cd799439011"
 *                 description: Optional order ID for context
 *             required:
 *               - to
 *               - templateId
 *               - variables
 *     responses:
 *       200:
 *         description: Templated email sent successfully
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
 *                         messageId:
 *                           type: string
 *                           example: "<abc123@example.com>"
 *                         to:
 *                           type: string
 *                           format: email
 *                           example: "customer@example.com"
 *                         templateId:
 *                           type: string
 *                           example: "order_update"
 *                         subject:
 *                           type: string
 *                           example: "Update on your order #ORD-001"
 *                         sentAt:
 *                           type: string
 *                           format: date-time
 *                           example: "2024-01-01T00:00:00.000Z"
 *       400:
 *         description: Validation error or template error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Template not found
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
 * /admin/emails/history:
 *   get:
 *     tags: [Admin Email]
 *     summary: Get email history
 *     description: Get history of sent emails with filtering and pagination
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
 *         description: Number of emails per page
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: email
 *         description: Filter by recipient email
 *       - in: query
 *         name: template
 *         schema:
 *           type: string
 *           enum: [order_update, quote_ready, order_shipped, custom]
 *         description: Filter by template used
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter emails from this date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter emails until this date
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [sentAt, to, subject]
 *           default: sentAt
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
 *         description: Email history retrieved successfully
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
 *                         emails:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: string
 *                                 example: "email_123"
 *                               messageId:
 *                                 type: string
 *                                 example: "<abc123@example.com>"
 *                               to:
 *                                 type: string
 *                                 format: email
 *                                 example: "customer@example.com"
 *                               subject:
 *                                 type: string
 *                                 example: "Update on your order #ORD-001"
 *                               template:
 *                                 type: string
 *                                 example: "order_update"
 *                               sentAt:
 *                                 type: string
 *                                 format: date-time
 *                                 example: "2024-01-01T00:00:00.000Z"
 *                               status:
 *                                 type: string
 *                                 enum: [sent, delivered, failed]
 *                                 example: "delivered"
 *                               orderId:
 *                                 type: string
 *                                 format: objectid
 *                                 example: "507f1f77bcf86cd799439011"
 *                         pagination:
 *                           $ref: '#/components/schemas/PaginationMeta'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */