/**
 * First-run seeding: categories, demo designs, pricing, testimonials.
 * Runs only when the tables are empty, so it never overwrites Kiran's work.
 *
 * Seeding writes images, so it is a LOCAL / CLI job. On Vercel it is skipped
 * automatically — run `npm run seed` from your own computer pointed at your
 * cloud database instead (see README).
 */
import fs from 'node:fs';
import path from 'node:path';
import { sql, ROOT, uniqueSlug } from './db.js';
import { putImage, resolveUrl } from './storage.js';
import { ensureDefaultSettings, setSetting, getSetting } from './settings.js';

const SEED_IMG_DIR = path.join(ROOT, 'assets', 'seed');

/* -------------------------------------------------------- category list */

const CATEGORIES = [
  ['Regular Mehndi', '🌿', 'Everyday designs — quick, neat and pretty.'],
  ['Shaadi Mehndi', '💍', 'For the wedding party, sisters and guests.'],
  ['Bridal Mehndi', '👰', 'Full hands, arms and feet for your big day.'],
  ['Eid Mehndi', '🌙', 'Festive designs for Eid-ul-Fitr and Eid-ul-Adha.'],
  ['Chand Raat Mehndi', '🌙', 'Late-night Chand Raat sittings for the whole family.'],
  ['Arabic Mehndi', '✨', 'Bold flowing vines with beautiful negative space.'],
  ['Floral Mehndi', '🌸', 'Roses, lotus and trailing leaves.'],
  ['Traditional Mehndi', '🪷', 'Classic mandalas, paisleys and fine jaali work.'],
  ['Minimal Mehndi', '💫', 'Delicate fine-line designs for a modern look.'],
  ['Hand Mehndi', '🖐️', 'Front, back and finger detailing.'],
  ['Feet Mehndi', '🦶', 'Anklet-style patterns and matching foot mandalas.'],
  ['Party / Event Mehndi', '🎉', 'Mayun, dholki, birthdays and corporate events.'],
  ['Custom Designs', '🎨', 'Bring a reference photo and I will draw it for you.'],
];

/* ------------------------------------------------------- demo portfolio */
/* file, title, category slug, description, price type, price, placement, featured */

const DESIGNS = [
  [
    'd-bridal-full.jpg',
    'Royal Bridal Hands & Arms',
    'bridal-mehndi',
    'A complete bridal set — mandala centres, bride-and-groom motifs, peacocks and fine jaali work running up both arms. Around 5 to 6 hours of freehand work for a stain that peaks on your wedding day.',
    'starting',
    '8000',
    'portfolio',
    1,
  ],
  [
    'd-arabic.jpg',
    'Elegant Arabic Mehndi',
    'arabic-mehndi',
    'A bold floral vine sweeping diagonally across the hand, with thick-and-thin line contrast and generous negative space. Fast to apply and beautifully photogenic.',
    'starting',
    '1500',
    'portfolio',
    1,
  ],
  [
    'd-feet.jpg',
    'Bridal Feet Mandala',
    'feet-mehndi',
    'Symmetrical mandalas on both feet with paisley and net-work trailing onto the toes and ankles — designed to sit perfectly with bridal khussas.',
    'starting',
    '3500',
    'portfolio',
    1,
  ],
  [
    'd-floral.jpg',
    'Rose Garden Floral',
    'floral-mehndi',
    'Detailed roses and a blooming lotus with trailing leafy vines from the fingers to the wrist. A soft, romantic choice for mayun and engagement functions.',
    'starting',
    '2500',
    'portfolio',
    1,
  ],
  [
    'd-traditional.jpg',
    'Classic Palm Mandala',
    'traditional-mehndi',
    'A large centred palm mandala framed by dense geometric and paisley motifs with fully stained fingertips — the traditional look, done properly.',
    'starting',
    '3000',
    'portfolio',
    1,
  ],
  [
    'd-minimal.jpg',
    'Minimal Fine-Line Mehndi',
    'minimal-mehndi',
    'A small mandala with thin trailing vines on two fingers. Understated, modern, and ready in about twenty minutes.',
    'starting',
    '800',
    'portfolio',
    1,
  ],
  [
    'd-eid.jpg',
    'Eid Crescent & Stars',
    'eid-mehndi',
    'Crescent moons, stars and small florals with medium coverage — the festive favourite every Eid. Group bookings welcome.',
    'starting',
    '1000',
    'portfolio',
    0,
  ],
  [
    'd-chand-raat.jpg',
    'Chand Raat Special',
    'chand-raat-mehndi',
    'Quick, pretty designs for the whole family on Chand Raat night. Book early — these slots fill first.',
    'starting',
    '1500',
    'portfolio',
    0,
  ],
  [
    'd-party.jpg',
    'Party Glam with Gold',
    'party-event-mehndi',
    'A contemporary geometric mandala with fine dotted shading and an optional glitter-gold accent for evening events.',
    'starting',
    '2000',
    'portfolio',
    0,
  ],
  [
    'd-shaadi.jpg',
    'Shaadi Guest Special',
    'shaadi-mehndi',
    'Half-coverage floral and paisley work from fingertips to mid-forearm — the perfect amount of mehndi for the bride\u2019s family and friends.',
    'starting',
    '5000',
    'portfolio',
    0,
  ],
  [
    'd-regular.jpg',
    'Everyday Simple Mehndi',
    'regular-mehndi',
    'A neat little flower motif with delicate finger vines. Walk-in friendly and budget-friendly.',
    'starting',
    '1000',
    'gallery',
    0,
  ],
];

/* ------------------------------------------------------- gallery archive */
/*
 * Detail crops taken from the portfolio photographs so the Gallery page has
 * real content out of the box. Kiran replaces these with her own archive.
 * [source file, region, title, category, caption, date]
 * region: scale = fraction of the shorter side, x/y = 0..1 position.
 */
const GALLERY = [
  ['d-bridal-full.jpg', { scale: 0.5, x: 0.62, y: 0.55 }, 'Fine Jaali Net Work', 'bridal-mehndi',
    'Ultra-fine crosshatch lattice with floral fillers — the detail that makes a bridal set.', '2025-11'],
  ['d-traditional.jpg', { scale: 0.55, x: 0.5, y: 0.45 }, 'Palm Mandala Close-Up', 'traditional-mehndi',
    'Concentric rings of petals, dots and geometry filling the whole palm.', '2025-10'],
  ['d-arabic.jpg', { scale: 0.5, x: 0.35, y: 0.3 }, 'Arabic Vine Detail', 'arabic-mehndi',
    'Thick-and-thin line contrast is what gives Arabic work its movement.', '2025-09'],
  ['d-feet.jpg', { scale: 0.52, x: 0.45, y: 0.6 }, 'Anklet Pattern Study', 'feet-mehndi',
    'Scalloped anklet border with trailing paisleys onto the toes.', '2025-08'],
  ['d-floral.jpg', { scale: 0.5, x: 0.55, y: 0.4 }, 'Rose Motif Study', 'floral-mehndi',
    'A single rose worked up in layers — my favourite filler for soft bridal sets.', '2025-07'],
  ['d-minimal.jpg', { scale: 0.55, x: 0.5, y: 0.35 }, 'Fine-Line Finger Detail', 'minimal-mehndi',
    'Twenty minutes, barely any henna, and still the prettiest hand at the table.', '2025-06'],
  ['d-eid.jpg', { scale: 0.5, x: 0.4, y: 0.5 }, 'Crescent & Star Motif', 'eid-mehndi',
    'The Eid classic — a crescent tucked into a floral spray.', '2025-04'],
  ['d-party.jpg', { scale: 0.52, x: 0.55, y: 0.45 }, 'Geometric Party Detail', 'party-event-mehndi',
    'Dotted shading and clean geometry for an evening event.', '2025-03'],
];

/* --------------------------------------------------------------- prices */

const PRICING = [
  ['Regular Mehndi', 'Rs. 1,000', 'Per hand, simple design'],
  ['Arabic Mehndi', 'Rs. 1,500', 'Per hand'],
  ['Eid Mehndi', 'Rs. 1,000', 'Per hand · group discounts available'],
  ['Chand Raat Mehndi', 'Rs. 1,500', 'Per hand · advance booking recommended'],
  ['Party / Event Mehndi', 'Rs. 2,000', 'Per person'],
  ['Shaadi Mehndi', 'Rs. 5,000+', 'Hands, half arms'],
  ['Bridal Mehndi', 'Rs. 8,000+', 'Full hands, arms & feet'],
  ['Feet Mehndi', 'Rs. 3,500+', 'Both feet'],
  ['Home Visit (Qasimabad)', 'Rs. 500', 'Travel charge · varies by area'],
];

/* --------------------------------------------------------- testimonials */

const TESTIMONIALS = [
  [
    'Ayesha Siddiqui',
    'Kiran did my bridal mehndi and honestly it was the best decision of my whole shaadi planning. The colour came out so dark by the morning and every single guest asked me who my artist was. She sat with me for six hours and never rushed once.',
    'Bridal Mehndi',
    5,
  ],
  [
    'Hina Memon',
    'We booked her for Chand Raat for seven girls in our family and she managed all of us so patiently. Designs were beautiful and nothing felt repeated. Will definitely call her again next Eid inshaAllah.',
    'Chand Raat Mehndi',
    5,
  ],
  [
    'Sana Abbasi',
    'I wanted something very simple and modern for my friend\u2019s dholki and she understood exactly what I meant from one photo. Clean lines, no mess, and she came to our home in Latifabad on time.',
    'Party Mehndi',
    5,
  ],
  [
    'Mariam Shaikh',
    'Natural henna, no chemicals, and the stain lasted almost two weeks. As someone with sensitive skin this mattered a lot to me. Highly recommend Colors with Kiran to anyone in Hyderabad.',
    'Eid Mehndi',
    5,
  ],
];
/* ----------------------------------------------------------------- main */

async function seedImage(filename) {
  const src = path.join(SEED_IMG_DIR, filename);
  if (!fs.existsSync(src)) return null;
  try {
    return await putImage(fs.readFileSync(src), 'image/jpeg');
  } catch (err) {
    console.warn(`  ! could not process ${filename}: ${err.message}`);
    return null;
  }
}

/** Crop a square detail out of a seed photo, then run the normal pipeline. */
async function seedCrop(filename, region) {
  const src = path.join(SEED_IMG_DIR, filename);
  if (!fs.existsSync(src)) return null;
  try {
    const { default: sharp } = await import('sharp');
    const buf = fs.readFileSync(src);
    const meta = await sharp(buf).metadata();
    const size = Math.round(Math.min(meta.width, meta.height) * region.scale);
    const left = Math.round((meta.width - size) * region.x);
    const top = Math.round((meta.height - size) * region.y);
    const cropped = await sharp(buf)
      .extract({ left, top, width: size, height: size })
      .resize({ width: 1200, height: 1200, fit: 'inside', withoutEnlargement: false })
      .sharpen({ sigma: 0.7 })
      .toBuffer();
    return await putImage(cropped, 'image/jpeg');
  } catch (err) {
    console.warn(`  ! could not crop ${filename}: ${err.message}`);
    return null;
  }
}

const countOf = async (table) =>
  (await sql.get(`SELECT COUNT(*) n FROM ${table}`))?.n ?? 0;

export async function seedIfEmpty() {
  await ensureDefaultSettings();

  /* categories ------------------------------------------------------- */
  if ((await countOf('categories')) === 0) {
    const rows = [];
    for (let i = 0; i < CATEGORIES.length; i++) {
      const [name, emoji, description] = CATEGORIES[i];
      rows.push([
        'INSERT INTO categories (slug, name, emoji, description, sort_order) VALUES (?, ?, ?, ?, ?)',
        [await uniqueSlug('categories', name), name, emoji, description, (i + 1) * 10],
      ]);
    }
    await sql.batch(rows);
    console.log(`  ✓ seeded ${CATEGORIES.length} categories`);
  }

  /* designs ---------------------------------------------------------- */
  if ((await countOf('designs')) === 0) {
    const catId = async (slug) =>
      (await sql.get('SELECT id FROM categories WHERE slug = ?', [slug]))?.id ?? null;

    let n = 0;
    for (let i = 0; i < DESIGNS.length; i++) {
      const [file, title, cat, desc, ptype, pval, placement, featured] = DESIGNS[i];
      const img = await seedImage(file);
      if (!img) continue; // image not generated — skip this demo row
      await sql.run(
        `INSERT INTO designs
          (title, slug, category_id, description, price_type, price_value,
           placement, is_featured, image, thumb, width, height, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          title,
          await uniqueSlug('designs', title),
          await catId(cat),
          desc,
          ptype,
          pval,
          placement,
          featured,
          img.image,
          img.thumb,
          img.width,
          img.height,
          (i + 1) * 10,
        ]
      );
      n++;
    }

    /* gallery archive — detail crops of the same photographs */
    let g = 0;
    for (let i = 0; i < GALLERY.length; i++) {
      const [file, region, title, cat, caption, date] = GALLERY[i];
      const img = await seedCrop(file, region);
      if (!img) continue;
      await sql.run(
        `INSERT INTO designs
          (title, slug, category_id, description, caption, taken_on, price_type,
           placement, image, thumb, width, height, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, 'request', 'gallery', ?, ?, ?, ?, ?)`,
        [
          title,
          await uniqueSlug('designs', title),
          await catId(cat),
          caption,
          caption,
          date,
          img.image,
          img.thumb,
          img.width,
          img.height,
          1000 + i * 10,
        ]
      );
      g++;
    }
    console.log(`  ✓ seeded ${n} portfolio designs + ${g} gallery images`);
  }

  /* hero + about photos ---------------------------------------------- */
  if (!(await getSetting('home.hero_image'))) {
    const hero = await seedImage('hero-bridal.jpg');
    if (hero) await setSetting('home.hero_image', resolveUrl(hero.image, 'full'));
  }
  if (!(await getSetting('about.photo'))) {
    const me = await seedImage('artist-kiran.jpg');
    if (me) await setSetting('about.photo', resolveUrl(me.image, 'full'));
  }

  /* pricing ----------------------------------------------------------- */
  if ((await countOf('pricing')) === 0) {
    await sql.batch(
      PRICING.map(([s, p, note], i) => [
        'INSERT INTO pricing (service, price_text, note, sort_order) VALUES (?, ?, ?, ?)',
        [s, p, note, (i + 1) * 10],
      ])
    );
    console.log(`  ✓ seeded ${PRICING.length} price rows`);
  }

  /* testimonials ------------------------------------------------------ */
  if ((await countOf('testimonials')) === 0) {
    await sql.batch(
      TESTIMONIALS.map(([name, review, type, rating], i) => [
        'INSERT INTO testimonials (name, review, event_type, rating, sort_order) VALUES (?, ?, ?, ?, ?)',
        [name, review, type, rating, (i + 1) * 10],
      ])
    );
    console.log(`  ✓ seeded ${TESTIMONIALS.length} testimonials`);
  }
}
