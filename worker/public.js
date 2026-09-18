import { json, fail, clamp, intOr, sha256Hex, clientIp, safeString } from './util.js';

const PUBLIC_SETTING_KEYS = [
  'site_name', 'site_description', 'logo_url', 'favicon_url', 'author_name',
  'contact_email', 'footer_text', 'social_twitter', 'social_github',
  'social_youtube', 'social_facebook', 'youtube_channel',
  'seo_default_title', 'seo_default_description',
  'ads_enabled', 'adsense_publisher_id', 'adsense_slot_home',
  'adsense_slot_post_top', 'adsense_slot_post_bottom',
  'privacy_policy', 'terms', 'disclaimer', 'cookie_policy',
];

const CARD_COLUMNS = `
  p.id, p.title, p.slug, p.description, p.thumbnail_url, p.youtube_url,
  p.featured, p.trending, p.live_preview, p.views, p.technologies, p.features,
  p.published_at, p.created_at, p.category_id,
  c.name AS category_name, c.slug AS category_slug
`;

/* ==================== helpers ==================== */

async function attachTags(db, posts) {
  if (!posts.length) return posts;
  const ids = posts.map((p) => p.id);
  const placeholders = ids.map(() => '?').join(',');
  const { results } = await db
    .prepare(`SELECT pt.post_id, t.id, t.name, t.slug
              FROM post_tags pt JOIN tags t ON t.id = pt.tag_id
              WHERE pt.post_id IN (${placeholders})`)
    .bind(...ids)
    .all();

  const map = new Map();
  for (const row of results || []) {
    if (!map.has(row.post_id)) map.set(row.post_id, []);
    map.get(row.post_id).push({ id: row.id, name: row.name, slug: row.slug });
  }
  return posts.map((p) => ({ ...p, tags: map.get(p.id) || [] }));
}

function safeJsonArray(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return value ? [value] : [];
    }
  }
  return [];
}

function shapePost(row) {
  return {
    ...row,
    technologies: safeJsonArray(row.technologies),
    features: safeJsonArray(row.features),
    featured: !!row.featured,
    trending: !!row.trending,
    live_preview: !!row.live_preview,
  };
}

/* ==================== MAIN HANDLER ==================== */

export async function handlePublic(request, env) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/^\/api/, '');
  const method = request.method.toUpperCase();

  if (method !== 'GET' && method !== 'POST') return fail('Method not allowed', 405);

  /* ---------- settings ---------- */
  if (path === '/settings') {
    const { results } = await env.DB.prepare('SELECT key, value FROM settings').all();
    const all = Object.fromEntries((results || []).map((r) => [r.key, r.value]));
    const out = {};
    for (const key of PUBLIC_SETTING_KEYS) out[key] = all[key] ?? '';
    return json({ settings: out });
  }

  /* ---------- uploads ---------- */
  const uploadMatch = path.match(/^\/uploads\/([a-zA-Z0-9-]+)$/);
  if (uploadMatch) {
    const row = await env.DB
      .prepare('SELECT mime_type, data FROM uploads WHERE id = ?')
      .bind(uploadMatch[1])
      .first();
    if (!row) return new Response('Not found', { status: 404 });
    const binary = Uint8Array.from(atob(row.data), (c) => c.charCodeAt(0));
    return new Response(binary, {
      headers: {
        'content-type': row.mime_type,
        'cache-control': 'public, max-age=31536000, immutable',
      },
    });
  }

  /* ---------- categories ---------- */
  if (path === '/categories') {
    const { results } = await env.DB.prepare(
      `SELECT c.id, c.name, c.slug, c.description,
              (SELECT COUNT(*) FROM posts p WHERE p.category_id = c.id AND p.status = 'published') AS post_count
       FROM categories c ORDER BY c.name ASC`,
    ).all();
    return json({ categories: results || [] });
  }

  const catMatch = path.match(/^\/categories\/([^/]+)$/);
  if (catMatch) {
    const category = await env.DB
      .prepare('SELECT id, name, slug, description FROM categories WHERE slug = ?')
      .bind(catMatch[1])
      .first();
    if (!category) return fail('Category not found', 404);
    const posts = await listPosts(env, { categoryId: category.id, page: url.searchParams.get('page') });
    return json({ category, ...posts });
  }

  /* ---------- tags ---------- */
  if (path === '/tags') {
    const { results } = await env.DB.prepare(
      `SELECT t.id, t.name, t.slug,
              (SELECT COUNT(*) FROM post_tags pt
                 JOIN posts p ON p.id = pt.post_id
                WHERE pt.tag_id = t.id AND p.status = 'published') AS post_count
       FROM tags t ORDER BY t.name ASC`,
    ).all();
    return json({ tags: results || [] });
  }

  const tagMatch = path.match(/^\/tags\/([^/]+)$/);
  if (tagMatch) {
    const tag = await env.DB
      .prepare('SELECT id, name, slug FROM tags WHERE slug = ?')
      .bind(tagMatch[1])
      .first();
    if (!tag) return fail('Tag not found', 404);
    const posts = await listPosts(env, { tagId: tag.id, page: url.searchParams.get('page') });
    return json({ tag, ...posts });
  }

  /* ---------- search ---------- */
  if (path === '/search') {
    const q = (url.searchParams.get('q') || '').trim();
    if (!q) return json({ posts: [], total: 0, page: 1, pages: 0, query: '' });
    const page = clamp(intOr(url.searchParams.get('page'), 1), 1, 500);
    const limit = 12;
    const offset = (page - 1) * limit;
    const like = `%${q.replace(/[%_]/g, '')}%`;

    const where = `p.status = 'published' AND (
        p.title LIKE ?1 OR p.description LIKE ?1 OR p.article_content LIKE ?1
        OR EXISTS (SELECT 1 FROM categories c WHERE c.id = p.category_id AND c.name LIKE ?1)
        OR EXISTS (SELECT 1 FROM post_tags pt JOIN tags t ON t.id = pt.tag_id
                    WHERE pt.post_id = p.id AND t.name LIKE ?1)
      )`;

    const countRow = await env.DB
      .prepare(`SELECT COUNT(*) AS total FROM posts p WHERE ${where}`)
      .bind(like)
      .first();

    const { results } = await env.DB
      .prepare(`SELECT ${CARD_COLUMNS}
                FROM posts p LEFT JOIN categories c ON c.id = p.category_id
                WHERE ${where}
                ORDER BY p.views DESC, p.published_at DESC
                LIMIT ?2 OFFSET ?3`)
      .bind(like, limit, offset)
      .all();

    const posts = await attachTags(env.DB, (results || []).map(shapePost));
    const total = countRow?.total || 0;
    return json({ posts, total, page, pages: Math.ceil(total / limit) || 0, query: q });
  }

  /* ---------- related ---------- */
  const relatedMatch = path.match(/^\/related\/(\d+)$/);
  if (relatedMatch) {
    const postId = intOr(relatedMatch[1], 0);
    const post = await env.DB
      .prepare("SELECT id, category_id FROM posts WHERE id = ? AND status = 'published'")
      .bind(postId)
      .first();
    if (!post) return json({ posts: [] });

    const byCategory = await env.DB
      .prepare(`SELECT ${CARD_COLUMNS}
                FROM posts p LEFT JOIN categories c ON c.id = p.category_id
                WHERE p.status = 'published' AND p.id != ?1
                  AND p.category_id IS NOT NULL AND p.category_id = ?2
                ORDER BY p.views DESC LIMIT 6`)
      .bind(postId, post.category_id)
      .all();

    const byTags = await env.DB
      .prepare(`SELECT DISTINCT ${CARD_COLUMNS}
                FROM posts p
                LEFT JOIN categories c ON c.id = p.category_id
                JOIN post_tags pt ON pt.post_id = p.id
                WHERE p.status = 'published' AND p.id != ?1
                  AND pt.tag_id IN (SELECT tag_id FROM post_tags WHERE post_id = ?1)
                ORDER BY p.views DESC LIMIT 6`)
      .bind(postId)
      .all();

    const merged = [];
    const seen = new Set();
    for (const row of [...(byCategory.results || []), ...(byTags.results || [])]) {
      if (seen.has(row.id)) continue;
      seen.add(row.id);
      merged.push(shapePost(row));
      if (merged.length === 6) break;
    }
    return json({ posts: await attachTags(env.DB, merged) });
  }

  /* ---------- comments (GET + POST) ---------- */
  const commentsMatch = path.match(/^\/posts\/([^/]+)\/comments$/);
  if (commentsMatch) {
    const slug = decodeURIComponent(commentsMatch[1]);
    if (method === 'GET') return listComments(env, slug);
    if (method === 'POST') return createComment(request, env, slug);
  }

  /* ---------- post by slug ---------- */
  const postMatch = path.match(/^\/posts\/([^/]+)$/);
  if (postMatch && postMatch[1] !== '') {
    return getPostBySlug(request, env, decodeURIComponent(postMatch[1]));
  }

  /* ---------- post listing ---------- */
  if (path === '/posts') {
    const posts = await listPosts(env, {
      page: url.searchParams.get('page'),
      limit: url.searchParams.get('limit'),
      categorySlug: url.searchParams.get('category'),
      tagSlug: url.searchParams.get('tag'),
      featured: url.searchParams.get('featured'),
      trending: url.searchParams.get('trending'),
      sort: url.searchParams.get('sort'),
    });
    return json(posts);
  }

  return fail('Not found', 404);
}

/* ==================== list posts ==================== */

async function listPosts(env, opts = {}) {
  const page = clamp(intOr(opts.page, 1), 1, 500);
  const limit = clamp(intOr(opts.limit, 9), 1, 48);
  const offset = (page - 1) * limit;

  const where = ["p.status = 'published'"];
  const binds = [];

  if (opts.categoryId) {
    where.push('p.category_id = ?');
    binds.push(opts.categoryId);
  }
  if (opts.tagId) {
    where.push('EXISTS (SELECT 1 FROM post_tags pt WHERE pt.post_id = p.id AND pt.tag_id = ?)');
    binds.push(opts.tagId);
  }
  if (opts.featured === '1' || opts.featured === 'true') where.push('p.featured = 1');
  if (opts.trending === '1' || opts.trending === 'true') where.push('p.trending = 1');

  let order = 'p.published_at DESC, p.id DESC';
  if (opts.sort === 'views') order = 'p.views DESC, p.published_at DESC';
  if (opts.sort === 'oldest') order = 'p.published_at ASC';

  const whereSql = where.join(' AND ');

  const countRow = await env.DB
    .prepare(`SELECT COUNT(*) AS total FROM posts p WHERE ${whereSql}`)
    .bind(...binds)
    .first();

  const { results } = await env.DB
    .prepare(`SELECT ${CARD_COLUMNS}
              FROM posts p LEFT JOIN categories c ON c.id = p.category_id
              WHERE ${whereSql}
              ORDER BY ${order}
              LIMIT ? OFFSET ?`)
    .bind(...binds, limit, offset)
    .all();

  const posts = await attachTags(env.DB, (results || []).map(shapePost));
  const total = countRow?.total || 0;
  return { posts, total, page, pages: Math.ceil(total / limit) || 0 };
}

/* ==================== get post by slug ==================== */

async function getPostBySlug(request, env, slug) {
  const row = await env.DB
    .prepare(`SELECT p.*, c.name AS category_name, c.slug AS category_slug
              FROM posts p LEFT JOIN categories c ON c.id = p.category_id
              WHERE p.slug = ? AND p.status = 'published'`)
    .bind(slug)
    .first();

  if (!row) return fail('Post not found', 404);

  const post = shapePost(row);

  const [tagsRes, imagesRes, filesRes, demoRes] = await env.DB.batch([
    env.DB.prepare(`SELECT t.id, t.name, t.slug FROM post_tags pt
                    JOIN tags t ON t.id = pt.tag_id WHERE pt.post_id = ? ORDER BY t.name`)
      .bind(post.id),
    env.DB.prepare(`SELECT id, image_url, alt_text, caption, sort_order
                    FROM post_images WHERE post_id = ? ORDER BY sort_order, id`).bind(post.id),
    env.DB.prepare(`SELECT id, file_name, file_path, language, code_content, sort_order
                    FROM post_files WHERE post_id = ? ORDER BY sort_order, id`).bind(post.id),
    env.DB.prepare(`SELECT id, file_path, file_content, file_type, sort_order
                    FROM post_demo_files WHERE post_id = ? ORDER BY sort_order, id`).bind(post.id),
  ]);

  post.tags = tagsRes.results || [];
  post.images = imagesRes.results || [];
  post.files = filesRes.results || [];
  post.demo_files = post.live_preview ? (demoRes.results || []) : [];

  // Safe view counting (one per visitor per post per day)
  try {
    const ip = clientIp(request);
    const ua = request.headers.get('user-agent') || '';
    const day = new Date().toISOString().slice(0, 10);
    const visitorKey = await sha256Hex(`${ip}|${ua}|${day}`);

    const inserted = await env.DB
      .prepare('INSERT OR IGNORE INTO views (post_id, visitor_key) VALUES (?, ?)')
      .bind(post.id, visitorKey)
      .run();

    if (inserted.meta?.changes > 0) {
      await env.DB.prepare('UPDATE posts SET views = views + 1 WHERE id = ?').bind(post.id).run();
      post.views += 1;
    }

    if (Math.random() < 0.02) {
      await env.DB.prepare("DELETE FROM views WHERE created_at < datetime('now', '-45 days')").run();
    }
  } catch { /* view counting never breaks page */ }

  return json({ post });
}

/* ==================== list comments ==================== */

async function listComments(env, slug) {
  const post = await env.DB
    .prepare("SELECT id FROM posts WHERE slug = ? AND status = 'published'")
    .bind(slug)
    .first();
  if (!post) return fail('Post not found', 404);

  const { results } = await env.DB
    .prepare(
      `SELECT id, author_name, body, created_at
       FROM comments
       WHERE post_id = ? AND status = 'approved'
       ORDER BY created_at DESC
       LIMIT 200`,
    )
    .bind(post.id)
    .all();

  return json({ comments: results || [] });
}

/* ==================== create comment ==================== */

async function createComment(request, env, slug) {
  // Check comments settings
  const settingsRes = await env.DB
    .prepare("SELECT key, value FROM settings WHERE key IN ('comments_enabled', 'comments_auto_approve')")
    .all();
  const settingsMap = Object.fromEntries((settingsRes.results || []).map((r) => [r.key, r.value]));

  if (settingsMap.comments_enabled === '0') {
    return fail('Comments are currently disabled.', 403);
  }

  const post = await env.DB
    .prepare("SELECT id FROM posts WHERE slug = ? AND status = 'published'")
    .bind(slug)
    .first();
  if (!post) return fail('Post not found', 404);

  const body = await request.json().catch(() => null);
  if (!body) return fail('Invalid request body.');

  // Honeypot — bots fill the hidden "website" field
  if (typeof body.website === 'string' && body.website.trim() !== '') {
    return json({ ok: true, status: 'pending', message: 'Thanks!' });
  }

  const name = safeString(body.name, 60).trim();
  const email = safeString(body.email, 120).trim().toLowerCase();
  const comment = safeString(body.comment, 2000).trim();

  if (name.length < 2) return fail('Please enter a name (at least 2 characters).');
  if (name.length > 60) return fail('Name is too long (max 60 characters).');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return fail('Please enter a valid email address.');
  }
  if (comment.length < 5) return fail('Comment is too short (min 5 characters).');
  if (comment.length > 2000) return fail('Comment is too long (max 2000 characters).');

  // Rate limit: 3 comments per IP per hour
  const ip = clientIp(request);
  const ipHash = await sha256Hex(`${ip}|comment`);

  const recent = await env.DB
    .prepare("SELECT COUNT(*) AS n FROM comments WHERE ip_hash = ? AND created_at > datetime('now', '-1 hour')")
    .bind(ipHash)
    .first();

  if ((recent?.n || 0) >= 3) {
    return fail('You have posted too many comments recently. Please try again later.', 429);
  }

  const emailHash = await sha256Hex(email.toLowerCase());
  const status = settingsMap.comments_auto_approve === '0' ? 'pending' : 'approved';

  const result = await env.DB
    .prepare(
      `INSERT INTO comments (post_id, author_name, author_email_hash, body, status, ip_hash)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .bind(post.id, name, emailHash, comment, status, ipHash)
    .run();

  const created = await env.DB
    .prepare('SELECT id, author_name, body, created_at FROM comments WHERE id = ?')
    .bind(result.meta.last_row_id)
    .first();

  return json({
    ok: true,
    status,
    comment: status === 'approved' ? created : null,
    message: status === 'approved'
      ? 'Your comment has been posted.'
      : 'Your comment is awaiting moderation.',
  });
}
