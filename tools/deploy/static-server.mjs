#!/usr/bin/env node
// Minimal static file server for a deployed customer frontend. Falls back
// to index.html for any unmatched path, since the shell uses client-side
// routing (react-router-dom) - a direct request for e.g. /leads/3 has no
// matching file on disk and must still return the SPA shell.
//
// Usage: node static-server.mjs --dir <path> --port <n> [--host 127.0.0.1]

import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
function flag(name, fallback) {
  const idx = args.indexOf(`--${name}`);
  return idx !== -1 && args[idx + 1] !== undefined ? args[idx + 1] : fallback;
}

const rootDir = path.resolve(flag('dir', '.'));
const port = Number(flag('port', '4000'));
const host = flag('host', '127.0.0.1');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

const server = createServer((req, res) => {
  const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
  let filePath = path.normalize(path.join(rootDir, urlPath));

  // Path traversal guard: resolved path must stay under rootDir.
  if (!filePath.startsWith(rootDir)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Forbidden');
    return;
  }

  if (!existsSync(filePath) || statSync(filePath).isDirectory()) {
    filePath = path.join(rootDir, 'index.html'); // SPA fallback
  }

  if (!existsSync(filePath)) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found - nothing deployed here yet?');
    return;
  }

  const ext = path.extname(filePath);
  res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
  createReadStream(filePath).pipe(res);
});

server.listen(port, host, () => {
  console.log(`Serving ${rootDir} at http://${host}:${port}`);
});
