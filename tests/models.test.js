const { test, before, after, describe, beforeEach } = require('node:test');
const assert = require('node:assert');
const mongoose = require('mongoose');
const {
  connectTestDB,
  clearDb,
  disconnectTestDB,
  Organization,
  User,
  Product,
} = require('./helpers');

before(async () => {
  await connectTestDB();
});

after(async () => {
  await disconnectTestDB();
});

beforeEach(async () => {
  await clearDb();
});

describe('Organization model', () => {
  test('defaultLowStockThreshold defaults to 5', async () => {
    const org = await Organization.create({ name: 'Test Org' });
    assert.strictEqual(org.defaultLowStockThreshold, 5);
  });

  test('threshold 0 is valid', async () => {
    const org = await Organization.create({ name: 'Test Org', defaultLowStockThreshold: 0 });
    assert.strictEqual(org.defaultLowStockThreshold, 0);
  });

  test('negative threshold is rejected', async () => {
    try {
      await Organization.create({ name: 'Test Org', defaultLowStockThreshold: -1 });
      assert.fail('Should have thrown validation error');
    } catch (err) {
      assert.ok(err.name === 'ValidationError');
    }
  });

  test('name is required and trimmed', async () => {
    try {
      await Organization.create({ name: '  ' });
      assert.fail('Should have thrown validation error');
    } catch (err) {
      assert.ok(err.name === 'ValidationError');
    }
  });

  test('name length validation', async () => {
    try {
      await Organization.create({ name: 'A' });
      assert.fail('Should have thrown validation error');
    } catch (err) {
      assert.ok(err.name === 'ValidationError');
    }

    try {
      await Organization.create({ name: 'A'.repeat(81) });
      assert.fail('Should have thrown validation error');
    } catch (err) {
      assert.ok(err.name === 'ValidationError');
    }
  });
});

describe('User model', () => {
  let org;

  beforeEach(async () => {
    org = await Organization.create({ name: 'Test Org' });
  });

  test('email is normalized to lowercase', async () => {
    const user = await User.create({
      email: 'TEST@EXAMPLE.COM',
      passwordHash: 'hashedpassword',
      organizationId: org._id,
    });
    assert.strictEqual(user.email, 'test@example.com');
  });

  test('passwordHash is not selected by default', async () => {
    const user = await User.create({
      email: 'test@example.com',
      passwordHash: 'hashedpassword',
      organizationId: org._id,
    });

    const found = await User.findById(user._id);
    assert.strictEqual(found.passwordHash, undefined);
  });

  test('passwordHash can be selected explicitly', async () => {
    const user = await User.create({
      email: 'test@example.com',
      passwordHash: 'hashedpassword',
      organizationId: org._id,
    });

    const found = await User.findById(user._id).select('+passwordHash');
    assert.strictEqual(found.passwordHash, 'hashedpassword');
  });

  test('email is unique', async () => {
    await User.create({
      email: 'test@example.com',
      passwordHash: 'hashedpassword',
      organizationId: org._id,
    });

    try {
      await User.create({
        email: 'test@example.com',
        passwordHash: 'anotherhash',
        organizationId: org._id,
      });
      assert.fail('Should have thrown duplicate key error');
    } catch (err) {
      assert.strictEqual(err.code, 11000);
    }
  });

  test('organizationId is required', async () => {
    try {
      await User.create({
        email: 'test@example.com',
        passwordHash: 'hashedpassword',
      });
      assert.fail('Should have thrown validation error');
    } catch (err) {
      assert.ok(err.name === 'ValidationError');
    }
  });
});

describe('Product model', () => {
  let org1, org2;

  beforeEach(async () => {
    org1 = await Organization.create({ name: 'Org 1' });
    org2 = await Organization.create({ name: 'Org 2' });
  });

  test('quantity defaults to 0', async () => {
    const product = await Product.create({
      organizationId: org1._id,
      name: 'Test Product',
      sku: 'TEST-001',
    });
    assert.strictEqual(product.quantity, 0);
  });

  test('negative quantity is rejected', async () => {
    try {
      await Product.create({
        organizationId: org1._id,
        name: 'Test Product',
        sku: 'TEST-001',
        quantity: -1,
      });
      assert.fail('Should have thrown validation error');
    } catch (err) {
      assert.ok(err.name === 'ValidationError');
    }
  });

  test('decimal quantity is rejected', async () => {
    try {
      await Product.create({
        organizationId: org1._id,
        name: 'Test Product',
        sku: 'TEST-001',
        quantity: 1.5,
      });
      assert.fail('Should have thrown validation error');
    } catch (err) {
      assert.ok(err.name === 'ValidationError');
    }
  });

  test('negative costPrice is rejected', async () => {
    try {
      await Product.create({
        organizationId: org1._id,
        name: 'Test Product',
        sku: 'TEST-001',
        costPrice: -10,
      });
      assert.fail('Should have thrown validation error');
    } catch (err) {
      assert.ok(err.name === 'ValidationError');
    }
  });

  test('negative sellingPrice is rejected', async () => {
    try {
      await Product.create({
        organizationId: org1._id,
        name: 'Test Product',
        sku: 'TEST-001',
        sellingPrice: -5,
      });
      assert.fail('Should have thrown validation error');
    } catch (err) {
      assert.ok(err.name === 'ValidationError');
    }
  });

  test('duplicate SKU in same organization fails', async () => {
    await Product.create({
      organizationId: org1._id,
      name: 'Test Product',
      sku: 'TEST-001',
    });

    try {
      await Product.create({
        organizationId: org1._id,
        name: 'Another Product',
        sku: 'TEST-001',
      });
      assert.fail('Should have thrown duplicate key error');
    } catch (err) {
      assert.strictEqual(err.code, 11000);
    }
  });

  test('same SKU in different organizations succeeds', async () => {
    await Product.create({
      organizationId: org1._id,
      name: 'Test Product',
      sku: 'TEST-001',
    });

    const product = await Product.create({
      organizationId: org2._id,
      name: 'Test Product',
      sku: 'TEST-001',
    });
    assert.ok(product._id);
  });

  test('threshold 0 is valid', async () => {
    const product = await Product.create({
      organizationId: org1._id,
      name: 'Test Product',
      sku: 'TEST-001',
      lowStockThreshold: 0,
    });
    assert.strictEqual(product.lowStockThreshold, 0);
  });

  test('threshold null is valid', async () => {
    const product = await Product.create({
      organizationId: org1._id,
      name: 'Test Product',
      sku: 'TEST-001',
      lowStockThreshold: null,
    });
    assert.strictEqual(product.lowStockThreshold, null);
  });

  test('negative threshold is rejected', async () => {
    try {
      await Product.create({
        organizationId: org1._id,
        name: 'Test Product',
        sku: 'TEST-001',
        lowStockThreshold: -1,
      });
      assert.fail('Should have thrown validation error');
    } catch (err) {
      assert.ok(err.name === 'ValidationError');
    }
  });

  test('sku is trimmed and uppercased', async () => {
    const product = await Product.create({
      organizationId: org1._id,
      name: 'Test Product',
      sku: '  test-001  ',
    });
    assert.strictEqual(product.sku, 'TEST-001');
  });

  test('name is required and trimmed', async () => {
    try {
      await Product.create({
        organizationId: org1._id,
        name: '  ',
        sku: 'TEST-001',
      });
      assert.fail('Should have thrown validation error');
    } catch (err) {
      assert.ok(err.name === 'ValidationError');
    }
  });

  test('name maxlength 120', async () => {
    try {
      await Product.create({
        organizationId: org1._id,
        name: 'A'.repeat(121),
        sku: 'TEST-001',
      });
      assert.fail('Should have thrown validation error');
    } catch (err) {
      assert.ok(err.name === 'ValidationError');
    }
  });

  test('sku maxlength 64', async () => {
    try {
      await Product.create({
        organizationId: org1._id,
        name: 'Test Product',
        sku: 'A'.repeat(65),
      });
      assert.fail('Should have thrown validation error');
    } catch (err) {
      assert.ok(err.name === 'ValidationError');
    }
  });

  test('description maxlength 1000', async () => {
    try {
      await Product.create({
        organizationId: org1._id,
        name: 'Test Product',
        sku: 'TEST-001',
        description: 'A'.repeat(1001),
      });
      assert.fail('Should have thrown validation error');
    } catch (err) {
      assert.ok(err.name === 'ValidationError');
    }
  });

  test('organizationId is required', async () => {
    try {
      await Product.create({
        name: 'Test Product',
        sku: 'TEST-001',
      });
      assert.fail('Should have thrown validation error');
    } catch (err) {
      assert.ok(err.name === 'ValidationError');
    }
  });
});