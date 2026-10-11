/**
 * check.js — "why aren't my photos showing?"
 *
 * Run with:  npm run check
 *
 * Looks at your installation and explains, in plain language, what is wrong
 * and how to fix it. Changes nothing — it is completely safe to run.
 */
import './src/node-check.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.DATA_DIR || path.join(ROOT, 'data');
const UPLOAD_DIR = process.env.UPLOADS_DIR || path.join(ROOT, 'public', 'uploads');
const FULL_DIR = path.join(UPLOAD_DIR, 'full');
const THUMB_DIR = path.join(UPLOAD_DIR, 'thumb');

const line = (s = '') => console.log(s);
const ok = (s) => line('  \x1b[32m✓\x1b[0m ' + s);
const bad = (s) => line('  \x1b[31m✗\x1b[0m ' + s);
const warn = (s) => line('  \x1b[33m!\x1b[0m ' + s);

const count = (d) => {
  try { return fs.readdirSync(d).filter((f) => !f.startsWith('.')).length; }
  catch { return -1; }
};

line();
line('Checking your Colors with Kiran installation…');
line('─'.repeat(58));
line();

const problems = [];

/* 1 ── core files ------------------------------------------------------ */
const core = ['server.js', 'package.json', 'src/db.js', 'views/home.ejs', 'public/css/site.css'];
const missingCore = core.filter((f) => !fs.existsSync(path.join(ROOT, f)));
if (missingCore.length === 0) ok('Website files are all here');
else { bad('Some website files are missing: ' + missingCore.join(', ')); problems.push('core'); }

/* 2 ── dependencies ---------------------------------------------------- */
if (fs.existsSync(path.join(ROOT, 'node_modules'))) ok('Parts are installed (node_modules)');
else { bad('node_modules is missing — you need to run:  npm install'); problems.push('deps'); }

/* 3 ── database -------------------------------------------------------- */
const dbFile = path.join(DATA_DIR, 'colorswithkiran.db');
let designs = [];
let dbOk = false;
if (!fs.existsSync(dbFile)) {
  bad('Database not found at ' + dbFile);
  problems.push('db');
} else {
  const size = fs.statSync(dbFile).size;
  try {
    const { createClient } = await import('@libsql/client');
    const client = createClient({ url: `file:${dbFile}` });
    const rs = await client.execute(
      'select id,title,image,thumb from designs where deleted_at is null'
    );
    designs = rs.rows.map((r) => ({
      id: Number(r.id), title: r.title, image: r.image, thumb: r.thumb,
    }));
    dbOk = true;
    ok(`Database is readable — ${designs.length} designs (${Math.round(size / 1024)} KB)`);
  } catch (e) {
    bad('Database could not be read: ' + e.message);
    problems.push('db');
  }
}

/* 4 ── photo folders --------------------------------------------------- */
const nFull = count(FULL_DIR);
const nThumb = count(THUMB_DIR);

if (nFull < 0 || nThumb < 0) {
  bad('The photo folders do not exist at all');
  line('      expected: ' + FULL_DIR);
  line('                ' + THUMB_DIR);
  problems.push('uploads-missing');
} else if (nFull === 0 && nThumb === 0) {
  bad('The photo folders exist but are EMPTY (0 photos)');
  problems.push('uploads-empty');
} else {
  ok(`Photo files on disk — ${nFull} large, ${nThumb} small`);
}

/* 5 ── do the designs actually have their photos? ---------------------- */
if (dbOk && designs.length) {
  let found = 0;
  const missing = [];
  for (const d of designs) {
    const f = d.thumb && fs.existsSync(path.join(THUMB_DIR, d.thumb));
    if (f) found++; else missing.push(d.title || '#' + d.id);
  }
  if (found === designs.length) {
    ok(`Every design has its photo (${found}/${designs.length})`);
  } else {
    bad(`Only ${found} of ${designs.length} designs have their photo`);
    if (missing.length <= 6) missing.forEach((m) => line('      missing: ' + m));
    else line(`      ${missing.length} designs are missing photos`);
    problems.push('mismatch');
  }
}

/* 6 ── verdict --------------------------------------------------------- */
line();
line('─'.repeat(58));
line();

if (problems.length === 0) {
  line('  \x1b[32mEverything looks correct.\x1b[0m');
  line();
  line('  If photos still do not appear in your browser:');
  line('    1. Press Ctrl + Shift + R to force-refresh the page');
  line('    2. Try a different browser');
  line('    3. Make sure the address is http://localhost:3000');
  line('       (not https://, and not file:///)');
} else if (problems.includes('deps')) {
  line('  \x1b[31mThe parts are not installed.\x1b[0m');
  line();
  line('  Type this and press Enter:   npm install');
} else if (problems.includes('uploads-missing') || problems.includes('uploads-empty') || problems.includes('mismatch')) {
  line('  \x1b[31mPROBLEM: your photos did not extract from the ZIP.\x1b[0m');
  line();
  line('  The website and all its text are fine — only the image files are');
  line('  missing. This almost always means the ZIP was opened and run from');
  line('  inside Windows\' preview window instead of being properly extracted.');
  line();
  line('  HOW TO FIX IT:');
  line();
  line('    1. Stop the website      (click the black window, press Ctrl + C)');
  line('    2. Delete this folder');
  line('    3. Right-click colors-with-kiran.zip  →  "Extract All…"  →  Extract');
  line('       (do NOT just double-click the ZIP and open the folder inside it)');
  line('    4. Open the new folder, confirm it contains server.js');
  line('    5. npm install');
  line('    6. npm start');
  line();
  line('  To confirm it worked, this folder must exist and NOT be empty:');
  line('    public\\uploads\\thumb     ← should contain 18 .webp files');
} else {
  line('  \x1b[31mSomething is wrong with the installation.\x1b[0m');
  line('  Re-extract the ZIP into a fresh folder and run npm install again.');
}

line();
line('  Where this script looked:');
line('    database → ' + DATA_DIR);
line('    photos   → ' + UPLOAD_DIR);
line();
