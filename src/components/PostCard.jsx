import { Link } from 'react-router-dom';
import { formatDate } from '../utils/format.js';

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
  }
  return [];
}

export default function PostCard({ post }) {
  const tags = asArray(post.tags);

  return (
    <article className="post-card">
      <div className="post-card__media" aria-hidden="true">
        {post.thumbnail_url ? (
          <img src={post.thumbnail_url} alt="" loading="lazy" decoding="async" />
        ) : (
          <span className="post-card__placeholder">{"</>"}</span>
        )}
        {post.featured && <span className="badge">Featured</span>}
      </div>

      <div className="post-card__body">
        <h3 className="post-card__title">
          <Link to={`/project/${post.slug}`}>{post.title}</Link>
        </h3>

        {post.description && <p className="post-card__desc">{post.description}</p>}

        <div className="post-card__meta">
          <time dateTime={post.published_at || post.created_at}>
            {formatDate(post.published_at || post.created_at)}
          </time>
        </div>
      </div>
    </article>
  );
}
