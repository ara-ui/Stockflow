function getEffectiveThreshold(product, organization) {
  if (product.lowStockThreshold != null) {
    return product.lowStockThreshold;
  }
  return organization?.defaultLowStockThreshold ?? 5;
}

function isLowStock(product, organization) {
  const threshold = getEffectiveThreshold(product, organization);
  return product.quantity <= threshold;
}

module.exports = {
  getEffectiveThreshold,
  isLowStock,
};