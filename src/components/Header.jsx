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

  /* ---------- load categories ---------- */
  useEffect(() => {
    api.get('/categories')
      .then((d) => setCategories(d.categories || []))
      .catch(() => {});
  }, []);

  /* ---------- lock scroll when drawer open ---------- */
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  /* ---------- close drawer on ESC ---------- */
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

  const htmlCssCats = categories.filter(
    (c) => c.slug === 'html' || c.slug === 'css',
  );
  const jsCats = categories.filter(
    (c) =>
      c.slug.includes('javascript') ||
      c.slug === 'js' ||
      c.slug === 'react',
  );

  return (
    <>
      {/* ==================== TOP BAR ==================== */}
      {showTopBar && (
        <div className="top-bar">
          <span>Impressed by our work? Hire us for exceptional web development services.</span>
          <a href="https://www.fiverr.com" target="_blank" rel="noopener noreferrer">
            Hire us
          </a>
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

      {/* ==================== HEADER ==================== */}
      <header className="site-header">
        <div className="container site-header__inner">

          {/* Brand */}
        <Link className="brand" to="/" onClick={closeMenu}>
  {settings.logo_url ? (
    <img
      src={settings.logo_url}
      alt={settings.site_name}
      className="brand__logo"
      width={160}
      height={40}
      loading="eager"
      onError={(e) => {
        e.currentTarget.style.display = "none";
        e.currentTarget.nextElementSibling?.classList.add("brand__mark--show");
      }}
    />
  ) : null}

  <span className="brand__mark" aria-hidden="true">{"</>"}</span>
  <span className="brand__name">{settings.site_name}</span>
</Link>
          {/* Desktop navigation */}
          <nav className="main-nav" aria-label="Main navigation">
            <NavLink to="/" end>Home</NavLink>
            <NavLink to="/blog">Blog</NavLink>

            <div className="nav-dropdown">
              <button type="button" className="nav-dropdown__trigger" aria-haspopup="true">
                <span>HTML &amp; CSS</span>
                <span className="nav-dropdown__chev" aria-hidden="true">▾</span>
              </button>
              <ul className="nav-dropdown__menu">
                {htmlCssCats.length > 0 ? (
                  htmlCssCats.map((c) => (
                    <li key={c.id}>
                      <Link to={`/category/${c.slug}`}>{c.name}</Link>
                    </li>
                  ))
                ) : (
                  <li><Link to="/blog">All tutorials</Link></li>
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
                      <Link to={`/category/${c.slug}`}>{c.name}</Link>
                    </li>
                  ))
                ) : (
                  <li><Link to="/blog">All tutorials</Link></li>
                )}
              </ul>
            </div>

            <NavLink to="/trending">Trending</NavLink>
            <NavLink to="/contact">Contact Us</NavLink>
          </nav>

          {/* Right-side tools */}
          <div className="site-header__tools">
            <form
              className="search-form search-form--desktop"
              onSubmit={submitSearch}
              role="search"
            >
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
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? '☀' : '🌙'}
            </button>

            <button
              type="button"
              className="icon-btn menu-toggle"
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
              aria-expanded={menuOpen}
            >
              ☰
            </button>
          </div>

        </div>
      </header>

      {/* ==================== MOBILE DRAWER ==================== */}
      {/* Rendered OUTSIDE header so it positions against the viewport */}
      <div
        className={`mobile-backdrop ${menuOpen ? 'mobile-backdrop--open' : ''}`}
        onClick={closeMenu}
        aria-hidden="true"
      />

      <aside
        className={`mobile-drawer ${menuOpen ? 'mobile-drawer--open' : ''}`}
        aria-label="Mobile navigation"
        aria-hidden={!menuOpen}
      >
        <div className="mobile-drawer__head">
          <span className="mobile-drawer__title">Menu</span>
          <button
            type="button"
            className="mobile-drawer__close"
            onClick={closeMenu}
            aria-label="Close menu"
          >
            ✕
          </button>
        </div>

        <nav className="mobile-drawer__nav">
          <NavLink to="/" end onClick={closeMenu}>Home</NavLink>
          <NavLink to="/blog" onClick={closeMenu}>Blog</NavLink>

          <div className="nav-dropdown">
            <button type="button" className="nav-dropdown__trigger">
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
                <li><Link to="/blog" onClick={closeMenu}>All tutorials</Link></li>
              )}
            </ul>
          </div>

          <div className="nav-dropdown">
            <button type="button" className="nav-dropdown__trigger">
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
                <li><Link to="/blog" onClick={closeMenu}>All tutorials</Link></li>
              )}
            </ul>
          </div>

          <NavLink to="/trending" onClick={closeMenu}>Trending</NavLink>
          <NavLink to="/contact" onClick={closeMenu}>Contact Us</NavLink>
        </nav>

        <form className="mobile-drawer__search" onSubmit={submitSearch} role="search">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tutorials…"
            aria-label="Search tutorials"
          />
          <button type="submit" className="btn btn--primary">Search</button>
        </form>
      </aside>
    </>
  );
}
