/* ============================================================
 * skin-notebook.js — estilo "MONIGOTES" (cuaderno + trazo a mano)
 * Dibuja el estado de SceneModel en un canvas 2D lógico de 960×540.
 * Exporta también utilidades (Pen, wrap, rng) reutilizables por otros skins.
 * ============================================================ */
(function (global) {
  'use strict';

  /* ---------- utilidades ---------- */
  function rng(seed) { let s = seed >>> 0; return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296; }
  function hash(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

  /** Parte un texto en líneas que caben en maxW (usa ctx.font actual). */
  function wrap(ctx, text, maxW) {
    const words = String(text).split(/\s+/); const lines = []; let cur = '';
    words.forEach(w => { const test = cur ? cur + ' ' + w : w; if (ctx.measureText(test).width > maxW && cur) { lines.push(cur); cur = w; } else cur = test; });
    if (cur) lines.push(cur); return lines;
  }

  /** "Lápiz" con temblor controlado: todo trazo parece dibujado a mano. */
  class Pen {
    constructor(ctx, seed, jitter) { this.c = ctx; this.r = rng(seed); this.j = jitter == null ? 1.4 : jitter; }
    w() { return (this.r() - 0.5) * 2 * this.j; }
    style(color, width) { const c = this.c; c.strokeStyle = color; c.lineWidth = width; c.lineCap = 'round'; c.lineJoin = 'round'; }
    line(x1, y1, x2, y2) {
      const c = this.c; c.beginPath(); c.moveTo(x1 + this.w(), y1 + this.w());
      c.quadraticCurveTo((x1 + x2) / 2 + this.w() * 2, (y1 + y2) / 2 + this.w() * 2, x2 + this.w(), y2 + this.w()); c.stroke();
    }
    poly(pts, close, fill) {
      const c = this.c; c.beginPath(); pts.forEach((p, i) => { const x = p[0] + this.w(), y = p[1] + this.w(); i ? c.lineTo(x, y) : c.moveTo(x, y); });
      if (close) c.closePath(); if (fill) { c.fillStyle = fill; c.fill(); } c.stroke();
    }
    circle(cx, cy, r, fill) { this.ellipse(cx, cy, r, r, fill); }
    ellipse(cx, cy, rx, ry, fill, a0 = 0, a1 = Math.PI * 2 + 0.25) {
      const c = this.c, n = 22; c.beginPath();
      for (let i = 0; i <= n; i++) {
        const a = a0 + (a1 - a0) * i / n, k = 1 + (this.r() - 0.5) * 0.05 * this.j;
        const x = cx + Math.cos(a) * rx * k, y = cy + Math.sin(a) * ry * k; i ? c.lineTo(x, y) : c.moveTo(x, y);
      }
      if (fill) { c.fillStyle = fill; c.fill(); } c.stroke();
    }
    rect(x, y, w, h, fill) { this.poly([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], true, fill); }
    curve(pts) { // curva suave por puntos
      const c = this.c; c.beginPath(); c.moveTo(pts[0][0] + this.w(), pts[0][1] + this.w());
      for (let i = 1; i < pts.length - 1; i++) { const mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2; c.quadraticCurveTo(pts[i][0] + this.w(), pts[i][1] + this.w(), mx, my); }
      const l = pts[pts.length - 1]; c.lineTo(l[0], l[1]); c.stroke();
    }
  }

  const INK = '#1b1b1f', PAPER = '#fbf8ef', RED = '#d6402f', BLUE = '#2b5fa8', YELLOW = '#f2c230', GREEN = '#3b8f5b', ORANGE = '#e8862a';

  /* ---------- dibujo de cada tipo de actor (coordenadas locales, centro en 0,0) ---------- */
  const DRAW = {
    monigote(p, a, t) {
      const c = p.c, ph = hash(a.id) % 7, mv = a.moving;
      const bob = Math.sin(t * 3 + ph) * 1.8, swing = mv ? Math.sin(t * 11) * 22 : Math.sin(t * 2 + ph) * 2;
      p.style(INK, 4);
      // piernas
      p.line(0, 22 + bob, -16 - swing * 0.2, 82); p.line(0, 22 + bob, 16 + swing * 0.2, 82);
      // torso
      p.line(0, -42 + bob, 0, 22 + bob);
      // brazos
      if (a.speaking || a.jump > 0.1) {
        const w = Math.sin(t * 9) * 8;
        p.line(0, -30 + bob, -30, -52 + w); p.line(0, -30 + bob, 30, -58 - w);
      } else if (a.thinking) {
        p.line(0, -30 + bob, -26, -6); p.line(0, -30 + bob, 22, -52); p.line(22, -52, 8, -64);
      } else { p.line(0, -30 + bob, -28 - swing * 0.3, 0); p.line(0, -30 + bob, 28 + swing * 0.3, 0); }
      // cabeza
      p.circle(0, -62 + bob, 20, PAPER);
      c.fillStyle = INK; c.beginPath(); c.arc(-7, -65 + bob, 2.2, 0, 7); c.arc(7, -65 + bob, 2.2, 0, 7); c.fill();
      p.style(INK, 2.6);
      if (a.speaking) { p.ellipse(0, -53 + bob, 5, 3 + Math.abs(Math.sin(t * 12)) * 3, INK); }
      else if (a.thinking) { p.line(-5, -52 + bob, 5, -54 + bob); p.line(-11, -73 + bob, -3, -75 + bob); }
      else p.curve([[-6, -54 + bob], [0, -50 + bob], [6, -54 + bob]]);
    },
    silueta_grande(p, a, t) {
      const c = p.c; const br = Math.sin(t * 1.6) * 3;
      c.save(); p.style(INK, 4);
      // halo
      const g = c.createRadialGradient(0, -30, 20, 0, -30, 170); g.addColorStop(0, 'rgba(242,194,48,' + (0.35 + a.hl * 0.4) + ')'); g.addColorStop(1, 'rgba(242,194,48,0)');
      c.fillStyle = g; c.fillRect(-190, -200, 380, 380);
      // cuerpo: hombros + cabeza, relleno con trazos diagonales
      const body = new Path2D(); body.moveTo(-95, 120); body.quadraticCurveTo(-100, 10 + br, -50, -18); body.lineTo(50, -18); body.quadraticCurveTo(100, 10 + br, 95, 120); body.closePath();
      body.moveTo(34, -62 + br); body.arc(0, -62 + br, 34, 0, Math.PI * 2);
      c.save(); c.clip(body); c.fillStyle = 'rgba(27,27,31,.10)'; c.fillRect(-120, -120, 240, 260);
      c.lineWidth = 2; c.strokeStyle = INK; for (let x = -240; x < 240; x += 9) { c.beginPath(); c.moveTo(x, 140); c.lineTo(x + 170, -110); c.stroke(); } c.restore();
      c.lineWidth = 4; c.stroke(body);
      c.restore();
    },
    libro(p, a, t) {
      p.style(INK, 3.6);
      p.poly([[-60, -28], [-4, -20], [-4, 36], [-60, 28]], true, PAPER); p.poly([[60, -28], [4, -20], [4, 36], [60, 28]], true, PAPER);
      p.style(INK, 2); for (let i = 0; i < 4; i++) { p.line(-52, -14 + i * 9, -12, -8 + i * 9); p.line(12, -8 + i * 9, 52, -14 + i * 9); }
    },
    sol(p, a, t) {
      p.style(INK, 3.6); const r = 28 + Math.sin(t * 2) * 1.5;
      for (let i = 0; i < 12; i++) { const an = i * Math.PI / 6 + t * 0.4; p.line(Math.cos(an) * (r + 8), Math.sin(an) * (r + 8), Math.cos(an) * (r + 24 + (i % 2) * 8), Math.sin(an) * (r + 24 + (i % 2) * 8)); }
      p.circle(0, 0, r, YELLOW);
    },
    arbol(p) {
      p.style(INK, 3.6); p.poly([[-9, 70], [-6, 10], [6, 10], [9, 70]], true, '#c9a26c');
      p.circle(-24, -6, 28, '#a9d18e'); p.circle(24, -8, 28, '#a9d18e'); p.circle(0, -34, 32, '#a9d18e');
    },
    reloj(p, a, t) {
      p.style(INK, 3.6); p.circle(0, 0, 50, PAPER);
      for (let i = 0; i < 12; i++) { const an = i * Math.PI / 6; p.line(Math.cos(an) * 41, Math.sin(an) * 41, Math.cos(an) * 47, Math.sin(an) * 47); }
      const m = t * 1.2; p.style(INK, 4); p.line(0, 0, Math.sin(m) * 36, -Math.cos(m) * 36); p.line(0, 0, Math.sin(m / 12) * 22, -Math.cos(m / 12) * 22);
    },
    cadena(p, a, t) {
      p.style(INK, 5); const s = a.shake ? Math.sin(t * 50) * 2 : 0;
      p.ellipse(-36 + s, 0, 26, 15); p.ellipse(0, 0, 26, 15); p.ellipse(36 - s, 0, 26, 15);
    },
    martillo(p) {
      p.style(INK, 3.6); p.poly([[-4, -12], [4, -12], [8, 70], [-8, 70]], true, '#c9a26c'); p.poly([[-44, -42], [34, -42], [34, -10], [-44, -10]], true, '#cfd3da');
    },
    balanza(p, a, t) {
      p.style(INK, 3.6); const tilt = Math.sin(t * 1.5) * 0.08 * (a.hl ? 3 : 1);
      p.line(0, -56, 0, 62); p.line(-26, 66, 26, 66);
      const L = [-62 * Math.cos(tilt), -56 - 62 * Math.sin(tilt)], R = [62 * Math.cos(tilt), -56 + 62 * Math.sin(tilt)];
      p.line(L[0], L[1], R[0], R[1]);
      [L, R].forEach(e => { p.line(e[0], e[1], e[0] - 22, e[1] + 44); p.line(e[0], e[1], e[0] + 22, e[1] + 44); p.curve([[e[0] - 26, e[1] + 44], [e[0], e[1] + 58], [e[0] + 26, e[1] + 44]]); });
    },
    corazon(p, a, t) {
      const c = p.c, s = 1 + Math.sin(t * 6) * 0.06; c.save(); c.scale(s, s); p.style(INK, 3.6);
      c.beginPath(); c.moveTo(0, 44); c.bezierCurveTo(-70, -6, -34, -56, 0, -20); c.bezierCurveTo(34, -56, 70, -6, 0, 44);
      c.fillStyle = RED; c.fill(); c.stroke(); c.restore();
    },
    cerebro(p, a, t) {
      p.style(INK, 3.6); p.circle(-22, -6, 26, '#f4b6c2'); p.circle(20, -8, 28, '#f4b6c2'); p.circle(0, 16, 26, '#f4b6c2');
      p.style(INK, 2); p.curve([[-30, -10], [-14, 0], [-4, -14]]); p.curve([[8, -22], [20, -6], [34, -16]]); p.curve([[-14, 20], [0, 8], [14, 22]]);
    },
    nube(p) {
      p.style(INK, 3.6); const c = p.c; c.beginPath(); c.moveTo(-50, 24); c.arc(-38, 6, 20, Math.PI * 0.6, Math.PI * 1.5); c.arc(-6, -14, 26, Math.PI, Math.PI * 1.9); c.arc(34, 0, 22, Math.PI * 1.3, Math.PI * 0.5); c.closePath(); c.fillStyle = '#eaf1fb'; c.fill(); c.stroke();
    },
    casa(p) {
      p.style(INK, 3.6); p.rect(-44, -4, 88, 66, PAPER); p.poly([[-56, -4], [0, -52], [56, -4]], true, '#e8a79c'); p.rect(-10, 28, 22, 34, '#c9a26c'); p.rect(-34, 10, 18, 18, '#cfe6f7');
    },
    piedra(p) { p.style(INK, 3.6); p.poly([[-48, 34], [-40, -6], [-14, -32], [22, -26], [46, 4], [40, 34]], true, '#b9bcc3'); p.style(INK, 2); p.curve([[-20, -2], [-4, 4], [12, -4]]); },
    espejo(p, a, t) {
      p.style(INK, 3.6); p.ellipse(0, -8, 34, 50, '#dff0fb'); p.line(0, 42, 0, 66); p.line(-20, 68, 20, 68);
      p.style(INK, 2); const s = (t * 20) % 60; p.line(-18, -30 + s * 0.3, -6, -44 + s * 0.3); p.line(-24, -14, -4, -40);
    },
    puerta(p, a) {
      p.style(INK, 3.6); p.poly([[-34, 66], [-34, -34], [0, -58], [34, -34], [34, 66]], true, '#c9a26c');
      p.circle(20, 14, 4, INK); p.style(INK, 2); p.line(0, -50, 0, 66);
    },
    caja(p) { p.style(INK, 3.6); p.poly([[-40, -14], [0, -34], [44, -14], [0, 6]], true, '#e4c28b'); p.poly([[-40, -14], [0, 6], [0, 56], [-40, 36]], true, '#cba66b'); p.poly([[0, 6], [44, -14], [44, 36], [0, 56]], true, '#d9b87c'); },
    estrella(p, a, t) {
      p.style(INK, 3.6); const pts = []; for (let i = 0; i < 10; i++) { const r = i % 2 ? 22 : 52, an = -Math.PI / 2 + i * Math.PI / 5 + Math.sin(t * 2) * 0.05; pts.push([Math.cos(an) * r, Math.sin(an) * r]); }
      p.poly(pts, true, YELLOW);
    },
    corona(p) { p.style(INK, 3.6); p.poly([[-46, 30], [-52, -26], [-24, 0], [0, -40], [24, 0], [52, -26], [46, 30]], true, YELLOW); p.circle(0, 14, 5, RED); },
    bandera(p, a, t) {
      p.style(INK, 3.6); p.line(-30, 66, -30, -62); const pts = []; for (let i = 0; i <= 8; i++) pts.push([-30 + i * 11, -58 + Math.sin(t * 5 + i * 0.7) * 5]);
      const bot = pts.map(q => [q[0], q[1] + 44]).reverse(); p.poly(pts.concat(bot), true, RED);
    },
    moneda(p, a, t) {
      const c = p.c, sx = Math.abs(Math.cos(t * 2)) * 0.9 + 0.1; c.save(); c.scale(sx, 1); p.style(INK, 3.6); p.circle(0, 0, 40, YELLOW); p.circle(0, 0, 30); c.restore();
      c.fillStyle = INK; c.font = '700 34px Caveat, cursive'; c.textAlign = 'center'; c.textBaseline = 'middle'; if (sx > 0.5) c.fillText('€', 0, 2);
    },
    engranaje(p, a, t) {
      p.style(INK, 3.6); const pts = [], N = 10; for (let i = 0; i < N * 2; i++) { const an = i * Math.PI / N + t * 0.8, r = i % 2 ? 40 : 52; pts.push([Math.cos(an) * r, Math.sin(an) * r]); pts.push([Math.cos(an + 0.2) * r, Math.sin(an + 0.2) * r]); }
      p.poly(pts, true, '#cfd3da'); p.circle(0, 0, 14, PAPER);
    },
    fuego(p, a, t) {
      const c = p.c, f = Math.sin(t * 12) * 3; p.style(INK, 3.6);
      c.beginPath(); c.moveTo(0, 50); c.bezierCurveTo(-52, 40, -40, -10, -8 + f, -50); c.bezierCurveTo(-4, -20, 14, -26, 18, -2); c.bezierCurveTo(34, -16, 40, 12, 40, 28); c.bezierCurveTo(40, 46, 20, 52, 0, 50); c.fillStyle = ORANGE; c.fill(); c.stroke();
      c.beginPath(); c.moveTo(0, 48); c.bezierCurveTo(-22, 44, -14, 18, 0, 8 + f); c.bezierCurveTo(16, 20, 22, 44, 0, 48); c.fillStyle = YELLOW; c.fill();
    },
    ojo(p, a, t) {
      p.style(INK, 3.6); const c = p.c; c.beginPath(); c.moveTo(-58, 0); c.quadraticCurveTo(0, -56, 58, 0); c.quadraticCurveTo(0, 56, -58, 0); c.fillStyle = PAPER; c.fill(); c.stroke();
      const lx = Math.sin(t * 1.3) * 8; p.circle(lx, 0, 20, '#7fb0d9'); c.fillStyle = INK; c.beginPath(); c.arc(lx, 0, 8, 0, 7); c.fill();
    },
    interrogacion(p, a, t) { const c = p.c; c.fillStyle = RED; c.font = '700 110px Caveat, cursive'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.save(); c.rotate(Math.sin(t * 2) * 0.08); c.fillText('?', 0, 0); c.restore(); },
    bombilla(p, a, t) {
      p.style(INK, 3.6); const on = 0.6 + Math.sin(t * 4) * 0.1;
      for (let i = 0; i < 7; i++) { const an = -Math.PI + (i + 0.5) * Math.PI / 7; p.line(Math.cos(an) * 48, -14 + Math.sin(an) * 48, Math.cos(an) * 66, -14 + Math.sin(an) * 66); }
      p.circle(0, -14, 32, 'rgba(242,194,48,' + on + ')'); p.rect(-14, 18, 28, 18, '#cfd3da'); p.line(-10, 44, 10, 44);
    },
    rayo(p, a, t) { p.style(INK, 3.6); p.poly([[10, -62], [-30, 6], [-4, 6], [-16, 62], [32, -12], [4, -12]], true, YELLOW); },
    flor(p, a, t) {
      p.style(INK, 3.6); p.curve([[0, 66], [-4, 30], [0, 0]]); for (let i = 0; i < 6; i++) { const an = i * Math.PI / 3 + t * 0.3; p.circle(Math.cos(an) * 22, -6 + Math.sin(an) * 22, 14, '#f7b2d0'); } p.circle(0, -6, 12, YELLOW);
    },
    texto() { /* sólo etiqueta */ },
  };

  const FOOT = { monigote: 96, silueta_grande: 130, texto: 10 };
  const TOP = { monigote: -92, silueta_grande: -110, texto: -10 };

  /* ---------- skin ---------- */
  const skin = {
    id: 'monigotes', nombre: 'Monigotes',
    render(ctx, st, t, W, H, k) {
      ctx.setTransform(k, 0, 0, k, 0, 0);
      this.background(ctx, W, H);
      // título tenue
      ctx.fillStyle = 'rgba(27,27,31,.35)'; ctx.font = '500 20px Caveat, cursive'; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText(st.titulo, 84, 14);
      // enlaces permanentes
      st.links.forEach(l => this.link(ctx, l, t));
      // actores ordenados por y (los de abajo delante)
      st.actors.slice().sort((a, b) => a.y - b.y).forEach(a => this.actor(ctx, a, t, W, H));
      st.flows.forEach(f => this.flow(ctx, f, t, W, H));
      st.bubbles.forEach(b => this.bubble(ctx, b, t, W, H));
      if (st.quote) this.quote(ctx, st.quote, W, H);
      if (st.subtitle) this.subtitle(ctx, st.subtitle, W, H);
    },
    background(ctx, W, H) {
      ctx.fillStyle = PAPER; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = 'rgba(70,120,190,.22)'; ctx.lineWidth = 1.2;
      for (let y = 60; y < H; y += 34) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
      ctx.strokeStyle = 'rgba(214,64,47,.35)'; ctx.beginPath(); ctx.moveTo(70, 0); ctx.lineTo(70, H); ctx.stroke();
      const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.4, W / 2, H / 2, H * 0.95); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(90,70,30,.18)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    },
    actor(ctx, a, t, W, H) {
      const boil = Math.floor(t * 6); // el trazo "hierve" 6 veces por segundo
      const pen = new Pen(ctx, hash(a.id) + boil * 131, 1.2);
      const sc = a.scale; ctx.save();
      const shake = a.shake ? Math.sin(t * 60) * 4 : 0;
      ctx.translate(a.x * W + shake, a.y * H - a.jump * 46 * sc); ctx.scale(sc, sc); ctx.globalAlpha = Math.max(0, Math.min(1, a.alpha));
      if (a.hl > 0 && a.tipo !== 'texto') { // marcador amarillo de "resalta"
        ctx.fillStyle = 'rgba(242,194,48,' + (0.45 * a.hl) + ')'; ctx.beginPath(); ctx.ellipse(0, 0, 78 + a.hl * 10, 98 + a.hl * 10, 0, 0, 7); ctx.fill();
      }
      (DRAW[a.tipo] || DRAW.caja)(pen, a, t); ctx.restore();
      if (a.label) {
        ctx.save(); ctx.globalAlpha = Math.max(0, Math.min(1, a.alpha));
        const big = a.tipo === 'texto'; ctx.font = (big ? '700 44px' : '700 24px') + ' Caveat, cursive'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        const y = a.y * H + (FOOT[a.tipo] || 72) * sc + 4 - a.jump * 46 * sc; const w = ctx.measureText(a.label).width;
        ctx.fillStyle = 'rgba(242,194,48,.55)'; ctx.fillRect(a.x * W - w / 2 - 6, y + (big ? 20 : 12), w + 12, big ? 16 : 11);
        ctx.fillStyle = INK; ctx.fillText(a.label, a.x * W, y); ctx.restore();
      }
    },
    link(ctx, l, t) {
      const p = new Pen(ctx, hash(String(l.from.a.id + l.to.a.id)) + Math.floor(t * 4), 1.5); p.style(BLUE, 3.4);
      const x1 = l.from.x * 960, y1 = l.from.y * 540, x2 = x1 + (l.to.x * 960 - x1) * l.grow, y2 = y1 + (l.to.y * 540 - y1) * l.grow;
      ctx.setLineDash([10, 7]); p.line(x1, y1, x2, y2); ctx.setLineDash([]);
      if (l.nota && l.grow >= 1) { ctx.font = '600 22px Caveat, cursive'; ctx.fillStyle = BLUE; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillText(l.nota, (x1 + x2) / 2, (y1 + y2) / 2 - 8); }
    },
    flow(ctx, f, t, W, H) {
      const x1 = f.from.x * W, y1 = f.from.y * H - 30, x2 = f.to.x * W, y2 = f.to.y * H - 30, cx = (x1 + x2) / 2, cy = Math.min(y1, y2) - 70;
      const env = Math.sin(Math.min(1, f.p) * Math.PI);
      ctx.save();
      for (let i = 0; i < 16; i++) {
        const u = ((f.p * 1.6 + i / 16) % 1), bx = (1 - u) * (1 - u) * x1 + 2 * (1 - u) * u * cx + u * u * x2, by = (1 - u) * (1 - u) * y1 + 2 * (1 - u) * u * cy + u * u * y2;
        ctx.globalAlpha = env * (0.35 + 0.65 * Math.sin(u * Math.PI)); ctx.fillStyle = i % 3 === 0 ? YELLOW : ORANGE; ctx.beginPath(); ctx.arc(bx, by, 6 + (i % 4), 0, 7); ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 1.6; ctx.stroke();
      }
      if (f.nota) { ctx.globalAlpha = env; ctx.font = '700 25px Caveat, cursive'; ctx.fillStyle = INK; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillText(f.nota, cx, cy - 6); }
      ctx.restore();
    },
    bubble(ctx, b, t, W, H) {
      const a = b.a, sc = a.scale; ctx.save(); ctx.globalAlpha = Math.min(b.p, b.out); ctx.font = '700 26px Caveat, cursive';
      const lines = wrap(ctx, b.text, 300), lh = 28, tw = Math.max(...lines.map(l => ctx.measureText(l).width)), bw = tw + 30, bh = lines.length * lh + 22;
      const topY = a.y * H + (TOP[a.tipo] ?? -66) * sc - a.jump * 46 * sc;
      let bx = a.x * W - bw / 2, by = topY - bh - 26 - (1 - b.p) * 10;
      bx = Math.max(16, Math.min(W - bw - 16, bx)); by = Math.max(40, by);
      const pen = new Pen(ctx, hash(b.text) + Math.floor(t * 4), 1.0); pen.style(INK, 3);
      if (b.kind === 'dice') {
        const tx = Math.max(bx + 24, Math.min(bx + bw - 24, a.x * W));
        pen.poly([[bx + 12, by], [bx + bw - 12, by], [bx + bw, by + 12], [bx + bw, by + bh - 12], [bx + bw - 12, by + bh], [tx + 14, by + bh], [a.x * W, by + bh + 22], [tx - 10, by + bh], [bx + 12, by + bh], [bx, by + bh - 12], [bx, by + 12]], true, '#fff');
      } else {
        pen.ellipse(bx + bw / 2, by + bh / 2, bw / 2 + 6, bh / 2 + 4, '#fff'); pen.circle(a.x * W + 12, by + bh + 14, 7, '#fff'); pen.circle(a.x * W + 4, by + bh + 28, 4, '#fff');
      }
      ctx.fillStyle = INK; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; lines.forEach((l, i) => ctx.fillText(l, bx + bw / 2, by + 11 + lh / 2 + i * lh)); ctx.restore();
    },
    quote(ctx, q, W, H) {
      ctx.save(); ctx.globalAlpha = Math.min(q.p, q.out); ctx.font = 'italic 500 27px "Cormorant Garamond", serif';
      const lines = wrap(ctx, q.text, 640), lh = 32, bh = lines.length * lh + 44, bw = 720, x = (W - bw) / 2, y = 52 + (1 - q.p) * -14;
      ctx.fillStyle = '#fffdf6'; ctx.strokeStyle = INK; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.roundRect(x, y, bw, bh, 10); ctx.fill(); ctx.stroke();
      ctx.fillStyle = YELLOW; ctx.fillRect(x, y, 8, bh);
      ctx.fillStyle = 'rgba(214,64,47,.8)'; ctx.font = '700 70px "Cormorant Garamond", serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText('“', x + 16, y - 8);
      ctx.fillStyle = INK; ctx.font = 'italic 500 27px "Cormorant Garamond", serif'; ctx.textAlign = 'center'; lines.forEach((l, i) => ctx.fillText(l, W / 2 + 10, y + 20 + i * lh));
      ctx.restore();
    },
    subtitle(ctx, s, W, H) {
      ctx.save(); ctx.globalAlpha = s.p; ctx.font = '700 31px Caveat, cursive'; const lines = wrap(ctx, s.text, 820), lh = 36, bh = lines.length * lh + 14, y = H - bh - 18;
      ctx.fillStyle = 'rgba(251,248,239,.92)'; ctx.strokeStyle = 'rgba(27,27,31,.25)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.roundRect(60, y, W - 120, bh, 12); ctx.fill(); ctx.stroke();
      ctx.fillStyle = INK; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; lines.forEach((l, i) => ctx.fillText(l, W / 2, y + 7 + lh / 2 + i * lh)); ctx.restore();
    },
  };

  global.SceneSkins = global.SceneSkins || {};
  global.SceneSkins.monigotes = skin;
  global.SceneSkins._h = { Pen, wrap, rng, hash, DRAW, INK, PAPER, RED, BLUE, YELLOW, GREEN, ORANGE, FOOT, TOP };
})(window);
