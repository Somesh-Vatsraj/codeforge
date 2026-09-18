import { NavLink, Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../store.jsx';
import Spinner from '../components/Spinner.jsx';

export default function AdminLayout() {
  const { admin, loading, logout } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="admin-boot"><Spinner label="Checking session…" /></div>;
  }

  if (!admin) {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
  }

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-sidebar__brand">
          <span className="brand__mark" aria-hidden="true">{"</>"}</span>
          <span>Admin</span>
        </div>

        <nav className="admin-nav" aria-label="Admin navigation">
          <NavLink to="/admin/dashboard">Dashboard</NavLink>
          <NavLink to="/admin/posts" end>All Posts</NavLink>
          <NavLink to="/admin/posts/create">Create Post</NavLink>
          <NavLink to="/admin/comments">Comments</NavLink>
          <NavLink to="/admin/categories">Categories &amp; Tags</NavLink>
          <NavLink to="/admin/settings">Settings</NavLink>
        </nav>

        <div className="admin-sidebar__footer">
          <p className="muted small">Signed in as <strong>{admin.username}</strong></p>
          <NavLink to="/" className="btn btn--ghost btn--sm btn--block">View site</NavLink>
          <button type="button" className="btn btn--danger btn--sm btn--block" onClick={logout}>
            Log out
          </button>
        </div>
      </aside>

      <div className="admin-main">
        <Outlet />
      </div>
    </div>
  );
}
