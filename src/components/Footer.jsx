import { Link } from 'react-router-dom';
import { useSettings } from '../store.jsx';

export default function Footer() {
  const { settings } = useSettings();
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="container">
        <div className="site-footer__grid">
          <div>
            <div className="site-footer__brand">
              <span className="brand__mark" aria-hidden="true">{"</>"}</span>
              <span className="brand__name">{settings.site_name}</span>
            </div>
            <h3>ABOUT US</h3>
            <p>
              {settings.site_name} is a blog dedicated to providing valuable and informative
              content about web development technologies such as HTML, CSS, JavaScript, React,
              and more.
            </p>
            <Link to="/about">Read more →</Link>
          </div>

          <div>
            <h3>FOLLOW US</h3>
            <ul className="social-list">
              {settings.social_facebook && (
                <li><a href={settings.social_facebook} target="_blank" rel="noopener noreferrer" aria-label="Facebook">f</a></li>
              )}
              {settings.social_twitter && (
                <li><a href={settings.social_twitter} target="_blank" rel="noopener noreferrer" aria-label="Twitter">𝕏</a></li>
              )}
              {settings.social_github && (
                <li><a href={settings.social_github} target="_blank" rel="noopener noreferrer" aria-label="GitHub">◉</a></li>
              )}
              {settings.social_youtube && (
                <li><a href={settings.social_youtube} target="_blank" rel="noopener noreferrer" aria-label="YouTube">▶</a></li>
              )}
              {!settings.social_facebook && !settings.social_twitter && !settings.social_youtube && (
                <>
                  <li><a href="#facebook" aria-label="Facebook">f</a></li>
                  <li><a href="#instagram" aria-label="Instagram">◉</a></li>
                  <li><a href="#youtube" aria-label="YouTube">▶</a></li>
                </>
              )}
            </ul>
          </div>

          <div>
            <h3>QUICK LINKS</h3>
            <ul>
              <li><Link to="/about">About Us</Link></li>
              <li><Link to="/contact">Contact Us</Link></li>
              <li><Link to="/privacy-policy">Privacy Policy</Link></li>
              <li><Link to="/terms">Terms &amp; Conditions</Link></li>
              <li><Link to="/disclaimer">Disclaimer</Link></li>
            </ul>
          </div>
        </div>

        <div className="site-footer__bottom">
          <p>Copyright © {year} {settings.site_name}. All Rights Reserved.</p>
          <div className="footer-links">
            <Link to="/about">About Us</Link>
            <Link to="/terms">Terms &amp; Conditions</Link>
            <Link to="/privacy-policy">Privacy Policy</Link>
            <Link to="/contact">Contact Us</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
