# Colors with Kiran — Mehndi Portfolio & Booking Website

A complete, self-hosted portfolio and booking platform for **Colors with Kiran**, a
professional Mehndi/Henna artist in **Qasimabad, Hyderabad, Sindh, Pakistan**.

Kiran manages everything — designs, photos, categories, prices, testimonials,
enquiries and all site text — from a simple admin dashboard. No coding required.

> **New here?** If you are Kiran, read **[KIRAN-GUIDE.md](KIRAN-GUIDE.md)** instead.
> It explains the dashboard in plain language with no technical words.

---

## Quick start

```bash
npm install
npm start
```

Then open:

| | |
|---|---|
| Website | http://localhost:3000 |
| Admin dashboard | http://localhost:3000/admin |
| Default login | `kiran` / `mehndi123` |

The first run creates the database, processes the demo photos and seeds
13 categories, 16 designs, 9 price rows and 4 testimonials.

**Change the default password immediately** — the dashboard shows a warning
banner until you do (Settings → Change password).

---

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| Server | Node.js 20 + Express 5 | Small, boring, easy to host anywhere |
| Database | SQLite (`@libsql/client (libSQL/SQLite)`) | One file, zero admin, trivial backups |
| Templates | EJS, server-rendered | Real HTML for Google — no JS needed to read the site |
| Images | `sharp` | Auto WebP + thumbnails on upload |
| Auth | `bcryptjs` + DB-backed sessions | httpOnly signed cookies, sessions survive restart |
| Security | `helmet`, `express-rate-limit` | CSP, brute-force protection |

No build step. No bundler. No front-end framework. The whole client side is
~12 KB of hand-written CSS and vanilla JS.

---

## Project structure

```
colors-with-kiran/
├── server.js               # app setup, security, static files, bootstrap
├── src/
│   ├── db.js               # SQLite schema + slug/sort helpers
│   ├── models.js           # shared queries + price formatting
│   ├── settings.js         # key/value site settings + WhatsApp link builder
│   ├── auth.js             # bcrypt login, sessions, requireAuth
│   ├── images.js           # multer + sharp pipeline, validation
│   ├── seed.js             # first-run demo content
│   └── routes/
│       ├── public.js       # website pages, booking form, sitemap, robots
│       └── admin.js        # login + JSON API for the dashboard
├── views/                  # EJS templates (public pages + admin)
├── public/
│   ├── css/site.css        # design system for the public site
│   ├── css/admin.css       # dashboard styles
│   ├── js/site.js          # nav, filters, lightbox, reveals
│   ├── js/admin.js         # the whole dashboard
│   └── uploads/
│       ├── full/           # 1600px WebP  (lightbox / detail pages)
│       └── thumb/          # 700px  WebP  (grids and cards)
├── assets/seed/            # original demo photos (not served publicly)
└── data/
    ├── colorswithkiran.db  # ← the entire site content
    └── .cookie-secret      # generated on first run
```

---

## Configuration

Copy `.env.example` to `.env` (or set real environment variables).

| Variable | Default | Notes |
|---|---|---|
| `PORT` | `3000` | |
| `NODE_ENV` | — | Set to `production` when deploying |
| `SITE_URL` | request host | Used for canonical URLs, sitemap, OG tags. **Set this in production.** |
| `ADMIN_USER` | `kiran` | Only used when creating the very first account |
| `ADMIN_PASS` | `mehndi123` | Same — set it before first run to skip the default |
| `COOKIE_SECRET` | auto-generated | Set a long random string in production |
| `FRAME_ANCESTORS` | `*` in dev, `'self'` in prod | CSP `frame-ancestors`. Keep `'self'` in production. |
| `DATA_DIR` | `<root>/data` | SQLite database location. Point inside your persistent volume. |
| `UPLOADS_DIR` | `<root>/public/uploads` | Uploaded photos (`full/` + `thumb/` are created inside). Point inside your persistent volume. |

### Single-volume hosts

Most small hosts give you exactly one mountable volume. Put both state
directories inside it — with the volume at `/app/storage`:

```
DATA_DIR=/app/storage/data
UPLOADS_DIR=/app/storage/uploads
```

Both are created on boot, and the paths in use are printed at startup so a
misconfiguration is obvious in the deploy logs rather than three weeks later.
Anything written outside the volume is lost on redeploy.

---

---

## Deploying to Vercel

This app runs on Vercel as a single serverless function, with cloud services
replacing the two things a serverless platform cannot provide.

| Concern | Self-hosted | Vercel |
|---|---|---|
| Database | SQLite file (`DATABASE_URL=file:…`) | **Turso** (`libsql://…`) |
| Photos | `public/uploads` via sharp | **Cloudinary** (auto thumbnails) |
| Entry point | `server.js` → `app.listen()` | `api/index.js` → exported app |
| Static assets | `express.static` | Vercel CDN (`public/` is served first) |

Both modes share one codebase and one set of SQL queries. The driver is chosen
from the environment, so nothing is forked or duplicated.

### Required environment variables on Vercel

```
DATABASE_URL           libsql://<db>-<org>.turso.io
DATABASE_AUTH_TOKEN    eyJhbGciOi...
CLOUDINARY_CLOUD_NAME  your-cloud
CLOUDINARY_API_KEY     1234567890
CLOUDINARY_API_SECRET  ...
COOKIE_SECRET          openssl rand -hex 32
ADMIN_PASS             your admin password
SITE_URL               https://yourdomain.com   (recommended)
```

`npm run build` validates all of the above when it detects `VERCEL=1`, so a
missing variable fails the build instead of producing a broken site.

### Architecture notes

- **`src/app.js`** builds the Express app and exports it. `server.js` attaches
  a listener; `api/index.js` exports it as a handler. Nothing else differs.
- **Schema + admin bootstrapping is lazy and memoised** (`ensureReady()`), so a
  cold start costs one round-trip, not one per request.
- **Sessions live in the `sessions` table**, not in memory — required when many
  instances serve the same user.
- **`bodyParser` is disabled** in `api/index.js` so multer can read the upload
  stream itself.
- **`vercel.json` sets `includeFiles: "views/**"`** — EJS templates are loaded
  by path at runtime and would otherwise be tree-shaken out of the bundle.
- **Image URLs are resolved per row.** A bare filename renders as
  `/uploads/<variant>/<file>`; a value starting with `http` is used verbatim.
  Local and Cloudinary rows can therefore coexist, which is what makes the
  migration non-breaking.
- **Uploads are capped at 4 MB** under `VERCEL` (platform limit is 4.5 MB),
  12 MB otherwise. Override with `MAX_UPLOAD_MB`.
- **CSP `img-src`** gains `https://res.cloudinary.com` automatically when the
  Cloudinary driver is active.

### Commands

```
npm start      # local server
npm run dev    # local server, restarts on change
npm run build  # parse + compile + config validation (runs on Vercel too)
npm run seed   # create tables and demo content in whatever DATABASE_URL points at
npm run migrate # copy a local install (DB + photos) up to Turso + Cloudinary
npm run check  # diagnose a local installation
```

A full click-by-click walkthrough for a non-technical owner is in
**VERCEL-DEPLOY.md**.


## Deploying

Any host that runs Node and gives you a persistent disk works
(Railway, Render, Fly.io, a VPS, cPanel with Node support).

```bash
NODE_ENV=production \
SITE_URL=https://colorswithkiran.com \
COOKIE_SECRET="$(openssl rand -hex 32)" \
ADMIN_PASS="a-strong-password" \
npm start
```

Behind Nginx/Caddy, proxy to the app and terminate TLS there. `trust proxy`
is already enabled, so `secure` cookies and rate limiting work correctly.

### Two things that matter

1. **Persistent disk.** `data/` and `public/uploads/` must survive restarts and
   redeploys. On ephemeral platforms (Heroku-style), mount a volume for both,
   or you will lose Kiran's photos.
2. **HTTPS.** Session cookies are marked `secure` when `NODE_ENV=production`,
   so the dashboard will not log in over plain HTTP in production mode.

### Backups

Everything is two paths:

```bash
tar czf backup-$(date +%F).tar.gz data/ public/uploads/
```

Restore by extracting them back. That is the whole procedure.

---

## Data safety

Deletion is deliberately hard to do by accident:

- Deleting a design **soft-deletes** it — it disappears from the website but
  stays in **Trash** with its files intact.
- Permanent deletion is only possible from the Trash screen, and the API
  refuses to hard-delete anything that has not been trashed first.
- Deleting a **category never deletes designs** — they become uncategorised.
- Hiding a testimonial or a price row keeps the record; it just stops rendering.
- Replaced images clean up their old files; nothing else is ever unlinked.

### Upload validation

- MIME allow-list: JPEG, PNG, WebP, AVIF, HEIC/HEIF
- 12 MB hard limit, single file per request
- `sharp` re-decodes every upload, so a renamed `.jpg` text file, a PDF, or an
  SVG containing `<script>` is rejected before it ever touches the disk
- Everything is re-encoded to WebP, stripping any embedded payload
- Stored under a random hex filename — the original name is never used

---

## Performance

- Uploads become two WebP files: 1600px (full) and 700px (thumb)
- Grids and cards load thumbs only; full-size loads only in the lightbox
- `loading="lazy"` + `decoding="async"` below the fold, `fetchpriority="high"` on the hero
- Explicit `width`/`height` on every image, so nothing shifts while loading
- Lightbox preloads the next and previous image
- gzip via `compression`, 1-year immutable cache on `/uploads`
- No web fonts block rendering (`display=swap`), no JS framework

---

## SEO

- Server-rendered HTML — the site is fully readable with JavaScript disabled
- Unique `<title>` and meta description per page, targeting local searches
  ("mehndi artist in Qasimabad", "bridal mehndi Hyderabad", …)
- `LocalBusiness` / `HealthAndBeautyBusiness` JSON-LD with address, area served,
  opening hours, price range and offers
- `Product` JSON-LD with PKR pricing on every design page
- Descriptive alt text generated from design name + category + location
- `/sitemap.xml` regenerates automatically as designs are added
- `/robots.txt` disallows `/admin`
- Open Graph + Twitter cards for WhatsApp and Instagram link previews
- Canonical URLs, `geo.region` / `geo.placename` meta tags

---

## Built to grow

The schema and structure leave room for the features on Kiran's wish list
without a rewrite:

| Later feature | Where it slots in |
|---|---|
| Booking calendar / availability | `inquiries` already stores date + time; add an `availability` table |
| Deposits & online payment | Add `payments` table; hook a gateway into the inquiry flow |
| Discount coupons | New `coupons` table, applied at booking |
| Customer accounts | `users` table already exists — add a `role` column |
| Multiple artists | Add `artist_id` to `designs` and `inquiries` |
| Blog / Mehndi tips | New `posts` table + two routes, reusing the same templates |
| Instagram feed | Drop a widget into the homepage template |
| Before/after gallery | `designs` already supports `placement` — add a third value |
| Urdu language support | Settings are already key/value — add `ur` variants and a toggle |

---

## Licence

Built for Kiran. Do what you like with it.
