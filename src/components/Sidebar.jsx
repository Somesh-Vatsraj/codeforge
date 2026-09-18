import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, qs } from '../api/client.js';
import { formatDate } from '../utils/format.js';
import { useSettings } from '../store.jsx';

/* ────────────────────────────────────────────────────────────
   Inline SVG icons — proper brand icons, no external deps
   ──────────────────────────────────────────────────────────── */
function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true">
      <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5.02 3.66 9.18 8.44 9.94v-7.03H7.9v-2.91h2.54V9.85c0-2.51 1.49-3.9 3.77-3.9 1.09 0 2.24.2 2.24.2v2.47h-1.26c-1.24 0-1.63.78-1.63 1.57v1.88h2.78l-.44 2.91h-2.34V22c4.78-.76 8.44-4.92 8.44-9.94Z" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}

function YouTubeIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true">
      <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2 31.4 31.4 0 0 0 0 12a31.4 31.4 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31.4 31.4 0 0 0 24 12a31.4 31.4 0 0 0-.5-5.8ZM9.6 15.6V8.4L15.8 12l-6.2 3.6Z" />
    </svg>
  );
}

/* ────────────────────────────────────────────────────────────
   Sidebar
   ──────────────────────────────────────────────────────────── */
export default function Sidebar({ showFeatured = true }) {
  const { settings } = useSettings();

  const [recent, setRecent] = useState([]);
  const [featured, setFeatured] = useState(null);
  const [categories, setCategories] = useState([]);
  const [popular, setPopular] = useState([]);

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      api.get(`/posts${qs({ limit: 5 })}`),
      api.get(`/posts${qs({ featured: 1, limit: 1 })}`),
      api.get('/categories'),
      api.get(`/posts${qs({ limit: 5, sort: 'views' })}`),
    ])
      .then(([recentData, featuredData, catData, popularData]) => {
        if (cancelled) return;
        setRecent(recentData.posts || []);
        setFeatured((featuredData.posts || [])[0] || null);
        setCategories(catData.categories || []);
        setPopular(popularData.posts || []);
      })
      .catch(() => {});

    return () => { cancelled = true; };
  }, []);

  return (
    <aside className="sidebar">
      {recent.length > 0 && (
        <div className="widget">
          <h3 className="widget__title">Recent Posts</h3>
          <ul className="recent-list">
            {recent.slice(0, 4).map((post) => (
              <li key={post.id} className="recent-item">
                <Link
                  to={`/project/${post.slug}`}
                  className="recent-item__thumb"
                  tabIndex={-1}
                  aria-hidden="true"
                >
                  {post.thumbnail_url ? (
                    <img src={post.thumbnail_url} alt="" loading="lazy" />
                  ) : (
                    <span className="post-card__placeholder" style={{ fontSize: '1.2rem' }}>{"</>"}</span>
                  )}
                </Link>
                <div className="recent-item__body">
                  <Link to={`/project/${post.slug}`} className="recent-item__title">
                    {post.title}
                  </Link>
                  <span className="recent-item__date">
                    {formatDate(post.published_at || post.created_at)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="widget">
        <h3 className="widget__title">Follow Us</h3>
        <div className="follow-grid">
          <a
            className="follow-btn follow-btn--fb"
            href={settings.social_facebook || 'https://www.facebook.com'}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Follow on Facebook"
          >
            <span className="follow-btn__icon"><FacebookIcon /></span>
            <span className="follow-btn__count">4,000 Fans</span>
          </a>

          <a
            className="follow-btn follow-btn--ig"
            href={settings.social_instagram || 'https://www.instagram.com'}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Follow on Instagram"
          >
            <span className="follow-btn__icon"><InstagramIcon /></span>
            <span className="follow-btn__count">30,000 Followers</span>
          </a>

          <a
            className="follow-btn follow-btn--yt"
            href={settings.social_youtube || 'https://www.youtube.com'}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Subscribe on YouTube"
          >
            <span className="follow-btn__icon"><YouTubeIcon /></span>
            <span className="follow-btn__count">200,000 Subs</span>
          </a>
        </div>
      </div>

      {popular.length > 0 && (
        <div className="widget">
          <h3 className="widget__title">Most Popular</h3>
          <ul className="recent-list">
            {popular.slice(0, 4).map((post) => (
              <li key={post.id} className="recent-item">
                <Link
                  to={`/project/${post.slug}`}
                  className="recent-item__thumb"
                  tabIndex={-1}
                  aria-hidden="true"
                >
                  {post.thumbnail_url ? (
                    <img src={post.thumbnail_url} alt="" loading="lazy" />
                  ) : (
                    <span className="post-card__placeholder" style={{ fontSize: '1.2rem' }}>{"</>"}</span>
                  )}
                </Link>
                <div className="recent-item__body">
                  <Link to={`/project/${post.slug}`} className="recent-item__title">
                    {post.title}
                  </Link>
                  <span className="recent-item__date">
                    {formatDate(post.published_at || post.created_at)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {showFeatured && featured && (
        <div className="widget">
          <h3 className="widget__title">Featured Post</h3>
          <div className="featured-widget">
            <Link to={`/project/${featured.slug}`} tabIndex={-1} aria-hidden="true">
              {featured.thumbnail_url ? (
                <img src={featured.thumbnail_url} alt="" loading="lazy" />
              ) : (
                <div
                  style={{
                    aspectRatio: '16/10',
                    display: 'grid',
                    placeItems: 'center',
                    background: 'var(--brand-soft)',
                    color: 'var(--brand)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '2rem',
                  }}
                >
                  {"</>"}
                </div>
              )}
            </Link>
            <div className="featured-widget__body">
              <Link to={`/project/${featured.slug}`} className="featured-widget__title">
                {featured.title}
              </Link>
              <span className="recent-item__date">
                {formatDate(featured.published_at)}
              </span>
            </div>
          </div>
        </div>
      )}

      {categories.length > 0 && (
        <div className="widget">
          <h3 className="widget__title">Categories</h3>
          <ul className="cat-list">
            {categories.map((c) => (
              <li key={c.id}>
                <Link to={`/category/${c.slug}`}>
                  <span>{c.name}</span>
                  <span className="cat-list__count">{c.post_count}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </aside>
  );
}
