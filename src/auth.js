'use strict';
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const COOKIE = 'qd_session';
const SESSION_DAYS = 7;
// Compared against when the username does not exist, so timing does not reveal valid usernames.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 10);

const hashPassword = pw => bcrypt.hash(pw, 10);
const checkPassword = (pw, hash) => bcrypt.compare(String(pw || ''), hash || DUMMY_HASH);

const USERNAME_RE = /^[a-z0-9._@-]{3,64}$/;
const cleanUsername = s => String(s || '').trim().toLowerCase();
const validUsername = s => USERNAME_RE.test(s);
function passwordProblem(pw) {
  if (typeof pw !== 'string' || pw.length < 8) return 'Password must be at least 8 characters';
  if (pw.length > 100) return 'Password is too long';
  return null;
}
const newId = (n = 9) => crypto.randomBytes(n).toString('hex');

function signSession(secret, user) {
  return jwt.sign({ sub: user.id, tv: user.tv || 0 }, secret, { expiresIn: SESSION_DAYS + 'd', algorithm: 'HS256' });
}
function verifySession(secret, token) {
  try { return jwt.verify(token, secret, { algorithms: ['HS256'] }); } catch { return null; }
}
function parseCookies(header) {
  const out = {};
  String(header || '').split(';').forEach(p => {
    const i = p.indexOf('='); if (i < 0) return;
    const k = p.slice(0, i).trim(); if (!k) return;
    try { out[k] = decodeURIComponent(p.slice(i + 1).trim()); } catch { out[k] = p.slice(i + 1).trim(); }
  });
  return out;
}
function setSessionCookie(req, res, token) {
  res.cookie(COOKIE, token, { httpOnly: true, sameSite: 'lax', secure: !!req.secure, maxAge: SESSION_DAYS * 864e5, path: '/' });
}
const clearSessionCookie = (req, res) => res.clearCookie(COOKIE, { httpOnly: true, sameSite: 'lax', secure: !!req.secure, path: '/' });

/* Simple in-memory limiter for failed logins: slows down password guessing. */
function makeLimiter(max, windowMs) {
  const hits = new Map();
  return {
    blocked(key) {
      const now = Date.now(), h = (hits.get(key) || []).filter(t => now - t < windowMs);
      hits.set(key, h); return h.length >= max;
    },
    fail(key) { const h = hits.get(key) || []; h.push(Date.now()); hits.set(key, h); },
    clear(key) { hits.delete(key); },
    sweep() { const now = Date.now(); for (const [k, h] of hits) { const f = h.filter(t => now - t < windowMs); if (f.length) hits.set(k, f); else hits.delete(k); } }
  };
}

module.exports = { COOKIE, hashPassword, checkPassword, cleanUsername, validUsername, passwordProblem, newId, signSession, verifySession, parseCookies, setSessionCookie, clearSessionCookie, makeLimiter };
