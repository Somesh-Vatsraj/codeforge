import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams, useLocation } from 'react-router-dom';
import { api, qs } from '../api/client.js';
import PostCard from '../components/PostCard.jsx';
import Sidebar from '../components/Sidebar.jsx';
import Pagination from '../components/Pagination.jsx';
import Spinner from '../components/Spinner.jsx';
import EmptyState from '../components/EmptyState.jsx';
import Seo from '../components/Seo.jsx';
import AdSlot from '../components/AdSlot.jsx';

export default function Listing({ mode = 'latest' }) {
  const params = useParams();
  const [searchParams] = useSearchParams();
  const location = useLocation();

  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);

  const [data, setData] = useState(null);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [mode, params.slug, page]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    setMeta(null);

    let request;
    if (mode === 'category' && params.slug) {
      request = api.get(`/categories/${encodeURIComponent(params.slug)}${qs({ page })}`);
    } else if (mode === 'tag' && params.slug) {
      request = api.get(`/tags/${encodeURIComponent(params.slug)}${qs({ page })}`);
    } else {
      request = api.get(`/posts${qs({
        page,
        limit: 12,
        trending: mode === 'trending' ? 1 : undefined,
        sort: mode === 'trending' ? 'views' : undefined,
      })}`);
    }

    request
      .then((result) => {
        if (cancelled) return;
        setData(result);
        if (mode === 'category' && result.category) {
          setMeta({ type: 'category', ...result.category });
        }
        if (mode === 'tag' && result.tag) {
          setMeta({ type: 'tag', ...result.tag });
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.status === 404 ? 'not-found' : err.message || 'Could not load posts.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [mode, params.slug, page]);

  const heading =
    mode === 'category' && meta
      ? `Category: ${meta.name}`
      : mode === 'tag' && meta
      ? `Tag: #${meta.name}`
      : mode === 'trending'
      ? 'Trending Tutorials'
      : 'Blog';

  const description =
    meta?.description ||
    (mode === 'trending'
      ? 'The most-viewed tutorials and projects on the site right now.'
      : 'All published tutorials and free source-code projects.');

  const buildTo = (n) => {
    const base = location.pathname;
    return n === 1 ? base : `${base}?page=${n}`;
  };

  return (
    <div className="container">
      <Seo
        title={heading}
        description={description}
        canonical={`${location.pathname}${page > 1 ? `?page=${page}` : ''}`}
      />

      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link to="/">Home</Link>
        <span>›</span>
        <span aria-current="page">{heading}</span>
      </nav>

      <div className="page-head">
        <h1>{heading}</h1>
        <p className="muted">{description}</p>
        {data && (
          <p className="muted small">
            {data.total} {data.total === 1 ? 'post' : 'posts'}
            {data.pages > 1 ? ` · Page ${data.page} of ${data.pages}` : ''}
          </p>
        )}
      </div>

      <div className="home-layout">
        <main className="home-main">
          <AdSlot slot="adsense_slot_home" className="ad-slot--placeholder" />

          {loading && <Spinner label="Loading posts…" />}

          {!loading && error === 'not-found' && (
            <EmptyState
              title="Nothing found"
              message="This category or tag does not exist."
              actionLabel="Back to Blog"
              actionTo="/blog"
            />
          )}

          {!loading && error && error !== 'not-found' && (
            <p className="alert alert--error">{error}</p>
          )}

          {!loading && data && data.posts.length === 0 && (
            <EmptyState
              title="No posts yet"
              message={
                mode === 'category'
                  ? 'No published posts in this category yet.'
                  : mode === 'tag'
                  ? 'No published posts with this tag yet.'
                  : 'No published posts yet. Check back soon!'
              }
              actionLabel="Back to homepage"
              actionTo="/"
            />
          )}

          {!loading && data && data.posts.length > 0 && (
            <>
              <div className="post-grid">
                {data.posts.map((post) => (
                  <PostCard key={post.id} post={post} />
                ))}
              </div>

              <Pagination
                page={data.page}
                pages={data.pages}
                buildTo={buildTo}
              />
            </>
          )}
        </main>

        <Sidebar showFeatured={mode !== 'category' && mode !== 'tag'} />
      </div>
    </div>
  );
}