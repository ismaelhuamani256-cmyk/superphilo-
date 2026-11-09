/* ============================================================
 * skin-lego.js — estilo "BLOQUES" (ladrillos de plástico genéricos)
 * Personajes y props propios hechos de ladrillos con tetones (studs),
 * sombreado plano (cara superior clara, lateral oscuro) y contorno grueso.
 * Fondo: plancha base verde con tetones en perspectiva.
 * Autocontenido: no depende de otros skins.
 * ============================================================ */
(function (global) {
  'use strict';

  /* ---------- utilidades ---------- */
  function hash(str) { let h = 2166136261; str = String(str); for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function wrap(ctx, text, maxW) {
    const words = String(text).split(/\s+/); const lines = []; let cur = '';
    words.forEach(w => { const test = cur ? cur + ' ' + w : w; if (ctx.measureText(test).width > maxW && cur) { lines.push(cur); cur = w; } else cur = test; });
    if (cur) lines.push(cur); return lines;
  }
  const PI = Math.PI, TAU = Math.PI * 2;
  const SANS = 'Inter, system-ui, sans-serif', SERIF = '"Cormorant Garamond", serif';

  const K = '#15161f';                       // contorno oscuro
  const RED = '#d9262c', BLUE = '#1b64c8', YEL = '#f7c600', GRN = '#1fa14a', ORG = '#f58a1f',
    WHITE = '#f5f5f0', GRAY = '#a9afba', DGRAY = '#5b6373', TAN = '#e2b46f', BROWN = '#8b5a31',
    PINK = '#f08fb0', LBLUE = '#7cc4f0', PURPLE = '#7a4bc2', TEAL = '#17a69b', CREAM = '#fdf6df';

  const _sc = {};
  function shade(hex, f) {
    const key = hex + '|' + f; if (_sc[key]) return _sc[key];
    let h = hex.slice(1); if (h.length === 3) h = h.split('').map(x => x + x).join('');
    const n = parseInt(h, 16); let r = n >> 16, g = (n >> 8) & 255, b = n & 255; const tg = f < 0 ? 0 : 255, a = Math.abs(f);
    r = Math.round(r + (tg - r) * a); g = Math.round(g + (tg - g) * a); b = Math.round(b + (tg - b) * a);
    return (_sc[key] = 'rgb(' + r + ',' + g + ',' + b + ')');
  }

  /* ---------- primitivas de ladrillo ---------- */
  /** Tetón (cilindro): (x,y) = centro de la elipse superior. */
  function stud(c, x, y, r, col, h, lw) {
    h = h == null ? 3 : h; const ry = r * 0.5; c.lineWidth = lw || 1.8; c.strokeStyle = K; c.lineJoin = 'round';
    c.fillStyle = shade(col, -0.22); c.beginPath(); c.moveTo(x - r, y); c.lineTo(x - r, y + h); c.ellipse(x, y + h, r, ry, 0, PI, 0, true); c.lineTo(x + r, y); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = shade(col, 0.3); c.beginPath(); c.ellipse(x, y, r, ry, 0, 0, TAU); c.fill(); c.stroke();
  }
  /** Ladrillo: cara frontal + cara superior (clara) + lateral (oscura). o: {n tetones, d profundidad, lw, flat}. */
  function brick(c, x, y, w, h, col, o) {
    o = o || {}; const d = o.d == null ? 8 : o.d, dx = d * 0.9, dy = d * 0.7;
    c.lineJoin = 'round'; c.lineWidth = o.lw || 2.4; c.strokeStyle = K;
    if (!o.flat) {
      c.fillStyle = shade(col, -0.3); c.beginPath(); c.moveTo(x + w, y); c.lineTo(x + w + dx, y - dy); c.lineTo(x + w + dx, y + h - dy); c.lineTo(x + w, y + h); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = shade(col, 0.34); c.beginPath(); c.moveTo(x, y); c.lineTo(x + dx, y - dy); c.lineTo(x + w + dx, y - dy); c.lineTo(x + w, y); c.closePath(); c.fill(); c.stroke();
    }
    c.fillStyle = col; c.beginPath(); c.rect(x, y, w, h); c.fill(); c.stroke();
    if (h > 6) { c.fillStyle = 'rgba(255,255,255,.2)'; c.fillRect(x + 2, y + 2, w - 4, 2.5); c.fillStyle = 'rgba(0,0,0,.1)'; c.fillRect(x + 1.5, y + h - 4.5, w - 3, 3); }
    const n = o.n || 0;
    if (n) { const pw = w / n, r = o.sr || Math.min(pw * 0.34, 7); for (let i = 0; i < n; i++) stud(c, x + (i + 0.5) * pw + dx / 2, y - dy / 2 - 3, r, col, 3, o.slw); }
  }
  /** Disco redondo con grosor (placa redonda). */
  function disc(c, cx, cy, r, col, th) {
    th = th == null ? 6 : th; c.lineWidth = 2.6; c.strokeStyle = K; c.lineJoin = 'round';
    c.fillStyle = shade(col, -0.32); c.beginPath(); c.arc(cx, cy + th, r, 0, TAU); c.fill(); c.stroke();
    c.fillRect(cx - r, cy, r * 2, th); c.beginPath(); c.moveTo(cx - r, cy); c.lineTo(cx - r, cy + th); c.moveTo(cx + r, cy); c.lineTo(cx + r, cy + th); c.stroke();
    c.fillStyle = col; c.beginPath(); c.arc(cx, cy, r, 0, TAU); c.fill(); c.stroke();
    if (r > 8) { c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 2; c.beginPath(); c.arc(cx, cy, r - 4, PI * 1.05, PI * 1.6); c.stroke(); }
  }
  function rr(c, x, y, w, h, r) { c.beginPath(); if (c.roundRect) c.roundRect(x, y, w, h, r); else c.rect(x, y, w, h); }
  /** Reparte n tetones en ladrillos de 2..4. */
  function splitRow(n, seed) {
    const out = []; let rem = n, i = 0; while (rem > 0) { let s = rem <= 4 ? rem : [2, 3, 4, 3][(seed + i) % 4]; if (rem - s === 1) s = s > 2 ? s - 1 : s + 1; out.push(s); rem -= s; i++; }
    return out;
  }
  /** Hilera de ladrillos centrada en cx, base en yb. */
  function course(c, cx, yb, n, u, h, cols, seed, o) {
    o = o || {}; const parts = splitRow(n, seed); let x = cx - n * u / 2;
    parts.forEach((s, i) => { brick(c, x, yb - h, s * u, h, cols[(seed + i) % cols.length], { d: o.d == null ? 7 : o.d, n: s, sr: o.sr }); x += s * u; });
  }
  /** Mosaico de píxeles-ladrillo. rows: strings con dígitos 1..9 (índice de paleta). */
  function mosaic(c, rows, cell, ox, oy, pal) {
    const R = rows.length, C = rows[0].length; const at = (r, q) => (r < 0 || q < 0 || r >= R || q >= C) ? 0 : (rows[r].charCodeAt(q) - 48);
    for (let r = 0; r < R; r++) for (let q = 0; q < C; q++) {
      const v = at(r, q); if (!v) continue; const col = pal[v - 1], x = ox + q * cell, y = oy + r * cell;
      c.fillStyle = col; c.fillRect(x, y, cell, cell); c.fillStyle = shade(col, -0.2); c.fillRect(x, y + cell - 3, cell, 3); c.fillStyle = shade(col, 0.28); c.fillRect(x, y, cell, 2);
      c.strokeStyle = 'rgba(0,0,0,.3)'; c.lineWidth = 1; c.strokeRect(x + 0.5, y + 0.5, cell - 1, cell - 1);
    }
    for (let r = 0; r < R; r++) for (let q = 0; q < C; q++) { const v = at(r, q); if (v) stud(c, ox + q * cell + cell / 2, oy + r * cell + cell * 0.38, cell * 0.28, pal[v - 1], 2.2, 1.2); }
    c.strokeStyle = K; c.lineWidth = 3.4; c.lineCap = 'round'; c.beginPath();
    for (let r = 0; r < R; r++) for (let q = 0; q < C; q++) {
      if (!at(r, q)) continue; const x = ox + q * cell, y = oy + r * cell;
      if (!at(r - 1, q)) { c.moveTo(x, y); c.lineTo(x + cell, y); } if (!at(r + 1, q)) { c.moveTo(x, y + cell); c.lineTo(x + cell, y + cell); }
      if (!at(r, q - 1)) { c.moveTo(x, y); c.lineTo(x, y + cell); } if (!at(r, q + 1)) { c.moveTo(x + cell, y); c.lineTo(x + cell, y + cell); }
    }
    c.stroke(); c.lineCap = 'butt';
  }
  /** Eslabón de cadena (anillo) */
  function ring(c, cx, cy, w, h, col) {
    c.lineJoin = 'round'; rr(c, cx - w / 2, cy - h / 2, w, h, h / 2);
    c.strokeStyle = K; c.lineWidth = 12; c.stroke(); c.strokeStyle = col; c.lineWidth = 7.5; c.stroke(); c.strokeStyle = 'rgba(255,255,255,.45)'; c.lineWidth = 2; c.stroke();
  }

  /* ---------- dibujo de cada tipo de actor (coordenadas locales, centro en 0,0) ---------- */
  const TORSOS = [[RED, '#1f3d8a'], [BLUE, '#2b2f3a'], [GRN, '#6b4a2b'], [ORG, '#1f3d8a'], [PURPLE, '#2b2f3a'], [TEAL, '#4a4f5c'], [YEL, '#c4262c']];
  const HAIRS = [null, '#3b2a20', null, '#e0a73a', '#222', null];

  const DRAW = {
    monigote(c, a, t) {
      const hh = hash(a.id), ph = hh % 7, mv = a.moving, tp = TORSOS[hh % TORSOS.length], hair = HAIRS[(hh >> 3) % HAIRS.length];
      const bob = mv ? -Math.abs(Math.sin(t * 11)) * 1.8 : Math.sin(t * 2.2 + ph) * 0.8, sw = mv ? Math.sin(t * 11) * 0.5 : Math.sin(t * 1.7 + ph) * 0.03;
      const up = a.speaking || a.jump > 0.1;
      c.save(); c.scale(1.7, 1.7); c.translate(0, 12 + bob);
      // piernas (articuladas en la cadera)
      [-1, 1].forEach(s => {
        c.save(); c.translate(s * 7.5, 2); c.rotate(sw * s);
        brick(c, -6.5, 0, 13, 36, tp[1], { d: 3 });
        brick(c, -7.5, 31, 15, 7, shade(tp[1], -0.25), { d: 3 });
        c.restore();
      });
      brick(c, -15, -6, 30, 9, shade(tp[1], -0.15), { d: 4, n: 0 });
      // torso
      brick(c, -15, -31, 30, 26, tp[0], { d: 5 });
      c.fillStyle = shade(tp[0], 0.45); c.beginPath(); c.moveTo(-5, -31); c.lineTo(0, -23); c.lineTo(5, -31); c.closePath(); c.fill();
      c.fillStyle = 'rgba(0,0,0,.18)'; c.fillRect(-15, -8, 30, 3);
      // brazos (rígidos) con manos en pinza (C)
      let aL, aR;
      if (up) { const w = Math.sin(t * 9) * 0.22; aL = 2.6 + w; aR = -(2.4 - Math.sin(t * 9 + 1) * 0.22); }
      else if (a.thinking) { aL = 0.12; aR = -3.2 + Math.sin(t * 2) * 0.05; }
      else { const s2 = mv ? Math.sin(t * 11) * 0.5 : 0; aL = 0.12 + s2; aR = -0.12 + s2; }
      [[-19, aL], [19, aR]].forEach(([sx, th]) => {
        c.save(); c.translate(sx, -27); c.rotate(th);
        brick(c, -4, -1, 8, 21, tp[0], { d: 2, lw: 2.2 });
        c.lineCap = 'round'; c.beginPath(); c.arc(0, 24, 4.2, PI / 2 + 0.75, PI / 2 - 0.75 + TAU); c.strokeStyle = K; c.lineWidth = 7; c.stroke(); c.strokeStyle = YEL; c.lineWidth = 3.4; c.stroke(); c.lineCap = 'butt';
        c.restore();
      });
      // cabeza (cilindro amarillo con tetón)
      const hc = hair || YEL;
      stud(c, 0, -58, 6.2, hair || YEL, 4, 2);
      c.save(); rr(c, -13, -54, 26, 25, 6); c.fillStyle = YEL; c.fill(); c.clip();
      c.fillStyle = 'rgba(255,255,255,.3)'; c.fillRect(-9, -54, 4, 25); c.fillStyle = 'rgba(0,0,0,.13)'; c.fillRect(8, -54, 6, 25);
      if (hair) { c.fillStyle = hair; c.fillRect(-14, -55, 28, 9); c.fillRect(-14, -50, 4, 14); c.fillRect(10, -50, 4, 14); }
      c.restore();
      rr(c, -13, -54, 26, 25, 6); c.strokeStyle = K; c.lineWidth = 2.4; c.stroke();
      if (hair) { c.beginPath(); c.moveTo(-13, -46); c.lineTo(13, -46); c.lineWidth = 1.8; c.stroke(); }
      // cara
      c.fillStyle = K; const ey = a.thinking ? -41.5 : -40, ex = a.thinking ? 1 : 0;
      c.beginPath(); c.arc(-5 + ex, ey, 1.9, 0, TAU); c.arc(5 + ex, ey, 1.9, 0, TAU); c.fill();
      c.lineCap = 'round'; c.lineWidth = 1.8; c.strokeStyle = K;
      if (a.speaking) { c.beginPath(); c.ellipse(0, -34, 3.4, 1.8 + Math.abs(Math.sin(t * 12)) * 2.6, 0, 0, TAU); c.fillStyle = K; c.fill(); }
      else if (a.thinking) { c.beginPath(); c.moveTo(-3.5, -34); c.lineTo(3.5, -35); c.stroke(); c.beginPath(); c.moveTo(-9, -45); c.lineTo(-2.5, -46.5); c.stroke(); }
      else { c.beginPath(); c.arc(0, -37.5, 5, 0.2 * PI, 0.8 * PI); c.stroke(); }
      c.lineCap = 'butt';
      c.restore();
    },
    silueta_grande(c, a, t) {
      const u = 22, h = 18, rowsN = [10, 10, 10, 10, 10, 8, 4, 2, 4, 4, 4], pal = ['#27365a', '#344874', '#1d2946', '#3f5382'];
      const g = c.createRadialGradient(0, -20, 20, 0, -20, 190); g.addColorStop(0, 'rgba(247,198,0,' + (0.38 + a.hl * 0.4) + ')'); g.addColorStop(1, 'rgba(247,198,0,0)');
      c.fillStyle = g; c.fillRect(-210, -230, 420, 440);
      let yb = 112;
      rowsN.forEach((n, i) => {
        const sway = Math.sin(t * 1.6 + i * 0.25) * i * 0.35;
        course(c, sway, yb, n, u, h, pal, i * 5 + 1, { d: 7 });
        yb -= h;
      });
      // un ladrillo dorado "encendido"
      const gl = 0.5 + 0.5 * Math.sin(t * 3);
      brick(c, -11 + Math.sin(t * 1.6 + 2 * 0.25) * 0.7, 112 - 3 * h - h, 22, h, YEL, { d: 7, n: 1 }); // ladrillo dorado en el pecho
      c.fillStyle = 'rgba(255,255,255,' + (0.15 + gl * 0.25) + ')'; c.fillRect(-9, 112 - 4 * h + 3, 18, 3);
    },
    libro(c, a, t) {
      brick(c, -66, 14, 132, 14, RED, { d: 7 });
      brick(c, -62, 22, 124, 5, shade(RED, -0.2), { d: 0, flat: true, lw: 0.1 });
      c.lineJoin = 'round'; c.strokeStyle = K; c.lineWidth = 2.6;
      [[-1, 0], [1, 0]].forEach(([s]) => {
        c.fillStyle = '#fbf9ee'; c.beginPath(); c.moveTo(s * 62, 14); c.lineTo(s * 62, -22); c.lineTo(s * 4, -14); c.lineTo(s * 4, 14); c.closePath(); c.fill(); c.stroke();
        c.fillStyle = '#d9d6c8'; c.beginPath(); c.moveTo(s * 62, 14); c.lineTo(s * 62, 9); c.lineTo(s * 4, 9); c.lineTo(s * 4, 14); c.closePath(); c.fill(); c.stroke();
        c.strokeStyle = '#9aa2b4'; c.lineWidth = 2; for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(s * 54, -12 + i * 6 - 1); c.lineTo(s * 12, -7 + i * 6 - 1 + 0); c.stroke(); }
        c.strokeStyle = K; c.lineWidth = 2.6;
      });
      brick(c, -4, -10, 8, 40, YEL, { d: 3 });                     // marcapáginas
      [-44, -22, 22, 44].forEach(x => stud(c, x + 3, 10, 5, RED, 3, 1.8));
    },
    sol(c, a, t) {
      const r = 28 + Math.sin(t * 2) * 1.2;
      for (let i = 0; i < 10; i++) {
        const an = i * TAU / 10 + t * 0.4; c.save(); c.translate(Math.cos(an) * (r + 24), Math.sin(an) * (r + 24)); c.rotate(an);
        brick(c, -13, -6, 26, 12, i % 2 ? ORG : YEL, { d: 3 }); c.restore();
      }
      disc(c, 0, -3, r, YEL, 6);
      c.strokeStyle = shade(YEL, -0.25); c.lineWidth = 2.5; c.beginPath(); c.arc(0, -3, r - 9, 0, TAU); c.stroke();
      stud(c, 0, -8, 11, YEL, 5, 2.2);
    },
    arbol(c) {
      [60, 44, 28].forEach((y, i) => brick(c, -10, y - 16, 20, 16, i % 2 ? shade(BROWN, 0.1) : BROWN, { d: 6 }));
      const ns = [6, 5, 5, 4, 2], pal = [GRN, '#168a3d', '#2fb85a'];
      ns.forEach((n, i) => course(c, 0, 12 - i * 16, n, 20, 16, pal, i * 2 + 1, { d: 6, sr: 5.5 }));
    },
    reloj(c, a, t) {
      stud(c, 0, -57, 8, RED, 5, 2);
      disc(c, 0, 0, 48, WHITE, 7);
      c.strokeStyle = RED; c.lineWidth = 8; c.beginPath(); c.arc(0, 0, 43, 0, TAU); c.stroke(); c.strokeStyle = K; c.lineWidth = 2; c.beginPath(); c.arc(0, 0, 47, 0, TAU); c.stroke(); c.beginPath(); c.arc(0, 0, 39, 0, TAU); c.stroke();
      for (let i = 0; i < 12; i++) { const an = i * PI / 6; c.save(); c.translate(Math.cos(an) * 31, Math.sin(an) * 31); c.rotate(an); c.fillStyle = K; c.fillRect(-3.5, -1.8, 7, 3.6); c.restore(); }
      const m = t * 1.2;
      c.save(); c.rotate(m / 12); brick(c, -3.5, -22, 7, 26, BLUE, { d: 2, lw: 2 }); c.restore();
      c.save(); c.rotate(m); brick(c, -2.5, -34, 5, 38, RED, { d: 2, lw: 2 }); c.restore();
      stud(c, 0, -2, 5, YEL, 3, 1.8);
    },
    cadena(c, a, t) {
      const s = a.shake ? Math.sin(t * 50) * 2 : 0, xs = [-40 + s, 0, 40 - s];
      ring(c, xs[0], 0, 58, 32, GRAY); ring(c, xs[2], 0, 58, 32, GRAY); ring(c, xs[1], 0, 58, 32, '#c4c9d4');
      c.save(); c.beginPath(); c.rect(-100, -60, 200, 60); c.clip(); ring(c, xs[0], 0, 58, 32, GRAY); c.restore();
      c.save(); c.beginPath(); c.rect(0, 0, 100, 60); c.clip(); ring(c, xs[1], 0, 58, 32, '#c4c9d4'); c.restore();
    },
    martillo(c) {
      brick(c, -7, -20, 14, 92, BROWN, { d: 4 }); brick(c, -50, -52, 100, 32, GRAY, { d: 8, n: 4 });
      brick(c, -50, -52, 18, 32, DGRAY, { d: 8 }); brick(c, 32, -52, 18, 32, DGRAY, { d: 8 });
    },
    balanza(c, a, t) {
      const tilt = Math.sin(t * 1.5) * 0.08 * (a.hl ? 3 : 1);
      brick(c, -38, 56, 76, 11, DGRAY, { d: 6, n: 3 }); brick(c, -7, -52, 14, 108, GRAY, { d: 4 }); stud(c, 0, -58, 5, YEL, 4);
      c.save(); c.translate(0, -56); c.rotate(tilt); brick(c, -74, -7, 148, 14, YEL, { d: 5, n: 6 }); c.restore();
      const E = [[-66 * Math.cos(tilt), -56 - 66 * Math.sin(tilt)], [66 * Math.cos(tilt), -56 + 66 * Math.sin(tilt)]];
      E.forEach((e, i) => {
        c.strokeStyle = K; c.lineWidth = 2.4; c.beginPath(); c.moveTo(e[0], e[1]); c.lineTo(e[0] - 27, e[1] + 46); c.moveTo(e[0], e[1]); c.lineTo(e[0] + 27, e[1] + 46); c.stroke();
        brick(c, e[0] - 32, e[1] + 46, 64, 9, i ? BLUE : RED, { d: 5, n: 3 });
        if (i === 0) { brick(c, e[0] - 14, e[1] + 30, 28, 16, GRN, { d: 5, n: 1 }); } else { brick(c, e[0] - 10, e[1] + 36, 20, 10, ORG, { d: 4, n: 1 }); }
      });
    },
    corazon(c, a, t) {
      const s = 1 + Math.sin(t * 6) * 0.05; c.save(); c.scale(s, s);
      mosaic(c, ['0110110', '1211111', '1111111', '0111110', '0011100', '0001000'], 15, -52.5, -45, [RED, '#ff7a70']);
      c.restore();
    },
    cerebro(c, a, t) {
      const s = 1 + Math.sin(t * 2) * 0.015; c.save(); c.scale(s, s);
      mosaic(c, ['00111100', '01112110', '11121211', '11211121', '01112110', '00011000'], 14, -56, -42, [PINK, '#d9568b']);
      c.restore();
    },
    nube(c) {
      mosaic(c, ['00111000', '01111110', '11111111', '22222222'], 14, -56, -28, [WHITE, '#bcd8f2']);
    },
    casa(c) {
      for (let i = 0; i < 3; i++) course(c, 0, 58 - i * 16, 4, 24, 16, i % 2 ? [YEL, shade(YEL, 0.1)] : [shade(YEL, -0.06), YEL], i * 3 + 2, { d: 6 });
      brick(c, -8, 30, 26, 28, BLUE, { d: 4, flat: true }); c.fillStyle = shade(BLUE, 0.2); c.fillRect(-4, 34, 18, 10); c.strokeStyle = K; c.lineWidth = 1.6; c.strokeRect(-4, 34, 18, 10); disc(c, 12, 46, 2.5, YEL, 1);
      c.fillStyle = LBLUE; c.fillRect(-40, 24, 22, 20); c.strokeStyle = K; c.lineWidth = 2.4; c.strokeRect(-40, 24, 22, 20); c.beginPath(); c.moveTo(-29, 24); c.lineTo(-29, 44); c.moveTo(-40, 34); c.lineTo(-18, 34); c.stroke();
      course(c, 0, 10, 5, 24, 16, [RED, shade(RED, -0.1)], 1, { d: 7 }); course(c, 0, -6, 3, 24, 16, [RED, shade(RED, 0.08)], 4, { d: 7 }); course(c, 0, -22, 1, 24, 16, [RED], 3, { d: 7 });
    },
    piedra(c) {
      [[-56, 24, 52, '#9ca3b0'], [-4, 24, 62, '#b8bec9'], [-46, 4, 52, '#b8bec9'], [6, 4, 40, '#8a92a1'], [-26, -16, 50, '#9ca3b0'], [-8, 44, 0, '']].forEach(([x, y, w, col]) => { if (w) brick(c, x, y, w, 20, col, { d: 7, n: Math.round(w / 24) }); });
    },
    espejo(c, a, t) {
      brick(c, -42, -62, 84, 116, '#c7ccd6', { d: 7, n: 4 });
      c.save(); c.beginPath(); c.rect(-31, -51, 62, 94); c.clip(); c.fillStyle = LBLUE; c.fillRect(-31, -51, 62, 94);
      const s = (t * 40) % 140; c.fillStyle = 'rgba(255,255,255,.55)'; c.save(); c.translate(-80 + s, 0); c.rotate(0.5); c.fillRect(0, -80, 14, 220); c.fillRect(24, -80, 6, 220); c.restore(); c.restore();
      c.strokeStyle = K; c.lineWidth = 2.6; c.strokeRect(-31, -51, 62, 94);
      brick(c, -26, 54, 52, 12, DGRAY, { d: 5, n: 2 });
    },
    puerta(c) {
      brick(c, -44, -60, 18, 128, GRAY, { d: 5 }); brick(c, 26, -60, 18, 128, GRAY, { d: 5 }); brick(c, -44, -78, 88, 18, DGRAY, { d: 6, n: 4 });
      c.strokeStyle = 'rgba(0,0,0,.35)'; c.lineWidth = 1.6; [-36, -12, 12, 36].forEach(y => { c.beginPath(); c.moveTo(-44, y); c.lineTo(-26, y); c.moveTo(26, y + 6); c.lineTo(44, y + 6); c.stroke(); });
      c.fillStyle = BROWN; c.fillRect(-26, -60, 52, 128); c.strokeStyle = K; c.lineWidth = 2.6; c.strokeRect(-26, -60, 52, 128);
      c.fillStyle = shade(BROWN, 0.2); c.fillRect(-18, -50, 36, 46); c.fillRect(-18, 2, 36, 56); c.lineWidth = 2; c.strokeRect(-18, -50, 36, 46); c.strokeRect(-18, 2, 36, 56);
      disc(c, 14, 6, 4.5, YEL, 2);
    },
    caja(c) {
      const T0 = [-42, -14], T1 = [0, -35], T3 = [0, 7], T2 = [44, -14], col = ORG;
      c.lineJoin = 'round'; c.lineWidth = 2.6; c.strokeStyle = K;
      c.fillStyle = shade(col, -0.12); c.beginPath(); c.moveTo(T0[0], T0[1]); c.lineTo(T3[0], T3[1]); c.lineTo(0, 58); c.lineTo(-42, 36); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = shade(col, -0.34); c.beginPath(); c.moveTo(T3[0], T3[1]); c.lineTo(T2[0], T2[1]); c.lineTo(44, 36); c.lineTo(0, 58); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = shade(col, 0.3); c.beginPath(); c.moveTo(T0[0], T0[1]); c.lineTo(T1[0], T1[1]); c.lineTo(T2[0], T2[1]); c.lineTo(T3[0], T3[1]); c.closePath(); c.fill(); c.stroke();
      [[0.27, 0.27], [0.73, 0.27], [0.27, 0.73], [0.73, 0.73]].sort((p, q) => (p[0] + p[1]) - (q[0] + q[1])).forEach(([u, v]) => {
        const x = T0[0] + u * (T1[0] - T0[0]) + v * (T3[0] - T0[0]) + 1, y = T0[1] + u * (T1[1] - T0[1]) + v * (T3[1] - T0[1]) + 1.5; stud(c, x + 1, y - 3, 6, col, 4);
      });
    },
    estrella(c, a, t) {
      const pts = []; for (let i = 0; i < 10; i++) { const r = i % 2 ? 24 : 54, an = -PI / 2 + i * PI / 5 + Math.sin(t * 2) * 0.05; pts.push([Math.cos(an) * r, Math.sin(an) * r]); }
      const poly = (dy, f) => { c.beginPath(); pts.forEach((p, i) => i ? c.lineTo(p[0], p[1] + dy) : c.moveTo(p[0], p[1] + dy)); c.closePath(); c.fillStyle = f; c.fill(); c.stroke(); };
      c.lineJoin = 'round'; c.lineWidth = 3; c.strokeStyle = K; poly(7, shade(YEL, -0.3)); poly(0, YEL);
      stud(c, 0, -4, 12, YEL, 5, 2.2);
    },
    corona(c) {
      brick(c, -48, 8, 96, 24, YEL, { d: 8 });
      [-48, -13, 22].forEach((x, i) => brick(c, x, -22, 26, 30, YEL, { d: 8, n: 1, sr: 6 }));
      [[-30, RED], [0, BLUE], [30, GRN]].forEach(([x, col]) => disc(c, x, 20, 5, col, 2));
    },
    bandera(c, a, t) {
      brick(c, -38, -66, 11, 136, GRAY, { d: 4, n: 1 });
      for (let i = 0; i < 9; i++) {
        const wv = Math.sin(t * 5 + i * 0.7) * 4; brick(c, -26 + i * 10, -58 + wv, 10, 46, i % 2 ? RED : shade(RED, -0.08), { d: 2, lw: 2 });
      }
      const wv = Math.sin(t * 5 + 4 * 0.7) * 4; c.fillStyle = YEL; c.fillRect(2, -44 + wv, 16, 14); c.strokeStyle = K; c.lineWidth = 2; c.strokeRect(2, -44 + wv, 16, 14);
    },
    moneda(c, a, t) {
      const sx = Math.abs(Math.cos(t * 2)) * 0.9 + 0.1; c.save(); c.scale(sx, 1); disc(c, 0, -3, 40, '#f2b705', 7);
      c.strokeStyle = shade('#f2b705', -0.3); c.lineWidth = 3; c.beginPath(); c.arc(0, -3, 30, 0, TAU); c.stroke(); c.restore();
      if (sx > 0.5) { c.fillStyle = K; c.font = '800 34px ' + SANS; c.textAlign = 'center'; c.textBaseline = 'middle'; c.save(); c.scale(sx, 1); c.fillText('€', 0, -2); c.restore(); }
    },
    engranaje(c, a, t) {
      const N = 10, pts = []; for (let i = 0; i < N * 2; i++) { const an = i * PI / N + t * 0.8, r = i % 2 ? 41 : 54; pts.push([Math.cos(an) * r, Math.sin(an) * r]); pts.push([Math.cos(an + 0.2) * r, Math.sin(an + 0.2) * r]); }
      const poly = (dy, f) => { c.beginPath(); pts.forEach((p, i) => i ? c.lineTo(p[0], p[1] + dy) : c.moveTo(p[0], p[1] + dy)); c.closePath(); c.fillStyle = f; c.fill(); c.stroke(); };
      c.lineJoin = 'round'; c.lineWidth = 3; c.strokeStyle = K; poly(7, shade('#8f9bb0', -0.35)); poly(0, '#a6b1c4');
      c.beginPath(); c.arc(0, 0, 30, 0, TAU); c.strokeStyle = 'rgba(255,255,255,.4)'; c.lineWidth = 3; c.stroke();
      for (let i = 0; i < 4; i++) { const an = i * PI / 2 + t * 0.8 + PI / 4; c.beginPath(); c.arc(Math.cos(an) * 22, Math.sin(an) * 22, 5.5, 0, TAU); c.fillStyle = K; c.fill(); }
      c.lineWidth = 3; c.strokeStyle = K; c.beginPath(); c.arc(0, 0, 13, 0, TAU); c.fillStyle = RED; c.fill(); c.stroke();
      c.save(); c.rotate(t * 0.8); c.fillStyle = K; c.fillRect(-8, -2.5, 16, 5); c.fillRect(-2.5, -8, 5, 16); c.restore();
    },
    fuego(c, a, t) {
      const f = Math.sin(t * 12) * 0.05; c.save(); c.translate(0, 56); c.scale(1 + f, 1 - f * 0.8); c.translate(0, -56);
      mosaic(c, ['0001000', '0011000', '0011100', '0111110', '0112110', '1122211', '1122211', '1112111', '0333330'], 13, -45.5, -58, [ORG, YEL, RED]);
      c.restore();
    },
    ojo(c, a, t) {
      c.lineJoin = 'round'; c.lineWidth = 3; c.strokeStyle = K;
      const lens = dy => { c.beginPath(); c.moveTo(-60, dy); c.quadraticCurveTo(0, -58 + dy, 60, dy); c.quadraticCurveTo(0, 58 + dy, -60, dy); c.closePath(); };
      lens(7); c.fillStyle = shade(WHITE, -0.35); c.fill(); c.stroke(); lens(0); c.fillStyle = WHITE; c.fill(); c.stroke();
      c.save(); lens(0); c.clip(); const lx = Math.sin(t * 1.3) * 9;
      disc(c, lx, -2, 22, BLUE, 3); c.fillStyle = K; c.beginPath(); c.arc(lx, -2, 9, 0, TAU); c.fill(); c.fillStyle = '#fff'; c.fillRect(lx + 3, -9, 5, 5); c.restore();
      brick(c, -42, -43, 84, 11, BROWN, { d: 4, n: 0 });
    },
    interrogacion(c, a, t) {
      c.save(); c.rotate(Math.sin(t * 2) * 0.08);
      mosaic(c, ['011110', '111111', '110011', '000111', '001110', '001100', '000000', '001100'], 14, -42, -56, [RED]);
      c.restore();
    },
    bombilla(c, a, t) {
      const on = 0.5 + Math.sin(t * 4) * 0.1;
      const g = c.createRadialGradient(0, -14, 10, 0, -14, 80); g.addColorStop(0, 'rgba(255,230,90,' + on + ')'); g.addColorStop(1, 'rgba(255,230,90,0)'); c.fillStyle = g; c.fillRect(-90, -100, 180, 180);
      for (let i = 0; i < 7; i++) { const an = -PI + (i + 0.5) * PI / 7; c.save(); c.translate(Math.cos(an) * 56, -14 + Math.sin(an) * 56); c.rotate(an); brick(c, -8, -4, 16, 8, YEL, { d: 2, lw: 2 }); c.restore(); }
      disc(c, 0, -14, 31, '#ffe45c', 5);
      c.strokeStyle = ORG; c.lineWidth = 2.6; c.beginPath(); c.moveTo(-8, 10); c.lineTo(-6, -8); c.lineTo(-2, 0); c.lineTo(2, -8); c.lineTo(6, 0); c.lineTo(8, 10); c.stroke();
      brick(c, -16, 20, 32, 11, GRAY, { d: 5, n: 0 }); brick(c, -11, 31, 22, 10, DGRAY, { d: 4, n: 1, sr: 5 });
    },
    rayo(c) {
      mosaic(c, ['00011', '00110', '01100', '11111', '00111', '00110', '01100', '11000'], 14, -35, -56, [YEL]);
    },
    flor(c, a, t) {
      brick(c, -4, -2, 8, 64, GRN, { d: 3, lw: 2.2 }); brick(c, 4, 30, 24, 10, GRN, { d: 3, lw: 2.2 }); brick(c, -28, 14, 24, 10, GRN, { d: 3, lw: 2.2 });
      for (let i = 0; i < 6; i++) { const an = i * PI / 3 + t * 0.3; disc(c, Math.cos(an) * 22, -12 + Math.sin(an) * 22, 14, i % 2 ? PINK : '#f7b2d0', 4); stud(c, Math.cos(an) * 22, -16 + Math.sin(an) * 22, 5, i % 2 ? PINK : '#f7b2d0', 2.5, 1.5); }
      disc(c, 0, -12, 13, YEL, 4); stud(c, 0, -16, 6, YEL, 3, 1.8);
    },
    texto() { /* sólo etiqueta */ },
  };

  const FOOT = { monigote: 90, silueta_grande: 120, texto: 6, arbol: 62, casa: 62, puerta: 70, caja: 60, piedra: 46, libro: 34, balanza: 70, espejo: 68, flor: 64, bandera: 72, martillo: 74, cadena: 20, corona: 34, sol: 80, nube: 36, estrella: 60, interrogacion: 62, bombilla: 46, rayo: 56, corazon: 52, cerebro: 52, reloj: 56, moneda: 48, engranaje: 62, fuego: 52, ojo: 60 };
  const TOP = { monigote: -100, silueta_grande: -114, texto: -10, arbol: -62, casa: -66, puerta: -86, caja: -42, piedra: -30, libro: -30, balanza: -70, espejo: -70, flor: -40, bandera: -70, martillo: -56, cadena: -24, corona: -34, sol: -84, nube: -40, estrella: -62, interrogacion: -62, bombilla: -76, rayo: -60, corazon: -50, cerebro: -54, reloj: -62, moneda: -48, engranaje: -62, fuego: -62, ojo: -62 };
  const SHW = { monigote: 30, silueta_grande: 110, arbol: 52, casa: 70, puerta: 54, caja: 48, piedra: 56, libro: 66, balanza: 52, espejo: 46, flor: 28, bandera: 30, martillo: 24, corona: 44, engranaje: 44, cadena: 52, ojo: 0, reloj: 40, corazon: 40, cerebro: 44, moneda: 30, fuego: 36 };

  /* ---------- fondo: plancha base con tetones en perspectiva (cacheado) ---------- */
  function paintBackground(c, W, H) {
    const hz = 92;
    const sky = c.createLinearGradient(0, 0, 0, hz + 6); sky.addColorStop(0, '#9fd3f5'); sky.addColorStop(1, '#e6f5ff'); c.fillStyle = sky; c.fillRect(0, 0, W, hz + 6);
    // nubes de ladrillos
    [[120, 52, 4], [760, 38, 5], [520, 62, 3]].forEach(([x, y, n]) => { course(c, x, y, n, 18, 12, ['#ffffff', '#eef6fc'], x, { d: 5, sr: 4.5 }); course(c, x + 6, y - 12, Math.max(2, n - 2), 18, 12, ['#ffffff'], x + 1, { d: 5, sr: 4.5 }); });
    // plancha base
    const g = c.createLinearGradient(0, hz, 0, H); g.addColorStop(0, '#58c066'); g.addColorStop(1, '#2d9a46'); c.fillStyle = g; c.fillRect(0, hz, W, H - hz);
    c.fillStyle = '#1c7a33'; c.fillRect(0, hz, W, 7); c.fillStyle = '#7bd887'; c.fillRect(0, hz + 7, W, 2);
    c.strokeStyle = K; c.lineWidth = 2.4; c.beginPath(); c.moveTo(0, hz + 7); c.lineTo(W, hz + 7); c.stroke(); c.beginPath(); c.moveTo(0, hz); c.lineTo(W, hz); c.stroke();
    let y = hz + 13;
    while (y < H + 30) {
      const f = (y - hz) / (H - hz), sx = 14 + f * 52, r = sx * 0.3, rowIdx = Math.round(y);
      const off = Math.floor((rowIdx * 7) % 2) * 0;
      for (let x = W / 2 - Math.ceil(W / 2 / sx + 1) * sx + sx / 2 + off; x < W + sx; x += sx) {
        // tetón: lado oscuro + tapa clara
        c.fillStyle = '#1f8238'; c.beginPath(); c.moveTo(x - r, y); c.lineTo(x - r, y + r * 0.45); c.ellipse(x, y + r * 0.45, r, r * 0.5, 0, PI, 0, true); c.lineTo(x + r, y); c.closePath(); c.fill();
        c.fillStyle = '#7ddc8a'; c.beginPath(); c.ellipse(x, y, r, r * 0.5, 0, 0, TAU); c.fill();
        c.strokeStyle = 'rgba(10,50,20,.55)'; c.lineWidth = Math.max(0.8, r * 0.1); c.beginPath(); c.ellipse(x, y, r, r * 0.5, 0, 0, TAU); c.stroke();
      }
      y += sx * 0.5;
    }
    const v = c.createRadialGradient(W / 2, H * 0.55, H * 0.5, W / 2, H * 0.55, H * 1.0); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,30,10,.28)'); c.fillStyle = v; c.fillRect(0, 0, W, H);
  }
  let _bg = null;
  function background(ctx, W, H, k) {
    if (!_bg || _bg.k !== k) {
      const cv = document.createElement('canvas'); cv.width = Math.round(W * k); cv.height = Math.round(H * k); const c = cv.getContext('2d'); c.scale(k, k); paintBackground(c, W, H); _bg = { k, cv };
    }
    ctx.drawImage(_bg.cv, 0, 0, W, H);
  }

  /* ---------- skin ---------- */
  const PIECES = [RED, BLUE, YEL, GRN, ORG];
  const skin = {
    id: 'lego', nombre: 'Lego',
    render(ctx, st, t, W, H, k) {
      ctx.setTransform(k, 0, 0, k, 0, 0); ctx.globalAlpha = 1; ctx.lineCap = 'butt'; ctx.lineJoin = 'round';
      background(ctx, W, H, k);
      if (st.titulo) {
        ctx.font = '700 17px ' + SANS; const w = ctx.measureText(st.titulo).width + 26;
        brick(ctx, 20, 18, w, 26, BLUE, { d: 6, n: Math.max(1, Math.floor(w / 26)) });
        ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(st.titulo, 33, 31.5);
      }
      st.links.forEach(l => this.link(ctx, l, t));
      st.actors.slice().sort((a, b) => a.y - b.y).forEach(a => this.actor(ctx, a, t, W, H));
      st.flows.forEach(f => this.flow(ctx, f, t, W, H));
      st.bubbles.forEach(b => this.bubble(ctx, b, t, W, H));
      if (st.quote) this.quote(ctx, st.quote, W, H);
      if (st.subtitle) this.subtitle(ctx, st.subtitle, W, H);
      ctx.globalAlpha = 1;
    },
    actor(c, a, t, W, H) {
      const sc = a.scale, al = Math.max(0, Math.min(1, a.alpha)), foot = (FOOT[a.tipo] || 68) * sc, lift = a.jump * 46 * sc;
      // sombra en el suelo
      const sw = SHW[a.tipo] == null ? 40 : SHW[a.tipo];
      if (sw && a.tipo !== 'texto') {
        c.save(); c.globalAlpha = al * (1 - a.jump * 0.45); c.fillStyle = 'rgba(0,45,15,.34)'; c.beginPath(); c.ellipse(a.x * W, a.y * H + foot - 2, sw * sc * (1 - a.jump * 0.2), sw * sc * 0.26, 0, 0, TAU); c.fill(); c.restore();
      }
      c.save(); c.globalAlpha = al;
      const shake = a.shake ? Math.sin(t * 60) * 4 : 0;
      c.translate(a.x * W + shake, a.y * H - lift); c.scale(sc, sc);
      if (a.hl > 0 && a.tipo !== 'texto') {
        const g = c.createRadialGradient(0, 0, 10, 0, 0, 120 + a.hl * 14); g.addColorStop(0, 'rgba(255,225,60,' + (0.7 * a.hl) + ')'); g.addColorStop(1, 'rgba(255,225,60,0)');
        c.fillStyle = g; c.fillRect(-150, -150, 300, 300); const p = 1 + a.hl * 0.05; c.scale(p, p);
      }
      (DRAW[a.tipo] || DRAW.caja)(c, a, t); c.restore();
      if (a.label) {
        c.save(); c.globalAlpha = al; const big = a.tipo === 'texto';
        c.font = (big ? '800 36px ' : '700 17px ') + SANS; c.textAlign = 'center'; c.textBaseline = 'middle';
        const w = c.measureText(a.label).width + (big ? 40 : 22), h = big ? 54 : 27, y = a.y * H + foot + (big ? 2 : 8) - lift, x = a.x * W - w / 2;
        brick(c, x, y, w, h, CREAM, { d: big ? 8 : 5, n: big ? Math.max(1, Math.floor(w / 34)) : 0 });
        c.fillStyle = K; c.fillText(a.label, a.x * W, y + h / 2 + 1); c.restore();
      }
    },
    link(c, l, t) {
      const x1 = l.from.x * 960, y1 = l.from.y * 540, x2 = x1 + (l.to.x * 960 - x1) * l.grow, y2 = y1 + (l.to.y * 540 - y1) * l.grow;
      const len = Math.hypot(x2 - x1, y2 - y1), ang = Math.atan2(y2 - y1, x2 - x1), n = Math.max(1, Math.floor(len / 22));
      c.save();
      for (let i = 0; i <= n; i++) {
        const u = n ? i / n : 0, x = x1 + (x2 - x1) * u, y = y1 + (y2 - y1) * u; c.save(); c.translate(x, y); c.rotate(ang);
        brick(c, -10, -6, 20, 12, PIECES[i % PIECES.length], { d: 3, n: 1, sr: 3.4, slw: 1.4, lw: 2 }); c.restore();
      }
      if (l.nota && l.grow >= 1) this.tag(c, l.nota, (x1 + x2) / 2, (y1 + y2) / 2 - 22);
      c.restore();
    },
    tag(c, text, cx, cy) {
      c.font = '700 17px ' + SANS; c.textAlign = 'center'; c.textBaseline = 'middle'; const w = c.measureText(text).width + 22;
      brick(c, cx - w / 2, cy - 13, w, 26, CREAM, { d: 4 }); c.fillStyle = K; c.fillText(text, cx, cy + 1);
    },
    flow(c, f, t, W, H) {
      const x1 = f.from.x * W, y1 = f.from.y * H - 30, x2 = f.to.x * W, y2 = f.to.y * H - 30, cx = (x1 + x2) / 2, cy = Math.min(y1, y2) - 70;
      const env = Math.sin(Math.min(1, f.p) * PI);
      c.save();
      for (let i = 0; i < 14; i++) {
        const u = ((f.p * 1.6 + i / 14) % 1), bx = (1 - u) * (1 - u) * x1 + 2 * (1 - u) * u * cx + u * u * x2, by = (1 - u) * (1 - u) * y1 + 2 * (1 - u) * u * cy + u * u * y2;
        c.globalAlpha = env * (0.35 + 0.65 * Math.sin(u * PI)); c.save(); c.translate(bx, by); c.rotate(t * 3 + i); const wide = i % 3 === 0;
        brick(c, wide ? -12 : -7, -5, wide ? 24 : 14, 10, PIECES[i % PIECES.length], { d: 3, n: wide ? 2 : 1, sr: 3, slw: 1.4, lw: 2 }); c.restore();
      }
      if (f.nota) { c.globalAlpha = env; this.tag(c, f.nota, cx, cy - 18); }
      c.restore();
    },
    bubble(c, b, t, W, H) {
      const a = b.a, sc = a.scale; c.save(); c.globalAlpha = Math.min(b.p, b.out); c.font = '600 19px ' + SANS;
      const lines = wrap(c, b.text, 300), lh = 25, tw = Math.max(...lines.map(l => c.measureText(l).width)), bw = tw + 38, bh = lines.length * lh + 22;
      const topY = a.y * H + (TOP[a.tipo] == null ? -66 : TOP[a.tipo]) * sc - a.jump * 46 * sc;
      let bx = a.x * W - bw / 2, by = topY - bh - 30 - (1 - b.p) * 10;
      bx = Math.max(16, Math.min(W - bw - 16, bx)); by = Math.max(46, by);
      c.lineJoin = 'round'; c.strokeStyle = K; c.lineWidth = 3;
      const ax = a.x * W;
      if (b.kind === 'dice') {
        const tx = Math.max(bx + 26, Math.min(bx + bw - 26, ax));
        c.fillStyle = '#fff'; c.beginPath(); c.moveTo(tx - 11, by + bh - 3); c.lineTo(ax, by + bh + 24); c.lineTo(tx + 11, by + bh - 3); c.closePath(); c.fill(); c.stroke();
        rr(c, bx, by, bw, bh, 9); c.fillStyle = '#fff'; c.fill(); c.stroke();
        c.fillStyle = '#fff'; c.fillRect(tx - 9.5, by + bh - 3.5, 19, 7);
      } else {
        rr(c, bx, by, bw, bh, Math.min(bh / 2, 24)); c.fillStyle = '#fff'; c.fill(); c.stroke();
        disc(c, ax + 12, by + bh + 14, 7, '#fff', 3); disc(c, ax + 4, by + bh + 29, 4.5, '#fff', 2);
      }
      c.fillStyle = 'rgba(21,22,31,.07)'; c.save(); rr(c, bx, by, bw, bh, 9); c.clip(); c.fillRect(bx, by + bh - 7, bw, 7); c.restore();
      const ns = Math.max(1, Math.floor((bw - 24) / 26)), step = (bw - 24) / ns;
      for (let i = 0; i < ns; i++) stud(c, bx + 12 + step * (i + 0.5), by - 5, 6, '#f4f4f0', 4, 2);
      c.fillStyle = K; c.textAlign = 'center'; c.textBaseline = 'middle'; lines.forEach((l, i) => c.fillText(l, bx + bw / 2, by + 11 + lh / 2 + i * lh + 1));
      c.restore();
    },
    quote(c, q, W, H) {
      c.save(); c.globalAlpha = Math.min(q.p, q.out); c.font = 'italic 600 27px ' + SERIF;
      const lines = wrap(c, q.text, 640), lh = 32, bh = lines.length * lh + 44, bw = 730, x = (W - bw) / 2, y = 56 + (1 - q.p) * -14;
      brick(c, x, y, bw, bh, '#fff3d3', { d: 9, n: 0 });
      c.fillStyle = YEL; c.fillRect(x + 2, y + 2, 12, bh - 4); c.strokeStyle = K; c.lineWidth = 2; c.strokeRect(x + 2, y + 2, 12, bh - 4);
      [[x + 28, y + 14], [x + bw - 20, y + 14], [x + 28, y + bh - 14], [x + bw - 20, y + bh - 14]].forEach(p => { stud(c, p[0], p[1] - 2, 5, GRAY, 3, 1.6); });
      c.fillStyle = 'rgba(217,38,44,.85)'; c.font = '700 70px ' + SERIF; c.textAlign = 'left'; c.textBaseline = 'top'; c.fillText('“', x + 32, y - 4);
      c.fillStyle = K; c.font = 'italic 600 27px ' + SERIF; c.textAlign = 'center'; lines.forEach((l, i) => c.fillText(l, W / 2 + 10, y + 20 + i * lh));
      c.restore();
    },
    subtitle(c, s, W, H) {
      c.save(); c.globalAlpha = s.p; c.font = '700 24px ' + SANS; const lines = wrap(c, s.text, 800), lh = 31, bh = lines.length * lh + 20, y = H - bh - 20, x = 56, w = W - 112;
      brick(c, x, y, w, bh, BLUE, { d: 9, n: Math.floor(w / 32) });
      c.fillStyle = '#fff'; c.textAlign = 'center'; c.textBaseline = 'middle'; lines.forEach((l, i) => c.fillText(l, W / 2, y + 10 + lh / 2 + i * lh + 1)); c.restore();
    },
  };

  global.SceneSkins = global.SceneSkins || {};
  global.SceneSkins.lego = skin;
})(window);
