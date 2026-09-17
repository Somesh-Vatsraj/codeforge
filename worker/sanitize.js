/**
 * Server-side HTML sanitizer built on Cloudflare's HTMLRewriter.
 * Runs on every write to `posts.article_content`.
 * Whitelist approach: unknown tags are unwrapped, dangerous tags removed.
 */

const ALLOWED_TAGS = new Set([
  'p', 'br', 'hr', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'strong', 'b', 'em', 'i', 'u', 's', 'mark', 'del', 'ins', 'sub', 'sup',
  'ul', 'ol', 'li', 'dl', 'dt', 'dd',
  'a', 'blockquote', 'cite', 'q',
  'pre', 'code', 'kbd', 'samp',
  'img', 'figure', 'figcaption',
  'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption', 'colgroup', 'col',
  'div', 'span', 'section', 'article', 'aside', 'details', 'summary',
  'iframe',
]);

const DROP_TAGS = new Set([
  'script', 'style', 'noscript', 'object', 'embed', 'form', 'input', 'button',
  'textarea', 'select', 'option', 'link', 'meta', 'base', 'svg', 'math',
  'template', 'frame', 'frameset', 'applet', 'audio', 'video', 'source',
]);

const GLOBAL_ATTRS = new Set(['class', 'id', 'title', 'dir', 'lang']);

const TAG_ATTRS = {
  a: new Set(['href', 'target', 'rel']),
  img: new Set(['src', 'alt', 'width', 'height', 'loading']),
  iframe: new Set(['src', 'width', 'height', 'allow', 'allowfullscreen', 'frameborder', 'loading']),
  td: new Set(['colspan', 'rowspan']),
  th: new Set(['colspan', 'rowspan', 'scope']),
  col: new Set(['span']),
  ol: new Set(['start', 'type']),
  code: new Set(['class']),
  pre: new Set(['class']),
  span: new Set(['class']),
  div: new Set(['class']),
};

const SAFE_DATA_IMAGE = /^data:image\/(png|jpe?g|gif|webp);base64,[a-z0-9+/=\s]+$/i;
const YOUTUBE_HOSTS = /^(www\.|m\.)?(youtube\.com|youtube-nocookie\.com)$/i;

function isSafeUrl(value, forIframe) {
  if (!value) return false;
  const v = String(value).trim();
  if (v.toLowerCase().startsWith('javascript:') || v.toLowerCase().startsWith('vbscript:')) return false;
  if (v.toLowerCase().startsWith('data:')) return !forIframe && SAFE_DATA_IMAGE.test(v);
  try {
    const url = new URL(v, 'https://relative.invalid');
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
    if (forIframe) return YOUTUBE_HOSTS.test(url.hostname);
    return true;
  } catch {
    return false;
  }
}

function readAttributes(el) {
  const out = [];
  // Cloudflare's HTMLRewriter exposes `attributes` as an iterator of [name, value].
  // Older/typed builds expose objects with { name, value } — handle both.
  for (const attr of el.attributes) {
    if (Array.isArray(attr)) out.push([attr[0], attr[1]]);
    else if (attr && typeof attr === 'object') out.push([attr.name, attr.value]);
  }
  return out;
}

export async function sanitizeArticle(html) {
  if (!html || typeof html !== 'string') return '';

  let rewriter = new HTMLRewriter();

  for (const tag of DROP_TAGS) {
    rewriter = rewriter.on(tag, {
      element(el) {
        el.remove();
      },
    });
  }

  rewriter = rewriter.on('*', {
    element(el) {
      const tag = el.tagName.toLowerCase();
      if (DROP_TAGS.has(tag)) return;

      if (!ALLOWED_TAGS.has(tag)) {
        el.removeAndKeepContent();
        return;
      }

      const allowedExtra = TAG_ATTRS[tag] || new Set();

      for (const [rawName, rawValue] of readAttributes(el)) {
        const name = String(rawName).toLowerCase();
        const value = String(rawValue ?? '');

        if (name.startsWith('on') || name === 'style') {
          el.removeAttribute(name);
          continue;
        }
        const allowed = GLOBAL_ATTRS.has(name) || allowedExtra.has(name);
        if (!allowed) {
          el.removeAttribute(name);
          continue;
        }
        if ((name === 'href' || name === 'src') && !isSafeUrl(value, tag === 'iframe')) {
          el.removeAttribute(name);
          continue;
        }
        if (name === 'class' && !['code', 'pre', 'span', 'div'].includes(tag)) {
          el.removeAttribute(name);
        }
      }

      if (tag === 'a') {
        el.setAttribute('rel', 'noopener noreferrer nofollow');
        el.setAttribute('target', '_blank');
      }
      if (tag === 'img') {
        el.setAttribute('loading', 'lazy');
        if (!el.getAttribute('alt')) el.setAttribute('alt', '');
      }
      if (tag === 'iframe') {
        el.setAttribute('loading', 'lazy');
        el.setAttribute('allowfullscreen', '');
        el.setAttribute('frameborder', '0');
      }
    },
  });

  const transformed = rewriter.transform(
    new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8' } }),
  );
  return await transformed.text();
}

export function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
