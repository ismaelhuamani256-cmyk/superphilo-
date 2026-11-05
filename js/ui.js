/* ============================================================
 * ui.js — ficha, escena, quiz, repaso/tracker, disertación, repères, ajustes
 * ============================================================ */
(function (global) {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const S = global.State, P = () => S.P;

  /* ---------- toast + sonidos opcionales ---------- */
  let toastT = 0;
  global.toast = function (msg) { const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => t.hidden = true, 2200); };
  const Sfx = (() => { let ac; return (f1, f2, d = 0.12, type = 'sine') => { if (!P().ajustes.sonido) return; try { ac = ac || new (global.AudioContext || global.webkitAudioContext)(); const o = ac.createOscillator(), g = ac.createGain(); o.type = type; o.frequency.setValueAtTime(f1, ac.currentTime); o.frequency.exponentialRampToValueAtTime(f2, ac.currentTime + d); g.gain.setValueAtTime(0.07, ac.currentTime); g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + d + 0.05); o.connect(g); g.connect(ac.destination); o.start(); o.stop(ac.currentTime + d + 0.06); } catch (e) {} }; })();
  global.Sfx = Sfx;

  /* títulos según el ajuste de idioma */
  const flat = x => String(x || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const titulo = c => S.lang === 'fr' ? c.titulo : c.titulo + (c.titulo_es && flat(c.titulo_es) !== flat(c.titulo) ? ' · ' + c.titulo_es : '');
  const pg = n => n ? `<span class="pg" title="Página del PDF">p.${n}</span>` : '';
  const estadoChip = m => { const e = S.estado(m); return `<span class="estado ${e}">${e}</span>`; };

  /* ============ MODAL ============ */
  let modalCleanup = null;
  function openModal(html, narrow, cleanup) {
    closeModal(); const m = $('#modal'), c = $('#modal-card'); c.className = 'modal-card' + (narrow ? ' narrow' : ''); c.innerHTML = `<button class="x" aria-label="Cerrar">✕</button>` + html; m.hidden = false; modalCleanup = cleanup || null;
    $('.x', c).onclick = closeModal; m.onclick = e => { if (e.target === m) closeModal(); };
    return c;
  }
  function closeModal() { const m = $('#modal'); if (m.hidden) return; m.hidden = true; if (modalCleanup) { modalCleanup(); modalCleanup = null; } $('#modal-card').innerHTML = ''; }
  addEventListener('keydown', e => { if (e.key === 'Escape') { if (!$('#modal').hidden) closeModal(); else closeFicha(); } });

  /* ============ FICHA ============ */
  let fichaCtx = null;
  function toggleMax() { const w = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--ficha-w')) || 520, big = innerWidth * 0.8; setFichaW(w > big - 40 ? 520 : big); }
  function setFichaW(w) { w = Math.max(340, Math.min(innerWidth * 0.92, w)); document.documentElement.style.setProperty('--ficha-w', Math.round(w) + 'px'); try { localStorage.setItem('philo-ficha-w', Math.round(w)); } catch (e) {} }
  function closeFicha() { $('#ficha').hidden = true; $('#ficha-resizer').hidden = true; fichaCtx = null; if (global.MapView && MapView.sel) MapView.select(null); }
  function openFicha(cap, node) {
    const f = $('#ficha'); f.hidden = false; $('#ficha-resizer').hidden = false; f.scrollTop = 0; fichaCtx = { cap, node };
    if (node.kind === 'c') return fichaConcepto(cap, node.data);
    const fil = node.data; S.markVisto(cap.id, fil.id);
    const m = S.mastery(cap.id, fil.id), byId = Object.fromEntries(cap.filosofos.map(x => [x.id, x]));
    f.innerHTML = `<button class="close" aria-label="Cerrar">✕</button><button class="max" aria-label="Ampliar / reducir" title="Ampliar / reducir">⤢</button>
      <div class="n" style="font-size:11px;letter-spacing:.14em;color:var(--muted);text-transform:uppercase">${esc(cap.titulo)}</div>
      <h2>${esc(fil.nombre)}</h2>
      <div class="epoca">${esc(fil.epoca)} ${pg(fil.pagina_pdf)} · ${estadoChip(m)}</div>
      <div class="mbar"><i style="width:${m}%"></i></div>
      <div class="acts"><button class="btn primary" id="f-escena">▶ Ver escena</button><button class="btn" id="f-quiz">Ponme a prueba</button></div>
      <h4>Tesis principal</h4><div class="tesis">${esc(fil.tesis_principal)}</div>
      <h4>Ideas clave</h4><ul class="ideas">${fil.ideas_clave.map((x, i) => `<li style="animation-delay:${i * 0.22 + 0.15}s">${esc(x)}</li>`).join('')}</ul>
      <h4>Citas</h4>${fil.citas && fil.citas.length ? fil.citas.map(c => `<div class="cita"><q lang="${esc(c.idioma || 'fr')}">${esc(c.texto)}</q><small>${esc(c.obra || '')} ${pg(c.pagina_pdf)}</small></div>`).join('') : '<div class="cita"><small>No está en el cours: el libro no da cita textual de este autor.</small></div>'}
      <h4>Debate con</h4><div class="chips">${(fil.debate_con || []).filter(x => byId[x]).map(x => `<button class="chip link" data-go="${x}">${esc(byId[x].nombre)}</button>`).join('') || '<span class="chip">—</span>'}</div>
      <h4>Cómo usarlo en la disertación</h4><div class="uso">${esc(fil.como_usarlo_en_disertacion)}</div>`;
    $('.close', f).onclick = closeFicha; $('.max', f).onclick = toggleMax;
    $('#f-escena').onclick = () => openScene(cap, fil);
    $('#f-quiz').onclick = () => startQuiz({ cap, fil });
    f.querySelectorAll('[data-go]').forEach(b => b.onclick = () => { const n = MapView.nodes.find(x => x.id === b.dataset.go); if (n) { MapView.select(n.id); openFicha(cap, n); } });
  }
  function fichaConcepto(cap, c) {
    const f = $('#ficha'), byId = Object.fromEntries(cap.filosofos.map(x => [x.id, x]));
    f.innerHTML = `<button class="close" aria-label="Cerrar">✕</button><button class="max" aria-label="Ampliar / reducir" title="Ampliar / reducir">⤢</button><div class="n" style="font-size:11px;letter-spacing:.14em;color:var(--muted);text-transform:uppercase">Concepto · ${esc(cap.titulo)}</div>
      <h2 style="font-size:32px">${esc(c.nombre)}</h2><div class="epoca">${pg(c.pagina_pdf)}</div>
      <h4>Definición</h4><div class="tesis">${esc(c.definicion)}</div>
      <h4>Autores asociados</h4><div class="chips">${(c.autores || []).filter(x => byId[x]).map(x => `<button class="chip link" data-go="${x}">${esc(byId[x].nombre)}</button>`).join('') || '<span class="chip">—</span>'}</div>`;
    $('.close', f).onclick = closeFicha; $('.max', f).onclick = toggleMax;
    f.querySelectorAll('[data-go]').forEach(b => b.onclick = () => { const n = MapView.nodes.find(x => x.id === b.dataset.go); if (n) { MapView.select(n.id); openFicha(cap, n); } });
  }

  /* ============ ESCENA ============ */
  const STYLE_NAMES = [['monigotes', 'Monigotes'], ['comic', 'Cómic'], ['lego', 'Lego'], ['ps2', 'PS2']];
  function openScene(cap, fil) {
    if (!fil.escena) return toast('Este autor no tiene escena todavía');
    let player = null, credited = false;
    const c = openModal(`<h2>${esc(fil.escena.titulo || fil.nombre)}</h2>
      <div class="player"><canvas id="sc-cv"></canvas></div>
      <div class="ctrls"><button class="btn sm" id="sc-play">⏸ Pausa</button><button class="btn sm" id="sc-rep">↺ Repetir</button>
        <input class="seek" id="sc-seek" type="range" min="0" max="1000" value="0" aria-label="Línea de tiempo"><span class="time" id="sc-time">0:00</span>
        <select id="sc-speed" aria-label="Velocidad"><option value="0.75">0.75×</option><option value="1" selected>1×</option><option value="1.5">1.5×</option></select></div>
      <div class="styles" id="sc-styles"></div>`, false, () => { player && player.destroy(); });
    const cv = $('#sc-cv', c), want = P().ajustes.estilo;
    const fmt = t => Math.floor(t / 60) + ':' + String(Math.floor(t % 60)).padStart(2, '0');
    player = new ScenePlayer(cv, {
      reduced: P().ajustes.reducirMov,
      onTime: (t, d) => { $('#sc-seek', c).value = Math.round(t / d * 1000); $('#sc-time', c).textContent = fmt(t) + ' / ' + fmt(d); if (!credited && t / d > 0.8) { credited = true; S.markEscena(cap.id, fil.id); } },
      onEnd: () => { $('#sc-play', c).textContent = '▶ Reproducir'; },
    });
    const setStyle = id => { const sk = SceneSkins[id]; if (!sk) return; const was = player.playing, t = player.t; player.load(fil.escena, sk); player.seek(t); P().ajustes.estilo = id; S.save(); $('#sc-styles', c).querySelectorAll('.btn').forEach(b => b.classList.toggle('on', b.dataset.s === id)); if (was) player.play(); };
    $('#sc-styles', c).innerHTML = '<span style="color:var(--muted);font-size:12px;align-self:center;margin-right:4px">Estilo:</span>' + STYLE_NAMES.map(([id, n]) => `<button class="btn sm" data-s="${id}" ${SceneSkins[id] ? '' : 'disabled title="Próximamente"'}>${n}</button>`).join('');
    $('#sc-styles', c).onclick = e => { const b = e.target.closest('[data-s]'); if (b && !b.disabled) setStyle(b.dataset.s); };
    player.resize(); const first = SceneSkins[want] ? want : 'monigotes'; player.load(fil.escena, SceneSkins[first]); $('#sc-styles', c).querySelector(`[data-s="${first}"]`).classList.add('on');
    document.fonts.load('700 30px Caveat').then(() => player.draw());
    const upd = () => { $('#sc-play', c).textContent = player.playing ? '⏸ Pausa' : '▶ Reproducir'; };
    $('#sc-play', c).onclick = () => { player.toggle(); upd(); }; $('#sc-rep', c).onclick = () => { player.restart(); upd(); };
    $('#sc-seek', c).oninput = e => { player.seek(e.target.value / 1000 * player.model.duration); };
    $('#sc-speed', c).onchange = e => player.speed = +e.target.value;
    cv.onclick = () => { player.toggle(); upd(); };
    requestAnimationFrame(() => { player.resize(); player.play(); upd(); });
  }

  /* ============ QUIZ ============ */
  /** opts: {cap, fil?} o {cap, pool:[{q,idx}], titulo, modo:'mc'|'open'} */
  function startQuiz(opts) {
    const cap = opts.cap; let pool;
    if (opts.pool) pool = opts.pool;
    else if (opts.fil) {
      const own = cap.quiz.map((q, idx) => ({ q, idx })).filter(x => x.q.filosofo === opts.fil.id);
      const rest = shuffle(cap.quiz.map((q, idx) => ({ q, idx })).filter(x => x.q.filosofo !== opts.fil.id));
      pool = own.concat(rest).slice(0, Math.max(5, own.length)).map(x => ({ ...x, focus: opts.fil.id }));
    } else pool = cap.quiz.map((q, idx) => ({ q, idx }));
    pool = shuffle(pool);
    if (!pool.length) return toast('No hay preguntas');
    let i = 0, ok = 0, xp = 0; const titulo_ = opts.titulo || (opts.fil ? 'Ponme a prueba · ' + opts.fil.nombre : 'Quiz · ' + cap.titulo);
    const c = openModal('', true);
    const render = () => {
      if (i >= pool.length) return end();
      const { q, idx, focus } = pool[i]; const order = shuffle(q.opciones.map((t, k) => ({ t, k })));
      c.innerHTML = `<button class="x" aria-label="Cerrar">✕</button><h2 style="font-size:22px">${esc(titulo_)}</h2>
        <div class="qtop"><span>${i + 1}/${pool.length}</span><div class="qprog"><i style="width:${i / pool.length * 100}%"></i></div><span>${ok} ✓</span></div>
        <div class="qtext">${esc(q.pregunta)}</div><div class="opts">${order.map((o, n) => `<button class="opt" data-k="${o.k}"><b>${'ABCD'[n]}</b><span>${esc(o.t)}</span></button>`).join('')}</div><div id="q-after"></div>`;
      $('.x', c).onclick = closeModal;
      c.querySelectorAll('.opt').forEach(b => b.onclick = () => {
        const good = +b.dataset.k === q.correcta; c.querySelectorAll('.opt').forEach(x => { x.disabled = true; if (+x.dataset.k === q.correcta) x.classList.add('ok'); }); if (!good) b.classList.add('bad');
        good ? (ok++, xp += 10, Sfx(660, 1100)) : (xp += 2, Sfx(260, 140, 0.18, 'sawtooth'));
        S.markRespuesta(cap.id, q.filosofo || focus, good);
        const cp = P().cap[cap.id] || (P().cap[cap.id] = { intentos: 0, aciertos: 0 }); cp.intentos++; good && cp.aciertos++;
        const dk = P().dificiles, key = cap.id + '#' + idx; if (!good) dk[key] = (dk[key] || 0) + 1; else if (dk[key]) { dk[key]--; if (dk[key] <= 0) delete dk[key]; }
        S.addXP(good ? 10 : 2);
        $('#q-after', c).innerHTML = `<div class="expl"><b>${good ? '¡Correcto!' : 'Ojo:'}</b> ${esc(q.explicacion)} ${pg(q.pagina_pdf)}</div><div style="margin-top:12px;text-align:right"><button class="btn primary" id="q-next">${i + 1 < pool.length ? 'Siguiente →' : 'Ver resultado'}</button></div>`;
        $('#q-next', c).onclick = () => { i++; render(); }; $('#q-next', c).focus();
      });
    };
    const end = () => {
      const pct = Math.round(ok / pool.length * 100); if (pct === 100) S.addXP(20, '¡quiz perfecto!');
      c.innerHTML = `<button class="x" aria-label="Cerrar">✕</button><h2>${esc(titulo_)}</h2><div style="text-align:center;padding:10px 0 6px"><div class="bigscore">${ok}/${pool.length}</div><p style="color:var(--muted)">${pct >= 80 ? 'Dominas esto 🔥' : pct >= 50 ? 'Vas bien, repasa los fallos' : 'Vuelve a la ficha y reintenta'} · +${xp} XP</p>
        <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap"><button class="btn primary" id="q-again">Otra vez</button><button class="btn" id="q-close">Cerrar</button></div></div>`;
      $('.x', c).onclick = closeModal; $('#q-close', c).onclick = closeModal; $('#q-again', c).onclick = () => startQuiz(opts);
      if (global.MapView) MapView.refresh(); if (global.Select) Select.refresh(); global.__onProgress && global.__onProgress();
    };
    render();
  }

  /** Respuesta abierta con autoevaluación guiada por la pauta del cours */
  function startOpen(cap, idx) {
    const q = cap.preguntas_abiertas[idx]; if (!q) return;
    const byId = Object.fromEntries(cap.filosofos.map(x => [x.id, x]));
    const c = openModal(`<h2 style="font-size:22px">Pregunta abierta · ${esc(cap.titulo)}</h2>
      <div class="qtext">${esc(q.enunciado)}</div>
      <p style="color:var(--muted);font-size:13px;margin:0 0 8px">Escribe tu respuesta (en francés si quieres practicar el bac). Después compárala con la pauta del cours y marca lo que cubriste. ${pg(q.pagina_pdf)}</p>
      <textarea id="op-t" placeholder="Ma réponse…"></textarea>
      <div style="margin-top:12px"><button class="btn primary" id="op-show">Ver la pauta</button></div><div id="op-after"></div>`, true);
    $('#op-show', c).onclick = () => {
      $('#op-show', c).hidden = true;
      $('#op-after', c).innerHTML = `<h4 style="margin:18px 0 6px;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--muted)">Una buena respuesta contiene…</h4>
        ${q.puntos_clave.map((p, i) => `<label class="chk"><input type="checkbox" data-i="${i}"><span>${esc(p)}</span></label>`).join('')}
        ${(q.filosofos || []).length ? `<div class="chips" style="margin-top:10px">${q.filosofos.filter(x => byId[x]).map(x => `<span class="chip">${esc(byId[x].nombre)}</span>`).join('')}</div>` : ''}
        <div style="margin-top:14px;text-align:right"><button class="btn primary" id="op-done">Evaluarme</button></div>`;
      $('#op-done', c).onclick = () => {
        const n = c.querySelectorAll('.chk input:checked').length, tot = q.puntos_clave.length, sc = n / tot, gain = Math.round(5 + 20 * sc);
        const k = cap.id + '#' + idx, a = P().abiertas[k] || (P().abiertas[k] = { veces: 0, mejor: 0 }); a.veces++; a.mejor = Math.max(a.mejor, Math.round(sc * 100));
        (q.filosofos || []).forEach(f => S.markRespuesta(cap.id, f, sc >= 0.6)); S.addXP(gain, 'respuesta abierta');
        c.querySelector('#op-after').insertAdjacentHTML('beforeend', `<div class="expl">Cubriste <b>${n}/${tot}</b> puntos (${Math.round(sc * 100)}%). ${sc >= 0.75 ? 'Muy sólido.' : sc >= 0.4 ? 'Buena base: añade los puntos que faltan con su autor.' : 'Relee la ficha de los autores y vuelve a intentarlo.'}</div>`);
        $('#op-done', c).disabled = true; if (global.MapView && MapView.cap) MapView.refresh(); global.__onProgress && global.__onProgress();
      };
    };
  }

  /* ============ REPASO / TRACKER ============ */
  function renderTracker(root) {
    const caps = S.COURS.capitulos, p = P(), lv = S.level(p.xp);
    let intentos = 0, aciertos = 0, dom = 0, tot = 0;
    caps.forEach(c => { c.filosofos.forEach(f => { tot++; if (S.mastery(c.id, f.id) >= 80) dom++; }); const cp = p.cap[c.id]; if (cp) { intentos += cp.intentos; aciertos += cp.aciertos; } });
    const dificiles = Object.entries(p.dificiles).sort((a, b) => b[1] - a[1]).map(([k]) => { const [cid, i] = k.split('#'); const cap = S.byCap[cid]; return cap && cap.quiz[+i] ? { q: cap.quiz[+i], idx: +i, cap } : null; }).filter(Boolean);
    root.innerHTML = `<h1>Repaso y progreso</h1><p class="lead">Tu tracker vive en <code>data/progreso.json</code> (cópialo como respaldo). Estados: <b>visto</b> → <b>practicado</b> → <b>dominado</b> (dominio ≥ 80%).</p>
      <div class="kpis"><div class="kpi"><b>Nv ${lv}</b><span>${p.xp} XP</span></div><div class="kpi"><b>${S.globalMastery()}%</b><span>dominio global</span></div><div class="kpi"><b>${dom}/${tot}</b><span>filósofos dominados</span></div><div class="kpi"><b>${intentos ? Math.round(aciertos / intentos * 100) + '%' : '—'}</b><span>acierto en quizzes (${intentos})</span></div></div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:22px"><button class="btn primary" id="t-mix">🎲 Mezcla de todo el cours (15)</button><button class="btn" id="t-dif" ${dificiles.length ? '' : 'disabled'}>Repasar mis fallos (${dificiles.length})</button><button class="btn" id="t-exp">⬇ Exportar respaldo</button><button class="btn" id="t-imp">⬆ Importar respaldo</button><input type="file" id="t-file" accept=".json" hidden></div>
      <div class="grid">${caps.map(c => { const m = S.chapterMastery(c.id); return `<div class="card" style="--accent:${capColor(c)}"><div class="n">${String(c.numero).padStart(2, '0')} · ${m}%</div><h3>${esc(titulo(c))}</h3><div class="mbar"><i style="width:${m}%;background:${capColor(c)}"></i></div>
        <div class="row"><button class="btn sm" data-q="${c.id}">Quiz (${c.quiz.length})</button><button class="btn sm" data-o="${c.id}">Abierta</button><button class="btn sm" data-m="${c.id}">Mapa</button></div>
        <details><summary>Filósofos (${c.filosofos.length})</summary><div style="margin-top:8px;display:grid;gap:4px">${c.filosofos.map(f => { const mm = S.mastery(c.id, f.id); return `<div style="display:flex;justify-content:space-between;gap:8px"><span>${esc(f.nombre)}</span>${estadoChip(mm)}</div>`; }).join('')}</div></details></div>`; }).join('')}</div>`;
    $('#t-mix', root).onclick = () => { const all = shuffle(caps.flatMap(c => c.quiz.map((q, idx) => ({ q, idx, cap: c })))).slice(0, 15); startMixed(all, 'Mezcla de todo el cours'); };
    $('#t-dif', root).onclick = () => startMixed(dificiles.slice(0, 15), 'Repaso de mis fallos');
    root.querySelectorAll('[data-q]').forEach(b => b.onclick = () => startQuiz({ cap: S.byCap[b.dataset.q] }));
    root.querySelectorAll('[data-m]').forEach(b => b.onclick = () => global.App.go('map', b.dataset.m));
    root.querySelectorAll('[data-o]').forEach(b => b.onclick = () => { const cap = S.byCap[b.dataset.o]; const n = cap.preguntas_abiertas.length; const c = openModal(`<h2>Preguntas abiertas · ${esc(cap.titulo)}</h2><div style="display:grid;gap:10px">${cap.preguntas_abiertas.map((q, i) => `<button class="opt" data-i="${i}"><b>${i + 1}</b><span>${esc(q.enunciado)}${(P().abiertas[cap.id + '#' + i] ? ` <span class="pg">mejor ${P().abiertas[cap.id + '#' + i].mejor}%</span>` : '')}</span></button>`).join('')}</div>`, true); c.querySelectorAll('[data-i]').forEach(x => x.onclick = () => startOpen(cap, +x.dataset.i)); });
    $('#t-exp', root).onclick = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([S.exportar()], { type: 'application/json' })); a.download = 'philo-bac-progreso-' + new Date().toISOString().slice(0, 10) + '.json'; a.click(); toast('Respaldo exportado'); };
    $('#t-imp', root).onclick = () => $('#t-file', root).click();
    $('#t-file', root).onchange = e => { const f = e.target.files[0]; if (!f) return; f.text().then(t => { try { S.importar(t); toast('Respaldo importado'); renderTracker(root); } catch (err) { toast('Archivo no válido'); } }); };
  }
  /** Quiz que mezcla preguntas de varios capítulos */
  function startMixed(items, titulo_) {
    if (!items.length) return toast('Nada que repasar');
    let i = 0, ok = 0; const c = openModal('', true);
    const step = () => {
      if (i >= items.length) { c.innerHTML = `<button class="x">✕</button><h2>${esc(titulo_)}</h2><div style="text-align:center"><div class="bigscore">${ok}/${items.length}</div><p style="color:var(--muted)">Resultado final</p><button class="btn primary" id="m-c">Cerrar</button></div>`; $('.x', c).onclick = $('#m-c', c).onclick = closeModal; global.__onProgress && global.__onProgress(); return; }
      const { q, idx, cap } = items[i], order = shuffle(q.opciones.map((t, k) => ({ t, k })));
      c.innerHTML = `<button class="x">✕</button><h2 style="font-size:22px">${esc(titulo_)}</h2><div class="qtop"><span>${i + 1}/${items.length} · ${esc(cap.titulo)}</span><div class="qprog"><i style="width:${i / items.length * 100}%"></i></div><span>${ok} ✓</span></div><div class="qtext">${esc(q.pregunta)}</div><div class="opts">${order.map((o, n) => `<button class="opt" data-k="${o.k}"><b>${'ABCD'[n]}</b><span>${esc(o.t)}</span></button>`).join('')}</div><div id="q-after"></div>`;
      $('.x', c).onclick = closeModal;
      c.querySelectorAll('.opt').forEach(b => b.onclick = () => {
        const good = +b.dataset.k === q.correcta; c.querySelectorAll('.opt').forEach(x => { x.disabled = true; if (+x.dataset.k === q.correcta) x.classList.add('ok'); }); if (!good) b.classList.add('bad');
        good ? (ok++, Sfx(660, 1100)) : Sfx(260, 140, 0.18, 'sawtooth'); S.markRespuesta(cap.id, q.filosofo, good); S.addXP(good ? 10 : 2);
        const cp = P().cap[cap.id] || (P().cap[cap.id] = { intentos: 0, aciertos: 0 }); cp.intentos++; good && cp.aciertos++;
        const k = cap.id + '#' + idx; if (!good) P().dificiles[k] = (P().dificiles[k] || 0) + 1; else if (P().dificiles[k]) { P().dificiles[k]--; if (P().dificiles[k] <= 0) delete P().dificiles[k]; }
        $('#q-after', c).innerHTML = `<div class="expl"><b>${good ? '¡Correcto!' : 'Ojo:'}</b> ${esc(q.explicacion)} ${pg(q.pagina_pdf)}</div><div style="margin-top:12px;text-align:right"><button class="btn primary" id="q-next">Siguiente →</button></div>`; $('#q-next', c).onclick = () => { i++; step(); };
      });
    }; step();
  }

  /* ============ DISERTACIÓN ============ */
  function renderDisert(root, capId) {
    const caps = S.COURS.capitulos, cap = S.byCap[capId] || caps[0], m = (S.COURS.extras || {}).metodo || {};
    root.innerHTML = `<h1>Modo disertación</h1><p class="lead">Elige una noción y un sujeto: el plan se arma <b>solo con los autores de tu cours</b>. El bac se rinde en francés: redacta tus partes en francés usando estas ideas.</p>
      <div class="field"><label>Noción</label><select id="d-cap">${caps.map(c => `<option value="${c.id}" ${c.id === cap.id ? 'selected' : ''}>${c.numero}. ${esc(c.titulo)} — ${esc(c.titulo_es)}</option>`).join('')}</select></div>
      <div id="d-body"></div>
      <h2 style="margin-top:40px;font-size:32px">Método del libro</h2>
      <div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(320px,1fr))">${['dissertation', 'explication_de_texte'].map(k => `<div class="card"><h3>${k === 'dissertation' ? 'La dissertation' : 'L’explication de texte'}</h3>${(m[k] || []).map(s => `<details><summary>${s.paso}. ${esc(s.titulo)} ${pg(s.pagina_pdf)}</summary><p style="color:#d4d2c8;line-height:1.55">${esc(s.descripcion)}</p></details>`).join('') || '<p>—</p>'}</div>`).join('')}</div>`;
    const body = $('#d-body', root);
    const draw = () => {
      const cp = S.byCap[$('#d-cap', root).value], byId = Object.fromEntries(cp.filosofos.map(x => [x.id, x]));
      body.innerHTML = `<h2 style="margin:20px 0 8px;font-size:30px;color:var(--accent)">${esc(titulo(cp))}</h2>
        <h4 style="font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--muted)">Problemáticas del cours</h4>${cp.problematicas_bac.map(x => `<div class="prob" style="cursor:default">${esc(x)}</div>`).join('')}
        <h4 style="margin-top:22px;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--muted)">Planes de disertación</h4>
        ${cp.disertaciones.map((d, i) => { const done = P().disert[cp.id + '#' + i]; return `<div class="card" style="margin:12px 0;--accent:${capColor(cp)}"><h3 style="font-style:italic">${esc(d.sujeto)}</h3><div style="color:var(--muted);font-size:12px;margin:2px 0 8px">Plan ${esc(d.tipo_plan)} ${pg(d.pagina_pdf)}</div><p style="line-height:1.55"><b>Problemática:</b> ${esc(d.problematica)}</p>
          <div class="plan">${d.plan.map(pt => `<div class="part"><h4>${esc(pt.parte)}</h4><div style="line-height:1.55">${esc(pt.idea)}</div><div class="chips" style="margin:6px 0">${(pt.autores || []).map(a => byId[a] ? `<span class="chip link" data-fil="${cp.id}|${a}">${esc(byId[a].nombre)}</span>` : `<span class="chip">${esc(a)}</span>`).join('')}</div><div style="color:var(--muted);font-size:13px"><i>Ejemplo:</i> ${esc(pt.ejemplo)}</div></div>`).join('')}</div>
          <button class="btn sm ${done ? '' : 'primary'}" data-done="${cp.id}#${i}">${done ? '✓ Plan estudiado' : 'Marcar como estudiado (+15 XP)'}</button></div>`; }).join('')}`;
      body.querySelectorAll('[data-done]').forEach(b => b.onclick = () => { const k = b.dataset.done; if (!P().disert[k]) { P().disert[k] = true; S.addXP(15, 'plan estudiado'); } draw(); });
      body.querySelectorAll('[data-fil]').forEach(b => b.onclick = () => { const [c, f] = b.dataset.fil.split('|'); global.App.go('map', c, f); });
    };
    $('#d-cap', root).onchange = draw; draw();
  }

  /* ============ REPÈRES + CRONOLOGÍA ============ */
  function renderReperes(root) {
    const ex = S.COURS.extras || {}, rep = ex.reperes || [], cro = ex.cronologia || [];
    root.innerHTML = `<h1>Repères et chronologie</h1><p class="lead">Glosario de repères y cronología de autores, tal como aparecen al final de tu libro.</p>
      <input class="search" id="r-q" type="text" placeholder="Buscar un repère o un autor…">
      <h2 style="font-size:30px;margin:6px 0 10px">Glossaire des repères</h2><div class="grid" id="r-rep" style="grid-template-columns:repeat(auto-fill,minmax(340px,1fr))"></div>
      <h2 style="font-size:30px;margin:30px 0 10px">Chronologie des auteurs</h2><div class="card"><table class="t"><thead><tr><th>Auteur</th><th>Fechas</th><th>Época</th><th>Nota</th><th></th></tr></thead><tbody id="r-cro"></tbody></table></div>`;
    const draw = () => { const q = $('#r-q', root).value.toLowerCase().trim();
      $('#r-rep', root).innerHTML = rep.filter(r => !q || (r.termino_fr + r.definicion_es).toLowerCase().includes(q)).map(r => `<div class="card"><h3 style="font-size:21px">${esc(r.termino_fr)} ${pg(r.pagina_pdf)}</h3><p style="font-size:14px;line-height:1.55;color:#d4d2c8;margin:6px 0 0">${esc(r.definicion_es)}</p></div>`).join('');
      $('#r-cro', root).innerHTML = cro.filter(r => !q || (r.nombre + r.epoca + (r.nota_es || '')).toLowerCase().includes(q)).map(r => `<tr><td><b>${esc(r.nombre)}</b></td><td>${esc(r.fechas)}</td><td>${esc(r.epoca)}</td><td>${esc(r.nota_es || '')}${r.observacion ? ` <i style="color:var(--muted)">(${esc(r.observacion)})</i>` : ''}</td><td>${pg(r.pagina_pdf)}</td></tr>`).join(''); };
    $('#r-q', root).oninput = draw; draw();
  }

  /* ============ AJUSTES ============ */
  function openSettings() {
    const a = P().ajustes;
    const c = openModal(`<h2>Ajustes</h2>
      <div class="field"><label>Idioma de la interfaz y del cours</label><div class="seg" id="s-idioma">${[['es', 'Español'], ['fr', 'Français']].map(([v, n]) => `<button data-v="${v}" class="${a.lang === v ? 'on' : ''}" ${v === 'fr' && !S.hasFR ? 'disabled' : ''}>${n}</button>`).join('')}</div>
        <p style="color:var(--muted);font-size:12.5px;margin:8px 0 0">${L('Las citas y los términos clave siempre van en francés (idioma original del cours). Con «Español» las explicaciones están en español; con «Français», todo el contenido está en francés.', 'Les citations et les termes clés restent en français (langue d’origine du cours). En «Français», tout le contenu est en français.')}</p></div>
      <div class="field"><label>Estilo de escena por defecto</label><div class="seg" id="s-estilo">${STYLE_NAMES.map(([v, n]) => `<button data-v="${v}" class="${a.estilo === v ? 'on' : ''}" ${SceneSkins[v] ? '' : 'disabled style="opacity:.4"'}>${n}</button>`).join('')}</div></div>
      <div class="field"><label>Movimiento y sonido</label>
        <label class="chk"><input type="checkbox" id="s-red" ${a.reducirMov ? 'checked' : ''}><span>Reducir animaciones (menos calor, respeta <code>prefers-reduced-motion</code>)</span></label>
        <label class="chk"><input type="checkbox" id="s-son" ${a.sonido ? 'checked' : ''}><span>Sonidos suaves (aciertos / fallos)</span></label>
        <label class="chk"><input type="checkbox" id="s-cro" ${a.cronometro !== false ? 'checked' : ''}><span>Cronómetro en los dilemas (estilo Detroit)</span></label></div>
      <div class="field"><label>Datos</label><p style="color:var(--muted);font-size:13px;line-height:1.5;margin:0 0 10px">Todo el contenido ya está generado a partir de tu PDF: <b>no se usa ninguna API ni key</b>. Tu progreso se guarda en <code>data/progreso.json</code>${S.useServer ? '' : ' (ahora: en el navegador, porque abriste el archivo sin servidor)'}.</p>
        <button class="btn sm" id="s-reset">Borrar mi progreso</button></div>`, true);
    const seg = (id, key) => $(id, c).onclick = e => { const b = e.target.closest('[data-v]'); if (!b || b.disabled) return; S.setAjuste(key, b.dataset.v); $(id, c).querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); global.App && App.rerender(); };
    $('#s-idioma', c).onclick = e => { const b = e.target.closest('[data-v]'); if (b && !b.disabled) { closeModal(); global.App.setLang(b.dataset.v); } }; seg('#s-estilo', 'estilo');
    $('#s-red', c).onchange = e => { S.setAjuste('reducirMov', e.target.checked); document.body.classList.toggle('reduce', e.target.checked); };
    $('#s-son', c).onchange = e => S.setAjuste('sonido', e.target.checked);
    $('#s-cro', c).onchange = e => S.setAjuste('cronometro', e.target.checked);
    $('#s-reset', c).onclick = () => { if (confirm('¿Borrar todo tu progreso y XP?')) { S.reset(); closeModal(); global.App && App.rerender(); toast('Progreso borrado'); } };
  }

  global.UI = { startMixed, openModal, setFichaW, openFicha, closeFicha, openScene, startQuiz, startOpen, renderTracker, renderDisert, renderReperes, openSettings, closeModal, titulo };
})(window);
