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
    const threshold = product.effectiveThreshold ?? 5;
    if (product.quantity <= threshold) return <span className="badge badge-warning">Low Stock</span>;
    return <span className="badge badge-success">In Stock</span>;
  };

  return (
    <div>
      <header className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1>Products</h1>
          <p>Manage your inventory</p>
        </div>
        <Link to="/products/new" className="btn btn-primary">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add Product
        </Link>
      </header>

      <section className="section-card mb-6">
        <div className="section-body p-4 sm:p-6">
          <label htmlFor="search" className="sr-only">Search products</label>
          <div className="relative max-w-md">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              id="search"
              type="search"
              className="input pl-10"
              placeholder="Search by name or SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </section>

      {error && (
        <div className="alert alert-error" role="alert">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="flex-shrink-0 mt-0.5">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {error}
        </div>
      )}

      <section className="section-card">
        <div className="section-body p-0">
          {loading && products.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <div className="spinner" />
            </div>
          ) : products.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon" aria-hidden="true">📦</div>
              <p className="empty-state-title">{debouncedSearch ? 'No products match your search' : 'No products yet'}</p>
              <p className="empty-state-description">
                {debouncedSearch ? 'Try adjusting your search terms' : 'Get started by adding your first product'}
              </p>
              {!debouncedSearch && (
                <Link to="/products/new" className="btn btn-primary">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  Add your first product
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
                    <th className="w-40">Status</th>
                    <th className="w-40">Selling Price</th>
                    <th className="w-48">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <tr key={product._id}>
                      <td>
                        <div className="font-medium">{product.name}</div>
                        {product.description && (
                          <div className="text-xs text-muted truncate max-w-xs mt-1">
                            {product.description}
                          </div>
                        )}
                      </td>
                      <td className="font-mono text-sm">{product.sku}</td>
                      <td className="font-medium" style={{ color: product.quantity <= 0 ? 'var(--color-danger)' : (product.effectiveThreshold ?? 5) >= product.quantity ? 'var(--color-warning)' : 'inherit' }}>
                        {product.quantity}
                      </td>
                      <td>{getStatusBadge(product)}</td>
                      <td className="font-mono text-sm">{product.sellingPrice != null ? `$${Number(product.sellingPrice).toFixed(2)}` : '—'}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          <Link to={`/products/${product._id}/edit`} className="btn btn-ghost btn-sm">
                            Edit
                          </Link>
                          <button
                            onClick={() => handleDelete(product._id)}
                            disabled={deletingId === product._id}
                            className="btn btn-ghost btn-sm text-danger hover-bg-danger-light"
                          >
                            {deletingId === product._id ? (
                              <span className="spinner-sm" aria-hidden="true" />
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
      </section>
    </div>
  );
}