import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../services/api';

export default function Signup() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    organizationName: '',
  });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: '' }));
    setError('');
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = 'Invalid email format';
    if (!formData.password) newErrors.password = 'Password is required';
    else if (formData.password.length < 8) newErrors.password = 'Password must be at least 8 characters';
    if (!formData.confirmPassword) newErrors.confirmPassword = 'Please confirm your password';
    else if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    if (!formData.organizationName.trim()) newErrors.organizationName = 'Organization name is required';
    else if (formData.organizationName.trim().length < 2) newErrors.organizationName = 'Organization name must be at least 2 characters';
    else if (formData.organizationName.trim().length > 80) newErrors.organizationName = 'Organization name must not exceed 80 characters';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setError('');
    setLoading(true);

    try {
      const data = await authApi.signup({
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        confirmPassword: formData.confirmPassword,
        organizationName: formData.organizationName.trim(),
      });
      login(data.token, data.user, data.organization);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      if (err.code === 'EMAIL_EXISTS') {
        setErrors({ email: 'An account with this email already exists' });
      } else if (err.code === 'PASSWORD_MISMATCH') {
        setErrors({ confirmPassword: 'Passwords do not match' });
      } else if (err.code === 'VALIDATION_ERROR') {
        setError(err.message);
      } else {
        setError(err.details?.message || err.message || 'Signup failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <header className="auth-header">
          <div className="auth-logo">StockFlow</div>
          <h2 className="auth-title">Create your account</h2>
          <p className="auth-subtitle">Start managing your inventory with StockFlow</p>
        </header>

        <div className="auth-body">
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

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label htmlFor="organizationName" className="label">Organization Name</label>
              <input
                id="organizationName"
                name="organizationName"
                type="text"
                className={`input ${errors.organizationName ? 'input-error' : ''}`}
                value={formData.organizationName}
                onChange={handleChange}
                required
                autoComplete="organization"
                placeholder="Acme Corp"
              />
              {errors.organizationName && <p className="error-text">{errors.organizationName}</p>}
            </div>

            <div className="mb-4">
              <label htmlFor="email" className="label">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                className={`input ${errors.email ? 'input-error' : ''}`}
                value={formData.email}
                onChange={handleChange}
                required
                autoComplete="email"
                placeholder="you@example.com"
              />
              {errors.email && <p className="error-text">{errors.email}</p>}
            </div>

            <div className="mb-4">
              <label htmlFor="password" className="label">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                className={`input ${errors.password ? 'input-error' : ''}`}
                value={formData.password}
                onChange={handleChange}
                required
                autoComplete="new-password"
                placeholder="••••••••"
                minLength={8}
              />
              {errors.password && <p className="error-text">{errors.password}</p>}
              <p className="help-text">At least 8 characters</p>
            </div>

            <div className="mb-6">
              <label htmlFor="confirmPassword" className="label">Confirm Password</label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                className={`input ${errors.confirmPassword ? 'input-error' : ''}`}
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                autoComplete="new-password"
                placeholder="••••••••"
              />
              {errors.confirmPassword && <p className="error-text">{errors.confirmPassword}</p>}
            </div>

            <button
              type="submit"
              className="btn btn-primary w-full"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner-sm" aria-hidden="true" />
                  Creating account...
                </>
              ) : (
                'Create account'
              )}
            </button>
          </form>
        </div>

        <footer className="auth-footer">
          <p className="auth-footer-text">
            Already have an account?{' '}
            <Link to="/login" className="auth-footer-link">Sign in</Link>
          </p>
        </footer>
      </div>
    </div>
  );
}