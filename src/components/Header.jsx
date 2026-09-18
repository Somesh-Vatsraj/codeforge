import { useEffect, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import { useSettings, useTheme } from '../store.jsx';

export default function Header() {
  const { settings } = useSettings();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();

  const [menuOpen, setMenuOpen] = useState(false);
  const [showTopBar, setShowTopBar] = useState(true);
  const [query, setQuery] = useState('');
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    api.get('/categories').then((d) => setCategories(d.categories || [])).catch(() => {});
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') setMenuOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const closeMenu = () => setMenuOpen(false);

  const submitSearch = (event) => {
    event.preventDefault();
    const q = query.trim();
    if (!q) return;
    closeMenu();
    navigate(`/search?q=${encodeURIComponent(q)}`);
    setQuery('');
  };

  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  const htmlCssCats = categories.filter((c) => c.slug === 'html' || c.slug === 'css');
  const jsCats = categories.filter(
    (c) => c.slug.includes('javascript') || c.slug === 'js' || c.slug === 'react',
  );

  return (
    <>
      {showTopBar && (
        <div className="top-bar">
          <span>Impressed by our work? Hire us for exceptional web development services.</span>
          <a href="https://www.fiverr.com" target="_blank" rel="noopener noreferrer">Hire us</a>
          <button
            type="button"
            className="top-bar__close"
            onClick={() => setShowTopBar(false)}
            aria-label="Close top bar"
          >
            ✕
          </button>
        </div>
      )}

      <header className="site-header">
        <div className="container site-header__inner">
          <Link className="brand" to="/" onClick={closeMenu}>
            {settings.logo_url ? (
              <img src={settings.logo_url} alt={settings.site_name} className="brand__logo" />
            ) : (
              <span className="brand__mark" aria-hidden="true">{"</>"}</span>
            )}
            <span className="brand__name">{settings.site_name}</span>
          </Link>

          {menuOpen && (
            <div className="nav-backdrop" onClick={closeMenu} aria-hidden="true" />
          )}

          <nav className={`main-nav ${menuOpen ? 'main-nav--open' : ''}`} aria-label="Main navigation">
            <div className="main-nav__head">
              <span className="main-nav__title">Menu</span>
              <button
                type="button"
                className="main-nav__close"
                onClick={closeMenu}
                aria-label="Close menu"
              >
                ✕
              </button>
            </div>

            <NavLink to="/" end onClick={closeMenu}>Home</NavLink>
            <NavLink to="/latest" onClick={closeMenu}>Blog</NavLink>

            <div className="nav-dropdown">
              <button type="button" className="nav-dropdown__trigger" aria-haspopup="true">
                <span>HTML &amp; CSS</span>
                <span className="nav-dropdown__chev" aria-hidden="true">▾</span>
              </button>
              <ul className="nav-dropdown__menu">
                {htmlCssCats.length > 0 ? (
                  htmlCssCats.map((c) => (
                    <li key={c.id}>
                      <Link to={`/category/${c.slug}`} onClick={closeMenu}>{c.name}</Link>
                    </li>
                  ))
                ) : (
                  <li><Link to="/latest" onClick={closeMenu}>All tutorials</Link></li>
                )}
              </ul>
            </div>

            <div className="nav-dropdown">
              <button type="button" className="nav-dropdown__trigger" aria-haspopup="true">
                <span>JavaScript</span>
                <span className="nav-dropdown__chev" aria-hidden="true">▾</span>
              </button>
              <ul className="nav-dropdown__menu">
                {jsCats.length > 0 ? (
                  jsCats.map((c) => (
                    <li key={c.id}>
                      <Link to={`/category/${c.slug}`} onClick={closeMenu}>{c.name}</Link>
                    </li>
                  ))
                ) : (
                  <li><Link to="/latest" onClick={closeMenu}>All tutorials</Link></li>
                )}
              </ul>
            </div>

            <NavLink to="/trending" onClick={closeMenu}>Trending</NavLink>
            <NavLink to="/contact" onClick={closeMenu}>Contact Us</NavLink>

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
            </form>

            <button
              type="button"
              className="icon-btn"
              onClick={toggleTheme}
              aria-label="Toggle dark mode"
              title="Toggle theme"
            >
              {theme === 'dark' ? '☀' : '🌙'}
            </button>

            <button
              type="button"
              className="icon-btn menu-toggle"
              onClick={() => setMenuOpen((v) => !v)}
              aria-expanded={menuOpen}
              aria-label="Toggle navigation"
            >
              {menuOpen ? '✕' : '☰'}
            </button>
          </div>
        </div>
      </header>
    </>
  );
}
