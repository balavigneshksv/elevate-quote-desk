'use strict';
/* In-memory store. Used for automated tests and quick local trials only:
   everything is lost when the server stops. Production uses MongoDB. */
const clone = o => (o === undefined ? undefined : JSON.parse(JSON.stringify(o)));

class MemoryStore {
  constructor() { this.users = new Map(); this.docs = new Map(); this.assets = new Map(); this.name = 'memory'; }
  async init() { }
  async close() { }
  async ping() { return true; }

  /* users */
  async getUser(id) { return clone(this.users.get(id)) || null; }
  async getUserByUsername(u) { for (const x of this.users.values()) if (x.username === u) return clone(x); return null; }
  async listUsers() { return [...this.users.values()].map(clone); }
  async insertUser(u) { this.users.set(u.id, clone(u)); return clone(u); }
  async updateUser(id, patch) {
    const u = this.users.get(id); if (!u) return null;
    Object.assign(u, clone(patch)); return clone(u);
  }
  async bumpUser(id, inc, patch) {
    const u = this.users.get(id); if (!u) return null;
    for (const k of Object.keys(inc || {})) u[k] = (u[k] || 0) + inc[k];
    Object.assign(u, clone(patch || {})); return clone(u);
  }

  /* documents */
  _k(c, id) { return c + '/' + id; }
  async getDoc(c, id) { const r = this.docs.get(this._k(c, id)); return r && !r.del ? clone(r) : null; }
  async setDoc(c, id, d, ts) { this.docs.set(this._k(c, id), { c, id, d: clone(d), ts, del: false }); }
  async mergeDoc(c, id, fields, ts) {
    const r = this.docs.get(this._k(c, id)); if (!r || r.del) return null;
    Object.assign(r.d, clone(fields)); r.ts = ts; return clone(r);
  }
  async pushLog(id, entry, patch, ts) {
    const r = this.docs.get(this._k('leads', id)); if (!r || r.del) return null;
    r.d.log = [...(Array.isArray(r.d.log) ? r.d.log : []), clone(entry)];
    Object.assign(r.d, clone(patch || {})); r.ts = ts; return clone(r);
  }
  async deleteDoc(c, id, ts) {
    const r = this.docs.get(this._k(c, id)); if (!r || r.del) return false;
    this.docs.set(this._k(c, id), { c, id, d: null, ts, del: true }); return true;
  }
  async listAll() { return [...this.docs.values()].filter(r => !r.del).map(clone); }
  async changedSince(ts) { return [...this.docs.values()].filter(r => r.ts > ts).map(clone); }

  /* image assets */
  async putAsset(a) { this.assets.set(a.id, { ...a, data: Buffer.from(a.data) }); }
  async getAsset(id) { const a = this.assets.get(id); return a ? { ...a } : null; }
}
module.exports = MemoryStore;
