# Deploying to Vercel — Step by Step

This is the complete walkthrough: from the ZIP on your Desktop to a live
website on the internet, running on Vercel.

**Total cost: $0.** All three services have free tiers that comfortably fit a
mehndi portfolio site. You only pay if you want a custom `.com` domain
(about $12/year).

**Time: about 45 minutes** the first time.

---

## Why three services instead of one?

Vercel is "serverless" — it has **no permanent disk**. That is excellent for
speed and cost, but it means your website cannot save anything to its own
folder. So the two things that need saving move to specialists:

| What | Where it lives now | Free tier |
|---|---|---|
| 🌐 The website itself | **Vercel** | Generous |
| 🗄️ Database (designs, prices, bookings) | **Turso** | 500 databases, 9 GB |
| 🖼️ Photos | **Cloudinary** | 25 GB storage + bandwidth |

You will create three free accounts. After that, everything is managed from
your own admin dashboard exactly as before.

---

# Part 1 — Create the database (Turso)

1. Go to **[turso.tech](https://turso.tech)** and sign up (GitHub login is
   fastest — it's free, no card).
2. Click **Create Database**.
3. Name it `colors-with-kiran`. Pick the region closest to Pakistan —
   **Frankfurt (fra)** or **Mumbai (bom)** are good choices.
4. Open the database, find **Connect** / **Connection details**, and copy:

   - the **URL** — looks like `libsql://colors-with-kiran-yourname.turso.io`
   - then click **Create Token** and copy the **auth token** — a long string
     starting with `eyJ...`

5. Paste both into a notepad for a minute. You will need them twice.

> 💡 Keep the token private. Anyone with it can read and change your data.

---

# Part 2 — Create the photo storage (Cloudinary)

1. Go to **[cloudinary.com](https://cloudinary.com)** and sign up free.
2. On your **Dashboard** you will immediately see a box with:

   - **Cloud Name**
   - **API Key**
   - **API Secret** (click the eye icon to reveal it)

3. Copy all three into your notepad.

That's it — no configuration needed. Cloudinary will also generate the
thumbnails for you automatically, which makes your site faster than before.

---

# Part 3 — Put the code on GitHub

Vercel deploys from GitHub. You do **not** need to learn Git.

1. Create a free account at **[github.com](https://github.com)**.
2. Click **+** (top right) → **New repository**.
3. Name it `colors-with-kiran`. Choose **Private**. Click **Create**.
4. On the next page click **uploading an existing file**.
5. Open your extracted `colors-with-kiran` folder, select **everything
   except the `node_modules` folder**, and drag it into the browser.
6. Scroll down, click **Commit changes**.

> ⚠️ Do not upload `node_modules` — it is huge and unnecessary. It is already
> listed in `.gitignore`, so if you used Git it would be skipped
> automatically.

---

# Part 4 — Deploy on Vercel

1. Go to **[vercel.com](https://vercel.com)** and sign in **with GitHub**.
2. Click **Add New → Project**.
3. Find `colors-with-kiran` in the list and click **Import**.
4. **Before clicking Deploy**, open **Environment Variables** and add these
   seven. Copy the names exactly:

| Name | Value |
|---|---|
| `DATABASE_URL` | your Turso URL (`libsql://...`) |
| `DATABASE_AUTH_TOKEN` | your Turso token (`eyJ...`) |
| `CLOUDINARY_CLOUD_NAME` | from Cloudinary |
| `CLOUDINARY_API_KEY` | from Cloudinary |
| `CLOUDINARY_API_SECRET` | from Cloudinary |
| `COOKIE_SECRET` | any long random string — see below |
| `ADMIN_PASS` | the password you want for your dashboard |

**For `COOKIE_SECRET`,** just mash the keyboard for 40+ characters, or run
`openssl rand -hex 32` in a terminal. It only has to be long and random.

> ⚠️ `COOKIE_SECRET` is the one people forget. Without it you can log in but
> get thrown straight back out, because each serverless instance would sign
> your session differently.

5. Click **Deploy** and wait about a minute.

> ✅ **The deploy will succeed even if you got a variable wrong.** Instead of
> a red build error, the site shows a page listing exactly which values are
> still missing. Add them, hit **Redeploy**, and you are done.

6. Vercel gives you a URL like `colors-with-kiran.vercel.app`. **Open it.**

---

# Part 5 — First login

1. Go to `https://your-site.vercel.app/admin`
2. Username `kiran`, password = whatever you set as `ADMIN_PASS`
3. The site starts **empty** — no demo designs. That is deliberate: you were
   going to replace them anyway.

Now add your real work: **Categories** first, then **Portfolio**, then
**Pricing**, **About** and **Contact Info**.

> Remember to put your **real WhatsApp number** in Contact Info. Every
> WhatsApp button on the site uses it.

---

# Part 6 (optional) — Bring your existing designs across

If you already added designs on your own computer and want them online,
there is a migration command that copies everything — database rows *and*
photos — in one go.

In your project folder on your computer, run:

```
DATABASE_URL=libsql://...        \
DATABASE_AUTH_TOKEN=eyJ...       \
CLOUDINARY_CLOUD_NAME=...        \
CLOUDINARY_API_KEY=...           \
CLOUDINARY_API_SECRET=...        \
npm run migrate
```

On Windows Command Prompt, set them first instead:

```
set DATABASE_URL=libsql://...
set DATABASE_AUTH_TOKEN=eyJ...
set CLOUDINARY_CLOUD_NAME=...
set CLOUDINARY_API_KEY=...
set CLOUDINARY_API_SECRET=...
npm run migrate
```

It uploads every photo to Cloudinary, rewrites the links, and copies your
categories, designs, prices, testimonials, bookings, settings **and your
admin password**. It refuses to run if the cloud database already has
designs, unless you add `--force`.

Want the demo content instead? Use `npm run seed` with the same variables.

---

# Part 7 (optional) — Your own domain

1. Buy `colorswithkiran.com` from Namecheap or Cloudflare (~$12/year), or a
   `.pk` from **PKNIC** (pays in rupees).
2. In Vercel: **Project → Settings → Domains → Add**.
3. Vercel shows you exactly which DNS records to paste at your registrar.
4. Add `SITE_URL=https://colorswithkiran.com` to your environment variables
   so the sitemap and share previews use the real address.

HTTPS is automatic and free.

---

# Deploying with the Vercel CLI instead

If you prefer the terminal to GitHub:

```
npm i -g vercel
vercel login
vercel link
vercel env add DATABASE_URL
vercel env add DATABASE_AUTH_TOKEN
vercel env add CLOUDINARY_CLOUD_NAME
vercel env add CLOUDINARY_API_KEY
vercel env add CLOUDINARY_API_SECRET
vercel env add COOKIE_SECRET
vercel env add ADMIN_PASS
vercel --prod
```

---

# Checking your work before you deploy

```
npm run build
```

This parses every file, compiles every template, validates `vercel.json`, and
— when running on Vercel — confirms all required environment variables are
present. It fails loudly at build time rather than leaving you with a broken
site.

---

# Things worth knowing

### You do not need to set `NODEJS_HELPERS`
It is already set to `0` in `vercel.json`. This matters more than it sounds:
Vercel's Node runtime otherwise reads the request body before your code does,
which breaks every photo upload with *"Unexpected end of form"*. (The
`export const config = { api: { bodyParser: false } }` trick you will find on
Stack Overflow is Next.js-only and is silently ignored here.)

### Uploads are capped at 4 MB on Vercel
Vercel refuses any request body over 4.5 MB, so the limit is set to 4 MB
automatically. Most phone photos are 2–5 MB. If one is rejected, the error
tells you plainly. Self-hosted installs still allow 12 MB.

### The first visit after a quiet period is slower
Serverless functions "sleep". The first request wakes one up and may take a
second or two; everything after that is fast. This is normal and free-tier
behaviour.

### Your site still runs on your own computer
Nothing was taken away. With no cloud variables set, `npm start` uses the
local file database and the local photos folder exactly as before. You can
keep building your portfolio offline and push it up later.

### Backups
Turso keeps automatic point-in-time backups. Cloudinary keeps your originals.
You can also export anytime with
`turso db shell colors-with-kiran .dump > backup.sql`.

---

# Troubleshooting

| What you see | What it means | Fix |
|---|---|---|
| A page saying "Almost there" | Environment variables not set yet | Add the ones it lists, then **Redeploy** |
| Build log shows yellow `!` warnings | Same thing — the build still succeeded | Add the variables, then **Redeploy** |
| Login bounces back to the login page | `COOKIE_SECRET` missing | Add it, redeploy |
| Photos upload but do not appear | Cloudinary keys wrong | Re-copy all three, redeploy |
| "Image too large" | Over 4 MB | Resize, or use the local install for big files |
| Pages render but CSS is missing | `public/` not uploaded to GitHub | Re-upload, keeping the folder structure |
| 500 on every page | Check Vercel → Deployments → the deployment → **Logs** | The real error is printed there |

> **Changing an environment variable does not take effect until you
> redeploy.** Vercel → Deployments → ⋯ → Redeploy.

---

## The other guides

| File | What it covers |
|---|---|
| **VERCEL-DEPLOY.md** | This file — going live on Vercel |
| **SETUP.md** | Running it on your own computer, and other hosts |
| **KIRAN-GUIDE.md** | Using the dashboard day to day |
| **APKE-SAWAL.md** | Your questions answered (Roman Urdu) |
| **MASLAY-AUR-HAL.md** | Problems and fixes (Roman Urdu) |
| **README.md** | Technical reference for a developer |
