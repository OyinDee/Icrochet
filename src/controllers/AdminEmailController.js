const EmailService = require('../services/EmailService');
const OrderRepository = require('../repositories/OrderRepository');
const logger = require('../config/logger');
const { validateEmailSend } = require('../utils/validation');

class AdminEmailController {
  constructor() {
    this.emailService = new EmailService();
    this.orderRepository = new OrderRepository();
  }

  /**
   * Send custom email to customer
   * POST /api/v1/admin/emails/send
   */
  async sendCustomEmail(req, res) {
    try {
      // Validate request data
      const { error, value } = validateEmailSend(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid email data provided',
            details: error.details.map(detail => ({
              field: detail.path.join('.'),
              message: detail.message
            }))
          },
          timestamp: new Date().toISOString()
        });
      }

      const { 
        customerEmail, 
        customerName, 
        subject, 
        message, 
        template = 'custom',
        orderId 
      } = value;

      // If orderId is provided, verify the order exists
      let order = null;
      if (orderId) {
        order = await this.orderRepository.findById(orderId);
        if (!order) {
          return res.status(404).json({
            success: false,
            error: {
              code: 'ORDER_NOT_FOUND',
              message: 'Order not found',
              details: { orderId }
            },
            timestamp: new Date().toISOString()
          });
        }
      }

      // Send email based on template type
      let emailResult;
      switch (template) {
        case 'custom':
          emailResult = await this.sendCustomMessageEmail(
            customerEmail, 
            customerName, 
            subject, 
            message, 
            orderId
          );
          break;
        case 'order_followup':
          if (!order) {
            return res.status(400).json({
              success: false,
              error: {
                code: 'ORDER_REQUIRED',
                message: 'Order ID is required for order follow-up template'
              },
              timestamp: new Date().toISOString()
            });
          }
          emailResult = await this.sendOrderFollowupEmail(order, message);
          break;
        case 'quote_discussion':
          if (!order) {
            return res.status(400).json({
              success: false,
              error: {
                code: 'ORDER_REQUIRED',
                message: 'Order ID is required for quote discussion template'
              },
              timestamp: new Date().toISOString()
            });
          }
          emailResult = await this.sendQuoteDiscussionEmail(order, message);
          break;
        case 'shipping_update':
          if (!order) {
            return res.status(400).json({
              success: false,
              error: {
                code: 'ORDER_REQUIRED',
                message: 'Order ID is required for shipping update template'
              },
              timestamp: new Date().toISOString()
            });
          }
          emailResult = await this.sendShippingUpdateEmail(order, message);
          break;
        default:
          return res.status(400).json({
            success: false,
            error: {
              code: 'INVALID_TEMPLATE',
              message: 'Invalid email template specified',
              details: { 
                template,
                availableTemplates: ['custom', 'order_followup', 'quote_discussion', 'shipping_update']
              }
            },
            timestamp: new Date().toISOString()
          });
      }

      logger.info(`Custom email sent successfully to ${customerEmail}`, {
        template,
        orderId,
        messageId: emailResult.messageId
      });

      res.status(200).json({
        success: true,
        message: 'Email sent successfully',
        data: {
          template,
          recipient: customerEmail,
          subject,
          messageId: emailResult.messageId,
          orderId: orderId || null,
          sentAt: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Error sending custom email:', error);
      
      res.status(500).json({
        success: false,
        error: {
          code: 'EMAIL_SEND_ERROR',
          message: 'Failed to send email',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        },
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get available email templates
   * GET /api/v1/admin/emails/templates
   */
  async getEmailTemplates(req, res) {
    try {
      const templates = [
        {
          id: 'custom',
          name: 'Custom Message',
          description: 'Send a custom message to a customer',
          requiredFields: ['customerEmail', 'customerName', 'subject', 'message'],
          optionalFields: ['orderId']
        },
        {
          id: 'order_followup',
          name: 'Order Follow-up',
          description: 'Follow up on an existing order',
          requiredFields: ['orderId', 'message'],
          optionalFields: []
        },
        {
          id: 'quote_discussion',
          name: 'Quote Discussion',
          description: 'Discuss custom pricing with customer',
          requiredFields: ['orderId', 'message'],
          optionalFields: []
        },
        {
          id: 'shipping_update',
          name: 'Shipping Update',
          description: 'Provide shipping information to customer',
          requiredFields: ['orderId', 'message'],
          optionalFields: []
        }
      ];

      res.status(200).json({
        success: true,
        message: 'Email templates retrieved successfully',
        data: {
          templates,
          totalCount: templates.length
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Error retrieving email templates:', error);
      
      res.status(500).json({
        success: false,
        error: {
          code: 'TEMPLATES_RETRIEVAL_ERROR',
          message: 'Failed to retrieve email templates'
        },
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Send custom message email
   */
  async sendCustomMessageEmail(customerEmail, customerName, subject, message, orderId) {
    const html = this.generateCustomEmailTemplate(customerName, subject, message, orderId);
    
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: customerEmail,
      subject,
      html,
      replyTo: process.env.ADMIN_EMAIL,
    };

    return await this.emailService.sendEmail(mailOptions);
  }

  /**
   * Send order follow-up email
   */
  async sendOrderFollowupEmail(order, message) {
    const subject = `Follow-up on Your Order #${order._id}`;
    const html = this.generateOrderFollowupTemplate(order, message);
    
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: order.customerEmail,
      subject,
      html,
      replyTo: process.env.ADMIN_EMAIL,
    };

    return await this.emailService.sendEmail(mailOptions);
  }

  /**
   * Send quote discussion email
   */
  async sendQuoteDiscussionEmail(order, message) {
    const subject = `Custom Quote Discussion - Order #${order._id}`;
    const html = this.generateQuoteDiscussionTemplate(order, message);
    
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: order.customerEmail,
      subject,
      html,
      replyTo: process.env.ADMIN_EMAIL,
    };

    return await this.emailService.sendEmail(mailOptions);
  }

  /**
   * Send shipping update email
   */
  async sendShippingUpdateEmail(order, message) {
    const subject = `Shipping Update - Order #${order._id}`;
    const html = this.generateShippingUpdateTemplate(order, message);
    
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: order.customerEmail,
      subject,
      html,
      replyTo: process.env.ADMIN_EMAIL,
    };

    return await this.emailService.sendEmail(mailOptions);
  }

  /**
   * Generate custom email template
   */
  generateCustomEmailTemplate(customerName, subject, message, orderId) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${subject}</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px;">
            ${subject}
          </h1>
          
          <p>Dear ${customerName},</p>
          
          ${orderId ? `<p>This message is regarding your order #${orderId}.</p>` : ''}
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #3498db;">
            <p style="margin: 0; white-space: pre-line;">${message}</p>
          </div>
          
          <p>If you have any questions or would like to respond, please reply to this email.</p>
          
          <p>Best regards,<br>
          Crochet Business Team</p>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="font-size: 12px; color: #666;">
            You can reply directly to this email to continue the conversation.
          </p>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate order follow-up email template
   */
  generateOrderFollowupTemplate(order, message) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Follow-up on Your Order</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px;">
            Follow-up on Your Order
          </h1>
          
          <p>Dear ${order.customerName},</p>
          
          <p>We wanted to follow up on your recent order with us.</p>
          
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #2c3e50;">Order Information</h3>
            <p><strong>Order ID:</strong> #${order._id}</p>
            <p><strong>Order Date:</strong> ${new Date(order.createdAt).toLocaleDateString()}</p>
            <p><strong>Current Status:</strong> ${order.status.charAt(0).toUpperCase() + order.status.slice(1).replace('_', ' ')}</p>
            ${order.totalAmount ? `<p><strong>Total:</strong> $${order.totalAmount.toFixed(2)}</p>` : ''}
          </div>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #3498db;">
            <p style="margin: 0; white-space: pre-line;">${message}</p>
          </div>
          
          <p>If you have any questions or concerns, please don't hesitate to reply to this email.</p>
          
          <p>Best regards,<br>
          Crochet Business Team</p>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="font-size: 12px; color: #666;">
            You can reply directly to this email if you have any questions.
          </p>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate quote discussion email template
   */
  generateQuoteDiscussionTemplate(order, message) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Custom Quote Discussion</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px;">
            Custom Quote Discussion
          </h1>
          
          <p>Dear ${order.customerName},</p>
          
          <p>We'd like to discuss the custom pricing for your order.</p>
          
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #2c3e50;">Order Information</h3>
            <p><strong>Order ID:</strong> #${order._id}</p>
            <p><strong>Order Date:</strong> ${new Date(order.createdAt).toLocaleDateString()}</p>
            <p><strong>Current Status:</strong> ${order.status.charAt(0).toUpperCase() + order.status.slice(1).replace('_', ' ')}</p>
          </div>
          
          <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h4 style="margin-top: 0; color: #856404;">Quote Discussion</h4>
            <p style="margin-bottom: 0; white-space: pre-line;">${message}</p>
          </div>
          
          <p>Please reply to this email with any questions or to discuss the pricing further. We're here to work with you to create the perfect custom items!</p>
          
          <p>Best regards,<br>
          Crochet Business Team</p>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="font-size: 12px; color: #666;">
            Please reply to this email to continue the quote discussion.
          </p>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate shipping update email template
   */
  generateShippingUpdateTemplate(order, message) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Shipping Update</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px;">
            Shipping Update
          </h1>
          
          <p>Dear ${order.customerName},</p>
          
          <p>We have an update regarding the shipping of your order.</p>
          
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #2c3e50;">Order Information</h3>
            <p><strong>Order ID:</strong> #${order._id}</p>
            <p><strong>Order Date:</strong> ${new Date(order.createdAt).toLocaleDateString()}</p>
            <p><strong>Current Status:</strong> ${order.status.charAt(0).toUpperCase() + order.status.slice(1).replace('_', ' ')}</p>
            <p><strong>Shipping Address:</strong> ${order.shippingAddress}</p>
          </div>
          
          <div style="background-color: #d4edda; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h4 style="margin-top: 0; color: #155724;">Shipping Update</h4>
            <p style="margin-bottom: 0; white-space: pre-line;">${message}</p>
          </div>
          
          <p>If you have any questions about your shipment, please don't hesitate to reply to this email.</p>
          
          <p>Best regards,<br>
          Crochet Business Team</p>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="font-size: 12px; color: #666;">
            You can reply directly to this email if you have any shipping questions.
          </p>
        </div>
      </body>
      </html>
    `;
  }
}

module.exports = AdminEmailController;