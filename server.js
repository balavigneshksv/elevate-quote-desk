'use strict';
/*
 * Elevate Quote Desk: web server.
 *   - serves the app (only to signed-in users) and the login page
 *   - stores leads, quotations and settings in MongoDB
 *   - admin and staff logins, with what staff may see enforced here on the server
 */
require('./src/loadenv');
const path = require('path');
const fs = require('fs');
const express = require('express');
const A = require('./src/auth');
const P = require('./src/perms');

const ROOT = __dirname;
const COLLECTIONS = new Set(['quotes', 'leads', 'settings']);
const ID_RE = /^[A-Za-z0-9_-]{1,64}$/;
const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

class HttpError extends Error {
  constructor(status, message, code) { super(message); this.status = status; this.code = code || 'error'; }
}
const bad = (m, code) => new HttpError(400, m, code || 'bad_request');
const ah = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

/* strictly increasing timestamps, so the change feed never misses an update */
let lastTs = 0;
const nextTs = () => { lastTs = Math.max(Date.now(), lastTs + 1); return lastTs; };

/* ---------- input checks ---------- */
const isPlain = v => v && typeof v === 'object' && !Array.isArray(v);
function checkKeys(v, depth) {
  if (depth > 14) throw bad('Data is nested too deeply');
  if (Array.isArray(v)) { v.forEach(x => checkKeys(x, depth + 1)); return; }
  if (isPlain(v)) {
    for (const k of Object.keys(v)) {
      if (k.includes('.') || k.startsWith('$') || k.includes('\0')) throw bad('Data contains a field name that is not allowed');
      checkKeys(v[k], depth + 1);
    }
  }
}
function cleanDoc(body) {
  if (!isPlain(body)) throw bad('Expected an object');
  const o = { ...body };
  delete o._id; delete o._ts; delete o._del; delete o.id;
  checkKeys(o, 0);
  if (JSON.stringify(o).length > 1500000) throw bad('This document is too large');
  return o;
}
function cleanLogEntries(list, user) {
  const admin = P.isAdmin(user);
  return (Array.isArray(list) ? list : []).slice(-300).map(e => {
    let kind = ['update', 'question', 'sys'].includes(e && e.kind) ? e.kind : 'update';
    if (kind === 'question' && !admin) kind = 'update';
    return { id: typeof e.id === 'string' && ID_RE.test(e.id) ? e.id : A.newId(5), at: Number(e.at) || Date.now(), by: user.id, kind, text: String(e.text || '').slice(0, 4000) };
  });
}
function checkTarget(c, id) {
  if (!COLLECTIONS.has(c) || !ID_RE.test(id || '')) throw new HttpError(404, 'Not found', 'not_found');
  if (c === 'settings' && id !== 'company') throw new HttpError(404, 'Not found', 'not_found');
}
function magicOk(type, b) {
  if (!Buffer.isBuffer(b) || b.length < 12) return false;
  if (type === 'image/png') return b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47;
  if (type === 'image/jpeg') return b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
  if (type === 'image/gif') return b.slice(0, 4).toString() === 'GIF8';
  if (type === 'image/webp') return b.slice(0, 4).toString() === 'RIFF' && b.slice(8, 12).toString() === 'WEBP';
  return false;
}
const publicUser = u => ({
  id: u.id, username: u.username, name: u.name, role: u.role, active: u.active !== false,
  perms: P.effective(u), lastLogin: u.lastLogin || 0, createdAt: u.createdAt || 0
});

/* ================= the app ================= */
function createApp(store, cfg) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  const secret = cfg.jwtSecret;
  const maxStaff = Number.isFinite(cfg.maxStaff) ? cfg.maxStaff : 1;
  const userLimiter = A.makeLimiter(8, 15 * 60 * 1000);
  const ipLimiter = A.makeLimiter(40, 15 * 60 * 1000);
  setInterval(() => { userLimiter.sweep(); ipLimiter.sweep(); }, 10 * 60 * 1000).unref();

  /* security headers */
  app.use((req, res, next) => {
    res.set({
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'same-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
      'Content-Security-Policy': [
        "default-src 'self'", "script-src 'self' 'unsafe-inline'", "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com data:", "img-src 'self' data: blob:", "connect-src 'self'",
        "frame-ancestors 'none'", "base-uri 'none'", "form-action 'self'", "object-src 'none'"
      ].join('; ')
    });
    if (req.secure) res.set('Strict-Transport-Security', 'max-age=15552000');
    next();
  });

  app.get('/healthz', ah(async (req, res) => { await store.ping(); res.json({ ok: true }); }));

  app.use(express.static(path.join(ROOT, 'public'), { index: false, maxAge: '1h' }));

  /* ---------- who is asking ---------- */
  const requireUser = ah(async (req, res, next) => {
    const tok = A.parseCookies(req.headers.cookie)[A.COOKIE];
    const s = tok && A.verifySession(secret, tok);
    if (!s) throw new HttpError(401, 'Please sign in again', 'auth');
    const u = await store.getUser(s.sub);
    if (!u || u.active === false || (u.tv || 0) !== (s.tv || 0)) throw new HttpError(401, 'Please sign in again', 'auth');
    req.user = u; next();
  });
  const requireAdmin = (req, res, next) => (P.isAdmin(req.user) ? next() : next(new HttpError(403, 'Only the admin can do this', 'forbidden')));

  /* the page itself: the app if signed in, otherwise the login page */
  async function sessionUser(req) {
    const tok = A.parseCookies(req.headers.cookie)[A.COOKIE];
    const s = tok && A.verifySession(secret, tok);
    if (!s) return null;
    const u = await store.getUser(s.sub);
    return u && u.active !== false && (u.tv || 0) === (s.tv || 0) ? u : null;
  }
  app.get('/', ah(async (req, res) => {
    res.set('Cache-Control', 'no-store');
    if (await sessionUser(req)) res.sendFile(path.join(ROOT, 'app', 'index.html'));
    else res.sendFile(path.join(ROOT, 'public', 'login.html'));
  }));
  app.get('/login', ah(async (req, res) => {
    res.set('Cache-Control', 'no-store');
    if (await sessionUser(req)) return res.redirect('/');
    res.sendFile(path.join(ROOT, 'public', 'login.html'));
  }));

  /* ---------- API ---------- */
  const api = express.Router();
  api.use(express.json({ limit: '2mb' }));
  api.use((req, res, next) => {
    res.set('Cache-Control', 'no-store');
    if (!['GET', 'HEAD'].includes(req.method)) {
      // Browsers cannot add this header from another website, which blocks cross-site form posts.
      if (req.headers['x-requested-with'] !== 'XMLHttpRequest') return next(new HttpError(403, 'Request blocked', 'csrf'));
      const o = req.headers.origin;
      if (o) { try { if (new URL(o).host !== req.headers.host) return next(new HttpError(403, 'Request blocked', 'csrf')); } catch { return next(new HttpError(403, 'Request blocked', 'csrf')); } }
    }
    next();
  });

  api.post('/login', ah(async (req, res) => {
    const uname = A.cleanUsername(req.body && req.body.username), key = req.ip + '|' + uname;
    if (userLimiter.blocked(key) || ipLimiter.blocked(req.ip)) throw new HttpError(429, 'Too many attempts. Please wait 15 minutes and try again.', 'rate');
    const u = await store.getUserByUsername(uname);
    const ok = await A.checkPassword(req.body && req.body.password, u && u.passHash);
    if (!u || !ok) { userLimiter.fail(key); ipLimiter.fail(req.ip); throw new HttpError(401, 'Incorrect username or password', 'login'); }
    if (u.active === false) throw new HttpError(403, 'This login has been switched off. Please ask the admin.', 'inactive');
    userLimiter.clear(key);
    await store.updateUser(u.id, { lastLogin: Date.now() });
    A.setSessionCookie(req, res, A.signSession(secret, u));
    res.json({ ok: true });
  }));
  api.post('/logout', (req, res) => { A.clearSessionCookie(req, res); res.json({ ok: true }); });

  api.get('/me', requireUser, (req, res) => {
    const u = req.user;
    res.json({ id: u.id, name: u.name, username: u.username, role: u.role, isOwner: P.isAdmin(u), perms: P.effective(u), maxStaff });
  });
  api.post('/me/password', requireUser, ah(async (req, res) => {
    const { current, next } = req.body || {};
    if (!(await A.checkPassword(current, req.user.passHash))) throw new HttpError(400, 'Your current password is not correct', 'password');
    const prob = A.passwordProblem(next); if (prob) throw bad(prob);
    const u = await store.bumpUser(req.user.id, { tv: 1 }, { passHash: await A.hashPassword(next) });
    A.setSessionCookie(req, res, A.signSession(secret, u));   // keep this device signed in, sign out the others
    res.json({ ok: true });
  }));

  /* ----- data sync: everything this person may see, changed since the last poll ----- */
  api.get('/sync', requireUser, ah(async (req, res) => {
    const u = req.user, since = Math.max(0, Number(req.query.since) || 0), pv = u.pv || 0;
    const full = since === 0 || (req.query.pv === undefined ? true : Number(req.query.pv) !== pv);
    const raw = full ? await store.listAll() : await store.changedSince(since);
    const memo = new Map();
    const getLead = async id => { if (!memo.has(id)) { const r = await store.getDoc('leads', id); memo.set(id, r ? r.d : null); } return memo.get(id); };
    const docs = []; let cursor = full ? 1 : since;
    for (const r of raw) {
      cursor = Math.max(cursor, r.ts);
      if (r.del) { if (!full) docs.push({ c: r.c, id: r.id, ts: r.ts, deleted: true }); continue; }
      if (await P.visible(u, r.c, r.d, getLead)) docs.push({ c: r.c, id: r.id, ts: r.ts, data: P.present(u, r.c, r.d) });
      else if (!full) docs.push({ c: r.c, id: r.id, ts: r.ts, deleted: true });   // no longer visible to this person
    }
    res.json({ full, pv, cursor, docs });
  }));

  /* ----- documents ----- */
  async function loadVisible(u, c, id) {
    const rec = await store.getDoc(c, id);
    if (!rec) return null;
    const memo = new Map();
    const getLead = async lid => { if (!memo.has(lid)) { const r = await store.getDoc('leads', lid); memo.set(lid, r ? r.d : null); } return memo.get(lid); };
    if (!(await P.visible(u, c, rec.d, getLead))) throw new HttpError(404, 'Not found', 'not_found');
    return rec;
  }
  const dealsOk = u => P.isAdmin(u) || P.effective(u).deals;

  api.get('/doc/:c/:id', requireUser, ah(async (req, res) => {
    const { c, id } = req.params; checkTarget(c, id);
    const rec = await loadVisible(req.user, c, id);
    if (!rec) return res.json({ exists: false });
    res.json({ exists: true, ts: rec.ts, data: P.present(req.user, c, rec.d) });
  }));

  api.put('/doc/:c/:id', requireUser, ah(async (req, res) => {
    const { c, id } = req.params, u = req.user; checkTarget(c, id);
    const body = cleanDoc(req.body);
    const existing = await loadVisible(u, c, id);
    if (c !== 'settings') {
      body.div = P.divOf(body);
      body.createdBy = existing ? (existing.d.createdBy || u.id) : u.id;
      if (c === 'quotes') body.type = body.type === 'bill' ? 'bill' : 'quote';
    }
    const err = P.writeError(u, c, body); if (err) throw new HttpError(403, err, 'forbidden');
    if (c === 'quotes' && !dealsOk(u)) { if (existing && existing.d.deal) body.deal = existing.d.deal; else delete body.deal; }
    if (c === 'leads') body.log = existing ? (existing.d.log || []) : cleanLogEntries(body.log, u);
    const ts = nextTs();
    await store.setDoc(c, id, body, ts);
    res.json({ ok: true, ts });
  }));

  api.patch('/doc/:c/:id', requireUser, ah(async (req, res) => {
    const { c, id } = req.params, u = req.user; checkTarget(c, id);
    const fields = cleanDoc(req.body);
    const existing = await loadVisible(u, c, id);
    if (!existing) throw new HttpError(404, 'Not found', 'not_found');
    delete fields.createdBy;
    if (c !== 'settings') {
      const div = fields.div !== undefined ? P.divOf(fields) : P.divOf(existing.d);
      if (fields.div !== undefined) fields.div = div;
      const err = P.writeError(u, c, { div }); if (err) throw new HttpError(403, err, 'forbidden');
    } else if (!P.isAdmin(u)) throw new HttpError(403, 'Only the admin can change company settings', 'forbidden');
    if (c === 'quotes') { delete fields.type; if (!dealsOk(u)) delete fields.deal; }
    if (c === 'leads') delete fields.log;          // the lead log changes only through /leads/:id/log
    const ts = nextTs();
    const rec = await store.mergeDoc(c, id, fields, ts);
    if (!rec) throw new HttpError(404, 'Not found', 'not_found');
    res.json({ ok: true, ts, data: P.present(u, c, rec.d) });
  }));

  api.delete('/doc/:c/:id', requireUser, ah(async (req, res) => {
    const { c, id } = req.params, u = req.user; checkTarget(c, id);
    if (c === 'settings') throw new HttpError(403, 'Settings cannot be deleted', 'forbidden');
    if (!P.isAdmin(u) && !P.effective(u).delete) throw new HttpError(403, 'Your login cannot delete records', 'forbidden');
    const existing = await loadVisible(u, c, id);
    if (!existing) return res.json({ ok: true });
    const err = P.writeError(u, c, existing.d); if (err) throw new HttpError(403, err, 'forbidden');
    const ts = nextTs();
    await store.deleteDoc(c, id, ts);
    res.json({ ok: true, ts });
  }));

  /* add one line to a lead's log. Done here (not by rewriting the lead) so two people
     posting at the same moment never overwrite each other */
  api.post('/leads/:id/log', requireUser, ah(async (req, res) => {
    const u = req.user, id = req.params.id; checkTarget('leads', id);
    const existing = await loadVisible(u, 'leads', id);
    if (!existing) throw new HttpError(404, 'Lead not found', 'not_found');
    const err = P.writeError(u, 'leads', existing.d); if (err) throw new HttpError(403, err, 'forbidden');
    const b = req.body || {};
    if (b.kind === 'question' && !P.isAdmin(u)) throw new HttpError(403, 'Only the admin can ask a question on a lead', 'forbidden');
    const [entry] = cleanLogEntries([{ id: b.id, kind: b.kind, text: b.text, at: Date.now() }], u);
    if (!entry.text.trim()) throw bad('Write something first');
    entry.at = Date.now();
    const ts = nextTs();
    const rec = await store.pushLog(id, entry, { updatedAt: Date.now() }, ts);
    if (!rec) throw new HttpError(404, 'Lead not found', 'not_found');
    res.json({ ok: true, ts, entry, data: P.present(u, 'leads', rec.d) });
  }));

  /* ----- photos and logo ----- */
  api.post('/assets', requireUser, express.raw({ type: IMAGE_TYPES, limit: '8mb' }), ah(async (req, res) => {
    const type = (req.headers['content-type'] || '').split(';')[0].trim();
    if (!IMAGE_TYPES.includes(type) || !magicOk(type, req.body)) throw new HttpError(415, 'Please upload a PNG, JPG, WEBP or GIF image', 'type');
    const id = A.newId(12);
    await store.putAsset({ id, type, size: req.body.length, by: req.user.id, at: Date.now(), data: req.body });
    res.json({ id, url: '/_blob/' + id, contentType: type, sizeBytes: req.body.length });
  }));
  app.get('/_blob/:id', requireUser, ah(async (req, res) => {
    if (!/^[a-f0-9]{8,64}$/.test(req.params.id)) throw new HttpError(404, 'Not found', 'not_found');
    const a = await store.getAsset(req.params.id);
    if (!a) throw new HttpError(404, 'Not found', 'not_found');
    res.set({ 'Content-Type': a.type, 'Cache-Control': 'private, max-age=31536000, immutable', 'Content-Disposition': 'inline' });
    res.send(a.data);
  }));

  /* names for the "by" column on lead updates */
  api.post('/names', requireUser, ah(async (req, res) => {
    const ids = (Array.isArray(req.body && req.body.ids) ? req.body.ids : []).filter(x => typeof x === 'string').slice(0, 200);
    const out = {};
    for (const id of ids) { const u = await store.getUser(id); out[id] = { name: u ? u.name : '' }; }
    res.json(out);
  }));

  /* ----- admin: logins and what staff may see ----- */
  api.get('/admin/users', requireUser, requireAdmin, ah(async (req, res) => {
    const list = (await store.listUsers()).sort((a, b) => (a.role === b.role ? (a.createdAt || 0) - (b.createdAt || 0) : a.role === 'admin' ? -1 : 1));
    res.json({ users: list.map(publicUser), maxStaff });
  }));
  const cleanName = s => String(s || '').trim().replace(/\s+/g, ' ').slice(0, 60);
  api.post('/admin/staff', requireUser, requireAdmin, ah(async (req, res) => {
    const b = req.body || {};
    const name = cleanName(b.name), username = A.cleanUsername(b.username);
    if (!name) throw bad('Enter the staff member’s name');
    if (!A.validUsername(username)) throw bad('Username must be 3 to 64 letters, numbers, dots or dashes, with no spaces');
    const prob = A.passwordProblem(b.password); if (prob) throw bad(prob);
    const staffCount = (await store.listUsers()).filter(u => u.role === 'staff').length;
    if (staffCount >= maxStaff) throw new HttpError(409, maxStaff === 1 ? 'This version allows one staff login. Edit the existing one instead.' : `You can create up to ${maxStaff} staff logins`, 'limit');
    if (await store.getUserByUsername(username)) throw new HttpError(409, 'That username is already taken', 'taken');
    const u = await store.insertUser({
      id: A.newId(), username, name, role: 'staff', passHash: await A.hashPassword(b.password), active: true,
      perms: P.normalizePerms(b.perms), tv: 0, pv: 0, createdAt: Date.now(), lastLogin: 0
    });
    res.json({ ok: true, user: publicUser(u) });
  }));
  api.patch('/admin/users/:id', requireUser, requireAdmin, ah(async (req, res) => {
    const target = await store.getUser(req.params.id);
    if (!target) throw new HttpError(404, 'User not found', 'not_found');
    const b = req.body || {}, patch = {}, inc = {};
    if (b.name !== undefined) { const n = cleanName(b.name); if (!n) throw bad('Name cannot be empty'); if (n !== target.name) { patch.name = n; inc.pv = 1; } }
    if (b.username !== undefined) {
      const un = A.cleanUsername(b.username);
      if (!A.validUsername(un)) throw bad('Username must be 3 to 64 letters, numbers, dots or dashes, with no spaces');
      if (un !== target.username) {
        const other = await store.getUserByUsername(un);
        if (other && other.id !== target.id) throw new HttpError(409, 'That username is already taken', 'taken');
        patch.username = un;
      }
    }
    if (b.password) {
      const prob = A.passwordProblem(b.password); if (prob) throw bad(prob);
      patch.passHash = await A.hashPassword(b.password); inc.tv = 1;
    }
    if (target.role === 'staff') {
      if (b.active !== undefined && (b.active !== false) !== (target.active !== false)) { patch.active = b.active !== false; inc.pv = 1; if (!patch.active) inc.tv = 1; }
      if (b.perms !== undefined) { patch.perms = P.normalizePerms(b.perms); inc.pv = 1; }
    }
    const u = await store.bumpUser(target.id, inc, patch);
    res.json({ ok: true, user: publicUser(u) });
  }));

  api.use((req, res, next) => next(new HttpError(404, 'Not found', 'not_found')));
  app.use('/api', api);

  /* ---------- errors ---------- */
  app.use((err, req, res, next) => {   // eslint-disable-line no-unused-vars
    let status = err.status || 500, msg = err.message, code = err.code || 'error';
    if (err.type === 'entity.too.large') { status = 413; msg = 'That is too large to save'; code = 'too_large'; }
    else if (err.type === 'entity.parse.failed') { status = 400; msg = 'Could not read the request'; code = 'bad_request'; }
    else if (status >= 500) { console.error(err); msg = 'Something went wrong on the server. Please try again.'; }
    if (req.path.startsWith('/api') || req.path.startsWith('/_blob')) return res.status(status).json({ error: msg, code });
    res.status(status).type('text').send(msg);
  });
  return app;
}

/* ================= start-up ================= */
async function ensureAdmin(store, env) {
  const users = await store.listUsers();
  const admin = users.find(u => u.role === 'admin');
  const pw = env.ADMIN_PASSWORD || '';
  if (!admin) {
    const username = A.cleanUsername(env.ADMIN_USERNAME || 'admin');
    if (!A.validUsername(username)) throw new Error('ADMIN_USERNAME must be 3 to 64 letters, numbers, dots or dashes.');
    const prob = A.passwordProblem(pw);
    if (prob) throw new Error('Set ADMIN_PASSWORD (at least 8 characters) so the first admin login can be created. ' + prob);
    await store.insertUser({
      id: A.newId(), username, name: (env.ADMIN_NAME || 'Owner').trim().slice(0, 60) || 'Owner', role: 'admin',
      passHash: await A.hashPassword(pw), active: true, perms: null, tv: 0, pv: 0, createdAt: Date.now(), lastLogin: 0
    });
    console.log(`Created the admin login "${username}".`);
  } else if (env.FORCE_ADMIN_RESET === '1') {
    const prob = A.passwordProblem(pw); if (prob) throw new Error('FORCE_ADMIN_RESET needs ADMIN_PASSWORD. ' + prob);
    await store.bumpUser(admin.id, { tv: 1 }, { passHash: await A.hashPassword(pw), active: true });
    console.log('The admin password was reset. Remove FORCE_ADMIN_RESET from the settings now.');
  }
}
/* First run only: put the Elevate logo in place so documents have it straight away. */
async function seedSettings(store) {
  if (await store.getDoc('settings', 'company')) return;
  const f = path.join(ROOT, 'public', 'logo.png');
  if (!fs.existsSync(f)) return;
  const data = fs.readFileSync(f), id = A.newId(12);
  await store.putAsset({ id, type: 'image/png', size: data.length, by: 'system', at: Date.now(), data });
  await store.setDoc('settings', 'company', { logo: id }, nextTs());
}

async function main() {
  const env = process.env;
  if (!env.JWT_SECRET || env.JWT_SECRET.length < 24) {
    console.error('JWT_SECRET is missing or too short. Set it to a long random text (at least 24 characters).'); process.exit(1);
  }
  let store;
  if (env.MONGODB_URI) store = new (require('./src/store/mongo'))(env.MONGODB_URI, env.MONGODB_DB || 'elevate_quote_desk');
  else if (env.STORE === 'memory') { store = new (require('./src/store/memory'))(); console.warn('Using temporary memory storage: everything is lost when the server stops. Set MONGODB_URI for real use.'); }
  else { console.error('MONGODB_URI is not set. Add your MongoDB Atlas connection string in the environment settings.'); process.exit(1); }
  try { await store.init(); await ensureAdmin(store, env); await seedSettings(store); }
  catch (e) { console.error('Start-up failed:', e.message); process.exit(1); }
  const app = createApp(store, { jwtSecret: env.JWT_SECRET, maxStaff: parseInt(env.MAX_STAFF || '1', 10) });
  const port = parseInt(env.PORT || '3000', 10);
  app.listen(port, () => console.log(`Elevate Quote Desk is running on port ${port} (${store.name} storage).`));
  process.on('unhandledRejection', e => console.error('Unhandled', e));
}
if (require.main === module) main();
module.exports = { createApp, ensureAdmin, seedSettings };
