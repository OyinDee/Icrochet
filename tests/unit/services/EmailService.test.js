const EmailService = require('../../../src/services/EmailService');
const nodemailer = require('nodemailer');
const config = require('../../../src/config');
const logger = require('../../../src/config/logger');

// Mock nodemailer
jest.mock('nodemailer');
jest.mock('../../../src/config/logger');

describe('EmailService', () => {
  let emailService;
  let mockTransporter;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Mock transporter
    mockTransporter = {
      sendMail: jest.fn(),
      verify: jest.fn(),
    };

    // Mock nodemailer.createTransport
    nodemailer.createTransport = jest.fn().mockReturnValue(mockTransporter);

    // Mock successful verification
    mockTransporter.verify.mockImplementation((callback) => {
      callback(null, true);
    });

    emailService = new EmailService();
  });

  describe('constructor', () => {
    it('should initialize transporter with correct configuration', () => {
      expect(nodemailer.createTransport).toHaveBeenCalledWith({
        host: config.email.host,
        port: config.email.port,
        secure: config.email.secure,
        auth: {
          user: config.email.user,
          pass: config.email.pass,
        },
      });
    });

    it('should verify transporter connection', () => {
      expect(mockTransporter.verify).toHaveBeenCalled();
    });

    it('should log success when verification succeeds', () => {
      expect(logger.info).toHaveBeenCalledWith('Email transporter is ready to send messages');
    });

    it('should log error when verification fails', () => {
      // Create a new instance with failing verification
      mockTransporter.verify.mockImplementation((callback) => {
        callback(new Error('Connection failed'), false);
      });

      new EmailService();

      expect(logger.error).toHaveBeenCalledWith('Email transporter verification failed:', expect.any(Error));
    });
  });

  describe('sendOrderConfirmation', () => {
    const mockOrder = {
      _id: '507f1f77bcf86cd799439011',
      customerName: 'John Doe',
      customerEmail: 'john@example.com',
      customerPhone: '123-456-7890',
      shippingAddress: '123 Main St, City, State 12345',
      items: [
        {
          itemId: { name: 'Crochet Hat' },
          quantity: 2,
          selectedColor: 'Blue',
          unitPrice: 25.00,
        },
        {
          itemId: { name: 'Custom Scarf' },
          quantity: 1,
          selectedColor: 'Red',
          unitPrice: null, // Custom pricing
        },
      ],
      totalAmount: 50.00,
      status: 'pending',
      createdAt: new Date('2023-01-01'),
    };

    it('should send order confirmation email successfully', async () => {
      mockTransporter.sendMail.mockResolvedValue({
        messageId: 'test-message-id',
        response: 'Email sent successfully',
      });

      const result = await emailService.sendOrderConfirmation(mockOrder);

      expect(mockTransporter.sendMail).toHaveBeenCalledWith({
        from: config.email.from,
        to: mockOrder.customerEmail,
        subject: `Order Confirmation - #${mockOrder._id}`,
        html: expect.stringContaining(mockOrder.customerName),
      });

      expect(result).toEqual({
        success: true,
        messageId: 'test-message-id',
        response: 'Email sent successfully',
        attempt: 1,
      });

      expect(logger.info).toHaveBeenCalledWith(`Order confirmation email sent for order ${mockOrder._id}`);
    });

    it('should include order details in email template', async () => {
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'test' });

      await emailService.sendOrderConfirmation(mockOrder);

      const emailCall = mockTransporter.sendMail.mock.calls[0][0];
      expect(emailCall.html).toContain(mockOrder.customerName);
      expect(emailCall.html).toContain(mockOrder._id);
      expect(emailCall.html).toContain('Crochet Hat');
      expect(emailCall.html).toContain('Blue');
      expect(emailCall.html).toContain('$25.00');
      expect(emailCall.html).toContain(mockOrder.shippingAddress);
    });

    it('should handle custom pricing items in template', async () => {
      const customOrder = {
        ...mockOrder,
        totalAmount: null,
        items: [
          {
            itemId: { name: 'Custom Item' },
            quantity: 1,
            selectedColor: 'Green',
            unitPrice: null,
          },
        ],
      };

      mockTransporter.sendMail.mockResolvedValue({ messageId: 'test' });

      await emailService.sendOrderConfirmation(customOrder);

      const emailCall = mockTransporter.sendMail.mock.calls[0][0];
      expect(emailCall.html).toContain('Quote needed');
      expect(emailCall.html).toContain('custom items that require a quote');
    });

    it('should throw error when email sending fails', async () => {
      const error = new Error('SMTP connection failed');
      mockTransporter.sendMail.mockRejectedValue(error);

      await expect(emailService.sendOrderConfirmation(mockOrder)).rejects.toThrow('Email delivery failed after 3 attempts');

      expect(logger.error).toHaveBeenCalledWith(
        `Failed to send order confirmation email for order ${mockOrder._id}:`,
        expect.any(Error)
      );
    });
  });

  describe('sendOrderStatusUpdate', () => {
    const mockOrder = {
      _id: '507f1f77bcf86cd799439011',
      customerName: 'John Doe',
      customerEmail: 'john@example.com',
      status: 'processing',
      totalAmount: 75.00,
    };

    it('should send order status update email successfully', async () => {
      mockTransporter.sendMail.mockResolvedValue({
        messageId: 'test-message-id',
        response: 'Email sent successfully',
      });

      const result = await emailService.sendOrderStatusUpdate(mockOrder, 'pending');

      expect(mockTransporter.sendMail).toHaveBeenCalledWith({
        from: config.email.from,
        to: mockOrder.customerEmail,
        subject: `Order Status Update - #${mockOrder._id}`,
        html: expect.stringContaining(mockOrder.customerName),
      });

      expect(result.success).toBe(true);
      expect(logger.info).toHaveBeenCalledWith(`Order status update email sent for order ${mockOrder._id}`);
    });

    it('should include status information in email template', async () => {
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'test' });

      await emailService.sendOrderStatusUpdate(mockOrder, 'pending');

      const emailCall = mockTransporter.sendMail.mock.calls[0][0];
      expect(emailCall.html).toContain('Pending');
      expect(emailCall.html).toContain('Processing');
      expect(emailCall.html).toContain('currently being processed');
    });
  });

  describe('sendCustomMessage', () => {
    it('should send custom message email successfully', async () => {
      mockTransporter.sendMail.mockResolvedValue({
        messageId: 'test-message-id',
        response: 'Email sent successfully',
      });

      const result = await emailService.sendCustomMessage(
        'customer@example.com',
        'Jane Doe',
        'Your custom order is ready for pickup.',
        '507f1f77bcf86cd799439011'
      );

      expect(mockTransporter.sendMail).toHaveBeenCalledWith({
        from: config.email.from,
        to: 'customer@example.com',
        subject: `Message from ${config.admin.email} - Order #507f1f77bcf86cd799439011`,
        html: expect.stringContaining('Jane Doe'),
        replyTo: config.admin.email,
      });

      expect(result.success).toBe(true);
      expect(logger.info).toHaveBeenCalledWith(
        'Custom message email sent to customer@example.com for order 507f1f77bcf86cd799439011'
      );
    });

    it('should include message content in email template', async () => {
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'test' });

      await emailService.sendCustomMessage(
        'customer@example.com',
        'Jane Doe',
        'Your custom order is ready for pickup.',
        '507f1f77bcf86cd799439011'
      );

      const emailCall = mockTransporter.sendMail.mock.calls[0][0];
      expect(emailCall.html).toContain('Jane Doe');
      expect(emailCall.html).toContain('Your custom order is ready for pickup.');
      expect(emailCall.html).toContain('507f1f77bcf86cd799439011');
    });
  });

  describe('sendQuoteNotification', () => {
    const mockOrder = {
      _id: '507f1f77bcf86cd799439011',
      customerName: 'John Doe',
      customerEmail: 'john@example.com',
      createdAt: new Date('2023-01-01'),
    };

    it('should send quote notification email successfully', async () => {
      mockTransporter.sendMail.mockResolvedValue({
        messageId: 'test-message-id',
        response: 'Email sent successfully',
      });

      const result = await emailService.sendQuoteNotification(mockOrder, 125.50, 'Custom sizing applied');

      expect(mockTransporter.sendMail).toHaveBeenCalledWith({
        from: config.email.from,
        to: mockOrder.customerEmail,
        subject: `Custom Quote Ready - Order #${mockOrder._id}`,
        html: expect.stringContaining(mockOrder.customerName),
        replyTo: config.admin.email,
      });

      expect(result.success).toBe(true);
      expect(logger.info).toHaveBeenCalledWith(`Quote notification email sent for order ${mockOrder._id}`);
    });

    it('should include quote amount and message in email template', async () => {
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'test' });

      await emailService.sendQuoteNotification(mockOrder, 125.50, 'Custom sizing applied');

      const emailCall = mockTransporter.sendMail.mock.calls[0][0];
      expect(emailCall.html).toContain('$125.50');
      expect(emailCall.html).toContain('Custom sizing applied');
      expect(emailCall.html).toContain(mockOrder.customerName);
    });

    it('should work without optional message', async () => {
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'test' });

      await emailService.sendQuoteNotification(mockOrder, 125.50);

      const emailCall = mockTransporter.sendMail.mock.calls[0][0];
      expect(emailCall.html).toContain('$125.50');
      expect(emailCall.html).not.toContain('Additional Notes:');
    });
  });

  describe('sendQuoteApprovalConfirmation', () => {
    const mockOrder = {
      _id: '507f1f77bcf86cd799439011',
      customerName: 'John Doe',
      customerEmail: 'john@example.com',
      totalAmount: 125.50,
    };

    it('should send quote approval confirmation email successfully', async () => {
      mockTransporter.sendMail.mockResolvedValue({
        messageId: 'test-message-id',
        response: 'Email sent successfully',
      });

      const result = await emailService.sendQuoteApprovalConfirmation(mockOrder);

      expect(mockTransporter.sendMail).toHaveBeenCalledWith({
        from: config.email.from,
        to: mockOrder.customerEmail,
        subject: `Quote Approved - Order #${mockOrder._id}`,
        html: expect.stringContaining(mockOrder.customerName),
      });

      expect(result.success).toBe(true);
      expect(logger.info).toHaveBeenCalledWith(`Quote approval confirmation email sent for order ${mockOrder._id}`);
    });

    it('should include order details in email template', async () => {
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'test' });

      await emailService.sendQuoteApprovalConfirmation(mockOrder);

      const emailCall = mockTransporter.sendMail.mock.calls[0][0];
      expect(emailCall.html).toContain(mockOrder.customerName);
      expect(emailCall.html).toContain('$125.50');
      expect(emailCall.html).toContain('Confirmed');
    });
  });

  describe('sendAdminOrderNotification', () => {
    const mockOrder = {
      _id: '507f1f77bcf86cd799439011',
      customerName: 'John Doe',
      customerEmail: 'john@example.com',
      customerPhone: '123-456-7890',
      shippingAddress: '123 Main St, City, State 12345',
      items: [
        {
          itemId: { name: 'Crochet Hat' },
          quantity: 2,
          selectedColor: 'Blue',
          customRequirements: 'Extra large size',
        },
      ],
      totalAmount: 50.00,
      status: 'pending',
      hasCustomItems: true,
      createdAt: new Date('2023-01-01'),
    };

    it('should send admin order notification email successfully', async () => {
      mockTransporter.sendMail.mockResolvedValue({
        messageId: 'test-message-id',
        response: 'Email sent successfully',
      });

      const result = await emailService.sendAdminOrderNotification(mockOrder);

      expect(mockTransporter.sendMail).toHaveBeenCalledWith({
        from: config.email.from,
        to: config.admin.email,
        subject: `New Order Received - #${mockOrder._id}`,
        html: expect.stringContaining(mockOrder.customerName),
      });

      expect(result.success).toBe(true);
      expect(logger.info).toHaveBeenCalledWith(`Admin order notification email sent for order ${mockOrder._id}`);
    });

    it('should include all order and customer details in email template', async () => {
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'test' });

      await emailService.sendAdminOrderNotification(mockOrder);

      const emailCall = mockTransporter.sendMail.mock.calls[0][0];
      expect(emailCall.html).toContain(mockOrder.customerName);
      expect(emailCall.html).toContain(mockOrder.customerEmail);
      expect(emailCall.html).toContain(mockOrder.customerPhone);
      expect(emailCall.html).toContain(mockOrder.shippingAddress);
      expect(emailCall.html).toContain('Crochet Hat');
      expect(emailCall.html).toContain('Blue');
      expect(emailCall.html).toContain('Extra large size');
      expect(emailCall.html).toContain('Action Required');
    });
  });

  describe('sendEmail', () => {
    const mockMailOptions = {
      from: 'test@example.com',
      to: 'recipient@example.com',
      subject: 'Test Email',
      html: '<p>Test content</p>',
    };

    it('should send email successfully on first attempt', async () => {
      mockTransporter.sendMail.mockResolvedValue({
        messageId: 'test-message-id',
        response: 'Email sent successfully',
      });

      const result = await emailService.sendEmail(mockMailOptions);

      expect(mockTransporter.sendMail).toHaveBeenCalledTimes(1);
      expect(mockTransporter.sendMail).toHaveBeenCalledWith(mockMailOptions);
      expect(result).toEqual({
        success: true,
        messageId: 'test-message-id',
        response: 'Email sent successfully',
        attempt: 1,
      });
    });

    it('should retry on failure and succeed on second attempt', async () => {
      mockTransporter.sendMail
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockResolvedValueOnce({
          messageId: 'test-message-id',
          response: 'Email sent successfully',
        });

      // Mock setTimeout to avoid actual delays in tests
      jest.spyOn(global, 'setTimeout').mockImplementation((callback) => callback());

      const result = await emailService.sendEmail(mockMailOptions);

      expect(mockTransporter.sendMail).toHaveBeenCalledTimes(2);
      expect(result).toEqual({
        success: true,
        messageId: 'test-message-id',
        response: 'Email sent successfully',
        attempt: 2,
      });

      global.setTimeout.mockRestore();
    });

    it('should fail after maximum retry attempts', async () => {
      const error = new Error('Persistent failure');
      mockTransporter.sendMail.mockRejectedValue(error);

      // Mock setTimeout to avoid actual delays in tests
      jest.spyOn(global, 'setTimeout').mockImplementation((callback) => callback());

      await expect(emailService.sendEmail(mockMailOptions)).rejects.toThrow(
        'Email delivery failed after 3 attempts: Persistent failure'
      );

      expect(mockTransporter.sendMail).toHaveBeenCalledTimes(3);
      expect(logger.warn).toHaveBeenCalledTimes(3);
      expect(logger.error).toHaveBeenCalledWith('Failed to send email after 3 attempts:', error);

      global.setTimeout.mockRestore();
    });

    it('should use custom max retries', async () => {
      const error = new Error('Persistent failure');
      mockTransporter.sendMail.mockRejectedValue(error);

      // Mock setTimeout to avoid actual delays in tests
      jest.spyOn(global, 'setTimeout').mockImplementation((callback) => callback());

      await expect(emailService.sendEmail(mockMailOptions, 1)).rejects.toThrow(
        'Email delivery failed after 1 attempts: Persistent failure'
      );

      expect(mockTransporter.sendMail).toHaveBeenCalledTimes(1);

      global.setTimeout.mockRestore();
    });
  });

  describe('template generation methods', () => {
    const mockOrder = {
      _id: '507f1f77bcf86cd799439011',
      customerName: 'John Doe',
      customerEmail: 'john@example.com',
      items: [
        {
          itemId: { name: 'Test Item' },
          quantity: 1,
          selectedColor: 'Blue',
          unitPrice: 25.00,
        },
      ],
      totalAmount: 25.00,
      status: 'pending',
      shippingAddress: '123 Test St',
      createdAt: new Date('2023-01-01'),
    };

    it('should generate order confirmation template', () => {
      const html = emailService.generateOrderConfirmationTemplate(mockOrder);

      expect(html).toContain('Order Confirmation');
      expect(html).toContain(mockOrder.customerName);
      expect(html).toContain(mockOrder._id);
      expect(html).toContain('Test Item');
      expect(html).toContain('$25.00');
    });

    it('should generate order status update template', () => {
      const html = emailService.generateOrderStatusUpdateTemplate(mockOrder, 'pending');

      expect(html).toContain('Order Status Update');
      expect(html).toContain(mockOrder.customerName);
      expect(html).toContain('Pending');
    });

    it('should generate custom message template', () => {
      const html = emailService.generateCustomMessageTemplate('John Doe', 'Test message', '123');

      expect(html).toContain('Message from Crochet Business');
      expect(html).toContain('John Doe');
      expect(html).toContain('Test message');
      expect(html).toContain('123');
    });

    it('should generate quote notification template', () => {
      const html = emailService.generateQuoteNotificationTemplate(mockOrder, 125.50, 'Test note');

      expect(html).toContain('Custom Quote Ready');
      expect(html).toContain(mockOrder.customerName);
      expect(html).toContain('$125.50');
      expect(html).toContain('Test note');
    });

    it('should generate quote approval template', () => {
      const html = emailService.generateQuoteApprovalTemplate(mockOrder);

      expect(html).toContain('Quote Approved');
      expect(html).toContain(mockOrder.customerName);
      expect(html).toContain('Confirmed');
    });

    it('should generate admin order notification template', () => {
      const html = emailService.generateAdminOrderNotificationTemplate(mockOrder);

      expect(html).toContain('New Order Received');
      expect(html).toContain(mockOrder.customerName);
      expect(html).toContain(mockOrder.customerEmail);
    });
  });
});