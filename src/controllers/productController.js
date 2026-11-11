const {
  createProduct,
  listProducts,
  getProductById,
  updateProduct,
  deleteProduct,
} = require('../services/productService');
const AppError = require('../utils/AppError');

async function createProductController(req, res, next) {
  try {
    const product = await createProduct(req.organizationId, req.body);
    res.status(201).json(product);
  } catch (err) {
    next(err);
  }
}

async function listProductsController(req, res, next) {
  try {
    const search = req.query.search || '';
    const products = await listProducts(req.organizationId, search);
    res.json(products);
  } catch (err) {
    next(err);
  }
}

async function getProductController(req, res, next) {
  try {
    const { id } = req.params;

    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      throw new AppError('Product not found', 404, 'NOT_FOUND');
    }

    const product = await getProductById(req.organizationId, id);

    if (!product) {
      throw new AppError('Product not found', 404, 'NOT_FOUND');
    }

    res.json(product);
  } catch (err) {
    next(err);
  }
}

async function updateProductController(req, res, next) {
  try {
    const { id } = req.params;

    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      throw new AppError('Product not found', 404, 'NOT_FOUND');
    }

    const product = await updateProduct(req.organizationId, id, req.body);

    if (!product) {
      throw new AppError('Product not found', 404, 'NOT_FOUND');
    }

    res.json(product);
  } catch (err) {
    next(err);
  }
}

async function deleteProductController(req, res, next) {
  try {
    const { id } = req.params;

    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      throw new AppError('Product not found', 404, 'NOT_FOUND');
    }

    const product = await deleteProduct(req.organizationId, id);

    if (!product) {
      throw new AppError('Product not found', 404, 'NOT_FOUND');
    }

    res.json({ message: 'Product deleted successfully' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createProductController,
  listProductsController,
  getProductController,
  updateProductController,
  deleteProductController,
};