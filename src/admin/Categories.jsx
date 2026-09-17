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
    <div
