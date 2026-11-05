/* ============================================================
 * estudio.js — tarjetas con repetición espaciada, índice de autores,
 * plan de estudio hasta el examen y estadísticas.
 * ============================================================ */
(function (global) {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const S = global.State, P = () => S.P;
  const h4 = t => `<h4 style="margin:18px 0 6px;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--muted);font-weight:600">${t}</h4>`;
  const pg = n => n ? `<span class="pg">p.${n}</span>` : '';
  const today = () => { const d = new Date(); return Math.floor((d.getTime() - d.getTimezoneOffset() * 60000) / 86400000); };
  const dayStr = n => new Date(n * 86400000).toISOString().slice(0, 10);
  let keyH = null;

  /* ======================================================
   * TARJETAS (SRS tipo SM-2 simplificado)
   * ====================================================== */
  const TYPES = { aut: ['Autor → tesis', 'Auteur → thèse'], cita: ['Cita → autor', 'Citation → auteur'], con: ['Concepto → definición', 'Concept → définition'], rep: ['Repères', 'Repères'] };
  function buildCards() {
    const cards = [];
    S.COURS.capitulos.forEach(c => {
      c.filosofos.forEach(f => {
        cards.push({ id: `aut:${c.id}/${f.id}`, tipo: 'aut', cap: c.id, fil: f.id, front: `<div class="n" style="color:var(--muted);font-size:12px;letter-spacing:.12em">${esc(c.titulo)}</div><div style="font-family:var(--serif);font-size:34px;color:var(--gold2)">${esc(f.nombre)}</div><div style="color:var(--muted);margin-top:6px">${L('¿Cuál es su tesis principal?', 'Quelle est sa thèse principale ?')}</div>`, back: `<div style="font-family:var(--serif);font-size:23px;line-height:1.4">${esc(f.tesis_principal)}</div><ul style="text-align:left;margin:12px 0 0;color:#c9c6b8;font-size:14px;line-height:1.5">${f.ideas_clave.slice(0, 3).map(x => `<li>${esc(x)}</li>`).join('')}</ul>` });
        (f.citas || []).forEach((q, i) => cards.push({ id: `cita:${c.id}/${f.id}/${i}`, tipo: 'cita', cap: c.id, fil: f.id, front: `<div style="font-family:var(--serif);font-style:italic;font-size:25px;line-height:1.4">« ${esc(q.texto)} »</div><div style="color:var(--muted);margin-top:10px">${L('¿Quién lo dice?', 'Qui l’a écrit ?')}</div>`, back: `<div style="font-family:var(--serif);font-size:34px;color:var(--gold2)">${esc(f.nombre)}</div><div style="color:var(--muted);margin-top:6px">${esc(q.obra || '')} ${pg(q.pagina_pdf)}</div><div style="margin-top:8px;color:#c9c6b8">${esc(c.titulo)}</div>` }));
      });
      c.conceptos.forEach(k => cards.push({ id: `con:${c.id}/${k.id}`, tipo: 'con', cap: c.id, fil: null, front: `<div class="n" style="color:var(--muted);font-size:12px">${esc(c.titulo)}</div><div style="font-family:var(--serif);font-size:32px;color:var(--gold2)">${esc(k.nombre)}</div>`, back: `<div style="font-size:18px;line-height:1.5">${esc(k.definicion)}</div>${pg(k.pagina_pdf)}` }));
    });
    ((S.COURS.extras || {}).reperes || []).forEach((r, i) => cards.push({ id: 'rep:' + i, tipo: 'rep', cap: null, fil: null, front: `<div style="font-family:var(--serif);font-size:32px;color:var(--gold2)">${esc(r.termino_fr)}</div>`, back: `<div style="font-size:17px;line-height:1.5">${esc(r.definicion_es)}</div>${pg(r.pagina_pdf)}` }));
    return cards;
  }
  function grade(id, g) {
    const st = P().cards[id] || { ef: 2.5, int: 0, rep: 0, due: 0 }, t = today();
    if (g === 0) { st.rep = 0; st.int = 0; st.ef = Math.max(1.3, st.ef - 0.2); st.due = t; }
    else if (g === 1) { st.int = Math.max(1, Math.round((st.int || 1) * 1.2)); st.ef = Math.max(1.3, st.ef - 0.15); st.due = t + st.int; st.rep++; }
    else { st.int = st.rep === 0 ? 1 : st.rep === 1 ? 3 : Math.round(st.int * st.ef * (g === 3 ? 1.3 : 1)); if (g === 3) st.ef += 0.1; st.rep++; st.due = t + Math.max(1, st.int); }
    P().cards[id] = st; S.log('card', null, g >= 2); S.save();
  }
  function renderCards(root, id) {
    if (keyH) { removeEventListener('keydown', keyH); keyH = null; }
    const all = buildCards(), t = today(), caps = S.COURS.capitulos, opt = { cap: 'all', tipos: new Set(Object.keys(TYPES)), nuevas: 15, fil: null };
    if (id && id.startsWith('fil:')) opt.fil = id.slice(4);
    const filt = () => all.filter(c => opt.tipos.has(c.tipo) && (opt.cap === 'all' || c.cap === opt.cap || (c.tipo === 'rep' && opt.cap === 'rep')) && (!opt.fil || c.fil === opt.fil));
    const stats = () => { const f = filt(), due = f.filter(c => P().cards[c.id] && P().cards[c.id].due <= t).length, nuevas = f.filter(c => !P().cards[c.id]).length, apr = f.filter(c => P().cards[c.id] && P().cards[c.id].int >= 7).length; return { due, nuevas, apr, tot: f.length }; };
    const home = () => {
      const s = stats();
      root.innerHTML = `<h1>🃏 ${L('Tarjetas', 'Cartes')}</h1><p class="lead">${L('Repetición espaciada: lo que fallas vuelve pronto, lo que dominas vuelve cada vez más tarde. 10 minutos al día valen más que 2 horas el día antes.', 'Répétition espacée : ce que tu rates revient vite, ce que tu maîtrises revient de plus en plus tard. 10 minutes par jour valent mieux que 2 heures la veille.')}${opt.fil ? ` <b>${L('Filtrando por un autor.', 'Filtré par auteur.')}</b>` : ''}</p>
        <div class="kpis"><div class="kpi"><b>${s.due}</b><span>${L('para repasar hoy', 'à revoir aujourd’hui')}</span></div><div class="kpi"><b>${s.nuevas}</b><span>${L('nuevas', 'nouvelles')}</span></div><div class="kpi"><b>${s.apr}</b><span>${L('bien aprendidas (≥7 días)', 'bien apprises (≥7 jours)')}</span></div><div class="kpi"><b>${s.tot}</b><span>${L('tarjetas en este filtro', 'cartes dans ce filtre')}</span></div></div>
        <div class="field"><label>${L('Capítulo', 'Chapitre')}</label><select id="fc-cap"><option value="all">${L('Todos', 'Tous')}</option>${caps.map(c => `<option value="${c.id}" ${opt.cap === c.id ? 'selected' : ''}>${c.numero}. ${esc(c.titulo)}</option>`).join('')}</select></div>
        <div class="field"><label>${L('Tipos', 'Types')}</label>${Object.entries(TYPES).map(([k, n]) => `<label class="chk" style="display:inline-flex;margin-right:8px"><input type="checkbox" data-t="${k}" ${opt.tipos.has(k) ? 'checked' : ''}><span>${L(n[0], n[1])}</span></label>`).join('')}</div>
        <button class="btn primary" id="fc-go" ${s.due + Math.min(s.nuevas, opt.nuevas) ? '' : 'disabled'}>${L('Empezar sesión', 'Commencer la session')} (${s.due + Math.min(s.nuevas, opt.nuevas)})</button>`;
      $('#fc-cap', root).onchange = e => { opt.cap = e.target.value; home(); };
      root.querySelectorAll('[data-t]').forEach(b => b.onchange = () => { b.checked ? opt.tipos.add(b.dataset.t) : opt.tipos.delete(b.dataset.t); home(); });
      $('#fc-go', root).onclick = () => session();
    };
    const session = () => {
      const f = filt(), due = shuffle(f.filter(c => P().cards[c.id] && P().cards[c.id].due <= t)), nuevas = shuffle(f.filter(c => !P().cards[c.id])).slice(0, opt.nuevas);
      const q = due.concat(nuevas); let n = 0, good = 0; const total = q.length;
      const next = () => {
        if (!q.length) return done();
        const c = q[0]; let shown = false;
        root.innerHTML = `<div style="max-width:760px;margin:0 auto"><div class="qtop"><span>${total - q.length + 1}/${total}</span><div class="qprog"><i style="width:${(total - q.length) / total * 100}%"></i></div><button class="btn sm" id="fc-exit">${L('Salir', 'Quitter')}</button></div>
          <div class="card" id="fc-card" style="min-height:300px;display:grid;place-items:center;text-align:center;cursor:pointer;padding:30px"><div id="fc-face">${c.front}</div></div>
          <div id="fc-act" style="margin-top:14px;text-align:center"><button class="btn primary" id="fc-flip">${L('Mostrar respuesta', 'Montrer la réponse')} <small style="opacity:.6">(Espacio)</small></button></div></div>`;
        const flip = () => {
          if (shown) return; shown = true; $('#fc-face', root).innerHTML = c.back; $('#fc-card', root).style.borderColor = 'var(--gold)';
          $('#fc-act', root).innerHTML = [[0, L('Otra vez', 'Encore'), 'var(--bad)'], [1, L('Difícil', 'Difficile'), ''], [2, L('Bien', 'Bien'), ''], [3, L('Fácil', 'Facile'), 'var(--ok)']].map(([g, nme, col], i) => `<button class="btn" data-g="${g}" style="margin:0 4px;${col ? 'border-color:' + col : ''}">${i + 1} · ${nme}</button>`).join('');
          root.querySelectorAll('[data-g]').forEach(b => b.onclick = () => answer(+b.dataset.g));
        };
        const answer = g => { grade(c.id, g); q.shift(); n++; if (g >= 2) { good++; S.addXP(2); } else q.push(c); if (c.fil) S.markRespuesta(c.cap, c.fil, g >= 2); next(); };
        $('#fc-card', root).onclick = flip; $('#fc-flip', root).onclick = flip; $('#fc-exit', root).onclick = () => { cleanup(); home(); };
        keyH = e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); flip(); } else if (shown && '1234'.includes(e.key) && e.key) answer(+e.key - 1); };
        addEventListener('keydown', keyH);
      };
      const cleanup = () => { if (keyH) removeEventListener('keydown', keyH); keyH = null; };
      const done = () => { cleanup(); root.innerHTML = `<div style="text-align:center;padding:50px 0"><div class="bigscore">${good}/${n}</div><p style="color:var(--muted)">${L('Sesión terminada. Vuelve mañana: las tarjetas que fallaste volverán antes.', 'Session terminée. Reviens demain : les cartes ratées reviendront plus tôt.')}</p><button class="btn primary" id="fc-ok">${L('Listo', 'Terminé')}</button></div>`; $('#fc-ok', root).onclick = home; global.__onProgress && global.__onProgress(); };
      next();
    };
    home();
  }

  /* ======================================================
   * ÍNDICE DE AUTORES (todas las nociones en una ficha)
   * ====================================================== */
  function authorsIndex() {
    const m = {};
    S.COURS.capitulos.forEach(c => c.filosofos.forEach(f => { const a = m[f.id] || (m[f.id] = { id: f.id, nombre: f.nombre, entries: [] }); if (f.nombre.length > a.nombre.length) a.nombre = f.nombre; a.entries.push({ cap: c, f }); }));
    return Object.values(m).sort((a, b) => b.entries.length - a.entries.length || a.nombre.localeCompare(b.nombre));
  }
  function renderAutores(root, id) {
    const list = authorsIndex();
    if (id) {
      const a = list.find(x => x.id === id); if (a) return detail(root, a);
    }
    root.innerHTML = `<h1>👤 ${L('Autores', 'Auteurs')}</h1><p class="lead">${L('Cada autor con todo lo que dice en las distintas nociones: así lo reciclas en cualquier sujeto. Ordenados por cuántas nociones lo usan.', 'Chaque auteur avec tout ce qu’il dit dans les différentes notions : tu peux ainsi le réutiliser dans n’importe quel sujet. Triés par nombre de notions qui l’utilisent.')}</p>
      <input class="search" id="au-q" type="text" placeholder="${L('Buscar autor…', 'Chercher un auteur…')}"><div class="grid" id="au-list"></div>`;
    const draw = () => { const q = $('#au-q', root).value.toLowerCase().trim(); $('#au-list', root).innerHTML = list.filter(a => !q || a.nombre.toLowerCase().includes(q)).map(a => { const m = Math.round(a.entries.reduce((s, e) => s + S.mastery(e.cap.id, e.f.id), 0) / a.entries.length); return `<button class="card" data-a="${a.id}" style="text-align:left"><div class="n">${a.entries.length} ${L(a.entries.length > 1 ? 'nociones' : 'noción', a.entries.length > 1 ? 'notions' : 'notion')}</div><h3 style="font-size:22px">${esc(a.nombre)}</h3><div style="color:var(--muted);font-size:12.5px">${a.entries.map(e => esc(e.cap.titulo)).join(' · ')}</div><div class="mbar"><i style="width:${m}%"></i></div></button>`; }).join(''); root.querySelectorAll('[data-a]').forEach(b => b.onclick = () => App.go('autores', b.dataset.a)); };
    $('#au-q', root).oninput = draw; draw();
  }
  function detail(root, a) {
    const cro = ((S.COURS.extras || {}).cronologia || []).find(c => c.nombre.toLowerCase().includes(a.nombre.split(' ').pop().toLowerCase()));
    const qs = []; S.COURS.capitulos.forEach(c => c.quiz.forEach((q, idx) => { if (q.filosofo === a.id) qs.push({ q, idx, cap: c }); }));
    root.innerHTML = `<button class="btn sm" id="au-back">← ${L('Autores', 'Auteurs')}</button><h1 style="margin-top:10px">${esc(a.nombre)}</h1><p class="lead">${a.entries[0].f.epoca}${cro ? ` · ${esc(cro.fechas)}` : ''} · ${a.entries.length} ${L('nociones', 'notions')}</p>
      <div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn primary sm" id="au-cards">🃏 ${L('Tarjetas de este autor', 'Cartes de cet auteur')}</button><button class="btn sm" id="au-quiz" ${qs.length ? '' : 'disabled'}>${L('Quiz de este autor', 'Quiz de cet auteur')} (${qs.length})</button></div>
      ${a.entries.map(({ cap, f }) => `<div class="card" style="margin:14px 0;--accent:${capColor(cap)}"><div class="n">${L('Noción', 'Notion')} ${cap.numero} · ${esc(cap.titulo)} ${pg(f.pagina_pdf)}</div><div class="tesis" style="margin-top:8px">${esc(f.tesis_principal)}</div><ul style="color:#d4d2c8;font-size:14.5px;line-height:1.55;margin:10px 0">${f.ideas_clave.map(x => `<li>${esc(x)}</li>`).join('')}</ul>${(f.citas || []).map(c => `<div class="cita"><q lang="fr">${esc(c.texto)}</q><small>${esc(c.obra || '')} ${pg(c.pagina_pdf)}</small></div>`).join('')}<div class="uso" style="margin:8px 0">${esc(f.como_usarlo_en_disertacion)}</div><button class="btn sm" data-go="${cap.id}|${f.id}">${L('Abrir en el mapa', 'Ouvrir sur la carte')}</button></div>`).join('')}`;
    $('#au-back', root).onclick = () => App.go('autores'); $('#au-cards', root).onclick = () => App.go('tarjetas', 'fil:' + a.id);
    $('#au-quiz', root).onclick = () => UI.startMixed(shuffle(qs), L('Quiz de ', 'Quiz de ') + a.nombre);
    root.querySelectorAll('[data-go]').forEach(b => b.onclick = () => { const [c, f] = b.dataset.go.split('|'); App.go('map', c, f); });
  }

  /* ======================================================
   * PLAN DE ESTUDIO + ESTADÍSTICAS
   * ====================================================== */
  function genPlan(fecha, minutos) {
    const t0 = today(), t1 = Math.floor(new Date(fecha + 'T00:00:00Z').getTime() / 86400000), D = Math.max(1, t1 - t0), caps = S.ES.capitulos.slice().sort((a, b) => S.chapterMastery(a.id) - S.chapterMastery(b.id) || a.numero - b.numero);
    const days = Array.from({ length: D }, (_, i) => ({ d: t0 + i, tareas: [] }));
    const perDay = Math.max(1, Math.floor(minutos / 45)), learnDays = Math.min(D, Math.max(Math.ceil(17 / perDay), Math.round(D * 0.5)));
    // 1) aprender: reparte los 17 capítulos a lo largo de la fase de aprendizaje (más flojos primero)
    caps.forEach((c, i) => { const day = days[Math.min(learnDays - 1, Math.floor(i * learnDays / 17))]; day.tareas.push({ id: 'cap-' + c.id, txt: L(`Estudia «${c.titulo_es}»: mapa, fichas y escenas`, `Étudie « ${S.byCap[c.id].titulo} » : carte, fiches et scènes`), go: ['map', c.id] }, { id: 'quiz-' + c.id, txt: L(`Quiz de «${c.titulo_es}»`, `Quiz « ${S.byCap[c.id].titulo} »`), go: ['quizcap', c.id] }); });
    // 2) práctica
    const prDays = Math.max(0, Math.round(D * 0.3)); let k = 0;
    for (let i = learnDays; i < Math.min(D, learnDays + prDays); i++, k++) { const c = caps[k % 17]; days[i].tareas.push({ id: 'plan-' + k, txt: L('Entrenador de planes', 'Entraîneur de plans'), go: ['examen', 'plan'] }, k % 2 ? { id: 'expl-' + k, txt: L('Una explicación de texto', 'Une explication de texte'), go: ['examen', 'expl'] } : { id: 'dil-' + k, txt: L('Un dilema (decisiones)', 'Un dilemme (décisions)'), go: ['dilemas'] }); }
    // 3) simulacros y repaso final
    for (let i = learnDays + prDays; i < D; i++) { const last = i === D - 1, ds = days[i]; if (last) ds.tareas.push({ id: 'ligero', txt: L('Repaso ligero (repères, autores) y descansa', 'Révision légère (repères, auteurs) et repos'), go: ['reperes'] }); else if ((D - i) % 3 === 0) ds.tareas.push({ id: 'sim-' + i, txt: L('Simulacro de examen', 'Simulation d’examen'), go: ['examen', 'sim'] }); else ds.tareas.push({ id: 'dbl-' + i, txt: L('Repasa tus fallos y los capítulos más flojos', 'Revois tes erreurs et les chapitres les plus faibles'), go: ['tracker'] }); }
    days.forEach(d => d.tareas.unshift({ id: 'cards-' + d.d, txt: L('Tarjetas (10 min)', 'Cartes (10 min)'), go: ['tarjetas'] }));
    return { fecha, minutos, creado: t0, dias: days, hecho: (P().plan && P().plan.hecho) || {} };
  }
  function activityDays() { const m = {}; P().hist.forEach(h => { const d = new Date(h.t); const n = Math.floor((h.t - d.getTimezoneOffset() * 60000) / 86400000); m[n] = (m[n] || 0) + 1; }); return m; }
  function renderPlan(root) {
    const pl = P().plan, t = today(), act = activityDays();
    let streak = 0, dd = act[t] ? t : t - 1; while (act[dd]) { streak++; dd--; }
    const hist = P().hist, q = hist.filter(h => h.k === 'q' && h.ok !== null), acc = a => a.length ? Math.round(a.filter(h => h.ok).length / a.length * 100) : null;
    const wk = Date.now() - 7 * 864e5, a7 = acc(q.filter(h => h.t >= wk)), a0 = acc(q.filter(h => h.t < wk));
    const caps = S.COURS.capitulos;
    // autores más flojos
    const weak = []; caps.forEach(c => c.filosofos.forEach(f => { const m = S.mastery(c.id, f.id); weak.push({ c, f, m }); })); weak.sort((a, b) => a.m - b.m);
    const bars = Array.from({ length: 14 }, (_, i) => t - 13 + i), max = Math.max(1, ...bars.map(d => act[d] || 0));
    const sims = P().simulacros || [];
    root.innerHTML = `<h1>📅 ${L('Plan y estadísticas', 'Plan et statistiques')}</h1>
      ${!pl ? `<div class="card" style="max-width:560px"><h3>${L('Crea tu plan de estudio', 'Crée ton plan d’étude')}</h3><p style="color:#c9c6b8;line-height:1.55;font-size:14px">${L('Dime la fecha del examen y cuánto tiempo tienes al día: reparto los 17 capítulos (empezando por los más flojos), la práctica y los simulacros.', 'Indique la date de l’examen et ton temps par jour : je répartis les 17 chapitres (en commençant par les plus faibles), l’entraînement et les simulations.')}</p>
        <div class="field"><label>${L('Fecha del examen', 'Date de l’examen')}</label><input type="date" id="pl-date" style="font:inherit;color:var(--text);background:rgba(255,255,255,.05);border:1px solid var(--line);border-radius:10px;padding:8px 10px" min="${dayStr(t + 1)}"></div>
        <div class="field"><label>${L('Minutos por día', 'Minutes par jour')}</label><div class="seg" id="pl-min">${[30, 60, 90, 120].map((v, i) => `<button data-v="${v}" class="${i === 1 ? 'on' : ''}">${v}</button>`).join('')}</div></div><button class="btn primary" id="pl-go">${L('Generar plan', 'Générer le plan')}</button></div>`
        : (() => { const hoy = pl.dias.find(d => d.d === t) || pl.dias.find(d => d.d > t); const total = pl.dias.reduce((s, d) => s + d.tareas.length, 0), hecho = pl.dias.reduce((s, d) => s + d.tareas.filter(x => pl.hecho[dayStr(d.d) + ':' + x.id]).length, 0), left = pl.dias.length ? Math.max(0, Math.floor(new Date(pl.fecha + 'T00:00:00Z').getTime() / 86400000) - t) : 0;
          return `<div class="kpis"><div class="kpi"><b>${left}</b><span>${L('días para el examen', 'jours avant l’épreuve')} (${pl.fecha})</span></div><div class="kpi"><b>${Math.round(hecho / total * 100)}%</b><span>${L('del plan completado', 'du plan accompli')}</span></div><div class="kpi"><b>${streak}</b><span>${L('días seguidos estudiando', 'jours d’étude d’affilée')}</span></div><div class="kpi"><b>${a7 === null ? '—' : a7 + '%'}</b><span>${L('acierto últimos 7 días', 'réussite sur 7 jours')}${a0 !== null && a7 !== null ? ` (${a7 >= a0 ? '▲' : '▼'} ${L('antes', 'avant')} ${a0}%)` : ''}</span></div></div>
          ${hoy ? `<div class="card" style="border-color:var(--gold);margin-bottom:16px"><div class="n">${hoy.d === t ? L('HOY', 'AUJOURD’HUI') : L('PRÓXIMO DÍA', 'PROCHAIN JOUR')} · ${dayStr(hoy.d)}</div>${hoy.tareas.map(x => taskRow(pl, hoy.d, x)).join('')}</div>` : `<div class="card"><h3>${L('El plan terminó. ¡A dar lo mejor!', 'Le plan est terminé. Donne le meilleur !')}</h3></div>`}
          <details class="card"><summary style="cursor:pointer;font-weight:600">${L('Ver todo el calendario', 'Voir tout le calendrier')}</summary>${pl.dias.map(d => `<div style="margin-top:10px;${d.d === t ? 'border-left:3px solid var(--gold);padding-left:10px' : ''}"><div class="n" style="color:var(--muted);font-size:12px">${dayStr(d.d)}</div>${d.tareas.map(x => taskRow(pl, d.d, x)).join('')}</div>`).join('')}</details>
          <div style="margin:10px 0 0"><button class="btn sm" id="pl-redo">${L('Recalcular según mi dominio actual', 'Recalculer selon ma maîtrise actuelle')}</button> <button class="btn sm" id="pl-del">${L('Cambiar fecha', 'Changer la date')}</button></div>`; })()}
      ${h4(L('Actividad (14 días)', 'Activité (14 jours)'))}<div class="card"><svg viewBox="0 0 560 120" style="width:100%;height:120px">${bars.map((d, i) => { const v = act[d] || 0, hh = v / max * 90; return `<rect x="${i * 40 + 6}" y="${100 - hh}" width="28" height="${Math.max(2, hh)}" rx="4" fill="${v ? 'var(--gold)' : 'rgba(255,255,255,.1)'}"/><text x="${i * 40 + 20}" y="116" font-size="9" fill="#9a9db5" text-anchor="middle">${dayStr(d).slice(8)}</text>${v ? `<text x="${i * 40 + 20}" y="${96 - hh}" font-size="9" fill="#e9e6dc" text-anchor="middle">${v}</text>` : ''}`; }).join('')}</svg></div>
      ${h4(L('Dominio por noción', 'Maîtrise par notion'))}<div class="card">${caps.map(c => { const m = S.chapterMastery(c.id), cp = P().cap[c.id], ac = cp && cp.intentos ? Math.round(cp.aciertos / cp.intentos * 100) : null; return `<div style="display:grid;grid-template-columns:150px 1fr 90px;gap:10px;align-items:center;margin:5px 0;font-size:13px"><span>${c.numero}. ${esc(c.titulo)}</span><div class="mbar" style="margin:0"><i style="width:${m}%;background:${capColor(c)}"></i></div><span style="color:var(--muted)">${m}%${ac !== null ? ` · ${ac}% ✓` : ''}</span></div>`; }).join('')}</div>
      ${h4(L('Tus 10 autores más flojos', 'Tes 10 auteurs les plus faibles'))}<div class="card"><div class="chips">${weak.slice(0, 10).map(w => `<button class="chip link" data-go="${w.c.id}|${w.f.id}">${esc(w.f.nombre)} · ${esc(w.c.titulo)} (${w.m}%)</button>`).join('')}</div></div>
      ${sims.length ? h4(L('Simulacros', 'Simulations')) + `<div class="card"><svg viewBox="0 0 560 100" style="width:100%;height:100px"><line x1="0" x2="560" y1="50" y2="50" stroke="rgba(255,255,255,.12)" stroke-dasharray="4"/>${sims.map((s, i) => `<circle cx="${30 + i * (500 / Math.max(1, sims.length - 1 || 1)) * (sims.length > 1 ? 1 : 0)}" cy="${95 - s.nota / 20 * 90}" r="5" fill="var(--gold)"><title>${s.nota}/20 ${esc(s.titulo)}</title></circle>`).join('')}</svg><div style="color:var(--muted);font-size:13px">${sims.map(s => s.nota + '/20').join(' → ')} (línea punteada = 10/20)</div></div>` : ''}`;
    if (!pl) { let min = 60; $('#pl-min', root).onclick = e => { const b = e.target.closest('[data-v]'); if (!b) return; min = +b.dataset.v; root.querySelectorAll('#pl-min button').forEach(x => x.classList.toggle('on', x === b)); }; $('#pl-go', root).onclick = () => { const f = $('#pl-date', root).value; if (!f) return toast(L('Elige la fecha del examen', 'Choisis la date de l’examen')); P().plan = genPlan(f, min); S.save(); renderPlan(root); }; }
    else { $('#pl-redo', root).onclick = () => { P().plan = genPlan(pl.fecha, pl.minutos); S.save(); renderPlan(root); toast(L('Plan recalculado', 'Plan recalculé')); }; $('#pl-del', root).onclick = () => { P().plan = null; S.save(); renderPlan(root); }; root.querySelectorAll('[data-task]').forEach(b => b.onchange = () => { P().plan.hecho[b.dataset.task] = b.checked; if (b.checked) S.addXP(3); S.save(); }); root.querySelectorAll('[data-pgo]').forEach(b => b.onclick = () => { const g = b.dataset.pgo.split('|'); if (g[0] === 'quizcap') return UI.startQuiz({ cap: S.byCap[g[1]] }); App.go(g[0], g[1]); }); }
    root.querySelectorAll('[data-go]').forEach(b => b.onclick = () => { const [c, f] = b.dataset.go.split('|'); App.go('map', c, f); });
  }
  function taskRow(pl, d, x) { const key = dayStr(d) + ':' + x.id; return `<div style="display:flex;align-items:center;gap:10px;margin:6px 0"><input type="checkbox" data-task="${key}" ${pl.hecho[key] ? 'checked' : ''} style="accent-color:var(--gold)"><span style="flex:1;font-size:14px;${pl.hecho[key] ? 'text-decoration:line-through;color:var(--muted)' : ''}">${esc(x.txt)}</span><button class="btn sm" data-pgo="${x.go.join('|')}">${L('Ir', 'Aller')}</button></div>`; }

  global.Estudio = { renderCards, renderAutores, renderPlan };
})(window);
