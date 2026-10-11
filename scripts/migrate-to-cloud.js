#!/usr/bin/env node
/**
 * `npm run migrate`
 *
 * Copies an existing LOCAL site into the cloud so nothing you have already
 * added is lost:
 *
 *   data/colorswithkiran.db  →  Turso
 *   public/uploads/**        →  Cloudinary
 *
 * Run it from your own computer, with the cloud credentials in the
 * environment (or in a .env file):
 *
 *   DATABASE_URL=libsql://...  DATABASE_AUTH_TOKEN=...  \
 *   CLOUDINARY_CLOUD_NAME=...  CLOUDINARY_API_KEY=...  CLOUDINARY_API_SECRET=... \
 *   npm run migrate
 *
 * It never deletes anything locally, and it refuses to run against a
 * destination that already has designs unless you pass --force.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@libsql/client';
import { FULL_DIR, SCHEMA, ROOT } from '../src/db.js';
import { putImage } from '../src/storage.js';

const FORCE = process.argv.includes('--force');

const SOURCE_URL = process.env.SOURCE_DATABASE_URL ||
  `file:${path.join(ROOT, 'data', 'colorswithkiran.db')}`;
const DEST_URL = process.env.DATABASE_URL || process.env.TURSO_DATABASE_URL;
const DEST_TOKEN = process.env.DATABASE_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN;

if (!DEST_URL || DEST_URL.startsWith('file:')) {
  console.error('\n  ✗ DATABASE_URL must be your cloud (libsql://) database.\n');
  process.exit(1);
}
if (!process.env.CLOUDINARY_CLOUD_NAME) {
  console.error('\n  ✗ Cloudinary credentials are required so the photos have somewhere to go.\n');
  process.exit(1);
}

const srcFile = SOURCE_URL.replace(/^file:/, '');
if (!fs.existsSync(srcFile)) {
  console.error(`\n  ✗ No local database found at ${srcFile}\n`);
  process.exit(1);
}

console.log('\nMigrating Colors with Kiran to the cloud\n');
console.log(`  from  ${srcFile}`);
console.log(`  to    ${DEST_URL}\n`);

const src = createClient({ url: SOURCE_URL });
const dst = createClient({ url: DEST_URL, authToken: DEST_TOKEN });

const all = async (c, q, a = []) => (await c.execute({ sql: q, args: a })).rows.map((r) => {
  const o = {};
  for (const k of Object.keys(r)) o[k] = typeof r[k] === 'bigint' ? Number(r[k]) : r[k];
  return o;
});

/* 1 ── schema ----------------------------------------------------------- */
await dst.executeMultiple(SCHEMA);
console.log('  ✓ tables created in the cloud database');

const existing = await all(dst, 'SELECT COUNT(*) n FROM designs');
if ((existing[0]?.n ?? 0) > 0 && !FORCE) {
  console.error(
    `\n  ✗ The cloud database already has ${existing[0].n} designs.\n` +
      '    Re-run with --force if you really want to add to it.\n'
  );
  process.exit(1);
}

/* 2 ── photos ----------------------------------------------------------- */
const designs = await all(src, 'SELECT * FROM designs');
const urlFor = new Map();
let uploaded = 0;
let skipped = 0;

for (const d of designs) {
  if (!d.image || /^https?:\/\//i.test(d.image)) continue; // already a cloud URL
  if (urlFor.has(d.image)) continue;
  const file = path.join(FULL_DIR, path.basename(d.image));
  if (!fs.existsSync(file)) {
    skipped++;
    continue;
  }
  try {
    const res = await putImage(fs.readFileSync(file), 'image/webp');
    urlFor.set(d.image, res);
    uploaded++;
    process.stdout.write(`\r  · uploading photos… ${uploaded}`);
  } catch (e) {
    skipped++;
    console.warn(`\n  ! ${d.image}: ${e.message}`);
  }
}
console.log(`\r  ✓ uploaded ${uploaded} photos to Cloudinary${skipped ? ` (${skipped} skipped)` : ''}`);

/* 3 ── rows ------------------------------------------------------------- */
const copy = async (table, transform = (r) => r) => {
  const rows = await all(src, `SELECT * FROM ${table}`);
  if (!rows.length) return 0;
  const stmts = rows.map((raw) => {
    const r = transform({ ...raw });
    const cols = Object.keys(r);
    return {
      sql: `INSERT OR REPLACE INTO ${table} (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`,
      args: cols.map((c) => r[c]),
    };
  });
  await dst.batch(stmts, 'write');
  return rows.length;
};

const n1 = await copy('categories');
const n2 = await copy('designs', (r) => {
  const mapped = urlFor.get(r.image);
  if (mapped) {
    r.image = mapped.image;
    r.thumb = mapped.thumb;
    if (mapped.width) r.width = mapped.width;
    if (mapped.height) r.height = mapped.height;
  }
  return r;
});
const n3 = await copy('pricing');
const n4 = await copy('testimonials', (r) => {
  const mapped = urlFor.get(r.photo);
  if (mapped) r.photo = mapped.thumb;
  return r;
});
const n5 = await copy('inquiries');
const n6 = await copy('settings', (r) => {
  // Hero / about photos are stored as "/uploads/full/xxx.webp" — repoint them.
  const m = String(r.value || '').match(/\/uploads\/full\/(.+)$/);
  if (m && urlFor.has(m[1])) r.value = urlFor.get(m[1]).image;
  return r;
});
const n7 = await copy('users');

console.log(`  ✓ categories   ${n1}`);
console.log(`  ✓ designs      ${n2}`);
console.log(`  ✓ pricing      ${n3}`);
console.log(`  ✓ testimonials ${n4}`);
console.log(`  ✓ enquiries    ${n5}`);
console.log(`  ✓ settings     ${n6}`);
console.log(`  ✓ admin users  ${n7}  (your password came across unchanged)`);

console.log('\nDone. Your cloud site now has everything your local one had.\n');
process.exit(0);
