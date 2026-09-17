CodeForge
A production-ready coding tutorial and project showcase platform built on React + Vite for the frontend and Cloudflare Workers + D1 for the backend. One administrator manages everything — posts, categories, tags, code files, live previews, SEO and ads — from a secure admin panel with no public registration.

Table of contents
Features

Tech stack

Architecture

Project structure

Requirements

Quick start

Configuration

Database schema

Admin panel

API reference

Deployment

Design decisions & limitations

Security

SEO & AdSense

Troubleshooting

License

Features
Public site
Premium, mobile-first homepage with hero, featured posts, latest posts, trending list and category chips

Dynamic post cards with thumbnail, title, description, category, tags, date and views

Individual tutorial pages with breadcrumb, author, reading time, hero thumbnail, article body, image gallery, YouTube embed, feature list, technologies, live preview, source code blocks and related posts

Dynamic categories and tags, both with public listing pages

Full-text search across titles, descriptions, article bodies, categories and tags, with pagination and empty state

View counter with per-visitor, per-day deduplication powering the trending list

Dark mode / light mode / system preference, persisted in localStorage

Accessible everywhere: semantic HTML, skip link, visible focus states, keyboard navigation, ARIA labels

Built-in policy pages: About, Contact, Privacy Policy, Terms, Disclaimer, Cookie Policy, 404

Admin panel
Single-admin authentication with PBKDF2-SHA256 password hashing and HMAC-signed session cookies

One-time setup flow — the create-admin form is permanently disabled once an account exists

Dashboard with post/views/category counts and a recent-posts table

Full post editor with collapsible sections: Basic Info, Content, Source Files, Demo Files, SEO, Publish

Rich-text article editor with headings, bold, italic, lists, links, images, quotes, code blocks, tables and inline YouTube embeds — plus a raw HTML fallback

Dynamic + Add buttons for images, source files, demo files, technologies and features — no hard-coded field limits

Thumbnail and article images accept either an image URL or a direct upload

YouTube URL is auto-parsed into a safe embed; the video section disappears when empty

Live Preview toggle that sandboxes client-side HTML/CSS/JS in an isolated iframe

Download Project button that builds a real ZIP from the configured file paths, preserving folders

Category and tag CRUD with rename, delete and post counts

Site-wide settings: name, logo, favicon, description, author, contact, socials, footer text, SEO defaults and full AdSense configuration

Change password from within the settings panel

Code file system
Unlimited files per post with file name, file path, language, code content, sort order and per-file delete

Public display shows each file separately with syntax highlighting, a Copy Code button (with "Copied!" feedback), a per-file download and a collapse toggle

ZIP download preserves folders (css/, js/, assets/) exactly as configured

Live preview
Rendered through a sandboxed <iframe> with sandbox="allow-scripts allow-modals allow-popups" and no allow-same-origin

CSS and JS are inlined from the demo files; local image references are converted to data URLs

Preview runs in an opaque origin with no access to cookies, localStorage or admin credentials

Server-side code such as PHP is never executed — it is only displayed and downloadable as source

Tech stack
Layer	Technology
Frontend	React 18, Vite 5, React Router 6
Styling	Custom CSS with design tokens (no Tailwind, no Bootstrap, no UI library)
Backend	Cloudflare Workers
Database	Cloudflare D1 (SQLite)
Assets	Cloudflare Assets binding (serves the Vite build)
Auth	PBKDF2-SHA256 via Web Crypto + HMAC-signed cookies
Sanitization	Cloudflare HTMLRewriter
ZIP generation	Custom dependency-free ZIP writer in the browser
No PHP, no MySQL, no Node.js backend, no Express, no Laravel, no R2, no Firebase, no Supabase.

Architecture
text
┌──────────────────────────────────────────────────────────────┐
│                     Cloudflare Worker                        │
│                                                              │
│   /api/admin/*  ──►  worker/admin.js   (auth required)       │
│   /api/*        ──►  worker/public.js  (public reads)        │
│   /sitemap.xml  ──►  dynamic, published posts only           │
│   /robots.txt   ──►  dynamic                                 │
│   /project/:slug──►  HTMLRewriter injects SEO meta + JSON-LD │
│   everything else ►  ASSETS.fetch  (React SPA)               │
│                                                              │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌───────────────────┐
                    │   D1 Database     │
                    └───────────────────┘
The React app and the Worker ship as one project. There is no separate frontend and backend deployment — vite build produces dist/, and Wrangler serves it via the ASSETS binding while routing API calls to the Worker.

Project structure
text
project/
├── package.json
├── vite.config.js
├── wrangler.toml
├── index.html
├── .gitignore
├── README.md
├── public/
│   └── favicon.svg
├── migrations/
│   ├── 0001_initial.sql
│   └── 0002_seed.sql
├── worker/
│   ├── index.js        # entry point + sitemap, robots, SEO injection
│   ├── util.js         # helpers: json, slugify, uniqueSlug, sha256Hex …
│   ├── auth.js         # PBKDF2 hashing, HMAC tokens, cookies, guards
│   ├── sanitize.js     # HTMLRewriter-based article sanitizer
│   ├── public.js       # public API routes
│   └── admin.js        # admin API routes (auth-gated)
└── src/
    ├── main.jsx
    ├── App.jsx
    ├── store.jsx       # Theme, Auth and Settings providers
    ├── api/client.js
    ├── utils/
    │   ├── zip.js
    │   ├── highlight.js
    │   ├── preview.js
    │   ├── youtube.js
    │   └── format.js
    ├── components/
    │   ├── Header.jsx
    │   ├── Footer.jsx
    │   ├── PostCard.jsx
    │   ├── Pagination.jsx
    │   ├── CodeBlock.jsx
    │   ├── AdSlot.jsx
    │   ├── Seo.jsx
    │   ├── Spinner.jsx
    │   └── EmptyState.jsx
    ├── layouts/
    │   ├── PublicLayout.jsx
    │   └── AdminLayout.jsx
    ├── pages/
    │   ├── Home.jsx
    │   ├── Post.jsx
    │   ├── Listing.jsx
    │   ├── Search.jsx
    │   ├── Info.jsx
    │   └── NotFound.jsx
    ├── admin/
    │   ├── Login.jsx
    │   ├── Dashboard.jsx
    │   ├── Posts.jsx
    │   ├── PostForm.jsx
    │   ├── ArticleEditor.jsx
    │   ├── Categories.jsx
    │   └── Settings.jsx
    └── styles/
        ├── index.css
        └── admin.css
Requirements
Node.js 18 or newer

A free Cloudflare account

Wrangler CLI (installed as a dev dependency)

The Workers Paid plan is recommended for production, because PBKDF2 password hashing with 100,000 iterations can exceed the Free plan's CPU budget. See Security for a workaround.

Quick start
bash
# 1. Install dependencies
npm install

# 2. Create the D1 database (copy the printed database_id into wrangler.toml)
npx wrangler d1 create codeforge_db

# 3. Apply migrations locally
npm run db:local

# 4. Create the local session secret
echo 'SESSION_SECRET="dev-secret-change-me-please-32-chars-min"' > .dev.vars

# 5. Build the frontend once (Wrangler serves ./dist)
npm run build

# 6. Terminal A — run the Worker + API on http://127.0.0.1:8787
npm run worker

# 7. Terminal B — run Vite with HMR on http://localhost:5173 (proxies /api → :8787)
npm run dev
Then:

URL	What it is
http://localhost:5173	Public site
http://localhost:5173/admin/login	Admin panel
http://127.0.0.1:8787	Worker + API directly
On the first visit to /admin/login, the page shows a one-time setup form. Create your account there. That form is permanently disabled once an admin row exists — subsequent visits show the normal login form.

Available scripts
Command	Description
npm run dev	Vite dev server with HMR
npm run build	Build the React app into dist/
npm run preview	Preview the production build locally
npm run worker	Run the Worker on :8787
npm run deploy	Build and deploy to Cloudflare
npm run db:local	Apply migrations to the local D1
npm run db:remote	Apply migrations to the remote D1
Configuration
wrangler.toml
toml
name = "codeforge"
main = "worker/index.js"
compatibility_date = "2024-11-06"
compatibility_flags = ["nodejs_compat"]

[assets]
directory = "./dist"
binding = "ASSETS"
not_found_handling = "single-page-application"
run_worker_first = ["/api/*", "/project/*", "/sitemap.xml", "/robots.txt"]

[[d1_databases]]
binding = "DB"
database_name = "codeforge_db"
database_id = "REPLACE_WITH_YOUR_D1_DATABASE_ID"

[vars]
SITE_URL = "http://localhost:8787"
MAX_UPLOAD_BYTES = "350000"
database_id must be replaced with the ID printed by wrangler d1 create.

SITE_URL should be your real domain in production so canonical URLs and the sitemap are correct.

run_worker_first ensures API routes, post pages and generated files are handled by the Worker instead of the SPA fallback.

Environment variables & secrets
Name	Set with	Purpose	Required
SESSION_SECRET	wrangler secret put SESSION_SECRET	HMAC key that signs admin session tokens	Yes
SITE_URL	wrangler.toml [vars]	Absolute base URL for canonical / OG tags	Recommended
MAX_UPLOAD_BYTES	wrangler.toml [vars]	Upload size ceiling in bytes (default 350000)	No
Generate a strong secret:

bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
Never commit .dev.vars or paste SESSION_SECRET into frontend code.

Database schema
All tables are created by migrations/0001_initial.sql.

Table	Purpose
admins	The single administrator account (hashed password + salt)
categories	Dynamic categories with name, slug and description
tags	Dynamic tags with name and slug
posts	Posts with title, slug, article HTML, thumbnail, YouTube URL, category, flags, status, SEO fields and view count
post_images	Ordered article images with alt text and caption
post_files	Source code files with name, path, language, code and sort order
post_demo_files	Client-side demo files used by Live Preview and project download
post_tags	Many-to-many join between posts and tags
settings	Key/value store for site-wide configuration
views	One row per post/visitor/day for deduplicated view counting
uploads	Base64-encoded images stored in D1 (no R2)
Indexes
posts(slug), posts(status), posts(category_id), posts(created_at DESC), posts(views DESC), posts(published_at DESC), categories(slug), tags(slug), post_images(post_id), post_files(post_id, sort_order), post_demo_files(post_id, sort_order), post_tags(tag_id), views(post_id, visitor_key) unique, uploads(created_at).

Foreign keys
post_images, post_files, post_demo_files and views cascade on post delete. posts.category_id is SET NULL when a category is deleted. post_tags cascades on either side.

Admin panel
Everything lives under /admin/*. These routes are never linked from the public navigation.

Route	Purpose
/admin/login	Sign in — or one-time setup on first visit
/admin/dashboard	Counts, recent posts, quick actions
/admin/posts	All posts with status filter, search, edit, delete and status toggle
/admin/posts/create	Full post editor
/admin/posts/edit/:id	Same editor, pre-filled
/admin/categories	Category and tag CRUD
/admin/settings	Site settings, AdSense, legal pages, change password
Recommended authoring workflow
Sign in at /admin/login.

Open Dashboard → Create Post.

Type the title — the slug is generated automatically (and editable).

Write the article in the rich-text editor, or switch to raw HTML.

Add a thumbnail (paste a URL or upload a file).

Add article images with + Add Image.

Paste a YouTube URL — the embed appears automatically.

Add source code files with + Add File, one click per file.

Add demo files with + Add Demo File and enable Live Preview if the project is client-side.

Fill in SEO title, description, keywords and canonical URL.

Toggle Featured and Trending if desired.

Click Save Draft or Publish.

Published posts appear immediately on the public site; drafts never do.

API reference
Public (no auth)
Method	Route	Description
GET	/api/settings	Public subset of site settings
GET	/api/posts	Paginated published posts (page, limit, category, tag, featured, trending, sort)
GET	/api/posts/:slug	Single published post with tags, images, files, demo files (increments the view counter once per visitor per day)
GET	/api/search	Full-text search (q, page)
GET	/api/categories	All categories with post counts
GET	/api/categories/:slug	Category details + paginated posts
GET	/api/tags	All tags with post counts
GET	/api/tags/:slug	Tag details + paginated posts
GET	/api/related/:postId	Up to 6 related posts by category and shared tags
GET	/api/uploads/:id	Serve an uploaded image from D1
GET	/sitemap.xml	Dynamic sitemap — published posts only
GET	/robots.txt	Dynamic robots file
Admin
Method	Route	Auth	Description
POST	/api/admin/setup	No	One-time account creation (returns 403 if an admin exists)
POST	/api/admin/login	No	Sign in, sets the session cookie
POST	/api/admin/logout	Yes	Clear the session cookie
GET	/api/admin/me	Yes	Current admin identity
POST	/api/admin/password	Yes	Change password
GET	/api/admin/stats	Yes	Dashboard counts and recent posts
POST	/api/admin/upload	Yes	Upload an image (returns /api/uploads/:id)
GET POST	/api/admin/settings	Yes	Read / write site settings
GET POST	/api/admin/categories	Yes	List / create categories
PUT DELETE	/api/admin/categories/:id	Yes	Update / delete a category
GET POST	/api/admin/tags	Yes	List / create tags
PUT DELETE	/api/admin/tags/:id	Yes	Update / delete a tag
GET POST	/api/admin/posts	Yes	List / create posts
GET PUT DELETE	/api/admin/posts/:id	Yes	Read / update / delete a post
All admin routes are guarded by requireAdmin, which validates the HMAC-signed session cookie against SESSION_SECRET and confirms the admin row still exists in D1.

Deployment
bash
# 1. Authenticate with Cloudflare
npx wrangler login

# 2. Create the production D1 database (skip if already created)
npx wrangler d1 create codeforge_db
#    → paste the returned database_id into wrangler.toml

# 3. Apply migrations to the remote database
npm run db:remote

# 4. Set the session secret (never commit this)
npx wrangler secret put SESSION_SECRET

# 5. Set SITE_URL to your real domain in wrangler.toml [vars]

# 6. Build and deploy
npm run deploy
After the first deploy, open https://<your-worker>.workers.dev/admin/login to complete the one-time admin setup. Bind a custom domain from the Cloudflare dashboard if you have one, then update SITE_URL and redeploy.

Design decisions & limitations
Image uploads without R2
Uploaded images are stored as base64 inside the D1 uploads table and served through GET /api/uploads/:id with Cache-Control: public, max-age=31536000, immutable.

D1 is a relational database, not object storage, so uploads are capped at MAX_UPLOAD_BYTES (350 KB by default) and only PNG, JPEG, WEBP and GIF are accepted. For larger or more numerous images, paste an external image URL instead — the admin panel offers both options everywhere an image is used.

If you later add R2, only two places need to change: upload() in worker/admin.js and the /uploads/:id handler in worker/public.js.

Live Preview safety
Preview documents are assembled client-side into a single self-contained HTML string:

<link rel="stylesheet" href="…"> tags are replaced with inline <style> blocks

<script src="…"> tags are replaced with inline <script> blocks

local <img src="…"> references are converted to data URLs

the result is rendered in <iframe sandbox="allow-scripts allow-modals allow-popups" srcdoc="…">

Because allow-same-origin is deliberately omitted, the preview runs in an opaque origin with no access to cookies, localStorage, sessionStorage or the admin session. Only client-side projects are supported. PHP and any other server-side code is never executed — it is only displayed and downloadable as source.

Only these entry files are used as the preview root, in order: index.html, main.html, home.html, demo/index.html, then any .html file.

View counting
GET /api/posts/:slug hashes IP + User-Agent + date with SHA-256 and inserts into views, which has a unique index on (post_id, visitor_key). Rapid refreshes and repeat visits within the same day do not inflate the counter. Rows older than 45 days are cleaned up opportunistically (2% chance per request).

SEO
The Worker intercepts /project/:slug, loads index.html from the assets binding, and rewrites <title>, meta[name="description"], Open Graph, Twitter Card, canonical and BlogPosting JSON-LD using HTMLRewriter. Crawlers and social scrapers get correct metadata without JavaScript execution. The React Seo component keeps the same tags in sync during client-side navigation.

sitemap.xml and robots.txt are generated dynamically. The sitemap contains published posts, categories and tags only — drafts never appear.

AdSense readiness
Ads render only when ads_enabled is on and a publisher ID plus slot ID are configured. Otherwise a clearly-labelled placeholder appears in the admin-owned slots. Ads are never placed next to the Download or Copy Code buttons.

Policy pages (/about, /contact, /privacy-policy, /terms, /disclaimer, /cookie-policy) are present, editable from Admin → Settings, and linked in the footer.

No AdSense approval is promised or guaranteed. Eligibility depends on your content, traffic and compliance with Google's policies.

Security
Passwords are hashed with PBKDF2-SHA256 (100,000 iterations, 16-byte salt, 32-byte derived key) using the Web Crypto API. Plain text passwords are never stored or logged.

Sessions are HMAC-SHA256 signed cookies with HttpOnly, SameSite=Lax, Secure (on HTTPS) and a 12-hour expiry.

Every admin API route is guarded by requireAdmin, which verifies the signature, checks expiry and confirms the admin row still exists.

All D1 queries use parameterized statements — no string interpolation of user input.

Article HTML is sanitized server-side on every write using Cloudflare HTMLRewriter with a strict tag and attribute allowlist. <script>, <style>, <iframe> (unless a YouTube host), <object>, <embed> and all on* / style attributes are stripped.

URLs are validated: only http: and https: are permitted; javascript: and vbscript: are rejected; iframe sources must resolve to a YouTube host.

The setup endpoint returns 403 once an admin exists, permanently disabling self-registration.

Login responses are timing-hardened — a hash is always computed, even when the username does not exist.

Admin routes are not linked from the public site and are not discoverable through the sitemap.

CPU limits on the Workers Free plan
PBKDF2 with 100,000 iterations can exceed the Free plan's CPU budget during login. Two options:

Lower ITERATIONS in worker/auth.js to 25000 (still far above plain-text hashing), or

Move to the Workers Paid plan.

Troubleshooting
Symptom	Likely cause	Fix
Server misconfigured: SESSION_SECRET is missing.	Secret not set	npx wrangler secret put SESSION_SECRET (or create .dev.vars locally)
Login always fails on production	Wrong credentials or session cookie blocked	Confirm the username/password; ensure the site is served over HTTPS so Secure cookies are accepted
Image is too large on upload	File exceeds MAX_UPLOAD_BYTES	Use an external image URL, or raise MAX_UPLOAD_BYTES in wrangler.toml and redeploy
Live Preview shows a blank frame	No HTML entry file among the demo files	Add a demo file named index.html
/project/:slug shows the SPA 404	Post is a draft, or the slug is wrong	Publish the post and verify the slug in the admin panel
Sitemap missing posts	Posts are drafts	Only published posts appear in the sitemap
Worker returns 500 during login	PBKDF2 exceeded the Free plan CPU budget	Lower ITERATIONS in worker/auth.js, or upgrade to Paid
no such table: posts	Migrations not applied	npm run db:local (dev) or npm run db:remote (production)
Admin page redirects to login after signing in	SESSION_SECRET changed between requests	Set a stable secret and restart the Worker
License
Provided as a complete project scaffold for building your own tutorial platform. Replace the sample seed content in migrations/0002_seed.sql with your own original writing before publishing. All sample content in the seed file is placeholder material intended for demonstration only.

Third-party names and trademarks referenced in sample content belong to their respective owners.

