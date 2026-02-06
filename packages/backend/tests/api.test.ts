import request from 'supertest';
import app from '../src/server';

describe('Health Endpoint', () => {
  it('should return 200 OK', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
  });
});

describe('Agent Endpoints', () => {
  it('should return 401 for unauthorized revoke', async () => {
    const res = await request(app)
      .delete('/api/v1/agents/0x123')
      .send();
    expect(res.status).toBe(401);
  });
});
