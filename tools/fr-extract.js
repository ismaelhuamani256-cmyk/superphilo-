#!/usr/bin/env node
// Extrae los textos traducibles (ES→FR) de un capítulo o de extras.json a una lista plana.
//   node tools/fr-extract.js data/capitulos/08-religion.json  /ruta/08.todo.json
// Luego se traduce a {clave: texto_fr} y  tools/fr-merge.js  genera la versión francesa completa.
const fs = require('fs');
const KEYS = new Set(['resumen','definicion','tesis_principal','como_usarlo_en_disertacion','escena_sugerida','nota','explicacion','problematica','parte','idea','ejemplo','epoca','definicion_es','nota_es','observacion','descripcion']);
const ARR = new Set(['puntos_incontournables','ideas_clave','puntos_clave']);
const ES = /[¿¡ñ]|\b(el|los|las|una|es|del|por|para|con|qué|cómo|según|como|pero|sin)\b/i;
function collect(node, path, out, ctx) {
  if (Array.isArray(node)) { node.forEach((v, i) => { if (typeof v === 'string') { if (ctx.arr) out.push([path + '.' + i, v]); } else collect(v, path + '.' + i, out, {}); }); return; }
  if (!node || typeof node !== 'object') return;
  for (const [k, v] of Object.entries(node)) {
    const p = path ? path + '.' + k : k;
    if (k === 'citas') continue;
    if (typeof v === 'string') {
      if (!v.trim()) continue;
      if (KEYS.has(k)) out.push([p, v]);
      else if (k === 'texto' && ['dice', 'piensa', 'subtitulo', 'etiqueta'].includes(node.accion)) out.push([p, v]);
      else if (k === 'etiqueta' && node.tipo) out.push([p, v]);
      else if (k === 'pregunta' && ES.test(v)) out.push([p, v]);
      else if (k === 'titulo' && ctx.extras) out.push([p, v]);
    } else if (Array.isArray(v) && ARR.has(k)) collect(v, p, out, { arr: true });
    else if (Array.isArray(v) && k === 'opciones') { if (v.some(x => ES.test(x))) v.forEach((x, i) => out.push([p + '.' + i, x])); }
    else collect(v, p, out, { extras: ctx.extras });
  }
}
if (require.main === module) {
  const [src, dst] = process.argv.slice(2); const d = JSON.parse(fs.readFileSync(src, 'utf8')); const out = [];
  collect(d, '', out, { extras: /extras/.test(src) });
  fs.writeFileSync(dst, JSON.stringify(Object.fromEntries(out), null, 1)); console.log(out.length + ' textos → ' + dst);
}
module.exports = { collect };
