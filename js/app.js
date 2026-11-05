/* ============================================================
 * app.js — arranque, navegación entre pantallas, fondo de estrellas, XP
 * ============================================================ */
(function () {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s), S = State;
  const views = ['select', 'map', 'tracker', 'disertacion', 'reperes'];
  let cur = { view: 'select' };

  /* ---------- fondo de estrellas (2D, ligero) ---------- */
  const bg = $('#bg-stars'), bx = bg.getContext('2d'); let stars = [];
  function initStars() {
    bg.width = innerWidth; bg.height = innerHeight; stars = Array.from({ length: Math.min(160, innerWidth / 8) }, () => ({ x: Math.random() * bg.width, y: Math.random() * bg.height, r: Math.random() * 1.3 + .2, p: Math.random() * 6 }));
    drawStars(0);
  }
  function drawStars(t) {
    const g = bx.createRadialGradient(bg.width / 2, bg.height * .4, 0, bg.width / 2, bg.height / 2, Math.max(bg.width, bg.height) * .8); g.addColorStop(0, '#12183a'); g.addColorStop(1, '#05060f');
    bx.fillStyle = g; bx.fillRect(0, 0, bg.width, bg.height);
    stars.forEach(s => { bx.globalAlpha = .35 + .35 * Math.sin(t / 1400 + s.p); bx.fillStyle = '#dfe6ff'; bx.beginPath(); bx.arc(s.x, s.y, s.r, 0, 7); bx.fill(); }); bx.globalAlpha = 1;
  }
  let starTimer = 0;
  function loopStars() { clearInterval(starTimer); if (!S.P.ajustes.reducirMov) starTimer = setInterval(() => drawStars(performance.now()), 120); }  // 8 fps: casi gratis
  addEventListener('resize', initStars);

  /* ---------- XP en la barra superior ---------- */
  function paintXP() {
    const xp = S.P.xp, l = S.level(xp), a = S.levelBase(l), b = S.levelBase(l + 1);
    $('#lvl').textContent = 'Nv ' + l; $('#xptxt').textContent = xp + ' XP'; $('#xpfill').style.width = ((xp - a) / (b - a) * 100) + '%';
  }
  window.__onProgress = () => { paintXP(); if (cur.view === 'tracker') UI.renderTracker($('#view-tracker')); Select.refresh && Select.refresh(); };

  /* ---------- navegación ---------- */
  function show(v) {
    views.forEach(x => $('#view-' + x).hidden = x !== v);
    document.querySelectorAll('.tab').forEach(t => t.classList.toggle('on', t.dataset.go === v || (v === 'map' && t.dataset.go === 'select')));
    if (v === 'select') { Select.start(); } else Select.stop();
  }
  function crumbs(parts) { $('#crumbs').innerHTML = parts.map((p, i) => i === parts.length - 1 ? `<b>${p}</b>` : `<span>${p}</span><span>›</span>`).join(' '); }

  function go(view, id, sub) {
    UI.closeFicha(); UI.closeModal(); cur = { view, id, sub };
    document.documentElement.style.setProperty('--accent', '#e0b862');
    if (view === 'select') { show('select'); crumbs(['Capítulos']); document.getElementById('fade').classList.remove('on'); }
    else if (view === 'map') {
      const cap = S.byCap[id]; if (!cap) return go('select');
      show('map'); crumbs(['Capítulos', UI.titulo(cap)]); renderSide(cap);
      requestAnimationFrame(() => {
        MapView.render(cap, { onNode: n => UI.openFicha(cap, n), onBg: () => UI.closeFicha() });
        document.getElementById('fade').classList.remove('on');
        if (sub) { const n = MapView.nodes.find(x => x.id === sub); if (n) { MapView.select(n.id); UI.openFicha(cap, n); } }
      });
    }
    else if (view === 'tracker') { show('tracker'); crumbs(['Repaso']); UI.renderTracker($('#view-tracker')); }
    else if (view === 'disertacion') { show('disertacion'); crumbs(['Disertación']); UI.renderDisert($('#view-disertacion'), id); }
    else if (view === 'reperes') { show('reperes'); crumbs(['Repères']); UI.renderReperes($('#view-reperes')); }
    history.replaceState(null, '', '#' + [view, id, sub].filter(Boolean).join('/'));
  }

  function renderSide(cap) {
    const col = capColor(cap), esc = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
    $('#chap-side').innerHTML = `<div class="n" style="color:var(--muted);font-size:11px;letter-spacing:.14em">NOCIÓN ${cap.numero} / 17 · pp. ${cap.paginas.inicio}-${cap.paginas.fin}</div>
      <h2 style="color:${col}">${esc(cap.titulo)}</h2><div class="sub">${esc(cap.titulo_es)} · dominio <b>${S.chapterMastery(cap.id)}%</b></div>
      <p>${esc(cap.resumen)}</p>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:14px"><button class="btn sm primary" id="s-quiz">Quiz del capítulo</button><button class="btn sm" id="s-dis">Disertación</button></div>
      <h4>Los 5 puntos incontournables</h4><ol>${cap.puntos_incontournables.map(x => `<li>${esc(x)}</li>`).join('')}</ol>
      <h4>Nociones clave</h4><div class="chips">${cap.nociones_clave.map(x => `<span class="chip">${esc(x)}</span>`).join('')}</div>
      <h4>Problemáticas tipo bac</h4>${cap.problematicas_bac.map(x => `<button class="prob" data-d="1">${esc(x)}</button>`).join('')}`;
    $('#s-quiz').onclick = () => UI.startQuiz({ cap }); $('#s-dis').onclick = () => go('disertacion', cap.id);
    $('#chap-side').querySelectorAll('[data-d]').forEach(b => b.onclick = () => go('disertacion', cap.id));
  }

  function rerender() { paintXP(); document.body.classList.toggle('reduce', S.P.ajustes.reducirMov); loopStars(); go(cur.view, cur.id, cur.sub); }

  /* ---------- arranque ---------- */
  async function boot() {
    initStars(); await S.load(); loopStars(); paintXP(); document.body.classList.toggle('reduce', S.P.ajustes.reducirMov);
    S.on(paintXP);
    if (!S.COURS.capitulos.length) { $('#app').innerHTML = '<div style="padding:90px 30px;max-width:640px;margin:auto"><h1>Falta el contenido</h1><p>No se encontró <code>data/cours.js</code>. Ejecuta <code>node tools/build.js</code>.</p></div>'; return; }
    const hover = $('#hover-info');
    await Select.init($('#gl'), S.COURS.capitulos, {
      onEnter: cap => go('map', cap.id),
      onHover: cap => { if (!cap) return hover.hidden = true; hover.hidden = false; hover.style.borderColor = capColor(cap); hover.innerHTML = `<h3 style="color:${capColor(cap)}">${cap.titulo}</h3><p>${cap.filosofos.slice(0, 6).map(f => f.nombre).join(' · ')}${cap.filosofos.length > 6 ? ' …' : ''}</p>`; Sfx && Sfx(520, 700, .08); },
    });
    $('#btn-home').onclick = () => go('select'); $('#btn-settings').onclick = () => UI.openSettings();
    document.querySelectorAll('.tab').forEach(t => t.onclick = () => go(t.dataset.go));
    const [v, id, sub] = location.hash.slice(1).split('/'); views.includes(v) && v !== 'select' ? go(v, id, sub) : go('select');
  }
  window.App = { go, rerender };
  addEventListener('DOMContentLoaded', boot);
})();
