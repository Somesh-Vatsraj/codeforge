import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client.js';
import Spinner from '../components/Spinner.jsx';

export default function Categories() {
  const [categories, setCategories] = useState([]);
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [catForm, setCatForm] = useState({ name: '', description: '' });
  const [tagForm, setTagForm] = useState({ name: '' });

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([api.get('/admin/categories'), api.get('/admin/tags')])
      .then(([c, t]) => { setCategories(c.categories); setTags(t.tags); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const addCategory = async (event) => {
    event.preventDefault();
    if (!catForm.name.trim()) return;
    try {
      await api.post('/admin/categories', catForm);
      setCatForm({ name: '', description: '' });
      load();
    } catch (e) { alert(e.message); }
  };

  const removeCategory = async (category) => {
    if (!window.confirm(`Delete category “${category.name}”? Posts keep their content but lose the category.`)) return;
    try { await api.del(`/admin/categories/${category.id}`); load(); }
    catch (e) { alert(e.message); }
  };

  const renameCategory = async (category) => {
    const name = window.prompt('New category name', category.name);
    if (!name || name === category.name) return;
    try {
      await api.put(`/admin/categories/${category.id}`, {
        name, slug: category.slug, description: category.description || '',
      });
      load();
    } catch (e) { alert(e.message); }
  };

  const addTag = async (event) => {
    event.preventDefault();
    if (!tagForm.name.trim()) return;
    try {
      await api.post('/admin/tags', tagForm);
      setTagForm({ name: '' });
      load();
    } catch (e) { alert(e.message); }
  };

  const removeTag = async (tag) => {
    if (!window.confirm(`Delete tag “${tag.name}”?`)) return;
    try { await api.del(`/admin/tags/${tag.id}`); load(); }
    catch (e) { alert(e.message); }
  };

  const renameTag = async (tag) => {
    const name = window.prompt('New tag name', tag.name);
    if (!name || name === tag.name) return;
    try { await api.put(`/admin/tags/${tag.id}`, { name }); load(); }
    catch (e) { alert(e.message); }
  };

  return (
    <div className="admin-page">
      <header className="admin-page__head">
        <h1>Categories &amp; Tags</h1>
      </header>

      {error && <p className="alert alert--error">{error}</p>}
      {loading && <Spinner label="Loading…" />}

      {!loading && (
        <div className="two-col">
          <section className="admin-panel">
            <h2>Categories ({categories.length})</h2>

            <form className="form" onSubmit={addCategory}>
              <label>
                Name
                <input
                  type="text"
                  value={catForm.name}
                  onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
                  placeholder="e.g. React"
                  required
                />
              </label>
              <label>
                Description <span className="muted small">(optional)</span>
                <input
                  type="text"
                  value={catForm.description}
                  onChange={(e) => setCatForm({ ...catForm, description: e.target.value })}
                />
              </label>
              <button type="submit" className="btn btn--primary btn--sm">+ Add Category</button>
            </form>

            <ul className="manage-list">
              {categories.map((category) => (
                <li key={category.id}>
                  <div>
                    <strong>{category.name}</strong>
                    <span className="muted small block">/{category.slug} · {category.post_count} posts</span>
                  </div>
                  <div className="row-actions">
                    <button type="button" className="btn btn--xs" onClick={() => renameCategory(category)}>Rename</button>
                    <button type="button" className="btn btn--xs btn--danger" onClick={() => removeCategory(category)}>Delete</button>
                  </div>
                </li>
              ))}
              {categories.length === 0 && <li className="muted">No categories yet.</li>}
            </ul>
          </section>

          <section className="admin-panel">
            <h2>Tags ({tags.length})</h2>

            <form className="form" onSubmit={addTag}>
              <label>
                Name
                <input
                  type="text"
                  value={tagForm.name}
                  onChange={(e) => setTagForm({ name: e.target.value })}
                  placeholder="e.g. Responsive Design"
                  required
                />
              </label>
              <button type="submit" className="btn btn--primary btn--sm">+ Add Tag</button>
            </form>

            <ul className="manage-list">
              {tags.map((tag) => (
                <li key={tag.id}>
                  <div>
                    <strong>#{tag.name}</strong>
                    <span className="muted small block">/{tag.slug} · {tag.post_count} posts</span>
                  </div>
                  <div className="row-actions">
                    <button type="button" className="btn btn--xs" onClick={() => renameTag(tag)}>Rename</button>
                    <button type="button" className="btn btn--xs btn--danger" onClick={() => removeTag(tag)}>Delete</button>
                  </div>
                </li>
              ))}
              {tags.length === 0 && <li className="muted">No tags yet.</li>}
            </ul>
          </section>
        </div>
      )}
    </div>
  );
}
