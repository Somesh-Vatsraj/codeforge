import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useLocation } from 'react-router-dom';
import { api, qs } from '../api/client.js';
import PostCard from '../components/PostCard.jsx';
import Pagination from '../components/Pagination.jsx';
import Spinner from '../components/Spinner.jsx';
import EmptyState from '../components/EmptyState.jsx';
import Seo from '../components/Seo.jsx';
import AdSlot from '../components/AdSlot.jsx';

/** Handles /latest, /trending, /category/:slug and /tag/:slug */
export default function Listing({ mode }) {
  const params = useParams();
  const [searchParams] = useSearchParams();
  const location = useLocation();

  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
  const [data, setData] = useState(null);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    const request = mode === 'category'
      ? api.get(`/categories/${params.slug}${qs({ page })}`)
      : mode === 'tag'
        ? api.get(`/tags/${params.slug}${qs({ page })}`)
        : api.get(`/posts${qs({
            page,
            limit: 12,
            trending: mode === 'trending' ? 1 : undefined,
            sort: mode === 'trending' ? 'views' : 'newest',
          })}`);

    request
      .then((result) => {
        if (cancelled) return;
        setData(result);
        if (mode === 'category' && result.category) setMeta({ type: 'category', ...result.category });
        if (mode === 'tag' && result.tag) setMeta({ type: 'tag', ...result.tag });
      })
      .catch((err) => {
        if (!cancelled) setError(err.status === 404 ? 'not-found' : 'Could not load posts.');
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [mode, params.slug, page]);

  const heading = mode === 'category' && meta
    ? `Category: ${meta.name}`
    : mode === 'tag' && meta
      ? `Tag: #${meta.name}`
      : mode === 'trending'
        ? 'Trending Tutorials'
        : 'Latest Tutorials';

  const description = meta?.description
    || (mode === 'trending'
      ? 'The most-viewed tutorials and projects on the site right now.'
      : 'The newest coding tutorials and free source-code projects.');

  const buildTo = (n) => {
    const base = location.pathname;
    return n === 1 ? base : `${base}?page=${n}`;
  };

  return (
    <div className="container section">
      <Seo
        title={heading}
        description={description}
        canonical={`${location.pathname}${page > 1 ? `?page=${page}` : ''}`}
      />

      <nav className="breadcrumb" aria-label="Breadcrumb">
        <a href="/">Home</a>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{heading}</span>
      </nav>

      <header className="page-head">
        <h1>{heading}</h1>
        <p className="muted">{description}</p>
        {data && <p className="muted small">{data.total} {data.total === 1 ? 'post' : 'posts'}</p>}
      </header>

      <AdSlot slot="adsense_slot_home" className="ad-slot--leaderboard" />

      {loading && <Spinner label="Loading…" />}
      {error === 'not-found' && (
        <EmptyState title="Nothing found" message="This category or tag does not exist." actionLabel="Back home" actionTo="/" />
      )}
      {error && error !== 'not-found' && <p className="alert alert--error">{error}</p>}

      {!loading && data && data.posts.length === 0 && (
        <EmptyState title="No posts here yet" message="Check back soon — new tutorials are added regularly." />
      )}

      {!loading && data && data.posts.length > 0 && (
        <>
          <div className="post-grid">
            {data.posts.map((post) => <PostCard key={post.id} post={post} />)}
          </div>
          <Pagination page={data.page} pages={data.pages} buildTo={buildTo} />
        </>
      )}
    </div>
  );
}
