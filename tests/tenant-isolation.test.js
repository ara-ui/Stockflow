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
let orgAToken;
let orgBToken;
let orgAId;
let orgBId;

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

  const orgA = await Organization.create({ name: 'Org A' });
  const orgB = await Organization.create({ name: 'Org B' });
  orgAId = orgA._id.toString();
  orgBId = orgB._id.toString();

  const userA = await User.create({
    email: 'usera@orgA.com',
    passwordHash: 'hashedpassword',
    organizationId: orgA._id,
  });

  const userB = await User.create({
    email: 'userb@orgB.com',
    passwordHash: 'hashedpassword',
    organizationId: orgB._id,
  });

  const env = require('../src/config/env');
  orgAToken = jwt.sign(
    { userId: userA._id.toString(), organizationId: orgAId },
    env.jwtSecret,
    { expiresIn: '1d' }
  );

  orgBToken = jwt.sign(
    { userId: userB._id.toString(), organizationId: orgBId },
    env.jwtSecret,
    { expiresIn: '1d' }
  );
});

function authHeaders(token) {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

async function request(path, options = {}, token) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: { ...authHeaders(token), ...options.headers },
  });
  const data = await response.json().catch(() => ({}));
  return { status: response.status, data };
}

describe('Tenant Isolation', () => {
  let productAId;
  let productBId;

  beforeEach(async () => {
    const { data: productA } = await request('/api/products', {
      method: 'POST',
      body: JSON.stringify({ name: 'Org A Product', sku: 'ORGA-001' }),
    }, orgAToken);
    productAId = productA._id;

    const { data: productB } = await request('/api/products', {
      method: 'POST',
      body: JSON.stringify({ name: 'Org B Product', sku: 'ORGB-001' }),
    }, orgBToken);
    productBId = productB._id;
  });

  describe('Organization A cannot access Organization B products', () => {
    test('cannot list Organization B products', async () => {
      const { status, data } = await request('/api/products', {}, orgAToken);

      assert.strictEqual(status, 200);
      assert.strictEqual(data.length, 1);
      assert.strictEqual(data[0].name, 'Org A Product');
    });

    test('cannot retrieve Organization B product', async () => {
      const { status, data } = await request(`/api/products/${productBId}`, {}, orgAToken);

      assert.strictEqual(status, 404);
      assert.strictEqual(data.error.code, 'NOT_FOUND');
    });

    test('cannot update Organization B product', async () => {
      const { status, data } = await request(`/api/products/${productBId}`, {
        method: 'PUT',
        body: JSON.stringify({ name: 'Hacked' }),
      }, orgAToken);

      assert.strictEqual(status, 404);
      assert.strictEqual(data.error.code, 'NOT_FOUND');
    });

    test('cannot delete Organization B product', async () => {
      const { status, data } = await request(`/api/products/${productBId}`, {
        method: 'DELETE',
      }, orgAToken);

      assert.strictEqual(status, 404);
      assert.strictEqual(data.error.code, 'NOT_FOUND');
    });
  });

  describe('Organization B cannot access Organization A products', () => {
    test('cannot list Organization A products', async () => {
      const { status, data } = await request('/api/products', {}, orgBToken);

      assert.strictEqual(status, 200);
      assert.strictEqual(data.length, 1);
      assert.strictEqual(data[0].name, 'Org B Product');
    });

    test('cannot retrieve Organization A product', async () => {
      const { status, data } = await request(`/api/products/${productAId}`, {}, orgBToken);

      assert.strictEqual(status, 404);
      assert.strictEqual(data.error.code, 'NOT_FOUND');
    });

    test('cannot update Organization A product', async () => {
      const { status, data } = await request(`/api/products/${productAId}`, {
        method: 'PUT',
        body: JSON.stringify({ name: 'Hacked' }),
      }, orgBToken);

      assert.strictEqual(status, 404);
      assert.strictEqual(data.error.code, 'NOT_FOUND');
    });

    test('cannot delete Organization A product', async () => {
      const { status, data } = await request(`/api/products/${productAId}`, {
        method: 'DELETE',
      }, orgBToken);

      assert.strictEqual(status, 404);
      assert.strictEqual(data.error.code, 'NOT_FOUND');
    });
  });

  describe('Supplying organizationId in request body cannot bypass isolation', () => {
    test('creating product with foreign organizationId uses authenticated org', async () => {
      const { status, data } = await request('/api/products', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Should Be Org A',
          sku: 'TEST-001',
          organizationId: orgBId,
        }),
      }, orgAToken);

      assert.strictEqual(status, 201);
      assert.strictEqual(data.organizationId, orgAId);

      const products = await Product.find({ organizationId: orgAId });
      assert.strictEqual(products.length, 2);
    });

    test('updating product with foreign organizationId does not change org', async () => {
      const { status, data } = await request(`/api/products/${productAId}`, {
        method: 'PUT',
        body: JSON.stringify({
          organizationId: orgBId,
        }),
      }, orgAToken);

      assert.strictEqual(status, 200);
      assert.strictEqual(data.organizationId, orgAId);
    });
  });

  describe('Product creation always uses authenticated user organizationId', () => {
    test('product created by Org A belongs to Org A', async () => {
      const { status, data } = await request('/api/products', {
        method: 'POST',
        body: JSON.stringify({ name: 'New Product', sku: 'NEW-001' }),
      }, orgAToken);

      assert.strictEqual(status, 201);
      assert.strictEqual(data.organizationId, orgAId);

      const product = await Product.findById(data._id);
      assert.strictEqual(product.organizationId.toString(), orgAId);
    });

    test('product created by Org B belongs to Org B', async () => {
      const { status, data } = await request('/api/products', {
        method: 'POST',
        body: JSON.stringify({ name: 'New Product', sku: 'NEW-002' }),
      }, orgBToken);

      assert.strictEqual(status, 201);
      assert.strictEqual(data.organizationId, orgBId);

      const product = await Product.findById(data._id);
      assert.strictEqual(product.organizationId.toString(), orgBId);
    });
  });

  describe('Same SKU allowed in different organizations', () => {
    test('same SKU can exist in both organizations', async () => {
      const { data: productA } = await request('/api/products', {
        method: 'POST',
        body: JSON.stringify({ name: 'Org A Same SKU', sku: 'SHARED-001' }),
      }, orgAToken);

      const { data: productB } = await request('/api/products', {
        method: 'POST',
        body: JSON.stringify({ name: 'Org B Same SKU', sku: 'SHARED-001' }),
      }, orgBToken);

      assert.ok(productA._id);
      assert.ok(productB._id);
      assert.strictEqual(productA.sku, 'SHARED-001');
      assert.strictEqual(productB.sku, 'SHARED-001');
      assert.strictEqual(productA.organizationId, orgAId);
      assert.strictEqual(productB.organizationId, orgBId);
    });
  });
});