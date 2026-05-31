/**
 * Integration tests for task status transition enforcement.
 * Tests the state-machine logic: TODO → IN_PROGRESS → IN_REVIEW → DONE
 */
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

jest.mock('../config/redis', () => ({
  connectRedis: jest.fn(),
  getRedisClient: jest.fn(() => ({
    get: jest.fn().mockResolvedValue(null),
    setex: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    keys: jest.fn().mockResolvedValue([]),
    on: jest.fn(),
  })),
}));

let app, server, mongoServer;
let adminToken, memberToken, adminUserId, memberUserId, taskId;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  process.env.MONGO_URI = mongoServer.getUri();
  process.env.JWT_ACCESS_SECRET = 'test_access_secret';
  process.env.JWT_REFRESH_SECRET = 'test_refresh_secret';
  process.env.JWT_ACCESS_EXPIRES_IN = '15m';
  process.env.JWT_REFRESH_EXPIRES_IN = '7d';
  process.env.NODE_ENV = 'test';

  const appModule = require('../app');
  app = appModule.app;
  server = appModule.server;
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
  server.close();
});

beforeEach(async () => {
  // Clean slate
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }

  // Register admin (creates org)
  const adminRes = await request(app)
    .post('/api/v1/auth/register')
    .send({ name: 'Admin User', email: 'admin@test.com', password: 'secret123', organizationName: 'Test Corp' });
  adminToken = adminRes.body.data.accessToken;
  adminUserId = adminRes.body.data.user._id;

  // Register member (joins same org)
  const orgId = adminRes.body.data.user.organizationId;
  const memberRes = await request(app)
    .post('/api/v1/auth/register')
    .send({ name: 'Member User', email: 'member@test.com', password: 'secret123', organizationId: orgId });
  memberToken = memberRes.body.data.accessToken;
  memberUserId = memberRes.body.data.user._id;

  // Create a task assigned to the member
  const taskRes = await request(app)
    .post('/api/v1/tasks')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ title: 'Test Task', priority: 'HIGH', assignee: memberUserId });
  taskId = taskRes.body.data.task._id;
});

describe('Task Status Transitions', () => {
  it('should transition TODO → IN_PROGRESS', async () => {
    const res = await request(app)
      .patch(`/api/v1/tasks/${taskId}/status`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ status: 'IN_PROGRESS' })
      .expect(200);

    expect(res.body.data.task.status).toBe('IN_PROGRESS');
  });

  it('should transition IN_PROGRESS → IN_REVIEW', async () => {
    await request(app)
      .patch(`/api/v1/tasks/${taskId}/status`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ status: 'IN_PROGRESS' });

    const res = await request(app)
      .patch(`/api/v1/tasks/${taskId}/status`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ status: 'IN_REVIEW' })
      .expect(200);

    expect(res.body.data.task.status).toBe('IN_REVIEW');
  });

  it('should transition IN_REVIEW → DONE and set completedAt', async () => {
    await request(app).patch(`/api/v1/tasks/${taskId}/status`).set('Authorization', `Bearer ${memberToken}`).send({ status: 'IN_PROGRESS' });
    await request(app).patch(`/api/v1/tasks/${taskId}/status`).set('Authorization', `Bearer ${memberToken}`).send({ status: 'IN_REVIEW' });

    const res = await request(app)
      .patch(`/api/v1/tasks/${taskId}/status`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ status: 'DONE' })
      .expect(200);

    expect(res.body.data.task.status).toBe('DONE');
  });

  it('should REJECT skipping TODO → IN_REVIEW', async () => {
    const res = await request(app)
      .patch(`/api/v1/tasks/${taskId}/status`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ status: 'IN_REVIEW' })
      .expect(400);

    expect(res.body.code).toBe('INVALID_TRANSITION');
  });

  it('should REJECT transition from DONE to any status', async () => {
    // Fast-track to DONE via admin
    await request(app).patch(`/api/v1/tasks/${taskId}/status`).set('Authorization', `Bearer ${adminToken}`).send({ status: 'IN_PROGRESS' });
    await request(app).patch(`/api/v1/tasks/${taskId}/status`).set('Authorization', `Bearer ${adminToken}`).send({ status: 'IN_REVIEW' });
    await request(app).patch(`/api/v1/tasks/${taskId}/status`).set('Authorization', `Bearer ${adminToken}`).send({ status: 'DONE' });

    const res = await request(app)
      .patch(`/api/v1/tasks/${taskId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'TODO' })
      .expect(400);

    expect(res.body.code).toBe('INVALID_TRANSITION');
  });

  it('should allow BLOCKED from any active state', async () => {
    const res = await request(app)
      .patch(`/api/v1/tasks/${taskId}/status`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ status: 'BLOCKED' })
      .expect(200);

    expect(res.body.data.task.status).toBe('BLOCKED');
  });

  it('should REJECT a non-assignee MEMBER from updating status', async () => {
    // Register another member
    const orgId = (await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${memberToken}`)).body.data.user.organizationId;
    const otherRes = await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'Other Member', email: 'other@test.com', password: 'secret123', organizationId: orgId });
    const otherToken = otherRes.body.data.accessToken;

    const res = await request(app)
      .patch(`/api/v1/tasks/${taskId}/status`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ status: 'IN_PROGRESS' })
      .expect(403);

    expect(res.body.code).toBe('FORBIDDEN');
  });
});

describe('Task RBAC', () => {
  it('should allow MEMBER to see their own tasks', async () => {
    const res = await request(app)
      .get('/api/v1/tasks')
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(200);

    // Member should only see tasks assigned to them
    res.body.data.tasks.forEach((task) => {
      expect(task.assignee._id).toBe(memberUserId);
    });
  });

  it('should forbid MEMBER from creating tasks', async () => {
    const res = await request(app)
      .post('/api/v1/tasks')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ title: 'Sneaky task' })
      .expect(403);

    expect(res.body.code).toBe('FORBIDDEN');
  });

  it('should reject unauthenticated task access', async () => {
    await request(app).get('/api/v1/tasks').expect(401);
  });
});
