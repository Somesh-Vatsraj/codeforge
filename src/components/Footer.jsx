import { Link } from 'react-router-dom';
import { useSettings } from '../store.jsx';

export default function Footer() {
  const { settings } = useSettings();
  const year = new Date().getFullYear();

  const socials = [
    ['Twitter', settings.social_twitter],
    ['GitHub', settings.social_github],
    ['YouTube', settings.social_youtube],
    ['Facebook', settings.social_facebook],
  ].filter(([, url]) => url);

  return (
    <footer className="site-footer">
      <div className="container site-footer__grid">
        <div>
          <h2 className="site-footer__brand">{settings.site_name}</h2>
          <p className="muted">{settings.footer_text || settings.site_description}</p>
          {socials.length > 0 && (
            <ul className="social-list">
              {socials.map(([name, url]) => (
                <li key={name}>
                  <a href={url} target="_blank" rel="noopener noreferrer">{name}</a>
                </li>
              ))}
            </ul>
          )}
        </div>

        <nav aria-label="Site">
          <h3>Explore</h3>
          <ul>
            <li><Link to="/">Home</Link></li>
            <li><Link to="/latest">Latest</Link></li>
            <li><Link to="/trending">Trending</Link></li>
            <li><Link to="/about">About</Link></li>
            <li><Link to="/contact">Contact</Link></li>
          </ul>
        </nav>

        <nav aria-label="Legal">
          <h3>Legal</h3>
          <ul>
            <li><Link to="/privacy-policy">Privacy Policy</Link></li>
            <li><Link to="/terms">Terms of Service</Link></li>
            <li><Link to="/disclaimer">Disclaimer</Link></li>
            <li><Link to="/cookie-policy">Cookie Policy</Link></li>
          </ul>
        </nav>
      </div>

      <div className="container site-footer__bottom">
        <p>© {year} {settings.site_name}. All rights reserved.</p>
        <p className="muted">
          Educational content only. All trademarks belong to their respective owners.
        </p>
      </div>
    </footer>
  );
}
