const nodemailer = require('nodemailer');
const config = require('../config');
const logger = require('../config/logger');

class EmailService {
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
  }

  /**
   * Initialize the nodemailer transporter
   */
  initializeTransporter() {
    try {
      this.transporter = nodemailer.createTransport({
        host: config.email.host,
        port: config.email.port,
        secure: config.email.secure,
        auth: {
          user: config.email.user,
          pass: config.email.pass,
        },
      });

      // Verify connection configuration
      this.transporter.verify((error, success) => {
        if (error) {
          logger.error('Email transporter verification failed:', error);
        } else {
          logger.info('Email transporter is ready to send messages');
        }
      });
    } catch (error) {
      logger.error('Failed to initialize email transporter:', error);
      throw error;
    }
  }

  /**
   * Send order confirmation email to customer
   * @param {Object} order - Order object
   * @returns {Promise<Object>} Email send result
   */
  async sendOrderConfirmation(order) {
    try {
      const subject = `Order Confirmation - #${order._id}`;
      const html = this.generateOrderConfirmationTemplate(order);
      
      const mailOptions = {
        from: config.email.from,
        to: order.customerEmail,
        subject,
        html,
      };

      const result = await this.sendEmail(mailOptions);
      logger.info(`Order confirmation email sent for order ${order._id}`);
      return result;
    } catch (error) {
      logger.error(`Failed to send order confirmation email for order ${order._id}:`, error);
      throw error;
    }
  }

  /**
   * Send order status update email to customer
   * @param {Object} order - Order object
   * @param {string} previousStatus - Previous order status
   * @returns {Promise<Object>} Email send result
   */
  async sendOrderStatusUpdate(order, previousStatus) {
    try {
      const subject = `Order Status Update - #${order._id}`;
      const html = this.generateOrderStatusUpdateTemplate(order, previousStatus);
      
      const mailOptions = {
        from: config.email.from,
        to: order.customerEmail,
        subject,
        html,
      };

      const result = await this.sendEmail(mailOptions);
      logger.info(`Order status update email sent for order ${order._id}`);
      return result;
    } catch (error) {
      logger.error(`Failed to send order status update email for order ${order._id}:`, error);
      throw error;
    }
  }

  /**
   * Send custom message email from admin to customer
   * @param {string} customerEmail - Customer email address
   * @param {string} customerName - Customer name
   * @param {string} message - Message content
   * @param {string} orderId - Related order ID
   * @returns {Promise<Object>} Email send result
   */
  async sendCustomMessage(customerEmail, customerName, message, orderId) {
    try {
      const subject = `Message from ${config.admin.email} - Order #${orderId}`;
      const html = this.generateCustomMessageTemplate(customerName, message, orderId);
      
      const mailOptions = {
        from: config.email.from,
        to: customerEmail,
        subject,
        html,
        replyTo: config.admin.email,
      };

      const result = await this.sendEmail(mailOptions);
      logger.info(`Custom message email sent to ${customerEmail} for order ${orderId}`);
      return result;
    } catch (error) {
      logger.error(`Failed to send custom message email to ${customerEmail}:`, error);
      throw error;
    }
  }

  /**
   * Send quote notification email to customer
   * @param {Object} order - Order object
   * @param {number} quoteAmount - Quoted amount
   * @param {string} message - Optional message from admin
   * @returns {Promise<Object>} Email send result
   */
  async sendQuoteNotification(order, quoteAmount, message = '') {
    try {
      const subject = `Custom Quote Ready - Order #${order._id}`;
      const html = this.generateQuoteNotificationTemplate(order, quoteAmount, message);
      
      const mailOptions = {
        from: config.email.from,
        to: order.customerEmail,
        subject,
        html,
        replyTo: config.admin.email,
      };

      const result = await this.sendEmail(mailOptions);
      logger.info(`Quote notification email sent for order ${order._id}`);
      return result;
    } catch (error) {
      logger.error(`Failed to send quote notification email for order ${order._id}:`, error);
      throw error;
    }
  }

  /**
   * Send quote approval confirmation email to customer
   * @param {Object} order - Order object
   * @returns {Promise<Object>} Email send result
   */
  async sendQuoteApprovalConfirmation(order) {
    try {
      const subject = `Quote Approved - Order #${order._id}`;
      const html = this.generateQuoteApprovalTemplate(order);
      
      const mailOptions = {
        from: config.email.from,
        to: order.customerEmail,
        subject,
        html,
      };

      const result = await this.sendEmail(mailOptions);
      logger.info(`Quote approval confirmation email sent for order ${order._id}`);
      return result;
    } catch (error) {
      logger.error(`Failed to send quote approval confirmation email for order ${order._id}:`, error);
      throw error;
    }
  }

  /**
   * Send new order notification to admin
   * @param {Object} order - Order object
   * @returns {Promise<Object>} Email send result
   */
  async sendAdminOrderNotification(order) {
    try {
      const subject = `New Order Received - #${order._id}`;
      const html = this.generateAdminOrderNotificationTemplate(order);
      
      const mailOptions = {
        from: config.email.from,
        to: config.admin.email,
        subject,
        html,
      };

      const result = await this.sendEmail(mailOptions);
      logger.info(`Admin order notification email sent for order ${order._id}`);
      return result;
    } catch (error) {
      logger.error(`Failed to send admin order notification email for order ${order._id}:`, error);
      throw error;
    }
  }

  /**
   * Send email with retry logic
   * @param {Object} mailOptions - Nodemailer mail options
   * @param {number} maxRetries - Maximum number of retry attempts
   * @returns {Promise<Object>} Email send result
   */
  async sendEmail(mailOptions, maxRetries = 3) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await this.transporter.sendMail(mailOptions);
        return {
          success: true,
          messageId: result.messageId,
          response: result.response,
          attempt,
        };
      } catch (error) {
        lastError = error;
        logger.warn(`Email send attempt ${attempt} failed:`, error.message);
        
        if (attempt < maxRetries) {
          // Wait before retrying (exponential backoff)
          const delay = Math.pow(2, attempt) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // All attempts failed
    logger.error(`Failed to send email after ${maxRetries} attempts:`, lastError);
    throw new Error(`Email delivery failed after ${maxRetries} attempts: ${lastError.message}`);
  }

  /**
   * Generate order confirmation email template
   * @param {Object} order - Order object
   * @returns {string} HTML template
   */
  generateOrderConfirmationTemplate(order) {
    const itemsList = order.items.map(item => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.itemId?.name || 'Item'}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.selectedColor || 'N/A'}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">
          ${item.unitPrice ? `$${item.unitPrice.toFixed(2)}` : 'Quote needed'}
        </td>
      </tr>
    `).join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Order Confirmation</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px;">
            Order Confirmation
          </h1>
          
          <p>Dear ${order.customerName},</p>
          
          <p>Thank you for your order! We've received your order and will begin processing it shortly.</p>
          
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #2c3e50;">Order Details</h3>
            <p><strong>Order ID:</strong> #${order._id}</p>
            <p><strong>Order Date:</strong> ${new Date(order.createdAt).toLocaleDateString()}</p>
            <p><strong>Status:</strong> ${order.status.charAt(0).toUpperCase() + order.status.slice(1).replace('_', ' ')}</p>
          </div>
          
          <h3 style="color: #2c3e50;">Items Ordered</h3>
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <thead>
              <tr style="background-color: #3498db; color: white;">
                <th style="padding: 10px; text-align: left;">Item</th>
                <th style="padding: 10px; text-align: center;">Quantity</th>
                <th style="padding: 10px; text-align: center;">Color</th>
                <th style="padding: 10px; text-align: right;">Price</th>
              </tr>
            </thead>
            <tbody>
              ${itemsList}
            </tbody>
          </table>
          
          ${order.totalAmount ? `
            <div style="text-align: right; margin: 20px 0;">
              <h3 style="color: #2c3e50;">Total: $${order.totalAmount.toFixed(2)}</h3>
            </div>
          ` : `
            <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p><strong>Note:</strong> This order contains custom items that require a quote. We'll contact you shortly with pricing details.</p>
            </div>
          `}
          
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #2c3e50;">Shipping Address</h3>
            <p>${order.shippingAddress}</p>
          </div>
          
          <p>If you have any questions about your order, please don't hesitate to contact us.</p>
          
          <p>Best regards,<br>
          Crochet Business Team</p>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="font-size: 12px; color: #666;">
            This is an automated message. Please do not reply directly to this email.
          </p>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate order status update email template
   * @param {Object} order - Order object
   * @param {string} previousStatus - Previous order status
   * @returns {string} HTML template
   */
  generateOrderStatusUpdateTemplate(order, previousStatus) {
    const statusMessages = {
      pending: 'Your order is pending and will be processed soon.',
      quote_needed: 'Your order requires a custom quote. We\'ll contact you shortly.',
      quoted: 'We\'ve provided a quote for your custom order.',
      confirmed: 'Your order has been confirmed and will be processed.',
      processing: 'Your order is currently being processed.',
      shipped: 'Your order has been shipped and is on its way!',
      delivered: 'Your order has been delivered.',
      cancelled: 'Your order has been cancelled.',
    };

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Order Status Update</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px;">
            Order Status Update
          </h1>
          
          <p>Dear ${order.customerName},</p>
          
          <p>We wanted to update you on the status of your order.</p>
          
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #2c3e50;">Order Information</h3>
            <p><strong>Order ID:</strong> #${order._id}</p>
            <p><strong>Previous Status:</strong> ${previousStatus.charAt(0).toUpperCase() + previousStatus.slice(1).replace('_', ' ')}</p>
            <p><strong>Current Status:</strong> ${order.status.charAt(0).toUpperCase() + order.status.slice(1).replace('_', ' ')}</p>
          </div>
          
          <div style="background-color: #d4edda; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Status Update:</strong> ${statusMessages[order.status] || 'Your order status has been updated.'}</p>
          </div>
          
          ${order.totalAmount ? `
            <p><strong>Order Total:</strong> $${order.totalAmount.toFixed(2)}</p>
          ` : ''}
          
          <p>If you have any questions about your order, please don't hesitate to contact us.</p>
          
          <p>Best regards,<br>
          Crochet Business Team</p>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="font-size: 12px; color: #666;">
            This is an automated message. Please do not reply directly to this email.
          </p>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate custom message email template
   * @param {string} customerName - Customer name
   * @param {string} message - Message content
   * @param {string} orderId - Order ID
   * @returns {string} HTML template
   */
  generateCustomMessageTemplate(customerName, message, orderId) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Message from Crochet Business</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px;">
            Message from Crochet Business
          </h1>
          
          <p>Dear ${customerName},</p>
          
          <p>We have a message for you regarding your order #${orderId}:</p>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #3498db;">
            <p style="margin: 0; font-style: italic;">${message}</p>
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
   * Generate quote notification email template
   * @param {Object} order - Order object
   * @param {number} quoteAmount - Quoted amount
   * @param {string} message - Optional message from admin
   * @returns {string} HTML template
   */
  generateQuoteNotificationTemplate(order, quoteAmount, message) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Custom Quote Ready</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px;">
            Custom Quote Ready
          </h1>
          
          <p>Dear ${order.customerName},</p>
          
          <p>We've prepared a custom quote for your order. Please review the details below:</p>
          
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #2c3e50;">Order Information</h3>
            <p><strong>Order ID:</strong> #${order._id}</p>
            <p><strong>Order Date:</strong> ${new Date(order.createdAt).toLocaleDateString()}</p>
          </div>
          
          <div style="background-color: #d4edda; padding: 20px; border-radius: 5px; margin: 20px 0; text-align: center;">
            <h2 style="margin: 0; color: #155724;">Quoted Amount: $${quoteAmount.toFixed(2)}</h2>
          </div>
          
          ${message ? `
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #3498db;">
              <h4 style="margin-top: 0; color: #2c3e50;">Additional Notes:</h4>
              <p style="margin-bottom: 0;">${message}</p>
            </div>
          ` : ''}
          
          <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Next Steps:</strong> Please reply to this email to approve the quote and proceed with your order, or if you have any questions about the pricing.</p>
          </div>
          
          <p>We look forward to creating your custom crochet items!</p>
          
          <p>Best regards,<br>
          Crochet Business Team</p>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="font-size: 12px; color: #666;">
            Please reply to this email to approve the quote or ask any questions.
          </p>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate quote approval confirmation email template
   * @param {Object} order - Order object
   * @returns {string} HTML template
   */
  generateQuoteApprovalTemplate(order) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Quote Approved</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px;">
            Quote Approved - Order Confirmed
          </h1>
          
          <p>Dear ${order.customerName},</p>
          
          <p>Great news! Your quote has been approved and your order is now confirmed.</p>
          
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #2c3e50;">Order Information</h3>
            <p><strong>Order ID:</strong> #${order._id}</p>
            <p><strong>Status:</strong> Confirmed</p>
            <p><strong>Total Amount:</strong> $${order.totalAmount.toFixed(2)}</p>
          </div>
          
          <div style="background-color: #d4edda; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 0;"><strong>What's Next:</strong> We'll begin processing your order and will keep you updated on the progress. You can expect regular status updates via email.</p>
          </div>
          
          <p>Thank you for choosing us for your custom crochet needs!</p>
          
          <p>Best regards,<br>
          Crochet Business Team</p>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="font-size: 12px; color: #666;">
            This is an automated message. Please do not reply directly to this email.
          </p>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate admin order notification email template
   * @param {Object} order - Order object
   * @returns {string} HTML template
   */
  generateAdminOrderNotificationTemplate(order) {
    const itemsList = order.items.map(item => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.itemId?.name || 'Item'}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.selectedColor || 'N/A'}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.customRequirements || 'None'}</td>
      </tr>
    `).join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>New Order Received</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #2c3e50; border-bottom: 2px solid #e74c3c; padding-bottom: 10px;">
            New Order Received
          </h1>
          
          <p>A new order has been placed and requires your attention.</p>
          
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #2c3e50;">Order Details</h3>
            <p><strong>Order ID:</strong> #${order._id}</p>
            <p><strong>Order Date:</strong> ${new Date(order.createdAt).toLocaleDateString()}</p>
            <p><strong>Status:</strong> ${order.status.charAt(0).toUpperCase() + order.status.slice(1).replace('_', ' ')}</p>
            ${order.totalAmount ? `<p><strong>Total:</strong> $${order.totalAmount.toFixed(2)}</p>` : '<p><strong>Total:</strong> Quote needed</p>'}
          </div>
          
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #2c3e50;">Customer Information</h3>
            <p><strong>Name:</strong> ${order.customerName}</p>
            <p><strong>Email:</strong> ${order.customerEmail}</p>
            ${order.customerPhone ? `<p><strong>Phone:</strong> ${order.customerPhone}</p>` : ''}
            <p><strong>Shipping Address:</strong> ${order.shippingAddress}</p>
          </div>
          
          <h3 style="color: #2c3e50;">Items Ordered</h3>
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <thead>
              <tr style="background-color: #e74c3c; color: white;">
                <th style="padding: 10px; text-align: left;">Item</th>
                <th style="padding: 10px; text-align: center;">Quantity</th>
                <th style="padding: 10px; text-align: center;">Color</th>
                <th style="padding: 10px; text-align: left;">Custom Requirements</th>
              </tr>
            </thead>
            <tbody>
              ${itemsList}
            </tbody>
          </table>
          
          ${order.hasCustomItems ? `
            <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p style="margin: 0;"><strong>Action Required:</strong> This order contains custom items that require a quote. Please review and provide pricing.</p>
            </div>
          ` : ''}
          
          <p>Please log in to the admin panel to manage this order.</p>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="font-size: 12px; color: #666;">
            This is an automated notification from the Crochet Business API.
          </p>
        </div>
      </body>
      </html>
    `;
  }
}

module.exports = EmailService;