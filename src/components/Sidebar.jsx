import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, qs } from '../api/client.js';
import { formatDate } from '../utils/format.js';
import { useSettings } from '../store.jsx';

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
      .catch(() => {
        /* keep empty states */
      });

    return () => {
      cancelled = true;
    };
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
                    <img src={post.thumbnail_url} alt="" loading="lazy" decoding="async" />
                  ) : (
                    <span
                      className="post-card__placeholder"
                      style={{ fontSize: '1.2rem' }}
                    >
                      {"</>"}
                    </span>
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
            href={settings.social_facebook || '#facebook'}
            target={settings.social_facebook ? '_blank' : undefined}
            rel="noopener noreferrer"
            aria-label="Facebook"
          >
            <span className="follow-btn__icon" aria-hidden="true">f</span>
            <span className="follow-btn__count">4,000 Fans</span>
          </a>
          <a
            className="follow-btn follow-btn--ig"
            href={settings.social_twitter || '#instagram'}
            target={settings.social_twitter ? '_blank' : undefined}
            rel="noopener noreferrer"
            aria-label="Instagram"
          >
            <span className="follow-btn__icon" aria-hidden="true">◉</span>
            <span className="follow-btn__count">30,000 Followers</span>
          </a>
          <a
            className="follow-btn follow-btn--yt"
            href={settings.social_youtube || '#youtube'}
            target={settings.social_youtube ? '_blank' : undefined}
            rel="noopener noreferrer"
            aria-label="YouTube"
          >
            <span className="follow-btn__icon" aria-hidden="true">▶</span>
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
                    <img src={post.thumbnail_url} alt="" loading="lazy" decoding="async" />
                  ) : (
                    <span
                      className="post-card__placeholder"
                      style={{ fontSize: '1.2rem' }}
                    >
                      {"</>"}
                    </span>
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
                <img src={featured.thumbnail_url} alt="" loading="lazy" decoding="async" />
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
