import { useMemo, useState } from 'react';
import { highlight, LANGUAGE_LABELS } from '../utils/highlight.js';

export default function CodeBlock({ fileName, filePath, language, code }) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(true);

  const html = useMemo(() => highlight(code, language), [code, language]);
  const label = LANGUAGE_LABELS[language] || (language || 'Text').toUpperCase();
  const displayPath = filePath && filePath !== fileName ? filePath : fileName;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code ?? '');
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = code ?? '';
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const downloadSingle = () => {
    const blob = new Blob([code ?? ''], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName || 'file.txt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 3000);
  };

  return (
    <section className="code-block">
      <header className="code-block__head">
        <div className="code-block__id">
          <span className="code-block__file" title={displayPath}>{displayPath}</span>
          <span className="code-block__lang">{label}</span>
        </div>
        <div className="code-block__actions">
          <button type="button" className="btn btn--xs" onClick={downloadSingle}>Download</button>
          <button
            type="button"
            className={copied ? 'btn btn--xs btn--success' : 'btn btn--xs btn--primary'}
            onClick={copy}
            aria-live="polite"
          >
            {copied ? 'Copied!' : 'Copy Code'}
          </button>
          <button
            type="button"
            className="btn btn--xs btn--ghost"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
          >
            {expanded ? 'Collapse' : 'Expand'}
          </button>
        </div>
      </header>

      {expanded && (
        <pre className="code-block__pre" tabIndex={0}>
          <code
            className={`language-${language || 'text'}`}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </pre>
      )}
    </section>
  );
}
