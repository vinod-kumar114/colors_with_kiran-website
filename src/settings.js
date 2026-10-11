/**
 * Settings: a simple key/value store so every piece of site text,
 * contact detail and toggle is editable from the admin dashboard.
 *
 * Values are plain strings. Booleans are stored as '1' / '0'.
 * Lists (specialties, services) are stored as newline-separated text,
 * which is the easiest thing for a non-technical user to edit.
 *
 * Now async (libSQL speaks HTTP). The defaults and every key name are
 * unchanged, so the dashboard and all views behave identically.
 */
import { sql } from './db.js';

export const DEFAULT_SETTINGS = {
  /* ---------------------------------------------------------- identity */
  'site.name': 'Colors with Kiran',
  'site.tagline': 'Where Every Design Tells a Story',
  'site.description':
    'Professional Mehndi & Henna artist in Qasimabad, Hyderabad. Bridal, Shaadi, Eid, Chand Raat, Arabic and party mehndi designs — booked directly on WhatsApp.',

  /* ----------------------------------------------------------- contact */
  'contact.phone': '+92 300 0000000',
  'contact.whatsapp': '+92 300 0000000',
  'contact.email': 'hello@colorswithkiran.com',
  'contact.instagram': 'https://instagram.com/colorswithkiran',
  'contact.facebook': 'https://facebook.com/colorswithkiran',
  'contact.area': 'Qasimabad',
  'contact.city': 'Hyderabad',
  'contact.region': 'Sindh',
  'contact.country': 'Pakistan',
  'contact.address': 'Qasimabad, Hyderabad, Sindh, Pakistan',
  'contact.service_area':
    'Qasimabad, Latifabad, Hyderabad City, Hussainabad, Kohsar and surrounding areas',
  'contact.hours': 'Mon – Sun, 10:00 AM – 9:00 PM (by appointment)',
  'contact.maps_url': '',
  'contact.whatsapp_message':
    'Assalam-o-Alaikum Kiran, I found Colors with Kiran online and would like to book a Mehndi appointment. Please share your availability and pricing.',

  /* ------------------------------------------------------------ banner */
  'banner.enabled': '1',
  'banner.text': 'Bridal & Shaadi bookings are now open — limited weekend slots available!',
  'banner.link': '/contact',

  /* -------------------------------------------------------------- home */
  'home.hero_title': 'Where Every Design<br>Tells a Story',
  'home.hero_kicker': 'Mehndi Artist · Qasimabad, Hyderabad',
  'home.hero_text':
    'Hand-drawn bridal, festive and everyday mehndi — crafted with natural henna, steady hands and a deep love for detail.',
  'home.hero_image': '',
  'home.intro_title': 'Henna, done beautifully',
  'home.intro_text':
    'Colors with Kiran is a home-based mehndi studio in Qasimabad, Hyderabad. From a quick Eid design to a full bridal set that takes all evening, every pattern is drawn freehand — no stencils, no shortcuts. I use fresh, natural, chemical-free henna for a deep, rich stain that your photographs will love.',

  /* ------------------------------------------------------------- about */
  'about.heading': 'Meet Kiran',
  'about.subheading': 'Turning Henna Into Art, One Hand at a Time.',
  'about.name': 'Kiran',
  'about.photo': '',
  'about.experience': '8+ years',
  'about.location': 'Qasimabad, Hyderabad, Sindh',
  'about.story':
    "I picked up my first henna cone at a cousin's wedding when I was thirteen, and I honestly have not put it down since. What started as drawing on friends' hands every Chand Raat slowly turned into something people began paying me for — and then into Colors with Kiran.\n\nToday I work out of my home studio in Qasimabad, Hyderabad, where I take bridal appointments, festive bookings and small mehndi parties. Every design I draw is freehand and made for the person in front of me. A shy bride gets something soft and romantic; a bold one gets heavy jaali work and a mandala she will not stop looking at.\n\nI only use fresh, natural, chemical-free henna that I prepare myself, because a beautiful design is worth nothing if the stain lets you down on the day that matters.",
  'about.specialties':
    'Bridal mehndi (full hands, arms & feet)\nIntricate jaali and mandala work\nModern Arabic & floral styles\nMinimal, fine-line everyday designs\nLarge Eid & Chand Raat bookings\nOn-location mehndi for events',
  'about.services':
    'Bridal & Shaadi mehndi appointments\nEid and Chand Raat sittings\nParty, mayun and dholki bookings\nGroup & family bookings at your home\nCustom designs from your reference photo\nStudio appointments in Qasimabad',

  /* ----------------------------------------------------------- pricing */
  'pricing.note':
    'Prices are starting prices and may vary depending on design, complexity, and event requirements.',
  'pricing.intro':
    'Transparent starting rates so you know roughly what to expect. Send me a photo of the style you like on WhatsApp and I will confirm an exact quote.',

  /* --------------------------------------------------------------- seo */
  'seo.keywords':
    'mehndi artist in Hyderabad, mehndi artist in Qasimabad, bridal mehndi Hyderabad, bridal mehndi artist Qasimabad, mehndi designer Hyderabad, Eid mehndi Hyderabad, Chand Raat mehndi Hyderabad, wedding mehndi artist Hyderabad, henna artist Sindh',
};

export async function getSetting(key, fallback = '') {
  const row = await sql.get('SELECT value FROM settings WHERE key = ?', [key]);
  if (row && row.value !== null && row.value !== undefined) return row.value;
  return DEFAULT_SETTINGS[key] ?? fallback;
}

export async function setSetting(key, value) {
  await sql.run(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    [key, value === null || value === undefined ? '' : String(value)]
  );
}

/** Everything, defaults merged with stored overrides. */
export async function allSettings() {
  const out = { ...DEFAULT_SETTINGS };
  for (const row of await sql.all('SELECT key, value FROM settings')) {
    out[row.key] = row.value;
  }
  return out;
}

export async function ensureDefaultSettings() {
  const existing = new Set(
    (await sql.all('SELECT key FROM settings')).map((r) => r.key)
  );
  const missing = Object.entries(DEFAULT_SETTINGS).filter(([k]) => !existing.has(k));
  if (!missing.length) return 0;
  await sql.batch(
    missing.map(([key, value]) => [
      'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO NOTHING',
      [key, value],
    ])
  );
  return missing.length;
}

/* --------------------------------------------------------- derived bits */

/** Digits-only phone number suitable for a wa.me link. */
export function waNumber(raw) {
  let digits = String(raw || '').replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.startsWith('0')) digits = '92' + digits.slice(1); // local PK format
  return digits;
}

/** Build a https://wa.me/... link with a pre-filled message. */
export function waLink(settings, extra = '') {
  const num = waNumber(settings['contact.whatsapp'] || settings['contact.phone']);
  const base = settings['contact.whatsapp_message'] || '';
  const text = extra ? `${base}\n\n${extra}` : base;
  return `https://wa.me/${num}?text=${encodeURIComponent(text)}`;
}

/** Split a newline-separated setting into a clean array. */
export function asList(value) {
  return String(value || '')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
}
