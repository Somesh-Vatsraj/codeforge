import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client.js';
import { slugify } from '../utils/format.js';
import { getYouTubeId } from '../utils/youtube.js';
import ArticleEditor from './ArticleEditor.jsx';
import Spinner from '../components/Spinner.jsx';

const EMPTY = {
  title: '',
  slug: '',
  description: '',
  article_content: '',
  thumbnail_url: '',
  youtube_url: '',
  category_id: '',
  technologies: [],
  features: [],
  tag_ids: [],
  images: [],
  files: [],
  demo_files: [],
  featured: false,
  trending: false,
  live_preview: false,
  status: 'draft',
  seo_title: '',
  seo_description: '',
  seo_keywords: '',
  canonical_url: '',
  author: '',
};

const CODE_LANGUAGES = ['html', 'css', 'scss', 'js', 'jsx', 'ts', 'json', 'php', 'sql', 'md', 'text'];

export default function PostForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [form, setForm] = useState(EMPTY);
  const [categories, setCategories] = useState([]);
  const [tags, setTags] = useState([]);
  const [slugLocked, setSlugLocked] = useState(false);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [uploads, setUploads] = useState({});

  /* ---------------- data loading ---------------- */

  useEffect(() => {
    Promise.all([api.get('/admin/categories'), api.get('/admin/tags')])
      .then(([c, t]) => { setCategories(c.categories); setTags(t.tags); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!isEdit) return;
    api.get(`/admin/posts/${id}`)
      .then(({ post }) => {
        setForm({
          ...EMPTY,
          ...post,
          category_id: post.category_id ?? '',
          technologies: post.technologies || [],
          features: post.features || [],
          featured: !!post.featured,
          trending: !!post.trending,
          live_preview: !!post.live_preview,
          images: (post.images || []).map((i) => ({ ...i })),
          files: (post.files || []).map((f) => ({ ...f })),
          demo_files: (post.demo_files || []).map((f) => ({ ...f })),
        });
        setSlugLocked(true);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  /* ---------------- helpers ---------------- */

  const update = (patch) => setForm((prev) => ({ ...prev, ...patch }));

  const updateAt = (key, index, patch) => {
    setForm((prev) => {
      const list = [...prev[key]];
      list[index] = { ...list[index], ...patch };
      return { ...prev, [key]: list };
    });
  };

  const addRow = (key, row) => setForm((prev) => ({ ...prev, [key]: [...prev[key], row] }));

  const removeRow = (key, index) => {
    setForm((prev) => ({ ...prev, [key]: prev[key].filter((_, i) => i !== index) }));
  };

  const moveRow = (key, index, direction) => {
    setForm((prev) => {
      const list = [...prev[key]];
      const target = index + direction;
      if (target < 0 || target >= list.length) return prev;
      [list[index], list[target]] = [list[target], list[index]];
      return { ...prev, [key]: list };
    });
  };

  const onTitleChange = (value) => {
    update(slugLocked ? { title: value } : { title: value, slug: slugify(value) });
  };

  const handleUpload = async (file, onDone, key) => {
    if (!file) return;
    setUploads((u) => ({ ...u, [key]: true }));
    try {
      const fd = new FormData();
      fd.append('file', file);
      const result = await api.post('/admin/upload', fd);
      onDone(result.url);
    } catch (e) {
      alert(e.message);
    } finally {
      setUploads((u) => ({ ...u, [key]: false }));
    }
  };

  const youtubeId = useMemo(() => getYouTubeId(form.youtube_url), [form.youtube_url]);

  const save = async (status) => {
    setError('');
    setNotice('');
    if (!form.title.trim()) { setError('Title is required.'); return; }

    setSaving(true);
    try {
      const payload = {
        ...form,
        status,
        category_id: form.category_id || null,
        technologies: form.technologies,
        features: form.features,
      };
      const result = isEdit
        ? await api.put(`/admin/posts/${id}`, payload)
        : await api.post('/admin/posts', payload);

      setNotice(status === 'published' ? 'Post published.' : 'Draft saved.');

      if (!isEdit) {
        navigate(`/admin/posts/edit/${result.id}`, { replace: true });
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="admin-page"><Spinner label="Loading post…" /></div>;

  return (
    <div className="admin-page">
      <header className="admin-page__head">
        <h1>{isEdit ? 'Edit Post' : 'Create Post'}</h1>
        <div className="admin-page__actions">
          <button type="button" className="btn btn--ghost" onClick={() => save('draft')} disabled={saving}>
            Save Draft
          </button>
          <button type="button" className="btn btn--primary" onClick={() => save('published')} disabled={saving}>
            {saving ? 'Saving…' : 'Publish'}
          </button>
        </div>
      </header>

      {error && <p className="alert alert--error" role="alert">{error}</p>}
      {notice && <p className="alert alert--success">{notice}</p>}

      {/* ============ BASIC INFORMATION ============ */}
      <section className="admin-panel">
        <h2>Basic information</h2>

        <div className="form-grid">
          <label className="span-2">
            Title *
            <input
              type="text"
              value={form.title}
              onChange={(e) => onTitleChange(e.target.value)}
              placeholder="Responsive Portfolio Website Using HTML CSS JS"
            />
          </label>

          <label className="span-2">
            Slug
            <div className="input-row">
              <input
                type="text"
                value={form.slug}
                onChange={(e) => { setSlugLocked(true); update({ slug: e.target.value }); }}
                placeholder="auto-generated-from-title"
              />
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => { setSlugLocked(false); update({ slug: slugify(form.title) }); }}
              >
                Regenerate
              </button>
            </div>
          </label>

          <label className="span-2">
            Short description
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => update({ description: e.target.value })}
              placeholder="One or two sentences shown on cards and in search results."
              maxLength={500}
            />
            <span className="muted small">{form.description.length}/500</span>
          </label>

          <label>
            Category
            <select
              value={form.category_id}
              onChange={(e) => update({ category_id: e.target.value })}
            >
              <option value="">— None —</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>

          <label>
            Author
            <input
              type="text"
              value={form.author}
              onChange={(e) => update({ author: e.target.value })}
              placeholder="Editorial Team"
            />
          </label>

          <div className="span-2">
            <span className="field-label">Tags</span>
            <div className="chip-select">
              {tags.length === 0 && <span className="muted small">No tags yet — create them under Categories &amp; Tags.</span>}
              {tags.map((tag) => {
                const selected = form.tag_ids.includes(tag.id);
                return (
                  <button
                    key={tag.id}
                    type="button"
                    className={selected ? 'chip chip--selectable chip--on' : 'chip chip--selectable'}
                    onClick={() => update({
                      tag_ids: selected
                        ? form.tag_ids.filter((t) => t !== tag.id)
                        : [...form.tag_ids, tag.id],
                    })}
                    aria-pressed={selected}
                  >
                    #{tag.name}
                  </button>
                );
              })}
            </div>
          </div>

          <ListEditor
            label="Technologies"
            placeholder="e.g. React"
            items={form.technologies}
            onChange={(items) => update({ technologies: items })}
            addLabel="+ Add Technology"
          />

          <ListEditor
            label="Project features"
            placeholder="e.g. Responsive layout"
            items={form.features}
            onChange={(items) => update({ features: items })}
            addLabel="+ Add Feature"
          />
        </div>
      </section>

      {/* ============ CONTENT ============ */}
      <section className="admin-panel">
        <h2>Content</h2>

        <span className="field-label">Article</span>
        <ArticleEditor value={form.article_content} onChange={(html) => update({ article_content: html })} />

        <hr className="divider" />

        <div className="form-grid">
          <div className="span-2">
            <span className="field-label">Thumbnail</span>
            <div className="media-field">
              <input
                type="url"
                value={form.thumbnail_url}
                onChange={(e) => update({ thumbnail_url: e.target.value })}
                placeholder="https://… or /api/uploads/…"
                aria-label="Thumbnail URL"
              />
              <label className="btn btn--ghost btn--sm">
                {uploads.thumbnail ? 'Uploading…' : 'Upload'}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  hidden
                  onChange={(e) => handleUpload(e.target.files?.[0], (url) => update({ thumbnail_url: url }), 'thumbnail')}
                />
              </label>
            </div>
            {form.thumbnail_url && (
              <img className="preview-thumb" src={form.thumbnail_url} alt="Thumbnail preview" />
            )}
          </div>

          <label className="span-2">
            YouTube URL
            <input
              type="url"
              value={form.youtube_url}
              onChange={(e) => update({ youtube_url: e.target.value })}
              placeholder="https://www.youtube.com/watch?v=… or https://youtu.be/…"
            />
            <span className="muted small">
              {form.youtube_url
                ? (youtubeId ? `✓ Detected video ID: ${youtubeId}` : '⚠ Could not detect a valid YouTube video ID.')
                : 'Leave empty to hide the video section.'}
            </span>
          </label>
        </div>

        <hr className="divider" />

        <div className="section__head">
          <span className="field-label">Article images ({form.images.length})</span>
          <button
            type="button"
            className="btn btn--sm"
            onClick={() => addRow('images', { image_url: '', alt_text: '', caption: '' })}
          >
            + Add Image
          </button>
        </div>

        {form.images.length === 0 && <p className="muted small">No additional images yet.</p>}

        {form.images.map((image, index) => (
          <div className="repeat-row" key={index}>
            <div className="repeat-row__head">
              <strong>Image {index + 1}</strong>
              <div className="row-actions">
                <button type="button" className="btn btn--xs" onClick={() => moveRow('images', index, -1)} disabled={index === 0}>↑</button>
                <button type="button" className="btn btn--xs" onClick={() => moveRow('images', index, 1)} disabled={index === form.images.length - 1}>↓</button>
                <button type="button" className="btn btn--xs btn--danger" onClick={() => removeRow('images', index)}>Remove</button>
              </div>
            </div>

            <div className="media-field">
              <input
                type="text"
                value={image.image_url}
                onChange={(e) => updateAt('images', index, { image_url: e.target.value })}
                placeholder="Image URL"
                aria-label={`Image ${index + 1} URL`}
              />
              <label className="btn btn--ghost btn--sm">
                {uploads[`image-${index}`] ? 'Uploading…' : 'Upload'}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  hidden
                  onChange={(e) => handleUpload(
                    e.target.files?.[0],
                    (url) => updateAt('images', index, { image_url: url }),
                    `image-${index}`,
                  )}
                />
              </label>
            </div>

            <div className="form-grid form-grid--tight">
              <label>
                Alt text
                <input
                  type="text"
                  value={image.alt_text || ''}
                  onChange={(e) => updateAt('images', index, { alt_text: e.target.value })}
                />
              </label>
              <label>
                Caption
                <input
                  type="text"
                  value={image.caption || ''}
                  onChange={(e) => updateAt('images', index, { caption: e.target.value })}
                />
              </label>
            </div>
          </div>
        ))}
      </section>

      {/* ============ SOURCE CODE FILES ============ */}
      <section className="admin-panel">
        <div className="section__head">
          <h2>Source code files ({form.files.length})</h2>
          <button
            type="button"
            className="btn btn--primary btn--sm"
            onClick={() => addRow('files', { file_name: '', file_path: '', language: 'html', code_content: '' })}
          >
            + Add File
          </button>
        </div>
        <p className="muted small">
          Add as many files as the project needs — HTML, CSS, JS, JSON, PHP… Set the path so
          folders (css/, js/, assets/) are preserved in the ZIP download.
        </p>

        {form.files.length === 0 && <p className="muted small">No source files added yet.</p>}

        {form.files.map((file, index) => (
          <div className="repeat-row" key={index}>
            <div className="repeat-row__head">
              <strong>{file.file_path || file.file_name || `File ${index + 1}`}</strong>
              <div className="row-actions">
                <button type="button" className="btn btn--xs" onClick={() => moveRow('files', index, -1)} disabled={index === 0}>↑</button>
                <button type="button" className="btn btn--xs" onClick={() => moveRow('files', index, 1)} disabled={index === form.files.length - 1}>↓</button>
                <button type="button" className="btn btn--xs btn--danger" onClick={() => removeRow('files', index)}>Delete</button>
              </div>
            </div>

            <div className="form-grid form-grid--tight">
              <label>
                File name
                <input
                  type="text"
                  value={file.file_name}
                  onChange={(e) => updateAt('files', index, { file_name: e.target.value })}
                  placeholder="style.css"
                />
              </label>
              <label>
                File path
                <input
                  type="text"
                  value={file.file_path}
                  onChange={(e) => updateAt('files', index, { file_path: e.target.value })}
                  placeholder="css/style.css"
                />
              </label>
              <label>
                Language
                <select
                  value={file.language}
                  onChange={(e) => updateAt('files', index, { language: e.target.value })}
                >
                  {CODE_LANGUAGES.map((lang) => <option key={lang} value={lang}>{lang}</option>)}
                </select>
              </label>
            </div>

            <label className="code-field">
              Code
              <textarea
                rows={10}
                spellCheck={false}
                value={file.code_content}
                onChange={(e) => updateAt('files', index, { code_content: e.target.value })}
                placeholder="<h1>Hello world</h1>"
              />
            </label>
          </div>
        ))}
      </section>

      {/* ============ DEMO FILES / LIVE PREVIEW ============ */}
      <section className="admin-panel">
        <div className="section__head">
          <h2>Demo files ({form.demo_files.length})</h2>
          <button
            type="button"
            className="btn btn--primary btn--sm"
            onClick={() => addRow('demo_files', { file_path: '', file_content: '', file_type: 'text/html' })}
          >
            + Add Demo File
          </button>
        </div>

        <label className="switch">
          <input
            type="checkbox"
            checked={form.live_preview}
            onChange={(e) => update({ live_preview: e.target.checked })}
          />
          <span>Enable Live Preview button on the public post</span>
        </label>

        <p className="muted small">
          The preview runs in a sandboxed iframe and only supports client-side files (HTML, CSS, JS,
          JSON). Server-side code such as PHP is never executed — it is only shown and downloadable as
          source. Provide an <code>index.html</code> entry file.
        </p>

        {form.demo_files.map((file, index) => (
          <div className="repeat-row" key={index}>
            <div className="repeat-row__head">
              <strong>{file.file_path || `Demo file ${index + 1}`}</strong>
              <div className="row-actions">
                <button type="button" className="btn btn--xs" onClick={() => moveRow('demo_files', index, -1)} disabled={index === 0}>↑</button>
                <button type="button" className="btn btn--xs" onClick={() => moveRow('demo_files', index, 1)} disabled={index === form.demo_files.length - 1}>↓</button>
                <button type="button" className="btn btn--xs btn--danger" onClick={() => removeRow('demo_files', index)}>Delete</button>
              </div>
            </div>

            <div className="form-grid form-grid--tight">
              <label>
                File path
                <input
                  type="text"
                  value={file.file_path}
                  onChange={(e) => updateAt('demo_files', index, { file_path: e.target.value })}
                  placeholder="index.html or css/style.css"
                />
              </label>
              <label>
                MIME type
                <select
                  value={file.file_type}
                  onChange={(e) => updateAt('demo_files', index, { file_type: e.target.value })}
                >
                  <option value="text/html">text/html</option>
                  <option value="text/css">text/css</option>
                  <option value="text/javascript">text/javascript</option>
                  <option value="application/json">application/json</option>
                </select>
              </label>
            </div>

            <label className="code-field">
              Content
              <textarea
                rows={8}
                spellCheck={false}
                value={file.file_content}
                onChange={(e) => updateAt('demo_files', index, { file_content: e.target.value })}
              />
            </label>
          </div>
        ))}
      </section>

      {/* ============ SEO ============ */}
      <section className="admin-panel">
        <h2>SEO</h2>
        <div className="form-grid">
          <label className="span-2">
            SEO title
            <input
              type="text"
              value={form.seo_title}
              onChange={(e) => update({ seo_title: e.target.value })}
              placeholder="Defaults to the post title"
              maxLength={70}
            />
          </label>
          <label className="span-2">
            SEO description
            <textarea
              rows={3}
              value={form.seo_description}
              onChange={(e) => update({ seo_description: e.target.value })}
              maxLength={160}
            />
            <span className="muted small">{form.seo_description.length}/160</span>
          </label>
          <label>
            Keywords
            <input
              type="text"
              value={form.seo_keywords}
              onChange={(e) => update({ seo_keywords: e.target.value })}
              placeholder="comma, separated, keywords"
            />
          </label>
          <label>
            Canonical URL
            <input
              type="url"
              value={form.canonical_url}
              onChange={(e) => update({ canonical_url: e.target.value })}
              placeholder="https://example.com/project/my-post"
            />
          </label>
        </div>
      </section>

      {/* ============ PUBLISH ============ */}
      <section className="admin-panel">
        <h2>Publish</h2>
        <div className="publish-grid">
          <label className="switch">
            <input type="checkbox" checked={form.featured} onChange={(e) => update({ featured: e.target.checked })} />
            <span>Featured on homepage</span>
          </label>
          <label className="switch">
            <input type="checkbox" checked={form.trending} onChange={(e) => update({ trending: e.target.checked })} />
            <span>Mark as trending</span>
          </label>
          <label className="switch">
            <input type="checkbox" checked={form.live_preview} onChange={(e) => update({ live_preview: e.target.checked })} />
            <span>Live preview enabled</span>
          </label>
        </div>

        <div className="admin-page__actions">
          <span className="muted small">
            Current status: <strong>{form.status}</strong>
          </span>
          <button type="button" className="btn btn--ghost" onClick={() => save('draft')} disabled={saving}>
            Save Draft
          </button>
          <button type="button" className="btn btn--primary" onClick={() => save('published')} disabled={saving}>
            {saving ? 'Saving…' : 'Publish'}
          </button>
        </div>
      </section>
    </div>
  );
}

/* ---------------- small sub-components ---------------- */

function ListEditor({ label, placeholder, items, onChange, addLabel }) {
  const [draft, setDraft] = useState('');

  const add = () => {
    const value = draft.trim();
    if (!value) return;
    onChange([...items, value]);
    setDraft('');
  };

  return (
    <div className="span-2 list-editor">
      <span className="field-label">{label} ({items.length})</span>

      <div className="input-row">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          placeholder={placeholder}
        />
        <button type="button" className="btn btn--sm" onClick={add}>{addLabel}</button>
      </div>

      {items.length > 0 && (
        <ul className="editable-list">
          {items.map((item, index) => (
            <li key={`${item}-${index}`}>
              <input
                type="text"
                value={item}
                onChange={(e) => {
                  const next = [...items];
                  next[index] = e.target.value;
                  onChange(next);
                }}
              />
              <button
                type="button"
                className="btn btn--xs btn--danger"
                onClick={() => onChange(items.filter((_, i) => i !== index))}
                aria-label={`Remove ${item}`}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
