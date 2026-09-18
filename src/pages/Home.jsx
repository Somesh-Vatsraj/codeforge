import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, qs } from '../api/client.js';
import PostCard from '../components/PostCard.jsx';
import Sidebar from '../components/Sidebar.jsx';
import AdSlot from '../components/AdSlot.jsx';
import Seo from '../components/Seo.jsx';
import Spinner from '../components/Spinner.jsx';
import EmptyState from '../components/EmptyState.jsx';
import Pagination from '../components/Pagination.jsx';

// ─── Hero में कितने posts दिखाएँ (max 4 layout के लिए safe) ───
const HERO_COUNT = 4;
// ─── Grid में हर page पर कितने posts ───
const GRID_PER_PAGE = 10;

export default function Home() {
  const [searchParams] = useSearchParams();
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);

  const [heroPosts, setHeroPosts] = useState([]);
  const [data, setData] = useState({ posts: [], page: 1, pages: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [heroLoading, setHeroLoading] = useState(true);

  // ══════ HERO — हर refresh पर random posts ══════
  useEffect(() => {
    let cancelled = false;
    setHeroLoading(true);

    // cache-busting के लिए _t=Date.now() भेज रहे हैं ताकि CDN/browser stale response न दे
    const url = `/posts${qs({
      limit: HERO_COUNT,
      sort: 'random',
      _t: Date.now(),
    })}`;

    api.get(url)
      .then((r) => { if (!cancelled) setHeroPosts(r.posts || []); })
      .catch(() => { if (!cancelled) setHeroPosts([]); })
      .finally(() => { if (!cancelled) setHeroLoading(false); });

    return () => { cancelled = true; };
  }, []);

  // ══════ GRID — normal latest posts with pagination ══════
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.get(`/posts${qs({ page, limit: GRID_PER_PAGE })}`)
      .then((result) => { if (!cancelled) setData(result); })
      .catch(() => { if (!cancelled) setError('Could not load posts.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [page]);

  return (
    <div className="container">
      <Seo />

      {/* ═══════════ HERO — Random Posts ═══════════ */}
      {!heroLoading && heroPosts.length > 0 && (
        <section className="featured-hero">
          <div className="featured-hero__grid">
            {heroPosts.slice(0, HERO_COUNT).map((post, idx) => (
              <article
                key={post.id}
                className={
                  idx === 0
                    ? 'featured-hero__card featured-hero__card--large'
                    : 'featured-hero__card'
                }
              >
                <Link className="featured-hero__link" to={`/project/${post.slug}`}>
                  <div className="featured-hero__media">
                    {post.thumbnail_url ? (
                      <img
                        src={post.thumbnail_url}
                        alt=""
                        loading={idx === 0 ? 'eager' : 'lazy'}
                      />
                    ) : (
                      <span className="post-card__placeholder">{"</>"}</span>
                    )}
                  </div>
                  <div className="featured-hero__overlay">
                    {post.category_name && (
                      <span className="featured-hero__category">
                        {post.category_name}
                      </span>
                    )}
                    <h2 className="featured-hero__title">{post.title}</h2>
                  </div>
                </Link>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* ═══════════ MAIN GRID + SIDEBAR ═══════════ */}
      <div className="home-layout">
        <main className="home-main">
          <h2 className="section-title">Recent Posts</h2>

          {error && <p className="alert alert--error">{error}</p>}
          {loading && <Spinner label="Loading posts…" />}

          {!loading && data.posts.length === 0 && (
            <EmptyState
              title="No posts yet"
              message="Sign in to the admin panel and publish your first tutorial."
            />
          )}

          {!loading && data.posts.length > 0 && (
            <>
              <div className="post-grid">
                {data.posts.map((post) => (
                  <PostCard key={post.id} post={post} />
                ))}
              </div>

              <Pagination
                page={data.page}
                pages={data.pages}
                buildTo={(n) => (n === 1 ? '/' : `/?page=${n}`)}
              />
            </>
          )}

          <AdSlot slot="adsense_slot_home" className="ad-slot--placeholder" />
        </main>

        <Sidebar />
      </div>
    </div>
  );
}