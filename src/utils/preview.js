/* ============================================================
   Live Preview builder
   - Inlines CSS from <link> tags
   - Inlines JS from <script src> tags
   - Converts local images to data URLs
   - Injects a storage shim so sandboxed iframe doesn't crash
     on localStorage / sessionStorage access
   ============================================================ */

const HTML_ENTRY_CANDIDATES = [
  'index.html',
  'main.html',
  'home.html',
  'demo/index.html',
  'src/index.html',
];

/* -------------------- helpers -------------------- */

function normalizePath(path) {
  return String(path || '')
    .replace(/^\.\//, '')
    .replace(/^\/+/, '')
    .replace(/\/+/g, '/')
    .trim();
}

function stripQueryHash(p) {
  return String(p || '').split('#')[0].split('?')[0];
}

/**
 * Robust file lookup. Tries:
 *   1. Exact normalized path
 *   2. Path without query/hash
 *   3. Basename match (last segment)
 */
function findFile(fileMap, refPath) {
  if (!refPath) return null;

  const cleaned = stripQueryHash(refPath);
  const normalized = normalizePath(cleaned);

  // 1. Exact match
  if (fileMap.has(normalized)) return fileMap.get(normalized);

  // 2. Match without leading ./
  const alt = normalizePath(refPath);
  if (fileMap.has(alt)) return fileMap.get(alt);

  // 3. Basename match
  const base = normalized.split('/').pop();
  if (!base) return null;

  for (const [key, value] of fileMap.entries()) {
    const keyBase = key.split('/').pop();
    if (keyBase === base) return value;
  }

  return null;
}

function escapeClosingScript(code) {
  return String(code ?? '').replace(/<\/script>/gi, '<\\/script>');
}

function escapeClosingStyle(code) {
  return String(code ?? '').replace(/<\/style>/gi, '<\\/style>');
}

/* -------------------- inliners -------------------- */

function inlineStylesheets(html, fileMap) {
  return html.replace(
    /<link\b[^>]*\brel\s*=\s*["']stylesheet["'][^>]*>/gi,
    (match) => {
      const hrefMatch = match.match(/\bhref\s*=\s*["']([^"']+)["']/i);
      if (!hrefMatch) return match;
      const href = hrefMatch[1];

      const file = findFile(fileMap, href);
      if (!file) return match;

      const css = escapeClosingStyle(file.file_content || '');
      return `<style data-inlined-from="${href}">\n${css}\n</style>`;
    },
  );
}

function inlineScripts(html, fileMap) {
  return html.replace(
    /<script\b([^>]*)\bsrc\s*=\s*["']([^"']+)["']([^>]*)>\s*<\/script>/gi,
    (match, pre, src, post) => {
      const file = findFile(fileMap, src);
      if (!file) return match;

      const js = escapeClosingScript(file.file_content || '');
      return `<script data-inlined-from="${src}">\n${js}\n</script>`;
    },
  );
}

function mimeForFile(path) {
  const ext = String(path).toLowerCase().split('.').pop();
  switch (ext) {
    case 'svg': return 'image/svg+xml';
    case 'png': return 'image/png';
    case 'jpg':
    case 'jpeg': return 'image/jpeg';
    case 'gif': return 'image/gif';
    case 'webp': return 'image/webp';
    case 'ico': return 'image/x-icon';
    default: return 'image/png';
  }
}

function inlineImages(html, fileMap) {
  return html.replace(
    /\b(src|href)\s*=\s*["']([^"']+)["']/gi,
    (match, attr, value) => {
      if (/^(https?:|data:|blob:|#|mailto:|tel:|javascript:)/i.test(value)) {
        return match;
      }
      if (!/\.(png|jpe?g|gif|webp|svg|ico)$/i.test(value)) return match;

      const file = findFile(fileMap, value);
      if (!file) return match;

      const mime = mimeForFile(value);
      const raw = file.file_content || '';

      // SVG: pass through as data URL (URL-encoded, not base64)
      if (mime === 'image/svg+xml') {
        const encoded = encodeURIComponent(raw).replace(/'/g, '%27');
        return `${attr}="data:${mime};utf8,${encoded}"`;
      }

      // Other images: assume base64 stored
      const encoded = String(raw).replace(/\s+/g, '');
      return `${attr}="data:${mime};base64,${encoded}"`;
    },
  );
}

/* -------------------- storage shim -------------------- */

const STORAGE_SHIM = `
<script>
(function () {
  function inMemoryStorage() {
    var store = {};
    return {
      getItem: function (k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
      setItem: function (k, v) { store[k] = String(v); },
      removeItem: function (k) { delete store[k]; },
      clear: function () { store = {}; },
      key: function (i) { return Object.keys(store)[i] || null; },
      get length() { return Object.keys(store).length; }
    };
  }

  function isWorking(storage) {
    try {
      var k = '__ls_test__';
      storage.setItem(k, '1');
      storage.removeItem(k);
      return true;
    } catch (e) {
      return false;
    }
  }

  // localStorage
  var lsOk = false;
  try { lsOk = isWorking(window.localStorage); } catch (e) { lsOk = false; }
  if (!lsOk) {
    try {
      Object.defineProperty(window, 'localStorage', {
        value: inMemoryStorage(), configurable: true, writable: true
      });
    } catch (e) {
      try { window.localStorage = inMemoryStorage(); } catch (e2) {}
    }
  }

  // sessionStorage
  var ssOk = false;
  try { ssOk = isWorking(window.sessionStorage); } catch (e) { ssOk = false; }
  if (!ssOk) {
    try {
      Object.defineProperty(window, 'sessionStorage', {
        value: inMemoryStorage(), configurable: true, writable: true
      });
    } catch (e) {
      try { window.sessionStorage = inMemoryStorage(); } catch (e2) {}
    }
  }

  // Suppress noisy cookie errors in sandboxed context
  try {
    var _cookieGet = function () { return ''; };
    var _cookieSet = function () { return ''; };
    if (!document.__cookieShimmed) {
      try {
        Object.defineProperty(document, 'cookie', {
          configurable: true,
          get: _cookieGet,
          set: _cookieSet
        });
        document.__cookieShimmed = true;
      } catch (e) {}
    }
  } catch (e) {}

  // Capture errors so they don't spam user (optional — comment out to see)
  // window.addEventListener('error', function (e) { e.preventDefault(); });
})();
</script>
`;

/* -------------------- main builder -------------------- */

/**
 * @param {Array<{file_path: string, file_content: string, file_type: string}>} demoFiles
 * @returns {string|null} Complete HTML document or null when no entry found
 */
export function buildPreviewDocument(demoFiles) {
  if (!Array.isArray(demoFiles) || demoFiles.length === 0) return null;

  // Build normalized file map
  const fileMap = new Map();
  for (const file of demoFiles) {
    const key = normalizePath(file.file_path);
    fileMap.set(key, file);
    // Also store basename for fallback matching
    const base = key.split('/').pop();
    if (base && !fileMap.has(base)) fileMap.set(base, file);
  }

  // Find HTML entry
  let entry = null;
  for (const candidate of HTML_ENTRY_CANDIDATES) {
    const f = fileMap.get(candidate);
    if (f) { entry = f; break; }
  }
  if (!entry) {
    entry = demoFiles.find((f) => /\.html?$/i.test(f.file_path || ''));
  }
  if (!entry) return null;

  let html = entry.file_content || '';

  // Inline external resources
  html = inlineStylesheets(html, fileMap);
  html = inlineScripts(html, fileMap);
  html = inlineImages(html, fileMap);

  // Safety head — charset, viewport, base
  const safetyHead = `
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<base target="_blank">
<style>
  html { min-height: 100%; }
  body { margin: 0; font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
</style>
`;

  // Inject storage shim FIRST (before any other script)
  // so app code sees safe localStorage/sessionStorage
  const fullHead = safetyHead + STORAGE_SHIM;

  if (/<head[^>]*>/i.test(html)) {
    html = html.replace(/<head([^>]*)>/i, (m, attrs) => `<head${attrs}>${fullHead}`);
  } else if (/<html[^>]*>/i.test(html)) {
    html = html.replace(/<html([^>]*)>/i, (m, attrs) => `<html${attrs}><head>${fullHead}</head>`);
  } else {
    html = `<!doctype html><html><head>${fullHead}</head><body>${html}</body></html>`;
  }

  return html;
}