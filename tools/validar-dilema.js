#!/usr/bin/env node
// Valida un dilema (novela interactiva ramificada).  Uso: node tools/validar-dilema.js data/dilemas/X.json
const fs = require('fs'), path = require('path');
const { validarEscena } = require('./validar.js');
const L = v => (v && typeof v === 'object' && !Array.isArray(v)) ? v.es : v;           // {es,fr} → es
const deepEs = o => Array.isArray(o) ? o.map(deepEs) : (o && typeof o === 'object' && ('es' in o) && ('fr' in o) && Object.keys(o).length === 2) ? o.es : (o && typeof o === 'object') ? Object.fromEntries(Object.entries(o).map(([k, v]) => [k, deepEs(v)])) : o;
const norm = s => String(s).toLowerCase().replace(/[«»“”"„]/g, '').replace(/[’‘'`´]/g, "'").replace(/­|​/g, '').normalize('NFC').replace(/-\s*\n\s*/g, '').replace(/\s+/g, ' ').trim();
const page = n => { const f = path.join(__dirname, '..', 'data', 'paginas', 'p' + String(n).padStart(3, '0') + '.txt'); return fs.existsSync(f) ? norm(fs.readFileSync(f, 'utf8').normalize('NFC')) : ''; };
function validar(file) {
  const errs = [], warns = []; const e = m => errs.push(m), w = m => warns.push(m);
  let d; try { d = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (x) { return { errs: ['JSON inválido: ' + x.message], warns }; }
  ['id', 'capitulo', 'titulo', 'premisa', 'inicio', 'nodos'].forEach(k => { if (d[k] === undefined) e('falta ' + k); });
  if (errs.length) return { errs, warns };
  const bil = (v, tag) => { if (!v || typeof v !== 'object' || !v.es || !v.fr) e(`${tag}: debe ser {es, fr}`); };
  bil(d.titulo, 'titulo'); bil(d.premisa, 'premisa');
  const N = d.nodos, ids = Object.keys(N); if (!N[d.inicio]) e('inicio inexistente');
  const finales = {};
  ids.forEach(id => {
    const n = N[id]; bil(n.narracion, id + '.narracion');
    if (!n.escena) e(id + ': sin escena'); else { const sc = deepEs(n.escena); validarEscena(sc, 'nodo ' + id, e, w); if ((sc.duracion_seg || 0) > 20) w(id + ': escena larga'); }
    if (n.final && n.decision) e(id + ': no puede tener final y decision a la vez');
    if (!n.final && !n.decision) e(id + ': sin decision ni final');
    if (n.decision) {
      bil(n.decision.pregunta, id + '.pregunta'); const o = n.decision.opciones || [];
      if (o.length < 2 || o.length > 4) e(id + ': 2-4 opciones');
      o.forEach((op, i) => { bil(op.texto, `${id}.opcion${i}`); if (!N[op.a]) e(`${id}.opcion${i}: destino inexistente "${op.a}"`); if (op.postura) bil(op.postura, `${id}.opcion${i}.postura`); });
    }
    if (n.final) {
      const f = n.final; finales[f.id] = f; ['id', 'titulo', 'tipo', 'idea', 'filosofo', 'reflexion', 'pagina_pdf'].forEach(k => { if (f[k] === undefined) e(`${id}.final falta ${k}`); });
      if (!['tragico', 'ambiguo', 'luminoso'].includes(f.tipo)) e(id + ': tipo de final inválido');
      bil(f.titulo, id + '.final.titulo'); bil(f.idea, id + '.final.idea'); bil(f.reflexion, id + '.final.reflexion');
      if (f.cita) { const t = norm(f.cita.texto), pg = f.cita.pagina_pdf; const hay = [pg - 1, pg, pg + 1].map(page).join(' ');
        const frags = norm(f.cita.texto.replace(/\[…\]|\[\.\.\.\]|…/g, '||')).split('||').map(s => s.trim()).filter(s => s.length >= 12);
        if (frags.some(fr => !hay.includes(fr))) e(`${id}: cita del final NO aparece textual en p${pg}`); }
    }
  });
  // alcanzabilidad y ausencia de ciclos infinitos
  const seen = new Set(), stack = [d.inicio]; while (stack.length) { const id = stack.pop(); if (seen.has(id) || !N[id]) continue; seen.add(id); (N[id].decision ? N[id].decision.opciones.map(o => o.a) : []).forEach(a => stack.push(a)); }
  ids.forEach(id => { if (!seen.has(id)) w(`nodo inalcanzable: ${id}`); });
  const fin = Object.values(finales); if (fin.length < 4) e('mínimo 4 finales distintos'); if (fin.filter(f => f.tipo === 'tragico').length < 2) e('mínimo 2 finales trágicos');
  const visiting = new Set(); const cyc = id => { if (visiting.has(id)) return true; if (!N[id] || !N[id].decision) return false; visiting.add(id); const r = N[id].decision.opciones.some(o => cyc(o.a)); visiting.delete(id); return r; }; if (cyc(d.inicio)) e('hay un ciclo en el grafo');
  // profundidad máxima
  const depth = (id, m = {}) => (!N[id] || !N[id].decision) ? 1 : m[id] || (m[id] = 1 + Math.max(...N[id].decision.opciones.map(o => depth(o.a, m)))); const dp = depth(d.inicio); if (dp < 5) w('profundidad baja: ' + dp);
  return { errs, warns };
}
if (require.main === module) { let bad = 0; for (const f of process.argv.slice(2)) { const { errs, warns } = validar(f); console.log(`\n== ${f}: ${errs.length} errores, ${warns.length} avisos`); errs.forEach(x => console.log('  ✗ ' + x)); warns.forEach(x => console.log('  · ' + x)); if (errs.length) bad = 1; } process.exit(bad); }
module.exports = { validar };
