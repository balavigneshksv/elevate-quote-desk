'use strict';
/* Reads a .env file next to package.json (if there is one) so the app can be tried on a
   computer. On Render you set the same values under "Environment" instead. */
const fs = require('fs'), path = require('path');
const f = path.join(__dirname, '..', '.env');
if (fs.existsSync(f)) {
  for (const line of fs.readFileSync(f, 'utf8').split(/\r?\n/)) {
    if (/^\s*#/.test(line)) continue;
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}
