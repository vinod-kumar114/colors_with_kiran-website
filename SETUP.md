# How to Set Up Your Website — Step by Step

Assalam-o-Alaikum Kiran 👋

This guide takes you from "I have a ZIP file" to "my website is online and
clients can find it on Google."

Read it in order. Do not skip Part 1 — it takes 20 minutes and proves
everything works before you spend any money.

---

## What you are downloading

One file: **`colors-with-kiran.zip`** (about 6 MB)

Inside it is your entire website — every page, all the photos, the database,
and the admin dashboard. Nothing else is needed.

**Download it now** and save it somewhere you will find it again. Your
**Desktop** is perfect.

---

## Which applications do you need?

| # | Application | What it does | Cost | Needed? |
|---|---|---|---|---|
| 1 | **Node.js 22 or newer** | The engine that runs your website | Free | **Yes — required** |
| 2 | A web browser | Chrome, Edge, Safari — you already have one | Free | Yes (already have it) |
| 3 | File unzipper | Built into Windows and Mac already | Free | Yes (already have it) |
| 4 | Visual Studio Code | For editing code | Free | **No** — you will never need it |

**That is genuinely the whole list.** You only have to install one thing:
Node.js. Everything else is already on your computer.

---

# Part 1 — Run it on your own computer

**Goal:** see your website working on your own screen, for free, before
paying anyone anything.

> **Important to understand:** when you run it on your computer, only *you*
> can see it. Your clients cannot. That is what Part 2 is for. Think of Part 1
> as a test drive.

---

## 🪟 If you use Windows

### Step 1 — Install Node.js (once, 5 minutes)

1. Open your browser and go to **[nodejs.org](https://nodejs.org)**
2. You will see a big green button that says something like
   **"LTS — Recommended For Most Users"**. Click it.
3. A file downloads (ends in `.msi`). Open it.
4. Click **Next → Next → I accept → Next → Install → Finish**.
   Do not change any settings. Just keep clicking Next.
5. Done. You never have to do this again.

### Step 2 — Unzip your website

1. Find `colors-with-kiran.zip` on your Desktop
2. **Right-click** it → **Extract All…**
3. Click **Extract**
4. You now have a folder called **`colors-with-kiran`**

### Step 3 — Open the folder and check

Open the folder. Keep opening folders until you see files named
**`server.js`** and **`package.json`** sitting right there.

> ⚠️ Sometimes unzipping creates a folder inside a folder
> (`colors-with-kiran` → `colors-with-kiran`). Make sure you are in the one
> that actually contains `server.js`, not the wrapper.

### Step 4 — Open the black command window

This is the only slightly unusual step. Take it slowly:

1. You are in the folder that contains `server.js`
2. Look at the **address bar** at the very top of the window — the strip that
   shows something like `Desktop > colors-with-kiran`
3. **Click once on that address bar.** It turns into editable text.
4. Delete what is there, type **`cmd`** and press **Enter**

A black window opens. This is the Command Prompt. The last line will show
your folder path. That means you are in the right place.

### Step 5 — Install the parts (once, 1–2 minutes)

In the black window, type this exactly and press Enter:

```
npm install
```

Text scrolls past for a minute or two. Wait until it stops and you get your
cursor back. **You only ever do this once.**

> If you see warnings in yellow, ignore them. Only red `ERROR` text matters.

### Step 6 — Start your website

Type this and press Enter:

```
npm start
```

You will see:

```
✓ Website  → http://0.0.0.0:3000
✓ Admin    → http://0.0.0.0:3000/admin
```

### Step 7 — Look at it! 🎉

Open your browser and go to:

**http://localhost:3000**

There is your website.

For the dashboard, go to **http://localhost:3000/admin**
Username `kiran`, password `mehndi123`.

### Starting and stopping

| | |
|---|---|
| **To stop it** | Click the black window, press **Ctrl + C** |
| **To start it again later** | Repeat **Step 4** and **Step 6** (`npm start`). Skip `npm install` — that was one-time. |
| **If you close the black window** | The website stops. That is normal. |

---

## 🍎 If you use a Mac

### Step 1 — Install Node.js

1. Go to **[nodejs.org](https://nodejs.org)**
2. Click the big green **LTS** button
3. Open the downloaded `.pkg` file
4. Click **Continue → Continue → Agree → Install**, enter your Mac password
5. Done

### Step 2 — Unzip

Double-click `colors-with-kiran.zip`. A folder appears next to it.

### Step 3 — Open Terminal

Press **Cmd + Space**, type **Terminal**, press Enter. A white or black
window opens.

### Step 4 — Point Terminal at your folder

Type `cd` then a **space** (do not press Enter yet):

```
cd 
```

Now **drag the `colors-with-kiran` folder from Finder into the Terminal
window** and let go. The path appears automatically. Press **Enter**.

### Step 5 & 6 — Install and start

```
npm install
```

Wait for it to finish, then:

```
npm start
```

### Step 7 — Look at it

Open **http://localhost:3000** in Safari or Chrome.
Dashboard at **http://localhost:3000/admin** (`kiran` / `mehndi123`).

To stop: click Terminal and press **Ctrl + C**.

---

# Part 2 — Putting it on the internet

Now the real thing: a website your clients can open on their phones.

## The one rule that matters

Your website saves two things to disk:

- the **database** (your designs, prices, bookings)
- your **uploaded photos**

Many "free hosting" plans **wipe the disk every time the site restarts.**
Your site would look fine for a few days, then one morning every photo you
uploaded would be gone. This is the single most common way people lose their
website, and it is worth understanding before you choose.

> **So: you need hosting with a "persistent disk" (also called a "volume").**
> This is why free hosting does not work for your site. Expect to pay roughly
> **$5–10 per month** (about Rs. 1,400–2,800).
>
> I checked this in September 2026: **Render's free plan has an ephemeral
> filesystem — uploaded photos are deleted on restart.** Persistent disks are
> paid-plan only. Railway has no permanent free tier either.

Your website has been built to make this easy: it can put **both** the
database and the photos inside **one** folder, so a single cheap disk covers
everything. See the settings below.

---

## Option A — Railway (easiest for a beginner)

**Roughly $5–10/month.** Needs a card that works internationally.

1. Create a free **GitHub** account at [github.com](https://github.com)
2. Create a new repository, and **upload your `colors-with-kiran` folder**
   to it (GitHub lets you drag and drop files in the browser — you do not
   need to learn Git)
3. Go to [railway.app](https://railway.app), sign in with GitHub
4. **New Project → Deploy from GitHub repo →** pick your repository
5. In your service, go to **Variables** and add:

   | Name | Value |
   |---|---|
   | `NODE_ENV` | `production` |
   | `DATA_DIR` | `/app/storage/data` |
   | `UPLOADS_DIR` | `/app/storage/uploads` |
   | `SITE_URL` | your website address, e.g. `https://colorswithkiran.com` |
   | `ADMIN_PASS` | a strong password of your choosing |

6. Go to **Settings → Volumes → Add Volume**, mount path: **`/app/storage`**

   ⚠️ **Do not skip this step.** This is the persistent disk. Without it you
   will lose your photos.

7. Railway gives you a web address. Open it — your site is live.

## Option B — Render

**About $7/month** (Starter plan) plus a small charge for the disk.

Same idea: connect your GitHub repo, then under **Disks** add a disk mounted
at `/app/storage`, and set the same environment variables as above.

**Do not use the free plan** — it has no disk, and your photos will vanish.

## Option C — A VPS (cheapest, most control, most technical)

A VPS from Hostinger, Contabo, or a Pakistani host is around $4–6/month and
the disk is permanent by default, so there is nothing special to configure.

Many **Pakistani hosting companies accept bank transfer, JazzCash or
Easypaisa**, which avoids the international-card problem entirely. When you
contact them, ask exactly this:

> *"Do you support Node.js version 20 or higher, with SSH access and
> permanent file storage?"*

If they say yes, it will work. This option does need someone comfortable with
a Linux server to set it up the first time.

---

## 💡 The honest shortcut

**Pay a developer for one hour to deploy it.**

I am telling you this because it is genuinely the most sensible route for a
non-technical person. Deploying this app is a 20–30 minute job for anyone who
does it regularly, and in Hyderabad or on Fiverr it should cost very little.

Here is the important part: **once it is online, you never need them again.**
Every single thing you will want to change day to day — designs, photos,
prices, categories, testimonials, your story, your WhatsApp number, the
announcement banner — is in your dashboard. Adding a design is uploading a
photo and typing a name. No developer required, ever.

Send them this exact message:

> *"It's a Node.js 20 app with SQLite. Please deploy it with `NODE_ENV=production`,
> set `DATA_DIR` and `UPLOADS_DIR` to a mounted persistent volume, set `SITE_URL`
> and a strong `ADMIN_PASS`, and put HTTPS in front. Full notes are in README.md."*

That paragraph tells them everything they need.

---

# Part 3 — Your domain name

Your hosting gives you an ugly address like `colors-with-kiran.up.railway.app`.
A proper domain looks professional on a wedding card or an Instagram bio.

- **`.com`** — about $10–15/year from [Namecheap](https://namecheap.com),
  GoDaddy, or Hostinger
- **`.pk`** — registered through **PKNIC** (pknic.net.pk), payable in rupees

Good choices: `colorswithkiran.com`, `colorswithkiran.pk`

Once bought, your host will show you exactly which DNS records to add.
It is a copy-paste job, and it takes a few hours to start working.

---

# Part 4 — The first 10 minutes after it goes live

Do these in order:

1. **Change your password.**
   Dashboard → **Settings** → Change password. There is a yellow warning at
   the top until you do.

2. **Put in your real contact details.**
   Dashboard → **Contact Info**. Set your real WhatsApp number with the
   country code (`+92 3XX XXXXXXX`). **Every WhatsApp button on the website
   uses this number** — until you change it, they all point to a fake one.

3. **Replace the demo photos with your own work.**
   The current photos are placeholders. They look convincing, but they are
   not your hands. Dashboard → **Portfolio** → **Edit** each one, or delete
   them and add your own.

4. **Check your prices.**
   Dashboard → **Pricing**. The numbers in there are examples, not your rates.

5. **Tell Google you exist.**
   Search for **Google Search Console**, add your website, and submit
   `https://yourdomain.com/sitemap.xml`. Also create a free
   **Google Business Profile** for "Colors with Kiran" in Qasimabad — for a
   local business like yours, this brings in more clients than anything else.

6. **Put the link in your Instagram bio.** 🙂

---

# Part 5 — Backups (please do not skip)

Your entire website is **two folders**:

```
data/              ← your designs, prices, bookings, all your text
public/uploads/    ← your photos
```

(Or the single `storage` folder, if you set it up that way in Part 2.)

Copy those two folders somewhere safe — Google Drive, a USB stick, WhatsApp
to yourself — **once a month, and always before any big change.**

To restore after a disaster: reinstall as in Part 1, then paste those two
folders back over the new ones. That is the entire recovery procedure.

---

# Troubleshooting

## 🔎 Something wrong? Run the checker first

Before anything else, in the black window type:

```
npm run check
```

It inspects your installation and tells you in plain language what is wrong
and how to fix it. It changes nothing, so it is always safe to run.

| What you see | What it means | What to do |
|---|---|---|
| **The website works but no photos appear** | The photo files did not extract | See "Photos are missing" below |
| `'npm' is not recognized` | Node.js is not installed, or the window was open before you installed it | Install Node.js, then **close and reopen** the black window |
| `Error: listen EADDRINUSE :::3000` | The site is already running in another window | Close the other window, or restart your computer |
| The page will not open | The black window is closed, or you stopped it | Run `npm start` again and leave the window open |
| `Cannot find module 'express'` | `npm install` was skipped or failed | Run `npm install` again in the correct folder |
| Photos vanished after redeploy | Your host has no persistent disk | Re-read "The one rule that matters" in Part 2 |
| Forgot the admin password | — | It can be reset by whoever deployed it |
| Deleted a design by mistake | Nothing is ever really deleted | Dashboard → **Trash** → **Restore** |

### `Assertion failed: (env) != nullptr` / `Native stack trace`

A wall of hexadecimal numbers when you run `npm start`. It looks terrifying;
it is actually a known, fixed bug.

**Cause:** old versions of the database engine (`better-sqlite3` v12 and
below) crash on Node.js 24.19 and newer.

**Fix — run this one command:**

```
npm install better-sqlite3@13
```

then `npm start` again. Version 13 is a rewrite that cannot hit this bug,
and it installs as a ready-made file, so nothing has to be compiled — your
install will also be much faster.

*(If you downloaded the ZIP after 11 October 2026, this is already fixed.)*

---

### Photos are missing (site works, pictures don't show)

This is the most common problem, and it is **not** a fault in the website —
the image files simply did not make it onto your disk.

The usual cause: on Windows, double-clicking a ZIP opens a *preview* that
looks exactly like a normal folder. If you run the site from in there, you
get the pages but not the photos.

**Check in 10 seconds.** Open this folder:

```
colors-with-kiran\public\uploads\thumb
```

- **18 files ending in `.webp`** → the photos are fine, skip to the bottom
- **empty, or the folder doesn't exist** → that's your problem ✔

**The fix:**

1. Stop the website — click the black window, press **Ctrl + C**
2. **Delete** the folder you extracted
3. **Right-click** `colors-with-kiran.zip` → **Extract All…** → **Extract**
   *(do not just double-click the ZIP and work inside it)*
4. Open the new folder and confirm `server.js` is there
5. `npm install`
6. `npm start`

**If `uploads\thumb` does have 18 files and photos still don't show:**
press **Ctrl + Shift + R** to force-refresh, confirm the address is
`http://localhost:3000` (not `https://`, not `file:///`), and try another
browser.

---

**Still stuck?** Screenshot the black window — the error text in it tells any
developer exactly what went wrong in about five seconds.

---

## Quick reference

```
Website          http://localhost:3000
Dashboard        http://localhost:3000/admin
Username         kiran
Password         mehndi123   ← change this immediately

Start            npm start
Stop             Ctrl + C
Install (once)   npm install
```

| Document | What it is for |
|---|---|
| **SETUP.md** | This file — installing and hosting |
| **KIRAN-GUIDE.md** | Using your dashboard day to day, in plain language |
| **README.md** | Technical notes — hand this to any developer |

You have got this. ✨
