// Drives the customer-distribution simulation: builds a chosen released
// version of the frontend and backend, copies the artifacts into a
// customer's folder, and starts/stops them on that customer's dedicated
// ports (see customers.mjs).
//
// IMPORTANT LIMITATION: "deploying version X" here rebuilds from the
// CURRENT checked-out source, using the app/service subset recorded in
// that version's tag commit message (e.g. "apps: sales,analytics") - it
// does NOT check out that tag's historical source code. For this repo so
// far every tag differs only in version number and enabled subset, not in
// application code, so that distinction hasn't mattered in practice - but
// if source has since changed, a "deploy" reflects current code, not a
// byte-for-byte reproduction of that old commit. A fully faithful version
// would need a git worktree + fresh npm install per deploy; this trades
// that for a fast, dependency-free deploy that fits a local demo.

import { spawn, spawnSync } from 'node:child_process';
import {
  existsSync, mkdirSync, rmSync, cpSync, readdirSync, readFileSync,
  writeFileSync, statSync, openSync,
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { shellDir, repoRoot } from '../../apps/shell/scripts/build-apps.mjs';
import { backendDir } from '../../backend/scripts/build-services.mjs';
import { CUSTOMERS, portsFor, customerDir } from './customers.mjs';

const deployDir = path.dirname(fileURLToPath(import.meta.url));
const frontendScript = path.join(shellDir, 'scripts', 'build-apps.mjs');
const backendScript = path.join(backendDir, 'scripts', 'build-services.mjs');
const staticServerScript = path.join(deployDir, 'static-server.mjs');

export { CUSTOMERS };

function git(args) {
  return spawnSync('git', args, { cwd: repoRoot, encoding: 'utf8' });
}

export function listTags(prefix) {
  const res = git(['tag', '-l', `${prefix}*`, '--sort=-v:refname']);
  if (res.status !== 0) return [];
  return res.stdout.split('\n').map((t) => t.trim()).filter(Boolean);
}

function parseListFromTag(tag) {
  const res = git(['log', '-1', '--format=%s', tag]);
  if (res.status !== 0) {
    throw new Error(`Unknown tag "${tag}"`);
  }
  const subject = res.stdout.trim();
  const m = /:\s*([a-zA-Z0-9,_-]+)\s*$/.exec(subject);
  if (!m) {
    throw new Error(`Could not parse an app/service list from tag "${tag}": ${subject}`);
  }
  return m[1].split(',');
}

function readJsonSafe(filePath) {
  try {
    return JSON.parse(readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function isAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function pidsDirFor(customerId) {
  return path.join(customerDir(repoRoot, customerId), 'pids');
}

function stopCustomer(customerId) {
  const dir = pidsDirFor(customerId);
  if (!existsSync(dir)) return;
  for (const file of readdirSync(dir)) {
    const pidPath = path.join(dir, file);
    const pid = Number(readFileSync(pidPath, 'utf8').trim());
    if (Number.isInteger(pid) && isAlive(pid)) {
      try {
        process.kill(pid);
      } catch {
        // already gone
      }
    }
    rmSync(pidPath, { force: true });
  }
}

function findBuiltJar(service) {
  const targetDir = path.join(backendDir, service, 'target');
  if (!existsSync(targetDir)) {
    throw new Error(`No target/ directory for ${service} - build may have failed`);
  }
  const candidates = readdirSync(targetDir).filter(
    (f) => f.startsWith(`${service}-`) && f.endsWith('.jar') && !f.endsWith('.jar.original'),
  );
  if (candidates.length === 0) {
    throw new Error(`No built jar found for ${service} in ${targetDir}`);
  }
  candidates.sort((a, b) => statSync(path.join(targetDir, b)).mtimeMs - statSync(path.join(targetDir, a)).mtimeMs);
  return path.join(targetDir, candidates[0]);
}

function startCustomer(customerId, { apps, services }) {
  const ports = portsFor(customerId);
  const dir = customerDir(repoRoot, customerId);
  const logsDir = path.join(dir, 'logs');
  const pidsDir = path.join(dir, 'pids');
  mkdirSync(logsDir, { recursive: true });
  mkdirSync(pidsDir, { recursive: true });

  if (apps.length > 0) {
    const logFd = openSync(path.join(logsDir, 'frontend.log'), 'a');
    const proc = spawn(
      'node',
      [staticServerScript, '--dir', path.join(dir, 'frontend'), '--port', String(ports.frontend)],
      { cwd: repoRoot, detached: true, stdio: ['ignore', logFd, logFd] },
    );
    proc.unref();
    writeFileSync(path.join(pidsDir, 'frontend.pid'), String(proc.pid));
  }

  for (const service of services) {
    const jarPath = path.join(dir, 'backend', `${service}.jar`);
    const logFd = openSync(path.join(logsDir, `${service}.log`), 'a');
    const proc = spawn(
      'java',
      ['-jar', jarPath, `--server.port=${ports[service]}`],
      { cwd: dir, detached: true, stdio: ['ignore', logFd, logFd] },
    );
    proc.unref();
    writeFileSync(path.join(pidsDir, `${service}.pid`), String(proc.pid));
  }
}

export function customerStatus(customerId) {
  const dir = customerDir(repoRoot, customerId);
  const frontend = readJsonSafe(path.join(dir, 'frontend', 'DEPLOYED.json'));
  const backend = readJsonSafe(path.join(dir, 'backend', 'DEPLOYED.json'));
  const ports = portsFor(customerId);

  const running = {};
  const pidsDir = path.join(dir, 'pids');
  if (existsSync(pidsDir)) {
    for (const file of readdirSync(pidsDir)) {
      const name = file.replace(/\.pid$/, '');
      const pid = Number(readFileSync(path.join(pidsDir, file), 'utf8').trim());
      running[name] = isAlive(pid);
    }
  }

  return { id: customerId, ports, frontend, backend, running };
}

export function deployCustomer(customerId, { frontendTag, backendTag }) {
  if (!CUSTOMERS.includes(customerId)) {
    throw new Error(`Unknown customer "${customerId}"`);
  }
  if (!frontendTag && !backendTag) {
    throw new Error('Pick a frontend version, a backend version, or both.');
  }

  const log = [];
  const dir = customerDir(repoRoot, customerId);

  stopCustomer(customerId);
  log.push(`Stopped any previously running processes for ${customerId}.`);

  let apps = customerStatus(customerId).frontend?.apps ?? [];
  let services = customerStatus(customerId).backend?.services ?? [];

  if (frontendTag) {
    apps = parseListFromTag(frontendTag);
    log.push(`Frontend ${frontendTag} -> apps: ${apps.join(',')}`);

    const build = spawnSync('node', [frontendScript, apps.join(','), '--no-release'], { cwd: repoRoot, encoding: 'utf8' });
    log.push(build.stdout, build.stderr);
    if (build.status !== 0) {
      throw new Error(`Frontend build failed:\n${log.join('\n')}`);
    }

    const frontendDir = path.join(dir, 'frontend');
    rmSync(frontendDir, { recursive: true, force: true });
    mkdirSync(frontendDir, { recursive: true });
    cpSync(path.join(shellDir, 'dist'), frontendDir, { recursive: true });
    writeFileSync(
      path.join(frontendDir, 'DEPLOYED.json'),
      JSON.stringify({ tag: frontendTag, apps, deployedAt: new Date().toISOString() }, null, 2),
    );
  }

  if (backendTag) {
    services = parseListFromTag(backendTag);
    log.push(`Backend ${backendTag} -> services: ${services.join(',')}`);

    const build = spawnSync('node', [backendScript, services.join(','), '--no-release'], { cwd: repoRoot, encoding: 'utf8' });
    log.push(build.stdout, build.stderr);
    if (build.status !== 0) {
      throw new Error(`Backend build failed:\n${log.join('\n')}`);
    }

    const backendOutDir = path.join(dir, 'backend');
    rmSync(backendOutDir, { recursive: true, force: true });
    mkdirSync(backendOutDir, { recursive: true });
    const deployedVersions = {};
    for (const service of services) {
      const jarPath = findBuiltJar(service);
      cpSync(jarPath, path.join(backendOutDir, `${service}.jar`));
      deployedVersions[service] = path.basename(jarPath);
    }
    writeFileSync(
      path.join(backendOutDir, 'DEPLOYED.json'),
      JSON.stringify({ tag: backendTag, services, jars: deployedVersions, deployedAt: new Date().toISOString() }, null, 2),
    );
  }

  startCustomer(customerId, { apps, services });
  log.push(`Started ${customerId}: ${[...apps.map((a) => `${a} app`), ...services].join(', ') || '(nothing to start)'}`);

  return { success: true, output: log.filter(Boolean).join('\n'), status: customerStatus(customerId) };
}

export function stopCustomerDeployment(customerId) {
  if (!CUSTOMERS.includes(customerId)) {
    throw new Error(`Unknown customer "${customerId}"`);
  }
  stopCustomer(customerId);
  return { success: true, status: customerStatus(customerId) };
}
