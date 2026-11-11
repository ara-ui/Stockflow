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
let orgDefaultThreshold;

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

  const org = await Organization.create({ name: 'Test Org', defaultLowStockThreshold: 5 });
  orgId = org._id.toString();
  orgDefaultThreshold = org.defaultLowStockThreshold;

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

async function request(path, options = {}, token) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: { ...authHeaders(token), ...options.headers },
  });
  const data = await response.json().catch(() => ({}));
  return { status: response.status, data };
}

describe('Dashboard API', () => {
  test('returns correct total product count', async () => {
    await request('/api/products', {
      method: 'POST',
      body: JSON.stringify({ name: 'Product 1', sku: 'P1' }),
    });
    await request('/api/products', {
      method: 'POST',
      body: JSON.stringify({ name: 'Product 2', sku: 'P2' }),
    });
    await request('/api/products', {
      method: 'POST',
      body: JSON.stringify({ name: 'Product 3', sku: 'P3' }),
    });

    const { status, data } = await request('/api/dashboard');

    assert.strictEqual(status, 200);
    assert.strictEqual(data.totalProducts, 3);
  });

  test('returns correct total quantity', async () => {
    await request('/api/products', {
      method: 'POST',
      body: JSON.stringify({ name: 'Product 1', sku: 'P1', quantity: 10 }),
    });
    await request('/api/products', {
      method: 'POST',
      body: JSON.stringify({ name: 'Product 2', sku: 'P2', quantity: 20 }),
    });
    await request('/api/products', {
      method: 'POST',
      body: JSON.stringify({ name: 'Product 3', sku: 'P3', quantity: 30 }),
    });

    const { status, data } = await request('/api/dashboard');

    assert.strictEqual(status, 200);
    assert.strictEqual(data.totalQuantity, 60);
  });

  test('includes low-stock products', async () => {
    await request('/api/products', {
      method: 'POST',
      body: JSON.stringify({ name: 'Normal Product', sku: 'NORM-001', quantity: 20, lowStockThreshold: 5 }),
    });
    await request('/api/products', {
      method: 'POST',
      body: JSON.stringify({ name: 'Low Stock Product', sku: 'LOW-001', quantity: 3, lowStockThreshold: 5 }),
    });
    await request('/api/products', {
      method: 'POST',
      body: JSON.stringify({ name: 'Another Low Stock', sku: 'LOW-002', quantity: 0, lowStockThreshold: 2 }),
    });

    const { status, data } = await request('/api/dashboard');

    assert.strictEqual(status, 200);
    assert.strictEqual(data.lowStockProducts.length, 2);
    assert.ok(data.lowStockProducts.some((p) => p.sku === 'LOW-001'));
    assert.ok(data.lowStockProducts.some((p) => p.sku === 'LOW-002'));
  });

  test('product-specific threshold overrides organization default', async () => {
    await request('/api/products', {
      method: 'POST',
      body: JSON.stringify({ name: 'High Threshold', sku: 'HIGH-001', quantity: 8, lowStockThreshold: 10 }),
    });
    await request('/api/products', {
      method: 'POST',
      body: JSON.stringify({ name: 'Low Threshold', sku: 'LOW-001', quantity: 8, lowStockThreshold: 5 }),
    });

    const { status, data } = await request('/api/dashboard');

    assert.strictEqual(status, 200);
    assert.strictEqual(data.lowStockProducts.length, 1);
    assert.strictEqual(data.lowStockProducts[0].sku, 'HIGH-001');
    assert.strictEqual(data.lowStockProducts[0].effectiveThreshold, 10);
  });

  test('null product threshold uses organization default', async () => {
    await request('/api/products', {
      method: 'POST',
      body: JSON.stringify({ name: 'Uses Org Default', sku: 'ORG-DEF-001', quantity: 4 }),
    });

    const { status, data } = await request('/api/dashboard');

    assert.strictEqual(status, 200);
    assert.strictEqual(data.lowStockProducts.length, 1);
    assert.strictEqual(data.lowStockProducts[0].sku, 'ORG-DEF-001');
    assert.strictEqual(data.lowStockProducts[0].effectiveThreshold, orgDefaultThreshold);
  });

  test('threshold zero works', async () => {
    await request('/api/products', {
      method: 'POST',
      body: JSON.stringify({ name: 'Zero Threshold 0 Qty', sku: 'ZERO-001', quantity: 0, lowStockThreshold: 0 }),
    });
    await request('/api/products', {
      method: 'POST',
      body: JSON.stringify({ name: 'Zero Threshold 1 Qty', sku: 'ZERO-002', quantity: 1, lowStockThreshold: 0 }),
    });

    const { status, data } = await request('/api/dashboard');

    assert.strictEqual(status, 200);
    assert.strictEqual(data.lowStockProducts.length, 1);
    assert.strictEqual(data.lowStockProducts[0].sku, 'ZERO-001');
    assert.strictEqual(data.lowStockProducts[0].effectiveThreshold, 0);
  });

  test('quantity equal to threshold counts as low stock', async () => {
    await request('/api/products', {
      method: 'POST',
      body: JSON.stringify({ name: 'Equal Threshold', sku: 'EQUAL-001', quantity: 5, lowStockThreshold: 5 }),
    });

    const { status, data } = await request('/api/dashboard');

    assert.strictEqual(status, 200);
    assert.strictEqual(data.lowStockProducts.length, 1);
    assert.strictEqual(data.lowStockProducts[0].sku, 'EQUAL-001');
  });

  test('quantity above threshold is not low stock', async () => {
    await request('/api/products', {
      method: 'POST',
      body: JSON.stringify({ name: 'Above Threshold', sku: 'ABOVE-001', quantity: 6, lowStockThreshold: 5 }),
    });

    const { status, data } = await request('/api/dashboard');

    assert.strictEqual(status, 200);
    assert.strictEqual(data.lowStockProducts.length, 0);
  });

  test('empty organization returns zero totals and empty list', async () => {
    const { status, data } = await request('/api/dashboard');

    assert.strictEqual(status, 200);
    assert.strictEqual(data.totalProducts, 0);
    assert.strictEqual(data.totalQuantity, 0);
    assert.ok(Array.isArray(data.lowStockProducts));
    assert.strictEqual(data.lowStockProducts.length, 0);
  });

  test('unauthorized requests return 401', async () => {
    const response = await fetch(`${baseUrl}/api/dashboard`);
    const data = await response.json();

    assert.strictEqual(response.status, 401);
    assert.strictEqual(data.error.code, 'UNAUTHORIZED');
  });

  test('one organization cannot see another organization dashboard data', async () => {
    const org2 = await Organization.create({ name: 'Org 2', defaultLowStockThreshold: 5 });
    const user2 = await User.create({
      email: 'user2@org2.com',
      passwordHash: 'hashedpassword',
      organizationId: org2._id,
    });
    const env = require('../src/config/env');
    const org2Token = jwt.sign(
      { userId: user2._id.toString(), organizationId: org2._id.toString() },
      env.jwtSecret,
      { expiresIn: '1d' }
    );

    await request('/api/products', {
      method: 'POST',
      body: JSON.stringify({ name: 'Org 1 Product', sku: 'ORG1-001', quantity: 10, lowStockThreshold: 5 }),
    }, orgToken);

    await request('/api/products', {
      method: 'POST',
      body: JSON.stringify({ name: 'Org 2 Product', sku: 'ORG2-001', quantity: 3, lowStockThreshold: 5 }),
    }, org2Token);

    const { status, data } = await request('/api/dashboard', {}, orgToken);

    assert.strictEqual(status, 200);
    assert.strictEqual(data.totalProducts, 1);
    assert.strictEqual(data.totalQuantity, 10);
    assert.strictEqual(data.lowStockProducts.length, 0);
  });
});