'use strict';
/* Builds app/index.html from the files in client/.  Run:  npm run build:client  */
const fs = require('fs'), path = require('path');
const dir = path.join(__dirname, '..', 'client');
const read = f => fs.readFileSync(path.join(dir, f), 'utf8');
const app = ['app1.js', 'app2.js', 'app3.js', 'app4.js', 'app4b.js', 'app5.js'].map(read).join('\n');
const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="robots" content="noindex,nofollow">
${read('head.html')}
</head>
<body>
<div id="app"></div>
<script>
${read('shim.js')}
</script>
<script>
${app}
</script>
</body>
</html>
`;
try { new Function(app); } catch (e) { console.error('SYNTAX ERROR in client code:', e.message); process.exit(1); }
fs.mkdirSync(path.join(__dirname, '..', 'app'), { recursive: true });
fs.writeFileSync(path.join(__dirname, '..', 'app', 'index.html'), html);
console.log('Built app/index.html (' + Math.round(html.length / 1024) + ' KB), syntax ok');
