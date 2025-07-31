const request = require('supertest');
const app = require('../../src/app');
const database = require('../../src/config/database');

describe('Admin Routes Basic Test', () => {
  beforeAll(async () => {
    await database.connect();
  }, 30000);

  afterAll(async () => {
    await database.disconnect();
  }, 30000);

  it('should return 401 for admin auth without credentials', async () => {
    const response = await request(app)
      .post('/api/v1/admin/auth/login')
      .send({
        username: 'invalid',
        password: 'invalid'
      });

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  }, 30000);

  it('should return 401 for admin items without auth', async () => {
    const response = await request(app)
      .get('/api/v1/admin/items');

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  }, 30000);
});