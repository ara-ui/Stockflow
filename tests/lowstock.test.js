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
const { getEffectiveThreshold, isLowStock } = require('../src/utils/lowStock');

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

  const org = await Organization.create({ name: 'Test Org', defaultLowStockThreshold: 5 });
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

describe('Low-Stock Logic', () => {
  describe('getEffectiveThreshold', () => {
    test('uses product-specific threshold when set', () => {
      const product = { lowStockThreshold: 10 };
      const organization = { defaultLowStockThreshold: 5 };

      const threshold = getEffectiveThreshold(product, organization);
      assert.strictEqual(threshold, 10);
    });

    test('uses organization default when product threshold is null', () => {
      const product = { lowStockThreshold: null };
      const organization = { defaultLowStockThreshold: 7 };

      const threshold = getEffectiveThreshold(product, organization);
      assert.strictEqual(threshold, 7);
    });

    test('uses organization default when product threshold is undefined', () => {
      const product = { lowStockThreshold: undefined };
      const organization = { defaultLowStockThreshold: 3 };

      const threshold = getEffectiveThreshold(product, organization);
      assert.strictEqual(threshold, 3);
    });

    test('uses default 5 when organization has no default', () => {
      const product = { lowStockThreshold: null };
      const organization = { defaultLowStockThreshold: undefined };

      const threshold = getEffectiveThreshold(product, organization);
      assert.strictEqual(threshold, 5);
    });

    test('threshold 0 is valid on product', () => {
      const product = { lowStockThreshold: 0 };
      const organization = { defaultLowStockThreshold: 5 };

      const threshold = getEffectiveThreshold(product, organization);
      assert.strictEqual(threshold, 0);
    });

    test('threshold 0 is valid on organization', () => {
      const product = { lowStockThreshold: null };
      const organization = { defaultLowStockThreshold: 0 };

      const threshold = getEffectiveThreshold(product, organization);
      assert.strictEqual(threshold, 0);
    });
  });

  describe('isLowStock', () => {
    test('quantity equal to threshold is low stock', () => {
      const product = { quantity: 5, lowStockThreshold: 5 };
      const organization = { defaultLowStockThreshold: 10 };

      const result = isLowStock(product, organization);
      assert.strictEqual(result, true);
    });

    test('quantity above threshold is not low stock', () => {
      const product = { quantity: 6, lowStockThreshold: 5 };
      const organization = { defaultLowStockThreshold: 10 };

      const result = isLowStock(product, organization);
      assert.strictEqual(result, false);
    });

    test('quantity below threshold is low stock', () => {
      const product = { quantity: 4, lowStockThreshold: 5 };
      const organization = { defaultLowStockThreshold: 10 };

      const result = isLowStock(product, organization);
      assert.strictEqual(result, true);
    });

    test('uses product threshold over organization default', () => {
      const product = { quantity: 8, lowStockThreshold: 10 };
      const organization = { defaultLowStockThreshold: 5 };

      const result = isLowStock(product, organization);
      assert.strictEqual(result, true);
    });

    test('uses organization default when product threshold is null', () => {
      const product = { quantity: 5, lowStockThreshold: null };
      const organization = { defaultLowStockThreshold: 5 };

      const result = isLowStock(product, organization);
      assert.strictEqual(result, true);
    });

    test('threshold 0 means only quantity 0 is low stock', () => {
      const product = { quantity: 0, lowStockThreshold: 0 };
      const organization = { defaultLowStockThreshold: 5 };

      const result = isLowStock(product, organization);
      assert.strictEqual(result, true);
    });

    test('quantity 1 with threshold 0 is not low stock', () => {
      const product = { quantity: 1, lowStockThreshold: 0 };
      const organization = { defaultLowStockThreshold: 5 };

      const result = isLowStock(product, organization);
      assert.strictEqual(result, false);
    });

    test('organization default 5 works', () => {
      const product = { quantity: 5, lowStockThreshold: null };
      const organization = { defaultLowStockThreshold: 5 };

      const result = isLowStock(product, organization);
      assert.strictEqual(result, true);
    });

    test('organization default 5 - quantity 6 not low stock', () => {
      const product = { quantity: 6, lowStockThreshold: null };
      const organization = { defaultLowStockThreshold: 5 };

      const result = isLowStock(product, organization);
      assert.strictEqual(result, false);
    });
  });

  describe('API integration - low stock in product responses', () => {
    test('product with low quantity shows correct low stock logic', async () => {
      const { data: product } = await request('/api/products', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Low Stock Product',
          sku: 'LOW-001',
          quantity: 3,
          lowStockThreshold: 5,
        }),
      });

      assert.strictEqual(product.quantity, 3);
      assert.strictEqual(product.lowStockThreshold, 5);

      const org = await Organization.findById(orgId);
      const isLow = isLowStock(product, org);
      assert.strictEqual(isLow, true);
    });

    test('product with quantity above threshold not low stock', async () => {
      const { data: product } = await request('/api/products', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Normal Product',
          sku: 'NORM-001',
          quantity: 10,
          lowStockThreshold: 5,
        }),
      });

      const org = await Organization.findById(orgId);
      const isLow = isLowStock(product, org);
      assert.strictEqual(isLow, false);
    });

    test('product without threshold uses organization default', async () => {
      await request('/api/products', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Uses Org Default',
          sku: 'ORG-DEF-001',
          quantity: 4,
        }),
      });

      const { data: products } = await request('/api/products');
      const product = products[0];

      assert.ok(product.lowStockThreshold == null);

      const org = await Organization.findById(orgId);
      const isLow = isLowStock(product, org);
      assert.strictEqual(isLow, true);
    });

    test('product with threshold 0 - quantity 0 is low stock', async () => {
      const { data: product } = await request('/api/products', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Zero Threshold',
          sku: 'ZERO-001',
          quantity: 0,
          lowStockThreshold: 0,
        }),
      });

      const org = await Organization.findById(orgId);
      const isLow = isLowStock(product, org);
      assert.strictEqual(isLow, true);
    });

    test('product with threshold 0 - quantity 1 is not low stock', async () => {
      const { data: product } = await request('/api/products', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Zero Threshold',
          sku: 'ZERO-002',
          quantity: 1,
          lowStockThreshold: 0,
        }),
      });

      const org = await Organization.findById(orgId);
      const isLow = isLowStock(product, org);
      assert.strictEqual(isLow, false);
    });

    test('organization with default threshold 0', async () => {
      const org = await Organization.findByIdAndUpdate(orgId, { defaultLowStockThreshold: 0 }, { returnDocument: 'after' });

      const { data: product } = await request('/api/products', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Org Default Zero',
          sku: 'ORG-ZERO-001',
          quantity: 0,
        }),
      });

      const isLow = isLowStock(product, org);
      assert.strictEqual(isLow, true);
    });
  });
});