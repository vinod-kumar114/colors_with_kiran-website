/**
 * Image storage — one interface, two drivers.
 *
 *   local       sharp → public/uploads/{full,thumb}/<id>.webp     (your computer)
 *   cloudinary  upload the buffer → Cloudinary, thumbnails made   (Vercel)
 *               on the fly by Cloudinary's URL transformations
 *
 * The driver is chosen automatically: if Cloudinary credentials are present we
 * use Cloudinary, otherwise we fall back to local disk. That means the project
 * still runs on your own computer with no cloud accounts at all.
 *
 * WHAT GETS STORED IN THE DATABASE
 *   local       a bare filename        "a1b2c3.webp"
 *   cloudinary  a full https:// URL    "https://res.cloudinary.com/..."
 *
 * `resolveUrl()` below handles both, so photos uploaded before the migration
 * keep working exactly as they did. No image link ever breaks.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import multer from 'multer';
import { FULL_DIR, THUMB_DIR, IS_SERVERLESS, ensureLocalDirs } from './db.js';

/* ----------------------------------------------------------- driver pick */

const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || '';
const API_KEY = process.env.CLOUDINARY_API_KEY || '';
const API_SECRET = process.env.CLOUDINARY_API_SECRET || '';
const FOLDER = process.env.CLOUDINARY_FOLDER || 'colors-with-kiran';

export const HAS_CLOUDINARY = !!(CLOUD_NAME && API_KEY && API_SECRET);

export const STORAGE_DRIVER =
  (process.env.STORAGE_DRIVER || (HAS_CLOUDINARY ? 'cloudinary' : 'local')).toLowerCase();

/* ------------------------------------------------------------- limits */
/*
 * Vercel caps a serverless request body at 4.5 MB. Anything larger never even
 * reaches our code, so we reject it early with a message the user understands
 * rather than letting the platform return an opaque 413.
 */
export const MAX_UPLOAD_BYTES = Number(process.env.MAX_UPLOAD_MB || (IS_SERVERLESS ? 4 : 12)) * 1024 * 1024;

const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/heic',
  'image/heif',
]);

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
  fileFilter(_req, file, cb) {
    if (!ALLOWED_MIME.has(file.mimetype)) {
      return cb(new Error('Please upload a JPG, PNG, WebP or HEIC image.'));
    }
    cb(null, true);
  },
});

/* --------------------------------------------------- magic-byte checking */
/*
 * The mime type in an upload is just a claim by the browser. sharp used to be
 * our second line of defence; when Cloudinary does the resizing we still want
 * to reject a .txt renamed to .jpg before spending a network round-trip.
 */
function sniff(buf) {
  if (!buf || buf.length < 12) return null;
  const b = buf;
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpeg';
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'png';
  const ascii = b.slice(0, 12).toString('latin1');
  if (ascii.startsWith('RIFF') && ascii.slice(8, 12) === 'WEBP') return 'webp';
  const brand = b.slice(4, 8).toString('latin1');
  if (brand === 'ftyp') {
    const sub = b.slice(8, 12).toString('latin1');
    if (sub.startsWith('avif') || sub.startsWith('avis')) return 'avif';
    if (sub.startsWith('heic') || sub.startsWith('heix') || sub.startsWith('hevc') ||
        sub.startsWith('mif1') || sub.startsWith('msf1')) return 'heic';
  }
  return null;
}

function assertImage(buffer) {
  if (!buffer || !buffer.length) throw new Error('That file was empty.');
  if (!sniff(buffer)) {
    throw new Error('Please upload a JPG, PNG, WebP or HEIC image.');
  }
}

/* ---------------------------------------------------------------- local */

async function putLocal(buffer) {
  ensureLocalDirs();
  const { default: sharp } = await import('sharp');

  const base = sharp(buffer, { failOn: 'error' }).rotate(); // respect EXIF
  const meta = await base.metadata();
  if (!meta.width || !meta.height) {
    throw new Error('That file does not look like a valid image.');
  }

  const name = `${crypto.randomBytes(10).toString('hex')}.webp`;

  const fullInfo = await base
    .clone()
    .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 82 })
    .toFile(path.join(FULL_DIR, name));

  await base
    .clone()
    .resize({ width: 700, height: 700, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 76 })
    .toFile(path.join(THUMB_DIR, name));

  return { image: name, thumb: name, width: fullInfo.width, height: fullInfo.height };
}

function deleteLocal(filename) {
  if (!filename) return;
  const safe = path.basename(filename);
  for (const dir of [FULL_DIR, THUMB_DIR]) {
    try {
      const p = path.join(dir, safe);
      if (fs.existsSync(p)) fs.unlinkSync(p);
    } catch {
      /* a missing file must never break the dashboard */
    }
  }
}

/* ----------------------------------------------------------- cloudinary */

const CLD_BASE = `https://res.cloudinary.com/${CLOUD_NAME}/image/upload`;

/** Build a delivery URL with on-the-fly resizing. */
function cldUrl(publicId, version, transform) {
  const v = version ? `v${version}/` : '';
  return `${CLD_BASE}/${transform}/${v}${publicId}.webp`;
}

const T_FULL = 'c_limit,w_1600,h_1600,q_auto:good,f_webp';
const T_THUMB = 'c_limit,w_700,h_700,q_auto:eco,f_webp';

function sign(params) {
  const toSign = Object.keys(params)
    .filter((k) => params[k] !== undefined && params[k] !== '')
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join('&');
  return crypto.createHash('sha1').update(toSign + API_SECRET).digest('hex');
}

async function putCloudinary(buffer, mimetype = 'image/jpeg') {
  const timestamp = Math.floor(Date.now() / 1000);
  const publicId = `${FOLDER}/${crypto.randomBytes(10).toString('hex')}`;

  // Signed upload. Only the params below are signed — keep them in sync.
  const signedParams = { public_id: publicId, timestamp };
  const signature = sign(signedParams);

  const form = new FormData();
  form.append('file', new Blob([buffer], { type: mimetype }));
  form.append('public_id', publicId);
  form.append('timestamp', String(timestamp));
  form.append('api_key', API_KEY);
  form.append('signature', signature);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
    method: 'POST',
    body: form,
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = json?.error?.message || `Cloudinary upload failed (${res.status}).`;
    throw new Error(msg);
  }

  return {
    image: cldUrl(json.public_id, json.version, T_FULL),
    thumb: cldUrl(json.public_id, json.version, T_THUMB),
    width: Number(json.width) || 0,
    height: Number(json.height) || 0,
  };
}

/** Pull the Cloudinary public_id back out of a delivery URL. */
function publicIdFromUrl(url) {
  const m = String(url).match(/\/image\/upload\/(?:[^/]+\/)*?(?:v\d+\/)?(.+?)\.[a-z0-9]+$/i);
  return m ? m[1] : null;
}

async function deleteCloudinary(storedUrl) {
  const publicId = publicIdFromUrl(storedUrl);
  if (!publicId) return;
  try {
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = sign({ public_id: publicId, timestamp });
    const form = new FormData();
    form.append('public_id', publicId);
    form.append('timestamp', String(timestamp));
    form.append('api_key', API_KEY);
    form.append('signature', signature);
    await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/destroy`, {
      method: 'POST',
      body: form,
    });
  } catch {
    /* non-fatal — an orphaned cloud file must never break the dashboard */
  }
}

/* ------------------------------------------------------------ public API */

/**
 * Store an uploaded photo.
 * @returns {Promise<{image:string, thumb:string, width:number, height:number}>}
 */
export async function putImage(buffer, mimetype) {
  assertImage(buffer);
  return STORAGE_DRIVER === 'cloudinary'
    ? putCloudinary(buffer, mimetype)
    : putLocal(buffer);
}

/** Remove stored files. Only called from "delete forever". */
export async function deleteImage(stored) {
  if (!stored) return;
  if (/^https?:\/\//i.test(stored)) return deleteCloudinary(stored);
  return deleteLocal(stored);
}

/**
 * Turn whatever is in the database into a usable URL.
 *
 *   "https://res.cloudinary.com/..."  → used as-is
 *   "a1b2c3.webp"                     → "/uploads/thumb/a1b2c3.webp"
 *   ""                                → ""
 */
export function resolveUrl(stored, variant = 'full') {
  if (!stored) return '';
  if (/^https?:\/\//i.test(stored) || stored.startsWith('/')) return stored;
  return `/uploads/${variant}/${stored}`;
}

/* Kept for backwards compatibility with any older import. */
export const processImage = (buffer, mimetype) => putImage(buffer, mimetype);
export const deleteImageFiles = (stored) => deleteImage(stored);
