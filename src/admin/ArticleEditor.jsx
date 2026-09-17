import { useEffect, useRef } from 'react';

const BLOCK_OPTIONS = [
  ['p', 'Paragraph'],
  ['h2', 'Heading 2'],
  ['h3', 'Heading 3'],
  ['h4', 'Heading 4'],
  ['blockquote', 'Quote'],
  ['pre', 'Code block'],
];

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Lightweight rich-text editor built on contentEditable + execCommand.
 * No external editor library. Output is HTML, sanitized server-side on save.
 */
export default function ArticleEditor({ value, onChange }) {
  const ref = useRef(null);

  // Sync external value in without clobbering the caret while typing.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (document.activeElement === el) return;
    if (el.innerHTML !== (value || '')) el.innerHTML = value || '';
  }, [value]);

  const exec = (command, arg = null) => {
    ref.current?.focus();
    document.execCommand(command, false, arg);
    onChange(ref.current.innerHTML);
  };

  const insertHtml = (html) => {
    ref.current?.focus();
    document.execCommand('insertHTML', false, html);
    onChange(ref.current.innerHTML);
  };

  const tools = [
    ['Bold', () => exec('bold'), 'B'],
    ['Italic', () => exec('italic'), 'I'],
    ['Underline', () => exec('underline'), 'U'],
    ['Strikethrough', () => exec('strikeThrough'), 'S'],
  ];

  return (
    <div className="editor">
      <div className="editor__toolbar" role="toolbar" aria-label="Formatting">
        {tools.map(([label, action, glyph]) => (
          <button
            key={label}
            type="button"
            className="editor__btn editor__btn--glyph"
            onMouseDown={(e) => e.preventDefault()}
            onClick={action}
            title={label}
            aria-label={label}
          >
            {glyph}
          </button>
        ))}

        <span className="editor__sep" aria-hidden="true" />

        <select
          className="editor__select"
          onChange={(e) => { exec('formatBlock', e.target.value); e.target.value = ''; }}
          defaultValue=""
          aria-label="Block style"
        >
          <option value="" disabled>Block style…</option>
          {BLOCK_OPTIONS.map(([tag, label]) => (
            <option key={tag} value={tag}>{label}</option>
          ))}
        </select>

        <span className="editor__sep" aria-hidden="true" />

        <button
          type="button"
          className="editor__btn"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => exec('insertUnorderedList')}
          title="Bulleted list"
        >
          • List
        </button>
        <button
          type="button"
          className="editor__btn"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => exec('insertOrderedList')}
          title="Numbered list"
        >
          1. List
        </button>

        <span className="editor__sep" aria-hidden="true" />

        <button
          type="button"
          className="editor__btn"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            const url = window.prompt('Link URL (https://…)');
            if (!url) return;
            exec('createLink', url);
          }}
        >
          🔗 Link
        </button>

        <button
          type="button"
          className="editor__btn"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            const url = window.prompt('Image URL (https://… or /api/uploads/…)');
            if (!url) return;
            const alt = window.prompt('Alt text (for accessibility)') || '';
            insertHtml(`<img src="${escapeHtml(url)}" alt="${escapeHtml(alt)}" loading="lazy" />`);
          }}
        >
          🖼 Image
        </button>

        <button
          type="button"
          className="editor__btn"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            const code = window.prompt('Paste the code for this block:');
            if (!code) return;
            insertHtml(`<pre><code>${escapeHtml(code)}</code></pre><p><br></p>`);
          }}
        >
          {'</>'} Code
        </button>

        <button
          type="button"
          className="editor__btn"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            const url = window.prompt('YouTube URL');
            if (!url) return;
            const match = url.match(/(?:v=|\/embed\/|youtu\.be\/|\/shorts\/)([A-Za-z0-9_-]{6,20})/);
            const id = match ? match[1] : null;
            if (!id) { window.alert('Could not read a YouTube video ID from that URL.'); return; }
            insertHtml(
              `<div class="video-frame"><iframe src="https://www.youtube-nocookie.com/embed/${id}" title="YouTube video" loading="lazy" allowfullscreen></iframe></div><p><br></p>`,
            );
          }}
        >
          ▶ YouTube
        </button>

        <button
          type="button"
          className="editor__btn"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            const rows = parseInt(window.prompt('Number of rows?', '3') || '0', 10);
            const cols = parseInt(window.prompt('Number of columns?', '3') || '0', 10);
            if (!rows || !cols) return;
            let html = '<table><thead><tr>';
            for (let c = 0; c < cols; c += 1) html += `<th>Header ${c + 1}</th>`;
            html += '</tr></thead><tbody>';
            for (let r = 0; r < rows; r += 1) {
              html += '<tr>';
              for (let c = 0; c < cols; c += 1) html += '<td>Cell</td>';
              html += '</tr>';
            }
            html += '</tbody></table><p><br></p>';
            insertHtml(html);
          }}
        >
          ⊞ Table
        </button>

        <span className="editor__sep" aria-hidden="true" />

        <button
          type="button"
          className="editor__btn editor__btn--danger"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => exec('removeFormat')}
        >
          Clear format
        </button>
      </div>

      <div
        ref={ref}
        className="editor__surface article-content"
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-label="Article content"
        onInput={(e) => onChange(e.currentTarget.innerHTML)}
        onBlur={(e) => onChange(e.currentTarget.innerHTML)}
      />

      <details className="editor__source">
        <summary>Edit raw HTML</summary>
        <textarea
          value={value || ''}
          onChange={(e) => {
            onChange(e.target.value);
            if (ref.current) ref.current.innerHTML = e.target.value;
          }}
          rows={12}
          spellCheck={false}
        />
      </details>
    </div>
  );
}
