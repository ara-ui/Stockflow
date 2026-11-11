const AppError = require('../utils/AppError');
const Product = require('../models/Product');
const Organization = require('../models/Organization');
const { escapeRegex } = require('../utils/escapeRegex');
const { getEffectiveThreshold, isLowStock } = require('../utils/lowStock');

const ALLOWED_UPDATE_FIELDS = [
  'name',
  'sku',
  'description',
  'quantity',
  'costPrice',
  'sellingPrice',
  'lowStockThreshold',
];

function validateProductInput(data, isUpdate = false) {
  const errors = [];

  if (!isUpdate) {
    if (!data.name || !data.name.trim()) {
      errors.push('Name is required');
    }
    if (!data.sku || !data.sku.trim()) {
      errors.push('SKU is required');
    }
  }

  if (data.name !== undefined) {
    if (!data.name || !data.name.trim()) {
      errors.push('Name cannot be empty');
    } else if (data.name.trim().length > 120) {
      errors.push('Name must not exceed 120 characters');
    }
  }

  if (data.sku !== undefined) {
    if (!data.sku || !data.sku.trim()) {
      errors.push('SKU cannot be empty');
    } else if (data.sku.trim().length > 64) {
      errors.push('SKU must not exceed 64 characters');
    }
  }

  if (data.description !== undefined && data.description !== null && data.description.length > 1000) {
    errors.push('Description must not exceed 1000 characters');
  }

  if (data.quantity !== undefined) {
    if (!Number.isInteger(data.quantity) || data.quantity < 0) {
      errors.push('Quantity must be a non-negative integer');
    }
  }

  if (data.costPrice !== undefined && data.costPrice !== null) {
    if (typeof data.costPrice !== 'number' || data.costPrice < 0) {
      errors.push('Cost price must be a non-negative number');
    }
  }

  if (data.sellingPrice !== undefined && data.sellingPrice !== null) {
    if (typeof data.sellingPrice !== 'number' || data.sellingPrice < 0) {
      errors.push('Selling price must be a non-negative number');
    }
  }

  if (data.lowStockThreshold !== undefined && data.lowStockThreshold !== null) {
    if (!Number.isInteger(data.lowStockThreshold) || data.lowStockThreshold < 0) {
      errors.push('Low stock threshold must be a non-negative integer');
    }
  }

  if (errors.length > 0) {
    throw new AppError(errors.join('. '), 400, 'VALIDATION_ERROR');
  }
}

function sanitizeProductInput(data) {
  const sanitized = {};

  if (data.name !== undefined) sanitized.name = data.name.trim();
  if (data.sku !== undefined) sanitized.sku = data.sku.trim().toUpperCase();
  if (data.description !== undefined) sanitized.description = data.description?.trim() || null;
  if (data.quantity !== undefined) sanitized.quantity = data.quantity;
  if (data.costPrice !== undefined) sanitized.costPrice = data.costPrice;
  if (data.sellingPrice !== undefined) sanitized.sellingPrice = data.sellingPrice;
  if (data.lowStockThreshold !== undefined) sanitized.lowStockThreshold = data.lowStockThreshold;

  return sanitized;
}

async function createProduct(organizationId, productData) {
  validateProductInput(productData);
  const sanitized = sanitizeProductInput(productData);

  try {
    const product = await Product.create({
      ...sanitized,
      organizationId,
    });
    return product;
  } catch (err) {
    if (err.code === 11000) {
      throw new AppError('SKU already exists in this organization', 409, 'DUPLICATE_SKU');
    }
    throw err;
  }
}

async function listProducts(organizationId, search = '') {
  const query = { organizationId };

  if (search && search.trim()) {
    const escaped = escapeRegex(search.trim());
    const regex = new RegExp(escaped, 'i');
    query.$or = [
      { name: regex },
      { sku: regex },
    ];
  }

  const products = await Product.find(query).sort({ createdAt: -1 });
  return products;
}

async function getProductById(organizationId, productId) {
  const product = await Product.findOne({ _id: productId, organizationId });
  return product;
}

async function updateProduct(organizationId, productId, updateData) {
  validateProductInput(updateData, true);

  const sanitized = sanitizeProductInput(updateData);

  const allowedUpdate = {};
  for (const field of ALLOWED_UPDATE_FIELDS) {
    if (sanitized[field] !== undefined) {
      allowedUpdate[field] = sanitized[field];
    }
  }

  try {
    const product = await Product.findOneAndUpdate(
      { _id: productId, organizationId },
      allowedUpdate,
      { returnDocument: 'after', runValidators: true }
    );
    return product;
  } catch (err) {
    if (err.code === 11000) {
      throw new AppError('SKU already exists in this organization', 409, 'DUPLICATE_SKU');
    }
    throw err;
  }
}

async function deleteProduct(organizationId, productId) {
  const product = await Product.findOneAndDelete({ _id: productId, organizationId });
  return product;
}

module.exports = {
  createProduct,
  listProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  getEffectiveThreshold,
  isLowStock,
};