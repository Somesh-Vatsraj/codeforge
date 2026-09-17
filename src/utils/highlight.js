function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const JS_KEYWORDS = 'const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|new|class|extends|super|this|import|from|export|default|async|await|try|catch|finally|throw|typeof|instanceof|null|undefined|true|false|of|in|delete|void|yield|static|get|set';

const JS_RE = new RegExp(
  `(\\/\\/[^\\n]*|\\/\\*[\\s\\S]*?\\*\\/)|("(?:\\\\.|[^"\\\\])*"|'(?:\\\\.|[^'\\\\])*'|\`(?:\\\\.|[^\`\\\\])*\`)|\\b(${JS_KEYWORDS})\\b|\\b(\\d+\\.?\\d*)\\b`,
  'g',
);

function highlightJs(code) {
  return escapeHtml(code).replace(JS_RE, (match, comment, str, keyword, num, offset, full) => {
    // Guard against matching inside already-inserted markup.
    const before = full.slice(0, offset);
    if (before.lastIndexOf('<span') > before.lastIndexOf('</span>')) return match;
    if (comment) return `<span class="tok-comment">${comment}</span>`;
    if (str) return `<span class="tok-string">${str}</span>`;
    if (keyword) return `<span class="tok-keyword">${keyword}</span>`;
    if (num) return `<span class="tok-number">${num}</span>`;
    return match;
  });
}

function highlightHtml(code) {
  let out = escapeHtml(code);
  out = out.replace(/(&lt;!--[\s\S]*?--&gt;)/g, '<span class="tok-comment">$1</span>');
  out = out.replace(/(&lt;\/?)([a-zA-Z][\w:-]*)/g, '$1<span class="tok-tag">$2</span>');
  out = out.replace(/([a-zA-Z_:][\w:.-]*)=(&quot;[^&]*&quot;|&#39;[^&]*&#39;)/g, '<span class="tok-attr">$1</span>=<span class="tok-string">$2</span>');
  return out;
}

function highlightCss(code) {
  let out = escapeHtml(code);
  out = out.replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="tok-comment">$1</span>');
  out = out.replace(/(^|[};])([^{}@]*?)(\{)/g, (m, pre, selector, brace) => {
    if (/<span/.test(selector)) return m;
    return `${pre}<span class="tok-selector">${selector}</span>${brace}`;
  });
  out = out.replace(/([a-z-]+)(\s*:)(?![^<]*<\/span>)/g, '<span class="tok-prop">$1</span>$2');
  out = out.replace(/(:\s*)([^;<{}]+)(;)/g, (m, colon, value, semi) => {
    if (/<span/.test(value)) return m;
    return `${colon}<span class="tok-value">${value}</span>${semi}`;
  });
  return out;
}

function highlightJson(code) {
  let out = escapeHtml(code);
  out = out.replace(/(&quot;[^&]*?&quot;)(\s*:)/g, '<span class="tok-prop">$1</span>$2');
  out = out.replace(/(:\s*)(&quot;[^&]*?&quot;)/g, '$1<span class="tok-string">$2</span>');
  out = out.replace(/\b(true|false|null)\b/g, '<span class="tok-keyword">$1</span>');
  out = out.replace(/(:\s*)(-?\d+\.?\d*)/g, '$1<span class="tok-number">$2</span>');
  return out;
}

/**
 * Returns syntax-highlighted HTML. Falls back to escaped plain text
 * for languages without a dedicated highlighter.
 */
export function highlight(code, language) {
  const lang = String(language || '').toLowerCase();
  const source = code ?? '';

  switch (lang) {
    case 'js': case 'javascript': case 'jsx': case 'ts': case 'typescript':
      return highlightJs(source);
    case 'html': case 'xml': case 'svg': case 'vue': case 'php':
      return highlightHtml(source);
    case 'css': case 'scss': case 'less':
      return highlightCss(source);
    case 'json':
      return highlightJson(source);
    default:
      return escapeHtml(source);
  }
}

export const LANGUAGE_LABELS = {
  html: 'HTML', css: 'CSS', scss: 'SCSS', js: 'JavaScript', javascript: 'JavaScript',
  jsx: 'JSX', ts: 'TypeScript', typescript: 'TypeScript', json: 'JSON', php: 'PHP',
  sql: 'SQL', md: 'Markdown', text: 'Text', xml: 'XML', yaml: 'YAML', sh: 'Shell',
};
