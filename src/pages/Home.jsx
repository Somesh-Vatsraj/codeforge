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

export default function Home() {
  const [searchParams] = useSearchParams();
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);

  const [featured, setFeatured] = useState([]);
  const [data, setData] = useState({ posts: [], page: 1, pages: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    api.get(`/posts${qs({ featured: 1, limit: 4 })}`)
      .then((r) => { if (!cancelled) setFeatured(r.posts || []); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.get(`/posts${qs({ page, limit: 10 })}`)
      .then((result) => { if (!cancelled) setData(result); })
      .catch(() => { if (!cancelled) setError('Could not load posts.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [page]);

  return (
    <div className="container">
      <Seo />

      {featured.length > 0 && (
        <section className="featured-hero">
          <div className="featured-hero__grid">
            {featured.slice(0, 4).map((post, idx) => (
              <article
                key={post.id}
                className={idx === 0 ? 'featured-hero__card featured-hero__card--large' : 'featured-hero__card'}
              >
                <Link className="featured-hero__link" to={`/project/${post.slug}`}>
                  <div className="featured-hero__media">
                    {post.thumbnail_url ? (
                      <img src={post.thumbnail_url} alt="" loading={idx === 0 ? 'eager' : 'lazy'} />
                    ) : (
                      <span className="post-card__placeholder">{"</>"}</span>
                    )}
                  </div>
                  <div className="featured-hero__overlay">
                    <h2 className="featured-hero__title">{post.title}</h2>
                  </div>
                </Link>
              </article>
            ))}
          </div>
        </section>
      )}

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
                {data.posts.map((post) => <PostCard key={post.id} post={post} />)}
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
