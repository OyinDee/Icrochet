const request = require('supertest');
const app = require('../../src/app');
const { connectDB, disconnectDB, clearDB } = require('../utils/database');
const { createTestAdmin, getAdminToken } = require('../fixtures/adminUser');
const { createTestOrder } = require('../fixtures/order');
const EmailService = require('../../src/services/EmailService');

// Mock EmailService
jest.mock('../../src/services/EmailService');

describe('Admin Email Endpoints', () => {
  let adminToken;
  let testOrder;

  beforeAll(async () => {
    await connectDB();
  });

  afterAll(async () => {
    await disconnectDB();
  });

  beforeEach(async () => {
    await clearDB();
    
    // Create test admin and get token
    await createTestAdmin();
    adminToken = await getAdminToken();
    
    // Create test order
    testOrder = await createTestOrder();

    // Reset EmailService mock
    EmailService.mockClear();
    const mockEmailService = {
      sendEmail: jest.fn().mockResolvedValue({
        success: true,
        messageId: 'test-message-id',
        response: 'Email sent successfully',
        attempt: 1
      })
    };
    EmailService.mockImplementation(() => mockEmailService);
  });

  afterEach(async () => {
    await clearDB();
    jest.clearAllMocks();
  });

  describe('POST /api/v1/admin/emails/send', () => {
    const validEmailData = {
      customerEmail: 'customer@example.com',
      customerName: 'John Doe',
      subject: 'Test Email Subject',
      message: 'This is a test email message.',
      template: 'custom'
    };

    it('should send custom email successfully', async () => {
      const response = await request(app)
        .post('/api/v1/admin/emails/send')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(validEmailData)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Email sent successfully',
        data: {
          template: 'custom',
          recipient: 'customer@example.com',
          subject: 'Test Email Subject',
          messageId: 'test-message-id'
        }
      });

      expect(response.body.data).toHaveProperty('sentAt');
      expect(response.body).toHaveProperty('timestamp');
    });

    it('should send order follow-up email with valid order ID', async () => {
      const emailData = {
        ...validEmailData,
        template: 'order_followup',
        orderId: testOrder._id.toString()
      };

      const response = await request(app)
        .post('/api/v1/admin/emails/send')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(emailData)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Email sent successfully',
        data: {
          template: 'order_followup',
          orderId: testOrder._id.toString()
        }
      });
    });

    it('should send quote discussion email with valid order ID', async () => {
      const emailData = {
        ...validEmailData,
        template: 'quote_discussion',
        orderId: testOrder._id.toString()
      };

      const response = await request(app)
        .post('/api/v1/admin/emails/send')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(emailData)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Email sent successfully',
        data: {
          template: 'quote_discussion',
          orderId: testOrder._id.toString()
        }
      });
    });

    it('should send shipping update email with valid order ID', async () => {
      const emailData = {
        ...validEmailData,
        template: 'shipping_update',
        orderId: testOrder._id.toString()
      };

      const response = await request(app)
        .post('/api/v1/admin/emails/send')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(emailData)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Email sent successfully',
        data: {
          template: 'shipping_update',
          orderId: testOrder._id.toString()
        }
      });
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/v1/admin/emails/send')
        .send(validEmailData)
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication token required'
        }
      });
    });

    it('should validate required fields', async () => {
      const invalidData = {
        customerEmail: 'invalid-email',
        // Missing customerName, subject, message
      };

      const response = await request(app)
        .post('/api/v1/admin/emails/send')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed'
        }
      });

      expect(response.body.error.details).toHaveProperty('customerEmail');
      expect(response.body.error.details).toHaveProperty('customerName');
      expect(response.body.error.details).toHaveProperty('subject');
      expect(response.body.error.details).toHaveProperty('message');
    });

    it('should validate email format', async () => {
      const invalidEmailData = {
        ...validEmailData,
        customerEmail: 'invalid-email-format'
      };

      const response = await request(app)
        .post('/api/v1/admin/emails/send')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidEmailData)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed'
        }
      });

      expect(response.body.error.details).toHaveProperty('customerEmail');
    });

    it('should validate template type', async () => {
      const invalidTemplateData = {
        ...validEmailData,
        template: 'invalid_template'
      };

      const response = await request(app)
        .post('/api/v1/admin/emails/send')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidTemplateData)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed'
        }
      });

      expect(response.body.error.details).toHaveProperty('template');
    });

    it('should require order ID for order-specific templates', async () => {
      const emailData = {
        ...validEmailData,
        template: 'order_followup'
        // Missing orderId
      };

      const response = await request(app)
        .post('/api/v1/admin/emails/send')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(emailData)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'ORDER_REQUIRED',
          message: 'Order ID is required for order follow-up template'
        }
      });
    });

    it('should return 404 for non-existent order ID', async () => {
      const emailData = {
        ...validEmailData,
        template: 'order_followup',
        orderId: '507f1f77bcf86cd799439011' // Valid ObjectId format but non-existent
      };

      const response = await request(app)
        .post('/api/v1/admin/emails/send')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(emailData)
        .expect(404);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'ORDER_NOT_FOUND',
          message: 'Order not found'
        }
      });
    });

    it('should validate ObjectId format for order ID', async () => {
      const emailData = {
        ...validEmailData,
        template: 'order_followup',
        orderId: 'invalid-object-id'
      };

      const response = await request(app)
        .post('/api/v1/admin/emails/send')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(emailData)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed'
        }
      });

      expect(response.body.error.details).toHaveProperty('orderId');
    });

    it('should handle email service errors', async () => {
      // Mock email service to throw error
      const mockEmailService = {
        sendEmail: jest.fn().mockRejectedValue(new Error('Email service unavailable'))
      };
      EmailService.mockImplementation(() => mockEmailService);

      const response = await request(app)
        .post('/api/v1/admin/emails/send')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(validEmailData)
        .expect(500);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'EMAIL_SEND_ERROR',
          message: 'Failed to send email'
        }
      });
    });

    it('should validate message length limits', async () => {
      const longMessageData = {
        ...validEmailData,
        message: 'a'.repeat(5001) // Exceeds 5000 character limit
      };

      const response = await request(app)
        .post('/api/v1/admin/emails/send')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(longMessageData)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed'
        }
      });

      expect(response.body.error.details).toHaveProperty('message');
    });

    it('should validate subject length limits', async () => {
      const longSubjectData = {
        ...validEmailData,
        subject: 'a'.repeat(201) // Exceeds 200 character limit
      };

      const response = await request(app)
        .post('/api/v1/admin/emails/send')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(longSubjectData)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed'
        }
      });

      expect(response.body.error.details).toHaveProperty('subject');
    });
  });

  describe('GET /api/v1/admin/emails/templates', () => {
    it('should get available email templates', async () => {
      const response = await request(app)
        .get('/api/v1/admin/emails/templates')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Email templates retrieved successfully',
        data: {
          totalCount: 4
        }
      });

      expect(response.body.data.templates).toHaveLength(4);
      
      const templateIds = response.body.data.templates.map(t => t.id);
      expect(templateIds).toContain('custom');
      expect(templateIds).toContain('order_followup');
      expect(templateIds).toContain('quote_discussion');
      expect(templateIds).toContain('shipping_update');

      // Verify template structure
      response.body.data.templates.forEach(template => {
        expect(template).toHaveProperty('id');
        expect(template).toHaveProperty('name');
        expect(template).toHaveProperty('description');
        expect(template).toHaveProperty('requiredFields');
        expect(template).toHaveProperty('optionalFields');
        expect(Array.isArray(template.requiredFields)).toBe(true);
        expect(Array.isArray(template.optionalFields)).toBe(true);
      });
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/v1/admin/emails/templates')
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication token required'
        }
      });
    });
  });
});