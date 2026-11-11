import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { productsApi } from '../services/api';

export default function ProductForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    description: '',
    quantity: 0,
    costPrice: '',
    sellingPrice: '',
    lowStockThreshold: '',
  });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isEditing) {
      loadProduct();
    }
  }, [id]);

  const loadProduct = async () => {
    try {
      setLoading(true);
      const product = await productsApi.get(id);
      setFormData({
        name: product.name,
        sku: product.sku,
        description: product.description || '',
        quantity: product.quantity,
        costPrice: product.costPrice ?? '',
        sellingPrice: product.sellingPrice ?? '',
        lowStockThreshold: product.lowStockThreshold ?? '',
      });
    } catch (err) {
      setError(err.details?.message || err.message || 'Failed to load product');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: '' }));
    setError('');
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    else if (formData.name.trim().length > 120) newErrors.name = 'Name must not exceed 120 characters';
    if (!formData.sku.trim()) newErrors.sku = 'SKU is required';
    else if (formData.sku.trim().length > 64) newErrors.sku = 'SKU must not exceed 64 characters';
    if (formData.description.length > 1000) newErrors.description = 'Description must not exceed 1000 characters';
    if (formData.quantity === '' || formData.quantity === null || formData.quantity === undefined || String(formData.quantity).trim() === '' || !Number.isInteger(Number(formData.quantity)) || Number(formData.quantity) < 0) {
      newErrors.quantity = 'Quantity must be a non-negative integer';
    }
    if (formData.costPrice !== '' && (isNaN(formData.costPrice) || Number(formData.costPrice) < 0)) {
      newErrors.costPrice = 'Cost price must be a non-negative number';
    }
    if (formData.sellingPrice !== '' && (isNaN(formData.sellingPrice) || Number(formData.sellingPrice) < 0)) {
      newErrors.sellingPrice = 'Selling price must be a non-negative number';
    }
    if (formData.lowStockThreshold !== '' && (!Number.isInteger(Number(formData.lowStockThreshold)) || Number(formData.lowStockThreshold) < 0)) {
      newErrors.lowStockThreshold = 'Low stock threshold must be a non-negative integer';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    setError('');

    const payload = {
      name: formData.name.trim(),
      sku: formData.sku.trim().toUpperCase(),
      description: formData.description.trim() || null,
      quantity: Number(formData.quantity),
      costPrice: formData.costPrice === '' ? null : Number(formData.costPrice),
      sellingPrice: formData.sellingPrice === '' ? null : Number(formData.sellingPrice),
      lowStockThreshold: formData.lowStockThreshold === '' ? null : Number(formData.lowStockThreshold),
    };

    try {
      if (isEditing) {
        await productsApi.update(id, payload);
      } else {
        await productsApi.create(payload);
      }
      navigate('/products');
    } catch (err) {
      if (err.code === 'DUPLICATE_SKU') {
        setErrors({ sku: 'SKU already exists in this organization' });
      } else if (err.code === 'VALIDATION_ERROR') {
        setError(err.message);
      } else {
        setError(err.details?.message || err.message || 'Failed to save product');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (isEditing && loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <header className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <Link to="/products" className="btn btn-ghost">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            Back
          </Link>
          <div>
            <h1>{isEditing ? 'Edit Product' : 'Add Product'}</h1>
            <p className="text-muted">
              {isEditing ? 'Update product details' : 'Create a new product in your inventory'}
            </p>
          </div>
        </div>
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

      <section className="section-card">
        <form onSubmit={handleSubmit}>
          <div className="section-body">
            <div className="form-section">
              <h3 className="form-section-title">Basic Information</h3>
              <div className="form-grid">
                <div className="form-field full-width">
                  <label htmlFor="name" className="label">Name <span className="text-danger" aria-hidden="true">*</span></label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    className={`input ${errors.name ? 'input-error' : ''}`}
                    value={formData.name}
                    onChange={handleChange}
                    required
                    maxLength={120}
                    placeholder="Product name"
                  />
                  {errors.name && <p className="error-text">{errors.name}</p>}
                </div>

                <div className="form-field">
                  <label htmlFor="sku" className="label">SKU <span className="text-danger" aria-hidden="true">*</span></label>
                  <input
                    id="sku"
                    name="sku"
                    type="text"
                    className={`input ${errors.sku ? 'input-error' : ''}`}
                    value={formData.sku}
                    onChange={handleChange}
                    required
                    maxLength={64}
                    placeholder="SKU-001"
                  />
                  {errors.sku && <p className="error-text">{errors.sku}</p>}
                  <p className="help-text">Will be converted to uppercase</p>
                </div>

                <div className="form-field full-width">
                  <label htmlFor="description" className="label">Description</label>
                  <textarea
                    id="description"
                    name="description"
                    className={`input ${errors.description ? 'input-error' : ''}`}
                    value={formData.description}
                    onChange={handleChange}
                    rows={3}
                    maxLength={1000}
                    placeholder="Product description (optional)"
                  />
                  {errors.description && <p className="error-text">{errors.description}</p>}
                </div>
              </div>
            </div>

            <div className="form-section">
              <h3 className="form-section-title">Inventory</h3>
              <div className="form-grid">
                <div className="form-field">
                  <label htmlFor="quantity" className="label">Quantity <span className="text-danger" aria-hidden="true">*</span></label>
                  <input
                    id="quantity"
                    name="quantity"
                    type="number"
                    className={`input ${errors.quantity ? 'input-error' : ''}`}
                    value={formData.quantity}
                    onChange={handleChange}
                    required
                    min={0}
                    step={1}
                    placeholder="0"
                  />
                  {errors.quantity && <p className="error-text">{errors.quantity}</p>}
                </div>

                <div className="form-field">
                  <label htmlFor="lowStockThreshold" className="label">Low Stock Threshold</label>
                  <input
                    id="lowStockThreshold"
                    name="lowStockThreshold"
                    type="number"
                    className={`input ${errors.lowStockThreshold ? 'input-error' : ''}`}
                    value={formData.lowStockThreshold}
                    onChange={handleChange}
                    min={0}
                    step={1}
                    placeholder="Uses organization default"
                  />
                  {errors.lowStockThreshold && <p className="error-text">{errors.lowStockThreshold}</p>}
                  <p className="help-text">Leave empty to use organization default. Set to 0 to disable.</p>
                </div>
              </div>
            </div>

            <div className="form-section">
              <h3 className="form-section-title">Pricing</h3>
              <div className="form-grid">
                <div className="form-field">
                  <label htmlFor="costPrice" className="label">Cost Price</label>
                  <input
                    id="costPrice"
                    name="costPrice"
                    type="number"
                    className={`input ${errors.costPrice ? 'input-error' : ''}`}
                    value={formData.costPrice}
                    onChange={handleChange}
                    min={0}
                    step={0.01}
                    placeholder="0.00"
                  />
                  {errors.costPrice && <p className="error-text">{errors.costPrice}</p>}
                </div>

                <div className="form-field">
                  <label htmlFor="sellingPrice" className="label">Selling Price</label>
                  <input
                    id="sellingPrice"
                    name="sellingPrice"
                    type="number"
                    className={`input ${errors.sellingPrice ? 'input-error' : ''}`}
                    value={formData.sellingPrice}
                    onChange={handleChange}
                    min={0}
                    step={0.01}
                    placeholder="0.00"
                  />
                  {errors.sellingPrice && <p className="error-text">{errors.sellingPrice}</p>}
                </div>
              </div>
            </div>
          </div>

          <footer className="card-footer flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3">
            <Link to="/products" className="btn btn-secondary w-full sm:w-auto">
              Cancel
            </Link>
            <button
              type="submit"
              className="btn btn-primary w-full sm:w-auto"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <span className="spinner-sm" aria-hidden="true" />
                  Saving...
                </>
              ) : isEditing ? (
                'Update Product'
              ) : (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  Create Product
                </>
              )}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}