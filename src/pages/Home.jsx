import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, qs } from '../api/client.js';
import PostCard from '../components/PostCard.jsx';
import AdSlot from '../components/AdSlot.jsx';
import Seo from '../components/Seo.jsx';
import Spinner from '../components/Spinner.jsx';
import EmptyState from '../components/EmptyState.jsx';
import Pagination from '../components/Pagination.jsx';
import { useSettings } from '../store.jsx';

export default function Home() {
  const { settings } = useSettings();
  const [featured, setFeatured] = useState([]);
  const [trending, setTrending] = useState([]);
  const [categories, setCategories] = useState([]);
  const [latest, setLatest] = useState({ posts: [], page: 1, pages: 0, total: 0 });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      api.get(`/posts${qs({ featured: 1, limit: 3 })}`),
      api.get(`/posts${qs({ trending: 1, limit: 4, sort: 'views' })}`),
      api.get('/categories'),
    ]).then(([featuredData, trendingData, catData]) => {
      if (cancelled) return;
      setFeatured(featuredData.posts);
      setTrending(trendingData.posts);
      setCategories(catData.categories);
    }).catch(() => {
      if (!cancelled) setError('Could not load homepage content.');
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.get(`/posts${qs({ page, limit: 9 })}`)
      .then((data) => { if (!cancelled) setLatest(data); })
      .catch(() => { if (!cancelled) setError('Could not load posts.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [page]);

  return (
    <>
      <Seo />

      <section className="hero">
        <div className="container hero__inner">
          <p className="hero__eyebrow">Tutorials · Projects · Source Code</p>
          <h1 className="hero__title">
            Learn web development by <span className="gradient-text">building real projects</span>
          </h1>
          <p className="hero__lead">{settings.site_description}</p>
          <div className="hero__actions">
            <Link className="btn btn--primary btn--lg" to="/latest">Browse Tutorials</Link>
            <Link className="btn btn--ghost btn--lg" to="/trending">See Trending</Link>
          </div>
        </div>
      </section>

      <div className="container">
        <AdSlot slot="adsense_slot_home" label="Advertisement" className="ad-slot--leaderboard" />
      </div>

      {categories.length > 0 && (
        <section className="container section">
          <div className="section__head">
            <h2>Browse by category</h2>
          </div>
          <ul className="category-chips">
            {categories.map((c) => (
              <li key={c.id}>
                <Link to={`/category/${c.slug}`} className="chip">
                  {c.name} <span className="chip__count">{c.post_count}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {featured.length > 0 && (
        <section className="container section">
          <div className="section__head">
            <h2>Featured projects</h2>
            <Link to="/latest" className="section__link">View all →</Link>
          </div>
          <div className="post-grid post-grid--featured">
            {featured.map((post) => <PostCard key={post.id} post={post} />)}
          </div>
        </section>
      )}

      <section className="container section">
        <div className="section__head">
          <h2>Latest tutorials</h2>
        </div>

        {error && <p className="alert alert--error">{error}</p>}
        {loading && <Spinner label="Loading tutorials…" />}
        {!loading && latest.posts.length === 0 && (
          <EmptyState
            title="No published posts yet"
            message="Sign in to the admin panel and publish your first tutorial."
          />
        )}

        {!loading && latest.posts.length > 0 && (
          <>
            <div className="post-grid">
              {latest.posts.map((post) => <PostCard key={post.id} post={post} />)}
            </div>
            <Pagination
              page={latest.page}
              pages={latest.pages}
              buildTo={(n) => (n === 1 ? '/' : `/?page=${n}`)}
            />
            {latest.page > 1 && (
              <div className="load-more">
                <button type="button" className="btn btn--ghost" onClick={() => setPage((p) => Math.max(1, p - 1))}>
                  ← Previous page
                </button>
              </div>
            )}
          </>
        )}
      </section>

      {trending.length > 0 && (
        <section className="container section">
          <div className="section__head">
            <h2>Trending now</h2>
            <Link to="/trending" className="section__link">See all →</Link>
          </div>
          <ol className="trending-list">
            {trending.map((post, index) => (
              <li key={post.id} className="trending-list__item">
                <span className="trending-list__rank">{String(index + 1).padStart(2, '0')}</span>
                <div>
                  <Link to={`/project/${post.slug}`} className="trending-list__title">{post.title}</Link>
                  <p className="muted small">{post.category_name} · {post.views} views</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}
    </>
  );
}
