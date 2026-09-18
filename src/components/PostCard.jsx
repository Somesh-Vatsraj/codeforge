import { Link } from 'react-router-dom';
import { formatDate, formatNumber } from '../utils/format.js';

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
  const postUrl = `/project/${post.slug}`;

  return (
    <article className="post-card">
      <Link
        to={postUrl}
        className="post-card__media"
        aria-label={post.title}
      >
        {post.thumbnail_url ? (
          <img src={post.thumbnail_url} alt="" loading="lazy" decoding="async" />
        ) : (
          <span className="post-card__placeholder" aria-hidden="true">{"</>"}</span>
        )}
        {post.featured && <span className="badge">Featured</span>}
      </Link>

      <div className="post-card__body">
        {post.category_name && post.category_slug && (
          <Link className="post-card__category" to={`/category/${post.category_slug}`}>
            {post.category_name}
          </Link>
        )}

        <h3 className="post-card__title">
          <Link to={postUrl}>{post.title}</Link>
        </h3>

        {post.description && (
          <p className="post-card__desc">{post.description}</p>
        )}

        {tags.length > 0 && (
          <ul className="tag-list tag-list--small">
            {tags.slice(0, 3).map((tag) => (
              <li key={tag.id}>
                <Link to={`/tag/${tag.slug}`}>#{tag.name}</Link>
              </li>
            ))}
          </ul>
        )}

        <div className="post-card__meta">
          <time dateTime={post.published_at || post.created_at}>
            {formatDate(post.published_at || post.created_at)}
          </time>
          {post.views > 0 && (
            <>
              <span className="dot">•</span>
              <span>{formatNumber(post.views)} views</span>
            </>
          )}
        </div>
      </div>
    </article>
  );
}