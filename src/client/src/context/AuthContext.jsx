import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../services/api';

const AuthContext = createContext(null);

function safeParse(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null || raw === 'undefined' || raw === 'null') return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function isAuthError(error) {
  return error && (error.status === 401 || error.status === 403);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadAuth = useCallback(async () => {
    const token = localStorage.getItem('token');
    const userData = safeParse('user');
    const orgData = safeParse('organization');

    if (token && userData) {
      try {
        // Verify token is still valid by making a request
        await authApi.getDashboard(token);
        setUser(userData);
        setOrganization(orgData);
      } catch (error) {
        // Only clear auth data on genuine auth errors (401/403)
        // Preserve token/user/org on network errors, server errors, etc.
        if (isAuthError(error)) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          localStorage.removeItem('organization');
        }
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadAuth();
  }, [loadAuth]);

  const login = useCallback((token, userData, orgData) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    if (orgData) {
      localStorage.setItem('organization', JSON.stringify(orgData));
    } else {
      localStorage.removeItem('organization');
    }
    setUser(userData);
    setOrganization(orgData);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('organization');
    setUser(null);
    setOrganization(null);
  }, []);

  const value = {
    user,
    organization,
    isAuthenticated: !!user,
    loading,
    login,
    logout,
    token: localStorage.getItem('token'),
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}