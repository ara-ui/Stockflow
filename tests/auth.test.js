const { test, before, after, describe, beforeEach } = require('node:test');
const assert = require('node:assert');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const authMiddleware = require('../src/middleware/auth');
const {
  connectTestDB,
  clearDb,
  disconnectTestDB,
  Organization,
  User,
} = require('./helpers');

let server;
let baseUrl;

before(async () => {
  await connectTestDB();
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://localhost:${port}`;
      resolve();
    });
  });
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
  await disconnectTestDB();
});

beforeEach(async () => {
  await clearDb();
});

async function postJson(path, body) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  return { status: response.status, data };
}

function mockReqResNext(req = {}) {
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    },
  };
  const next = (err) => {
    next.error = err;
  };
  next.error = null;
  return { req: { ...req }, res, next };
}

describe('Authentication', () => {
  describe('POST /api/auth/signup', () => {
    test('successful signup returns token and user', async () => {
      const { status, data } = await postJson('/api/auth/signup', {
        email: 'test@example.com',
        password: 'password123',
        confirmPassword: 'password123',
        organizationName: 'Test Org',
      });

      assert.strictEqual(status, 201);
      assert.ok(data.token);
      assert.strictEqual(data.user.email, 'test@example.com');
      assert.ok(data.user.id);
      assert.ok(data.user.organizationId);
      assert.strictEqual(data.user.passwordHash, undefined);
      // New: organization is returned
      assert.ok(data.organization);
      assert.strictEqual(data.organization.name, 'Test Org');
      assert.ok(data.organization.id);
      assert.strictEqual(data.organization.defaultLowStockThreshold, 5);
    });

    test('email is normalized to lowercase', async () => {
      await postJson('/api/auth/signup', {
        email: 'TEST@EXAMPLE.COM',
        password: 'password123',
        confirmPassword: 'password123',
        organizationName: 'Test Org',
      });

      const user = await User.findOne({ email: 'test@example.com' });
      assert.ok(user);
      assert.strictEqual(user.email, 'test@example.com');
    });

    test('organization is created and user associated', async () => {
      const { data } = await postJson('/api/auth/signup', {
        email: 'test@example.com',
        password: 'password123',
        confirmPassword: 'password123',
        organizationName: 'Test Org',
      });

      const user = await User.findById(data.user.id);
      assert.ok(user);
      assert.strictEqual(user.organizationId.toString(), data.user.organizationId);

      const org = await Organization.findById(data.user.organizationId);
      assert.ok(org);
      assert.strictEqual(org.name, 'Test Org');
    });

    test('password is hashed, not stored as plaintext', async () => {
      await postJson('/api/auth/signup', {
        email: 'test@example.com',
        password: 'password123',
        confirmPassword: 'password123',
        organizationName: 'Test Org',
      });

      const user = await User.findOne({ email: 'test@example.com' }).select('+passwordHash');
      assert.ok(user);
      assert.notStrictEqual(user.passwordHash, 'password123');
      assert.ok(user.passwordHash.length > 20);
    });

    test('password hash is not returned in response', async () => {
      const { data } = await postJson('/api/auth/signup', {
        email: 'test@example.com',
        password: 'password123',
        confirmPassword: 'password123',
        organizationName: 'Test Org',
      });

      assert.strictEqual(data.user.passwordHash, undefined);
      assert.strictEqual(data.passwordHash, undefined);
    });

    test('duplicate email returns 409 with EMAIL_EXISTS code', async () => {
      await postJson('/api/auth/signup', {
        email: 'test@example.com',
        password: 'password123',
        confirmPassword: 'password123',
        organizationName: 'Test Org',
      });

      const { status, data } = await postJson('/api/auth/signup', {
        email: 'test@example.com',
        password: 'different123',
        confirmPassword: 'different123',
        organizationName: 'Another Org',
      });

      assert.strictEqual(status, 409);
      assert.strictEqual(data.error.code, 'EMAIL_EXISTS');
    });

    test('missing email returns 400', async () => {
      const { status, data } = await postJson('/api/auth/signup', {
        password: 'password123',
        confirmPassword: 'password123',
        organizationName: 'Test Org',
      });

      assert.strictEqual(status, 400);
      assert.strictEqual(data.error.code, 'VALIDATION_ERROR');
    });

    test('missing password returns 400', async () => {
      const { status, data } = await postJson('/api/auth/signup', {
        email: 'test@example.com',
        confirmPassword: 'password123',
        organizationName: 'Test Org',
      });

      assert.strictEqual(status, 400);
      assert.strictEqual(data.error.code, 'VALIDATION_ERROR');
    });

    test('missing confirmPassword returns 400', async () => {
      const { status, data } = await postJson('/api/auth/signup', {
        email: 'test@example.com',
        password: 'password123',
        organizationName: 'Test Org',
      });

      assert.strictEqual(status, 400);
      assert.strictEqual(data.error.code, 'VALIDATION_ERROR');
    });

    test('missing organizationName returns 400', async () => {
      const { status, data } = await postJson('/api/auth/signup', {
        email: 'test@example.com',
        password: 'password123',
        confirmPassword: 'password123',
      });

      assert.strictEqual(status, 400);
      assert.strictEqual(data.error.code, 'VALIDATION_ERROR');
    });

    test('password mismatch returns 400 with PASSWORD_MISMATCH code', async () => {
      const { status, data } = await postJson('/api/auth/signup', {
        email: 'test@example.com',
        password: 'password123',
        confirmPassword: 'different123',
        organizationName: 'Test Org',
      });

      assert.strictEqual(status, 400);
      assert.strictEqual(data.error.code, 'PASSWORD_MISMATCH');
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      await postJson('/api/auth/signup', {
        email: 'test@example.com',
        password: 'password123',
        confirmPassword: 'password123',
        organizationName: 'Test Org',
      });
    });

    test('successful login returns token and user', async () => {
      const { status, data } = await postJson('/api/auth/login', {
        email: 'test@example.com',
        password: 'password123',
      });

      assert.strictEqual(status, 200);
      assert.ok(data.token);
      assert.strictEqual(data.user.email, 'test@example.com');
      assert.ok(data.user.id);
      assert.ok(data.user.organizationId);
      // New: organization is returned
      assert.ok(data.organization);
      assert.strictEqual(data.organization.name, 'Test Org');
      assert.ok(data.organization.id);
      assert.strictEqual(data.organization.defaultLowStockThreshold, 5);
    });

    test('unknown email returns generic 401', async () => {
      const { status, data } = await postJson('/api/auth/login', {
        email: 'unknown@example.com',
        password: 'password123',
      });

      assert.strictEqual(status, 401);
      assert.strictEqual(data.error.code, 'INVALID_CREDENTIALS');
    });

    test('incorrect password returns same generic 401', async () => {
      const { status, data } = await postJson('/api/auth/login', {
        email: 'test@example.com',
        password: 'wrongpassword',
      });

      assert.strictEqual(status, 401);
      assert.strictEqual(data.error.code, 'INVALID_CREDENTIALS');
    });

    test('email is normalized to lowercase', async () => {
      const { status } = await postJson('/api/auth/login', {
        email: 'TEST@EXAMPLE.COM',
        password: 'password123',
      });

      assert.strictEqual(status, 200);
    });

    test('missing email returns 400', async () => {
      const { status, data } = await postJson('/api/auth/login', {
        password: 'password123',
      });

      assert.strictEqual(status, 400);
      assert.strictEqual(data.error.code, 'VALIDATION_ERROR');
    });

    test('missing password returns 400', async () => {
      const { status, data } = await postJson('/api/auth/login', {
        email: 'test@example.com',
      });

      assert.strictEqual(status, 400);
      assert.strictEqual(data.error.code, 'VALIDATION_ERROR');
    });
  });

  describe('Authentication middleware', () => {
    let validToken;
    let userId;
    let organizationId;

    beforeEach(async () => {
      const { data } = await postJson('/api/auth/signup', {
        email: 'test@example.com',
        password: 'password123',
        confirmPassword: 'password123',
        organizationName: 'Test Org',
      });
      validToken = data.token;
      userId = data.user.id;
      organizationId = data.user.organizationId;
    });

    test('valid JWT attaches userId and organizationId to request', () => {
      const { req, res, next } = mockReqResNext({
        headers: { authorization: `Bearer ${validToken}` },
      });

      authMiddleware(req, res, next);

      assert.ok(!next.error, 'next should be called without error');
      assert.strictEqual(req.userId, userId);
      assert.strictEqual(req.organizationId, organizationId);
    });

    test('missing token throws 401 UNAUTHORIZED', () => {
      const { req, res, next } = mockReqResNext({ headers: {} });

      assert.throws(() => authMiddleware(req, res, next), (err) => {
        assert.strictEqual(err.statusCode, 401);
        assert.strictEqual(err.code, 'UNAUTHORIZED');
        return true;
      });
    });

    test('malformed token throws 401 INVALID_TOKEN', () => {
      const { req, res, next } = mockReqResNext({
        headers: { authorization: 'Bearer not.a.valid.token' },
      });

      assert.throws(() => authMiddleware(req, res, next), (err) => {
        assert.strictEqual(err.statusCode, 401);
        assert.strictEqual(err.code, 'INVALID_TOKEN');
        return true;
      });
    });

    test('invalid token (wrong signature) throws 401 INVALID_TOKEN', () => {
      const fakeToken = jwt.sign({ userId: 'fake', organizationId: 'fake' }, 'wrong-secret', { expiresIn: '1d' });
      const { req, res, next } = mockReqResNext({
        headers: { authorization: `Bearer ${fakeToken}` },
      });

      assert.throws(() => authMiddleware(req, res, next), (err) => {
        assert.strictEqual(err.statusCode, 401);
        assert.strictEqual(err.code, 'INVALID_TOKEN');
        return true;
      });
    });

    test('expired token throws 401 TOKEN_EXPIRED', () => {
      const env = require('../src/config/env');
      const expiredToken = jwt.sign(
        { userId: 'fake', organizationId: 'fake' },
        env.jwtSecret,
        { expiresIn: '-1s' }
      );
      const { req, res, next } = mockReqResNext({
        headers: { authorization: `Bearer ${expiredToken}` },
      });

      assert.throws(() => authMiddleware(req, res, next), (err) => {
        assert.strictEqual(err.statusCode, 401);
        assert.strictEqual(err.code, 'TOKEN_EXPIRED');
        return true;
      });
    });

    test('authorization header without Bearer prefix throws 401 UNAUTHORIZED', () => {
      const { req, res, next } = mockReqResNext({
        headers: { authorization: validToken },
      });

      assert.throws(() => authMiddleware(req, res, next), (err) => {
        assert.strictEqual(err.statusCode, 401);
        assert.strictEqual(err.code, 'UNAUTHORIZED');
        return true;
      });
    });
  });

  describe('Signup cleanup on User creation failure', () => {
    test('organization is deleted when User creation fails, original error thrown to controller', async () => {
      const originalCreate = User.create;

      User.create = async function (...args) {
        if (args[0]?.email === 'fail@example.com') {
          throw new Error('User creation failed intentionally');
        }
        return originalCreate.apply(this, args);
      };

      let errorThrown = false;
      try {
        const { signup } = require('../src/services/authService');
        await signup({
          email: 'fail@example.com',
          password: 'password123',
          confirmPassword: 'password123',
          organizationName: 'Should Be Deleted',
        });
      } catch (err) {
        errorThrown = true;
        assert.ok(err.message.includes('User creation failed intentionally'));
      }

      assert.ok(errorThrown, 'Expected error to be thrown');

      const orgs = await Organization.find({ name: 'Should Be Deleted' });
      assert.strictEqual(orgs.length, 0, 'Organization should have been deleted');

      User.create = originalCreate;
    });
  });
});