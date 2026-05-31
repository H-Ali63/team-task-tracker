/**
 * Integration tests for authentication flow.
 * Tests: register → login → refresh token rotation → logout
 */
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

// Mock Redis before importing app
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

afterEach(async () => {
  // Clean collections between tests
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

describe('Auth Flow', () => {
  const userData = {
    name: 'Alice Johnson',
    email: 'alice@test.com',
    password: 'secret123',
    organizationName: 'Test Corp',
  };

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user and create an organization', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe(userData.email);
      expect(res.body.data.user.role).toBe('ADMIN'); // First user of org = ADMIN
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();
      // Password should never be returned
      expect(res.body.data.user.password).toBeUndefined();
    });

    it('should reject duplicate email registration', async () => {
      await request(app).post('/api/v1/auth/register').send(userData);
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ ...userData, organizationName: 'Another Org' })
        .expect(409);

      expect(res.body.code).toBe('CONFLICT');
    });

    it('should validate required fields', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ email: 'notvalid' })
        .expect(400);

      expect(res.body.code).toBe('VALIDATION_ERROR');
    });

    it('should reject missing organizationName and organizationId', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ name: 'Bob', email: 'bob@test.com', password: 'secret123' })
        .expect(400);

      expect(res.body.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/v1/auth/login', () => {
    beforeEach(async () => {
      await request(app).post('/api/v1/auth/register').send(userData);
    });

    it('should login with valid credentials', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: userData.email, password: userData.password })
        .expect(200);

      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();
    });

    it('should reject invalid password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: userData.email, password: 'wrongpassword' })
        .expect(401);

      expect(res.body.code).toBe('INVALID_CREDENTIALS');
    });

    it('should reject non-existent email', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'ghost@test.com', password: 'secret123' })
        .expect(401);

      expect(res.body.code).toBe('INVALID_CREDENTIALS');
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    let refreshToken;

    beforeEach(async () => {
      const res = await request(app).post('/api/v1/auth/register').send(userData);
      refreshToken = res.body.data.refreshToken;
    });

    it('should issue new tokens on valid refresh', async () => {
      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();
      // New refresh token should be different
      expect(res.body.data.refreshToken).not.toBe(refreshToken);
    });

    it('should reject a reused refresh token', async () => {
      // Use the token once
      const res1 = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken });
      expect(res1.status).toBe(200);

      // Try to reuse the old token
      const res2 = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken })
        .expect(401);

      expect(res2.body.code).toBe('TOKEN_INVALID');
    });
  });
});
