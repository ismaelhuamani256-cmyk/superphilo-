#!/usr/bin/env node
// Ensambla el contenido en data/cours.json y data/cours.js (cours.js permite abrir index.html sin servidor):
//   - COURS     : capítulos en español (data/capitulos/*.json + data/extras.json)
//   - COURS_FR  : versión francesa (data/fr/*.json; si falta un capítulo se usa el español)
//   - DILEMAS   : novelas interactivas (data/dilemas/*.json)
//   - EJERCICIOS: ejercicios con corrigé, sujetos del bac y cartes mentales (data/ejercicios/*.json)
// Uso: node tools/build.js
const fs = require('fs'), path = require('path');
const D = path.join(__dirname, '..', 'data');
const readDir = d => fs.existsSync(d) ? fs.readdirSync(d).filter(f => f.endsWith('.json')).sort().map(f => ({ f, j: JSON.parse(fs.readFileSync(path.join(d, f), 'utf8')) })) : [];
// normaliza todo el texto a NFC (algunos textos del PDF traen acentos descompuestos)
const nfc = o => typeof o === 'string' ? o.normalize('NFC').replace(/\u200b/g, '') : Array.isArray(o) ? o.map(nfc) : o && typeof o === 'object' ? Object.fromEntries(Object.entries(o).map(([k, v]) => [k, nfc(v)])) : o;
const rd = f => fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : null;

const es = readDir(path.join(D, 'capitulos')).map(x => x.j).sort((a, b) => a.numero - b.numero);
const frMap = Object.fromEntries(readDir(path.join(D, 'fr')).filter(x => !/^extras/.test(x.f)).map(x => [x.j.id, x.j]));
const fr = es.map(c => frMap[c.id] || c);
const extras = rd(path.join(D, 'extras.json')) || {}, extrasFr = rd(path.join(D, 'fr', 'extras.json')) || extras;
const dilemas = readDir(path.join(D, 'dilemas')).map(x => x.j);
const ejercicios = readDir(path.join(D, 'ejercicios')).map(x => ({ id: x.f.replace(/\.json$/, ''), ...x.j }));
const meta = { fuente: '665730429-ABC-Philo.pdf', generado: new Date().toISOString() };

const COURS = nfc({ idioma_detectado: 'fr', ...meta, capitulos: es, extras });
const COURS_FR = nfc({ idioma_detectado: 'fr', ...meta, capitulos: fr, extras: extrasFr });
fs.writeFileSync(path.join(D, 'cours.json'), JSON.stringify(COURS));
fs.writeFileSync(path.join(D, 'cours.js'), 'window.COURS=' + JSON.stringify(COURS) + ';\nwindow.COURS_FR=' + JSON.stringify(COURS_FR) + ';\nwindow.DILEMAS=' + JSON.stringify(nfc(dilemas)) + ';\nwindow.EJERCICIOS=' + JSON.stringify(nfc(ejercicios)) + ';');
console.log(`cours: ${es.length} capítulos, ${es.reduce((n, c) => n + c.filosofos.length, 0)} filósofos · fr: ${Object.keys(frMap).length}/${es.length} capítulos · dilemas: ${dilemas.length} · ejercicios: ${ejercicios.length}`);
