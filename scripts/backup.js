'use strict';
/*
 * Back up (or restore) everything in the database as one JSON file.
 *
 *   node scripts/backup.js                    saves backup-YYYY-MM-DD.json  (leads, quotations, settings, logins)
 *   node scripts/backup.js --photos           also includes photos and the logo (bigger file)
 *   node scripts/backup.js restore <file>     puts a backup back (existing items with the same id are replaced)
 *
 * It reads MONGODB_URI (and MONGODB_DB) from the environment, or from a .env file next to package.json.
 * The file contains password hashes and customer details: keep it private.
 */
const fs = require('fs'), path = require('path');
require('../src/loadenv');
const { MongoClient } = require('mongodb');

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) { console.error('MONGODB_URI is not set. Put it in a .env file or in the environment.'); process.exit(1); }
  const args = process.argv.slice(2);
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 20000 });
  await client.connect();
  const db = client.db(process.env.MONGODB_DB || 'elevate_quote_desk');
  const U = db.collection('qd_users'), D = db.collection('qd_docs'), A = db.collection('qd_assets');
  try {
    if (args[0] === 'restore') {
      const file = args[1]; if (!file || !fs.existsSync(file)) { console.error('Usage: node scripts/backup.js restore <backup file>'); process.exit(1); }
      const b = JSON.parse(fs.readFileSync(file, 'utf8'));
      for (const u of b.users || []) await U.replaceOne({ _id: u._id }, u, { upsert: true });
      for (const d of b.docs || []) await D.replaceOne({ _id: d._id }, d, { upsert: true });
      for (const a of b.assets || []) await A.replaceOne({ _id: a._id }, { ...a, data: Buffer.from(a.data, 'base64') }, { upsert: true });
      console.log(`Restored ${(b.users || []).length} logins, ${(b.docs || []).length} documents, ${(b.assets || []).length} photos.`);
      return;
    }
    const out = { app: 'elevate-quote-desk', savedAt: new Date().toISOString(), users: await U.find({}).toArray(), docs: await D.find({ del: { $ne: true } }).toArray(), assets: [] };
    if (args.includes('--photos')) {
      for await (const a of A.find({})) { const buf = a.data && a.data.buffer ? Buffer.from(a.data.buffer) : Buffer.from(a.data); out.assets.push({ ...a, data: buf.toString('base64') }); }
    }
    const name = path.resolve(`backup-${new Date().toISOString().slice(0, 10)}.json`);
    fs.writeFileSync(name, JSON.stringify(out));
    console.log(`Saved ${out.users.length} logins, ${out.docs.length} documents${out.assets.length ? ', ' + out.assets.length + ' photos' : ''} to ${name}`);
    if (!out.assets.length) console.log('Photos were not included. Add --photos to include them.');
  } finally { await client.close(); }
}
main().catch(e => { console.error('Failed:', e.message); process.exit(1); });
