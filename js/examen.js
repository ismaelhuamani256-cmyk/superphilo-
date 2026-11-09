/* ============================================================
 * examen.js — preparación del examen: simulacro de 4 h, explicación de texto guiada,
 * entrenador de planes de disertación, sujetos del bac y cartes mentales.
 * Los datos salen de data/ejercicios/*.json (extraídos de tu libro).
 * ============================================================ */
(function (global) {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const S = global.State, P = () => S.P, T = v => global.tx(v);
  const nl = s => esc(s).replace(/\n/g, '<br>');
  const h4 = t => `<h4 style="margin:18px 0 6px;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--muted);font-weight:600">${t}</h4>`;
  let timer = 0;

  /* ---------- datos ---------- */
  const files = () => S.EJERCICIOS;
  const capOf = id => S.byCap[id];
  const authorName = (cap, id) => { const c = capOf(cap); const f = c && c.filosofos.find(x => x.id === id); return f ? f.nombre : id; };
  function checklistFromPlan(plan, cap) {
    const items = [L('Introducción con accroche, problemática y anuncio del plan', 'Introduction avec accroche, problématique et annonce du plan')];
    (plan || []).forEach(p => items.push(L('Desarrollas: ', 'Tu développes : ') + T(p.parte) + (p.autores && p.autores.length ? ' (' + p.autores.map(a => authorName(cap, a)).join(', ') + ')' : '')));
    items.push(L('Transiciones entre partes (objeción a la tesis anterior)', 'Transitions entre les parties (objection à la thèse précédente)'), L('Conclusión que responde al sujeto sin repetir el plan', 'Conclusion qui répond au sujet sans répéter le plan'));
    return items;
  }
  /** Todos los sujetos de disertación y explicación, normalizados. */
  function subjects() {
    const out = [];
    files().forEach(f => f.ejercicios.forEach(e => out.push({ id: e.id, tipo: e.tipo, cap: f.capitulo, e, titulo: T(e.enunciado), fuente: f.capitulo ? 'cap' : 'bac' })));
    S.COURS.capitulos.forEach(c => c.disertaciones.forEach((d, i) => out.push({ id: c.id + '#' + i, tipo: 'dissertation', cap: c.id, d, titulo: d.sujeto, fuente: 'plan' })));
    return out;
  }
  function checklistOf(s) {
    if (s.e) return (s.e.corrige.puntos_clave || []).map(T);
    return checklistFromPlan(s.d.plan, s.cap);
  }
  function corrigeHtml(s) {
    if (s.d) return `<p style="line-height:1.55"><b>${L('Problemática', 'Problématique')}:</b> ${esc(s.d.problematica)}</p><div class="plan">${s.d.plan.map(pt => `<div class="part"><h4>${esc(pt.parte)}</h4><div style="line-height:1.55">${esc(pt.idea)}</div><div class="chips" style="margin:6px 0">${(pt.autores || []).map(a => `<span class="chip">${esc(authorName(s.cap, a))}</span>`).join('')}</div><div style="color:var(--muted);font-size:13px"><i>${L('Ejemplo', 'Exemple')}:</i> ${esc(pt.ejemplo || '')}</div></div>`).join('')}</div>`;
    const c = s.e.corrige; let html = '';
    if (c.orientacion) html += h4(L('Orientación', 'Orientation')) + `<p style="line-height:1.55">${nl(T(c.orientacion))}</p>`;
    if (c.tesis) html += h4(L('Tesis del texto', 'Thèse du texte')) + `<div class="tesis">${esc(T(c.tesis))}</div>`;
    if (c.introduccion) html += h4(L('Introducción modelo', 'Introduction modèle')) + `<p style="line-height:1.6">${nl(T(c.introduccion))}</p>`;
    if (c.problematica) html += `<p style="line-height:1.55"><b>${L('Problemática', 'Problématique')}:</b> ${esc(T(c.problematica))}</p>`;
    if (c.plan) html += h4(L('Plan', 'Plan')) + `<div class="plan">${c.plan.map(pt => `<div class="part"><h4>${esc(T(pt.parte))}</h4><div style="line-height:1.55">${esc(T(pt.idea))}</div>${(pt.autores || []).length ? `<div class="chips" style="margin:6px 0">${pt.autores.map(a => `<span class="chip">${esc(authorName(s.cap, a))}</span>`).join('')}</div>` : ''}</div>`).join('')}</div>`;
    if (c.etapas) html += h4(L('Movimientos del texto', 'Mouvements du texte')) + `<div class="plan">${c.etapas.map(et => `<div class="part"><h4>${esc(T(et.titulo))} <span class="pg">${esc(et.lineas || '')}</span></h4><div style="line-height:1.55">${esc(T(et.idea))}</div></div>`).join('')}</div>`;
    if (c.enjeu) html += h4(L('Lo que está en juego', 'L’enjeu')) + `<p style="line-height:1.55">${nl(T(c.enjeu))}</p>`;
    if (c.conclusion) html += h4(L('Conclusión', 'Conclusion')) + `<p style="line-height:1.55">${nl(T(c.conclusion))}</p>`;
    return html;
  }
  const pg = n => n ? `<span class="pg">p.${n}</span>` : '';
  const dur = ms => { const s = Math.max(0, Math.round(ms / 1000)), h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60); return `${h}:${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };
  const words = t => (t.trim().match(/\S+/g) || []).length;

  /* ============ HUB ============ */
  function render(root, id) {
    clearInterval(timer);
    if (id === 'sim') return renderSim(root);
    if (id === 'expl') return renderExpl(root);
    if (id === 'plan') return renderPlanTrainer(root);
    if (id === 'bac') return renderBac(root);
    const act = P().simulacro, all = subjects();
    root.innerHTML = `<h1>${L('Preparar el examen', 'Préparer l’épreuve')}</h1><p class="lead">${L('El bac de filosofía son 4 horas: eliges entre 2 disertaciones y 1 explicación de texto. Aquí practicas exactamente eso, con los sujetos y corrigés de tu libro.', 'L’épreuve dure 4 heures : tu choisis entre 2 dissertations et 1 explication de texte. Ici tu t’entraînes exactement à cela, avec les sujets et corrigés de ton livre.')}</p>
      ${act ? `<div class="card" style="margin-bottom:16px;--accent:var(--bad)"><h3>${L('Tienes un simulacro en curso', 'Tu as une simulation en cours')}</h3><p style="margin:4px 0 10px;color:var(--muted)">${L('Tiempo restante', 'Temps restant')}: ${dur(act.inicio + act.dur * 60000 - Date.now())}</p><button class="btn primary" data-go="sim">${L('Continuar', 'Continuer')}</button></div>` : ''}
      <div class="grid">
        <div class="card"><h3>⏱ ${L('Simulacro de examen', 'Simulation d’examen')}</h3><p style="color:#c9c6b8;font-size:14px;line-height:1.5">${L('2 disertaciones + 1 explicación al azar, cronómetro (4 h / 2 h / 1 h / 30 min), editor con autoguardado y corrección guiada con el corrigé del libro.', '2 dissertations + 1 explication au hasard, chronomètre (4 h / 2 h / 1 h / 30 min), éditeur avec sauvegarde auto et correction guidée avec le corrigé du livre.')}</p><div class="row"><button class="btn primary sm" data-go="sim">${L('Empezar', 'Commencer')}</button></div></div>
        <div class="card"><h3>📖 ${L('Explicación de texto', 'Explication de texte')}</h3><p style="color:#c9c6b8;font-size:14px;line-height:1.5">${L('Lee el texto, subraya, formula la tesis, los movimientos y el enjeu; luego compara con el corrigé.', 'Lis le texte, surligne, formule la thèse, les mouvements et l’enjeu ; compare ensuite avec le corrigé.')} (${all.filter(s => s.tipo === 'explication').length} ${L('textos', 'textes')})</p><div class="row"><button class="btn primary sm" data-go="expl">${L('Practicar', 'S’entraîner')}</button></div></div>
        <div class="card"><h3>🧩 ${L('Entrenador de planes', 'Entraîneur de plans')}</h3><p style="color:#c9c6b8;font-size:14px;line-height:1.5">${L('Te damos las partes desordenadas de una disertación: ordénalas, asigna los autores correctos y redacta la introducción.', 'On te donne les parties désordonnées d’une dissertation : remets-les en ordre, attribue les bons auteurs et rédige l’introduction.')} (${all.filter(s => s.tipo === 'dissertation').length} ${L('sujetos', 'sujets')})</p><div class="row"><button class="btn primary sm" data-go="plan">${L('Entrenar', 'S’entraîner')}</button></div></div>
        <div class="card"><h3>📝 ${L('Sujetos del bac', 'Sujets type bac')}</h3><p style="color:#c9c6b8;font-size:14px;line-height:1.5">${L('Los 3 sujetos completos de tu libro (1 disertación, 2 explicaciones) con su corrigé, y los ejercicios de cada capítulo.', 'Les 3 sujets complets de ton livre (1 dissertation, 2 explications) avec leur corrigé, et les exercices de chaque chapitre.')}</p><div class="row"><button class="btn primary sm" data-go="bac">${L('Ver sujetos', 'Voir les sujets')}</button><button class="btn sm" data-dis>${L('Planes por noción', 'Plans par notion')}</button></div></div>
      </div>
      ${(P().simulacros || []).length ? `${h4(L('Tus simulacros', 'Tes simulations'))}<div class="card"><table class="t"><thead><tr><th>${L('Fecha', 'Date')}</th><th>${L('Sujeto', 'Sujet')}</th><th>${L('Palabras', 'Mots')}</th><th>${L('Autoevaluación', 'Autoévaluation')}</th></tr></thead><tbody>${P().simulacros.slice().reverse().slice(0, 8).map(r => `<tr><td>${new Date(r.fecha).toLocaleDateString()}</td><td>${esc(r.titulo)}</td><td>${r.palabras}</td><td><b>${r.nota}/20</b></td></tr>`).join('')}</tbody></table></div>` : ''}`;
    root.querySelectorAll('[data-go]').forEach(b => b.onclick = () => App.go('examen', b.dataset.go));
    const d = $('[data-dis]', root); if (d) d.onclick = () => App.go('disertacion');
  }

  /* ============ SIMULACRO ============ */
  function startSim(opts) {
    const all = subjects(), diss = shuffle(all.filter(s => s.tipo === 'dissertation' && s.fuente !== 'plan'))
      .concat(shuffle(all.filter(s => s.fuente === 'plan'))), expl = shuffle(all.filter(s => s.tipo === 'explication'));
    const temas = opts.temas || [diss[0].id, diss.find(s => s.cap !== diss[0].cap).id, expl[0].id];
    P().simulacro = { inicio: Date.now(), dur: opts.dur || 240, temas, elegido: null }; S.save();
  }
  function renderSim(root) {
    const sim = P().simulacro;
    if (!sim) {
      root.innerHTML = `<h1>⏱ ${L('Simulacro de examen', 'Simulation d’examen')}</h1><p class="lead">${L('Elige la duración. En el examen real tienes 4 horas para escribir sobre UNO de los tres sujetos.', 'Choisis la durée. À l’examen réel tu as 4 heures pour traiter UN des trois sujets.')}</p>
        <div class="field"><label>${L('Duración', 'Durée')}</label><div class="seg" id="sm-dur">${[[240, '4 h'], [120, '2 h'], [60, '1 h'], [30, '30 min']].map(([v, n], i) => `<button data-v="${v}" class="${i === 0 ? 'on' : ''}">${n}</button>`).join('')}</div></div>
        <button class="btn primary" id="sm-go">${L('Empezar el simulacro', 'Lancer la simulation')}</button> <button class="btn" id="sm-back">← ${L('Volver', 'Retour')}</button>`;
      let d = 240; $('#sm-dur', root).onclick = e => { const b = e.target.closest('[data-v]'); if (!b) return; d = +b.dataset.v; root.querySelectorAll('#sm-dur button').forEach(x => x.classList.toggle('on', x === b)); };
      $('#sm-go', root).onclick = () => { startSim({ dur: d }); renderSim(root); }; $('#sm-back', root).onclick = () => App.go('examen'); return;
    }
    const all = subjects(), subs = sim.temas.map(id => all.find(s => s.id === id)).filter(Boolean);
    let sel = sim.elegido ? subs.find(s => s.id === sim.elegido) : null, saveT = 0;
    const draw = () => {
      const left = sim.inicio + sim.dur * 60000 - Date.now();
      root.innerHTML = `<div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin-bottom:14px"><h1 style="font-size:32px;margin:0">⏱ ${L('Simulacro', 'Simulation')}</h1><div id="sm-time" style="font-family:var(--serif);font-size:34px;color:${left < 600000 ? 'var(--bad)' : 'var(--gold2)'}">${dur(left)}</div><div style="flex:1"></div><button class="btn primary" id="sm-end">${L('Entregar', 'Rendre la copie')}</button><button class="btn sm" id="sm-quit">${L('Abandonar', 'Abandonner')}</button></div>
        <p style="color:var(--muted);margin:0 0 12px">${L('Elige UN sujeto y escribe. Se guarda solo.', 'Choisis UN sujet et écris. La sauvegarde est automatique.')}</p>
        <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(280px,1fr));margin-bottom:16px">${subs.map((s, i) => `<button class="card" data-pick="${s.id}" style="text-align:left;${sel && sel.id === s.id ? 'border-color:var(--gold);background:rgba(224,184,98,.12)' : ''}"><div class="n">${s.tipo === 'dissertation' ? L('Disertación', 'Dissertation') : L('Explicación de texto', 'Explication de texte')} ${i + 1}</div><h3 style="font-size:20px;font-style:${s.tipo === 'dissertation' ? 'italic' : 'normal'}">${esc(s.titulo)}</h3>${s.tipo === 'explication' ? `<div style="color:var(--muted);font-size:13px">${esc(s.e.texto.autor)} · ${esc(s.e.texto.obra || '')}</div>` : ''}</button>`).join('')}</div>
        ${sel ? `<div style="display:grid;grid-template-columns:${sel.tipo === 'explication' ? 'minmax(0,1fr) minmax(0,1fr)' : '1fr'};gap:16px">${sel.tipo === 'explication' ? `<div class="card" style="max-height:62vh;overflow:auto"><p style="font-family:var(--serif);font-size:19px;line-height:1.55;margin:0">${nl(sel.e.texto.fr)}</p><p style="color:var(--muted);font-size:13px">${esc(sel.e.texto.autor)} — ${esc(sel.e.texto.obra || '')}</p></div>` : ''}<div><textarea id="sm-ed" style="min-height:52vh;font-size:16px;line-height:1.6" placeholder="${L('Escribe aquí tu copia (en francés para practicar el bac)…', 'Écris ici ta copie…')}">${esc((P().escritos['sim:' + sel.id] || {}).texto || '')}</textarea><div id="sm-wc" style="color:var(--muted);font-size:12.5px;margin-top:4px"></div></div></div>` : ''}`;
      root.querySelectorAll('[data-pick]').forEach(b => b.onclick = () => { sel = subs.find(s => s.id === b.dataset.pick); sim.elegido = sel.id; S.save(); draw(); });
      const ed = $('#sm-ed', root); if (ed) { const wc = () => $('#sm-wc', root).textContent = words(ed.value) + ' ' + L('palabras (objetivo orientativo: 800-1200)', 'mots (objectif indicatif : 800-1200)'); wc(); ed.oninput = () => { wc(); clearTimeout(saveT); saveT = setTimeout(() => { P().escritos['sim:' + sel.id] = { texto: ed.value, ts: Date.now() }; S.save(); }, 1200); }; }
      $('#sm-end', root).onclick = () => finish(); $('#sm-quit', root).onclick = () => { if (confirm(L('¿Abandonar el simulacro? Se conserva tu borrador.', 'Abandonner la simulation ? Ton brouillon est conservé.'))) { P().simulacro = null; S.save(); App.go('examen'); } };
    };
    const finish = () => {
      clearInterval(timer); if (!sel) { P().simulacro = null; S.save(); return App.go('examen'); }
      const ed = $('#sm-ed', root), texto = ed ? ed.value : ''; P().escritos['sim:' + sel.id] = { texto, ts: Date.now() }; const w = words(texto);
      const items = checklistOf(sel);
      root.innerHTML = `<h1>${L('Corrección', 'Correction')} · ${esc(sel.titulo)}</h1><p class="lead">${L('Compara tu copia con el corrigé de tu libro y marca lo que cubriste. Es una autoevaluación: sé honesto/a.', 'Compare ta copie avec le corrigé de ton livre et coche ce que tu as couvert. C’est une autoévaluation : sois honnête.')} (${w} ${L('palabras', 'mots')}, ${L('tiempo usado', 'temps utilisé')} ${dur(Date.now() - sim.inicio)})</p>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(340px,1fr));gap:18px"><div><h3 style="font-size:22px">${L('Tu copia', 'Ta copie')}</h3><div class="card" style="white-space:pre-wrap;line-height:1.6;max-height:60vh;overflow:auto">${esc(texto) || '<i style="color:var(--muted)">(vacío)</i>'}</div></div>
        <div><h3 style="font-size:22px">${L('Corrigé del libro', 'Corrigé du livre')} ${pg(sel.e ? sel.e.pagina_corrige : '')}</h3><div class="card" style="max-height:60vh;overflow:auto">${corrigeHtml(sel)}</div></div></div>
        ${h4(L('Autoevaluación', 'Autoévaluation'))}${items.map((p, i) => `<label class="chk"><input type="checkbox" data-i="${i}"><span>${esc(p)}</span></label>`).join('')}
        <div style="margin-top:14px"><button class="btn primary" id="sm-score">${L('Calcular mi nota estimada', 'Calculer ma note estimée')}</button></div><div id="sm-res"></div>`;
      $('#sm-score', root).onclick = () => {
        const n = root.querySelectorAll('.chk input:checked').length, nota = Math.round(n / items.length * 20 * 10) / 10;
        P().simulacros.push({ fecha: Date.now(), titulo: sel.titulo, palabras: w, nota, dur: Math.round((Date.now() - sim.inicio) / 60000) }); P().simulacro = null; S.log('sim', sel.cap, nota >= 10); S.addXP(15 + Math.round(nota * 2), L('simulacro', 'simulation'));
        $('#sm-res', root).innerHTML = `<div class="expl"><b>${L('Nota estimada', 'Note estimée')}: ${nota}/20.</b> ${nota >= 14 ? L('Muy buen nivel: afina los detalles.', 'Très bon niveau : affine les détails.') : nota >= 10 ? L('Aprobado: refuerza lo que te faltó (revisa el corrigé).', 'Acquis : renforce ce qui manquait (relis le corrigé).') : L('Aún falta: repasa los autores del capítulo y repite con otro sujeto.', 'Il manque encore des choses : révise les auteurs du chapitre et recommence avec un autre sujet.')}</div><div style="margin-top:12px"><button class="btn primary" id="sm-new">${L('Otro simulacro', 'Une autre simulation')}</button> <button class="btn" id="sm-hub">${L('Volver', 'Retour')}</button></div>`;
        $('#sm-score', root).disabled = true; $('#sm-new', root).onclick = () => renderSim(root); $('#sm-hub', root).onclick = () => App.go('examen');
      };
    };
    draw();
    timer = setInterval(() => { if (!root.isConnected || root.hidden) return clearInterval(timer); const left = sim.inicio + sim.dur * 60000 - Date.now(), el = $('#sm-time', root); if (el) { el.textContent = dur(left); el.style.color = left < 600000 ? 'var(--bad)' : 'var(--gold2)'; } if (left <= 0) { clearInterval(timer); toast(L('¡Se acabó el tiempo!', 'Le temps est écoulé !')); finish(); } }, 1000);
  }

  /* ============ EXPLICACIÓN DE TEXTO ============ */
  function renderExpl(root) {
    const list = subjects().filter(s => s.tipo === 'explication');
    root.innerHTML = `<h1>📖 ${L('Explicación de texto', 'Explication de texte')}</h1><p class="lead">${L('Elige un texto de tu libro. Sigue el método: tema y tesis → movimientos (étapes) → enjeu e introducción. Después compara con el corrigé.', 'Choisis un texte de ton livre. Suis la méthode : thème et thèse → mouvements (étapes) → enjeu et introduction. Compare ensuite avec le corrigé.')}</p>
      <div class="grid">${list.map(s => { const cap = capOf(s.cap); return `<div class="card" style="--accent:${cap ? capColor(cap) : 'var(--gold)'}"><div class="n">${cap ? esc(UI.titulo(cap)) : L('Sujeto del bac', 'Sujet type bac')}</div><h3 style="font-size:21px">${esc(s.e.texto.autor)}</h3><div style="color:var(--muted);font-size:13px">${esc(s.e.texto.obra || '')} ${pg(s.e.texto.pagina_pdf)}</div><p style="font-family:var(--serif);font-size:16px;line-height:1.4;color:#c9c6b8;margin:8px 0">${esc(s.e.texto.fr.slice(0, 150))}…</p><div class="row"><button class="btn primary sm" data-t="${s.id}">${L('Practicar', 'S’entraîner')}</button></div></div>`; }).join('')}</div><div style="margin-top:20px"><button class="btn" id="ex-back">← ${L('Volver', 'Retour')}</button></div>`;
    root.querySelectorAll('[data-t]').forEach(b => b.onclick = () => trainText(root, list.find(s => s.id === b.dataset.t)));
    $('#ex-back', root).onclick = () => App.go('examen');
  }
  function trainText(root, s) {
    const c = s.e.corrige, steps = [
      { k: 'tesis', t: L('1 · Tema y tesis', '1 · Thème et thèse'), ask: L('¿De qué trata el texto y cuál es su tesis? (1-2 frases)', 'De quoi parle le texte et quelle est sa thèse ? (1-2 phrases)'), rev: () => c.tesis ? `<div class="tesis">${esc(T(c.tesis))}</div>` : '' },
      { k: 'etapas', t: L('2 · Movimientos', '2 · Mouvements'), ask: L('Divide el texto en 2-3 movimientos e indica las líneas y la idea de cada uno.', 'Divise le texte en 2-3 mouvements et indique les lignes et l’idée de chacun.'), rev: () => c.etapas ? `<div class="plan">${c.etapas.map(et => `<div class="part"><h4>${esc(T(et.titulo))} <span class="pg">${esc(et.lineas || '')}</span></h4><div style="line-height:1.55">${esc(T(et.idea))}</div></div>`).join('')}</div>` : '' },
      { k: 'intro', t: L('3 · Enjeu e introducción', '3 · Enjeu et introduction'), ask: L('Escribe tu introducción (tema, problema, tesis, anuncio de movimientos) y el enjeu filosófico.', 'Rédige ton introduction (thème, problème, thèse, annonce des mouvements) et l’enjeu philosophique.'), rev: () => (c.introduccion ? h4(L('Introducción modelo', 'Introduction modèle')) + `<p style="line-height:1.6">${nl(T(c.introduccion))}</p>` : '') + (c.enjeu ? h4(L('Enjeu', 'Enjeu')) + `<p style="line-height:1.55">${nl(T(c.enjeu))}</p>` : '') },
    ];
    root.innerHTML = `<div style="display:flex;gap:10px;align-items:center;margin-bottom:12px"><button class="btn sm" id="tt-back">← ${L('Textos', 'Textes')}</button><h2 style="margin:0;font-size:26px">${esc(s.e.texto.autor)} ${pg(s.e.texto.pagina_pdf)}</h2></div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(360px,1fr));gap:18px"><div><div class="card" id="tt-text" style="max-height:70vh;overflow:auto"><div style="display:flex;gap:8px;margin-bottom:8px"><button class="btn sm" id="tt-mark">🖍 ${L('Subrayar selección', 'Surligner la sélection')}</button><button class="btn sm" id="tt-clear">${L('Quitar subrayados', 'Effacer')}</button><button class="btn sm" id="tt-say">🔊 ${L('Escuchar el texto', 'Écouter le texte')}</button></div><p style="font-family:var(--serif);font-size:20px;line-height:1.6;margin:0" id="tt-p">${nl(s.e.texto.fr)}</p><p style="color:var(--muted);font-size:13px">${esc(s.e.texto.obra || '')}</p></div>
        <p style="color:var(--muted);font-size:13px">${esc(T(s.e.consigna || s.e.enunciado))}</p></div>
      <div id="tt-steps">${steps.map((st, i) => `<div class="card" style="margin-bottom:12px"><h3 style="font-size:20px">${st.t}</h3><p style="margin:4px 0 8px;color:#c9c6b8;font-size:14px">${st.ask}</p><textarea data-s="${i}" style="min-height:90px"></textarea><div style="margin-top:8px"><button class="btn sm" data-rev="${i}">${L('Ver el corrigé', 'Voir le corrigé')}</button></div><div data-out="${i}"></div></div>`).join('')}
        <div class="card"><h3 style="font-size:20px">${L('Autoevaluación final', 'Autoévaluation finale')}</h3>${(c.puntos_clave || []).map(T).map(p => `<label class="chk"><input type="checkbox"><span>${esc(p)}</span></label>`).join('')}<div style="margin-top:10px"><button class="btn primary" id="tt-done">${L('Terminar', 'Terminer')}</button></div><div id="tt-res"></div></div></div></div>`;
    $('#tt-back', root).onclick = () => renderExpl(root);
    $('#tt-mark', root).onclick = () => { const sel = getSelection(); if (!sel.rangeCount || sel.isCollapsed || !$('#tt-p', root).contains(sel.anchorNode)) return toast(L('Selecciona texto primero', 'Sélectionne d’abord du texte')); const r = sel.getRangeAt(0), m = document.createElement('mark'); m.style.cssText = 'background:rgba(242,194,48,.55);color:inherit;border-radius:3px'; try { r.surroundContents(m); } catch (e) { toast(L('Selecciona dentro de un mismo párrafo', 'Sélectionne dans un même paragraphe')); } sel.removeAllRanges(); };
    $('#tt-say', root).onclick = () => Voz.playQ([{ text: s.e.texto.fr, lang: 'fr', label: s.e.texto.autor }], s.e.texto.autor);
    $('#tt-clear', root).onclick = () => { const p = $('#tt-p', root); p.innerHTML = nl(s.e.texto.fr); };
    root.querySelectorAll('[data-rev]').forEach(b => b.onclick = () => { const i = +b.dataset.rev; $(`[data-out="${i}"]`, root).innerHTML = `<div class="expl">${steps[i].rev() || L('El libro no da este apartado.', 'Le livre ne donne pas cette partie.')}</div>`; b.hidden = true; });
    $('#tt-done', root).onclick = () => { const n = root.querySelectorAll('.chk input:checked').length, tot = (c.puntos_clave || []).length || 1; S.log('expl', s.cap, n / tot >= .6); S.addXP(10 + Math.round(15 * n / tot), L('explicación', 'explication')); $('#tt-res', root).innerHTML = `<div class="expl">${n}/${tot} ${L('criterios cubiertos', 'critères couverts')}.</div>`; $('#tt-done', root).disabled = true; global.__onProgress && global.__onProgress(); };
  }

  /* ============ ENTRENADOR DE PLANES ============ */
  function renderPlanTrainer(root, capId, idx) {
    const caps = S.COURS.capitulos, cap = S.byCap[capId] || caps[0], i = idx || 0, d = cap.disertaciones[i] || cap.disertaciones[0];
    const byId = Object.fromEntries(cap.filosofos.map(f => [f.id, f])); const order = shuffle(d.plan.map((_, k) => k)); const asg = d.plan.map(() => new Set());
    const draw = () => {
      root.innerHTML = `<h1>🧩 ${L('Entrenador de planes', 'Entraîneur de plans')}</h1><p class="lead">${L('Ordena las partes (I, II, III) y atribuye los autores a cada una. Después redacta la introducción.', 'Remets les parties dans l’ordre (I, II, III) et attribue les auteurs à chacune. Rédige ensuite l’introduction.')}</p>
        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:14px"><select id="pt-cap">${caps.map(c => `<option value="${c.id}" ${c.id === cap.id ? 'selected' : ''}>${c.numero}. ${esc(c.titulo)}</option>`).join('')}</select><select id="pt-sub">${cap.disertaciones.map((x, k) => `<option value="${k}" ${k === i ? 'selected' : ''}>${esc(x.sujeto.slice(0, 80))}</option>`).join('')}</select></div>
        <div class="tesis" style="font-style:italic">${esc(d.sujeto)}</div><p style="color:var(--muted);font-size:13px">${L('Plan', 'Plan')} ${esc(d.tipo_plan)} · ${L('autores disponibles', 'auteurs disponibles')}: ${cap.filosofos.map(f => esc(f.nombre)).join(', ')}</p>
        <div id="pt-parts">${order.map((k, pos) => `<div class="card" style="margin:10px 0"><div style="display:flex;gap:10px;align-items:flex-start"><div style="display:flex;flex-direction:column;gap:4px"><button class="btn sm" data-up="${pos}" ${pos === 0 ? 'disabled' : ''}>↑</button><button class="btn sm" data-down="${pos}" ${pos === order.length - 1 ? 'disabled' : ''}>↓</button></div><div style="flex:1"><div style="color:var(--gold2);font-family:var(--serif);font-size:20px">${['I', 'II', 'III', 'IV'][pos]}.</div><div style="line-height:1.55;margin:4px 0">${esc(d.plan[k].idea)}</div><div class="chips">${cap.filosofos.map(f => `<button class="chip link ${asg[k].has(f.id) ? '' : ''}" data-au="${k}|${f.id}" style="${asg[k].has(f.id) ? 'background:rgba(224,184,98,.25);border-color:var(--gold)' : ''}">${esc(f.nombre)}</button>`).join('')}</div></div></div></div>`).join('')}</div>
        ${h4(L('Introducción', 'Introduction'))}<textarea id="pt-intro" placeholder="${L('Accroche + definición de términos + problemática + anuncio del plan…', 'Accroche + définition des termes + problématique + annonce du plan…')}"></textarea>
        <div style="margin-top:12px"><button class="btn primary" id="pt-check">${L('Comprobar', 'Vérifier')}</button></div><div id="pt-res"></div>`;
      $('#pt-cap', root).onchange = e => renderPlanTrainer(root, e.target.value, 0); $('#pt-sub', root).onchange = e => renderPlanTrainer(root, cap.id, +e.target.value);
      root.querySelectorAll('[data-up]').forEach(b => b.onclick = () => { const p = +b.dataset.up;[order[p - 1], order[p]] = [order[p], order[p - 1]]; keep(); });
      root.querySelectorAll('[data-down]').forEach(b => b.onclick = () => { const p = +b.dataset.down;[order[p + 1], order[p]] = [order[p], order[p + 1]]; keep(); });
      root.querySelectorAll('[data-au]').forEach(b => b.onclick = () => { const [k, f] = b.dataset.au.split('|'); asg[+k].has(f) ? asg[+k].delete(f) : asg[+k].add(f); keep(); });
      $('#pt-check', root).onclick = check;
    };
    const keep = () => { const t = $('#pt-intro', root).value; draw(); $('#pt-intro', root).value = t; };
    const check = () => {
      let ok = 0, a = 0, A = 0; order.forEach((k, pos) => { if (k === pos) ok++; });
      d.plan.forEach((pt, k) => { const truth = new Set(pt.autores || []); const mine = asg[k]; truth.forEach(t => { A++; if (mine.has(t)) a++; }); });
      const sOrder = ok / d.plan.length, sAut = A ? a / A : 1, total = Math.round((sOrder * 0.5 + sAut * 0.5) * 100);
      S.log('plan', cap.id, total >= 60); S.addXP(5 + Math.round(total / 5), L('plan entrenado', 'plan entraîné')); S.markRespuesta(cap.id, null, total >= 60);
      $('#pt-res', root).innerHTML = `<div class="expl"><b>${total}%</b> — ${L('orden', 'ordre')}: ${ok}/${d.plan.length} · ${L('autores acertados', 'auteurs trouvés')}: ${a}/${A}<br>${L('Checklist de introducción', 'Checklist d’introduction')}: accroche · ${L('definición', 'définition')} · ${L('problemática', 'problématique')} · ${L('anuncio del plan', 'annonce du plan')}</div>${h4(L('Plan correcto', 'Plan correct'))}<div class="card">${corrigeHtml({ d, cap: cap.id })}</div>`;
      global.__onProgress && global.__onProgress();
    };
    draw();
  }

  /* ============ SUJETOS DEL BAC ============ */
  function renderBac(root) {
    const bac = subjects().filter(s => s.fuente === 'bac'), rest = subjects().filter(s => s.fuente === 'cap');
    const card = s => { const cap = capOf(s.cap); return `<div class="card" style="--accent:${cap ? capColor(cap) : 'var(--gold)'}"><div class="n">${s.tipo === 'dissertation' ? L('Disertación', 'Dissertation') : L('Explicación', 'Explication')}${cap ? ' · ' + esc(UI.titulo(cap)) : ''}</div><h3 style="font-size:20px;${s.tipo === 'dissertation' ? 'font-style:italic' : ''}">${esc(s.titulo)}</h3>${s.tipo === 'explication' ? `<div style="color:var(--muted);font-size:13px">${esc(s.e.texto.autor)}</div>` : ''}<div class="row"><button class="btn sm primary" data-w="${s.id}">${L('Escribir con cronómetro', 'Écrire chronométré')}</button><button class="btn sm" data-c="${s.id}">${L('Ver corrigé', 'Voir le corrigé')}</button></div></div>`; };
    root.innerHTML = `<h1>📝 ${L('Sujetos tipo bac', 'Sujets type bac')}</h1><p class="lead">${L('Los 3 sujetos completos del final del libro y, abajo, los ejercicios de cada capítulo. «Escribir con cronómetro» abre el simulacro solo con ese sujeto.', 'Les 3 sujets complets de la fin du livre et, en dessous, les exercices de chaque chapitre. « Écrire chronométré » ouvre la simulation avec ce seul sujet.')}</p>
      <div class="grid">${bac.map(card).join('')}</div>${h4(L('Ejercicios de cada capítulo', 'Exercices de chaque chapitre'))}<div class="grid">${rest.map(card).join('')}</div><div style="margin-top:20px"><button class="btn" id="bc-back">← ${L('Volver', 'Retour')}</button></div>`;
    root.querySelectorAll('[data-w]').forEach(b => b.onclick = () => { startSim({ temas: [b.dataset.w], dur: 240 }); App.go('examen', 'sim'); });
    root.querySelectorAll('[data-c]').forEach(b => b.onclick = () => { const s = subjects().find(x => x.id === b.dataset.c); const c = UI.openModal(`<h2>${esc(s.titulo)}</h2>${s.tipo === 'explication' ? `<div class="card" style="margin-bottom:12px"><p style="font-family:var(--serif);font-size:19px;line-height:1.55;margin:0">${nl(s.e.texto.fr)}</p><p style="color:var(--muted);font-size:13px;margin:6px 0 0">${esc(s.e.texto.autor)} — ${esc(s.e.texto.obra || '')}</p></div>` : ''}${corrigeHtml(s)}`); });
    $('#bc-back', root).onclick = () => App.go('examen');
  }

  /* ============ CARTE MENTALE ============ */
  function openCarte(capId) {
    const cap = S.byCap[capId], f = files().find(x => x.capitulo === capId), pe = f && f.perspectivas;
    if (!pe) return toast(L('No hay carte mentale para este capítulo', 'Pas de carte mentale pour ce chapitre'));
    const col = capColor(cap), cols = pe.ramas.length;
    const c = UI.openModal(`<h2>🧠 ${L('Carte mentale', 'Carte mentale')} · ${esc(cap.titulo)} ${pg(pe.pagina_pdf)}</h2>
      <div style="text-align:center;margin-bottom:6px"><span style="display:inline-block;padding:12px 28px;border:2px solid ${col};border-radius:99px;font-family:var(--serif);font-size:28px;color:${col}">${esc(cap.titulo)}</span></div>
      <svg viewBox="0 0 900 40" style="width:100%;height:40px;display:block"><g fill="none" stroke="${col}" stroke-width="2" opacity=".6">${pe.ramas.map((_, k) => `<path d="M450,0 C450,24 ${900 / cols * (k + .5)},10 ${900 / cols * (k + .5)},40"/>`).join('')}</g></svg>
      <div style="display:grid;grid-template-columns:repeat(${cols},minmax(0,1fr));gap:14px">${pe.ramas.map(r => `<div><div class="tesis" style="border-color:${col};font-size:18px;margin-bottom:8px">${esc(T(r.titulo))}</div>${r.ideas.map(i => `<div class="cita" style="margin:6px 0;padding:9px 11px"><div style="font-size:14px;line-height:1.45">${esc(T(i.texto))}</div><small>${i.autor ? '<b>' + esc(i.autor) + '</b> ' : ''}${i.cours ? '· cours ' + esc(i.cours) : ''}</small></div>`).join('') || '<div class="cita"><small>—</small></div>'}</div>`).join('')}</div>
      ${h4(L('Autores', 'Auteurs'))}<div class="chips">${pe.autores.map(a => `<span class="chip">${esc(a)}</span>`).join('')}</div>${h4(L('Nociones relacionadas', 'Notions liées'))}<div class="chips">${pe.nociones_liadas.map(n => { const t = S.COURS.capitulos.find(x => x.id === n || x.titulo.toLowerCase().includes(String(n).toLowerCase())); return `<span class="chip ${t ? 'link' : ''}" ${t ? `data-n="${t.id}"` : ''}>${esc(n)}</span>`; }).join('')}</div>`);
    c.classList.add('game'); c.querySelectorAll('[data-n]').forEach(b => b.onclick = () => { UI.closeModal(); App.go('map', b.dataset.n); });
  }

  global.Examen = { render, openCarte, subjects };
})(window);
