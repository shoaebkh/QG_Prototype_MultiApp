#!/usr/bin/env node
// Local-only dashboard: shows the shell's current version and lets you
// trigger `build-apps.mjs` for a chosen app combination from a browser
// instead of the terminal.
//
// Usage: node tools/build-dashboard/server.mjs
// Then open http://127.0.0.1:5055
//
// Deliberately binds to 127.0.0.1 only and has no auth - it shells out to
// git (commit/tag) and vite build on whoever's machine runs it, so it must
// never be exposed beyond localhost.

import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { discoverApps, shellDir, repoRoot } from '../../apps/shell/scripts/build-apps.mjs';

const PORT = 5055;
const HOST = '127.0.0.1';
const buildScript = path.join(shellDir, 'scripts', 'build-apps.mjs');
const indexHtmlPath = path.join(path.dirname(fileURLToPath(import.meta.url)), 'index.html');

async function getAppDetails() {
  const idToDir = await discoverApps();
  const packagesDir = path.join(repoRoot, 'packages');
  const details = [];
  for (const [id, dirName] of idToDir) {
    const manifestPath = path.join(packagesDir, dirName, 'src', 'manifest.js');
    const { default: manifest } = await import(pathToFileURL(manifestPath).href);
    details.push(manifest);
  }
  return details.sort((a, b) => a.id.localeCompare(b.id));
}

function readVersion() {
  const pkg = JSON.parse(readFileSync(path.join(shellDir, 'package.json'), 'utf8'));
  return pkg.version;
}

function gitHead() {
  const res = spawnSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: repoRoot, encoding: 'utf8' });
  return res.status === 0 ? res.stdout.trim() : null;
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > 1e6) req.destroy(new Error('Body too large'));
    });
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload),
  });
  res.end(payload);
}

async function handleStatus(res) {
  const apps = await getAppDetails();
  sendJson(res, 200, { version: readVersion(), head: gitHead(), apps });
}

async function handleBuild(req, res) {
  let body;
  try {
    body = await readJsonBody(req);
  } catch {
    sendJson(res, 400, { success: false, output: 'Invalid JSON body.' });
    return;
  }

  const ids = Array.isArray(body.ids) ? body.ids.filter((id) => typeof id === 'string' && id.trim()) : [];
  if (ids.length === 0) {
    sendJson(res, 400, { success: false, output: 'Pick at least one app.' });
    return;
  }

  const args = [buildScript, ids.join(',')];
  if (body.noRelease) {
    args.push('--no-release');
  } else if (typeof body.setVersion === 'string' && body.setVersion.trim()) {
    args.push('--set-version', body.setVersion.trim());
  } else {
    const bump = ['major', 'minor', 'patch'].includes(body.bump) ? body.bump : 'patch';
    args.push('--bump', bump);
  }

  // node.exe is a real executable (unlike npm.cmd on Windows), so no
  // shell:true is needed here - see build-apps.mjs's own git()/npm notes
  // for why that distinction matters on Windows.
  const result = spawnSync('node', args, { cwd: repoRoot, encoding: 'utf8' });

  const rawOutput = `${result.stdout ?? ''}${result.stderr ?? ''}`.trim();
  sendJson(res, 200, {
    success: result.status === 0,
    exitCode: result.status,
    output: rawOutput.replace(/\x1b\[[0-9;]*m/g, ''), // strip vite's ANSI color codes
    version: readVersion(),
  });
}

function handleIndex(res) {
  const html = readFileSync(indexHtmlPath, 'utf8');
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(html);
}

const server = createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === 'GET' && url.pathname === '/') {
    handleIndex(res);
  } else if (req.method === 'GET' && url.pathname === '/api/status') {
    handleStatus(res).catch((err) => sendJson(res, 500, { success: false, output: String(err) }));
  } else if (req.method === 'POST' && url.pathname === '/api/build') {
    handleBuild(req, res).catch((err) => sendJson(res, 500, { success: false, output: String(err) }));
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
  }
});

if (!existsSync(indexHtmlPath)) {
  console.error(`Missing ${indexHtmlPath}`);
  process.exit(1);
}

server.listen(PORT, HOST, () => {
  console.log(`Build dashboard running at http://${HOST}:${PORT} (localhost only)`);
});
