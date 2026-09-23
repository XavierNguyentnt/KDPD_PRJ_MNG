const fs = require('fs');
const html = fs.readFileSync('./dist/public/index.html','utf8');
const sc = [...html.matchAll(/<script[^>]*src="([^"]+)"[^>]*>/g)].map(m=>m[1]);
console.log('=== HTML entry scripts', sc);
for (const s of sc) {
  const c = fs.readFileSync('./dist/public'+s,'utf8');
  console.log('\nMain', s, 'size:', Math.round(c.length/1024)+'KB');
  const listFrom = c.match(/from\s*["'](\.\/[^"']+\.js)["']/g) || [];
  console.log('Static imports (from "./") count:', new Set(listFrom).size);
  for (const x of new Set(listFrom)) console.log('   ', x);
  const listDyn = c.match(/import\(\s*["'](\.\/[^"']+\.js)["']\s*\)/g) || [];
  console.log('\nDynamic chunks count:', new Set(listDyn).size);
  for (const x of new Set(listDyn)) console.log('   ', x);
}
