import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/client.js';
import { getEmbedUrl, getWatchUrl } from '../utils/youtube.js';
import { buildPreviewDocument } from '../utils/preview.js';
import { buildProjectZip, downloadBlob } from '../utils/zip.js';
import { formatDate, formatNumber, readingTime, slugify } from '../utils/format.js';
import CodeBlock from '../components/CodeBlock.jsx';
import PostCard from '../components/PostCard.jsx';
import AdSlot from '../components/AdSlot.jsx';
import Seo from '../components/Seo.jsx';
import Spinner from '../components/Spinner.jsx';
import EmptyState from '../components/EmptyState.jsx';

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
    return <div className="container section"><Spinner label="Loading tutorial…" /></div>;
  }

  if (status === 'error') {
    return (
      <div className="container section">
        {error === 'not-found' ? (
          <EmptyState
            title="Tutorial not found"
            message="The link may be broken, or the post is still a draft."
            actionLabel="Back to homepage"
            actionTo="/"
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
    keywords: post.tags?.map((t) => t.name).join(', '),
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
          <span aria-hidden="true">/</span>
          {post.category_slug && (
            <>
              <Link to={`/category/${post.category_slug}`}>{post.category_name}</Link>
              <span aria-hidden="true">/</span>
            </>
          )}
          <span aria-current="page">{post.title}</span>
        </nav>

        <header className="post-header">
          {post.category_slug && (
            <Link className="post-header__category" to={`/category/${post.category_slug}`}>
              {post.category_name}
            </Link>
          )}
          <h1>{post.title}</h1>
          <p className="post-header__desc">{post.description}</p>

          <div className="post-header__meta">
            <span>{post.author || 'Editorial Team'}</span>
            <span className="dot" aria-hidden="true">•</span>
            <time dateTime={post.published_at}>{formatDate(post.published_at)}</time>
            <span className="dot" aria-hidden="true">•</span>
            <span>{minutes} min read</span>
            <span className="dot" aria-hidden="true">•</span>
            <span>{formatNumber(post.views)} views</span>
          </div>
        </header>

        {post.thumbnail_url && (
          <figure className="post-thumb">
            <img src={post.thumbnail_url} alt={post.title} loading="eager" decoding="async" />
          </figure>
        )}

        <div className="post-actions">
          {post.live_preview && previewDoc && (
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => {
                setShowPreview(true);
                document.getElementById('live-preview')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
      </div>

      <AdSlot slot="adsense_slot_post_top" className="container" />

      <div className="container post-layout">
        <div className="post-main">
          <div
            className="article-content"
            dangerouslySetInnerHTML={{ __html: post.article_content }}
          />

          {post.images?.length > 0 && (
            <section className="article-gallery">
              <h2>Project images</h2>
              <div className="article-gallery__grid">
                {post.images.map((img) => (
                  <figure key={img.id}>
                    <img src={img.image_url} alt={img.alt_text || ''} loading="lazy" decoding="async" />
                    {img.caption && <figcaption>{img.caption}</figcaption>}
                  </figure>
                ))}
              </div>
            </section>
          )}

          {post.features?.length > 0 && (
            <section className="project-section">
              <h2>Project Features</h2>
              <ul className="feature-list">
                {post.features.map((feature, i) => <li key={i}>{feature}</li>)}
              </ul>
            </section>
          )}

          {post.technologies?.length > 0 && (
            <section className="project-section">
              <h2>Technologies Used</h2>
              <ul className="tech-list">
                {post.technologies.map((tech) => <li key={tech} className="chip chip--tech">{tech}</li>)}
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
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>
            </section>
          )}

          {post.live_preview && previewDoc && (
            <section className="project-section" id="live-preview">
              <div className="section__head">
                <h2>Live Preview</h2>
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  onClick={() => setShowPreview((v) => !v)}
                >
                  {showPreview ? 'Hide preview' : 'Show preview'}
                </button>
              </div>

              {showPreview ? (
                <>
                  <p className="muted small">
                    This preview runs in a sandboxed frame with no access to site data or cookies.
                  </p>
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
                <p className="muted small">Click “Show preview” to run the project in an isolated frame.</p>
              )}
            </section>
          )}

          {post.files?.length > 0 && (
            <section className="project-section" id="source-code">
              <div className="section__head">
                <h2>Source Code</h2>
                <button type="button" className="btn btn--primary btn--sm" onClick={downloadProject}>
                  Download All Files
                </button>
              </div>
              <p className="muted small">
                {post.files.length} file{post.files.length === 1 ? '' : 's'} included. Use the copy
                button on any block, or download the whole project as a ZIP.
              </p>
              <div className="code-stack">
                {post.files.map((file) => (
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

          {post.tags?.length > 0 && (
            <section className="project-section">
              <h2>Tags</h2>
              <ul className="tag-list">
                {post.tags.map((tag) => (
                  <li key={tag.id}><Link to={`/tag/${tag.slug}`}>#{tag.name}</Link></li>
                ))}
              </ul>
            </section>
          )}

          <section className="project-section">
            <div className="share-row">
              <span className="muted small">Share:</span>
              <a
                className="btn btn--xs btn--ghost"
                href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(post.title)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                X / Twitter
              </a>
              <a
                className="btn btn--xs btn--ghost"
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Facebook
              </a>
              <a
                className="btn btn--xs btn--ghost"
                href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                LinkedIn
              </a>
            </div>
          </section>

          <AdSlot slot="adsense_slot_post_bottom" />
        </div>

        <aside className="post-sidebar">
          <div className="sidebar-card">
            <h3>About this tutorial</h3>
            <dl className="meta-list">
              <div><dt>Category</dt><dd>{post.category_name || '—'}</dd></div>
              <div><dt>Published</dt><dd>{formatDate(post.published_at)}</dd></div>
              <div><dt>Reading time</dt><dd>{minutes} min</dd></div>
              <div><dt>Views</dt><dd>{formatNumber(post.views)}</dd></div>
              <div><dt>Files</dt><dd>{post.files?.length || 0}</dd></div>
            </dl>
          </div>

          {related.length > 0 && (
            <div className="sidebar-card">
              <h3>Related Projects</h3>
              <ul className="related-list">
                {related.slice(0, 4).map((item) => (
                  <li key={item.id}>
                    <Link to={`/project/${item.slug}`}>{item.title}</Link>
                    <span className="muted small">{item.category_name}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <AdSlot slot="adsense_slot_post_bottom" className="ad-slot--sidebar" />
        </aside>
      </div>

      {related.length > 0 && (
        <section className="container section">
          <div className="section__head">
            <h2>Related Projects</h2>
          </div>
          <div className="post-grid">
            {related.slice(0, 3).map((item) => <PostCard key={item.id} post={item} />)}
          </div>
        </section>
      )}
    </article>
  );
}
