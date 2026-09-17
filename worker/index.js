import { handlePublic } from './public.js';
import { handleAdmin } from './admin.js';
import { fail } from './util.js';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const { pathname } = url;

    try {
      // ===================== API =====================
      if (pathname.startsWith('/api/admin')) return await handleAdmin(request, env);
      if (pathname.startsWith('/api/')) return await handlePublic(request, env);

      // ===================== Generated files =====================
      if (pathname === '/sitemap.xml') return await sitemap(request, env);
      if (pathname === '/robots.txt') return await robots(request, env);

      // ===================== Static assets =====================
      // Anything that looks like a file (has an extension or lives in /assets/)
      // is served exactly as-is. If it doesn't exist → real 404 (no HTML fallback).
      const looksLikeAsset =
        pathname.startsWith('/assets/') || /\.[a-z0-9]+$/i.test(pathname);

      if (looksLikeAsset) {
        const response = await env.ASSETS.fetch(request);
        const headers = new Headers(response.headers);

        // Hashed Vite chunks are immutable — safe to cache for 1 year.
        // The filename changes whenever the content changes.
        if (response.status === 200) {
          headers.set('cache-control', 'public, max-age=31536000, immutable');
        }
        // If 404, don't touch cache headers — browser should not cache a miss.

        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers,
        });
      }

      // ===================== SPA shell =====================
      // Every other path is a client-side route (/, /project/x, /admin/login, …).
      // Always serve index.html with NO-CACHE so the browser picks up the
      // current hashed asset references on every navigation.
      const indexRequest = new Request(new URL('/', url.origin), request);
      const response = await env.ASSETS.fetch(indexRequest);

      if (!response.ok) {
        return new Response('SPA shell missing', { status: 500 });
      }

      const headers = new Headers(response.headers);
      headers.set('content-type', 'text/html; charset=utf-8');
      headers.set('cache-control', 'no-cache, no-store, must-revalidate');
      headers.set('pragma', 'no-cache');
      headers.set('expires', '0');

      return new Response(response.body, {
        status: 200,
        headers,
      });
    } catch (err) {
      console.error('Worker error:', err && err.stack ? err.stack : err);
      if (pathname.startsWith('/api/')) return fail('Internal server error', 500);
      return new Response('Internal Server Error', { status: 500 });
    }
  },
};

// ================================================================
// robots.txt
// ================================================================
async function robots(request, env) {
  const origin = new URL(request.url).origin;
  const body = `User-agent: *
Allow: /
Disallow: /admin/
Disallow: /api/

Sitemap: ${origin}/sitemap.xml
`;
  return new Response(body, {
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'public, max-age=3600',
    },
  });
}

// ================================================================
// sitemap.xml
// ================================================================
async function sitemap(request, env) {
  const origin = new URL(request.url).origin;

  const [posts, categories, tags] = await env.DB.batch([
    env.DB.prepare(
      "SELECT slug, updated_at FROM posts WHERE status = 'published' ORDER BY updated_at DESC LIMIT 5000",
    ),
    env.DB.prepare('SELECT slug FROM categories ORDER BY name'),
    env.DB.prepare(
      `SELECT t.slug FROM tags t
       WHERE EXISTS (SELECT 1 FROM post_tags pt JOIN posts p ON p.id = pt.post_id
                     WHERE pt.tag_id = t.id AND p.status = 'published')
       ORDER BY t.name`,
    ),
  ]);

  const staticPages = [
    { loc: '/', priority: '1.0' },
    { loc: '/latest', priority: '0.8' },
    { loc: '/trending', priority: '0.8' },
    { loc: '/about', priority: '0.4' },
    { loc: '/contact', priority: '0.4' },
    { loc: '/privacy-policy', priority: '0.3' },
    { loc: '/terms', priority: '0.3' },
    { loc: '/disclaimer', priority: '0.3' },
    { loc: '/cookie-policy', priority: '0.3' },
  ];

  const urls = [];
  for (const page of staticPages) {
    urls.push(`  <url><loc>${origin}${page.loc}</loc><priority>${page.priority}</priority></url>`);
  }
  for (const post of posts.results || []) {
    const lastmod = post.updated_at
      ? `\n    <lastmod>${new Date(post.updated_at).toISOString()}</lastmod>`
      : '';
    urls.push(
      `  <url><loc>${origin}/project/${encodeURIComponent(post.slug)}</loc>${lastmod}<priority>0.9</priority></url>`,
    );
  }
  for (const category of categories.results || []) {
    urls.push(
      `  <url><loc>${origin}/category/${encodeURIComponent(category.slug)}</loc><priority>0.6</priority></url>`,
    );
  }
  for (const tag of tags.results || []) {
    urls.push(
      `  <url><loc>${origin}/tag/${encodeURIComponent(tag.slug)}</loc><priority>0.5</priority></url>`,
    );
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`;

  return new Response(xml, {
    headers: {
      'content-type': 'application/xml; charset=utf-8',
      'cache-control': 'public, max-age=1800',
    },
  });
}
