const request = require('supertest');
const app = require('../../src/app');
const database = require('../../src/config/database');

describe('App Basic Test', () => {
  beforeAll(async () => {
    await database.connect();
  }, 30000);

  afterAll(async () => {
    await database.disconnect();
  }, 30000);

  it('should respond to health check', async () => {
    const response = await request(app)
      .get('/api/v1/health');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  }, 30000);

  it('should respond to info endpoint', async () => {
    const response = await request(app)
      .get('/api/v1/info');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  }, 30000);
});