/**
 * Colors with Kiran — local / self-hosted entry point.
 *
 * Starts a normal long-running web server. This is what `npm start` runs on
 * your own computer, on a VPS, on Railway or on Render.
 *
 * Vercel does NOT use this file — it uses api/index.js instead.
 */
import './src/node-check.js'; // must stay first — see the file for why
import { app, ensureReady, describeConfig } from './src/app.js';
import { seedIfEmpty } from './src/seed.js';
import { ensureAdminUser } from './src/auth.js';

const PORT = process.env.PORT || 3000;

console.log('Colors with Kiran — starting up…');

await ensureReady();

// Demo content is only seeded for a local/self-hosted install. It writes image
// files, so it is never attempted on a read-only serverless filesystem.
if (process.env.SKIP_SEED !== '1') {
  await seedIfEmpty();
}

const created = await ensureAdminUser();
if (created) {
  console.log('\n  ┌───────────────────────────────────────────────┐');
  console.log('  │  ADMIN ACCOUNT CREATED                        │');
  console.log(`  │  username: ${created.username.padEnd(34)} │`);
  console.log(`  │  password: ${created.password.padEnd(34)} │`);
  console.log('  │  Change this from Settings after signing in.  │');
  console.log('  └───────────────────────────────────────────────┘\n');
}

app.listen(PORT, '0.0.0.0', () => {
  // Bind to 0.0.0.0 so other devices on the network can reach it, but always
  // PRINT localhost — browsers cannot open http://0.0.0.0 (ERR_ADDRESS_INVALID).
  const cfg = describeConfig();
  console.log(`  ✓ Website  → http://localhost:${PORT}`);
  console.log(`  ✓ Admin    → http://localhost:${PORT}/admin`);
  console.log(`  · database → ${cfg.database}`);
  console.log(`  · photos   → ${cfg.photos}`);
  console.log('    (back up those two — they are the whole website)\n');
});
