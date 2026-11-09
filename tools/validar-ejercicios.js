#!/usr/bin/env node
// Valida data/ejercicios/*.json: estructura, bilingüe {es,fr} y que el texto del autor esté en el PDF.
const fs = require('fs'), path = require('path');
const PAGES = path.join(__dirname, '..', 'data', 'paginas');
const norm = s => String(s).normalize('NFC').toLowerCase().replace(/[«»“”"„]/g, '').replace(/[’‘'`´]/g, "'").replace(/­|​/g, '').replace(/-\s*\n\s*/g, '').replace(/(^|\s)\d{1,2}(?=\s)/g, ' ').replace(/\s+/g, ' ').trim();
const page = n => { const f = path.join(PAGES, 'p' + String(n).padStart(3, '0') + '.txt'); return fs.existsSync(f) ? norm(fs.readFileSync(f, 'utf8')) : ''; };
const isBil = v => v && typeof v === 'object' && typeof v.es === 'string' && typeof v.fr === 'string' && v.es.trim() && v.fr.trim();
function validar(file) {
  const errs = [], warns = []; const e = m => errs.push(m), w = m => warns.push(m);
  let d; try { d = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (x) { return { errs: ['JSON inválido: ' + x.message], warns }; }
  if (!Array.isArray(d.ejercicios) || !d.ejercicios.length) e('sin ejercicios');
  const bil = (v, tag) => { if (!isBil(v)) e(tag + ': debe ser {es,fr} no vacío'); };
  const bac = d.capitulo === null;
  if (!bac) {
    const p = d.perspectivas; if (!p) e('falta perspectivas'); else {
      if (!Array.isArray(p.ramas) || p.ramas.length < 3) e('perspectivas.ramas: se esperan 3'); else p.ramas.forEach((r, i) => { bil(r.titulo, `rama${i}.titulo`); if (!r.ideas || !r.ideas.length) w(`rama${i} sin ideas`); (r.ideas || []).forEach((x, j) => bil(x.texto, `rama${i}.idea${j}`)); });
      if (!Array.isArray(p.autores) || !Array.isArray(p.nociones_liadas)) e('perspectivas: faltan autores / nociones_liadas');
    }
  }
  (d.ejercicios || []).forEach(x => {
    const t = x.id || '?'; bil(x.enunciado, t + '.enunciado'); if (!['dissertation', 'explication'].includes(x.tipo)) e(t + ': tipo inválido');
    const c = x.corrige || {}; if (!c.puntos_clave || c.puntos_clave.length < 4) e(t + ': puntos_clave (≥4)'); (c.puntos_clave || []).forEach((k, i) => bil(k, `${t}.puntos_clave${i}`));
    if (x.tipo === 'dissertation') { if (!c.plan || c.plan.length < 2) e(t + ': plan (≥2 partes)'); (c.plan || []).forEach((pt, i) => { bil(pt.parte, `${t}.plan${i}.parte`); bil(pt.idea, `${t}.plan${i}.idea`); }); if (c.problematica) bil(c.problematica, t + '.problematica'); }
    else {
      if (!x.texto || !x.texto.fr || !x.texto.autor) e(t + ': falta texto.fr / texto.autor');
      else { const pg = x.texto.pagina_pdf; const hay = [pg - 1, pg, pg + 1, pg + 2].map(page).join(' ');
        const frags = norm(x.texto.fr.replace(/\[…\]|\[\.\.\.\]|…/g, '||')).split('||').map(s => s.trim()).filter(s => s.length >= 12);
        const miss = frags.filter(f => !hay.includes(f.slice(0, 80))); if (miss.length) e(`${t}: el texto NO coincide con el PDF cerca de p${pg}: «${miss[0].slice(0, 70)}…»`); }
      bil(c.tesis, t + '.tesis'); if (!c.etapas || c.etapas.length < 2) e(t + ': etapas (≥2)'); (c.etapas || []).forEach((s, i) => { bil(s.titulo, `${t}.etapa${i}.titulo`); bil(s.idea, `${t}.etapa${i}.idea`); });
    }
    ['introduccion', 'conclusion', 'enjeu', 'orientacion'].forEach(k => { if (c[k]) bil(c[k], `${t}.${k}`); });
  });
  return { errs, warns };
}
if (require.main === module) { let bad = 0; for (const f of process.argv.slice(2)) { const { errs, warns } = validar(f); console.log(`\n== ${f}: ${errs.length} errores, ${warns.length} avisos`); errs.forEach(x => console.log('  ✗ ' + x)); warns.forEach(x => console.log('  · ' + x)); if (errs.length) bad = 1; } process.exit(bad); }
module.exports = { validar };
