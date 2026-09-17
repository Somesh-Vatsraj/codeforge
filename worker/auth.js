import { json, fail } from './util.js';

const enc = new TextEncoder();
const dec = new TextDecoder();

// PBKDF2 iterations. Lower to 25000 if you hit CPU limits on the Workers Free plan.
const ITERATIONS = 100000;
const COOKIE_NAME = 'cf_session';
const SESSION_TTL = 60 * 60 * 12; // 12 hours

/* ------------------------- base64url helpers ------------------------- */

export function b64urlEncode(bytes) {
  let bin = '';
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  for (let i = 0; i < arr.length; i += 1) bin += String.fromCharCode(arr[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function b64urlDecode(str) {
  const pad = str.length % 4 === 0 ? '' : '='.repeat(4 - (str.length % 4));
  const bin = atob(str.replace(/-/g, '+').replace(/_/g, '/') + pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
  return out;
}

/* ------------------------- password hashing ------------------------- */

export async function hashPassword(password, saltB64 = null) {
  const salt = saltB64 ? b64urlDecode(saltB64) : crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey(
    'raw', enc.encode(password), 'PBKDF2', false, ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    256,
  );
  return { hash: b64urlEncode(new Uint8Array(bits)), salt: b64urlEncode(salt) };
}

function constantTimeEqual(a, b) {
  const ab = b64urlDecode(a);
  const bb = b64urlDecode(b);
  if (ab.length !== bb.length) return false;
  let diff = 0;
  for (let i = 0; i < ab.length; i += 1) diff |= ab[i] ^ bb[i];
  return diff === 0;
}

export async function verifyPassword(password, salt, expectedHash) {
  const { hash } = await hashPassword(password, salt);
  return constantTimeEqual(hash, expectedHash);
}

/* ------------------------- signed session tokens ------------------------- */

async function hmacKey(secret) {
  return crypto.subtle.importKey(
    'raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify'],
  );
}

export async function createToken(payload, secret, ttl = SESSION_TTL) {
  const now = Math.floor(Date.now() / 1000);
  const body = { ...payload, iat: now, exp: now + ttl };
  const data = b64urlEncode(enc.encode(JSON.stringify(body)));
  const sig = await crypto.subtle.sign('HMAC', await hmacKey(secret), enc.encode(data));
  return `${data}.${b64urlEncode(new Uint8Array(sig))}`;
}

export async function verifyToken(token, secret) {
  if (typeof token !== 'string' || !token.includes('.')) return null;
  const [data, sig] = token.split('.');
  if (!data || !sig) return null;
  try {
    const ok = await crypto.subtle.verify(
      'HMAC', await hmacKey(secret), b64urlDecode(sig), enc.encode(data),
    );
    if (!ok) return null;
    const payload = JSON.parse(dec.decode(b64urlDecode(data)));
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

/* ------------------------- cookies ------------------------- */

export function parseCookies(request) {
  const header = request.headers.get('cookie') || '';
  const out = {};
  header.split(';').forEach((part) => {
    const idx = part.indexOf('=');
    if (idx === -1) return;
    out[part.slice(0, idx).trim()] = decodeURIComponent(part.slice(idx + 1).trim());
  });
  return out;
}

export function sessionCookie(token, secure, maxAge = SESSION_TTL) {
  const parts = [
    `${COOKIE_NAME}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAge}`,
  ];
  if (secure) parts.push('Secure');
  return parts.join('; ');
}

export function clearCookie(secure) {
  return sessionCookie('', secure, 0);
}

/* ------------------------- guard ------------------------- */

export async function getAdmin(request, env) {
  if (!env.SESSION_SECRET) return null;
  const token = parseCookies(request)[COOKIE_NAME];
  if (!token) return null;
  const payload = await verifyToken(token, env.SESSION_SECRET);
  if (!payload?.sub) return null;
  const admin = await env.DB
    .prepare('SELECT id, username, email FROM admins WHERE id = ?')
    .bind(payload.sub)
    .first();
  return admin || null;
}

export async function requireAdmin(request, env) {
  const admin = await getAdmin(request, env);
  if (!admin) return { admin: null, response: fail('Unauthorized', 401) };
  return { admin, response: null };
}

export { COOKIE_NAME, SESSION_TTL, json };
