// Tiny static server for local testing. Serves the repo root under /game-room
// so the service worker's BASE path works exactly like production.
import http from 'node:http';
import { createReadStream, statSync, existsSync } from 'node:fs';
import { join, extname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(import.meta.url), '..', '..');
const BASE = '/game-room';
const PORT = +(process.env.PORT || 4173);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
};

const server = http.createServer((req, res) => {
  let url = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (url === '/' ) { res.writeHead(302, { Location: BASE + '/' }); return res.end(); }
  if (!url.startsWith(BASE)) { res.writeHead(404); return res.end('Not under ' + BASE); }
  url = url.slice(BASE.length) || '/';
  if (url.endsWith('/')) url += 'index.html';
  const file = normalize(join(ROOT, url));
  if (!file.startsWith(ROOT) || !existsSync(file) || statSync(file).isDirectory()) {
    res.writeHead(404); return res.end('Not found');
  }
  res.writeHead(200, {
    'Content-Type': MIME[extname(file).toLowerCase()] || 'application/octet-stream',
    'Cache-Control': 'no-store',
    'Service-Worker-Allowed': BASE + '/',
  });
  createReadStream(file).pipe(res);
});

server.listen(PORT, () => console.log(`Serving ${ROOT} at http://localhost:${PORT}${BASE}/`));
