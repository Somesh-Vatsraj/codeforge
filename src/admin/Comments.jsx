import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, qs } from '../api/client.js';
import Pagination from '../components/Pagination.jsx';
import Spinner from '../components/Spinner.jsx';

function timeAgo(dateString) {
  if (!dateString) return '';
  const iso = dateString.includes('T') ? dateString : dateString.replace(' ', 'T') + 'Z';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const diff = Math.max(0, Date.now() - then);
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min} min ago`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function Comments() {
  const [searchParams, setSearchParams] = useSearchParams();
  const status = searchParams.get('status') || '';
  const query = searchParams.get('q') || '';
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);

  const [data, setData] = useState(null);
  const [stats, setStats] = useState({ pending: 0, approved: 0, spam: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchInput, setSearchInput] = useState(query);
  const [busy, setBusy] = useState({});

  const loadStats = useCallback(() => {
    api.get('/admin/comments/stats').then(setStats).catch(() => {});
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    api.get(`/admin/comments${qs({ status, q: query, page })}`)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
    loadStats();
  }, [status, query, page, loadStats]);

  useEffect(() => { load(); }, [load]);

  const setParam = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value); else next.delete(key);
    next.delete('page');
    setSearchParams(next);
  };

  const setStatus = async (comment, newStatus) => {
    setBusy((b) => ({ ...b, [comment.id]: true }));
    try {
      await api.put(`/admin/comments/${comment.id}`, { status: newStatus });
      load();
    } catch (e) {
      alert(e.message);
    } finally {
      setBusy((b) => ({ ...b, [comment.id]: false }));
    }
  };

  const remove = async (comment) => {
    if (!window.confirm(`Delete comment from "${comment.author_name}"? This cannot be undone.`)) return;
    setBusy((b) => ({ ...b, [comment.id]: true }));
    try {
      await api.del(`/admin/comments/${comment.id}`);
      load();
    } catch (e) {
      alert(e.message);
    } finally {
      setBusy((b) => ({ ...b, [comment.id]: false }));
    }
  };

  return (
    <div className="admin-page">
      <header className="admin-page__head">
        <h1>Comments</h1>
        <button type="button" className="btn btn--ghost btn--sm" onClick={load}>
          ↻ Refresh
        </button>
      </header>

      <div className="stat-grid stat-grid--compact">
        <button
          type="button"
          className={status === 'pending' ? 'stat-card stat-card--clickable stat-card--active' : 'stat-card stat-card--clickable'}
          onClick={() => setParam('status', status === 'pending' ? '' : 'pending')}
        >
          <span className="stat-card__label">Pending</span>
          <span className="stat-card__value">{stats.pending}</span>
        </button>
        <button
          type="button"
          className={status === 'approved' ? 'stat-card stat-card--clickable stat-card--active' : 'stat-card stat-card--clickable'}
          onClick={() => setParam('status', status === 'approved' ? '' : 'approved')}
        >
          <span className="stat-card__label">Approved</span>
          <span className="stat-card__value">{stats.approved}</span>
        </button>
        <button
          type="button"
          className={status === 'spam' ? 'stat-card stat-card--clickable stat-card--active' : 'stat-card stat-card--clickable'}
          onClick={() => setParam('status', status === 'spam' ? '' : 'spam')}
        >
          <span className="stat-card__label">Spam</span>
          <span className="stat-card__value">{stats.spam}</span>
        </button>
        <button
          type="button"
          className={status === '' ? 'stat-card stat-card--clickable stat-card--active' : 'stat-card stat-card--clickable'}
          onClick={() => setParam('status', '')}
        >
          <span className="stat-card__label">Total</span>
          <span className="stat-card__value">{stats.total}</span>
        </button>
      </div>

      <div className="admin-toolbar">
        <div className="filter-group" role="group" aria-label="Filter comments">
          {[
            ['', 'All'],
            ['pending', 'Pending'],
            ['approved', 'Approved'],
            ['spam', 'Spam'],
          ].map(([value, label]) => (
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
            placeholder="Search by name, text, or post title…"
            aria-label="Search comments"
          />
          <button type="submit" className="btn btn--sm">Search</button>
        </form>
      </div>

      {error && <p className="alert alert--error">{error}</p>}
      {loading && <Spinner label="Loading comments…" />}

      {!loading && data && data.comments.length === 0 && (
        <div className="admin-empty">
          <p className="muted">
            {status === 'pending'
              ? 'No pending comments. Great job!'
              : query
                ? 'No comments match your search.'
                : 'No comments yet. They will appear here when visitors post them.'}
          </p>
        </div>
      )}

      {!loading && data && data.comments.length > 0 && (
        <>
          <ul className="admin-comment-list">
            {data.comments.map((c) => (
              <li key={c.id} className={`admin-comment admin-comment--${c.status}`}>
                <div className="admin-comment__avatar" aria-hidden="true">
                  {(c.author_name || '?').trim().charAt(0).toUpperCase()}
                </div>

                <div className="admin-comment__main">
                  <div className="admin-comment__head">
                    <div>
                      <strong className="admin-comment__name">{c.author_name}</strong>
                      <span className={`pill pill--${c.status === 'approved' ? 'ok' : c.status === 'spam' ? 'warn' : 'info'} admin-comment__badge`}>
                        {c.status}
                      </span>
                    </div>
                    <time className="admin-comment__time" dateTime={c.created_at}>
                      {timeAgo(c.created_at)}
                    </time>
                  </div>

                  {c.post_slug && (
                    <Link
                      to={`/project/${c.post_slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="admin-comment__post"
                    >
                      On: {c.post_title || c.post_slug}
                    </Link>
                  )}

                  <p className="admin-comment__body">{c.body}</p>

                  <div className="admin-comment__actions">
                    {c.status !== 'approved' && (
                      <button type="button" className="btn btn--xs btn--success"
                        onClick={() => setStatus(c, 'approved')} disabled={busy[c.id]}>
                        ✓ Approve
                      </button>
                    )}
                    {c.status !== 'pending' && (
                      <button type="button" className="btn btn--xs"
                        onClick={() => setStatus(c, 'pending')} disabled={busy[c.id]}>
                        ⟳ Mark Pending
                      </button>
                    )}
                    {c.status !== 'spam' && (
                      <button type="button" className="btn btn--xs"
                        onClick={() => setStatus(c, 'spam')} disabled={busy[c.id]}>
                        ⚠ Spam
                      </button>
                    )}
                    <button type="button" className="btn btn--xs btn--danger"
                      onClick={() => remove(c)} disabled={busy[c.id]}>
                      ✕ Delete
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <Pagination
            page={data.page}
            pages={data.pages}
            buildTo={(n) => {
              const next = new URLSearchParams(searchParams);
              next.set('page', String(n));
              return `/admin/comments?${next.toString()}`;
            }}
          />
        </>
      )}
    </div>
  );
}
