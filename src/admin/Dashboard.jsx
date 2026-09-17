import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { formatDate, formatNumber } from '../utils/format.js';
import Spinner from '../components/Spinner.jsx';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/admin/stats').then(setData).catch((e) => setError(e.message));
  }, []);

  if (error) return <div className="admin-page"><p className="alert alert--error">{error}</p></div>;
  if (!data) return <div className="admin-page"><Spinner label="Loading dashboard…" /></div>;

  const cards = [
    ['Total posts', data.totals.posts],
    ['Published', data.totals.published],
    ['Drafts', data.totals.drafts],
    ['Total views', formatNumber(data.totals.views)],
    ['Categories', data.totals.categories],
    ['Trending', data.totals.trending],
  ];

  return (
    <div className="admin-page">
      <header className="admin-page__head">
        <h1>Dashboard</h1>
        <Link className="btn btn--primary" to="/admin/posts/create">+ New Post</Link>
      </header>

      <div className="stat-grid">
        {cards.map(([label, value]) => (
          <div className="stat-card" key={label}>
            <span className="stat-card__label">{label}</span>
            <span className="stat-card__value">{value}</span>
          </div>
        ))}
      </div>

      <section className="admin-panel">
        <div className="admin-panel__head">
          <h2>Recent posts</h2>
          <Link to="/admin/posts" className="section__link">View all →</Link>
        </div>

        {data.recent.length === 0 ? (
          <p className="muted">No posts yet. Create your first one.</p>
        ) : (
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th scope="col">Thumb</th>
                  <th scope="col">Title</th>
                  <th scope="col">Category</th>
                  <th scope="col">Status</th>
                  <th scope="col">Views</th>
                  <th scope="col">Updated</th>
                  <th scope="col"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {data.recent.map((post) => (
                  <tr key={post.id}>
                    <td>
                      {post.thumbnail_url
                        ? <img className="thumb" src={post.thumbnail_url} alt="" loading="lazy" />
                        : <span className="thumb thumb--empty" aria-hidden="true">—</span>}
                    </td>
                    <td className="cell-title">{post.title}</td>
                    <td>{post.category_name || '—'}</td>
                    <td>
                      <span className={post.status === 'published' ? 'pill pill--ok' : 'pill pill--warn'}>
                        {post.status}
                      </span>
                    </td>
                    <td>{formatNumber(post.views)}</td>
                    <td>{formatDate(post.updated_at)}</td>
                    <td>
                      <Link className="btn btn--xs" to={`/admin/posts/edit/${post.id}`}>Edit</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
