import {
  json, fail, slugify, uniqueSlug, parseArray, bool, intOr, clamp,
  safeString, uid, isHttps,
} from './util.js';
import {
  hashPassword, verifyPassword, createToken, requireAdmin,
  sessionCookie, clearCookie, SESSION_TTL, b64urlEncode,
} from './auth.js';
import { sanitizeArticle } from './sanitize.js';

const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

export async function handleAdmin(request, env) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/^\/api\/admin/, '') || '/';
  const method = request.method.toUpperCase();

  if (path === '/setup' && method === 'POST') return setup(request, env);
  if (path === '/login' && method === 'POST') return login(request, env);

  if (path === '/logout' && method === 'POST') {
    return json({ ok: true }, { headers: { 'set-cookie': clearCookie(isHttps(request)) } });
  }

  const { admin, response } = await requireAdmin(request, env);
  if (!admin) return response;

  if (path === '/me' && method === 'GET') {
    return json({ admin: { id: admin.id, username: admin.username, email: admin.email } });
  }
  if (path === '/password' && method === 'POST') return changePassword(request, env, admin);
  if (path === '/stats' && method === 'GET') return stats(env);
  if (path === '/upload' && method === 'POST') return upload(request, env);

  if (path === '/settings') {
    if (method === 'GET') return getSettings(env);
    if (method === 'POST') return saveSettings(request, env);
    return fail('Method not allowed', 405);
  }

  if (path === '/categories' && method === 'GET') {
    const { results } = await env.DB.prepare(
      `SELECT c.*, (SELECT COUNT(*) FROM posts p WHERE p.category_id = c.id) AS post_count
       FROM categories c ORDER BY c.name`,
    ).all();
    return json({ categories: results || [] });
  }
  if (path === '/categories' && method === 'POST') return saveCategory(request, env, null);
  const catMatch = path.match(/^\/categories\/(\d+)$/);
  if (catMatch) {
    const id = intOr(catMatch[1], 0);
    if (method === 'PUT') return saveCategory(request, env, id);
    if (method === 'DELETE') return deleteCategory(env, id);
  }

  if (path === '/tags' && method === 'GET') {
    const { results } = await env.DB.prepare(
      `SELECT t.*, (SELECT COUNT(*) FROM post_tags pt WHERE pt.tag_id = t.id) AS post_count
       FROM tags t ORDER BY t.name`,
    ).all();
    return json({ tags: results || [] });
  }
  if (path === '/tags' && method === 'POST') return saveTag(request, env, null);
  const tagMatch = path.match(/^\/tags\/(\d+)$/);
  if (tagMatch) {
    const id = intOr(tagMatch[1], 0);
    if (method === 'PUT') return saveTag(request, env, id);
    if (method === 'DELETE') return deleteTag(env, id);
  }

  if (path === '/posts' && method === 'GET') return listAdminPosts(request, env);
  if (path === '/posts' && method === 'POST') return savePost(request, env, null);

  const postMatch = path.match(/^\/posts\/(\d+)$/);
  if (postMatch) {
    const id = intOr(postMatch[1], 0);
    if (method === 'GET') return getAdminPost(env, id);
    if (method === 'PUT') return savePost(request, env, id);
    if (method === 'DELETE') return deletePost(env, id);
  }

  return fail('Not found', 404);
}

async function setup(request, env) {
  const countRow = await env.DB.prepare('SELECT COUNT(*) AS n FROM admins').first();
  if ((countRow?.n || 0) > 0) return fail('Admin account already exists.', 403);

  const body = await request.json().catch(() => ({}));
  const username = safeString(body.username, 60).trim();
  const email = safeString(body.email, 120).trim();
  const password = String(body.password || '');

  if (username.length < 3) return fail('Username must be at least 3 characters.');
  if (password.length < 10) return fail('Password must be at least 10 characters.');

  const { hash, salt } = await hashPassword(password);
  await env.DB
    .prepare('INSERT INTO admins (username, email, password_hash, password_salt) VALUES (?, ?, ?, ?)')
    .bind(username, email, hash, salt).run();

  return json({ ok: true, message: 'Admin account created. You can now sign in.' });
}

async function login(request, env) {
  if (!env.SESSION_SECRET) return fail('Server misconfigured: SESSION_SECRET is missing.', 500);

  const body = await request.json().catch(() => ({}));
  const username = safeString(body.username, 60).trim();
  const password = String(body.password || '');
  if (!username || !password) return fail('Username and password are required.');

  const admin = await env.DB
    .prepare('SELECT * FROM admins WHERE username = ? OR email = ?')
    .bind(username, username).first();

  const salt = admin?.password_salt || b64urlEncode(crypto.getRandomValues(new Uint8Array(16)));
  const expected = admin?.password_hash || b64urlEncode(new Uint8Array(32));
  const ok = await verifyPassword(password, salt, expected);

  if (!admin || !ok) return fail('Invalid credentials.', 401);

  const token = await createToken({ sub: admin.id, u: admin.username }, env.SESSION_SECRET, SESSION_TTL);
  return json(
    { admin: { id: admin.id, username: admin.username, email: admin.email } },
    { headers: { 'set-cookie': sessionCookie(token, isHttps(request), SESSION_TTL) } },
  );
}

async function changePassword(request, env, admin) {
  const body = await request.json().catch(() => ({}));
  const current = String(body.current_password || '');
  const next = String(body.new_password || '');
  if (next.length < 10) return fail('New password must be at least 10 characters.');

  const row = await env.DB.prepare('SELECT password_hash, password_salt FROM admins WHERE id = ?')
    .bind(admin.id).first();
  if (!row) return fail('Admin not found.', 404);

  const ok = await verifyPassword(current, row.password_salt, row.password_hash);
  if (!ok) return fail('Current password is incorrect.', 401);

  const { hash, salt } = await hashPassword(next);
  await env.DB
    .prepare("UPDATE admins SET password_hash = ?, password_salt = ?, updated_at = datetime('now') WHERE id = ?")
    .bind(hash, salt, admin.id).run();

  return json({ ok: true });
}

async function stats(env) {
  const [posts, published, drafts, views, categories, trending, recent] = await env.DB.batch([
    env.DB.prepare('SELECT COUNT(*) AS n FROM posts'),
    env.DB.prepare("SELECT COUNT(*) AS n FROM posts WHERE status = 'published'"),
    env.DB.prepare("SELECT COUNT(*) AS n FROM posts WHERE status = 'draft'"),
    env.DB.prepare('SELECT COALESCE(SUM(views), 0) AS n FROM posts'),
    env.DB.prepare('SELECT COUNT(*) AS n FROM categories'),
    env.DB.prepare("SELECT COUNT(*) AS n FROM posts WHERE trending = 1 AND status = 'published'"),
    env.DB.prepare(`SELECT p.id, p.title, p.slug, p.thumbnail_url, p.status, p.views,
                           p.updated_at, c.name AS category_name
                    FROM posts p LEFT JOIN categories c ON c.id = p.category_id
                    ORDER BY p.updated_at DESC LIMIT 8`),
  ]);

  return json({
    totals: {
      posts: posts.results[0].n,
      published: published.results[0].n,
      drafts: drafts.results[0].n,
      views: views.results[0].n,
      categories: categories.results[0].n,
      trending: trending.results[0].n,
    },
    recent: recent.results || [],
  });
}

async function upload(request, env) {
  const maxBytes = intOr(env.MAX_UPLOAD_BYTES, 350000);
  const form = await request.formData().catch(() => null);
  if (!form) return fail('Expected multipart/form-data.');

  const file = form.get('file');
  if (!file || typeof file === 'string') return fail('No file provided.');
  if (!IMAGE_TYPES.includes(file.type)) return fail('Only PNG, JPEG, WEBP and GIF images are allowed.');
  if (file.size > maxBytes) {
    return fail(`Image is too large. Maximum is ${Math.round(maxBytes / 1024)} KB.`);
  }

  const buffer = new Uint8Array(await file.arrayBuffer());
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < buffer.length; i += chunk) {
    binary += String.fromCharCode.apply(null, buffer.subarray(i, i + chunk));
  }
  const base64 = btoa(binary);

  const id = uid();
  await env.DB
    .prepare('INSERT INTO uploads (id, mime_type, byte_size, data) VALUES (?, ?, ?, ?)')
    .bind(id, file.type, buffer.length, base64).run();

  return json({ url: `/api/uploads/${id}`, id, size: buffer.length });
}

async function getSettings(env) {
  const { results } = await env.DB.prepare('SELECT key, value FROM settings').all();
  return json({ settings: Object.fromEntries((results || []).map((r) => [r.key, r.value])) });
}

async function saveSettings(request, env) {
  const body = await request.json().catch(() => ({}));
  const entries = Object.entries(body || {});
  if (!entries.length) return fail('No settings provided.');

  const statements = entries.map(([key, value]) =>
    env.DB.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
      .bind(String(key).slice(0, 80), safeString(value, 200000)));

  await env.DB.batch(statements);
  return json({ ok: true });
}

async function saveCategory(request, env, id) {
  const body = await request.json().catch(() => ({}));
  const name = safeString(body.name, 80).trim();
  if (!name) return fail('Category name is required.');
  const slug = slugify(body.slug || name);
  const description = safeString(body.description, 400);

  try {
    if (id) {
      await env.DB.prepare('UPDATE categories SET name = ?, slug = ?, description = ? WHERE id = ?')
        .bind(name, slug, description, id).run();
    } else {
      await env.DB.prepare('INSERT INTO categories (name, slug, description) VALUES (?, ?, ?)')
        .bind(name, slug, description).run();
    }
  } catch (e) {
    if (String(e.message).includes('UNIQUE')) return fail('A category with that name or slug already exists.');
    throw e;
  }
  return json({ ok: true });
}

async function deleteCategory(env, id) {
  await env.DB.prepare('DELETE FROM categories WHERE id = ?').bind(id).run();
  return json({ ok: true });
}

async function saveTag(request, env, id) {
  const body = await request.json().catch(() => ({}));
  const name = safeString(body.name, 60).trim();
  if (!name) return fail('Tag name is required.');
  const slug = slugify(body.slug || name);

  try {
    if (id) {
      await env.DB.prepare('UPDATE tags SET name = ?, slug = ? WHERE id = ?').bind(name, slug, id).run();
    } else {
      await env.DB.prepare('INSERT INTO tags (name, slug) VALUES (?, ?)').bind(name, slug).run();
    }
  } catch (e) {
    if (String(e.message).includes('UNIQUE')) return fail('That tag already exists.');
    throw e;
  }
  return json({ ok: true });
}

async function deleteTag(env, id) {
  await env.DB.prepare('DELETE FROM tags WHERE id = ?').bind(id).run();
  return json({ ok: true });
}

async function listAdminPosts(request, env) {
  const url = new URL(request.url);
  const page = clamp(intOr(url.searchParams.get('page'), 1), 1, 500);
  const limit = 20;
  const offset = (page - 1) * limit;
  const status = url.searchParams.get('status');
  const q = (url.searchParams.get('q') || '').trim();

  const where = ['1=1'];
  const binds = [];
  if (status === 'published' || status === 'draft') { where.push('p.status = ?'); binds.push(status); }
  if (q) { where.push('(p.title LIKE ? OR p.slug LIKE ?)'); binds.push(`%${q}%`, `%${q}%`); }
  const whereSql = where.join(' AND ');

  const countRow = await env.DB
    .prepare(`SELECT COUNT(*) AS total FROM posts p WHERE ${whereSql}`)
    .bind(...binds).first();

  const { results } = await env.DB
    .prepare(`SELECT p.id, p.title, p.slug, p.thumbnail_url, p.status, p.views,
                     p.featured, p.trending, p.live_preview, p.created_at, p.updated_at,
                     c.name AS category_name
              FROM posts p LEFT JOIN categories c ON c.id = p.category_id
              WHERE ${whereSql}
              ORDER BY p.updated_at DESC LIMIT ? OFFSET ?`)
    .bind(...binds, limit, offset).all();

  const total = countRow?.total || 0;
  return json({ posts: results || [], total, page, pages: Math.ceil(total / limit) || 0 });
}

async function getAdminPost(env, id) {
  const post = await env.DB.prepare('SELECT * FROM posts WHERE id = ?').bind(id).first();
  if (!post) return fail('Post not found', 404);

  const [tagsRes, imagesRes, filesRes, demoRes] = await env.DB.batch([
    env.DB.prepare('SELECT tag_id FROM post_tags WHERE post_id = ?').bind(id),
    env.DB.prepare('SELECT * FROM post_images WHERE post_id = ? ORDER BY sort_order, id').bind(id),
    env.DB.prepare('SELECT * FROM post_files WHERE post_id = ? ORDER BY sort_order, id').bind(id),
    env.DB.prepare('SELECT * FROM post_demo_files WHERE post_id = ? ORDER BY sort_order, id').bind(id),
  ]);

  const safeArray = (value) => {
    try {
      const parsed = JSON.parse(value || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
  };

  return json({
    post: {
      ...post,
      technologies: safeArray(post.technologies),
      features: safeArray(post.features),
      tag_ids: (tagsRes.results || []).map((r) => r.tag_id),
      images: imagesRes.results || [],
      files: filesRes.results || [],
      demo_files: demoRes.results || [],
    },
  });
}

async function savePost(request, env, id) {
  const body = await request.json().catch(() => null);
  if (!body) return fail('Invalid JSON body.');

  const title = safeString(body.title, 200).trim();
  if (!title) return fail('Title is required.');

  const slug = await uniqueSlug(env.DB, body.slug || title, id);
  const description = safeString(body.description, 500);
  const article = await sanitizeArticle(safeString(body.article_content, 400000));
  const thumbnail = safeString(body.thumbnail_url, 2000);
  const youtube = safeString(body.youtube_url, 500);
  const categoryId = body.category_id ? intOr(body.category_id, 0) || null : null;
  const technologies = JSON.stringify(parseArray(body.technologies));
  const features = JSON.stringify(parseArray(body.features));
  const featured = bool(body.featured);
  const trending = bool(body.trending);
  const livePreview = bool(body.live_preview);
  const status = body.status === 'published' ? 'published' : 'draft';
  const seoTitle = safeString(body.seo_title, 200);
  const seoDescription = safeString(body.seo_description, 400);
  const seoKeywords = safeString(body.seo_keywords, 400);
  const canonical = safeString(body.canonical_url, 500);
  const author = safeString(body.author, 120);

  let postId = id;

  if (id) {
    const existing = await env.DB.prepare('SELECT status, published_at FROM posts WHERE id = ?').bind(id).first();
    if (!existing) return fail('Post not found', 404);

    const publishedAt = status === 'published'
      ? (existing.published_at || new Date().toISOString())
      : existing.published_at;

    await env.DB.prepare(
      `UPDATE posts SET title = ?, slug = ?, description = ?, article_content = ?,
        thumbnail_url = ?, youtube_url = ?, category_id = ?, technologies = ?, features = ?,
        featured = ?, trending = ?, live_preview = ?, status = ?, seo_title = ?,
        seo_description = ?, seo_keywords = ?, canonical_url = ?, author = ?,
        published_at = ?, updated_at = datetime('now')
       WHERE id = ?`,
    ).bind(
      title, slug, description, article, thumbnail, youtube, categoryId,
      technologies, features, featured, trending, livePreview, status,
      seoTitle, seoDescription, seoKeywords, canonical, author, publishedAt, id,
    ).run();
  } else {
    const publishedAt = status === 'published' ? new Date().toISOString() : null;
    const result = await env.DB.prepare(
      `INSERT INTO posts (title, slug, description, article_content, thumbnail_url, youtube_url,
        category_id, technologies, features, featured, trending, live_preview, status,
        seo_title, seo_description, seo_keywords, canonical_url, author, published_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(
      title, slug, description, article, thumbnail, youtube, categoryId,
      technologies, features, featured, trending, livePreview, status,
      seoTitle, seoDescription, seoKeywords, canonical, author, publishedAt,
    ).run();

    postId = result.meta.last_row_id;
  }

  await persistRelations(env, postId, body);
  return json({ ok: true, id: postId, slug });
}

async function persistRelations(env, postId, body) {
  const statements = [];

  statements.push(env.DB.prepare('DELETE FROM post_tags WHERE post_id = ?').bind(postId));
  const tagIds = Array.isArray(body.tag_ids) ? body.tag_ids.map((t) => intOr(t, 0)).filter(Boolean) : [];
  for (const tagId of [...new Set(tagIds)]) {
    statements.push(
      env.DB.prepare('INSERT OR IGNORE INTO post_tags (post_id, tag_id) VALUES (?, ?)').bind(postId, tagId),
    );
  }

  statements.push(env.DB.prepare('DELETE FROM post_images WHERE post_id = ?').bind(postId));
  const images = Array.isArray(body.images) ? body.images : [];
  images.forEach((img, index) => {
    const url = safeString(img.image_url, 2000).trim();
    if (!url) return;
    statements.push(
      env.DB.prepare(
        'INSERT INTO post_images (post_id, image_url, alt_text, caption, sort_order) VALUES (?, ?, ?, ?, ?)',
      ).bind(postId, url, safeString(img.alt_text, 300), safeString(img.caption, 400), index),
    );
  });

  statements.push(env.DB.prepare('DELETE FROM post_files WHERE post_id = ?').bind(postId));
  const files = Array.isArray(body.files) ? body.files : [];
  files.forEach((file, index) => {
    const name = safeString(file.file_name, 200).trim();
    if (!name) return;
    statements.push(
      env.DB.prepare(
        `INSERT INTO post_files (post_id, file_name, file_path, language, code_content, sort_order)
         VALUES (?, ?, ?, ?, ?, ?)`,
      ).bind(
        postId, name,
        safeString(file.file_path, 400) || name,
        safeString(file.language, 40) || 'text',
        safeString(file.code_content, 400000),
        index,
      ),
    );
  });

  statements.push(env.DB.prepare('DELETE FROM post_demo_files WHERE post_id = ?').bind(postId));
  const demoFiles = Array.isArray(body.demo_files) ? body.demo_files : [];
  demoFiles.forEach((file, index) => {
    const filePath = safeString(file.file_path, 400).trim();
    if (!filePath) return;
    statements.push(
      env.DB.prepare(
        `INSERT INTO post_demo_files (post_id, file_path, file_content, file_type, sort_order)
         VALUES (?, ?, ?, ?, ?)`,
      ).bind(
        postId, filePath,
        safeString(file.file_content, 400000),
        safeString(file.file_type, 80) || 'text/html',
        index,
      ),
    );
  });

  await env.DB.batch(statements);
}

async function deletePost(env, id) {
  await env.DB.prepare('DELETE FROM posts WHERE id = ?').bind(id).run();
  return json({ ok: true });
}
