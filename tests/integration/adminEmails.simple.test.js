const request = require('supertest');
const app = require('../../src/app');
const database = require('../../src/config/database');

// Mock EmailService to prevent SMTP connection issues
jest.mock('../../src/services/EmailService', () => {
  return jest.fn().mockImplementation(() => ({
    sendEmail: jest.fn().mockResolvedValue({
      success: true,
      messageId: 'test-message-id'
    })
  }));
});

describe('Admin Email Endpoints - Simple Test', () => {
  beforeAll(async () => {
    await database.connect();
  }, 30000);

  afterAll(async () => {
    await database.disconnect();
  }, 30000);

  it('should return 401 for unauthenticated request', async () => {
    const response = await request(app)
      .post('/api/v1/admin/emails/send')
      .send({
        customerEmail: 'test@example.com',
        customerName: 'Test User',
        subject: 'Test Subject',
        message: 'Test message'
      });

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  }, 30000);

  it('should return templates endpoint without auth error', async () => {
    const response = await request(app)
      .get('/api/v1/admin/emails/templates');

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  }, 30000);
});