const enc = new TextEncoder();

export function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...(init.headers || {}),
    },
  });
}

export function fail(message, status = 400) {
  return json({ error: message }, { status });
}

export function slugify(input) {
  return String(input || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90) || 'post';
}

export function uid() {
  return crypto.randomUUID();
}

export function parseArray(value) {
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.map((v) => String(v).trim()).filter(Boolean);
    } catch {
      return value.split(',').map((v) => v.trim()).filter(Boolean);
    }
  }
  return [];
}

export function bool(value) {
  return value === true || value === 1 || value === '1' || value === 'true' ? 1 : 0;
}

export function intOr(value, fallback = 0) {
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
}

export function clamp(n, min, max) {
  return Math.min(Math.max(n, min), max);
}

export function safeString(value, max = 5000) {
  if (value === null || value === undefined) return '';
  return String(value).slice(0, max);
}

export async function sha256Hex(text) {
  const buf = await crypto.subtle.digest('SHA-256', enc.encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function uniqueSlug(db, base, excludeId = null) {
  let slug = slugify(base);
  let n = 1;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const row = excludeId
      ? await db.prepare('SELECT id FROM posts WHERE slug = ? AND id != ?').bind(slug, excludeId).first()
      : await db.prepare('SELECT id FROM posts WHERE slug = ?').bind(slug).first();
    if (!row) return slug;
    n += 1;
    slug = `${slugify(base)}-${n}`;
  }
}

export function clientIp(request) {
  return request.headers.get('cf-connecting-ip')
    || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || '0.0.0.0';
}

export function isHttps(request) {
  return new URL(request.url).protocol === 'https:';
}
