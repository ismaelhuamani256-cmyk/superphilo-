#!/usr/bin/env node
// Aplica las traducciones {clave: texto_fr} sobre el JSON original y escribe la versión francesa.
//   node tools/fr-merge.js data/capitulos/08-religion.json  /ruta/08.done.json  data/fr/08-religion.json
const fs = require('fs');
const [src, done, dst] = process.argv.slice(2);
const d = JSON.parse(fs.readFileSync(src, 'utf8')), tr = JSON.parse(fs.readFileSync(done, 'utf8'));
const todo = require('./fr-extract.js'); const out = []; todo.collect(d, '', out, { extras: /extras/.test(src) });
let n = 0, miss = [];
out.forEach(([k]) => { if (typeof tr[k] !== 'string' || !tr[k].trim()) { miss.push(k); return; }
  const parts = k.split('.'); let o = d; for (let i = 0; i < parts.length - 1; i++) o = o[parts[i]]; o[parts[parts.length - 1]] = tr[k]; n++; });
fs.mkdirSync(require('path').dirname(dst), { recursive: true }); fs.writeFileSync(dst, JSON.stringify(d, null, 1));
console.log(`${n}/${out.length} traducidos` + (miss.length ? `; FALTAN ${miss.length}: ${miss.slice(0, 8).join(', ')}` : ' ✓'));
process.exit(miss.length ? 1 : 0);
