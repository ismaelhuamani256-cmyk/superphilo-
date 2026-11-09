/* ============================================================
 * skin-comic.js — estilo "CÓMIC" (viñeta, semitono, bocadillos)
 * Reutiliza DRAW de skin-notebook (SceneSkins._h) con trazo grueso
 * negro y color plano; añade viñeta con puntos de semitono, líneas
 * de acción, bocadillos con cola, cajas de narración y onomatopeyas.
 * ============================================================ */
(function (global) {
  'use strict';
  const H = global.SceneSkins && global.SceneSkins._h;
  if (!H) { console.warn('skin-comic: requiere skin-notebook.js'); return; }
  const { Pen, wrap, rng, hash, DRAW, FOOT, TOP } = H;

  const INK = '#15121a', CREAM = '#f6ead0', YEL = '#ffd23f', MAG = '#e0457b', BLU = '#2f6fb5', RED = '#e5383b';
  const SKIN = '#ffd9ae';
  const SHIRTS = ['#e0457b', '#2f6fb5', '#3b9a63', '#f08a24', '#7a4fb5', '#e5383b'];
  const HAIRS = ['#3a2a20', '#1b1b1f', '#8a5a2b', '#c9c9d0', '#d9a441'];
  const THEMES = [
    { base: '#fbe6ae', a: BLU, b: MAG, ray: 'rgba(255,255,255,.30)' },
    { base: '#f9d6cc', a: MAG, b: '#f2a900', ray: 'rgba(255,255,255,.28)' },
    { base: '#cfe6ee', a: BLU, b: '#f2a900', ray: 'rgba(255,255,255,.32)' },
  ];
  const M = 14;              // margen de la viñeta
  const FLOATING = { sol: 1, nube: 1, estrella: 1, rayo: 1, bombilla: 1, interrogacion: 1, ojo: 1, texto: 1, fuego: 1 };
  const SFX_HL = ['¡POW!', '¡ZAS!', '¡BAM!', '¡EUREKA!', '¡CLIC!'];

  const up = s => String(s).toLocaleUpperCase('es');
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  /* Lápiz de cómic: trazo grueso, siempre tinta negra, poco temblor */
  class CPen extends Pen {
    style(color, width) { super.style(INK, width <= 2.2 ? width * 1.4 + 0.8 : width * 1.45 + 0.6); }
    mf(f) { return f && this.map && this.map[f] ? this.map[f] : f; }
    poly(pts, close, fill) { return super.poly(pts, close, this.mf(fill)); }
    ellipse(cx, cy, rx, ry, fill, a0, a1) { return super.ellipse(cx, cy, rx, ry, this.mf(fill), a0, a1); }
  }

  /* ---------- helpers de dibujo ---------- */
  let patCtx = null; const patCache = {};
  function dotPattern(ctx, color, step, r) {
    if (patCtx !== ctx) { patCtx = ctx; for (const k in patCache) delete patCache[k]; }
    const key = color + step + r; if (patCache[key]) return patCache[key];
    const cv = document.createElement('canvas'); cv.width = cv.height = step * 4; const c = cv.getContext('2d');
    c.fillStyle = color; [[.25, .25], [.75, .75]].forEach(q => { c.beginPath(); c.arc(q[0] * step * 4, q[1] * step * 4, r * 4, 0, 7); c.fill(); });
    const p = ctx.createPattern(cv, 'repeat'); try { p.setTransform(new DOMMatrix().scale(0.25)); } catch (e) { /* sin setTransform */ }
    return (patCache[key] = p);
  }
  function starburst(ctx, cx, cy, rOut, rIn, n, rot) {
    ctx.beginPath();
    for (let i = 0; i < n * 2; i++) { const a = rot + i * Math.PI / n, r = i % 2 ? rIn : rOut; const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.closePath();
  }
  function lettering(ctx, txt, x, y, size, fill, stroke, sw) {
    ctx.font = '700 ' + size + 'px Caveat, cursive'; ctx.lineJoin = 'round'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = sw; ctx.strokeText(txt, x, y); }
    ctx.fillStyle = fill; ctx.fillText(txt, x, y);
  }
  /** Caja con borde grueso y sombra dura. */
  function box(ctx, x, y, w, h, fill, r, bw, sh) {
    ctx.save(); ctx.lineJoin = 'round';
    if (sh) { ctx.fillStyle = 'rgba(21,18,26,.85)'; ctx.beginPath(); ctx.roundRect(x + sh, y + sh, w, h, r); ctx.fill(); }
    ctx.fillStyle = fill; ctx.strokeStyle = INK; ctx.lineWidth = bw; ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fill(); ctx.stroke(); ctx.restore();
  }

  /* ---------- actores propios (sobre-escriben a DRAW) ---------- */
  const D = Object.assign({}, DRAW);
  D.silueta_grande = function (p, a, t) {
    const c = p.c, br = Math.sin(t * 1.6) * 3; c.save();
    const body = new Path2D(); body.moveTo(-95, 120); body.quadraticCurveTo(-100, 10 + br, -50, -18); body.lineTo(50, -18); body.quadraticCurveTo(100, 10 + br, 95, 120); body.closePath();
    body.moveTo(34, -62 + br); body.arc(0, -62 + br, 34, 0, Math.PI * 2);
    c.fillStyle = '#2d3f7a'; c.fill(body);
    c.save(); c.clip(body); c.fillStyle = dotPattern(c, '#8fb0ee', 11, 2.8); c.fillRect(-120, -120, 240, 260);
    c.fillStyle = 'rgba(255,255,255,.18)'; c.beginPath(); c.moveTo(-100, -120); c.lineTo(-30, -120); c.lineTo(-90, 130); c.lineTo(-120, 130); c.fill(); c.restore();
    c.lineWidth = 6; c.lineJoin = 'round'; c.strokeStyle = INK; c.stroke(body);
    c.fillStyle = YEL; c.beginPath(); c.arc(-12, -66 + br, 4, 0, 7); c.arc(12, -66 + br, 4, 0, 7); c.fill();
    c.restore();
  };
  D.interrogacion = function (p, a, t) {
    const c = p.c; c.save(); c.rotate(Math.sin(t * 2) * 0.08); lettering(c, '?', 0, 0, 120, RED, INK, 12); c.restore();
  };
  D.monigote = function (p, a, t) {
    const c = p.c, hh = hash(a.id), bob = Math.sin(t * 3 + hh % 7) * 1.8;
    const shirt = SHIRTS[hh % SHIRTS.length], hairC = HAIRS[(hh >> 3) % HAIRS.length], hairKind = (hh >> 5) % 4;
    p.map = { [H.PAPER]: SKIN };
    p.style(INK, 3.6);
    p.poly([[-17, -42 + bob], [17, -42 + bob], [14, 24 + bob], [-14, 24 + bob]], true, shirt);
    DRAW.monigote(p, a, t);
    if (hairKind) { // cabello
      p.style(INK, 3);
      c.fillStyle = hairC; c.beginPath();
      const top = hairKind === 3 ? 1.0 : 1.08, end = hairKind === 3 ? 2.0 : 1.92;
      c.arc(0, -62 + bob, 21, Math.PI * top, Math.PI * end); c.closePath(); c.fill(); c.stroke();
    }
  };

  /* ---------- fondo (cacheado) ---------- */
  const bgCache = {};
  function buildBg(W, H_, k, th) {
    const cv = document.createElement('canvas'); cv.width = Math.round(W * k); cv.height = Math.round(H_ * k); const c = cv.getContext('2d');
    c.setTransform(k, 0, 0, k, 0, 0);
    c.fillStyle = CREAM; c.fillRect(0, 0, W, H_);
    const x0 = M, y0 = M, pw = W - 2 * M, ph = H_ - 2 * M;
    c.save(); c.beginPath(); c.rect(x0, y0, pw, ph); c.clip();
    c.fillStyle = th.base; c.fillRect(x0, y0, pw, ph);
    // rayos tipo "sunburst"
    const cx = W / 2, cy = H_ * 0.46, n = 30; c.fillStyle = th.ray;
    for (let i = 0; i < n; i++) { const a0 = i * 2 * Math.PI / n, a1 = a0 + Math.PI / n; c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + Math.cos(a0) * 1400, cy + Math.sin(a0) * 1400); c.lineTo(cx + Math.cos(a1) * 1400, cy + Math.sin(a1) * 1400); c.fill(); }
    // semitono: rejilla a 45°, tamaño según gradiente
    const dots = (color, step, maxR, fn) => {
      c.fillStyle = color; c.beginPath(); const s = Math.SQRT1_2;
      for (let u = -900; u < 900; u += step) for (let v = -900; v < 900; v += step) {
        const x = W / 2 + (u - v) * s, y = H_ / 2 + (u + v) * s; if (x < x0 - 4 || x > x0 + pw + 4 || y < y0 - 4 || y > y0 + ph + 4) continue;
        const r = maxR * clamp(fn(x, y), 0, 1); if (r < 0.35) continue; c.moveTo(x + r, y); c.arc(x, y, r, 0, 7);
      }
      c.fill();
    };
    dots(th.a, 12, 4.6, (x, y) => 1 - Math.hypot((x - 0) / W, (y - 0) / H_) * 1.5);                // esquina sup. izq.
    dots(th.a, 12, 3.4, (x, y) => 1 - Math.hypot((x - W) / W, (y - 0) / H_) * 2.1);                  // esquina sup. der.
    dots(th.b, 12, 5, (x, y) => 1 - Math.hypot((x - W) / W, (y - H_) / H_) * 1.5);                  // esquina inf. der.
    dots(th.b, 12, 3.4, (x, y) => 1 - Math.hypot((x - 0) / W, (y - H_) / H_) * 2.1);                 // esquina inf. izq.
    // suelo: franja inferior más cálida
    c.fillStyle = 'rgba(21,18,26,.07)'; c.fillRect(x0, H_ * 0.78, pw, H_ * 0.22 - M);
    c.restore();
    return cv;
  }

  /* ---------- skin ---------- */
  const skin = {
    id: 'comic', nombre: 'Cómic',
    _prev: {}, _dir: {},
    render(ctx, st, t, W, H_, k) {
      ctx.setTransform(k, 0, 0, k, 0, 0); ctx.globalAlpha = 1;
      this.background(ctx, st, W, H_, k);
      this.track(st, t);
      st.links.forEach(l => this.link(ctx, l, t, W, H_));
      st.actors.slice().sort((a, b) => a.y - b.y).forEach(a => this.actor(ctx, a, t, W, H_));
      st.flows.forEach(f => this.flow(ctx, f, t, W, H_));
      st.actors.forEach(a => this.sfx(ctx, a, t, W, H_));
      st.bubbles.forEach(b => this.bubble(ctx, b, t, W, H_));
      this.frame(ctx, W, H_);
      this.titleBox(ctx, st, W);
      if (st.quote) this.quote(ctx, st.quote, W, H_);
      if (st.subtitle) this.subtitle(ctx, st.subtitle, W, H_);
    },
    background(ctx, st, W, H_, k) {
      const th = THEMES[hash(st.titulo || '') % THEMES.length], key = k + '|' + (hash(st.titulo || '') % THEMES.length);
      const bg = bgCache[key] || (bgCache[key] = buildBg(W, H_, k, th));
      ctx.drawImage(bg, 0, 0, W, H_);
    },
    frame(ctx, W, H_) { // tapa lo que se salga de la viñeta y dibuja el borde grueso
      ctx.save(); ctx.fillStyle = CREAM; ctx.beginPath(); ctx.rect(0, 0, W, H_); ctx.rect(M, M, W - 2 * M, H_ - 2 * M); ctx.fill('evenodd');
      ctx.strokeStyle = INK; ctx.lineWidth = 7; ctx.lineJoin = 'miter'; ctx.strokeRect(M, M, W - 2 * M, H_ - 2 * M); ctx.restore();
    },
    track(st, t) { // dirección de movimiento por actor (para las líneas de acción)
      st.actors.forEach(a => {
        const pv = this._prev[a.id];
        if (pv && t > pv.t && t - pv.t < 0.5 && Math.abs(a.x - pv.x) > 1e-4) this._dir[a.id] = Math.sign(a.x - pv.x);
        else if (!pv || t < pv.t || t - pv.t >= 0.5) this._dir[a.id] = 0;
        this._prev[a.id] = { x: a.x, t };
      });
    },
    titleBox(ctx, st, W) {
      if (!st.titulo) return;
      ctx.save(); let size = 21; ctx.font = '700 ' + size + 'px Caveat, cursive'; const txt = up(st.titulo); let w = ctx.measureText(txt).width;
      if (w > 540) { size = Math.floor(size * 540 / w); ctx.font = '700 ' + size + 'px Caveat, cursive'; w = ctx.measureText(txt).width; }
      box(ctx, M + 12, M + 12, w + 24, 32, YEL, 0, 3.5, 3);
      ctx.fillStyle = INK; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(txt, M + 24, M + 29); ctx.restore();
    },
    actor(ctx, a, t, W, H_) {
      const sc = a.scale, pen = new CPen(ctx, hash(a.id), 0.5), al = clamp(a.alpha, 0, 1);
      const gx = a.x * W, gy = a.y * H_, jy = a.jump * 46 * sc, cy = gy - jy;
      ctx.save(); ctx.globalAlpha = al;
      // sombra de semitono en el suelo
      if (!FLOATING[a.tipo]) {
        const fy = gy + ((FOOT[a.tipo] || 72) - 14) * sc, sw = (a.tipo === 'silueta_grande' ? 80 : 46) * sc * (1 - a.jump * 0.25);
        ctx.fillStyle = dotPattern(ctx, 'rgba(21,18,26,.55)', 6, 1.5); ctx.beginPath(); ctx.ellipse(gx, fy, sw, 9 * sc, 0, 0, 7); ctx.fill();
      }
      this.action(ctx, a, t, gx, cy, sc);
      const shake = a.shake ? Math.sin(t * 60) * 4 : 0;
      ctx.save(); ctx.translate(gx + shake, cy); ctx.scale(sc, sc);
      (D[a.tipo] || D.caja)(pen, a, t); ctx.restore();
      ctx.restore();
      if (a.label) this.label(ctx, a, W, H_, sc, jy);
    },
    /** Estallido amarillo + líneas de acción detrás del actor. */
    action(ctx, a, t, cx, cy, sc) {
      const tex = a.tipo === 'texto'; if (tex) return;
      const hl = a.hl, jp = a.jump, inten = Math.max(hl, jp);
      const mid = cy - 10 * sc, seed = hash(a.id) + Math.floor(t * 12) * 17;
      if (hl > 0.02) { // estallido
        const r = (86 + hl * 22) * sc, rot = t * 0.5; ctx.save(); ctx.globalAlpha *= clamp(hl * 1.6, 0, 1);
        starburst(ctx, cx, mid, r * 1.12, r * 0.74, 14, rot); ctx.fillStyle = YEL; ctx.fill(); ctx.lineWidth = 5; ctx.strokeStyle = INK; ctx.lineJoin = 'miter'; ctx.stroke();
        starburst(ctx, cx, mid, r * 0.82, r * 0.56, 14, rot + 0.2); ctx.fillStyle = '#fff2a8'; ctx.fill(); ctx.restore();
      }
      if (inten > 0.05) { // líneas radiales
        const rnd = rng(seed), n = 26; ctx.save(); ctx.fillStyle = INK; ctx.globalAlpha *= clamp(inten * 1.4, 0, 0.9);
        for (let i = 0; i < n; i++) {
          const an = (i + rnd() * 0.6) * 2 * Math.PI / n, r0 = (100 + rnd() * 20) * sc * (hl > 0.02 ? 1.12 : 1), r1 = r0 + (40 + rnd() * 70) * sc * inten, w = 0.045 + rnd() * 0.03;
          ctx.beginPath(); ctx.moveTo(cx + Math.cos(an - w) * r0, mid + Math.sin(an - w) * r0); ctx.lineTo(cx + Math.cos(an) * r1, mid + Math.sin(an) * r1); ctx.lineTo(cx + Math.cos(an + w) * r0, mid + Math.sin(an + w) * r0); ctx.fill();
        }
        ctx.restore();
      }
      if (a.moving) { // líneas de velocidad horizontales, detrás del movimiento
        const d = this._dir[a.id] || 0, rnd = rng(seed + 7); ctx.save(); ctx.fillStyle = INK; ctx.globalAlpha *= 0.75;
        for (let i = 0; i < 9; i++) {
          const yy = mid + (-84 + i * 21 + (rnd() - 0.5) * 10) * sc, len = (70 + rnd() * 110) * sc, th = (2.2 + rnd() * 2.2) * sc;
          [d >= 0 ? -1 : 0, d <= 0 ? 1 : 0].forEach(sd => {
            if (!sd) return; const x0 = cx + sd * (44 + rnd() * 14) * sc, x1 = x0 + sd * len;
            ctx.beginPath(); ctx.moveTo(x0, yy - th); ctx.lineTo(x1, yy); ctx.lineTo(x0, yy + th); ctx.closePath(); ctx.fill();
          });
        }
        ctx.restore();
      }
    },
    label(ctx, a, W, H_, sc, jy) {
      ctx.save(); ctx.globalAlpha = clamp(a.alpha, 0, 1); const big = a.tipo === 'texto', txt = up(a.label);
      ctx.font = '700 ' + (big ? 46 : 22) + 'px Caveat, cursive'; ctx.textBaseline = 'middle';
      const y = a.y * H_ + (FOOT[a.tipo] || 72) * sc + (big ? 20 : 18) - jy, tw = ctx.measureText(txt).width, x = clamp(a.x * W, M + 20 + tw / 2, W - M - 20 - tw / 2);
      if (big) { lettering(ctx, txt, x + 3, y + 3, 46, INK, INK, 10); lettering(ctx, txt, x, y, 46, YEL, INK, 10); }
      else { box(ctx, x - tw / 2 - 9, y - 15, tw + 18, 30, '#fffdf4', 5, 3, 2.5); ctx.fillStyle = INK; ctx.textAlign = 'center'; ctx.fillText(txt, x, y + 1); }
      ctx.restore();
    },
    /** Onomatopeyas al resaltar / saltar / temblar. */
    sfx(ctx, a, t, W, H_) {
      if (a.tipo === 'texto') return;
      let word = null, col = YEL, inten = 0;
      if (a.shake) { word = '¡BRRR!'; col = '#9ad7f0'; inten = 1; }
      else if (a.jump > 0.15) { word = '¡BOING!'; col = '#b7e36b'; inten = a.jump; }
      else if (a.hl > 0.25) { word = SFX_HL[hash(a.id) % SFX_HL.length]; col = '#ff8fb5'; inten = a.hl; }
      if (!word) return;
      const sc = a.scale, side = a.x < 0.5 ? 1 : -1, cx = clamp(a.x * W + side * 100 * sc, M + 70, W - M - 70), cy = clamp(a.y * H_ - 40 * sc - a.jump * 46 * sc, M + 70, H_ - 150);
      const pop = Math.min(1, inten * 3 + 0.3) * (1 + Math.sin(t * 14) * 0.03), rot = side * 0.12 + (a.shake ? Math.sin(t * 40) * 0.05 : 0);
      ctx.save(); ctx.globalAlpha = clamp(a.alpha, 0, 1); ctx.translate(cx, cy); ctx.rotate(rot); ctx.scale(pop, pop);
      starburst(ctx, 3, 4, 66, 40, 11, 0.3); ctx.fillStyle = 'rgba(21,18,26,.85)'; ctx.fill();
      starburst(ctx, 0, 0, 66, 40, 11, 0.3); ctx.fillStyle = col; ctx.lineWidth = 5; ctx.strokeStyle = INK; ctx.lineJoin = 'miter'; ctx.fill(); ctx.stroke();
      ctx.save(); ctx.clip(); ctx.fillStyle = dotPattern(ctx, 'rgba(255,255,255,.55)', 7, 1.7); ctx.fillRect(-70, -70, 140, 70); ctx.restore();
      const len = ctx.measureText(word).width; lettering(ctx, word, 0, 2, word.length > 5 ? 30 : 36, '#fff', INK, 7); void len;
      ctx.restore();
    },
    link(ctx, l, t, W, H_) {
      const x1 = l.from.x * W, y1 = l.from.y * H_, x2 = x1 + (l.to.x * W - x1) * l.grow, y2 = y1 + (l.to.y * H_ - y1) * l.grow;
      ctx.save(); ctx.lineCap = 'round';
      [[11, INK, []], [5, '#ffffff', []], [5, BLU, [12, 10]]].forEach(s => { ctx.lineWidth = s[0]; ctx.strokeStyle = s[1]; ctx.setLineDash(s[2]); ctx.lineDashOffset = -t * 20; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); });
      ctx.setLineDash([]);
      if (l.nota && l.grow >= 1) {
        ctx.font = '700 21px Caveat, cursive'; const txt = up(l.nota), w = ctx.measureText(txt).width + 18, mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
        box(ctx, mx - w / 2, my - 16, w, 32, '#fff', 6, 3, 2.5); ctx.fillStyle = BLU; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(txt, mx, my + 1);
      }
      ctx.restore();
    },
    flow(ctx, f, t, W, H_) {
      const x1 = f.from.x * W, y1 = f.from.y * H_ - 30, x2 = f.to.x * W, y2 = f.to.y * H_ - 30, cx = (x1 + x2) / 2, cy = Math.min(y1, y2) - 70;
      const env = Math.sin(Math.min(1, f.p) * Math.PI); ctx.save();
      for (let i = 0; i < 12; i++) {
        const u = (f.p * 1.6 + i / 12) % 1, bx = (1 - u) * (1 - u) * x1 + 2 * (1 - u) * u * cx + u * u * x2, by = (1 - u) * (1 - u) * y1 + 2 * (1 - u) * u * cy + u * u * y2;
        ctx.globalAlpha = env * (0.45 + 0.55 * Math.sin(u * Math.PI)); const r = 8 + (i % 3) * 2;
        if (i % 3 === 0) { starburst(ctx, bx, by, r + 6, r * 0.5, 5, t * 3 + i); ctx.fillStyle = YEL; } else { ctx.beginPath(); ctx.arc(bx, by, r, 0, 7); ctx.fillStyle = i % 3 === 1 ? MAG : '#fff'; }
        ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.lineJoin = 'round'; ctx.stroke();
      }
      if (f.nota) { ctx.globalAlpha = env; lettering(ctx, up(f.nota), cx, cy - 12, 26, '#fff', INK, 7); }
      ctx.restore();
    },
    bubble(ctx, b, t, W, H_) {
      const a = b.a, sc = a.scale; ctx.save(); ctx.globalAlpha = Math.min(b.p, b.out); ctx.font = '700 25px Caveat, cursive';
      const think = b.kind !== 'dice', txt = up(b.text), lines = wrap(ctx, txt, 310), lh = 28, tw = Math.max(...lines.map(l => ctx.measureText(l).width));
      const bw = tw + (think ? 56 : 34), bh = lines.length * lh + (think ? 34 : 24);
      const topY = a.y * H_ + (TOP[a.tipo] ?? -66) * sc - a.jump * 46 * sc;
      let bx = a.x * W - bw / 2, by = topY - bh - 28 - (1 - b.p) * 10; const sx = think ? 14 : 0;
      bx = clamp(bx, M + 14 + sx, W - M - bw - 14 - sx); by = Math.max(M + 52, by);
      const hx = clamp(a.x * W, bx + 28, bx + bw - 28), pop = 0.85 + 0.15 * b.p;
      ctx.translate(bx + bw / 2, by + bh / 2); ctx.scale(pop, pop); ctx.translate(-(bx + bw / 2), -(by + bh / 2));
      ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      const shapes = [];
      if (!think) {
        const rect = new Path2D(); rect.roundRect(bx, by, bw, bh, 20);
        const tail = new Path2D(); tail.moveTo(hx - 15, by + bh - 8); tail.quadraticCurveTo(hx - 6, by + bh + 14, a.x * W - 4, by + bh + 30); tail.quadraticCurveTo(hx + 4, by + bh + 12, hx + 13, by + bh - 8); tail.closePath();
        shapes.push(rect, tail);
      } else {
        const cxm = bx + bw / 2, cym = by + bh / 2, rx = bw / 2 - 12, ry = bh / 2 - 8, n = 13, cloud = new Path2D();
        cloud.ellipse(cxm, cym, rx, ry, 0, 0, 7); shapes.push(cloud);
        for (let i = 0; i < n; i++) { const an = i * 2 * Math.PI / n, p = new Path2D(); p.arc(cxm + Math.cos(an) * rx, cym + Math.sin(an) * ry, 15 + (i % 2) * 2, 0, 7); shapes.push(p); }
        const t1 = new Path2D(); t1.arc(a.x * W + 8, by + bh + 14, 8, 0, 7); const t2 = new Path2D(); t2.arc(a.x * W + 2, by + bh + 29, 5, 0, 7); shapes.push(t1, t2);
      }
      ctx.save(); ctx.translate(4, 4); ctx.fillStyle = 'rgba(21,18,26,.85)'; ctx.strokeStyle = 'rgba(21,18,26,.85)'; ctx.lineWidth = 8; shapes.forEach(s => { ctx.stroke(s); ctx.fill(s); }); ctx.restore();
      ctx.strokeStyle = INK; ctx.lineWidth = 8; shapes.forEach(s => ctx.stroke(s));
      ctx.fillStyle = '#fff'; shapes.forEach(s => ctx.fill(s));
      ctx.fillStyle = INK; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      lines.forEach((l, i) => ctx.fillText(l, bx + bw / 2, by + bh / 2 + (i - (lines.length - 1) / 2) * lh + 1));
      ctx.restore();
    },
    quote(ctx, q, W, H_) {
      ctx.save(); ctx.globalAlpha = Math.min(q.p, q.out); ctx.font = 'italic 600 28px "Cormorant Garamond", serif';
      const lines = wrap(ctx, q.text, 610), lh = 34, bw = 700, bh = lines.length * lh + 52, x = (W - bw) / 2, y = M + 62 + (1 - q.p) * -14;
      box(ctx, x, y, bw, bh, '#fffdf4', 4, 5, 6);
      ctx.save(); ctx.beginPath(); ctx.rect(x + 2, y + 2, bw - 4, bh - 4); ctx.clip();
      ctx.fillStyle = dotPattern(ctx, MAG, 8, 2.2); starburst(ctx, x + bw, y + bh, 110, 90, 1, 0); ctx.beginPath(); ctx.arc(x + bw, y + bh, 100, 0, 7); ctx.fill();
      ctx.fillStyle = dotPattern(ctx, BLU, 8, 2); ctx.beginPath(); ctx.arc(x, y, 60, 0, 7); ctx.fill(); ctx.restore();
      // etiqueta "CITA"
      box(ctx, x + 18, y - 17, 78, 30, MAG, 0, 3.5, 3); lettering(ctx, 'CITA', x + 57, y - 1, 22, '#fff', null, 0);
      ctx.fillStyle = '#fffdf4'; ctx.beginPath(); ctx.roundRect(x + 38, y + 14, bw - 76, bh - 28, 8); ctx.fill();
      ctx.font = '700 80px "Cormorant Garamond", serif'; ctx.fillStyle = YEL; ctx.strokeStyle = INK; ctx.lineWidth = 5; ctx.lineJoin = 'round'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      ctx.strokeText('“', x + 42, y + 8); ctx.fillText('“', x + 42, y + 8);
      ctx.fillStyle = INK; ctx.font = 'italic 600 28px "Cormorant Garamond", serif'; ctx.textAlign = 'center';
      lines.forEach((l, i) => ctx.fillText(l, W / 2 + 12, y + 28 + i * lh));
      ctx.restore();
    },
    subtitle(ctx, s, W, H_) {
      ctx.save(); ctx.globalAlpha = s.p; ctx.font = '700 30px Caveat, cursive';
      const lines = wrap(ctx, up(s.text), 800), lh = 34, bh = lines.length * lh + 20, bw = clamp(Math.max(...lines.map(l => ctx.measureText(l).width)) + 50, 260, 860), x = (W - bw) / 2, y = H_ - M - bh - 22 + (1 - s.p) * 8;
      box(ctx, x, y, bw, bh, YEL, 0, 4.5, 5);
      ctx.save(); ctx.beginPath(); ctx.rect(x + 2, y + 2, bw - 4, bh - 4); ctx.clip(); ctx.fillStyle = dotPattern(ctx, 'rgba(224,150,0,.55)', 7, 1.6); ctx.fillRect(x, y, bw, bh); ctx.restore();
      ctx.fillStyle = INK; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; lines.forEach((l, i) => ctx.fillText(l, W / 2, y + 10 + lh / 2 + i * lh + 1));
      ctx.restore();
    },
  };

  global.SceneSkins = global.SceneSkins || {};
  global.SceneSkins.comic = skin;
})(window);
