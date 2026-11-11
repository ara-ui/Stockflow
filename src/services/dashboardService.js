const Product = require('../models/Product');
const Organization = require('../models/Organization');
const { getEffectiveThreshold, isLowStock } = require('../utils/lowStock');

async function getDashboardData(organizationId) {
  const organization = await Organization.findById(organizationId);
  const products = await Product.find({ organizationId });

  const totalProducts = products.length;
  const totalQuantity = products.reduce((sum, product) => sum + product.quantity, 0);

  const lowStockProducts = products
    .filter((product) => isLowStock(product, organization))
    .map((product) => ({
      name: product.name,
      sku: product.sku,
      quantity: product.quantity,
      effectiveThreshold: getEffectiveThreshold(product, organization),
    }));

  return {
    totalProducts,
    totalQuantity,
    lowStockProducts,
  };
}

module.exports = {
  getDashboardData,
};