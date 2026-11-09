#!/usr/bin/env node
// Local-only dashboard: shows the frontend shell's and backend's current
// versions and lets you trigger build-apps.mjs / build-services.mjs for a
// chosen combination from a browser instead of the terminal.
//
// Usage: node tools/build-dashboard/server.mjs
// Then open http://127.0.0.1:5055
//
// Deliberately binds to 127.0.0.1 only and has no auth - it shells out to
// git (commit/tag), vite build, and mvn package on whoever's machine runs
// it, so it must never be exposed beyond localhost.

import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { discoverApps, shellDir, repoRoot } from '../../apps/shell/scripts/build-apps.mjs';
import { discoverServices, backendDir, readCurrentVersion as readBackendVersion } from '../../backend/scripts/build-services.mjs';

const PORT = 5055;
const HOST = '127.0.0.1';
const frontendScript = path.join(shellDir, 'scripts', 'build-apps.mjs');
const backendScript = path.join(backendDir, 'scripts', 'build-services.mjs');
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

function getServiceDetails() {
  return [...discoverServices()]
    .sort()
    .map((id) => ({ id, name: id, icon: '☕', description: 'Spring Boot service' }));
}

function readFrontendVersion() {
  const pkg = JSON.parse(readFileSync(path.join(shellDir, 'package.json'), 'utf8'));
  return pkg.version;
}

function readBackendVersionSafe() {
  try {
    return readBackendVersion();
  } catch (err) {
    return `error: ${err.message}`;
  }
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
  sendJson(res, 200, {
    head: gitHead(),
    frontend: { version: readFrontendVersion(), apps: await getAppDetails() },
    backend: { version: readBackendVersionSafe(), services: getServiceDetails() },
  });
}

function buildArgsFromBody(body, idsCsv) {
  const args = [idsCsv];
  if (body.noRelease) {
    args.push('--no-release');
  } else if (typeof body.setVersion === 'string' && body.setVersion.trim()) {
    args.push('--set-version', body.setVersion.trim());
  } else {
    const bump = ['major', 'minor', 'patch'].includes(body.bump) ? body.bump : 'patch';
    args.push('--bump', bump);
  }
  return args;
}

// node.exe is a real executable (unlike npm.cmd/mvn.cmd on Windows), so no
// shell:true is needed here - see build-apps.mjs's/build-services.mjs's own
// git()/npm/mvn notes for why that distinction matters on Windows.
async function handleBuild(req, res, { script, readVersion, noun }) {
  let body;
  try {
    body = await readJsonBody(req);
  } catch {
    sendJson(res, 400, { success: false, output: 'Invalid JSON body.' });
    return;
  }

  const ids = Array.isArray(body.ids) ? body.ids.filter((id) => typeof id === 'string' && id.trim()) : [];
  if (ids.length === 0) {
    sendJson(res, 400, { success: false, output: `Pick at least one ${noun}.` });
    return;
  }

  const args = [script, ...buildArgsFromBody(body, ids.join(','))];
  const result = spawnSync('node', args, { cwd: repoRoot, encoding: 'utf8' });

  const rawOutput = `${result.stdout ?? ''}${result.stderr ?? ''}`.trim();
  sendJson(res, 200, {
    success: result.status === 0,
    exitCode: result.status,
    output: rawOutput.replace(/\x1b\[[0-9;]*m/g, ''), // strip vite's/maven's ANSI color codes
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
    handleBuild(req, res, { script: frontendScript, readVersion: readFrontendVersion, noun: 'app' })
      .catch((err) => sendJson(res, 500, { success: false, output: String(err) }));
  } else if (req.method === 'POST' && url.pathname === '/api/build-backend') {
    handleBuild(req, res, { script: backendScript, readVersion: readBackendVersionSafe, noun: 'service' })
      .catch((err) => sendJson(res, 500, { success: false, output: String(err) }));
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
