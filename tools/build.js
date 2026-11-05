#!/usr/bin/env node
// Ensambla data/capitulos/*.json + data/extras.json en data/cours.json y data/cours.js
// (cours.js permite abrir index.html incluso sin servidor).  Uso: node tools/build.js
const fs = require('fs'), path = require('path');
const D = path.join(__dirname, '..', 'data');
const dir = path.join(D, 'capitulos');
const caps = fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => f.endsWith('.json')).sort().map(f => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'))) : [];
caps.sort((a, b) => a.numero - b.numero);
const extras = fs.existsSync(path.join(D, 'extras.json')) ? JSON.parse(fs.readFileSync(path.join(D, 'extras.json'), 'utf8')) : {};
const cours = { idioma_detectado: 'fr', fuente: '665730429-ABC-Philo.pdf', generado: new Date().toISOString(), capitulos: caps, extras };
// normaliza todo el texto a NFC (algunos textos del PDF traen acentos descompuestos)
const nfc = o => typeof o === 'string' ? o.normalize('NFC') : Array.isArray(o) ? o.map(nfc) : o && typeof o === 'object' ? Object.fromEntries(Object.entries(o).map(([k, v]) => [k, nfc(v)])) : o;
const out = nfc(cours);
fs.writeFileSync(path.join(D, 'cours.json'), JSON.stringify(out));
fs.writeFileSync(path.join(D, 'cours.js'), 'window.COURS=' + JSON.stringify(out) + ';');
console.log(`cours.json: ${caps.length} capítulos, ${caps.reduce((n, c) => n + c.filosofos.length, 0)} filósofos`);
