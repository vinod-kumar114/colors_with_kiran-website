/**
 * The Express application, with no server attached.
 *
 *   server.js      imports this and calls app.listen()  → your own computer
 *   api/index.js   exports it as a serverless handler    → Vercel
 *
 * Keeping the app separate from the listener is the whole trick that makes one
 * codebase run in both places.
 */
import express from 'express';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  ROOT,
  DATA_DIR,
  PUBLIC_DIR,
  UPLOAD_DIR,
  IS_SERVERLESS,
  IS_FILE_DB,
  initSchema,
} from './db.js';
import { ensureDefaultSettings } from './settings.js';
import { ensureAdminUser } from './auth.js';
import { STORAGE_DRIVER } from './storage.js';
import publicRoutes from './routes/public.js';
import adminRoutes from './routes/admin.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROD = process.env.NODE_ENV === 'production';

/* --------------------------------------------------- cookie signing key */
/*
 * Sessions are signed with this. It MUST be stable, otherwise everyone is
 * logged out whenever the process restarts — and on Vercel, where many
 * instances run at once, a random per-instance value means login never works
 * at all. So: env var first, then a file (local only), then a last-resort
 * random value with a loud warning.
 */
function cookieSecret() {
  if (process.env.COOKIE_SECRET) return process.env.COOKIE_SECRET;

  if (!IS_SERVERLESS) {
    try {
      const f = path.join(DATA_DIR, '.cookie-secret');
      if (fs.existsSync(f)) return fs.readFileSync(f, 'utf8').trim();
      const s = crypto.randomBytes(32).toString('hex');
      fs.writeFileSync(f, s, { mode: 0o600 });
      return s;
    } catch {
      /* read-only filesystem — fall through */
    }
  }

  console.warn(
    '\n  ⚠  COOKIE_SECRET is not set. Admin logins will not survive a restart.\n' +
      '     Set COOKIE_SECRET in your environment variables (any long random string).\n'
  );
  return crypto.randomBytes(32).toString('hex');
}

export const app = express();

app.set('trust proxy', 1);
app.set('view engine', 'ejs');
// In Vercel serverless environment, current working directory is the root of the bundled files.
app.set('views', IS_SERVERLESS ? path.join(process.cwd(), 'views') : path.join(ROOT, 'views'));
app.disable('x-powered-by');

/* -------------------------------------------------------------- security */
const frameAncestors = (process.env.FRAME_ANCESTORS || (PROD ? "'self'" : '*'))
  .split(/\s+/)
  .filter(Boolean);

/*
 * img-src must allow the image host. With Cloudinary the photos come from
 * res.cloudinary.com, so that origin is added automatically — otherwise the
 * browser would silently block every photo.
 */
const imgSrc = ["'self'", 'data:', 'blob:'];
if (STORAGE_DRIVER === 'cloudinary') imgSrc.push('https://res.cloudinary.com');
if (process.env.EXTRA_IMG_SRC) imgSrc.push(...process.env.EXTRA_IMG_SRC.split(/\s+/).filter(Boolean));

app.use(
  helmet({
    frameguard: false, // superseded by the CSP frame-ancestors directive below
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: {
      useDefaults: false,
      directives: {
        defaultSrc: ["'self'"],
        baseUri: ["'self'"],
        objectSrc: ["'none'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
        imgSrc,
        connectSrc: ["'self'"],
        formAction: ["'self'"],
        frameAncestors,
      },
    },
  })
);

app.use(compression());
app.use(cookieParser(cookieSecret()));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(express.json({ limit: '1mb' }));

/* ---------------------------------------------------------------- static */
/*
 * On Vercel everything in public/ is served straight from the CDN before a
 * function is ever invoked, so these handlers are only used locally. They are
 * still registered because they cost nothing and keep `npm start` identical.
 */
app.use(
  '/uploads',
  express.static(UPLOAD_DIR, {
    maxAge: PROD ? '365d' : '1h',
    immutable: PROD,
    fallthrough: true,
  })
);
app.use(
  express.static(PUBLIC_DIR, {
    maxAge: PROD ? '7d' : 0,
    setHeaders(res, filePath) {
      if (filePath.endsWith('.html')) res.setHeader('Cache-Control', 'no-cache');
    },
  })
);

/* --------------------------------------------------------- setup gate */
/*
 * If this is running serverless but the cloud database was never configured,
 * every request would otherwise die with an opaque 500. Show a page that says
 * exactly what is missing instead. Plain HTML, no template — so it still
 * works even if something is wrong with the view bundle.
 */
const MISSING = [];
if (IS_SERVERLESS) {
  if (!process.env.DATABASE_URL && !process.env.TURSO_DATABASE_URL) MISSING.push('DATABASE_URL');
  else if (IS_FILE_DB) MISSING.push('DATABASE_URL (must be your libsql:// URL, not a file path)');
  if (!process.env.DATABASE_AUTH_TOKEN && !process.env.TURSO_AUTH_TOKEN) MISSING.push('DATABASE_AUTH_TOKEN');
  if (!process.env.COOKIE_SECRET) MISSING.push('COOKIE_SECRET');
  if (STORAGE_DRIVER !== 'cloudinary') MISSING.push('CLOUDINARY_CLOUD_NAME + CLOUDINARY_API_KEY + CLOUDINARY_API_SECRET');
}

if (MISSING.length) {
  app.use((req, res) => {
    const rows = MISSING.map((m) => `<li><code>${m}</code></li>`).join('');
    res.status(503).type('html').send(`<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Finish setting up — Colors with Kiran</title>
<style>
 body{margin:0;min-height:100vh;display:grid;place-items:center;background:#FBF7F0;
      font:16px/1.65 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#2A2320;padding:24px}
 .box{max-width:620px;background:#fff;border:1px solid #EDE2D2;border-radius:16px;padding:38px 40px;
      box-shadow:0 18px 50px rgba(42,35,32,.08)}
 h1{font:600 27px/1.25 Georgia,serif;margin:0 0 6px;color:#7A3E1D}
 p.sub{margin:0 0 26px;color:#6E6057}
 ul{margin:0 0 26px;padding-left:20px}
 li{margin:7px 0}
 code{background:#F5EDE1;padding:2px 7px;border-radius:5px;font-size:14px;color:#5A2C12}
 ol{margin:0;padding-left:20px;color:#6E6057}
 ol li{margin:9px 0}
 .foot{margin-top:26px;padding-top:18px;border-top:1px solid #EDE2D2;font-size:14px;color:#9A8C81}
</style></head><body><div class="box">
<h1>Almost there</h1>
<p class="sub">The website deployed successfully. It just needs its keys before it can open.</p>
<p><strong>Still missing:</strong></p>
<ul>${rows}</ul>
<ol>
 <li>Open your project on <strong>vercel.com</strong></li>
 <li>Go to <strong>Settings → Environment Variables</strong></li>
 <li>Add the names listed above with their values</li>
 <li>Go to <strong>Deployments</strong>, click <strong>⋯</strong> on the newest one, choose <strong>Redeploy</strong></li>
</ol>
<div class="foot">Step-by-step instructions are in <strong>VERCEL-DEPLOY.md</strong> inside your project folder.</div>
</div></body></html>`);
  });
}

/* ------------------------------------------------------------- readiness */
/*
 * A serverless function may start up at any moment, so the schema and the
 * admin account are ensured lazily on the first request of each cold start.
 * The promise is memoised, so this costs one round-trip per instance, not per
 * request. Both operations are idempotent.
 */
let _ready = null;
export function ensureReady() {
  if (!_ready) {
    _ready = (async () => {
      await initSchema();
      await ensureDefaultSettings();
      await ensureAdminUser();
    })().catch((err) => {
      _ready = null; // let the next request retry rather than wedging forever
      throw err;
    });
  }
  return _ready;
}

app.use(async (req, res, next) => {
  try {
    await ensureReady();
    next();
  } catch (err) {
    next(err);
  }
});

/* ---------------------------------------------------------------- routes */
app.use('/admin', adminRoutes);
app.use('/', publicRoutes);

/* ------------------------------------------------------------ 404 / 500 */
app.use((req, res) => {
  if (req.path.startsWith('/admin/api') || req.path.startsWith('/api')) {
    return res.status(404).json({ ok: false, error: 'Not found' });
  }
  res.status(404).render('404', { title: 'Page not found' });
});

app.use((err, req, res, _next) => {
  console.error(err);
  const msg =
    err.code === 'LIMIT_FILE_SIZE'
      ? `That image is too large. Please upload a photo under ${Math.round(
          (Number(process.env.MAX_UPLOAD_MB) || (IS_SERVERLESS ? 4 : 12))
        )} MB.`
      : err.message || 'Something went wrong.';
  const status = err.status || (err.code === 'LIMIT_FILE_SIZE' ? 413 : 500);
  if (req.path.startsWith('/admin/api') || req.path.startsWith('/api')) {
    return res.status(status).json({ ok: false, error: msg });
  }
  res.status(status).render('404', { title: 'Something went wrong', message: msg });
});

/** Short description of how this instance is configured, for the boot log. */
export function describeConfig() {
  return {
    database: IS_FILE_DB ? `file → ${DATA_DIR}` : 'Turso / libSQL (cloud)',
    photos: STORAGE_DRIVER === 'cloudinary' ? 'Cloudinary (cloud)' : `disk → ${UPLOAD_DIR}`,
    serverless: IS_SERVERLESS,
  };
}

export default app;
