import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { productsApi } from '../services/api';

export default function Products() {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  const loadProducts = useCallback(async () => {
    try {
      setLoading(true);
      const data = await productsApi.list(debouncedSearch);
      setProducts(data);
    } catch (err) {
      setError(err.details?.message || err.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;

    setDeletingId(id);
    try {
      await productsApi.delete(id);
      setProducts(prev => prev.filter(p => p._id !== id));
    } catch (err) {
      alert(err.details?.message || err.message || 'Failed to delete product');
    } finally {
      setDeletingId(null);
    }
  };

  const getStatusBadge = (product) => {
    if (product.quantity <= 0) return <span className="badge badge-danger">Out of Stock</span>;
    if (product.isLowStock) return <span className="badge badge-warning">Low Stock</span>;
    return <span className="badge badge-success">In Stock</span>;
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Products</h1>
          <p className="text-[var(--color-text-muted)]">Manage your inventory</p>
        </div>
        <Link to="/products/new" className="btn btn-primary">
          <span>➕</span> Add Product
        </Link>
      </div>

      <div className="card mb-6">
        <div className="card-body">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 max-w-md">
              <label htmlFor="search" className="sr-only">Search products</label>
              <input
                id="search"
                type="search"
                className="input"
                placeholder="Search by name or SKU..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-lg bg-[var(--color-danger-light)] text-[var(--color-danger)]">
          {error}
        </div>
      )}

      <div className="card">
        <div className="card-body p-0">
          {loading && products.length === 0 ? (
            <div className="p-8 text-center">
              <div className="spinner mx-auto" />
            </div>
          ) : products.length === 0 ? (
            <div className="p-8 text-center text-[var(--color-text-muted)]">
              <p className="text-2xl mb-2">📦</p>
              <p>{debouncedSearch ? 'No products match your search' : 'No products yet'}</p>
              {!debouncedSearch && (
                <Link to="/products/new" className="btn btn-primary mt-4 inline-flex">
                  <span>➕</span> Add your first product
                </Link>
              )}
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>SKU</th>
                    <th className="w-32">Quantity</th>
                    <th className="w-40">Threshold</th>
                    <th className="w-40">Status</th>
                    <th className="w-48">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <tr key={product._id}>
                      <td>
                        <div className="font-medium">{product.name}</div>
                        {product.description && (
                          <div className="text-xs text-[var(--color-text-muted)] truncate max-w-xs mt-1">
                            {product.description}
                          </div>
                        )}
                      </td>
                      <td className="font-mono text-sm">{product.sku}</td>
                      <td className="font-medium" style={{ color: product.quantity <= 0 ? 'var(--color-danger)' : product.isLowStock ? 'var(--color-warning)' : 'inherit' }}>
                        {product.quantity}
                      </td>
                      <td className="text-[var(--color-text-muted)]">
                        {product.lowStockThreshold !== null && product.lowStockThreshold !== undefined
                          ? product.lowStockThreshold
                          : 'Org default'}
                      </td>
                      <td>{getStatusBadge(product)}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          <Link to={`/products/${product._id}/edit`} className="btn btn-ghost btn-sm">
                            Edit
                          </Link>
                          <button
                            onClick={() => handleDelete(product._id)}
                            disabled={deletingId === product._id}
                            className="btn btn-ghost btn-sm text-[var(--color-danger)] hover:bg-[var(--color-danger-light)]"
                          >
                            {deletingId === product._id ? (
                              <span className="spinner-sm" />
                            ) : (
                              'Delete'
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}