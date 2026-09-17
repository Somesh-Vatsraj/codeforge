import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, qs } from '../api/client.js';
import { formatDate, formatNumber } from '../utils/format.js';
import Pagination from '../components/Pagination.jsx';
import Spinner from '../components/Spinner.jsx';

export default function Posts() {
  const [searchParams, setSearchParams] = useSearchParams();
  const status = searchParams.get('status') || '';
  const query = searchParams.get('q') || '';
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchInput, setSearchInput] = useState(query);

  const load = useCallback(() => {
    setLoading(true);
    api.get(`/admin/posts${qs({ status, q: query, page })}`)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [status, query, page]);

  useEffect(() => { load(); }, [load]);

  const remove = async (post) => {
    if (!window.confirm(`Delete “${post.title}”? This cannot be undone.`)) return;
    try {
      await api.del(`/admin/posts/${post.id}`);
      load();
    } catch (err) {
      alert(err.message);
    }
  };

  const toggleStatus = async (post) => {
    try {
      const { post: full } = await api.get(`/admin/posts/${post.id}`);
      await api.put(`/admin/posts/${post.id}`, {
        ...full,
        status: full.status === 'published' ? 'draft' : 'published',
      });
      load();
    } catch (err) {
      alert(err.message);
    }
  };

  const setParam = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value); else next.delete(key);
    next.delete('page');
    setSearchParams(next);
  };

  return (
    <div className="admin-page">
      <header className="admin-page__head">
        <h1>All Posts</h1>
        <Link className="btn btn--primary" to="/admin/posts/create">+ New Post</Link>
      </header>

      <div className="admin-toolbar">
        <div className="filter-group" role="group" aria-label="Filter by status">
          {[['', 'All'], ['published', 'Published'], ['draft', 'Drafts']].map(([value, label]) => (
            <button
              key={label}
              type="button"
              className={status === value ? 'filter-btn filter-btn--active' : 'filter-btn'}
              onClick={() => setParam('status', value)}
            >
              {label}
            </button>
          ))}
        </div>

        <form
          className="admin-search"
          onSubmit={(e) => { e.preventDefault(); setParam('q', searchInput.trim()); }}
          role="search"
        >
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by title or slug…"
            aria-label="Search posts"
          />
          <button type="submit" className="btn btn--sm">Search</button>
        </form>
      </div>

      {error && <p className="alert alert--error">{error}</p>}
      {loading && <Spinner label="Loading posts…" />}

      {!loading && data && data.posts.length === 0 && (
        <p className="muted">No posts match this filter.</p>
      )}

      {!loading && data && data.posts.length > 0 && (
        <>
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th scope="col">Thumb</th>
                  <th scope="col">Title</th>
                  <th scope="col">Category</th>
                  <th scope="col">Status</th>
                  <th scope="col">Flags</th>
                  <th scope="col">Views</th>
                  <th scope="col">Updated</th>
                  <th scope="col"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {data.posts.map((post) => (
                  <tr key={post.id}>
                    <td>
                      {post.thumbnail_url
                        ? <img className="thumb" src={post.thumbnail_url} alt="" loading="lazy" />
                        : <span className="thumb thumb--empty" aria-hidden="true">—</span>}
                    </td>
                    <td className="cell-title">
                      <Link to={`/admin/posts/edit/${post.id}`}>{post.title}</Link>
                      <span className="muted small block">/{post.slug}</span>
                    </td>
                    <td>{post.category_name || '—'}</td>
                    <td>
                      <button
                        type="button"
                        className={post.status === 'published' ? 'pill pill--ok pill--btn' : 'pill pill--warn pill--btn'}
                        onClick={() => toggleStatus(post)}
                        title="Toggle published / draft"
                      >
                        {post.status}
                      </button>
                    </td>
                    <td className="flags">
                      {post.featured ? <span title="Featured">★</span> : null}
                      {post.trending ? <span title="Trending">▲</span> : null}
                      {post.live_preview ? <span title="Live preview">▶</span> : null}
                    </td>
                    <td>{formatNumber(post.views)}</td>
                    <td>{formatDate(post.updated_at)}</td>
                    <td className="row-actions">
                      <Link className="btn btn--xs" to={`/project/${post.slug}`} target="_blank" rel="noreferrer">View</Link>
                      <Link className="btn btn--xs btn--primary" to={`/admin/posts/edit/${post.id}`}>Edit</Link>
                      <button type="button" className="btn btn--xs btn--danger" onClick={() => remove(post)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination
            page={data.page}
            pages={data.pages}
            buildTo={(n) => {
              const next = new URLSearchParams(searchParams);
              next.set('page', String(n));
              return `/admin/posts?${next.toString()}`;
            }}
          />
        </>
      )}
    </div>
  );
}
