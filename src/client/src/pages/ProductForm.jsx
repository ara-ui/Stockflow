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
    if (formData.quantity === '' || !Number.isInteger(Number(formData.quantity)) || Number(formData.quantity) < 0) {
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
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link to="/products" className="btn btn-ghost">
            ← Back
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{isEditing ? 'Edit Product' : 'Add Product'}</h1>
            <p className="text-[var(--color-text-muted)]">
              {isEditing ? 'Update product details' : 'Create a new product in your inventory'}
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-lg bg-[var(--color-danger-light)] text-[var(--color-danger)]">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="card">
        <div className="card-body space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label htmlFor="name" className="label">Name *</label>
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

            <div>
              <label htmlFor="sku" className="label">SKU *</label>
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

            <div className="md:col-span-2">
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

            <div>
              <label htmlFor="quantity" className="label">Quantity *</label>
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

            <div>
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

            <div>
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

            <div>
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

        <div className="card-footer flex justify-end gap-3">
          <Link to="/products" className="btn btn-secondary">
            Cancel
          </Link>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={submitting}
          >
            {submitting ? (
              <>
                <span className="spinner-sm" />
                Saving...
              </>
            ) : isEditing ? (
              'Update Product'
            ) : (
              'Create Product'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}