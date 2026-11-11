import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { dashboardApi } from '../services/api';

export default function Dashboard() {
  const [data, setData] = useState({ totalProducts: 0, totalQuantity: 0, lowStockProducts: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const result = await dashboardApi.get();
      setData(result);
    } catch (err) {
      setError(err.details?.message || err.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (product) => {
    if (product.quantity <= 0) return <span className="badge badge-danger">Out of Stock</span>;
    const threshold = product.effectiveThreshold ?? 5;
    if (product.quantity <= threshold) return <span className="badge badge-warning">Low Stock</span>;
    return <span className="badge badge-success">In Stock</span>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner" />
      </div>
    );
  }

  const kpiCards = [
    {
      key: 'totalProducts',
      label: 'Total Products',
      value: data.totalProducts,
      icon: '📦',
      color: 'var(--color-primary)',
      bg: 'var(--color-primary-light)',
    },
    {
      key: 'totalQuantity',
      label: 'Total Quantity',
      value: data.totalQuantity,
      icon: '📊',
      color: 'var(--color-success)',
      bg: 'var(--color-success-light)',
    },
    {
      key: 'lowStockProducts',
      label: 'Low Stock Items',
      value: data.lowStockProducts.length,
      icon: '⚠️',
      color: 'var(--color-warning)',
      bg: 'var(--color-warning-light)',
    },
  ];

  return (
    <div>
      <header className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p>Overview of your inventory</p>
        </div>
        <Link to="/products/new" className="btn btn-primary">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add Product
        </Link>
      </header>

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

      <div className="kpi-grid">
        {kpiCards.map((stat) => (
          <div key={stat.key} className="kpi-card">
            <div className="kpi-card-header">
              <span className="kpi-card-title">{stat.label}</span>
              <div className="kpi-card-icon" style={{ backgroundColor: stat.bg, color: stat.color }} aria-hidden="true">
                {stat.icon}
              </div>
            </div>
            <p className="kpi-card-value" style={{ color: stat.color }}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      <section className="section-card">
        <header className="section-header">
          <h2 className="section-title">Low Stock Products</h2>
          <Link to="/products" className="section-link">View all products →</Link>
        </header>
        <div className="section-body">
          {data.lowStockProducts.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon" aria-hidden="true">✅</div>
              <p className="empty-state-title">All products well stocked</p>
              <p className="empty-state-description">No low stock items at the moment</p>
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
                    <th className="w-32"></th>
                  </tr>
                </thead>
                <tbody>
                  {data.lowStockProducts.map((product) => (
                    <tr key={product._id}>
                      <td className="font-medium">{product.name}</td>
                      <td className="font-mono text-sm">{product.sku}</td>
                      <td className="font-medium" style={{ color: product.quantity <= 0 ? 'var(--color-danger)' : 'var(--color-warning)' }}>
                        {product.quantity}
                      </td>
                      <td className="text-muted">{product.effectiveThreshold}</td>
                      <td>{getStatusBadge(product)}</td>
                      <td>
                        <Link to={`/products/${product._id}/edit`} className="btn btn-ghost btn-sm">
                          Edit
                        </Link>
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