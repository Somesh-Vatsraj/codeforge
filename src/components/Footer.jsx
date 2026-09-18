import { Link } from 'react-router-dom';
import { useSettings } from '../store.jsx';

/**
 * Small inline SVG icon set — no external icon library needed.
 * All icons use currentColor so they inherit text color.
 */
const Icons = {
  Facebook: (props) => (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5.02 3.66 9.18 8.44 9.94v-7.03H7.9v-2.91h2.54V9.85c0-2.52 1.49-3.91 3.77-3.91 1.09 0 2.24.2 2.24.2v2.47h-1.26c-1.24 0-1.63.78-1.63 1.57v1.88h2.78l-.44 2.91h-2.34V22c4.78-.76 8.44-4.92 8.44-9.94z" />
    </svg>
  ),
  Instagram: (props) => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  ),
  YouTube: (props) => (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2 31.3 31.3 0 0 0 0 12a31.3 31.3 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31.3 31.3 0 0 0 24 12a31.3 31.3 0 0 0-.5-5.8zM9.6 15.6V8.4L15.8 12l-6.2 3.6z" />
    </svg>
  ),
  Twitter: (props) => (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M18.9 2h3.3l-7.2 8.3L23.6 22h-6.6l-5.2-6.8L5.9 22H2.6l7.7-8.8L1.6 2h6.7l4.7 6.2L18.9 2zm-1.2 18h1.8L7.4 3.9H5.5L17.7 20z" />
    </svg>
  ),
  GitHub: (props) => (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2c-3.3.7-4-1.6-4-1.6-.6-1.4-1.4-1.8-1.4-1.8-1.1-.7.1-.7.1-.7 1.2.1 1.9 1.3 1.9 1.3 1.1 1.9 2.9 1.3 3.6 1 .1-.8.4-1.3.8-1.6-2.7-.3-5.5-1.3-5.5-6 0-1.3.5-2.4 1.3-3.2-.1-.3-.6-1.6.1-3.3 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0c2.3-1.5 3.3-1.2 3.3-1.2.7 1.7.2 3 .1 3.3a4.6 4.6 0 0 1 1.3 3.2c0 4.7-2.8 5.7-5.5 6 .4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A12 12 0 0 0 12 .3z" />
    </svg>
  ),
};

function normalizeUrl(url) {
  if (!url) return '';
  const u = String(url).trim();
  if (!u) return '';
  // Skip placeholder values that admins may accidentally save
  if (/^#/.test(u)) return '';
  if (!/^https?:\/\//i.test(u)) return '';
  return u;
}

export default function Footer() {
  const { settings } = useSettings();
  const year = new Date().getFullYear();

  // Only include socials that have a real, configured URL
  const socials = [
    {
      name: 'Facebook',
      url: normalizeUrl(settings.social_facebook),
      Icon: Icons.Facebook,
    },
    {
      name: 'Instagram',
      url: normalizeUrl(settings.social_instagram),
      Icon: Icons.Instagram,
    },
    {
      name: 'YouTube',
      url: normalizeUrl(settings.social_youtube || settings.youtube_channel),
      Icon: Icons.YouTube,
    },
    {
      name: 'Twitter',
      url: normalizeUrl(settings.social_twitter),
      Icon: Icons.Twitter,
    },
    {
      name: 'GitHub',
      url: normalizeUrl(settings.social_github),
      Icon: Icons.GitHub,
    },
  ].filter((s) => s.url);

  return (
    <footer className="site-footer">
      <div className="container">
        <div className="site-footer__grid">
          {/* ==================== Column 1 — Brand + About ==================== */}
          <div className="site-footer__col site-footer__col--about">
            <Link to="/" className="site-footer__brand">
              {settings.logo_url ? (
                <img
                  src={settings.logo_url}
                  alt={settings.site_name || 'Logo'}
                  className="brand__logo"
                />
              ) : (
                <span className="brand__mark" aria-hidden="true">{"</>"}</span>
              )}
              <span className="brand__name">{settings.site_name || 'CodeForge'}</span>
            </Link>

            <h3>About Us</h3>
            <p>
              {settings.site_name || 'CodeForge'} is a blog dedicated to providing valuable
              and informative content about web development technologies such as HTML, CSS,
              JavaScript, React, and more.
            </p>
            <Link to="/about" className="site-footer__more">
              Read more <span aria-hidden="true">→</span>
            </Link>
          </div>

          {/* ==================== Column 2 — Follow Us ==================== */}
          <div className="site-footer__col">
            <h3>Follow Us</h3>

            {socials.length > 0 ? (
              <ul className="social-list">
                {socials.map(({ name, url, Icon }) => (
                  <li key={name}>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={name}
                      title={name}
                    >
                      <Icon width="18" height="18" />
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted small">
                No social links configured yet. Add them in the admin panel.
              </p>
            )}
          </div>

          {/* ==================== Column 3 — Quick links ==================== */}
          <div className="site-footer__col">
            <h3>Quick Links</h3>
            <ul className="site-footer__links">
              <li><Link to="/about">About Us</Link></li>
              <li><Link to="/contact">Contact Us</Link></li>
              <li><Link to="/privacy-policy">Privacy Policy</Link></li>
              <li><Link to="/terms">Terms &amp; Conditions</Link></li>
              <li><Link to="/disclaimer">Disclaimer</Link></li>
            </ul>
          </div>
        </div>

        {/* ==================== Bottom row ==================== */}
        <div className="site-footer__bottom">
          <p>
            Copyright © {year} <strong>{settings.site_name || 'CodeForge'}</strong>. All Rights Reserved.
          </p>
          <nav className="footer-links" aria-label="Legal">
            <Link to="/about">About Us</Link>
            <Link to="/terms">Terms &amp; Conditions</Link>
            <Link to="/privacy-policy">Privacy Policy</Link>
            <Link to="/contact">Contact Us</Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
