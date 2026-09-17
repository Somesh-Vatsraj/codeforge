import { useEffect } from 'react';
import { useSettings } from '../store.jsx';

function upsertMeta(attr, key, content) {
  if (!content) return;
  let tag = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute(attr, key);
    document.head.appendChild(tag);
  }
  tag.setAttribute('content', content);
}

function upsertLink(rel, href) {
  if (!href) return;
  let tag = document.head.querySelector(`link[rel="${rel}"]`);
  if (!tag) {
    tag = document.createElement('link');
    tag.setAttribute('rel', rel);
    document.head.appendChild(tag);
  }
  tag.setAttribute('href', href);
}

/**
 * Client-side SEO. The Worker already injects these tags into the HTML shell
 * for `/project/:slug`, so this keeps them correct during client-side navigation.
 */
export default function Seo({ title, description, image, canonical, type = 'website', keywords, jsonLd }) {
  const { settings } = useSettings();

  useEffect(() => {
    const siteName = settings.site_name || 'CodeForge';
    const fullTitle = title ? `${title} | ${siteName}` : (settings.seo_default_title || siteName);
    const desc = description || settings.seo_default_description || settings.site_description || '';
    const origin = window.location.origin;
    const url = canonical ? (canonical.startsWith('http') ? canonical : origin + canonical) : window.location.href;
    const img = image ? (image.startsWith('http') ? image : origin + image) : `${origin}/favicon.svg`;

    document.title = fullTitle;

    upsertMeta('name', 'description', desc);
    if (keywords) upsertMeta('name', 'keywords', keywords);

    upsertMeta('property', 'og:title', fullTitle);
    upsertMeta('property', 'og:description', desc);
    upsertMeta('property', 'og:image', img);
    upsertMeta('property', 'og:url', url);
    upsertMeta('property', 'og:type', type);
    upsertMeta('property', 'og:site_name', siteName);

    upsertMeta('name', 'twitter:card', 'summary_large_image');
    upsertMeta('name', 'twitter:title', fullTitle);
    upsertMeta('name', 'twitter:description', desc);
    upsertMeta('name', 'twitter:image', img);

    upsertLink('canonical', url);

    const script = document.getElementById('ld-json');
    if (script) script.textContent = jsonLd ? JSON.stringify(jsonLd) : '';
  }, [title, description, image, canonical, type, keywords, jsonLd, settings]);

  return null;
}
