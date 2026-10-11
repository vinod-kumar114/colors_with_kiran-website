/**
 * Vercel serverless entry point.
 *
 * Vercel turns every file in /api into a serverless function. `vercel.json`
 * rewrites all traffic here, so this one function serves the whole site:
 * public pages, the admin dashboard and the JSON API.
 *
 * An Express app is already a `(req, res)` function, so exporting it directly
 * is all that is required — no adapter library needed.
 *
 * ── IMPORTANT ────────────────────────────────────────────────────────────
 * Vercel's Node runtime normally injects "helpers" that read and parse the
 * request body before your code sees it. That consumes the stream, and multer
 * then dies with "Unexpected end of form" on every photo upload.
 *
 * The fix is the environment variable NODEJS_HELPERS=0, which is set for you
 * in vercel.json. (`export const config = { api: { bodyParser: false } }` is
 * Next.js syntax — it is silently ignored by plain Vercel functions, which is
 * a popular way to lose an afternoon.)
 *
 * Express provides req.body, req.query, req.cookies and res.json itself, so
 * nothing is lost by turning the helpers off.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Static files (CSS, JS, fonts) are NOT handled here. Vercel serves anything
 * in /public straight from its CDN before this function is woken up.
 */
import app from '../src/app.js';

export default app;
