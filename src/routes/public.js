/**
 * Public website routes — server-rendered for SEO and fast first paint.
 *
 * Handlers are async now. Express 5 forwards a rejected promise to the error
 * handler automatically, so no extra try/catch wrapper is needed.
 */
import express from 'express';
import rateLimit from 'express-rate-limit';
import { sql } from '../db.js';
import { allSettings, waLink, asList } from '../settings.js';
import {
  getCategories,
  getCategoryBySlug,
  getDesigns,
  getDesignBySlug,
  getPricing,
  getTestimonials,
} from '../models.js';

const router = express.Router();

/* Shared view data for every public page. */
router.use(async (req, res, next) => {
  try {
    const s = await allSettings();
    res.locals.s = s;
    res.locals.settings = s;
    res.locals.categories = await getCategories();
    res.locals.wa = (extra) => waLink(s, extra);
    res.locals.asList = asList;
    res.locals.currentPath = req.path;
    res.locals.bannerOn = s['banner.enabled'] === '1' && !!s['banner.text'];
    res.locals.canonicalBase =
      process.env.SITE_URL || `${req.protocol}://${req.get('host')}`;
    res.locals.message = null;
    next();
  } catch (err) {
    next(err);
  }
});

/* ------------------------------------------------------------------ home */
router.get('/', async (req, res) => {
  const featured = await getDesigns({ featuredOnly: true, placement: 'portfolio', limit: 6 });
  const fallback = featured.length
    ? featured
    : await getDesigns({ placement: 'portfolio', limit: 6 });

  const popular = res.locals.categories.filter((c) => c.design_count > 0).slice(0, 8);
  const popularCategories = await Promise.all(
    popular.map(async (c) => ({
      ...c,
      cover: (await getDesigns({ categorySlug: c.slug, limit: 1 }))[0] || null,
    }))
  );

  const testimonials = await getTestimonials();
  const pricing = await getPricing();

  res.render('home', {
    title: `${res.locals.s['site.name']} — Mehndi Artist in Qasimabad, Hyderabad`,
    metaDescription: res.locals.s['site.description'],
    featured: fallback,
    popularCategories,
    testimonials: testimonials.slice(0, 6),
    pricing: pricing.slice(0, 5),
    page: 'home',
  });
});

/* ------------------------------------------------------------- portfolio */
router.get('/portfolio', async (req, res) => {
  const active = String(req.query.category || 'all');
  const designs = await getDesigns({ placement: 'portfolio' });
  const cat = active !== 'all' ? await getCategoryBySlug(active) : null;

  res.render('portfolio', {
    title: cat
      ? `${cat.name} Designs — ${res.locals.s['site.name']}, Hyderabad`
      : `Mehndi Portfolio — ${res.locals.s['site.name']}, Qasimabad Hyderabad`,
    metaDescription: cat
      ? `${cat.name} mehndi designs by Kiran in Qasimabad, Hyderabad. ${cat.description} View photos and starting prices, then book on WhatsApp.`
      : 'Browse the full mehndi portfolio — bridal, shaadi, Arabic, floral, Eid and minimal henna designs with starting prices. Qasimabad, Hyderabad.',
    designs,
    active,
    page: 'portfolio',
  });
});

/* ------------------------------------------------------------ categories */
router.get('/categories', async (req, res) => {
  const cats = await Promise.all(
    res.locals.categories.map(async (c) => ({
      ...c,
      cover: (await getDesigns({ categorySlug: c.slug, limit: 1 }))[0] || null,
    }))
  );
  res.render('categories', {
    title: `Mehndi Design Categories — ${res.locals.s['site.name']}`,
    metaDescription:
      'Bridal, Shaadi, Eid, Chand Raat, Arabic, floral, traditional and minimal mehndi categories by Kiran — mehndi artist in Qasimabad, Hyderabad.',
    cats,
    page: 'categories',
  });
});

/* --------------------------------------------------------------- gallery */
router.get('/gallery', async (req, res) => {
  const designs = await getDesigns({ placement: 'gallery' });
  res.render('gallery', {
    title: `Mehndi Gallery — Past Work by ${res.locals.s['site.name']}`,
    metaDescription:
      'An archive of past mehndi and henna work by Kiran in Hyderabad — bridal, festive and everyday designs from previous seasons.',
    designs,
    page: 'gallery',
  });
});

/* --------------------------------------------------------------- pricing */
router.get('/pricing', async (req, res) => {
  res.render('pricing', {
    title: `Mehndi Prices in Hyderabad — ${res.locals.s['site.name']}`,
    metaDescription:
      'Starting mehndi prices in Qasimabad, Hyderabad — regular from Rs. 1,000, Arabic from Rs. 1,500, bridal from Rs. 8,000. Final quote on WhatsApp.',
    pricing: await getPricing(),
    page: 'pricing',
  });
});

/* ----------------------------------------------------------------- about */
router.get('/about', async (req, res) => {
  res.render('about', {
    title: `Meet Kiran — Mehndi Artist in Qasimabad, Hyderabad`,
    metaDescription:
      'Meet Kiran, a professional mehndi and henna artist based in Qasimabad, Hyderabad with 8+ years of bridal and festive experience using natural chemical-free henna.',
    page: 'about',
  });
});

/* --------------------------------------------------------------- design */
router.get('/design/:slug', async (req, res, next) => {
  const design = await getDesignBySlug(req.params.slug);
  if (!design) return next();

  const relatedAll = await getDesigns({ categorySlug: design.category_slug, limit: 4 });
  const related = relatedAll.filter((d) => d.id !== design.id);

  res.render('design', {
    title: `${design.title} — ${design.category_name || 'Mehndi'} in Hyderabad`,
    metaDescription:
      (design.description || '').slice(0, 155) ||
      `${design.title} mehndi design by Kiran, Qasimabad Hyderabad.`,
    design,
    related,
    page: 'portfolio',
  });
});

/* --------------------------------------------------------------- contact */
router.get('/contact', async (req, res) => {
  res.render('contact', {
    title: `Book a Mehndi Appointment — ${res.locals.s['site.name']}, Hyderabad`,
    metaDescription:
      'Book your mehndi appointment with Kiran in Qasimabad, Hyderabad. WhatsApp, call, or send the booking form for bridal, Eid, Chand Raat and party mehndi.',
    prefill: {
      category: req.query.design || req.query.category || '',
    },
    sent: false,
    page: 'contact',
  });
});

/* Basic flood protection on the public form. */
const inquiryLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: 'Too many requests. Please try again shortly, or use WhatsApp.' },
});

router.post('/contact', inquiryLimiter, async (req, res) => {
  const b = req.body || {};
  const clean = (v, max = 400) => String(v || '').trim().slice(0, max);

  // Honeypot — bots fill hidden fields, humans do not.
  if (clean(b.website)) return res.redirect('/contact?sent=1');

  const name = clean(b.name, 120);
  const phone = clean(b.phone, 40);

  if (!name || !phone) {
    return res.status(400).render('contact', {
      title: 'Book a Mehndi Appointment',
      metaDescription: res.locals.s['site.description'],
      prefill: b,
      sent: false,
      error: 'Please enter at least your name and phone number.',
      page: 'contact',
    });
  }

  await sql.run(
    `INSERT INTO inquiries
      (name, phone, whatsapp, event_type, preferred_date, preferred_time,
       location, category, people_count, message)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      name,
      phone,
      clean(b.whatsapp, 40),
      clean(b.event_type, 80),
      clean(b.preferred_date, 40),
      clean(b.preferred_time, 40),
      clean(b.location, 200),
      clean(b.category, 120),
      clean(b.people_count, 20),
      clean(b.message, 2000),
    ]
  );

  const summary = [
    `Name: ${name}`,
    b.event_type ? `Event: ${clean(b.event_type, 80)}` : '',
    b.preferred_date ? `Date: ${clean(b.preferred_date, 40)}` : '',
    b.category ? `Design: ${clean(b.category, 120)}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  res.render('contact', {
    title: 'Booking request received — Colors with Kiran',
    metaDescription: res.locals.s['site.description'],
    prefill: {},
    sent: true,
    clientName: name,
    waFollowUp: waLink(res.locals.s, summary),
    page: 'contact',
  });
});

/* ------------------------------------------------------------------ SEO */
router.get('/robots.txt', (req, res) => {
  const base = res.locals.canonicalBase;
  res.type('text/plain').send(
    `User-agent: *\nAllow: /\nDisallow: /admin\n\nSitemap: ${base}/sitemap.xml\n`
  );
});

router.get('/sitemap.xml', async (req, res) => {
  const base = res.locals.canonicalBase;
  const urls = [
    ['/', '1.0', 'weekly'],
    ['/portfolio', '0.9', 'weekly'],
    ['/categories', '0.7', 'monthly'],
    ['/gallery', '0.7', 'weekly'],
    ['/pricing', '0.8', 'monthly'],
    ['/about', '0.6', 'monthly'],
    ['/contact', '0.9', 'monthly'],
  ];
  for (const c of await getCategories()) {
    if (c.design_count > 0) urls.push([`/portfolio?category=${c.slug}`, '0.6', 'monthly']);
  }
  for (const d of await getDesigns({ placement: 'all' })) {
    urls.push([`/design/${d.slug}`, '0.5', 'monthly']);
  }

  const esc = (u) => u.replace(/&/g, '&amp;');
  res.type('application/xml').send(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
      urls
        .map(
          ([loc, pri, freq]) =>
            `  <url><loc>${esc(base + loc)}</loc><changefreq>${freq}</changefreq><priority>${pri}</priority></url>`
        )
        .join('\n') +
      `\n</urlset>\n`
  );
});

export default router;
