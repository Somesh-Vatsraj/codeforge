import { Link } from 'react-router-dom';
import { formatDate, formatNumber } from '../utils/format.js';

export default function PostCard({ post }) {
  return (
    <article className="post-card">
      <Link className="post-card__media" to={`/project/${post.slug}`} tabIndex={-1} aria-hidden="true">
        {post.thumbnail_url ? (
          <img src={post.thumbnail_url} alt="" loading="lazy" decoding="async" />
        ) : (
          <span className="post-card__placeholder">{"</>"}</span>
        )}
        {post.featured && <span className="badge badge--featured">Featured</span>}
      </Link>

      <div className="post-card__body">
        {post.category_name && (
          <Link className="post-card__category" to={`/category/${post.category_slug}`}>
            {post.category_name}
          </Link>
        )}

        <h3 className="post-card__title">
          <Link to={`/project/${post.slug}`}>{post.title}</Link>
        </h3>

        <p className="post-card__desc">{post.description}</p>

        {post.tags?.length > 0 && (
          <ul className="tag-list tag-list--small">
            {post.tags.slice(0, 3).map((tag) => (
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
          <span className="dot" aria-hidden="true">•</span>
          <span>{formatNumber(post.views)} views</span>
        </div>

        <Link className="btn btn--ghost btn--block" to={`/project/${post.slug}`}>
          Read Tutorial
        </Link>
      </div>
    </article>
  );
}
