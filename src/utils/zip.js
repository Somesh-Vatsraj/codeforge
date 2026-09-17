/* Minimal, dependency-free ZIP writer (STORE method, UTF-8 names). */

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let c = i;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(bytes) {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) {
    crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

const encoder = new TextEncoder();

function toBytes(value) {
  return typeof value === 'string' ? encoder.encode(value) : value;
}

function u16(n) {
  return new Uint8Array([n & 0xff, (n >>> 8) & 0xff]);
}

function u32(n) {
  return new Uint8Array([n & 0xff, (n >>> 8) & 0xff, (n >>> 16) & 0xff, (n >>> 24) & 0xff]);
}

function concat(chunks) {
  const total = chunks.reduce((sum, c) => sum + c.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}

/**
 * @param {Array<{path: string, content: string|Uint8Array}>} entries
 * @returns {Blob}
 */
export function createZip(entries) {
  const localChunks = [];
  const centralChunks = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBytes = encoder.encode(entry.path.replace(/^\/+/, ''));
    const data = toBytes(entry.content ?? '');
    const crc = crc32(data);

    const localHeader = concat([
      u32(0x04034b50), u16(20), u16(0x0800), u16(0), u16(0), u16(0),
      u32(crc), u32(data.length), u32(data.length),
      u16(nameBytes.length), u16(0), nameBytes,
    ]);

    localChunks.push(localHeader, data);

    centralChunks.push(concat([
      u32(0x02014b50), u16(20), u16(20), u16(0x0800), u16(0), u16(0), u16(0),
      u32(crc), u32(data.length), u32(data.length),
      u16(nameBytes.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(offset),
      nameBytes,
    ]));

    offset += localHeader.length + data.length;
  }

  const centralDirectory = concat(centralChunks);
  const endOfCentralDirectory = concat([
    u32(0x06054b50), u16(0), u16(0),
    u16(entries.length), u16(entries.length),
    u32(centralDirectory.length), u32(offset), u16(0),
  ]);

  return new Blob([...localChunks, centralDirectory, endOfCentralDirectory], { type: 'application/zip' });
}

/** Triggers a browser download for a Blob. */
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/** Builds the download archive for a post from its source files (falls back to demo files). */
export function buildProjectZip(post) {
  const sourceFiles = (post.files || []).filter((f) => (f.code_content || '').length || f.file_name);
  const files = sourceFiles.length
    ? sourceFiles.map((f) => ({ path: f.file_path || f.file_name, content: f.code_content || '' }))
    : (post.demo_files || []).map((f) => ({ path: f.file_path, content: f.file_content || '' }));

  if (!files.length) {
    files.push({ path: 'README.txt', content: 'This project has no uploaded files yet.' });
  }

  return createZip(files);
}
