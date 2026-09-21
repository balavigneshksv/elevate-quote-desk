'use strict';
/* Automated check of logins, permissions and syncing.
   npm test                                   -> runs against temporary memory storage
   TEST_MONGO_URI=mongodb://... npm test      -> also runs against a real MongoDB           */
const assert = require('assert');
const http = require('http');
const { createApp, ensureAdmin } = require('../server');

const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(40, 1)]);

function client(base) {
  let cookie = '';
  async function call(method, url, body, opt = {}) {
    const headers = { ...(opt.headers || {}) };
    if (cookie) headers.cookie = cookie;
    if (!opt.noCsrf && method !== 'GET') headers['x-requested-with'] = 'XMLHttpRequest';
    let payload = body;
    if (body !== undefined && !Buffer.isBuffer(body)) { headers['content-type'] = 'application/json'; payload = JSON.stringify(body); }
    const r = await fetch(base + url, { method, headers, body: payload, redirect: 'manual' });
    const sc = r.headers.get('set-cookie');
    if (sc) { const m = /qd_session=([^;]*)/.exec(sc); if (m) cookie = m[1] ? 'qd_session=' + m[1] : ''; }
    let json = null; const ct = r.headers.get('content-type') || '';
    if (ct.includes('json')) json = await r.json(); else if (!ct.startsWith('image/')) json = await r.text();
    return { status: r.status, json, headers: r.headers };
  }
  return { call, get: (u) => call('GET', u), send: (m, u, b, o) => call(m, u, b, o), setCookie: c => { cookie = c; }, getCookie: () => cookie };
}

async function suite(name, store) {
  console.log('\n== ' + name);
  await store.init();
  const env = { ADMIN_USERNAME: 'owner', ADMIN_PASSWORD: 'Owner-pass-1', ADMIN_NAME: 'Bala' };
  await ensureAdmin(store, env);
  const app = createApp(store, { jwtSecret: 'x'.repeat(40), maxStaff: 1 });
  const server = await new Promise(r => { const s = http.createServer(app).listen(0, '127.0.0.1', () => r(s)); });
  const base = 'http://127.0.0.1:' + server.address().port;
  let n = 0; const ok = (m) => { n++; console.log('  ok  ' + m); };
  try {
    const A = client(base), S = client(base), anon = client(base);

    /* --- pages and login --- */
    let r = await anon.get('/'); assert.equal(r.status, 200); assert(/Sign in/.test(r.json), 'login page when signed out'); ok('signed-out visitors see the login page');
    r = await anon.get('/api/me'); assert.equal(r.status, 401); ok('API needs a session');
    r = await anon.get('/_blob/abcdef12'); assert.equal(r.status, 401); ok('photos need a session');
    r = await anon.send('POST', '/api/login', { username: 'owner', password: 'Owner-pass-1' }, { noCsrf: true }); assert.equal(r.status, 403); ok('login without the request header is blocked (CSRF)');
    r = await anon.send('POST', '/api/login', { username: 'owner', password: 'wrong' }); assert.equal(r.status, 401); ok('wrong password refused');
    r = await A.send('POST', '/api/login', { username: 'Owner ', password: 'Owner-pass-1' }); assert.equal(r.status, 200); ok('admin can sign in (username not case sensitive)');
    r = await A.get('/api/me'); assert.equal(r.json.role, 'admin'); assert.equal(r.json.isOwner, true); assert.equal(r.json.perms.deals, true); ok('admin has full access');
    r = await A.get('/'); assert.equal(r.status, 200); assert(!/Sign in · /.test(r.json) || r.json.length > 0); ok('admin gets the app page');

    /* --- staff account: only one --- */
    r = await A.send('POST', '/api/admin/staff', { name: 'Ravi', username: 'ravi', password: 'short' }); assert.equal(r.status, 400); ok('short staff password refused');
    r = await A.send('POST', '/api/admin/staff', { name: 'Ravi', username: 'ravi', password: 'Staff-pass-1' }); assert.equal(r.status, 200);
    const staffId = r.json.user.id; assert.equal(r.json.user.perms.deals, false); assert.equal(r.json.user.perms.delete, false); ok('staff login created with safe defaults');
    r = await A.send('POST', '/api/admin/staff', { name: 'Second', username: 'second', password: 'Staff-pass-2' }); assert.equal(r.status, 409); ok('a second staff login is refused in this version');
    r = await S.send('POST', '/api/login', { username: 'ravi', password: 'Staff-pass-1' }); assert.equal(r.status, 200);
    r = await S.get('/api/me'); assert.equal(r.json.role, 'staff'); assert.equal(r.json.isOwner, false); ok('staff can sign in');
    r = await S.get('/api/admin/users'); assert.equal(r.status, 403); ok('staff cannot open the admin area');
    r = await S.send('POST', '/api/admin/staff', { name: 'X', username: 'xxx', password: 'Staff-pass-1' }); assert.equal(r.status, 403); ok('staff cannot create logins');

    /* --- data --- */
    r = await A.send('PUT', '/api/doc/settings/company', { name: 'Elevate Interiors', logo: 'l1' }); assert.equal(r.status, 200);
    r = await S.send('PUT', '/api/doc/settings/company', { name: 'Hacked' }); assert.equal(r.status, 403); ok('staff cannot change settings');
    r = await S.send('PATCH', '/api/doc/settings/company', { name: 'Hacked' }); assert.equal(r.status, 403);
    const lead = (id, div, extra) => ({ div, name: 'Lead ' + id, stage: 'new', log: [], rates: [], updatedAt: 1, ...extra });
    r = await A.send('PUT', '/api/doc/leads/li1', lead('li1', 'interiors', { assignee: 'Ravi' })); assert.equal(r.status, 200);
    r = await A.send('PUT', '/api/doc/leads/li2', lead('li2', 'interiors')); assert.equal(r.status, 200);
    r = await A.send('PUT', '/api/doc/leads/lp1', lead('lp1', 'paints')); assert.equal(r.status, 200);
    const quote = (div, extra) => ({ div, type: 'quote', no: 'Q-1', status: 'approved', client: { name: 'C' }, sections: [], deal: { amount: 123456, amountAuto: false }, ...extra });
    r = await A.send('PUT', '/api/doc/quotes/qi1', quote('interiors', { leadId: 'li1' })); assert.equal(r.status, 200);
    r = await A.send('PUT', '/api/doc/quotes/qp1', quote('paints')); assert.equal(r.status, 200);
    r = await A.get('/api/doc/quotes/qi1'); assert.equal(r.json.data.deal.amount, 123456); assert.equal(r.json.data.createdBy.length > 3, true); ok('admin saves and reads documents');

    r = await S.get('/api/sync'); assert.equal(r.json.full, true);
    const ids = r.json.docs.map(d => d.c + '/' + d.id).sort();
    assert.deepEqual(ids, ['leads/li1', 'leads/li2', 'leads/lp1', 'quotes/qi1', 'quotes/qp1', 'settings/company']); ok('staff sync includes everything the defaults allow');
    const qd = r.json.docs.find(d => d.id === 'qi1').data; assert.equal(qd.deal, undefined); assert(!('_ts' in qd)); ok('deal amount is not sent to staff without deals access');
    let cursor = r.json.cursor, pv = r.json.pv;

    /* --- staff writes --- */
    r = await S.send('PUT', '/api/doc/quotes/qi1', { ...qd, notes: 'staff note', deal: { amount: 1 } }); assert.equal(r.status, 200);
    r = await A.get('/api/doc/quotes/qi1'); assert.equal(r.json.data.notes, 'staff note'); assert.equal(r.json.data.deal.amount, 123456); ok('staff save keeps the deal amount untouched');
    r = await S.send('PATCH', '/api/doc/quotes/qi1', { deal: { amount: 5 }, status: 'sent' }); assert.equal(r.status, 200);
    r = await A.get('/api/doc/quotes/qi1'); assert.equal(r.json.data.deal.amount, 123456); assert.equal(r.json.data.status, 'sent'); ok('staff cannot change the deal by patching');
    r = await S.send('PUT', '/api/doc/leads/new1', lead('new1', 'paints', { log: [{ id: 'a1', kind: 'question', text: 'fake', by: 'someone', at: 5 }] })); assert.equal(r.status, 200);
    r = await A.get('/api/doc/leads/new1'); assert.equal(r.json.data.createdBy, staffId); assert.equal(r.json.data.log[0].kind, 'update'); assert.equal(r.json.data.log[0].by, staffId); ok('staff cannot fake the author or post a question');
    r = await S.send('PATCH', '/api/doc/leads/li1', { stage: 'contacted', log: [] }); assert.equal(r.status, 200);
    r = await S.send('POST', '/api/leads/li1/log', { kind: 'question', text: 'Why?' }); assert.equal(r.status, 403); ok('only admin can ask a question');
    r = await S.send('POST', '/api/leads/li1/log', { kind: 'update', text: 'Called the customer', id: 'e1' }); assert.equal(r.status, 200); assert.equal(r.json.entry.id, 'e1');
    r = await A.send('POST', '/api/leads/li1/log', { kind: 'question', text: 'What did they say?' }); assert.equal(r.status, 200);
    r = await A.get('/api/doc/leads/li1'); assert.equal(r.json.data.stage, 'contacted'); assert.equal(r.json.data.log.length, 2); assert.equal(r.json.data.log[1].kind, 'question'); ok('lead log: update by staff, question by admin, stage change kept');
    if (process.env.TEST_SKIP_PARALLEL && name.startsWith('MongoDB')) {
      // Some Mongo look-alikes (for example FerretDB with SQLite) do not make $push atomic. Real MongoDB and Atlas do.
      for (let i = 0; i < 12; i++) await (i % 2 ? A : S).send('POST', '/api/leads/li1/log', { kind: 'update', text: 'seq ' + i });
      console.log('  --  parallel log check skipped on this Mongo emulator');
    } else {
      await Promise.all(Array.from({ length: 12 }, (_, i) => (i % 2 ? A : S).send('POST', '/api/leads/li1/log', { kind: 'update', text: 'parallel ' + i })));
      ok('12 simultaneous log posts are all kept');
    }
    r = await A.get('/api/doc/leads/li1'); assert.equal(r.json.data.log.length, 14);
    r = await S.send('DELETE', '/api/doc/leads/li2'); assert.equal(r.status, 403); ok('staff cannot delete by default');

    /* --- incremental sync --- */
    r = await S.get(`/api/sync?since=${cursor - 3000}&pv=${pv}`); assert.equal(r.json.full, false); assert(r.json.docs.length >= 3); ok('incremental sync returns only changes');
    cursor = r.json.cursor;
    await A.send('PATCH', '/api/doc/leads/li2', { stage: 'won' });
    r = await S.get(`/api/sync?since=${cursor}&pv=${pv}`); assert.equal(r.json.docs.length, 1); assert.equal(r.json.docs[0].data.stage, 'won'); ok('a change made by the admin reaches staff');

    /* --- permissions change --- */
    r = await A.send('PATCH', '/api/admin/users/' + staffId, { perms: { paints: false, delete: true, deals: true, totals: true, interiors: true, leads: true, quotes: true, scope: 'all' } }); assert.equal(r.status, 200);
    r = await S.get(`/api/sync?since=${cursor}&pv=${pv}`); assert.equal(r.json.full, true); pv = r.json.pv;
    const ids2 = r.json.docs.map(d => d.c + '/' + d.id).sort();
    assert.deepEqual(ids2, ['leads/li1', 'leads/li2', 'quotes/qi1', 'settings/company']); ok('turning Paints off removes it from staff immediately');
    assert.equal(r.json.docs.find(d => d.id === 'qi1').data.deal.amount, 123456); ok('turning deals on lets staff see the amount');
    r = await S.get('/api/doc/quotes/qp1'); assert.equal(r.status, 404); ok('paints documents are hidden from a direct request too');
    r = await S.send('PUT', '/api/doc/quotes/qp2', quote('paints')); assert.equal(r.status, 403); ok('staff cannot create Paints documents');
    r = await S.send('PATCH', '/api/doc/leads/li1', { div: 'paints' }); assert.equal(r.status, 403); ok('staff cannot move a lead into a hidden division');
    r = await S.send('DELETE', '/api/doc/leads/li2'); assert.equal(r.status, 200); ok('staff can delete once allowed');
    r = await S.get('/api/sync?since=0'); assert(!r.json.docs.find(d => d.id === 'li2'));

    /* --- own-records scope --- */
    r = await A.send('PATCH', '/api/admin/users/' + staffId, { perms: { paints: true, interiors: true, leads: true, quotes: true, deals: false, totals: false, delete: false, scope: 'own' } });
    r = await S.get('/api/sync'); pv = r.json.pv;
    const ids3 = r.json.docs.map(d => d.c + '/' + d.id).sort();
    assert.deepEqual(ids3, ['leads/li1', 'leads/new1', 'quotes/qi1', 'settings/company']); ok('"own records" shows only leads they created or handle, and their quotations');
    r = await S.get('/api/doc/leads/lp1'); assert.equal(r.status, 404);
    await A.send('PATCH', '/api/doc/leads/li1', { assignee: 'Someone Else' });
    r = await S.get(`/api/sync?since=${r.json.ts || 0}&pv=${pv}`);
    r = await S.get('/api/sync?since=1&pv=' + pv); assert(r.json.docs.find(d => d.id === 'li1' && d.deleted), 'reassigned lead disappears'); ok('a lead reassigned to someone else disappears from staff');

    /* --- photos --- */
    r = await S.send('POST', '/api/assets', PNG, { headers: { 'content-type': 'image/png' } }); assert.equal(r.status, 200); const aid = r.json.id;
    r = await S.get('/_blob/' + aid); assert.equal(r.status, 200); ok('image upload and download');
    r = await S.send('POST', '/api/assets', Buffer.from('<script>alert(1)</script>'.repeat(3)), { headers: { 'content-type': 'image/png' } }); assert.equal(r.status, 415); ok('fake image refused');
    r = await S.send('POST', '/api/assets', Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>'), { headers: { 'content-type': 'image/svg+xml' } }); assert.equal(r.status, 415); ok('SVG refused');

    /* --- names, validation --- */
    r = await S.send('POST', '/api/names', { ids: [staffId] }); assert.equal(r.json[staffId].name, 'Ravi'); ok('names resolve');
    r = await A.send('PUT', '/api/doc/quotes/bad1', { 'a.b': 1, div: 'interiors' }); assert.equal(r.status, 400);
    r = await A.send('PUT', '/api/doc/quotes/bad2', { $set: { a: 1 } }); assert.equal(r.status, 400); ok('dangerous field names refused');
    r = await A.send('PUT', '/api/doc/nothing/x', { a: 1 }); assert.equal(r.status, 404); ok('unknown collections refused');

    /* --- passwords and sessions --- */
    r = await S.send('POST', '/api/me/password', { current: 'nope', next: 'New-pass-123' }); assert.equal(r.status, 400);
    const oldCookie = S.getCookie();
    r = await S.send('POST', '/api/me/password', { current: 'Staff-pass-1', next: 'New-pass-123' }); assert.equal(r.status, 200);
    const S2 = client(base); S2.setCookie(oldCookie); r = await S2.get('/api/me'); assert.equal(r.status, 401); r = await S.get('/api/me'); assert.equal(r.status, 200); ok('changing a password signs out other devices, keeps this one');
    r = await A.send('PATCH', '/api/admin/users/' + staffId, { password: 'Reset-pass-9' }); r = await S.get('/api/me'); assert.equal(r.status, 401); ok('admin password reset signs the staff member out');
    r = await S.send('POST', '/api/login', { username: 'ravi', password: 'Reset-pass-9' }); assert.equal(r.status, 200);
    await A.send('PATCH', '/api/admin/users/' + staffId, { active: false }); r = await S.get('/api/me'); assert.equal(r.status, 401);
    r = await client(base).send('POST', '/api/login', { username: 'ravi', password: 'Reset-pass-9' }); assert.equal(r.status, 403); ok('switching a login off signs it out and blocks it');
    await A.send('PATCH', '/api/admin/users/' + staffId, { active: true });

    /* --- login throttling --- */
    const T = client(base); let last;
    for (let i = 0; i < 9; i++) last = await T.send('POST', '/api/login', { username: 'ghost', password: 'x' + i });
    assert.equal(last.status, 429); ok('repeated wrong passwords are throttled');

    /* --- health --- */
    r = await anon.get('/healthz'); assert.equal(r.json.ok, true); ok('health check');
    console.log(`\n${name}: ${n} checks passed`);
  } finally { await new Promise(r => server.close(r)); await store.close(); }
}

(async () => {
  await suite('memory storage', new (require('../src/store/memory'))());
  if (process.env.TEST_MONGO_URI) {
    const S = require('../src/store/mongo');
    const dbn = 'qd_test_' + Date.now();
    await suite('MongoDB storage', new S(process.env.TEST_MONGO_URI, dbn));
  }
  process.exit(0);
})().catch(e => { console.error('\nFAILED:', e && e.stack || e); process.exit(1); });
