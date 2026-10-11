#!/usr/bin/env node
/**
 * `npm run seed`
 *
 * Creates the tables and loads the demo content into whatever database
 * DATABASE_URL points at.
 *
 *   Local:  npm run seed
 *   Turso:  DATABASE_URL=libsql://... DATABASE_AUTH_TOKEN=... npm run seed
 *
 * Safe to re-run: every step is skipped if that table already has rows, so it
 * will never overwrite real work.
 */
import { initSchema, DATABASE_URL, IS_FILE_DB } from '../src/db.js';
import { ensureDefaultSettings } from '../src/settings.js';
import { ensureAdminUser } from '../src/auth.js';
import { seedIfEmpty } from '../src/seed.js';
import { STORAGE_DRIVER } from '../src/storage.js';

console.log('\nSeeding Colors with Kiran\n');
console.log(`  database → ${IS_FILE_DB ? DATABASE_URL : DATABASE_URL.replace(/\/\/.*@/, '//')}`);
console.log(`  photos   → ${STORAGE_DRIVER}\n`);

await initSchema();
console.log('  ✓ tables ready');

await ensureDefaultSettings();
console.log('  ✓ default settings ready');

await seedIfEmpty();

const created = await ensureAdminUser();
if (created) {
  console.log(`  ✓ admin created — ${created.username} / ${created.password}`);
} else {
  console.log('  · admin account already exists (left alone)');
}

console.log('\nDone.\n');
process.exit(0);
