/* ============================================================
 * dilemas.js — mini-videojuegos de decisiones (estilo "Detroit: Become Human")
 * Cada dilema es un grafo: nodo = escena animada (monigotes) + decisión (con cronómetro
 * opcional) o final (trágico / ambiguo / luminoso) que revela la idea filosófica del cours.
 * Incluye el "mapa de decisiones" (flowchart) que muestra qué caminos y finales descubriste.
 * ============================================================ */
(function (global) {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const S = global.State, P = () => S.P, T = global.tx;
  const TYPE = { tragico: ['Trágico', 'Tragique'], ambiguo: ['Ambiguo', 'Ambigu'], luminoso: ['Luminoso', 'Lumineux'] };
  const tname = t => L(TYPE[t][0], TYPE[t][1]);

  /* ---------- progreso ---------- */
  const prog = id => P().dilemas[id] || (P().dilemas[id] = { finales: {}, visitados: {}, aristas: {}, jugadas: 0 });
  const finalesDe = d => Object.values(d.nodos).filter(n => n.final).map(n => n.final);

  /* ============ LISTA ============ */
  function renderList(root) {
    const ds = S.DILEMAS;
    root.innerHTML = `<h1>${L('Dilemas: decide y vive las consecuencias', 'Dilemmes : décide et assume les conséquences')}</h1>
      <p class="lead">${L('Historias interactivas en estilo monigotes, inspiradas en los juegos de decisiones: cada elección encarna una postura filosófica de tu cours y los finales (a veces trágicos) revelan qué idea y qué autor estaban en juego. Descubre todos los finales.',
        'Histoires interactives en style bonhommes, inspirées des jeux de décisions : chaque choix incarne une position philosophique de ton cours et les fins (parfois tragiques) révèlent quelle idée et quel auteur étaient en jeu. Découvre toutes les fins.')}</p>
      ${ds.length ? '' : `<p style="color:var(--muted)">${L('Aún no hay dilemas generados.', 'Pas encore de dilemmes générés.')}</p>`}
      <div class="grid">${ds.map(d => {
        const cap = S.byCap[d.capitulo], fin = finalesDe(d), pr = P().dilemas[d.id] || { finales: {} }, got = fin.filter(f => pr.finales[f.id]).length;
        return `<div class="card dcard" style="--accent:${cap ? capColor(cap) : 'var(--gold)'}"><div class="n">${cap ? esc(UI.titulo(cap)) : ''}</div><h3>${esc(T(d.titulo))}</h3>
          <p style="margin:0;color:#c9c6b8;font-size:14px;line-height:1.5">${esc(T(d.premisa))}</p>
          <div class="dtype">${fin.map(f => `<span class="fin-dot ${pr.finales[f.id] ? f.tipo : ''}" title="${pr.finales[f.id] ? esc(T(f.titulo)) : L('Final sin descubrir', 'Fin non découverte')}"></span>`).join('')}<span style="font-size:12px;color:var(--muted);margin-left:6px">${got}/${fin.length} ${L('finales', 'fins')}</span></div>
          <div class="row"><button class="btn primary sm" data-play="${d.id}">${pr.jugadas ? L('Jugar', 'Jouer') + ' ↺' : L('Jugar', 'Jouer')}</button>${pr.jugadas ? `<button class="btn sm" data-map="${d.id}">${L('Mapa de decisiones', 'Carte des décisions')}</button>` : ''}</div></div>`;
      }).join('')}</div>`;
    root.querySelectorAll('[data-play]').forEach(b => b.onclick = () => play(b.dataset.play));
    root.querySelectorAll('[data-map]').forEach(b => b.onclick = () => showMap(S.DILEMAS.find(x => x.id === b.dataset.map)));
  }

  /* ============ JUEGO ============ */
  function play(id, fromNode) {
    const d = S.DILEMAS.find(x => x.id === id); if (!d) return;
    const cap = S.byCap[d.capitulo], pr = prog(id); let cur = fromNode || d.inicio, path = [], player = null, timer = null, keyH = null;
    const clean = () => { clearInterval(timer); if (player) { player.destroy(); player = null; } if (keyH) removeEventListener('keydown', keyH); };
    const c = UI.openModal('', false, clean); c.classList.add('game');
    if (cap) c.style.setProperty('--accent', capColor(cap));

    const intro = () => {
      c.innerHTML = `<button class="x" aria-label="Cerrar">✕</button><div class="game-head"><h2>${esc(T(d.titulo))}</h2></div>
        <div class="narr" style="font-size:22px">${esc(T(d.premisa))}</div>
        <p style="color:var(--muted);font-size:13.5px;margin:14px 0 4px">${L('Protagonista', 'Protagoniste')}: <b>${esc(d.protagonista || '')}</b> · ${cap ? esc(UI.titulo(cap)) : ''} · ${finalesDe(d).length} ${L('finales', 'fins')} (${finalesDe(d).filter(f => pr.finales[f.id]).length} ${L('descubiertos', 'découvertes')})</p>
        <div style="display:flex;gap:10px;margin-top:16px;flex-wrap:wrap"><button class="btn primary" id="g-go">${L('Empezar', 'Commencer')}</button>${pr.jugadas ? `<button class="btn" id="g-map">${L('Mapa de decisiones', 'Carte des décisions')}</button>` : ''}</div>`;
      $('.x', c).onclick = UI.closeModal; $('#g-go', c).onclick = () => { path = []; pr.jugadas++; S.save(); node(d.inicio); };
      const m = $('#g-map', c); if (m) m.onclick = () => showMap(d);
    };

    const node = id => {
      cur = id; const n = d.nodos[id]; pr.visitados[id] = true; S.save();
      c.innerHTML = `<button class="x" aria-label="Cerrar">✕</button><div class="game-head"><h2>${esc(T(d.titulo))}</h2><span class="steps">${path.length + 1}</span></div>
        <div class="player"><canvas id="g-cv"></canvas></div>
        <div class="ctrls"><button class="btn sm" id="g-skip">${L('Saltar escena', 'Passer la scène')}</button><button class="btn sm" id="g-rep" hidden>↺ ${L('Ver escena otra vez', 'Revoir la scène')}</button></div>
        <div class="narr">${esc(T(n.narracion))}</div><div id="g-after"></div>`;
      $('.x', c).onclick = UI.closeModal;
      if (player) player.destroy();
      player = new ScenePlayer($('#g-cv', c), { reduced: P().ajustes.reducirMov, onEnd: () => after(n) });
      player.resize(); player.load(n.escena, SceneSkins.monigotes);
      document.fonts.load('700 30px Caveat').then(() => player && player.draw());
      $('#g-skip', c).onclick = () => { player.pause(); player.seek(player.model.duration); after(n); };
      $('#g-rep', c).onclick = () => { $('#g-after', c).innerHTML = ''; clearInterval(timer); player.restart(); $('#g-rep', c).hidden = true; };
      requestAnimationFrame(() => { player.resize(); player.play(); });
    };

    let shown = null;
    const after = n => {
      if (shown === cur + ':' + path.length) return; shown = cur + ':' + path.length;
      $('#g-skip', c).hidden = true; $('#g-rep', c).hidden = false;
      if (n.final) return ending(n);
      const dec = n.decision, box = $('#g-after', c), secs = (dec.tiempo_seg && P().ajustes.cronometro !== false) ? dec.tiempo_seg : 0;
      box.innerHTML = `<div class="decision"><h3>${esc(T(dec.pregunta))}</h3>${secs ? '<div class="timer"><i></i></div>' : ''}<div class="dopts">${dec.opciones.map((o, i) => `<button class="dopt" data-i="${i}"><kbd>${i + 1}</kbd><span>${esc(T(o.texto))}</span></button>`).join('')}</div></div>`;
      const choose = (i, timeout) => {
        clearInterval(timer); if (keyH) { removeEventListener('keydown', keyH); keyH = null; }
        const o = dec.opciones[i]; pr.aristas[cur + '>' + o.a] = true; path.push({ de: cur, a: o.a, texto: T(o.texto), postura: o.postura ? T(o.postura) : '' });
        Sfx && Sfx(timeout ? 200 : 520, timeout ? 120 : 780, 0.12); if (timeout) toast(L('Se acabó el tiempo', 'Temps écoulé')); S.save(); shown = null; node(o.a);
      };
      box.querySelectorAll('.dopt').forEach(b => b.onclick = () => choose(+b.dataset.i, false));
      keyH = e => { const k = +e.key; if (k >= 1 && k <= dec.opciones.length) choose(k - 1, false); }; addEventListener('keydown', keyH);
      if (secs) { const bar = $('.timer i', box), t0 = performance.now(); timer = setInterval(() => { const k = Math.max(0, 1 - (performance.now() - t0) / 1000 / secs); bar.style.transform = `scaleX(${k})`; if (k < 0.3) bar.parentNode.classList.add('low'); if (k <= 0) choose(dec.opciones.length - 1, true); }, 60); }
    };

    const ending = n => {
      const f = n.final, first = !pr.finales[f.id]; pr.finales[f.id] = true;
      const fil = cap && f.filosofo ? cap.filosofos.find(x => x.id === f.filosofo) : null; const got = finalesDe(d).filter(x => pr.finales[x.id]).length, tot = finalesDe(d).length;
      if (first) S.addXP(25, L('final descubierto', 'fin découverte')); else S.save();
      Sfx && Sfx(f.tipo === 'tragico' ? 180 : 700, f.tipo === 'tragico' ? 90 : 1200, 0.5, f.tipo === 'tragico' ? 'sawtooth' : 'sine');
      $('#g-after', c).innerHTML = `<div class="ending ${f.tipo}"><span class="badge ${f.tipo}">${L('Final', 'Fin')} ${got}/${tot} · ${tname(f.tipo)}</span><h2>${esc(T(f.titulo))}</h2>
        <h4 style="margin:12px 0 4px;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--muted)">${L('Idea filosófica', 'Idée philosophique')}${fil ? ' · ' + esc(fil.nombre) : ''} <span class="pg">p.${f.pagina_pdf}</span></h4><p style="margin:0;line-height:1.6">${esc(T(f.idea))}</p>
        ${f.cita ? `<div class="cita"><q lang="fr">${esc(f.cita.texto)}</q><small>${esc(fil ? fil.nombre : '')} <span class="pg">p.${f.cita.pagina_pdf}</span></small></div>` : ''}
        <h4 style="margin:12px 0 4px;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--muted)">${L('Para pensar', 'Pour réfléchir')}</h4><p style="margin:0;font-family:var(--serif);font-size:20px;line-height:1.35;font-style:italic">${esc(T(f.reflexion))}</p>
        ${path.length ? `<h4 style="margin:14px 0 4px;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--muted)">${L('Tu elección', 'Ton choix')}</h4><div class="chips">${path.map(p => `<span class="chip" title="${esc(p.texto)}">${esc(p.postura || p.texto)}</span>`).join('')}</div>` : ''}
        <div style="display:flex;gap:10px;margin-top:18px;flex-wrap:wrap"><button class="btn primary" id="e-again">${L('Otro camino', 'Un autre chemin')}</button><button class="btn" id="e-map">${L('Mapa de decisiones', 'Carte des décisions')}</button>${fil ? `<button class="btn" id="e-fil">${L('Ver al autor en el mapa', 'Voir l’auteur sur la carte')}</button>` : ''}</div></div>`;
      $('#g-after', c).scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      $('#e-again', c).onclick = () => { shown = null; path = []; pr.jugadas++; S.save(); node(d.inicio); };
      $('#e-map', c).onclick = () => showMap(d, path);
      const ef = $('#e-fil', c); if (ef) ef.onclick = () => { UI.closeModal(); App.go('map', d.capitulo, f.filosofo); };
      global.__onProgress && global.__onProgress();
    };

    intro();
  }

  /* ============ MAPA DE DECISIONES (flowchart) ============ */
  function showMap(d, lastPath) {
    const pr = prog(d.id), N = d.nodos, depth = {}, order = [];
    const q = [[d.inicio, 0]]; while (q.length) { const [id, k] = q.shift(); if (depth[id] !== undefined && depth[id] >= k) continue; depth[id] = k; (N[id].decision ? N[id].decision.opciones : []).forEach(o => q.push([o.a, k + 1])); }
    const levels = {}; Object.keys(depth).forEach(id => (levels[depth[id]] = levels[depth[id]] || []).push(id));
    const maxL = Math.max(...Object.keys(levels).map(Number)), W = 1000, H = Math.max(360, Math.max(...Object.values(levels).map(l => l.length)) * 80 + 40), pos = {};
    Object.entries(levels).forEach(([k, ids]) => ids.forEach((id, i) => { pos[id] = { x: 60 + (W - 120) * (+k / maxL), y: (H / (ids.length + 1)) * (i + 1) }; }));
    const edges = []; Object.keys(N).forEach(id => (N[id].decision ? N[id].decision.opciones : []).forEach(o => edges.push([id, o.a, o])));
    const lastEdges = new Set((lastPath || []).map(p => p.de + '>' + p.a));
    const colorOf = t => t === 'tragico' ? '#ef6a5b' : t === 'ambiguo' ? '#e0b862' : '#5cc8b8';
    const svg = `<svg class="flow" viewBox="0 0 ${W} ${H}">${edges.map(([a, b, o]) => {
      const seen = pr.aristas[a + '>' + b], p1 = pos[a], p2 = pos[b], mx = (p1.x + p2.x) / 2;
      return `<path class="ed ${seen ? 'seen' : ''}" d="M${p1.x},${p1.y} C${mx},${p1.y} ${mx},${p2.y} ${p2.x},${p2.y}" ${lastEdges.has(a + '>' + b) ? 'stroke-width="4"' : ''}/>` + (seen ? `<text x="${mx}" y="${(p1.y + p2.y) / 2 - 4}" text-anchor="middle">${esc((o.postura ? T(o.postura) : T(o.texto)).slice(0, 28))}</text>` : '');
    }).join('')}${Object.keys(N).map(id => {
      const n = N[id], p = pos[id], seen = pr.visitados[id];
      if (n.final) { const got = pr.finales[n.final.id]; return `<g><rect class="nd ${got ? 'seen' : ''}" x="${p.x - 14}" y="${p.y - 14}" width="28" height="28" rx="5" transform="rotate(45 ${p.x} ${p.y})" ${got ? `style="fill:${colorOf(n.final.tipo)};stroke:${colorOf(n.final.tipo)}"` : ''}/><text x="${p.x}" y="${p.y + 34}" text-anchor="middle">${got ? esc(T(n.final.titulo).slice(0, 26)) : '???'}</text></g>`; }
      return `<g><circle class="nd ${seen ? 'seen' : ''}" cx="${p.x}" cy="${p.y}" r="${id === d.inicio ? 17 : 13}"/>${seen ? `<text x="${p.x}" y="${p.y - 22}" text-anchor="middle">${esc(T(n.decision.pregunta).slice(0, 26))}</text>` : ''}</g>`;
    }).join('')}</svg>`;
    const fin = finalesDe(d), got = fin.filter(f => pr.finales[f.id]).length;
    const c = UI.openModal(`<h2>${L('Mapa de decisiones', 'Carte des décisions')} · ${esc(T(d.titulo))}</h2><p style="color:var(--muted);margin:0 0 10px">${got}/${fin.length} ${L('finales', 'fins')} · ${fin.map(f => `<span class="fin-dot ${pr.finales[f.id] ? f.tipo : ''}"></span>`).join(' ')}</p>${svg}
      <div style="margin-top:12px;display:flex;gap:10px"><button class="btn primary" id="m-play">${L('Jugar', 'Jouer')}</button></div>`);
    c.classList.add('game'); $('#m-play', c).onclick = () => play(d.id);
  }

  global.Dilemas = { renderList, play, showMap };
})(window);
