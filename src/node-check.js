/**
 * Node version guard.
 *
 * MUST be the first import in server.js. ES modules evaluate in import order,
 * so this runs before better-sqlite3 is loaded.
 *
 * Why: better-sqlite3 v13 is compiled for Node 22+. On Node 20 it does not
 * throw a catchable error — it segfaults, which gives the user no useful
 * message at all. This turns that into plain English.
 */
const major = Number(process.versions.node.split('.')[0]);
const MIN = 20;

if (Number.isFinite(major) && major < MIN) {
  console.error('');
  console.error('  ✗ Your Node.js is too old.');
  console.error('');
  console.error(`      you have:  Node ${process.versions.node}`);
  console.error(`      you need:  Node ${MIN} or newer`);
  console.error('');
  console.error('  Fix: install the latest LTS from https://nodejs.org');
  console.error('       then close this window, open it again, and run:');
  console.error('');
  console.error('         npm start');
  console.error('');
  process.exit(1);
}
