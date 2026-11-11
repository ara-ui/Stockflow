import { Outlet, Link, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
  const { user, organization, logout } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: '📊' },
    { path: '/products', label: 'Products', icon: '📦' },
  ];

  return (
    <div className="min-h-screen flex">
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-surface border shadow-md"
        onClick={() => setSidebarOpen(true)}
        aria-label="Open navigation"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`} role="navigation" aria-label="Main navigation">
        {sidebarOpen && (
          <button
            className="lg:hidden absolute top-4 right-4 p-2 rounded-lg hover-bg-sidebar-hover text-sidebar-muted"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close navigation"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}

        <div className="sidebar-header">
          <h1 className="sidebar-logo">StockFlow</h1>
          <p className="sidebar-org">{organization?.name}</p>
        </div>

        <nav className="sidebar-nav" aria-label="Main menu">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`sidebar-nav-item ${location.pathname === item.path ? 'active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              <span className="sidebar-nav-icon" aria-hidden="true">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-avatar" aria-hidden="true">
              {user?.email?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <div className="sidebar-user-info">
              <p className="sidebar-user-email">{user?.email}</p>
              <p className="sidebar-user-org">{organization?.name}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="sidebar-logout"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Logout
          </button>
        </div>
      </aside>

      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <main className="main-content" role="main">
        <Outlet />
      </main>
    </div>
  );
}