import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/client.js';
import { getEmbedUrl, getWatchUrl } from '../utils/youtube.js';
import { buildPreviewDocument } from '../utils/preview.js';
import { buildProjectZip, downloadBlob } from '../utils/zip.js';
import { formatDate, readingTime, slugify } from '../utils/format.js';
import CodeBlock from '../components/CodeBlock.jsx';
import Sidebar from '../components/Sidebar.jsx';
import AdSlot from '../components/AdSlot.jsx';
import Seo from '../components/Seo.jsx';
import Spinner from '../components/Spinner.jsx';
import EmptyState from '../components/EmptyState.jsx';

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

function timeAgo(dateString) {
  if (!dateString) return '';
  const iso = dateString.includes('T') ? dateString : dateString.replace(' ', 'T') + 'Z';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const diff = Math.max(0, Date.now() - then);
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min} min ago`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days} day${days > 1 ? 's' : ''} ago`;
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function Post() {
  const { slug } = useParams();
  const [post, setPost] = useState(null);
  const [related, setRelated] = useState([]);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [previewMode, setPreviewMode] = useState('desktop');

  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentForm, setCommentForm] = useState({ name: '', email: '', comment: '', website: '' });
  const [commentState, setCommentState] = useState({ submitting: false, error: '', success: '' });

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    setShowPreview(false);
    window.scrollTo(0, 0);

    api.get(`/posts/${encodeURIComponent(slug)}`)
      .then((data) => {
        if (cancelled) return;
        setPost(data.post);
        setStatus('ready');
        return api.get(`/related/${data.post.id}`);
      })
      .then((rel) => { if (!cancelled && rel) setRelated(rel.posts || []); })
      .catch((err) => {
        if (cancelled) return;
        setError(err.status === 404 ? 'not-found' : 'Could not load this tutorial.');
        setStatus('error');
      });

    return () => { cancelled = true; };
  }, [slug]);

  useEffect(() => {
    if (!post) return;
    let cancelled = false;
    setCommentsLoading(true);
    api.get(`/posts/${encodeURIComponent(post.slug)}/comments`)
      .then((d) => { if (!cancelled) setComments(d.comments || []); })
      .catch(() => { if (!cancelled) setComments([]); })
      .finally(() => { if (!cancelled) setCommentsLoading(false); });
    return () => { cancelled = true; };
  }, [post]);

  const previewDoc = useMemo(
    () => (post?.live_preview ? buildPreviewDocument(post.demo_files, previewMode) : null),
    [post, previewMode],
  );

  const downloadProject = () => {
    if (!post) return;
    const blob = buildProjectZip(post);
    downloadBlob(blob, `${slugify(post.slug || post.title) || 'project'}.zip`);
  };

  const jumpToPreview = () => {
    setShowPreview(true);
    setTimeout(() => {
      document.getElementById('live-preview')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
  };

  const submitComment = async (event) => {
    event.preventDefault();
    if (!post) return;

    setCommentState({ submitting: true, error: '', success: '' });

    try {
      const res = await api.post(
        `/posts/${encodeURIComponent(post.slug)}/comments`,
        {
          name: commentForm.name.trim(),
          email: commentForm.email.trim(),
          comment: commentForm.comment.trim(),
          website: commentForm.website,
        },
      );

      if (res.status === 'approved' && res.comment) {
        setComments((prev) => [res.comment, ...prev]);
        setCommentState({ submitting: false, error: '', success: res.message || 'Your comment has been posted!' });
      } else {
        setCommentState({ submitting: false, error: '', success: res.message || 'Your comment is awaiting moderation.' });
      }

      setCommentForm({ name: '', email: '', comment: '', website: '' });
      setTimeout(() => setCommentState((s) => ({ ...s, success: '' })), 6000);
    } catch (err) {
      setCommentState({
        submitting: false,
        error: err.message || 'Could not post your comment. Please try again.',
        success: '',
      });
    }
  };

  if (status === 'loading') {
    return <div className="container" style={{ padding: '60px 0' }}><Spinner label="Loading tutorial…" /></div>;
  }

  if (status === 'error') {
    return (
      <div className="container" style={{ padding: '60px 0' }}>
        {error === 'not-found' ? (
          <EmptyState
            title="Tutorial not found"
            message="The link may be broken, or the post is still a draft."
            actionLabel="Back to Blog"
            actionTo="/blog"
          />
        ) : (
          <p className="alert alert--error">{error}</p>
        )}
      </div>
    );
  }

  const embedUrl = getEmbedUrl(post.youtube_url);
  const watchUrl = getWatchUrl(post.youtube_url);
  const canonical = post.canonical_url || `/project/${post.slug}`;
  const minutes = readingTime(post.article_content);

  const features = asArray(post.features);
  const technologies = asArray(post.technologies);
  const tags = asArray(post.tags);
  const images = asArray(post.images);
  const files = asArray(post.files);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.seo_title || post.title,
    description: post.seo_description || post.description,
    image: post.thumbnail_url ? [post.thumbnail_url] : undefined,
    datePublished: post.published_at,
    dateModified: post.updated_at,
    author: { '@type': 'Organization', name: post.author || 'Editorial Team' },
    mainEntityOfPage: { '@type': 'WebPage', '@id': window.location.origin + canonical },
    articleSection: post.category_name,
    keywords: tags.map((t) => t.name).join(', '),
    commentCount: comments.length,
  };

  return (
    <article className="post-page">
      <Seo
        title={post.seo_title || post.title}
        description={post.seo_description || post.description}
        image={post.thumbnail_url}
        canonical={canonical}
        keywords={post.seo_keywords}
        type="article"
        jsonLd={jsonLd}
      />

      <div className="container">
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <Link to="/">Home</Link>
          <span>›</span>
          {post.category_slug && (
            <>
              <Link to={`/category/${post.category_slug}`}>{post.category_name}</Link>
              <span>›</span>
            </>
          )}
          <span>{post.title}</span>
        </nav>

        <div className="home-layout">
          <main className="home-main">
            <div className="post-shell">

              <header className="post-header">
                <h1>{post.title}</h1>
                <div className="post-header__meta">
                  <time dateTime={post.published_at}>{formatDate(post.published_at)}</time>
                  <span className="dot">•</span>
                  <span>{minutes} min read</span>
                  {post.category_name && (
                    <>
                      <span className="dot">•</span>
                      <Link to={`/category/${post.category_slug}`}>{post.category_name}</Link>
                    </>
                  )}
                </div>
              </header>

              {post.thumbnail_url && (
                <figure className="post-thumb">
                  <img src={post.thumbnail_url} alt={post.title} loading="eager" decoding="async" />
                </figure>
              )}

              <div
                className="article-content"
                dangerouslySetInnerHTML={{ __html: post.article_content || '' }}
              />

              {images.length > 0 && (
                <section className="project-section">
                  <h2>Project Images</h2>
                  <div className="article-gallery__grid">
                    {images.map((img) => (
                      <figure key={img.id}>
                        <img src={img.image_url} alt={img.alt_text || ''} loading="lazy" />
                        {img.caption && <figcaption>{img.caption}</figcaption>}
                      </figure>
                    ))}
                  </div>
                </section>
              )}

              {features.length > 0 && (
                <section className="project-section">
                  <h2>Project Features</h2>
                  <ul className="feature-list">
                    {features.map((feature, i) => <li key={i}>{feature}</li>)}
                  </ul>
                </section>
              )}

              {technologies.length > 0 && (
                <section className="project-section">
                  <h2>Technologies Used</h2>
                  <ul className="tech-list">
                    {technologies.map((tech) => (
                      <li key={tech} className="chip chip--tech">{tech}</li>
                    ))}
                  </ul>
                </section>
              )}

              {embedUrl && (
                <section className="project-section">
                  <h2>Video Tutorial</h2>
                  <div className="video-frame">
                    <iframe
                      src={embedUrl}
                      title={`${post.title} video tutorial`}
                      loading="lazy"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                </section>
              )}

              {post.live_preview && previewDoc && (
                <section className="project-section" id="live-preview">
                  <div className="section-head-row">
                    <h2>Live Preview</h2>
                    <div className="preview-mode-toggle" role="group" aria-label="Preview viewport">
                      <button
                        type="button"
                        className={previewMode === 'desktop' ? 'is-active' : ''}
                        onClick={() => {
                          setPreviewMode('desktop');
                          setShowPreview(true);
                        }}
                      >
                        💻 Desktop
                      </button>
                      <button
                        type="button"
                        className={previewMode === 'mobile' ? 'is-active' : ''}
                        onClick={() => {
                          setPreviewMode('mobile');
                          setShowPreview(true);
                        }}
                      >
                        📱 Mobile
                      </button>
                    </div>
                  </div>

                  {showPreview ? (
                    <>
                      <p className="muted small">
                        Sandboxed preview — no access to real cookies or admin data.
                        {previewMode === 'desktop'
                          ? ' Rendered at 1024px. Swipe horizontally inside the frame to scroll.'
                          : ' Rendered at device width.'}
                      </p>
                      <div className={`preview-frame preview-frame--${previewMode}`}>
                        <iframe
                          key={previewMode}
                          title={`${post.title} live preview`}
                          srcDoc={previewDoc}
                          sandbox="allow-scripts allow-modals allow-popups"
                          loading="lazy"
                        />
                      </div>
                    </>
                  ) : (
                    <button type="button" className="btn btn--primary" onClick={() => setShowPreview(true)}>
                      Show Preview
                    </button>
                  )}
                </section>
              )}

              {files.length > 0 && (
                <section className="project-section" id="source-code">
                  <div className="section-head-row">
                    <h2>Source Code</h2>
                    <button type="button" className="btn btn--primary btn--sm" onClick={downloadProject}>
                      Download All Files
                    </button>
                  </div>
                  <div className="code-stack">
                    {files.map((file) => (
                      <CodeBlock
                        key={file.id}
                        fileName={file.file_name}
                        filePath={file.file_path}
                        language={file.language}
                        code={file.code_content}
                      />
                    ))}
                  </div>
                </section>
              )}

              {tags.length > 0 && (
                <div className="post-tags">
                  <span className="post-tags__label">Tags</span>
                  {tags.map((tag) => (
                    <Link key={tag.id} to={`/tag/${tag.slug}`}>#{tag.name}</Link>
                  ))}
                </div>
              )}

              {/* =============================================
                  POST ACTIONS — moved to the end of the post
                  (Live Preview / Download / Watch on YouTube)
                  ============================================= */}
              <div className="post-actions post-actions--bottom">
                {post.live_preview && previewDoc && (
                  <button
                    type="button"
                    className="btn btn--primary"
                    onClick={jumpToPreview}
                  >
                    ▶ Live Preview
                  </button>
                )}
                <button type="button" className="btn btn--ghost" onClick={downloadProject}>
                  ⬇ Download Project
                </button>
                {watchUrl && (
                  <a className="btn btn--ghost" href={watchUrl} target="_blank" rel="noopener noreferrer">
                    Watch on YouTube
                  </a>
                )}
              </div>

              {related.length > 0 && (
                <section className="related-section">
                  <div className="related-head">
                    <span className="post-tags__label">Related Articles</span>
                    <span className="related-head__sub">More from author</span>
                  </div>
                  <div className="related-grid">
                    {related.slice(0, 3).map((item) => (
                      <article key={item.id}>
                        <Link to={`/project/${item.slug}`} className="related-card__thumb" tabIndex={-1}>
                          {item.thumbnail_url ? (
                            <img src={item.thumbnail_url} alt="" loading="lazy" />
                          ) : (
                            <span className="post-card__placeholder">{"</>"}</span>
                          )}
                        </Link>
                        <Link to={`/project/${item.slug}`} className="related-card__title">
                          {item.title}
                        </Link>
                      </article>
                    ))}
                  </div>
                </section>
              )}

              <nav className="post-nav" aria-label="Post navigation">
                <Link to="/blog" className="post-nav__item">
                  <span className="post-nav__label">Back to</span>
                  <span className="post-nav__title">All blog posts</span>
                </Link>
                <Link to="/trending" className="post-nav__item post-nav__item--next">
                  <span className="post-nav__label">Next up</span>
                  <span className="post-nav__title">See trending tutorials</span>
                </Link>
              </nav>

              <section className="comment-section">
                {comments.length > 0 && (
                  <>
                    <h3 className="comment-section__title">
                      {comments.length} {comments.length === 1 ? 'Comment' : 'Comments'}
                    </h3>
                    {commentsLoading && <Spinner label="Loading comments…" compact />}
                    <ol className="comment-list">
                      {comments.map((c) => (
                        <li key={c.id} className="comment-item">
                          <div className="comment-item__avatar" aria-hidden="true">
                            {(c.author_name || '?').trim().charAt(0).toUpperCase()}
                          </div>
                          <div className="comment-item__body">
                            <div className="comment-item__head">
                              <strong className="comment-item__name">{c.author_name}</strong>
                              <time className="comment-item__time" dateTime={c.created_at}>
                                {timeAgo(c.created_at)}
                              </time>
                            </div>
                            <p className="comment-item__text">{c.body}</p>
                          </div>
                        </li>
                      ))}
                    </ol>
                  </>
                )}

                <h3 className="comment-section__title comment-section__title--form">
                  Leave a Reply
                </h3>

                {commentState.error && (
                  <p className="alert alert--error" role="alert">{commentState.error}</p>
                )}
                {commentState.success && (
                  <p className="alert alert--success" role="status">{commentState.success}</p>
                )}

                <form className="comment-form" onSubmit={submitComment}>
                  <div>
                    <label htmlFor="comment-body">Comment:</label>
                    <textarea
                      id="comment-body"
                      value={commentForm.comment}
                      onChange={(e) => setCommentForm({ ...commentForm, comment: e.target.value })}
                      required
                      minLength={5}
                      maxLength={2000}
                      disabled={commentState.submitting}
                    />
                  </div>
                  <div>
                    <label htmlFor="comment-name">Name:*</label>
                    <input
                      id="comment-name"
                      type="text"
                      value={commentForm.name}
                      onChange={(e) => setCommentForm({ ...commentForm, name: e.target.value })}
                      required
                      minLength={2}
                      maxLength={60}
                      autoComplete="name"
                      disabled={commentState.submitting}
                    />
                  </div>
                  <div>
                    <label htmlFor="comment-email">Email:*</label>
                    <input
                      id="comment-email"
                      type="email"
                      value={commentForm.email}
                      onChange={(e) => setCommentForm({ ...commentForm, email: e.target.value })}
                      required
                      autoComplete="email"
                      disabled={commentState.submitting}
                    />
                  </div>

                  <div className="comment-form__honeypot" aria-hidden="true">
                    <label htmlFor="comment-website">Website</label>
                    <input
                      id="comment-website"
                      type="text"
                      tabIndex={-1}
                      autoComplete="off"
                      value={commentForm.website}
                      onChange={(e) => setCommentForm({ ...commentForm, website: e.target.value })}
                    />
                  </div>

                  <label className="comment-form__check">
                    <input type="checkbox" />
                    Save my name, email, and website in this browser for the next time I comment.
                  </label>

                  <div>
                    <button
                      type="submit"
                      className="btn btn--primary"
                      disabled={commentState.submitting}
                    >
                      {commentState.submitting ? 'Posting…' : 'Post Comment'}
                    </button>
                  </div>
                </form>
              </section>

              <AdSlot slot="adsense_slot_post_bottom" />

            </div>
          </main>

          <Sidebar showFeatured={false} />
        </div>
      </div>
    </article>
  );
}
