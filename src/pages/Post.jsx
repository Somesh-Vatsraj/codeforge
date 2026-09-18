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

export default function Post() {
  const { slug } = useParams();
  const [post, setPost] = useState(null);
  const [related, setRelated] = useState([]);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const [showPreview, setShowPreview] = useState(false);

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

  const previewDoc = useMemo(
    () => (post?.live_preview ? buildPreviewDocument(post.demo_files) : null),
    [post],
  );

  const downloadProject = () => {
    if (!post) return;
    const blob = buildProjectZip(post);
    downloadBlob(blob, `${slugify(post.slug || post.title) || 'project'}.zip`);
  };

  if (status === 'loading') {
    return <div className="container" style={{ padding: '60px 0' }}><Spinner label="Loading tutorial…" /></div>;
  }

  if (status === 'error') {
    return (
      <div className="container" style={{ padding: '60px 0' }}>
        {error === 'not-found' ? (
          <EmptyState title="Tutorial not found" message="The link may be broken, or the post is still a draft." actionLabel="Back to homepage" actionTo="/" />
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
  };

  return (
    <article>
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
          <main>
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

            <div className="post-actions" style={{ display: 'flex', flexWrap: 'wrap', gap: '.5rem', marginBottom: '1.5rem' }}>
              {post.live_preview && previewDoc && (
                <button
                  type="button"
                  className="btn btn--primary"
                  onClick={() => {
                    setShowPreview(true);
                    document.getElementById('live-preview')?.scrollIntoView({ behavior: 'smooth' });
                  }}
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

            <div
              className="article-content"
              dangerouslySetInnerHTML={{ __html: post.article_content || '' }}
            />

            {images.length > 0 && (
              <section style={{ margin: '2rem 0' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' }}>
                  {images.map((img) => (
                    <figure key={img.id} style={{ margin: 0 }}>
                      <img src={img.image_url} alt={img.alt_text || ''} loading="lazy" style={{ borderRadius: '6px' }} />
                      {img.caption && <figcaption style={{ fontSize: '.82rem', color: 'var(--text-muted)', marginTop: '.4rem' }}>{img.caption}</figcaption>}
                    </figure>
                  ))}
                </div>
              </section>
            )}

            {features.length > 0 && (
              <section style={{ margin: '2rem 0' }}>
                <h2>Features</h2>
                <ul>
                  {features.map((feature, i) => <li key={i}>{feature}</li>)}
                </ul>
              </section>
            )}

            {technologies.length > 0 && (
              <section style={{ margin: '2rem 0' }}>
                <h2>Technologies Used</h2>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.5rem' }}>
                  {technologies.map((tech) => (
                    <span key={tech} className="chip chip--tech">{tech}</span>
                  ))}
                </div>
              </section>
            )}

            {embedUrl && (
              <section style={{ margin: '2rem 0' }}>
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
              <section id="live-preview" style={{ margin: '2rem 0' }}>
                <h2>Live Preview</h2>
                {showPreview ? (
                  <>
                    <p className="muted small">Sandboxed preview — no access to cookies or admin data.</p>
                    <div className="preview-frame">
                      <iframe
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
              <section style={{ margin: '2rem 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
                  <h2 style={{ margin: 0 }}>Source Code</h2>
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

            <nav className="post-nav" aria-label="Post navigation">
              <Link to="/latest" className="post-nav__item">
                <span className="post-nav__label">Previous article</span>
                <span className="post-nav__title">Back to all tutorials</span>
              </Link>
              <Link to="/trending" className="post-nav__item post-nav__item--next">
                <span className="post-nav__label">Next article</span>
                <span className="post-nav__title">See trending tutorials</span>
              </Link>
            </nav>

            {related.length > 0 && (
              <section className="related-section">
                <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem', borderBottom: '1px solid var(--border)', paddingBottom: '.6rem' }}>
                  <span className="post-tags__label">Related Articles</span>
                  <span style={{ fontSize: '.78rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-light)' }}>
                    More from author
                  </span>
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

            <section className="comment-section">
              <h3 style={{ marginBottom: '1rem', textTransform: 'uppercase', fontSize: '.9rem', letterSpacing: '.04em' }}>
                Leave a Reply
              </h3>
              <form className="comment-form" onSubmit={(e) => e.preventDefault()}>
                <div>
                  <label htmlFor="comment">Comment:</label>
                  <textarea id="comment" placeholder="" />
                </div>
                <div>
                  <label htmlFor="name">Name:*</label>
                  <input id="name" type="text" required />
                </div>
                <div>
                  <label htmlFor="email">Email:*</label>
                  <input id="email" type="email" required />
                </div>
                <label className="comment-form__check">
                  <input type="checkbox" />
                  Save my name, email, and website in this browser for the next time I comment.
                </label>
                <div>
                  <button type="submit" className="btn btn--primary">Post Comment</button>
                </div>
              </form>
            </section>

            <AdSlot slot="adsense_slot_post_bottom" />
          </main>

          <Sidebar showFeatured={false} />
        </div>
      </div>
    </article>
  );
}
