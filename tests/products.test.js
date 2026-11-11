const { test, before, after, describe, beforeEach } = require('node:test');
const assert = require('node:assert');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const {
  connectTestDB,
  clearDb,
  disconnectTestDB,
  Organization,
  User,
  Product,
} = require('./helpers');

let server;
let baseUrl;
let orgToken;
let orgId;

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

  const org = await Organization.create({ name: 'Test Org' });
  orgId = org._id.toString();

  const user = await User.create({
    email: 'test@example.com',
    passwordHash: 'hashedpassword',
    organizationId: org._id,
  });

  const env = require('../src/config/env');
  orgToken = jwt.sign(
    { userId: user._id.toString(), organizationId: org._id.toString() },
    env.jwtSecret,
    { expiresIn: '1d' }
  );
});

function authHeaders(token = orgToken) {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: { ...authHeaders(), ...options.headers },
  });
  const data = await response.json().catch(() => ({}));
  return { status: response.status, data };
}

describe('Products CRUD', () => {
  describe('POST /api/products', () => {
    test('creates a product successfully', async () => {
      const { status, data } = await request('/api/products', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test Product',
          sku: 'TEST-001',
          description: 'A test product',
          quantity: 10,
          costPrice: 5.5,
          sellingPrice: 12.99,
          lowStockThreshold: 3,
        }),
      });

      assert.strictEqual(status, 201);
      assert.strictEqual(data.name, 'Test Product');
      assert.strictEqual(data.sku, 'TEST-001');
      assert.strictEqual(data.quantity, 10);
      assert.strictEqual(data.costPrice, 5.5);
      assert.strictEqual(data.sellingPrice, 12.99);
      assert.strictEqual(data.lowStockThreshold, 3);
      assert.ok(data._id);
      assert.strictEqual(data.organizationId, orgId);
      assert.ok(data.createdAt);
      assert.ok(data.updatedAt);
    });

    test('creates product with defaults', async () => {
      const { status, data } = await request('/api/products', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Minimal Product',
          sku: 'MIN-001',
        }),
      });

      assert.strictEqual(status, 201);
      assert.strictEqual(data.quantity, 0);
      assert.ok(data.lowStockThreshold == null);
    });

    test('normalizes SKU to uppercase and trimmed', async () => {
      const { status, data } = await request('/api/products', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test Product',
          sku: '  test-002  ',
        }),
      });

      assert.strictEqual(status, 201);
      assert.strictEqual(data.sku, 'TEST-002');
    });

    test('missing name returns 400', async () => {
      const { status, data } = await request('/api/products', {
        method: 'POST',
        body: JSON.stringify({
          sku: 'TEST-001',
        }),
      });

      assert.strictEqual(status, 400);
      assert.strictEqual(data.error.code, 'VALIDATION_ERROR');
    });

    test('missing SKU returns 400', async () => {
      const { status, data } = await request('/api/products', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test Product',
        }),
      });

      assert.strictEqual(status, 400);
      assert.strictEqual(data.error.code, 'VALIDATION_ERROR');
    });

    test('empty name returns 400', async () => {
      const { status, data } = await request('/api/products', {
        method: 'POST',
        body: JSON.stringify({
          name: '   ',
          sku: 'TEST-001',
        }),
      });

      assert.strictEqual(status, 400);
      assert.strictEqual(data.error.code, 'VALIDATION_ERROR');
    });

    test('empty SKU returns 400', async () => {
      const { status, data } = await request('/api/products', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test Product',
          sku: '   ',
        }),
      });

      assert.strictEqual(status, 400);
      assert.strictEqual(data.error.code, 'VALIDATION_ERROR');
    });

    test('name longer than 120 returns 400', async () => {
      const { status, data } = await request('/api/products', {
        method: 'POST',
        body: JSON.stringify({
          name: 'A'.repeat(121),
          sku: 'TEST-001',
        }),
      });

      assert.strictEqual(status, 400);
      assert.strictEqual(data.error.code, 'VALIDATION_ERROR');
    });

    test('SKU longer than 64 returns 400', async () => {
      const { status, data } = await request('/api/products', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test Product',
          sku: 'A'.repeat(65),
        }),
      });

      assert.strictEqual(status, 400);
      assert.strictEqual(data.error.code, 'VALIDATION_ERROR');
    });

    test('description longer than 1000 returns 400', async () => {
      const { status, data } = await request('/api/products', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test Product',
          sku: 'TEST-001',
          description: 'A'.repeat(1001),
        }),
      });

      assert.strictEqual(status, 400);
      assert.strictEqual(data.error.code, 'VALIDATION_ERROR');
    });

    test('negative quantity returns 400', async () => {
      const { status, data } = await request('/api/products', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test Product',
          sku: 'TEST-001',
          quantity: -1,
        }),
      });

      assert.strictEqual(status, 400);
      assert.strictEqual(data.error.code, 'VALIDATION_ERROR');
    });

    test('decimal quantity returns 400', async () => {
      const { status, data } = await request('/api/products', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test Product',
          sku: 'TEST-001',
          quantity: 1.5,
        }),
      });

      assert.strictEqual(status, 400);
      assert.strictEqual(data.error.code, 'VALIDATION_ERROR');
    });

    test('negative costPrice returns 400', async () => {
      const { status, data } = await request('/api/products', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test Product',
          sku: 'TEST-001',
          costPrice: -10,
        }),
      });

      assert.strictEqual(status, 400);
      assert.strictEqual(data.error.code, 'VALIDATION_ERROR');
    });

    test('negative sellingPrice returns 400', async () => {
      const { status, data } = await request('/api/products', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test Product',
          sku: 'TEST-001',
          sellingPrice: -5,
        }),
      });

      assert.strictEqual(status, 400);
      assert.strictEqual(data.error.code, 'VALIDATION_ERROR');
    });

    test('negative lowStockThreshold returns 400', async () => {
      const { status, data } = await request('/api/products', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test Product',
          sku: 'TEST-001',
          lowStockThreshold: -1,
        }),
      });

      assert.strictEqual(status, 400);
      assert.strictEqual(data.error.code, 'VALIDATION_ERROR');
    });

    test('decimal lowStockThreshold returns 400', async () => {
      const { status, data } = await request('/api/products', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test Product',
          sku: 'TEST-001',
          lowStockThreshold: 2.5,
        }),
      });

      assert.strictEqual(status, 400);
      assert.strictEqual(data.error.code, 'VALIDATION_ERROR');
    });

    test('duplicate SKU in same organization returns 409', async () => {
      await request('/api/products', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test Product',
          sku: 'TEST-001',
        }),
      });

      const { status, data } = await request('/api/products', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Another Product',
          sku: 'TEST-001',
        }),
      });

      assert.strictEqual(status, 409);
      assert.strictEqual(data.error.code, 'DUPLICATE_SKU');
    });
  });

  describe('GET /api/products', () => {
    beforeEach(async () => {
      await request('/api/products', {
        method: 'POST',
        body: JSON.stringify({ name: 'Apple', sku: 'SKU-001', quantity: 5 }),
      });
      await request('/api/products', {
        method: 'POST',
        body: JSON.stringify({ name: 'Banana', sku: 'SKU-002', quantity: 10 }),
      });
      await request('/api/products', {
        method: 'POST',
        body: JSON.stringify({ name: 'Orange', sku: 'SKU-003', quantity: 0 }),
      });
    });

    test('lists products for authenticated organization', async () => {
      const { status, data } = await request('/api/products');

      assert.strictEqual(status, 200);
      assert.ok(Array.isArray(data));
      assert.strictEqual(data.length, 3);
      assert.strictEqual(data[0].name, 'Orange');
      assert.strictEqual(data[2].name, 'Apple');
    });

    test('search by name', async () => {
      const { status, data } = await request('/api/products?search=Apple');

      assert.strictEqual(status, 200);
      assert.strictEqual(data.length, 1);
      assert.strictEqual(data[0].name, 'Apple');
    });

    test('search by SKU', async () => {
      const { status, data } = await request('/api/products?search=SKU-002');

      assert.strictEqual(status, 200);
      assert.strictEqual(data.length, 1);
      assert.strictEqual(data[0].sku, 'SKU-002');
    });

    test('search with special regex characters treats as literal', async () => {
      await request('/api/products', {
        method: 'POST',
        body: JSON.stringify({ name: 'Product (special)', sku: 'SPEC-001' }),
      });

      const { status, data } = await request('/api/products?search=(special)');

      assert.strictEqual(status, 200);
      assert.strictEqual(data.length, 1);
      assert.strictEqual(data[0].name, 'Product (special)');
    });

    test('search with .* ( regex meta chars treats as literal', async () => {
      await request('/api/products', {
        method: 'POST',
        body: JSON.stringify({ name: 'Product .*', sku: 'SPEC-002' }),
      });

      const { status, data } = await request('/api/products?search=.*');

      assert.strictEqual(status, 200);
      assert.strictEqual(data.length, 1);
      assert.strictEqual(data[0].name, 'Product .*');
    });

    test('empty search returns all', async () => {
      const { status, data } = await request('/api/products?search=');

      assert.strictEqual(status, 200);
      assert.strictEqual(data.length, 3);
    });
  });

  describe('GET /api/products/:id', () => {
    let productId;

    beforeEach(async () => {
      const { data } = await request('/api/products', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test Product', sku: 'TEST-001' }),
      });
      productId = data._id;
    });

    test('retrieves a product', async () => {
      const { status, data } = await request(`/api/products/${productId}`);

      assert.strictEqual(status, 200);
      assert.strictEqual(data._id, productId);
      assert.strictEqual(data.name, 'Test Product');
    });

    test('invalid ObjectId returns 404', async () => {
      const { status, data } = await request('/api/products/invalid-id');

      assert.strictEqual(status, 404);
      assert.strictEqual(data.error.code, 'NOT_FOUND');
    });

    test('missing product returns 404', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const { status, data } = await request(`/api/products/${fakeId}`);

      assert.strictEqual(status, 404);
      assert.strictEqual(data.error.code, 'NOT_FOUND');
    });
  });

  describe('PUT /api/products/:id', () => {
    let productId;

    beforeEach(async () => {
      const { data } = await request('/api/products', {
        method: 'POST',
        body: JSON.stringify({ name: 'Original', sku: 'ORIG-001', quantity: 5, costPrice: 10, sellingPrice: 20 }),
      });
      productId = data._id;
    });

    test('updates product name', async () => {
      const { status, data } = await request(`/api/products/${productId}`, {
        method: 'PUT',
        body: JSON.stringify({ name: 'Updated Name' }),
      });

      assert.strictEqual(status, 200);
      assert.strictEqual(data.name, 'Updated Name');
      assert.strictEqual(data.sku, 'ORIG-001');
    });

    test('updates quantity directly', async () => {
      const { status, data } = await request(`/api/products/${productId}`, {
        method: 'PUT',
        body: JSON.stringify({ quantity: 100 }),
      });

      assert.strictEqual(status, 200);
      assert.strictEqual(data.quantity, 100);
    });

    test('updates prices', async () => {
      const { status, data } = await request(`/api/products/${productId}`, {
        method: 'PUT',
        body: JSON.stringify({ costPrice: 15, sellingPrice: 30 }),
      });

      assert.strictEqual(status, 200);
      assert.strictEqual(data.costPrice, 15);
      assert.strictEqual(data.sellingPrice, 30);
    });

    test('updates low-stock threshold', async () => {
      const { status, data } = await request(`/api/products/${productId}`, {
        method: 'PUT',
        body: JSON.stringify({ lowStockThreshold: 7 }),
      });

      assert.strictEqual(status, 200);
      assert.strictEqual(data.lowStockThreshold, 7);
    });

    test('updates SKU', async () => {
      const { status, data } = await request(`/api/products/${productId}`, {
        method: 'PUT',
        body: JSON.stringify({ sku: 'NEW-001' }),
      });

      assert.strictEqual(status, 200);
      assert.strictEqual(data.sku, 'NEW-001');
    });

    test('rejects updating organizationId', async () => {
      const fakeOrgId = new mongoose.Types.ObjectId().toString();
      const { status, data } = await request(`/api/products/${productId}`, {
        method: 'PUT',
        body: JSON.stringify({ organizationId: fakeOrgId }),
      });

      assert.strictEqual(status, 200);
      assert.strictEqual(data.organizationId, orgId);
    });

    test('rejects updating _id', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const { status, data } = await request(`/api/products/${productId}`, {
        method: 'PUT',
        body: JSON.stringify({ _id: fakeId }),
      });

      assert.strictEqual(status, 200);
      assert.strictEqual(data._id, productId);
    });

    test('rejects updating createdAt', async () => {
      const { status, data } = await request(`/api/products/${productId}`, {
        method: 'PUT',
        body: JSON.stringify({ createdAt: '2020-01-01T00:00:00.000Z' }),
      });

      assert.strictEqual(status, 200);
      assert.ok(data.createdAt);
    });

    test('duplicate SKU in same organization returns 409', async () => {
      await request('/api/products', {
        method: 'POST',
        body: JSON.stringify({ name: 'Another', sku: 'UNIQUE-001' }),
      });

      const { status, data } = await request(`/api/products/${productId}`, {
        method: 'PUT',
        body: JSON.stringify({ sku: 'UNIQUE-001' }),
      });

      assert.strictEqual(status, 409);
      assert.strictEqual(data.error.code, 'DUPLICATE_SKU');
    });

    test('invalid ObjectId returns 404', async () => {
      const { status, data } = await request('/api/products/invalid-id', {
        method: 'PUT',
        body: JSON.stringify({ name: 'Updated' }),
      });

      assert.strictEqual(status, 404);
      assert.strictEqual(data.error.code, 'NOT_FOUND');
    });

    test('missing product returns 404', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const { status, data } = await request(`/api/products/${fakeId}`, {
        method: 'PUT',
        body: JSON.stringify({ name: 'Updated' }),
      });

      assert.strictEqual(status, 404);
      assert.strictEqual(data.error.code, 'NOT_FOUND');
    });
  });

  describe('DELETE /api/products/:id', () => {
    let productId;

    beforeEach(async () => {
      const { data } = await request('/api/products', {
        method: 'POST',
        body: JSON.stringify({ name: 'To Delete', sku: 'DEL-001' }),
      });
      productId = data._id;
    });

    test('deletes a product', async () => {
      const { status, data } = await request(`/api/products/${productId}`, {
        method: 'DELETE',
      });

      assert.strictEqual(status, 200);
      assert.strictEqual(data.message, 'Product deleted successfully');

      const { status: getStatus } = await request(`/api/products/${productId}`);
      assert.strictEqual(getStatus, 404);
    });

    test('invalid ObjectId returns 404', async () => {
      const { status, data } = await request('/api/products/invalid-id', {
        method: 'DELETE',
      });

      assert.strictEqual(status, 404);
      assert.strictEqual(data.error.code, 'NOT_FOUND');
    });

    test('missing product returns 404', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const { status, data } = await request(`/api/products/${fakeId}`, {
        method: 'DELETE',
      });

      assert.strictEqual(status, 404);
      assert.strictEqual(data.error.code, 'NOT_FOUND');
    });
  });
});