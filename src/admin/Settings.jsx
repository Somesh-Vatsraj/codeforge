import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { useSettings } from '../store.jsx';
import Spinner from '../components/Spinner.jsx';

const GROUPS = [
  {
    title: 'Site',
    fields: [
      ['site_name', 'Site name', 'text'],
      ['site_description', 'Site description', 'textarea'],
      ['logo_url', 'Logo URL', 'text'],
      ['favicon_url', 'Favicon URL', 'text'],
      ['author_name', 'Default author name', 'text'],
      ['contact_email', 'Contact email', 'email'],
      ['footer_text', 'Footer text', 'textarea'],
    ],
  },
  {
    title: 'Social links',
    fields: [
      ['social_twitter', 'Twitter / X URL', 'url'],
      ['social_github', 'GitHub URL', 'url'],
      ['social_youtube', 'YouTube URL', 'url'],
      ['social_facebook', 'Facebook URL', 'url'],
      ['social_instagram', 'Instagram URL', 'url'],
      ['youtube_channel', 'YouTube channel URL', 'url'],
    ],
  },
  {
    title: 'SEO defaults',
    fields: [
      ['seo_default_title', 'Default title', 'text'],
      ['seo_default_description', 'Default description', 'textarea'],
    ],
  },
  {
    title: 'Comments',
    hint: 'Turn comments on or off site-wide. Auto-approve publishes new comments immediately; otherwise they wait for review in the Comments section.',
    fields: [
      ['comments_enabled', 'Enable comments', 'toggle'],
      ['comments_auto_approve', 'Auto-approve new comments', 'toggle'],
    ],
  },
  {
    title: 'Google AdSense',
    hint: 'Ads are only rendered when ads are enabled AND a publisher ID plus slot IDs are set.',
    fields: [
      ['ads_enabled', 'Enable ads', 'toggle'],
      ['adsense_publisher_id', 'Publisher ID (ca-pub-…)', 'text'],
      ['adsense_slot_home', 'Homepage slot ID', 'text'],
      ['adsense_slot_post_top', 'Post page — top slot ID', 'text'],
      ['adsense_slot_post_bottom', 'Post page — bottom/sidebar slot ID', 'text'],
      ['ads_txt', 'ads.txt content', 'textarea'],
    ],
  },
  {
    title: 'Legal pages',
    hint: 'These render on /privacy-policy, /terms, /disclaimer and /cookie-policy. Basic HTML is allowed.',
    fields: [
      ['privacy_policy', 'Privacy Policy', 'html'],
      ['terms', 'Terms of Service', 'html'],
      ['disclaimer', 'Disclaimer', 'html'],
      ['cookie_policy', 'Cookie Policy', 'html'],
    ],
  },
];

export default function Settings() {
  const { setSettings: setGlobalSettings } = useSettings();
  const [values, setValues] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const [pw, setPw] = useState({ current_password: '', new_password: '', confirm: '' });
  const [pwNotice, setPwNotice] = useState('');

  useEffect(() => {
    api.get('/admin/settings')
      .then((data) => setValues(data.settings))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const setField = (key, value) => setValues((prev) => ({ ...prev, [key]: value }));

  const save = async () => {
    setSaving(true);
    setNotice('');
    setError('');
    try {
      await api.post('/admin/settings', values);
      setGlobalSettings((prev) => ({ ...prev, ...values }));
      setNotice('Settings saved.');
      setTimeout(() => setNotice(''), 3000);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async (event) => {
    event.preventDefault();
    setPwNotice('');
    if (pw.new_password.length < 10) { setPwNotice('New password must be at least 10 characters.'); return; }
    if (pw.new_password !== pw.confirm) { setPwNotice('Passwords do not match.'); return; }
    try {
      await api.post('/admin/password', {
        current_password: pw.current_password,
        new_password: pw.new_password,
      });
      setPw({ current_password: '', new_password: '', confirm: '' });
      setPwNotice('Password updated.');
    } catch (e) {
      setPwNotice(e.message);
    }
  };

  if (loading) return <div className="admin-page"><Spinner label="Loading settings…" /></div>;

  return (
    <div className="admin-page">
      <header className="admin-page__head">
        <h1>Settings</h1>
        <button type="button" className="btn btn--primary" onClick={save} disabled={saving}>
          {saving ? 'Saving…' : 'Save all settings'}
        </button>
      </header>

      {error && <p className="alert alert--error">{error}</p>}
      {notice && <p className="alert alert--success">{notice}</p>}

      {GROUPS.map((group) => (
        <section className="admin-panel" key={group.title}>
          <h2>{group.title}</h2>
          {group.hint && <p className="muted small">{group.hint}</p>}

          <div className="form-grid">
            {group.fields.map(([key, label, type]) => (
              <Field
                key={key}
                label={label}
                type={type}
                value={values[key] ?? ''}
                onChange={(v) => setField(key, v)}
                span={(type === 'textarea' || type === 'html') ? 2 : 1}
              />
            ))}
          </div>
        </section>
      ))}

      <section className="admin-panel">
        <h2>Change password</h2>
        {pwNotice && <p className="alert alert--info">{pwNotice}</p>}
        <form className="form form--inline" onSubmit={changePassword}>
          <label>
            Current password
            <input
              type="password"
              value={pw.current_password}
              onChange={(e) => setPw({ ...pw, current_password: e.target.value })}
              required
              autoComplete="current-password"
            />
          </label>
          <label>
            New password
            <input
              type="password"
              value={pw.new_password}
              onChange={(e) => setPw({ ...pw, new_password: e.target.value })}
              required
              minLength={10}
              autoComplete="new-password"
            />
          </label>
          <label>
            Confirm new password
            <input
              type="password"
              value={pw.confirm}
              onChange={(e) => setPw({ ...pw, confirm: e.target.value })}
              required
              minLength={10}
              autoComplete="new-password"
            />
          </label>
          <button type="submit" className="btn btn--primary">Update password</button>
        </form>
      </section>
    </div>
  );
}

function Field({ label, type, value, onChange, span = 1 }) {
  const className = span === 2 ? 'span-2' : '';

  if (type === 'toggle') {
    return (
      <label className={`switch ${className}`}>
        <input
          type="checkbox"
          checked={value === '1' || value === 'true'}
          onChange={(e) => onChange(e.target.checked ? '1' : '0')}
        />
        <span>{label}</span>
      </label>
    );
  }

  if (type === 'textarea' || type === 'html') {
    return (
      <label className={className}>
        {label}
        <textarea
          rows={type === 'html' ? 12 : 3}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          spellCheck={type === 'textarea'}
        />
      </label>
    );
  }

  return (
    <label className={className}>
      {label}
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}
