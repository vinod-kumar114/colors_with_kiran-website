#!/usr/bin/env node
/**
 * `npm run build`
 *
 * This project has no bundler — it ships plain ES modules and EJS templates.
 * So "build" means: prove the thing will actually boot before Vercel tries.
 *
 *   1. every .js file parses
 *   2. every .ejs template compiles
 *   3. vercel.json / package.json are valid JSON and wired correctly
 *   4. the serverless entry point imports cleanly
 *   5. required config is present (or clearly reported as missing)
 *
 * Exits non-zero on any error, so a broken deploy fails at build time with a
 * readable message instead of at 3am with a 500.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const problems = [];
const notes = [];
let checks = 0;

const rel = (p) => path.relative(ROOT, p) || p;
const ok = (m) => console.log(`  \x1b[32m✓\x1b[0m ${m}`);
const bad = (m) => { problems.push(m); console.log(`  \x1b[31m✗\x1b[0m ${m}`); };

function walk(dir, ext, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (['node_modules', '.git', '.vercel', 'data', 'uploads'].includes(e.name)) continue;
      walk(p, ext, out);
    } else if (e.name.endsWith(ext)) out.push(p);
  }
  return out;
}

console.log('\nBuilding Colors with Kiran…\n');

/* 1 ── JavaScript parses ------------------------------------------------ */
const jsFiles = [
  ...walk(path.join(ROOT, 'src'), '.js'),
  ...walk(path.join(ROOT, 'api'), '.js'),
  ...walk(path.join(ROOT, 'scripts'), '.js'),
  path.join(ROOT, 'server.js'),
  path.join(ROOT, 'check.js'),
].filter((f) => fs.existsSync(f));

for (const f of jsFiles) {
  checks++;
  try {
    execFileSync(process.execPath, ['--check', f], { stdio: 'pipe' });
  } catch (e) {
    bad(`syntax error in ${rel(f)}\n      ${String(e.stderr || e).split('\n').slice(0, 3).join('\n      ')}`);
  }
}
if (!problems.length) ok(`${jsFiles.length} JavaScript files parse`);

/* 2 ── EJS templates compile -------------------------------------------- */
const ejsFiles = walk(path.join(ROOT, 'views'), '.ejs');
try {
  const { default: ejs } = await import('ejs');
  let failed = 0;
  for (const f of ejsFiles) {
    checks++;
    try {
      ejs.compile(fs.readFileSync(f, 'utf8'), { filename: f });
    } catch (e) {
      failed++;
      bad(`template error in ${rel(f)}: ${e.message.split('\n')[0]}`);
    }
  }
  if (!failed) ok(`${ejsFiles.length} EJS templates compile`);
} catch {
  notes.push('ejs not installed — template check skipped (run npm install)');
}

/* 3 ── config files ------------------------------------------------------ */
checks++;
try {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  if (pkg.type !== 'module') bad('package.json must have "type": "module"');
  if (pkg.dependencies?.['better-sqlite3']) {
    bad('better-sqlite3 is still a dependency — it cannot run on Vercel');
  }
  if (!pkg.dependencies?.['@libsql/client']) bad('@libsql/client is missing from dependencies');
  ok('package.json is valid');
} catch (e) {
  bad(`package.json: ${e.message}`);
}

checks++;
try {
  const vc = JSON.parse(fs.readFileSync(path.join(ROOT, 'vercel.json'), 'utf8'));
  if (!vc.rewrites?.length) bad('vercel.json has no rewrites — nothing would reach the app');
  const inc = vc.functions?.['api/index.js']?.includeFiles || '';
  if (!inc.includes('views')) {
    bad('vercel.json must includeFiles "views/**", or page rendering fails in production');
  }
  ok('vercel.json is valid');
} catch (e) {
  bad(`vercel.json: ${e.message}`);
}

checks++;
if (fs.existsSync(path.join(ROOT, 'api/index.js'))) ok('api/index.js entry point exists');
else bad('api/index.js is missing — Vercel would have nothing to run');

/* 4 ── the app actually imports ------------------------------------------ */
checks++;
try {
  const mod = await import(pathToFileURL(path.join(ROOT, 'src/app.js')).href);
  if (typeof mod.app !== 'function') bad('src/app.js did not export an Express app');
  else ok('application imports cleanly');
} catch (e) {
  bad(`src/app.js failed to import: ${e.message.split('\n')[0]}`);
}

/* 5 ── runtime configuration ------------------------------------------- */
/*
 * These are WARNINGS, never build failures.
 *
 * Vercel builds your project the moment you click Deploy — often before the
 * environment variables have been filled in. Failing the build there would
 * just give you a scary red error with no way forward. Instead the deploy
 * succeeds, and the site itself shows a clear "finish your setup" page until
 * the variables are added.
 */
const url = process.env.DATABASE_URL || process.env.TURSO_DATABASE_URL || '';
const onVercel = !!process.env.VERCEL;

if (onVercel) {
  const missing = [];
  if (!url) missing.push('DATABASE_URL');
  else if (url.startsWith('file:')) missing.push('DATABASE_URL (points at a local file — use your libsql:// URL)');
  if (!process.env.DATABASE_AUTH_TOKEN && !process.env.TURSO_AUTH_TOKEN) missing.push('DATABASE_AUTH_TOKEN');
  if (!process.env.CLOUDINARY_CLOUD_NAME) missing.push('CLOUDINARY_CLOUD_NAME');
  if (!process.env.CLOUDINARY_API_KEY) missing.push('CLOUDINARY_API_KEY');
  if (!process.env.CLOUDINARY_API_SECRET) missing.push('CLOUDINARY_API_SECRET');
  if (!process.env.COOKIE_SECRET) missing.push('COOKIE_SECRET');

  if (missing.length) {
    console.log('');
    console.log('  \x1b[33m!\x1b[0m Environment variables still to add:');
    for (const m of missing) console.log(`      · ${m}`);
    console.log('');
    console.log('      Vercel → Settings → Environment Variables, then Redeploy.');
    console.log('      The site will show a setup page until these are set.');
  } else {
    ok('all required environment variables are set');
  }
} else {
  notes.push(`local build — DATABASE_URL = ${url || 'file: (default)'}`);
}

/* ---------------------------------------------------------------- result */
console.log('');
for (const n of notes) console.log(`  · ${n}`);
console.log('');

if (problems.length) {
  console.error(`  \x1b[31mBuild failed — ${problems.length} problem${problems.length > 1 ? 's' : ''}.\x1b[0m\n`);
  process.exit(1);
}
console.log(`  \x1b[32mBuild OK\x1b[0m — ${checks} checks passed.\n`);
