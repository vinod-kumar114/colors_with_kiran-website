/**
 * Admin authentication: bcrypt password + server-side session tokens
 * stored in the database, delivered as an httpOnly signed cookie.
 *
 * Sessions live in the `sessions` table (not in memory), which is what makes
 * login work on Vercel — every serverless instance reads the same table.
 */
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { sql } from './db.js';

export const COOKIE_NAME = 'cwk_session';
const SESSION_DAYS = 14;

export async function ensureAdminUser() {
  const row = await sql.get('SELECT COUNT(*) AS n FROM users');
  if ((row?.n ?? 0) > 0) return null;

  const username = process.env.ADMIN_USER || 'kiran';
  const password = process.env.ADMIN_PASS || 'mehndi123';
  const hash = bcrypt.hashSync(password, 10);
  // must_change stays 1 when the default password is used, so the dashboard
  // can nag until it is changed.
  const mustChange = process.env.ADMIN_PASS ? 0 : 1;
  await sql.run(
    'INSERT INTO users (username, password_hash, must_change) VALUES (?, ?, ?)',
    [username, hash, mustChange]
  );
  return { username, password };
}

export async function verifyLogin(username, password) {
  const user = await sql.get(
    'SELECT * FROM users WHERE lower(username) = lower(?)',
    [String(username || '').trim()]
  );
  if (!user) return null;
  if (!bcrypt.compareSync(String(password || ''), user.password_hash)) return null;
  return user;
}

export async function createSession(userId) {
  const token = crypto.randomBytes(32).toString('hex');
  const expires = Date.now() + SESSION_DAYS * 864e5;
  await sql.run(
    'INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)',
    [token, userId, expires]
  );
  // opportunistic cleanup
  await sql.run('DELETE FROM sessions WHERE expires_at < ?', [Date.now()]);
  return { token, expires };
}

export async function destroySession(token) {
  if (token) await sql.run('DELETE FROM sessions WHERE token = ?', [token]);
}

export async function userFromRequest(req) {
  const token = req.signedCookies?.[COOKIE_NAME];
  if (!token) return null;
  const row = await sql.get(
    `SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id
      WHERE s.token = ? AND s.expires_at > ?`,
    [token, Date.now()]
  );
  return row || null;
}

/** Express middleware — redirects browsers, 401s API calls. */
export async function requireAuth(req, res, next) {
  try {
    const user = await userFromRequest(req);
    if (!user) {
      if (req.path.startsWith('/api/') || req.xhr) {
        return res
          .status(401)
          .json({ ok: false, error: 'Your session expired. Please sign in again.' });
      }
      return res.redirect('/admin/login');
    }
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

export async function changePassword(userId, newPassword) {
  const hash = bcrypt.hashSync(String(newPassword), 10);
  await sql.run('UPDATE users SET password_hash = ?, must_change = 0 WHERE id = ?', [
    hash,
    userId,
  ]);
  // Force a fresh login everywhere else.
  await sql.run('DELETE FROM sessions WHERE user_id = ?', [userId]);
}
