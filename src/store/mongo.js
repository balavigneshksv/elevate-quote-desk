'use strict';
/* MongoDB store. Collections are prefixed "qd_" so it can safely share a database
   with other apps (for example your website's elevate_db). */
const { MongoClient } = require('mongodb');

class MongoStore {
  constructor(uri, dbName) { this.uri = uri; this.dbName = dbName; this.name = 'mongodb'; }

  async init() {
    this.client = new MongoClient(this.uri, { serverSelectionTimeoutMS: 20000, retryWrites: true });
    await this.client.connect();
    this.db = this.client.db(this.dbName || undefined);
    this.U = this.db.collection('qd_users');
    this.D = this.db.collection('qd_docs');
    this.A = this.db.collection('qd_assets');
    await this.U.createIndex({ username: 1 }, { unique: true });
    await this.D.createIndex({ ts: 1 });
  }
  async close() { if (this.client) await this.client.close(); }
  async ping() { await this.db.command({ ping: 1 }); return true; }

  /* users: stored with _id = id */
  _u(r) { if (!r) return null; const { _id, ...rest } = r; return { id: _id, ...rest }; }
  async getUser(id) { return this._u(await this.U.findOne({ _id: id })); }
  async getUserByUsername(u) { return this._u(await this.U.findOne({ username: u })); }
  async listUsers() { return (await this.U.find({}).toArray()).map(r => this._u(r)); }
  async insertUser(u) { const { id, ...rest } = u; await this.U.insertOne({ _id: id, ...rest }); return u; }
  async updateUser(id, patch) {
    const r = await this.U.findOneAndUpdate({ _id: id }, { $set: patch }, { returnDocument: 'after' });
    return this._u(r && (r.value !== undefined ? r.value : r));
  }
  async bumpUser(id, inc, patch) {
    const upd = {}; if (inc && Object.keys(inc).length) upd.$inc = inc; if (patch && Object.keys(patch).length) upd.$set = patch;
    if (!Object.keys(upd).length) return this.getUser(id);
    const r = await this.U.findOneAndUpdate({ _id: id }, upd, { returnDocument: 'after' });
    return this._u(r && (r.value !== undefined ? r.value : r));
  }

  /* documents: one record per document, payload under "d" */
  _k(c, id) { return c + '/' + id; }
  _r(r) { return r ? { c: r.c, id: r.id, d: r.d, ts: r.ts, del: !!r.del } : null; }
  _v(r) { return r && r.value !== undefined && !('_id' in r) ? r.value : r; }   // driver v5 returned {value}, v6 returns the document
  async getDoc(c, id) { const r = await this.D.findOne({ _id: this._k(c, id) }); return r && !r.del ? this._r(r) : null; }
  async setDoc(c, id, d, ts) {
    await this.D.replaceOne({ _id: this._k(c, id) }, { c, id, d, ts, del: false }, { upsert: true });
  }
  async mergeDoc(c, id, fields, ts) {
    const set = { ts };
    for (const k of Object.keys(fields)) set['d.' + k] = fields[k];
    const r = await this.D.findOneAndUpdate({ _id: this._k(c, id), del: { $ne: true } }, { $set: set }, { returnDocument: 'after' });
    return this._r(this._v(r));
  }
  async pushLog(id, entry, patch, ts) {
    const set = { ts };
    for (const k of Object.keys(patch || {})) set['d.' + k] = patch[k];
    const r = await this.D.findOneAndUpdate({ _id: this._k('leads', id), del: { $ne: true } }, { $push: { 'd.log': entry }, $set: set }, { returnDocument: 'after' });
    return this._r(this._v(r));
  }
  async deleteDoc(c, id, ts) {
    const r = await this.D.updateOne({ _id: this._k(c, id), del: { $ne: true } }, { $set: { del: true, ts, d: null } });
    return r.matchedCount > 0;
  }
  async listAll() { return (await this.D.find({ del: { $ne: true } }).toArray()).map(r => this._r(r)); }
  async changedSince(ts) { return (await this.D.find({ ts: { $gt: ts } }).toArray()).map(r => this._r(r)); }

  /* image assets */
  async putAsset(a) { await this.A.insertOne({ _id: a.id, type: a.type, size: a.size, by: a.by, at: a.at, data: a.data }); }
  async getAsset(id) {
    const r = await this.A.findOne({ _id: id });
    if (!r) return null;
    const buf = r.data && r.data.buffer ? Buffer.from(r.data.buffer) : Buffer.from(r.data);
    return { id, type: r.type, size: r.size, by: r.by, at: r.at, data: buf };
  }
}
module.exports = MongoStore;
