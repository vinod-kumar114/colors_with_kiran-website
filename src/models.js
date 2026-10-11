/**
 * Shared query helpers + presentation logic used by both the public site
 * and the admin dashboard.
 *
 * Async now (libSQL speaks HTTP). The SQL and the shape of every returned
 * object are unchanged, so the EJS views did not need a single edit.
 */
import { sql } from './db.js';
import { resolveUrl } from './storage.js';

/* ------------------------------------------------------------- pricing */

export function formatRupees(value) {
  const n = Number(String(value ?? '').replace(/[^\d.]/g, ''));
  if (!Number.isFinite(n) || n <= 0) return '';
  return 'Rs. ' + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** Human label for a design's price, e.g. "From Rs. 1,500". */
export function priceLabel(design) {
  if (!design) return '';
  if (design.price_type === 'request') return 'Price on Request';
  const money = formatRupees(design.price_value);
  if (!money) return 'Price on Request';
  return design.price_type === 'starting' ? `From ${money}` : money;
}

/* ---------------------------------------------------------- categories */

export async function getCategories() {
  return sql.all(
    `SELECT c.*,
            (SELECT COUNT(*) FROM designs d
              WHERE d.category_id = c.id AND d.deleted_at IS NULL) AS design_count
       FROM categories c
      ORDER BY c.sort_order ASC, c.name ASC`
  );
}

export async function getCategoryBySlug(slug) {
  return sql.get('SELECT * FROM categories WHERE slug = ?', [slug]);
}

/* ------------------------------------------------------------- designs */

const DESIGN_SELECT = `
  SELECT d.*, c.name AS category_name, c.slug AS category_slug, c.emoji AS category_emoji
    FROM designs d
    LEFT JOIN categories c ON c.id = d.category_id`;

/**
 * @param {object} opts
 * @param {'portfolio'|'gallery'|'all'} [opts.placement]
 * @param {boolean} [opts.featuredOnly]
 * @param {string}  [opts.categorySlug]
 * @param {boolean} [opts.trashed]  when true return ONLY soft-deleted rows
 * @param {number}  [opts.limit]
 */
export async function getDesigns(opts = {}) {
  const {
    placement = 'all',
    featuredOnly = false,
    categorySlug = null,
    trashed = false,
    limit = null,
  } = opts;

  const where = [trashed ? 'd.deleted_at IS NOT NULL' : 'd.deleted_at IS NULL'];
  const params = [];

  if (placement !== 'all') {
    where.push('d.placement = ?');
    params.push(placement);
  }
  if (featuredOnly) where.push('d.is_featured = 1');
  if (categorySlug) {
    where.push('c.slug = ?');
    params.push(categorySlug);
  }

  let query = `${DESIGN_SELECT} WHERE ${where.join(' AND ')}
             ORDER BY d.is_featured DESC, d.sort_order ASC, d.created_at DESC`;
  if (limit) query += ` LIMIT ${Number(limit)}`;

  const rows = await sql.all(query, params);
  return rows.map(decorate);
}

export async function getDesignBySlug(slug) {
  const row = await sql.get(
    `${DESIGN_SELECT} WHERE d.slug = ? AND d.deleted_at IS NULL`,
    [slug]
  );
  return row ? decorate(row) : null;
}

export async function getDesignById(id) {
  const row = await sql.get(`${DESIGN_SELECT} WHERE d.id = ?`, [id]);
  return row ? decorate(row) : null;
}

function decorate(d) {
  d.price_label = priceLabel(d);
  // resolveUrl handles both storage styles: a bare filename saved by the local
  // driver, or a full https:// URL saved by Cloudinary. Mixed rows are fine,
  // so nothing breaks when you migrate an existing database to the cloud.
  d.thumb_url = resolveUrl(d.thumb, 'thumb');
  d.image_url = resolveUrl(d.image, 'full');
  d.url = `/design/${d.slug}`;
  // Aspect ratio lets the grid reserve space before the image loads
  // (no layout shift, better Core Web Vitals).
  d.ratio = d.width && d.height ? d.width / d.height : 1;
  return d;
}

/* -------------------------------------------------------------- others */

export async function getPricing(activeOnly = true) {
  const query = activeOnly
    ? 'SELECT * FROM pricing WHERE is_active = 1 ORDER BY sort_order ASC, id ASC'
    : 'SELECT * FROM pricing ORDER BY sort_order ASC, id ASC';
  return sql.all(query);
}

export async function getTestimonials(visibleOnly = true) {
  const query = visibleOnly
    ? 'SELECT * FROM testimonials WHERE is_visible = 1 ORDER BY sort_order ASC, id ASC'
    : 'SELECT * FROM testimonials ORDER BY sort_order ASC, id ASC';
  const rows = await sql.all(query);
  // Testimonial photos go through the same resolver as design photos.
  return rows.map((t) => ({ ...t, photo_url: resolveUrl(t.photo, 'thumb') }));
}

export async function getInquiries(status = null) {
  return status
    ? sql.all('SELECT * FROM inquiries WHERE status = ? ORDER BY created_at DESC', [status])
    : sql.all('SELECT * FROM inquiries ORDER BY created_at DESC');
}

export async function dashboardStats() {
  const row = await sql.get(`
    SELECT
      (SELECT COUNT(*) FROM designs WHERE deleted_at IS NULL)                               AS designs,
      (SELECT COUNT(*) FROM designs WHERE deleted_at IS NULL AND placement='portfolio')     AS portfolio,
      (SELECT COUNT(*) FROM designs WHERE deleted_at IS NULL AND is_featured = 1)           AS featured,
      (SELECT COUNT(*) FROM designs WHERE deleted_at IS NULL AND placement='gallery')       AS gallery,
      (SELECT COUNT(*) FROM categories)                                                     AS categories,
      (SELECT COUNT(*) FROM testimonials)                                                   AS testimonials,
      (SELECT COUNT(*) FROM inquiries)                                                      AS inquiries,
      (SELECT COUNT(*) FROM inquiries WHERE status='new')                                   AS newInquiries,
      (SELECT COUNT(*) FROM designs WHERE deleted_at IS NOT NULL)                           AS trashed
  `);
  return row || {
    designs: 0, portfolio: 0, featured: 0, gallery: 0, categories: 0,
    testimonials: 0, inquiries: 0, newInquiries: 0, trashed: 0,
  };
}
