/* Builds a fully self-contained, sandbox-safe HTML document for Live Preview. */

const HTML_ENTRY_CANDIDATES = ['index.html', 'main.html', 'home.html', 'demo/index.html'];

function normalizePath(path) {
  return String(path || '')
    .replace(/^\.\//, '')
    .replace(/^\/+/, '')
    .trim();
}

function escapeClosingScript(code) {
  return String(code ?? '').replace(/<\/script>/gi, '<\\/script>');
}

function inlineStylesheets(html, fileMap) {
  return html.replace(
    /<link\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>/gi,
    (match, href) => {
      if (!/\.css(\?.*)?$/i.test(href)) return match;
      const file = fileMap.get(normalizePath(href));
      if (!file) return match;
      return `<style>\n${file.file_content}\n</style>`;
    },
  );
}

function inlineScripts(html, fileMap) {
  return html.replace(
    /<script\b([^>]*)\bsrc\s*=\s*["']([^"']+)["']([^>]*)>\s*<\/script>/gi,
    (match, pre, src, post) => {
      const file = fileMap.get(normalizePath(src));
      if (!file) return match;
      return `<script>\n${escapeClosingScript(file.file_content)}\n</script>`;
    },
  );
}

function inlineAssetReferences(html, fileMap) {
  return html.replace(
    /\b(src|href)\s*=\s*["']([^"']+)["']/gi,
    (match, attr, value) => {
      if (/^(https?:|data:|blob:|#|mailto:|tel:)/i.test(value)) return match;
      const file = fileMap.get(normalizePath(value));
      if (!file || !/\.(png|jpe?g|gif|webp|svg)$/i.test(value)) return match;
      const mime = /\.svg$/i.test(value) ? 'image/svg+xml'
        : /\.png$/i.test(value) ? 'image/png'
          : /\.gif$/i.test(value) ? 'image/gif'
            : /\.webp$/i.test(value) ? 'image/webp' : 'image/jpeg';
      const encoded = encodeURIComponent(file.file_content || '');
      return `${attr}="data:${mime};utf8,${encoded}"`;
    },
  );
}

/**
 * @param {Array<{file_path: string, file_content: string, file_type: string}>} demoFiles
 * @returns {string|null} A complete HTML document, or null when no HTML entry exists.
 */
export function buildPreviewDocument(demoFiles) {
  if (!Array.isArray(demoFiles) || demoFiles.length === 0) return null;

  const fileMap = new Map();
  for (const file of demoFiles) {
    fileMap.set(normalizePath(file.file_path), file);
  }

  let entry = null;
  for (const candidate of HTML_ENTRY_CANDIDATES) {
    if (fileMap.has(candidate)) { entry = fileMap.get(candidate); break; }
  }
  if (!entry) {
    entry = demoFiles.find((f) => /\.html?$/i.test(f.file_path || ''));
  }
  if (!entry) return null;

  let html = entry.file_content || '';
  html = inlineStylesheets(html, fileMap);
  html = inlineScripts(html, fileMap);
  html = inlineAssetReferences(html, fileMap);

  const safetyHead = `
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<base target="_blank">
<style>
  html, body { min-height: 100%; }
  body { margin: 0; font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
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
