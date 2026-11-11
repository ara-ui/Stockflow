import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { dashboardApi } from '../services/api';

const statCards = [
  { key: 'totalProducts', label: 'Total Products', icon: '📦', color: 'var(--color-primary)', bg: 'var(--color-primary-light)' },
  { key: 'totalQuantity', label: 'Total Quantity', icon: '📊', color: 'var(--color-success)', bg: 'var(--color-success-light)' },
  { key: 'lowStockProducts', label: 'Low Stock Items', icon: '⚠️', color: 'var(--color-warning)', bg: 'var(--color-warning-light)' },
];

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
    if (product.isLowStock) return <span className="badge badge-warning">Low Stock</span>;
    return <span className="badge badge-success">In Stock</span>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-[var(--color-text-muted)]">Overview of your inventory</p>
        </div>
        <Link to="/products/new" className="btn btn-primary">
          <span>➕</span> Add Product
        </Link>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-lg bg-[var(--color-danger-light)] text-[var(--color-danger)]">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {statCards.map((stat) => (
          <div key={stat.key} className="card">
            <div className="card-body">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-[var(--color-text-muted)]">{stat.label}</p>
                  <p className="text-3xl font-bold mt-1" style={{ color: stat.color }}>
                    {stat.key === 'lowStockProducts' ? data[stat.key].length : data[stat.key]}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl" style={{ backgroundColor: stat.bg }}>
                  {stat.icon}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-header flex items-center justify-between">
          <h2 className="text-lg font-semibold">Low Stock Products</h2>
          <Link to="/products" className="text-sm text-[var(--color-primary)] font-medium">
            View all products →
          </Link>
        </div>
        <div className="card-body p-0">
          {data.lowStockProducts.length === 0 ? (
            <div className="p-8 text-center text-[var(--color-text-muted)]">
              <p className="text-2xl mb-2">✅</p>
              <p>No low stock items — all products are well stocked!</p>
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
                      <td className="text-[var(--color-text-muted)]">{product.effectiveThreshold}</td>
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
      </div>
    </div>
  );
}