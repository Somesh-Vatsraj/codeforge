-- ============================================================
-- SAMPLE CONTENT — replace or delete freely from the admin panel.
-- There is NO admin account seeded here. Create it on first visit
-- to /admin/login (one-time setup, locked afterwards).
-- ============================================================

INSERT OR IGNORE INTO categories (name, slug, description) VALUES
  ('HTML', 'html', 'Markup fundamentals and semantic structure.'),
  ('CSS', 'css', 'Layout, animation and responsive design.'),
  ('JavaScript', 'javascript', 'Language core, DOM and browser APIs.'),
  ('React', 'react', 'Components, hooks and modern React patterns.'),
  ('Projects', 'projects', 'Complete build-along project walkthroughs.'),
  ('Tools', 'tools', 'Developer tooling and workflows.');

INSERT OR IGNORE INTO tags (name, slug) VALUES
  ('HTML','html'), ('CSS','css'), ('JavaScript','javascript'),
  ('Responsive','responsive'), ('Animation','animation'),
  ('React','react'), ('API','api'), ('Beginner','beginner');

INSERT OR IGNORE INTO posts
  (title, slug, description, article_content, thumbnail_url, youtube_url,
   category_id, technologies, features, featured, trending, live_preview,
   status, seo_title, seo_description, seo_keywords, author, published_at)
VALUES
(
  'Responsive Pricing Card Component with HTML CSS',
  'responsive-pricing-card-html-css',
  'Build a clean, responsive pricing card with hover effects, a highlighted plan and pure CSS — no frameworks.',
  '<h2>What we are building</h2><p>In this tutorial we build a <strong>responsive pricing card</strong> using only HTML and CSS. It works on mobile, tablet and desktop, and includes a highlighted "popular" plan.</p><h2>Project structure</h2><p>Three files are enough: <code>index.html</code>, <code>css/style.css</code> and <code>js/script.js</code>.</p><h2>The markup</h2><p>Each plan is a <code>&lt;article&gt;</code> so the structure stays semantic and screen-reader friendly.</p><h2>The layout</h2><p>We use <code>display: grid</code> with <code>auto-fit</code> and <code>minmax()</code> so the cards reflow automatically without a single media query.</p><h2>Adding the highlight</h2><p>The featured plan gets a modifier class that changes the border, shadow and button style.</p><h2>Wrapping up</h2><p>You now have a reusable pricing section you can drop into any landing page.</p>',
  'https://images.unsplash.com/photo-1467232004584-a241de8bcf5d?w=1200&q=70',
  'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  (SELECT id FROM categories WHERE slug = 'css'),
  '["HTML","CSS"]',
  '["Responsive grid layout","Featured plan highlight","Pure CSS hover effects","No frameworks"]',
  1, 1, 1, 'published',
  'Responsive Pricing Card using HTML and CSS',
  'Learn how to build a responsive pricing card component with HTML and CSS, including a highlighted plan and hover effects.',
  'pricing card, html css, responsive design, css grid',
  'CodeForge Team',
  datetime('now')
),
(
  'Build a Todo List App with Vanilla JavaScript',
  'build-todo-list-app-vanilla-javascript',
  'A complete beginner-friendly todo list app with add, complete, delete and localStorage persistence.',
  '<h2>Overview</h2><p>We build a todo list app in <strong>vanilla JavaScript</strong> — no libraries. You will learn DOM manipulation, event delegation and <code>localStorage</code> persistence.</p><h2>Step 1 — Structure</h2><p>An input, an add button and a <code>&lt;ul&gt;</code> for the list.</p><h2>Step 2 — State</h2><p>We keep a single array of todo objects and re-render from it. This keeps the UI and data in sync.</p><h2>Step 3 — Event delegation</h2><p>One listener on the list handles every delete and toggle button, including future items.</p><h2>Step 4 — Persistence</h2><p>Every state change writes to <code>localStorage</code>, so the list survives a page reload.</p><h2>Next steps</h2><p>Try adding filters, drag-and-drop ordering, or a due-date field.</p>',
  'https://images.unsplash.com/photo-1517842645767-c639042777db?w=1200&q=70',
  '',
  (SELECT id FROM categories WHERE slug = 'javascript'),
  '["HTML","CSS","JavaScript"]',
  '["Add / complete / delete todos","localStorage persistence","Event delegation","Keyboard accessible"]',
  0, 1, 1, 'published',
  'Todo List App with Vanilla JavaScript — Full Tutorial',
  'Build a complete todo list app with vanilla JavaScript: add, complete, delete and localStorage persistence.',
  'todo list javascript, vanilla js project, dom manipulation',
  'CodeForge Team',
  datetime('now')
);

-- tags for post 1
INSERT OR IGNORE INTO post_tags (post_id, tag_id)
  SELECT p.id, t.id FROM posts p, tags t
  WHERE p.slug = 'responsive-pricing-card-html-css'
    AND t.slug IN ('html','css','responsive');

-- tags for post 2
INSERT OR IGNORE INTO post_tags (post_id, tag_id)
  SELECT p.id, t.id FROM posts p, tags t
  WHERE p.slug = 'build-todo-list-app-vanilla-javascript'
    AND t.slug IN ('javascript','beginner','api');

-- source files for post 1
INSERT INTO post_files (post_id, file_name, file_path, language, code_content, sort_order)
  SELECT id, 'index.html', 'index.html', 'html',
'<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Pricing Cards</title>
  <link rel="stylesheet" href="css/style.css" />
</head>
<body>
  <main class="pricing">
    <article class="plan">
      <h2>Starter</h2>
      <p class="price">$0<span>/mo</span></p>
      <ul>
        <li>1 project</li>
        <li>Community support</li>
      </ul>
      <button>Choose Starter</button>
    </article>

    <article class="plan plan--featured">
      <h2>Pro</h2>
      <p class="price">$19<span>/mo</span></p>
      <ul>
        <li>Unlimited projects</li>
        <li>Priority support</li>
      </ul>
      <button>Choose Pro</button>
    </article>

    <article class="plan">
      <h2>Team</h2>
      <p class="price">$49<span>/mo</span></p>
      <ul>
        <li>Everything in Pro</li>
        <li>5 seats</li>
      </ul>
      <button>Choose Team</button>
    </article>
  </main>
  <script src="js/script.js"></script>
</body>
</html>', 0
  FROM posts WHERE slug = 'responsive-pricing-card-html-css';

INSERT INTO post_files (post_id, file_name, file_path, language, code_content, sort_order)
  SELECT id, 'style.css', 'css/style.css', 'css',
':root {
  --brand: #4f46e5;
  --text: #12151c;
  --muted: #5b6474;
  --border: #e2e6ee;
  --card: #ffffff;
}

* { box-sizing: border-box; }

body {
  margin: 0;
  font-family: system-ui, sans-serif;
  color: var(--text);
  background: #f7f8fb;
}

.pricing {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 1.5rem;
  max-width: 960px;
  margin: 4rem auto;
  padding: 0 1.25rem;
}

.plan {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 2rem 1.5rem;
  text-align: center;
  transition: transform .2s ease, box-shadow .2s ease;
}

.plan:hover {
  transform: translateY(-4px);
  box-shadow: 0 18px 40px -20px rgba(16, 24, 40, .35);
}

.plan--featured {
  border-color: var(--brand);
  box-shadow: 0 0 0 3px rgba(79, 70, 229, .15);
}

.price {
  font-size: 2.25rem;
  font-weight: 700;
  margin: .5rem 0 1rem;
}

.price span {
  font-size: .95rem;
  font-weight: 400;
  color: var(--muted);
}

.plan ul {
  list-style: none;
  padding: 0;
  margin: 0 0 1.5rem;
  color: var(--muted);
}

.plan li { padding: .35rem 0; }

.plan button {
  width: 100%;
  padding: .75rem 1rem;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: #fff;
  font-weight: 600;
  cursor: pointer;
}

.plan--featured button {
  background: var(--brand);
  border-color: var(--brand);
  color: #fff;
}', 1
  FROM posts WHERE slug = 'responsive-pricing-card-html-css';

INSERT INTO post_files (post_id, file_name, file_path, language, code_content, sort_order)
  SELECT id, 'script.js', 'js/script.js', 'javascript',
'document.querySelectorAll(".plan button").forEach((button) => {
  button.addEventListener("click", () => {
    const plan = button.closest(".plan").querySelector("h2").textContent;
    alert(`You selected the ${plan} plan.`);
  });
});', 2
  FROM posts WHERE slug = 'responsive-pricing-card-html-css';

-- demo files for post 1 (used by Live Preview)
INSERT INTO post_demo_files (post_id, file_path, file_content, file_type, sort_order)
  SELECT id, 'index.html', code_content, 'text/html', 0
  FROM post_files WHERE file_path = 'index.html'
    AND post_id = (SELECT id FROM posts WHERE slug = 'responsive-pricing-card-html-css');

INSERT INTO post_demo_files (post_id, file_path, file_content, file_type, sort_order)
  SELECT id, 'css/style.css', code_content, 'text/css', 1
  FROM post_files WHERE file_path = 'css/style.css'
    AND post_id = (SELECT id FROM posts WHERE slug = 'responsive-pricing-card-html-css');

INSERT INTO post_demo_files (post_id, file_path, file_content, file_type, sort_order)
  SELECT id, 'js/script.js', code_content, 'text/javascript', 2
  FROM post_files WHERE file_path = 'js/script.js'
    AND post_id = (SELECT id FROM posts WHERE slug = 'responsive-pricing-card-html-css');
