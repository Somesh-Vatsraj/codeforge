import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { api } from '../api/client.js';
import Seo from '../components/Seo.jsx';
import Spinner from '../components/Spinner.jsx';
import { useSettings } from '../store.jsx';

const PAGE_CONFIG = {
  about: {
    title: 'About',
    settingKey: null,
    fallback: `This site publishes free, hands-on coding tutorials and complete source-code projects for web developers.

Every tutorial is written and reviewed by humans. We focus on practical, build-along content: you get the full source code, a live preview where possible, and a downloadable project archive.

Our goal is simple — help you learn by building real things.`,
  },
  contact: { title: 'Contact', settingKey: null },
  'privacy-policy': { title: 'Privacy Policy', settingKey: 'privacy_policy' },
  terms: { title: 'Terms of Service', settingKey: 'terms' },
  disclaimer: { title: 'Disclaimer', settingKey: 'disclaimer' },
  'cookie-policy': { title: 'Cookie Policy', settingKey: 'cookie_policy' },
};

export default function Info({ page }) {
  const config = PAGE_CONFIG[page] || { title: 'Page', settingKey: null };
  const { settings } = useSettings();
  const location = useLocation();
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(!!config.settingKey);

  useEffect(() => {
    if (!config.settingKey) return;
    let cancelled = false;
    api.get('/settings')
      .then((data) => {
        if (cancelled) return;
        const raw = data.settings[config.settingKey] || '';
        setContent(raw || config.fallback || '');
      })
      .catch(() => { if (!cancelled) setContent(config.fallback || ''); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [config.settingKey, config.fallback]);

  return (
    <div className="container section info-page">
      <Seo title={config.title} description={`${config.title} for ${settings.site_name}.`} canonical={location.pathname} />

      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link to="/">Home</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{config.title}</span>
      </nav>

      <header className="page-head">
        <h1>{config.title}</h1>
        <p className="muted small">
          Last updated: {new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long' })}
        </p>
      </header>

      {page === 'about' && (
        <div className="article-content">
          <p>{config.fallback}</p>
          <h2>What you will find here</h2>
          <ul>
            <li>Step-by-step tutorials with complete, runnable source code</li>
            <li>Project walkthroughs across HTML, CSS, JavaScript and React</li>
            <li>Downloadable ZIP archives and live in-browser previews</li>
            <li>Search, categories and tags to find exactly what you need</li>
          </ul>
          <h2>Editorial standards</h2>
          <p>
            Every published article is reviewed before going live. We do not publish scraped,
            auto-generated or copied content. If you spot an error, please use the contact page so we
            can correct it.
          </p>
          <h2>Get in touch</h2>
          <p>
            Questions, corrections or partnership requests:{' '}
            <a href={`mailto:${settings.contact_email}`}>{settings.contact_email}</a>
          </p>
        </div>
      )}

      {page === 'contact' && (
        <div className="article-content">
          <p>
            We would love to hear from you. Use the address below for questions, corrections,
            content suggestions or takedown requests.
          </p>
          <h2>Email</h2>
          <p><a href={`mailto:${settings.contact_email}`}>{settings.contact_email}</a></p>
          <h2>Response time</h2>
          <p>We aim to reply within 2–3 business days.</p>
          <h2>Copyright &amp; DMCA</h2>
          <p>
            If you believe content on this site infringes your rights, email us with the URL, a
            description of the work, and your contact details. Verified requests are actioned
            promptly.
          </p>
        </div>
      )}

      {config.settingKey && (
        loading
          ? <Spinner label="Loading…" />
          : (
            <div
              className="article-content"
              dangerouslySetInnerHTML={{ __html: content || '<p>This page has not been configured yet.</p>' }}
            />
          )
      )}
    </div>
  );
}
