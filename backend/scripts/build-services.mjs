#!/usr/bin/env node
// Backend equivalent of apps/shell/scripts/build-apps.mjs: builds a chosen
// subset of backend services via Maven, and (unless told not to) cuts a
// release - bump the backend's shared Maven version, commit, and tag it
// `backend-v<version>` (a separate namespace from the frontend's
// `shell-v<version>` tags).
//
// Usage (from the repo root):
//   npm run build:backend -- sales-service,analytics-service
//   npm run build:backend -- sales-service --bump minor
//   npm run build:backend -- sales-service --set-version 2.0.0
//   npm run build:backend -- sales-service --no-release
// or directly:
//   node backend/scripts/build-services.mjs sales-service,analytics-service
//
// Service ids are discovered from backend/*/pom.xml - any module whose pom
// declares spring-boot-maven-plugin (i.e. is independently runnable, has
// its own main()). common/ and events/ are plain libraries with no such
// plugin - they're pulled in automatically via Maven's -am flag and aren't
// selectable here.
//
// All backend modules share one version (each module's pom has
// <parent>com.multiapp:backend:<version></parent>), so a release bumps and
// tags the whole backend together, same as the frontend bumps the whole
// shell together - regardless of which services you actually built this
// time.
//
// The release step requires a clean working tree, same rule as the
// frontend script - commit your fix/change first, then run this to build
// + tag it. Nothing is ever pushed automatically.

import { readdirSync, statSync, readFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const backendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const repoRoot = path.resolve(backendDir, '..');
const onWindows = process.platform === 'win32';

export function discoverServices() {
  const dirNames = readdirSync(backendDir).filter((name) => {
    const full = path.join(backendDir, name);
    return statSync(full).isDirectory() && existsSync(path.join(full, 'pom.xml'));
  });

  const services = new Set();
  for (const dirName of dirNames) {
    const pomText = readFileSync(path.join(backendDir, dirName, 'pom.xml'), 'utf8');
    if (pomText.includes('spring-boot-maven-plugin')) {
      services.add(dirName);
    }
  }
  return services;
}

function printUsage(services) {
  console.error('Usage: build-services.mjs <service-id>[,<service-id>...] [--bump major|minor|patch] [--set-version X.Y.Z] [--no-release]');
  console.error(`Available services: ${[...services].sort().join(', ')}`);
}

function parseFlags(flagArgs) {
  const has = (name) => flagArgs.includes(`--${name}`) || flagArgs.some((f) => f.startsWith(`--${name}=`));
  const value = (name, fallback) => {
    const eqArg = flagArgs.find((f) => f.startsWith(`--${name}=`));
    if (eqArg) return eqArg.slice(`--${name}=`.length);
    const idx = flagArgs.indexOf(`--${name}`);
    if (idx !== -1 && flagArgs[idx + 1] !== undefined) return flagArgs[idx + 1];
    return fallback;
  };

  return {
    release: !has('no-release'),
    bumpLevel: value('bump', 'patch'),
    setVersion: value('set-version', null),
  };
}

function bumpVersion(current, level) {
  const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(current);
  if (!m) {
    throw new Error(`Current version "${current}" isn't a plain X.Y.Z semver - use --set-version instead.`);
  }
  let [major, minor, patch] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (level === 'major') {
    major += 1; minor = 0; patch = 0;
  } else if (level === 'minor') {
    minor += 1; patch = 0;
  } else if (level === 'patch') {
    patch += 1;
  } else {
    throw new Error(`Unknown --bump level "${level}" - use major, minor, or patch.`);
  }
  return `${major}.${minor}.${patch}`;
}

function mvn(args) {
  // mvn is mvn.cmd on Windows (a batch file), same situation as npm.cmd in
  // the frontend script - spawnSync can't exec it without shell:true. Safe
  // here because every arg is a plain -Dkey=value token, no spaces.
  return spawnSync('mvn', args, { cwd: backendDir, encoding: 'utf8', shell: onWindows });
}

function git(args) {
  // git.exe is a real executable - must NOT go through shell:true, or
  // multi-word args like the commit message get re-tokenized (see the
  // frontend script's build-apps.mjs for the bug this caused there).
  return spawnSync('git', args, { cwd: repoRoot, encoding: 'utf8' });
}

function isGitClean() {
  const res = git(['status', '--porcelain']);
  return res.status === 0 && res.stdout.trim() === '';
}

function tagExists(tagName) {
  return git(['rev-parse', '-q', '--verify', `refs/tags/${tagName}`]).status === 0;
}

export function readCurrentVersion() {
  const res = mvn(['-q', 'help:evaluate', '-Dexpression=project.version', '-DforceStdout']);
  if (res.status !== 0) {
    throw new Error(`Failed to read backend version: ${res.stderr || res.stdout}`);
  }
  return res.stdout.trim();
}

function main() {
  const services = discoverServices();
  const [idsArg, ...flagArgs] = process.argv.slice(2);

  if (!idsArg) {
    printUsage(services);
    process.exit(1);
  }

  const requested = [...new Set(idsArg.split(',').map((id) => id.trim()).filter(Boolean))];
  if (requested.length === 0) {
    printUsage(services);
    process.exit(1);
  }

  const unknown = requested.filter((id) => !services.has(id));
  if (unknown.length > 0) {
    console.error(`Unknown service id(s): ${unknown.join(', ')}`);
    printUsage(services);
    process.exit(1);
  }

  const { release, bumpLevel, setVersion } = parseFlags(flagArgs);
  const sortedIds = requested.slice().sort();

  const build = mvn(['-B', 'clean', 'package', '-pl', sortedIds.join(','), '-am']);
  process.stdout.write(build.stdout ?? '');
  process.stderr.write(build.stderr ?? '');

  if (build.status !== 0) {
    process.exit(build.status ?? 1);
  }

  if (!release) {
    console.log('--no-release passed - built jars only, skipped version bump + tag.');
    process.exit(0);
  }

  if (!existsSync(path.join(repoRoot, '.git'))) {
    console.warn('No git repository at the project root - skipped version bump + tag.');
    process.exit(0);
  }

  if (!isGitClean()) {
    console.warn(
      'Working tree has uncommitted changes - skipped version bump + tag.\n' +
        'Commit your fix/change first, then re-run this to cut a release.',
    );
    process.exit(0);
  }

  let currentVersion;
  try {
    currentVersion = readCurrentVersion();
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }

  // Every build here IS the release (no separate SNAPSHOT -> release ->
  // next-SNAPSHOT dance), matching the frontend's plain-semver scheme - so
  // -SNAPSHOT is dropped rather than carried forward.
  const baseVersion = currentVersion.replace(/-SNAPSHOT$/, '');
  let newVersion;
  try {
    newVersion = setVersion ?? bumpVersion(baseVersion, bumpLevel);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }

  const tagName = `backend-v${newVersion}`;
  if (tagExists(tagName)) {
    console.error(`Tag ${tagName} already exists - pick a different --set-version or --bump level.`);
    process.exit(1);
  }

  const setVer = mvn(['-B', '-q', 'versions:set', `-DnewVersion=${newVersion}`, '-DgenerateBackupPoms=false']);
  if (setVer.status !== 0) {
    console.error(setVer.stderr || setVer.stdout);
    process.exit(setVer.status ?? 1);
  }

  const commitMessage = `release(backend): v${newVersion} - services: ${sortedIds.join(',')}`;

  const add = git(['add', path.relative(repoRoot, backendDir)]);
  if (add.status !== 0) {
    console.error(add.stderr);
    process.exit(add.status ?? 1);
  }

  const commit = git(['commit', '-m', commitMessage]);
  if (commit.status !== 0) {
    console.error(commit.stderr || commit.stdout);
    process.exit(commit.status ?? 1);
  }

  const tag = git(['tag', '-a', tagName, '-m', commitMessage]);
  if (tag.status !== 0) {
    console.error(tag.stderr);
    process.exit(tag.status ?? 1);
  }

  console.log(`Released backend v${currentVersion} -> v${newVersion}, tagged ${tagName}.`);
  console.log('Push with: git push && git push --tags');
}

// Only run the CLI when this file is executed directly, not when imported
// as a module (e.g. by the build dashboard server).
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main();
}
