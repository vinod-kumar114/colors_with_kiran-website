/**
 * Admin dashboard: login + JSON API behind a session cookie.
 *
 * Async throughout (libSQL speaks HTTP). Every endpoint, payload shape and
 * error message is unchanged, so public/js/admin.js needed no edits at all.
 */
import express from 'express';
import rateLimit from 'express-rate-limit';
import { sql, uniqueSlug, nextSortOrder } from '../db.js';
import { upload, putImage, deleteImage, resolveUrl, MAX_UPLOAD_BYTES } from '../storage.js';
import { allSettings, setSetting, DEFAULT_SETTINGS } from '../settings.js';
import {
  getCategories,
  getDesigns,
  getDesignById,
  getPricing,
  getTestimonials,
  getInquiries,
  dashboardStats,
} from '../models.js';
import {
  COOKIE_NAME,
  verifyLogin,
  createSession,
  destroySession,
  requireAuth,
  userFromRequest,
  changePassword,
} from '../auth.js';

const router = express.Router();
const PROD = process.env.NODE_ENV === 'production';

const clean = (v, max = 500) => String(v ?? '').trim().slice(0, max);
const bool = (v) => (v === true || v === 'true' || v === '1' || v === 1 ? 1 : 0);
const ok = (res, data = {}) => res.json({ ok: true, ...data });

/* =======================================================  AUTHENTICATION */

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 12,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: 'Too many sign-in attempts. Please wait 15 minutes.',
});

router.get('/login', async (req, res) => {
  if (await userFromRequest(req)) return res.redirect('/admin');
  res.render('admin/login', { title: 'Admin Sign In', error: null });
});

router.post('/login', loginLimiter, async (req, res) => {
  const user = await verifyLogin(req.body.username, req.body.password);
  if (!user) {
    return res.status(401).render('admin/login', {
      title: 'Admin Sign In',
      error: 'Incorrect username or password.',
    });
  }
  const { token, expires } = await createSession(user.id);
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    signed: true,
    sameSite: 'lax',
    secure: PROD,
    expires: new Date(expires),
  });
  res.redirect('/admin');
});

router.post('/logout', async (req, res) => {
  await destroySession(req.signedCookies?.[COOKIE_NAME]);
  res.clearCookie(COOKIE_NAME);
  res.redirect('/admin/login');
});

/* Everything below requires a signed-in admin. */
router.use(requireAuth);

/* =============================================================  DASHBOARD */

router.get('/', (req, res) => {
  res.render('admin/dashboard', {
    title: 'Dashboard — Colors with Kiran',
    user: req.user,
    maxUploadMb: Math.round(MAX_UPLOAD_BYTES / 1024 / 1024),
  });
});

/** One call that hydrates the whole dashboard. */
router.get('/api/bootstrap', async (req, res) => {
  const [
    stats, categories, designs, trash, pricing, testimonials, inquiries, settings,
  ] = await Promise.all([
    dashboardStats(),
    getCategories(),
    getDesigns({ placement: 'all' }),
    getDesigns({ placement: 'all', trashed: true }),
    getPricing(false),
    getTestimonials(false),
    getInquiries(),
    allSettings(),
  ]);
  ok(res, {
    stats, categories, designs, trash, pricing, testimonials, inquiries, settings,
    settingKeys: Object.keys(DEFAULT_SETTINGS),
    user: { username: req.user.username, must_change: req.user.must_change },
  });
});

/* ===============================================================  DESIGNS */

async function readDesignBody(req) {
  const b = req.body || {};
  const fields = {
    title: clean(b.title, 140),
    category_id: b.category_id ? Number(b.category_id) : null,
    description: clean(b.description, 3000),
    caption: clean(b.caption, 300),
    price_type: ['starting', 'fixed', 'request'].includes(b.price_type)
      ? b.price_type
      : 'starting',
    price_value: clean(b.price_value, 20).replace(/[^\d.]/g, ''),
    placement: b.placement === 'gallery' ? 'gallery' : 'portfolio',
    is_featured: bool(b.is_featured),
    taken_on: clean(b.taken_on, 20),
  };
  if (!fields.title) throw Object.assign(new Error('Please enter a design name.'), { status: 400 });
  return fields;
}

router.post('/api/designs', upload.single('image'), async (req, res, next) => {
  try {
    const f = await readDesignBody(req);
    if (!req.file) {
      return res.status(400).json({ ok: false, error: 'Please choose an image to upload.' });
    }
    const img = await putImage(req.file.buffer, req.file.mimetype);
    const info = await sql.run(
      `INSERT INTO designs
        (title, slug, category_id, description, caption, price_type, price_value,
         placement, is_featured, taken_on, image, thumb, width, height, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        f.title,
        await uniqueSlug('designs', f.title),
        f.category_id,
        f.description,
        f.caption,
        f.price_type,
        f.price_value,
        f.placement,
        f.is_featured,
        f.taken_on,
        img.image,
        img.thumb,
        img.width,
        img.height,
        await nextSortOrder('designs'),
      ]
    );
    ok(res, { design: await getDesignById(info.lastInsertRowid) });
  } catch (err) {
    next(err);
  }
});

router.post('/api/designs/:id', upload.single('image'), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const existing = await sql.get('SELECT * FROM designs WHERE id = ?', [id]);
    if (!existing) return res.status(404).json({ ok: false, error: 'Design not found.' });

    const f = await readDesignBody(req);
    let img = {
      image: existing.image,
      thumb: existing.thumb,
      width: existing.width,
      height: existing.height,
    };
    let oldFile = null;

    if (req.file) {
      img = await putImage(req.file.buffer, req.file.mimetype);
      oldFile = existing.image; // replaced — safe to remove the old files
    }

    await sql.run(
      `UPDATE designs SET
         title=?, slug=?, category_id=?, description=?,
         caption=?, price_type=?, price_value=?,
         placement=?, is_featured=?, taken_on=?,
         image=?, thumb=?, width=?, height=?,
         updated_at=datetime('now')
       WHERE id=?`,
      [
        f.title,
        await uniqueSlug('designs', f.title, id),
        f.category_id,
        f.description,
        f.caption,
        f.price_type,
        f.price_value,
        f.placement,
        f.is_featured,
        f.taken_on,
        img.image,
        img.thumb,
        img.width,
        img.height,
        id,
      ]
    );

    if (oldFile) await deleteImage(oldFile);
    ok(res, { design: await getDesignById(id) });
  } catch (err) {
    next(err);
  }
});

/* quick toggles used by the grid buttons */
router.post('/api/designs/:id/toggle', async (req, res) => {
  const id = Number(req.params.id);
  const field = req.body.field;
  if (field === 'featured') {
    await sql.run(
      `UPDATE designs SET is_featured = 1 - is_featured, updated_at = datetime('now') WHERE id = ?`,
      [id]
    );
  } else if (field === 'placement') {
    await sql.run(
      `UPDATE designs SET placement = CASE placement WHEN 'portfolio' THEN 'gallery' ELSE 'portfolio' END,
       updated_at=datetime('now') WHERE id=?`,
      [id]
    );
  } else {
    return res.status(400).json({ ok: false, error: 'Unknown field.' });
  }
  ok(res, { design: await getDesignById(id) });
});

/* --- soft delete / restore / purge ------------------------------------ */

router.post('/api/designs/:id/trash', async (req, res) => {
  await sql.run("UPDATE designs SET deleted_at = datetime('now') WHERE id = ?", [
    Number(req.params.id),
  ]);
  ok(res, { stats: await dashboardStats() });
});

router.post('/api/designs/:id/restore', async (req, res) => {
  await sql.run('UPDATE designs SET deleted_at = NULL WHERE id = ?', [Number(req.params.id)]);
  ok(res, { stats: await dashboardStats() });
});

/** Permanent — only reachable from the Trash screen, with a confirm. */
router.delete('/api/designs/:id', async (req, res) => {
  const id = Number(req.params.id);
  const row = await sql.get('SELECT * FROM designs WHERE id = ?', [id]);
  if (!row) return res.status(404).json({ ok: false, error: 'Design not found.' });
  if (!row.deleted_at) {
    return res.status(400).json({
      ok: false,
      error: 'Move the design to Trash first — this protects you from accidents.',
    });
  }
  await sql.run('DELETE FROM designs WHERE id = ?', [id]);
  await deleteImage(row.image);
  ok(res, { stats: await dashboardStats() });
});

router.post('/api/trash/empty', async (req, res) => {
  const rows = await sql.all('SELECT * FROM designs WHERE deleted_at IS NOT NULL');
  await sql.run('DELETE FROM designs WHERE deleted_at IS NOT NULL');
  for (const r of rows) await deleteImage(r.image);
  ok(res, { removed: rows.length, stats: await dashboardStats() });
});

/* ============================================================  CATEGORIES */

router.post('/api/categories', async (req, res) => {
  const name = clean(req.body.name, 60);
  if (!name) return res.status(400).json({ ok: false, error: 'Please enter a category name.' });
  await sql.run(
    'INSERT INTO categories (slug, name, emoji, description, sort_order) VALUES (?, ?, ?, ?, ?)',
    [
      await uniqueSlug('categories', name),
      name,
      clean(req.body.emoji, 8),
      clean(req.body.description, 300),
      await nextSortOrder('categories'),
    ]
  );
  ok(res, { categories: await getCategories() });
});

router.patch('/api/categories/:id', async (req, res) => {
  const id = Number(req.params.id);
  const cur = await sql.get('SELECT * FROM categories WHERE id = ?', [id]);
  if (!cur) return res.status(404).json({ ok: false, error: 'Category not found.' });
  const name = clean(req.body.name, 60) || cur.name;
  await sql.run('UPDATE categories SET name=?, emoji=?, description=?, slug=? WHERE id=?', [
    name,
    clean(req.body.emoji, 8),
    clean(req.body.description, 300),
    name !== cur.name ? await uniqueSlug('categories', name, id) : cur.slug,
    id,
  ]);
  ok(res, { categories: await getCategories() });
});

router.post('/api/categories/:id/move', async (req, res) => {
  const id = Number(req.params.id);
  const dir = req.body.direction === 'up' ? 'up' : 'down';
  const list = await getCategories();
  const i = list.findIndex((c) => c.id === id);
  const j = dir === 'up' ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= list.length) return ok(res, { categories: list });

  await sql.batch([
    ['UPDATE categories SET sort_order = ? WHERE id = ?', [list[j].sort_order, list[i].id]],
    ['UPDATE categories SET sort_order = ? WHERE id = ?', [list[i].sort_order, list[j].id]],
  ]);
  ok(res, { categories: await getCategories() });
});

router.delete('/api/categories/:id', async (req, res) => {
  const id = Number(req.params.id);
  const row = await sql.get(
    'SELECT COUNT(*) n FROM designs WHERE category_id = ? AND deleted_at IS NULL',
    [id]
  );
  const n = row?.n ?? 0;
  // Designs are never destroyed with a category — they just become uncategorised.
  await sql.run('DELETE FROM categories WHERE id = ?', [id]);
  ok(res, {
    categories: await getCategories(),
    note: n ? `${n} design${n > 1 ? 's are' : ' is'} now uncategorised — reassign when you can.` : '',
  });
});

/* ===============================================================  PRICING */

router.post('/api/pricing', async (req, res) => {
  const service = clean(req.body.service, 80);
  if (!service) return res.status(400).json({ ok: false, error: 'Please enter a service name.' });
  await sql.run(
    'INSERT INTO pricing (service, price_text, note, is_active, sort_order) VALUES (?, ?, ?, 1, ?)',
    [service, clean(req.body.price_text, 40), clean(req.body.note, 160), await nextSortOrder('pricing')]
  );
  ok(res, { pricing: await getPricing(false) });
});

router.patch('/api/pricing/:id', async (req, res) => {
  const id = Number(req.params.id);
  const cur = await sql.get('SELECT * FROM pricing WHERE id = ?', [id]);
  if (!cur) return res.status(404).json({ ok: false, error: 'Row not found.' });
  await sql.run('UPDATE pricing SET service=?, price_text=?, note=?, is_active=? WHERE id=?', [
    clean(req.body.service, 80) || cur.service,
    clean(req.body.price_text, 40),
    clean(req.body.note, 160),
    req.body.is_active === undefined ? cur.is_active : bool(req.body.is_active),
    id,
  ]);
  ok(res, { pricing: await getPricing(false) });
});

router.delete('/api/pricing/:id', async (req, res) => {
  await sql.run('DELETE FROM pricing WHERE id = ?', [Number(req.params.id)]);
  ok(res, { pricing: await getPricing(false) });
});

/* ==========================================================  TESTIMONIALS */

router.post('/api/testimonials', upload.single('photo'), async (req, res, next) => {
  try {
    const name = clean(req.body.name, 80);
    const review = clean(req.body.review, 2000);
    if (!name || !review) {
      return res.status(400).json({ ok: false, error: 'Please enter a client name and a review.' });
    }
    let photo = '';
    if (req.file) photo = (await putImage(req.file.buffer, req.file.mimetype)).thumb;
    await sql.run(
      `INSERT INTO testimonials (name, review, event_type, photo, rating, is_visible, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        name,
        review,
        clean(req.body.event_type, 80),
        photo,
        Math.min(5, Math.max(1, Number(req.body.rating) || 5)),
        req.body.is_visible === undefined ? 1 : bool(req.body.is_visible),
        await nextSortOrder('testimonials'),
      ]
    );
    ok(res, { testimonials: await getTestimonials(false) });
  } catch (err) {
    next(err);
  }
});

router.post('/api/testimonials/:id', upload.single('photo'), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const cur = await sql.get('SELECT * FROM testimonials WHERE id = ?', [id]);
    if (!cur) return res.status(404).json({ ok: false, error: 'Review not found.' });

    let photo = cur.photo;
    let old = null;
    if (req.file) {
      photo = (await putImage(req.file.buffer, req.file.mimetype)).thumb;
      old = cur.photo;
    }
    await sql.run(
      'UPDATE testimonials SET name=?, review=?, event_type=?, photo=?, rating=?, is_visible=? WHERE id=?',
      [
        clean(req.body.name, 80) || cur.name,
        clean(req.body.review, 2000) || cur.review,
        clean(req.body.event_type, 80),
        photo,
        Math.min(5, Math.max(1, Number(req.body.rating) || cur.rating)),
        req.body.is_visible === undefined ? cur.is_visible : bool(req.body.is_visible),
        id,
      ]
    );
    if (old) await deleteImage(old);
    ok(res, { testimonials: await getTestimonials(false) });
  } catch (err) {
    next(err);
  }
});

router.post('/api/testimonials/:id/toggle', async (req, res) => {
  await sql.run('UPDATE testimonials SET is_visible = 1 - is_visible WHERE id = ?', [
    Number(req.params.id),
  ]);
  ok(res, { testimonials: await getTestimonials(false) });
});

router.delete('/api/testimonials/:id', async (req, res) => {
  const id = Number(req.params.id);
  const cur = await sql.get('SELECT * FROM testimonials WHERE id = ?', [id]);
  await sql.run('DELETE FROM testimonials WHERE id = ?', [id]);
  if (cur?.photo) await deleteImage(cur.photo);
  ok(res, { testimonials: await getTestimonials(false) });
});

/* =============================================================  INQUIRIES */

router.patch('/api/inquiries/:id', async (req, res) => {
  const status = ['new', 'read', 'booked', 'archived'].includes(req.body.status)
    ? req.body.status
    : 'read';
  await sql.run('UPDATE inquiries SET status = ? WHERE id = ?', [status, Number(req.params.id)]);
  ok(res, { inquiries: await getInquiries(), stats: await dashboardStats() });
});

router.delete('/api/inquiries/:id', async (req, res) => {
  await sql.run('DELETE FROM inquiries WHERE id = ?', [Number(req.params.id)]);
  ok(res, { inquiries: await getInquiries(), stats: await dashboardStats() });
});

/* ==============================================================  SETTINGS */

router.post('/api/settings', async (req, res) => {
  const incoming = req.body || {};
  const allowed = new Set(Object.keys(DEFAULT_SETTINGS));
  const writes = [];
  for (const [k, v] of Object.entries(incoming)) {
    if (!allowed.has(k)) continue; // never let unknown keys in
    writes.push([
      'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
      [k, String(v ?? '').slice(0, 8000)],
    ]);
  }
  if (writes.length) await sql.batch(writes);
  ok(res, { saved: writes.length, settings: await allSettings() });
});

/** Upload a photo used by a setting (hero image, about photo). */
router.post('/api/settings/image', upload.single('image'), async (req, res, next) => {
  try {
    const key = clean(req.body.key, 60);
    if (!Object.keys(DEFAULT_SETTINGS).includes(key)) {
      return res.status(400).json({ ok: false, error: 'Unknown setting.' });
    }
    if (!req.file) return res.status(400).json({ ok: false, error: 'Please choose an image.' });
    const img = await putImage(req.file.buffer, req.file.mimetype);
    // Local driver returns a bare filename; Cloudinary returns a full URL.
    // resolveUrl normalises both into something the views can use directly.
    const value = resolveUrl(img.image, 'full');
    await setSetting(key, value);
    ok(res, { key, value });
  } catch (err) {
    next(err);
  }
});

/* ==============================================================  ACCOUNT */

router.post('/api/password', async (req, res) => {
  const next = String(req.body.password || '');
  if (next.length < 8) {
    return res.status(400).json({ ok: false, error: 'Use at least 8 characters.' });
  }
  if (next !== String(req.body.confirm || '')) {
    return res.status(400).json({ ok: false, error: 'The two passwords do not match.' });
  }
  await changePassword(req.user.id, next);
  res.clearCookie(COOKIE_NAME);
  ok(res, { message: 'Password changed. Please sign in again.' });
});

export default router;
