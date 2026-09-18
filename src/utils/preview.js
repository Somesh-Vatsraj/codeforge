/* ============================================================
   Live Preview — build a self-contained sandboxed HTML document.
   Robust path matching so that a demo file like "style.css"
   still resolves when the HTML references "css/style.css".
   ============================================================ */

const HTML_ENTRY_CANDIDATES = [
  'index.html',
  'main.html',
  'home.html',
  'demo/index.html',
];

/* ---------- path helpers ---------- */

function cleanPath(path) {
  return String(path || '')
    .split('?')[0]
    .split('#')[0]
    .replace(/^\.\//, '')
    .replace(/^\/+/, '')
    .replace(/^\.\.\//, '')
    .trim();
}

function pathVariants(path) {
  const p = cleanPath(path);
  const variants = new Set();
  if (!p) return variants;

  variants.add(p);
  variants.add(p.toLowerCase());
  variants.add(p.replace(/\\/g, '/'));
  variants.add(p.replace(/\\/g, '/').toLowerCase());

  // Basename variants (files in same folder or different folder)
  const base = p.split('/').pop();
  if (base) {
    variants.add(base);
    variants.add(base.toLowerCase());
  }

  // Strip leading folder(s) progressively
  const parts = p.split('/');
  for (let i = 1; i < parts.length; i += 1) {
    const rest = parts.slice(i).join('/');
    variants.add(rest);
    variants.add(rest.toLowerCase());
  }

  return variants;
}

/**
 * Build a multi-key Map from demo files so any reasonable path reference
 * can find its file. Every file is registered under all path variants.
 */
function buildFileMap(files) {
  const map = new Map();
  for (const file of files) {
    const variants = pathVariants(file.file_path);
    for (const key of variants) {
      // Do not overwrite a previous entry — first registered wins (exact path preferred)
      if (!map.has(key)) map.set(key, file);
    }
    // Also register under file_name if present
    const name = cleanPath(file.file_name);
    if (name) {
      if (!map.has(name)) map.set(name, file);
      const lower = name.toLowerCase();
      if (!map.has(lower)) map.set(lower, file);
    }
  }
  return map;
}

function resolveFile(fileMap, ref) {
  if (!ref) return null;
  const variants = pathVariants(ref);
  for (const key of variants) {
    if (fileMap.has(key)) return fileMap.get(key);
  }
  return null;
}

/* ---------- inlining helpers ---------- */

function escapeClosingScript(code) {
  return String(code ?? '').replace(/<\/script>/gi, '<\\/script>');
}

function escapeStyleContent(css) {
  // Prevent </style> inside CSS from closing the parent tag
  return String(css ?? '').replace(/<\/style>/gi, '<\\/style>');
}

function inlineStylesheets(html, fileMap) {
  return html.replace(
    /<link\b[^>]*>/gi,
    (tag) => {
      // extract href
      const m = tag.match(/\bhref\s*=\s*["']([^"']+)["']/i);
      if (!m) return tag;
      const href = m[1];

      // only process .css links (or links with no extension that look like css)
      if (!/\.css(\?.*)?$/i.test(href)) return tag;

      const file = resolveFile(fileMap, href);
      if (!file) {
        // Leave a console hint so the admin can spot the problem
        if (typeof console !== 'undefined') {
          console.warn(`[Live Preview] CSS not found for reference: "${href}". Demo files available:`,
            [...fileMap.keys()]);
        }
        return tag;
      }

      const css = file.file_content ?? file.code_content ?? '';
      return `<style data-inlined-from="${href}">\n${escapeStyleContent(css)}\n</style>`;
    },
  );
}

function inlineScripts(html, fileMap) {
  return html.replace(
    /<script\b([^>]*)\bsrc\s*=\s*["']([^"']+)["']([^>]*)>\s*<\/script>/gi,
    (match, pre, src, post) => {
      const file = resolveFile(fileMap, src);
      if (!file) {
        if (typeof console !== 'undefined') {
          console.warn(`[Live Preview] JS not found for reference: "${src}".`);
        }
        return match;
      }
      const js = file.file_content ?? file.code_content ?? '';
      return `<script data-inlined-from="${src}">\n${escapeClosingScript(js)}\n</script>`;
    },
  );
}

function inlineAssetReferences(html, fileMap) {
  return html.replace(
    /\b(src|href)\s*=\s*["']([^"']+)["']/gi,
    (match, attr, value) => {
      // Skip absolute URLs, data, blobs, anchors, mailto, tel
      if (/^(https?:|data:|blob:|#|mailto:|tel:)/i.test(value)) return match;
      // Only inline images here
      if (!/\.(png|jpe?g|gif|webp|svg)$/i.test(value)) return match;

      const file = resolveFile(fileMap, value);
      if (!file) return match;

      const content = file.file_content ?? file.code_content ?? '';
      const mime = /\.svg$/i.test(value) ? 'image/svg+xml'
        : /\.png$/i.test(value) ? 'image/png'
          : /\.gif$/i.test(value) ? 'image/gif'
            : /\.webp$/i.test(value) ? 'image/webp'
              : 'image/jpeg';

      // If the content already looks like a data URL, use it directly.
      if (/^data:/i.test(content)) {
        return `${attr}="${content}"`;
      }
      // Otherwise embed as UTF-8 data URL
      const encoded = encodeURIComponent(content);
      return `${attr}="data:${mime};utf8,${encoded}"`;
    },
  );
}

/* ---------- main builder ---------- */

export function buildPreviewDocument(demoFiles, mode = 'desktop') {
  if (!Array.isArray(demoFiles) || demoFiles.length === 0) return null;

  const fileMap = buildFileMap(demoFiles);

  // Find the entry HTML file
  let entry = null;
  for (const candidate of HTML_ENTRY_CANDIDATES) {
    const found = resolveFile(fileMap, candidate);
    if (found) { entry = found; break; }
  }
  if (!entry) {
    entry = demoFiles.find((f) => /\.html?$/i.test(f.file_path || f.file_name || ''));
  }
  if (!entry) return null;

  let html = entry.file_content ?? entry.code_content ?? '';

  // Inline CSS, JS and images
  html = inlineStylesheets(html, fileMap);
  html = inlineScripts(html, fileMap);
  html = inlineAssetReferences(html, fileMap);

  // Build the safety head (viewport + minor resets)
  const viewportContent = mode === 'mobile'
    ? 'width=device-width, initial-scale=1, maximum-scale=3'
    : 'width=1024, initial-scale=1, maximum-scale=1, user-scalable=no';

  const safetyHead = `
<meta charset="utf-8">
<meta name="viewport" content="${viewportContent}">
<base target="_blank">
<style>
  html { min-height: 100%; }
  body {
    margin: 0;
    min-height: 100vh;
    font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    -webkit-text-size-adjust: 100%;
  }
  ::-webkit-scrollbar { width: 8px; height: 8px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb {
    background: rgba(0,0,0,.2);
    border-radius: 4px;
  }
</style>
`;

  if (/<head[^>]*>/i.test(html)) {
    html = html.replace(/<head([^>]*)>/i, (m, attrs) => `<head${attrs}>${safetyHead}`);
  } else if (/<html[^>]*>/i.test(html)) {
    html = html.replace(/<html([^>]*)>/i, (m, attrs) => `<html${attrs}><head>${safetyHead}</head>`);
  } else {
    html = `<!doctype html><html><head>${safetyHead}</head><body>${html}</body></html>`;
  }

  return html;
}

/* ---------- developer debug helper ---------- */

export function debugDemoFiles(demoFiles) {
  if (!Array.isArray(demoFiles)) {
    console.log('[Live Preview Debug] demoFiles is not an array:', demoFiles);
    return;
  }
  console.log('[Live Preview Debug] demo file paths:',
    demoFiles.map((f) => f.file_path));
  const map = buildFileMap(demoFiles);
  console.log('[Live Preview Debug] all resolvable keys:', [...map.keys()]);
}