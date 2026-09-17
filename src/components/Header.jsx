import { useEffect, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import { useSettings, useTheme } from '../store.jsx';

export default function Header() {
  const { settings } = useSettings();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();

  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    api.get('/categories').then((d) => setCategories(d.categories || [])).catch(() => {});
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  const submitSearch = (event) => {
    event.preventDefault();
    const q = query.trim();
    if (!q) return;
    setMenuOpen(false);
    navigate(`/search?q=${encodeURIComponent(q)}`);
    setQuery('');
  };

  const cycleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light');
  };

  const themeIcon = theme === 'dark' ? '🌙' : theme === 'light' ? '☀️' : '🖥️';

  return (
    <header className="site-header">
      <div className="container site-header__inner">
        <Link className="brand" to="/" onClick={() => setMenuOpen(false)}>
          {settings.logo_url
            ? <img src={settings.logo_url} alt={settings.site_name} className="brand__logo" />
            : <span className="brand__mark" aria-hidden="true">{"</>"}</span>}
          <span className="brand__name">{settings.site_name}</span>
        </Link>

        <nav className={`main-nav ${menuOpen ? 'main-nav--open' : ''}`} aria-label="Main navigation">
          <NavLink to="/" end onClick={() => setMenuOpen(false)}>Home</NavLink>
          <NavLink to="/latest" onClick={() => setMenuOpen(false)}>Latest</NavLink>
          <NavLink to="/trending" onClick={() => setMenuOpen(false)}>Trending</NavLink>

          <div className="nav-dropdown">
            <button type="button" className="nav-dropdown__trigger" aria-haspopup="true">
              Categories <span aria-hidden="true">▾</span>
            </button>
            <ul className="nav-dropdown__menu">
              {categories.length === 0 && <li className="nav-dropdown__empty">No categories yet</li>}
              {categories.map((c) => (
                <li key={c.id}>
                  <Link to={`/category/${c.slug}`} onClick={() => setMenuOpen(false)}>
                    {c.name} <span className="muted">{c.post_count}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <NavLink to="/about" onClick={() => setMenuOpen(false)}>About</NavLink>
          <NavLink to="/contact" onClick={() => setMenuOpen(false)}>Contact</NavLink>

          <form className="search-form search-form--mobile" onSubmit={submitSearch} role="search">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search tutorials…"
              aria-label="Search tutorials"
            />
            <button type="submit" className="btn btn--primary btn--sm">Search</button>
          </form>
        </nav>

        <div className="site-header__tools">
          <form className="search-form search-form--desktop" onSubmit={submitSearch} role="search">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search…"
              aria-label="Search tutorials"
            />
            <button type="submit" aria-label="Submit search" className="search-form__btn">⌕</button>
          </form>

          <button
            type="button"
            className="icon-btn"
            onClick={cycleTheme}
            aria-label={`Switch theme (current: ${theme})`}
            title={`Theme: ${theme}`}
          >
            {themeIcon}
          </button>

          <button
            type="button"
            className="icon-btn menu-toggle"
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            aria-label="Toggle navigation menu"
          >
            {menuOpen ? '✕' : '☰'}
          </button>
        </div>
      </div>
    </header>
  );
}
