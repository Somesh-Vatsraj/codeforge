import { handlePublic } from './public.js';
import { handleAdmin } from './admin.js';
import { fail } from './util.js';
import { escapeHtml } from './sanitize.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const { pathname } = url;

    try {
      if (pathname.startsWith('/api/admin')) return await handleAdmin(request, env, ctx);
      if (pathname.startsWith('/api/')) return await handlePublic(request, env, ctx);

      if (pathname === '/sitemap.xml') return await sitemap(request, env);
      if (pathname === '/robots.txt') return await robots(request, env);

      if (pathname.startsWith('/project/')) {
        return await renderPostShell(request, env, decodeURIComponent(pathname.slice('/project/'.length)));
      }

      return env.ASSETS.fetch(request);
    } catch (err) {
      console.error('Worker error:', err && err.stack ? err.stack : err);
      if (pathname.startsWith('/api/')) return fail('Internal server error', 500);
      return new Response('Internal Server Error', { status: 500 });
    }
  },
};

/* ---------- dynamic robots.txt ---------- */

async function robots(request, env) {
  const origin = new URL(request.url).origin;
  const body = `User-agent: *
Allow: /
Disallow: /admin/
Disallow: /api/

Sitemap: ${origin}/sitemap.xml
`;
  return new Response(body, {
    headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=3600' },
  });
}

/* ---------- dynamic sitemap.xml (published posts only) ---------- */

async function sitemap(request, env) {
  const origin = new URL(request.url).origin;

  const [posts, categories, tags] = await env.DB.batch([
    env.DB.prepare("SELECT slug, updated_at FROM posts WHERE status = 'published' ORDER BY updated_at DESC LIMIT 5000"),
    env.DB.prepare('SELECT slug FROM categories ORDER BY name'),
    env.DB.prepare(`SELECT t.slug FROM tags t
                    WHERE EXISTS (SELECT 1 FROM post_tags pt JOIN posts p ON p.id = pt.post_id
                                  WHERE pt.tag_id = t.id AND p.status = 'published')
                    ORDER BY t.name`),
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
    const lastmod = post.updated_at ? `\n    <lastmod>${new Date(post.updated_at).toISOString()}</lastmod>` : '';
    urls.push(`  <url><loc>${origin}/project/${encodeURIComponent(post.slug)}</loc>${lastmod}<priority>0.9</priority></url>`);
  }
  for (const category of categories.results || []) {
    urls.push(`  <url><loc>${origin}/category/${encodeURIComponent(category.slug)}</loc><priority>0.6</priority></url>`);
  }
  for (const tag of tags.results || []) {
    urls.push(`  <url><loc>${origin}/tag/${encodeURIComponent(tag.slug)}</loc><priority>0.5</priority></url>`);
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`;

  return new Response(xml, {
    headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=1800' },
  });
}

/* ---------- server-side meta injection for post pages ---------- */

async function renderPostShell(request, env, slug) {
  const indexResponse = await env.ASSETS.fetch(new URL('/', request.url));
  if (!indexResponse.ok) return indexResponse;

  const post = await env.DB
    .prepare(`SELECT p.title, p.description, p.thumbnail_url, p.seo_title, p.seo_description,
                     p.canonical_url, p.published_at, p.updated_at, p.author, p.views,
                     c.name AS category_name
              FROM posts p LEFT JOIN categories c ON c.id = p.category_id
              WHERE p.slug = ? AND p.status = 'published'`)
    .bind(slug)
    .first();

  if (!post) {
    // Unknown slug → let the SPA render its 404 page.
    return indexResponse;
  }

  const origin = new URL(request.url).origin;
  const canonical = post.canonical_url || `${origin}/project/${slug}`;
  const title = post.seo_title || `${post.title}`;
  const description = post.seo_description || post.description || '';
  const image = absolutize(post.thumbnail_url, origin) || `${origin}/favicon.svg`;

  const ld = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: title,
    description,
    image: [image],
    datePublished: post.published_at || post.updated_at,
    dateModified: post.updated_at,
    author: { '@type': 'Organization', name: post.author || 'Editorial Team' },
    publisher: { '@type': 'Organization', name: 'CodeForge' },
    mainEntityOfPage: { '@type': 'WebPage', '@id': canonical },
    articleSection: post.category_name || undefined,
  };

  const ldJson = JSON.stringify(ld).replace(/</g, '\\u003c');

  const transformed = new HTMLRewriter()
    .on('title', { element(el) { el.setInnerContent(escapeHtml(title)); } })
    .on('meta[name="description"]', { element(el) { el.setAttribute('content', description); } })
    .on('link[rel="canonical"]', { element(el) { el.setAttribute('href', canonical); } })
    .on('meta[property="og:title"]', { element(el) { el.setAttribute('content', title); } })
    .on('meta[property="og:description"]', { element(el) { el.setAttribute('content', description); } })
    .on('meta[property="og:image"]', { element(el) { el.setAttribute('content', image); } })
    .on('meta[property="og:url"]', { element(el) { el.setAttribute('content', canonical); } })
    .on('meta[property="og:type"]', { element(el) { el.setAttribute('content', 'article'); } })
    .on('meta[name="twitter:title"]', { element(el) { el.setAttribute('content', title); } })
    .on('meta[name="twitter:description"]', { element(el) { el.setAttribute('content', description); } })
    .on('meta[name="twitter:image"]', { element(el) { el.setAttribute('content', image); } })
    .on('script#ld-json', { element(el) { el.setInnerContent(ldJson, { html: true }); } })
    .transform(indexResponse);

  const body = await transformed.text();
  return new Response(body, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'public, max-age=300',
    },
  });
}

function absolutize(url, origin) {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith('/')) return origin + url;
  return '';
}
