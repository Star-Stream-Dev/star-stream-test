import JSZip from 'jszip';

export interface BundleAnalysis {
  valid: boolean;
  entryFile: string | null;
  prefix: string;
  files: { path: string; isJunk: boolean }[];
  error?: string;
}

const JUNK_PATTERNS = [
  /^__MACOSX\//,
  /\/\.DS_Store$/,
  /^\.DS_Store$/,
  /\/Thumbs\.db$/,
  /^Thumbs\.db$/,
  /\/desktop\.ini$/,
  /^\./,
];

function isJunkFile(path: string): boolean {
  return JUNK_PATTERNS.some(p => p.test(path));
}

const MIME_TYPES: Record<string, string> = {
  'html': 'text/html', 'htm': 'text/html',
  'js': 'application/javascript', 'mjs': 'application/javascript',
  'css': 'text/css', 'json': 'application/json',
  'png': 'image/png', 'jpg': 'image/jpeg', 'jpeg': 'image/jpeg',
  'gif': 'image/gif', 'svg': 'image/svg+xml', 'webp': 'image/webp',
  'ico': 'image/x-icon', 'bmp': 'image/bmp',
  'woff': 'font/woff', 'woff2': 'font/woff2', 'ttf': 'font/ttf', 'otf': 'font/otf',
  'mp3': 'audio/mpeg', 'ogg': 'audio/ogg', 'wav': 'audio/wav',
  'mp4': 'video/mp4', 'webm': 'video/webm',
  'wasm': 'application/wasm',
  'xml': 'application/xml',
  'txt': 'text/plain',
  'map': 'application/json',
  'atlas': 'application/json',
  'fnt': 'text/plain',
  'bin': 'application/octet-stream',
  'data': 'application/octet-stream',
  'mem': 'application/octet-stream',
  'pck': 'application/octet-stream',
};

export function getMimeType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  return MIME_TYPES[ext] || 'application/octet-stream';
}

/**
 * Analyze a ZIP archive and detect the HTML entry point.
 */
export function analyzeBundle(zip: JSZip): BundleAnalysis {
  const allEntries = Object.keys(zip.files);
  const fileEntries = allEntries.filter(e => !zip.files[e].dir);

  // Filter out junk
  const cleanFiles = fileEntries.map(path => ({
    path,
    isJunk: isJunkFile(path),
  }));
  const usableFiles = cleanFiles.filter(f => !f.isJunk);

  if (usableFiles.length === 0) {
    return { valid: false, entryFile: null, prefix: '', files: cleanFiles, error: 'ZIP contains no usable files' };
  }

  // Detect single top-level folder wrapper
  const topLevel = new Set<string>();
  for (const f of usableFiles) {
    const firstPart = f.path.split('/')[0];
    topLevel.add(firstPart);
  }

  let prefix = '';
  if (topLevel.size === 1) {
    const singleDir = Array.from(topLevel)[0];
    // Check if it's a directory (all files start with it + /)
    const allUnder = usableFiles.every(f => f.path.startsWith(singleDir + '/'));
    if (allUnder) {
      prefix = singleDir + '/';
    }
  }

  // Strip prefix to get "virtual" paths
  const virtualPaths = usableFiles.map(f => {
    let vp = f.path;
    if (prefix && vp.startsWith(prefix)) {
      vp = vp.slice(prefix.length);
    }
    return vp;
  }).filter(Boolean);

  // Find HTML entry in priority order
  const htmlFiles = virtualPaths.filter(p => /\.html?$/i.test(p));

  let entryFile: string | null = null;

  // Priority 1: index.html at root (case-insensitive)
  const rootIndex = htmlFiles.find(p => /^index\.html?$/i.test(p));
  if (rootIndex) {
    entryFile = rootIndex;
  }

  // Priority 2: any root-level .html
  if (!entryFile) {
    const rootHtml = htmlFiles.find(p => !p.includes('/'));
    if (rootHtml) entryFile = rootHtml;
  }

  // Priority 3: index.html anywhere
  if (!entryFile) {
    const anyIndex = htmlFiles.find(p => /\/index\.html?$/i.test(p));
    if (anyIndex) entryFile = anyIndex;
  }

  // Priority 4: single html file anywhere
  if (!entryFile && htmlFiles.length === 1) {
    entryFile = htmlFiles[0];
  }

  if (!entryFile) {
    return {
      valid: false,
      entryFile: null,
      prefix,
      files: cleanFiles,
      error: htmlFiles.length === 0
        ? 'No HTML files found in the ZIP. This doesn\'t appear to be an HTML5 game bundle.'
        : `Found ${htmlFiles.length} HTML files but couldn't determine the entry point. Expected an index.html file.`,
    };
  }

  return { valid: true, entryFile, prefix, files: cleanFiles };
}

/**
 * Get the actual ZIP path for a virtual entry file.
 */
export function getActualPath(entryFile: string, prefix: string): string {
  return prefix ? prefix + entryFile : entryFile;
}

/**
 * Resolve a hosted_path value to a full public URL.
 * Handles both legacy full URLs and new relative storage paths.
 */
export function resolveHostedUrl(hostedPath: string, supabaseUrl: string): string {
  // Already a full URL (legacy format)
  if (hostedPath.startsWith('http://') || hostedPath.startsWith('https://')) {
    return hostedPath;
  }
  // Relative storage path — build the public URL
  return `${supabaseUrl}/storage/v1/object/public/game-files/${hostedPath}`;
}
