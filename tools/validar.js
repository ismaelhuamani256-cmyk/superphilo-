#!/usr/bin/env node
// Validador de capítulos: esquema + escenas + fidelidad de citas contra el texto del PDF.
// Uso: node tools/validar.js data/capitulos/08-religion.json
const fs = require('fs');
const path = require('path');

const ACTORES = ['monigote','silueta_grande','libro','sol','arbol','reloj','cadena','martillo','balanza','corazon','cerebro','nube','casa','piedra','espejo','puerta','caja','estrella','corona','bandera','moneda','engranaje','fuego','ojo','interrogacion','bombilla','rayo','flor','texto'];
const ACCIONES = {
  aparece: ['actor'], desaparece: ['actor'], mueve: ['actor', 'a'], dice: ['actor', 'texto'], piensa: ['actor', 'texto'],
  proyecta: ['de', 'a'], une: ['de', 'a'], resalta: ['actor'], tiembla: ['actor'], salta: ['actor'],
  etiqueta: ['actor', 'texto'], cita: ['texto'], subtitulo: ['texto'],
};
const PAGES = path.join(__dirname, '..', 'data', 'paginas');

// Normaliza para comparar citas (comillas, espacios, guiones de fin de línea, mayúsculas)
const norm = s => String(s).toLowerCase()
  .replace(/[«»“”"„]/g, '').replace(/[’‘'`´]/g, "'").replace(/­|​/g, '')
  .replace(/-\s*\n\s*/g, '').replace(/\s+/g, ' ').replace(/[…]|\[\.\.\.\]|\[…\]/g, ' ').trim();
const pageText = n => {
  const f = path.join(PAGES, 'p' + String(n).padStart(3, '0') + '.txt');
  return fs.existsSync(f) ? norm(fs.readFileSync(f, 'utf8')) : '';
};

function validar(file) {
  const errs = [], warns = [];
  let d;
  try { d = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { return { errs: ['JSON inválido: ' + e.message], warns }; }
  const e = m => errs.push(m), w = m => warns.push(m);
  ['id','numero','titulo','titulo_es','resumen','paginas','puntos_incontournables','nociones_clave','problematicas_bac','conceptos','filosofos','relaciones','quiz','preguntas_abiertas','disertaciones']
    .forEach(k => { if (d[k] === undefined) e('falta campo: ' + k); });
  if (errs.length) return { errs, warns };
  const ids = new Set([...(d.filosofos || []).map(f => f.id), ...(d.conceptos || []).map(c => c.id)]);
  if (d.filosofos.length < 3) e('menos de 3 filósofos');
  if (d.relaciones.length < 4) w('pocas relaciones');
  if (d.quiz.length < 8) e('quiz con menos de 8 preguntas');
  if (d.preguntas_abiertas.length < 2) e('menos de 2 preguntas abiertas');
  if (d.disertaciones.length < 2) e('menos de 2 disertaciones');

  d.relaciones.forEach((r, i) => {
    if (!ids.has(r.de) || !ids.has(r.a)) e(`relacion[${i}] referencia id inexistente (${r.de} → ${r.a})`);
    if (!['influye', 'se opone', 'complementa'].includes(r.tipo)) e(`relacion[${i}] tipo inválido: ${r.tipo}`);
  });
  d.quiz.forEach((q, i) => {
    if (!Array.isArray(q.opciones) || q.opciones.length !== 4) e(`quiz[${i}] debe tener 4 opciones`);
    if (!Number.isInteger(q.correcta) || q.correcta < 0 || q.correcta > 3) e(`quiz[${i}] correcta inválida`);
    if (!q.explicacion) e(`quiz[${i}] sin explicacion`);
  });
  d.disertaciones.forEach((x, i) => (x.plan || []).forEach(p => (p.autores || []).forEach(a => { if (!ids.has(a)) w(`disertacion[${i}] autor fuera del mapa: ${a}`); })));

  d.filosofos.forEach(f => {
    const tag = `filosofo ${f.id}`;
    ['nombre','epoca','tesis_principal','ideas_clave','citas','debate_con','como_usarlo_en_disertacion','escena'].forEach(k => { if (f[k] === undefined) e(`${tag}: falta ${k}`); });
    (f.debate_con || []).forEach(x => { if (!ids.has(x)) w(`${tag}: debate_con id fuera del mapa: ${x}`); });
    (f.citas || []).forEach((c, i) => {
      const t = norm(c.texto);
      // se admite la cita partida por "[…]": cada fragmento (>=25 chars) debe aparecer
      const frags = t.split('  ').flatMap(x => x.split(' ')).length ? norm(c.texto.replace(/\[…\]|\[\.\.\.\]|…/g, '||')).split('||').map(s => s.trim()).filter(s => s.length >= 12) : [t];
      const hay = [c.pagina_pdf - 1, c.pagina_pdf, c.pagina_pdf + 1].map(pageText).join(' ');
      const bad = frags.filter(fr => !hay.includes(fr));
      if (bad.length) e(`${tag}: cita[${i}] NO aparece textual en p${c.pagina_pdf}: «${bad[0].slice(0, 60)}…»`);
    });
    if (f.escena) validarEscena(f.escena, tag, e, w);
  });
  return { errs, warns };
}

function validarEscena(s, tag, e, w) {
  if (!s.actores || !s.pasos) return e(`${tag}: escena sin actores/pasos`);
  if (s.actores.length > 12) w(`${tag}: demasiados actores`);
  const act = new Map();
  s.actores.forEach(a => {
    if (!ACTORES.includes(a.tipo)) e(`${tag}: tipo de actor inválido "${a.tipo}"`);
    if (!Array.isArray(a.pos) || a.pos.length !== 2 || a.pos.some(v => v < 0 || v > 1)) e(`${tag}: pos inválida de ${a.id}`);
    act.set(a.id, false);
  });
  let last = -1; const shown = new Set();
  s.pasos.forEach((p, i) => {
    if (!ACCIONES[p.accion]) return e(`${tag}: accion inválida "${p.accion}" (paso ${i})`);
    if (typeof p.t !== 'number' || p.t < last) e(`${tag}: t no creciente en paso ${i}`);
    last = p.t;
    ACCIONES[p.accion].forEach(k => { if (p[k] === undefined) e(`${tag}: paso ${i} (${p.accion}) falta "${k}"`); });
    ['actor', 'de', 'a'].forEach(k => {
      if (typeof p[k] === 'string') {
        if (!act.has(p[k])) return e(`${tag}: paso ${i} usa actor inexistente "${p[k]}"`);
        if (p.accion === 'aparece') shown.add(p[k]);
        else if (!shown.has(p[k])) w(`${tag}: paso ${i} usa "${p[k]}" antes de aparecer`);
      }
    });
    if (p.accion === 'aparece') shown.add(p.actor);
    if (['dice', 'piensa'].includes(p.accion) && p.texto && p.texto.length > 70) w(`${tag}: texto largo en paso ${i}`);
  });
  if (s.pasos.length && s.pasos[s.pasos.length - 1].accion !== 'subtitulo') w(`${tag}: la escena no termina con subtitulo`);
}

if (require.main === module) {
  let fail = 0;
  for (const f of process.argv.slice(2)) {
    const { errs, warns } = validar(f);
    console.log(`\n== ${f}: ${errs.length} errores, ${warns.length} avisos`);
    errs.forEach(x => console.log('  ✗ ' + x));
    warns.forEach(x => console.log('  · ' + x));
    if (errs.length) fail = 1;
  }
  process.exit(fail);
}
module.exports = { validar };
