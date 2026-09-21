/* Connects the app to the Elevate server.
   It offers the same small "database", "assets", "user" and "downloads" helpers the app
   was written against, but everything is stored on your own server. */
(() => {
  'use strict';
  const POLL_MS = 4000, FULL_EVERY_MS = 10 * 60 * 1000, OVERLAP_MS = 4000;

  class ApiError extends Error {
    constructor(status, message, code) {
      super(message); this.status = status; this.serverCode = code;
      this.code = status === 403 ? 'invalid_argument' : status === 404 ? 'not_found' : (code || 'error');
    }
  }
  let leaving = false;
  function signedOut() { if (!leaving) { leaving = true; location.replace('/'); } }

  async function req(method, url, body, contentType) {
    const opt = { method, credentials: 'same-origin', headers: { 'X-Requested-With': 'XMLHttpRequest' } };
    if (body !== undefined) {
      if (contentType) { opt.body = body; opt.headers['Content-Type'] = contentType; }
      else { opt.body = JSON.stringify(body); opt.headers['Content-Type'] = 'application/json'; }
    }
    let r;
    try { r = await fetch(url, opt); } catch { throw new ApiError(0, 'Could not reach the server. Check your internet connection.', 'network'); }
    let j = null; try { j = await r.json(); } catch { /* not JSON */ }
    if (r.status === 401 && !/\/api\/(login|logout)$/.test(url)) { signedOut(); throw new ApiError(401, 'Please sign in again', 'auth'); }
    if (!r.ok) throw new ApiError(r.status, (j && j.error) || 'Something went wrong', j && j.code);
    return j;
  }

  /* ---------- local copy of the data this login may see ---------- */
  const cache = { quotes: new Map(), leads: new Map(), settings: new Map() };   // id -> { d, ts }
  const colL = { quotes: new Set(), leads: new Set(), settings: new Set() };
  const docL = new Map();
  let ready = false, started = false, cursor = 0, pv = null, lastFull = 0, running = false, again = false;

  const safe = (fn) => { try { fn(); } catch (e) { console.error(e); } };
  const snapCol = c => ({ size: cache[c].size, docs: [...cache[c]].map(([id, v]) => ({ id, exists: true, data: () => v.d })) });
  const snapDoc = (c, id) => { const v = cache[c].get(id); return { id, exists: !!v, data: () => (v ? v.d : undefined) }; };
  function fire(changed) {
    const cols = new Set(changed.map(x => x[0]));
    cols.forEach(c => colL[c].forEach(l => safe(() => l.cb(snapCol(c)))));
    changed.forEach(([c, id]) => { const s = docL.get(c + '/' + id); if (s) s.forEach(l => safe(() => l.cb(snapDoc(c, id)))); });
  }
  function applyFull(docs) {
    const next = { quotes: new Map(), leads: new Map(), settings: new Map() }, changed = [];
    docs.forEach(x => { if (next[x.c]) next[x.c].set(x.id, { d: x.data, ts: x.ts }); });
    for (const c of Object.keys(cache)) {
      const old = cache[c], nw = next[c];
      for (const [id, v] of nw) { const o = old.get(id); if (o && o.ts >= v.ts) { nw.set(id, o); continue; } changed.push([c, id]); }
      for (const id of old.keys()) if (!nw.has(id)) changed.push([c, id]);
      cache[c] = nw;
    }
    return changed;
  }
  function applyInc(docs) {
    const changed = [];
    docs.forEach(x => {
      const m = cache[x.c]; if (!m) return;
      const o = m.get(x.id);
      if (x.deleted) { if (o) { m.delete(x.id); changed.push([x.c, x.id]); } return; }
      if (!o || x.ts > o.ts) { m.set(x.id, { d: x.data, ts: x.ts }); changed.push([x.c, x.id]); }
    });
    return changed;
  }
  async function pollOnce() {
    if (running) { again = true; return; }
    running = true;
    try {
      do {
        again = false;
        const full = cursor === 0 || Date.now() - lastFull > FULL_EVERY_MS;
        const r = await req('GET', full ? '/api/sync?since=0' : `/api/sync?since=${Math.max(1, cursor - OVERLAP_MS)}&pv=${pv}`);
        if (pv !== null && r.pv !== pv) { location.reload(); return; }   // the admin changed this login's access: start fresh
        let changed;
        if (r.full) { changed = applyFull(r.docs); lastFull = Date.now(); } else changed = applyInc(r.docs);
        cursor = Math.max(cursor, r.cursor || 0) || 1; pv = r.pv;
        if (!ready) { ready = true; ['quotes', 'leads', 'settings'].forEach(c => colL[c].forEach(l => safe(() => l.cb(snapCol(c))))); docL.forEach((set, k) => { const [c, id] = k.split('/'); set.forEach(l => safe(() => l.cb(snapDoc(c, id)))); }); }
        else if (changed.length) fire(changed);
      } while (again);
    } catch (e) { if (e.status !== 401) console.warn('Sync problem:', e.message); }
    finally { running = false; }
  }
  function start() {
    if (started) return; started = true;
    pollOnce();
    setInterval(() => { if (!document.hidden) pollOnce(); }, POLL_MS);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) pollOnce(); });
    window.addEventListener('online', pollOnce);
  }

  const db = {
    collection(c) {
      return {
        onSnapshot(cb, eb) {
          const ent = { cb, eb }; colL[c].add(ent); start();
          if (ready) Promise.resolve().then(() => safe(() => cb(snapCol(c))));
          return () => colL[c].delete(ent);
        }
      };
    },
    doc(path) {
      const [c, id] = path.split('/');
      return {
        async get() { const r = await req('GET', `/api/doc/${c}/${id}`); return { id, exists: !!r.exists, data: () => r.data }; },
        async set(data) { await req('PUT', `/api/doc/${c}/${id}`, data); pollOnce(); },
        async update(fields) { await req('PATCH', `/api/doc/${c}/${id}`, fields); pollOnce(); },
        async delete() { await req('DELETE', `/api/doc/${c}/${id}`); pollOnce(); },
        onSnapshot(cb, eb) {
          const ent = { cb, eb }, k = c + '/' + id;
          if (!docL.has(k)) docL.set(k, new Set());
          docL.get(k).add(ent); start();
          if (ready) Promise.resolve().then(() => safe(() => cb(snapDoc(c, id))));
          return () => docL.get(k).delete(ent);
        }
      };
    },
    /* adds one line to a lead's log on the server, so two people posting together never overwrite each other */
    async appendLog(id, entry) {
      const r = await req('POST', `/api/leads/${id}/log`, { id: entry.id, kind: entry.kind, text: entry.text });
      pollOnce(); return r.entry;
    }
  };

  const assets = {
    async upload(blob, opts) {
      const type = (blob && blob.type) || (opts && opts.type) || 'application/octet-stream';
      const r = await req('POST', '/api/assets', blob, type);
      return { id: r.id, url: r.url, contentType: type, sizeBytes: r.sizeBytes };
    }
  };

  let mePromise = null;
  const getMe = () => (mePromise || (mePromise = req('GET', '/api/me').catch(e => { mePromise = null; throw e; })));
  const user = {
    async me() { const m = await getMe(); return { id: m.id, name: m.name, username: m.username, role: m.role, isOwner: !!m.isOwner, perms: m.perms, maxStaff: m.maxStaff }; },
    async profiles(ids) { return req('POST', '/api/names', { ids }); }
  };

  const downloads = {
    async save({ filename, data }) {
      const blob = data instanceof Blob ? data : new Blob([data]);
      const url = URL.createObjectURL(blob), a = document.createElement('a');
      a.href = url; a.download = filename; a.style.display = 'none';
      document.body.appendChild(a); a.click();
      setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 5000);
      return {};
    }
  };

  window.claude = { use: async (name) => ({ db, assets, user, downloads }[name] || null) };
  window.API = { req, ApiError };
})();
