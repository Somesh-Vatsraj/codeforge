const ID_PATTERN = /^[A-Za-z0-9_-]{6,20}$/;

/** Extracts a YouTube video id from any common URL shape. Returns null when invalid. */
export function getYouTubeId(url) {
  if (!url || typeof url !== 'string') return null;

  const trimmed = url.trim();
  if (ID_PATTERN.test(trimmed)) return trimmed;

  let parsed;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }

  const host = parsed.hostname.replace(/^www\./, '');

  if (host === 'youtu.be') {
    const id = parsed.pathname.slice(1).split('/')[0];
    return ID_PATTERN.test(id) ? id : null;
  }

  if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com') {
    if (parsed.pathname === '/watch') {
      const id = parsed.searchParams.get('v');
      return id && ID_PATTERN.test(id) ? id : null;
    }
    const match = parsed.pathname.match(/^\/(embed|shorts|live|v)\/([A-Za-z0-9_-]{6,20})/);
    if (match) return match[2];
  }

  return null;
}

export function getEmbedUrl(url) {
  const id = getYouTubeId(url);
  return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
}

export function getWatchUrl(url) {
  const id = getYouTubeId(url);
  return id ? `https://www.youtube.com/watch?v=${id}` : null;
}
