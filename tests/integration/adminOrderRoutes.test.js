const request = require('supertest');
const app = require('../../src/app');

describe('Admin Order Routes Integration', () => {
  describe('Route Mounting', () => {
    it('should mount admin order routes at /api/v1/admin/orders', async () => {
      // Test that the route exists (even if it returns 401 due to auth)
      const response = await request(app)
        .get('/api/v1/admin/orders')
        .expect((res) => {
          // Should not be 404 (route not found)
          expect(res.status).not.toBe(404);
        });
    });

    it('should return 401 for unauthenticated requests to admin order routes', async () => {
      const response = await request(app)
        .get('/api/v1/admin/orders')
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });

    it('should have admin order routes available in API info endpoint', async () => {
      const response = await request(app)
        .get('/api/v1/info')
        .expect(200);

      expect(response.body.data.endpoints.admin).toHaveProperty('orders', '/api/v1/admin/orders');
    });
  });
});