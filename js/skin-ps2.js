/* ============================================================
 * skin-ps2.js — estilo "PS2" (3D real con Three.js, low-poly)
 *
 * · Un <canvas> WebGL a baja resolución (320×180, ampliado con
 *   image-rendering:pixelated) se inserta DETRÁS del <canvas> 2D del
 *   reproductor. El canvas 2D (cv) queda visible encima, transparente,
 *   y sólo dibuja el texto (burbujas, subtítulos, cita, etiquetas).
 * · Sin sombras reales, sin antialias; niebla corta, texturas Nearest,
 *   "snap" de vértices, temblor de cámara determinista según t.
 * · Los meshes se cachean por actor.id y se actualizan cada frame.
 * Contrato: SceneSkins.ps2 = { id, nombre, init, resize, render, dispose }
 * ============================================================ */
(function (global) {
  'use strict';

  const RW = 320, RH = 180;           // resolución interna de render
  const SNAP = true;                  // "vertex snap" tipo PS2
  const FONT = 'Inter, "Segoe UI", sans-serif';

  /* ---------- utilidades ---------- */
  function hash(str) { let h = 2166136261; str = String(str); for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rng(seed) { let s = seed >>> 0; return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296; }
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  function wrap(ctx, text, maxW) {
    const words = String(text).split(/\s+/); const lines = []; let cur = '';
    words.forEach(w => { const test = cur ? cur + ' ' + w : w; if (ctx.measureText(test).width > maxW && cur) { lines.push(cur); cur = w; } else cur = test; });
    if (cur) lines.push(cur); return lines;
  }

  /* ---------- paleta apagada ---------- */
  const C = {
    sky: 0x9db3b4, grass: 0x6f8a5a, grass2: 0x7f9868, sand: 0xa89f80, wood: 0x8a6a45, wood2: 0x6d5236, stone: 0x8d9094, leaf: 0x4f7a52, leaf2: 0x5f8a58,
    red: 0xa65245, gold: 0xcdb062, blue: 0x5f80a6, blue2: 0x4a6688, pink: 0xc99aa3, cream: 0xe6dfc8, dark: 0x2f353b, steel: 0x8c98a4, orange: 0xd08a3a,
    yellow: 0xe3cf78, white: 0xeef0e6, skin: 0xd0b48a, green: 0x5e8c63, mauve: 0x8e7596,
  };
  const SHIRTS = [C.blue, C.green, C.orange, C.mauve, C.red, 0x6b8f94];

  /* ---------- texturas pixeladas generadas con canvas ---------- */
  function makeTexture(kind, seed) {
    const T = global.THREE, S = 32, cv = document.createElement('canvas'); cv.width = cv.height = S;
    const g = cv.getContext('2d'), r = rng(seed || 7), img = g.createImageData(S, S), d = img.data;
    const put = (x, y, v) => { const i = (y * S + x) * 4; d[i] = d[i + 1] = d[i + 2] = clamp(v, 0, 255); d[i + 3] = 255; };
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      let v = 215 + (r() - 0.5) * 36;
      if (kind === 'grass') { v = 205 + (r() - 0.5) * 50; if (r() < 0.07) v -= 45; if (r() < 0.04) v += 25; }
      else if (kind === 'planks') { if (y % 8 === 0) v = 150; else if ((x + ((y >> 3) * 11)) % 32 === 0) v = 165; v += (r() - 0.5) * 20; }
      else if (kind === 'bricks') { const row = y >> 2; if (y % 4 === 0) v = 150; else if ((x + (row % 2) * 8) % 16 === 0) v = 160; v += (r() - 0.5) * 24; }
      else if (kind === 'checker') { v = (((x >> 3) + (y >> 3)) & 1) ? 235 : 190; v += (r() - 0.5) * 12; }
      else if (kind === 'stripes') { v = (y % 6 < 3) ? 235 : 175; v += (r() - 0.5) * 10; }
      else if (kind === 'sand') { v = 220 + (r() - 0.5) * 24; if (r() < 0.05) v -= 30; }
      put(x, y, v);
    }
    g.putImageData(img, 0, 0);
    const tex = new T.CanvasTexture(cv);
    tex.magFilter = T.NearestFilter; tex.minFilter = T.NearestFilter; tex.generateMipmaps = false;
    tex.wrapS = tex.wrapT = T.RepeatWrapping; tex.colorSpace = T.SRGBColorSpace;
    return tex;
  }
  /** Textura con un glifo (texto) con alpha, para '?', '€', esfera del reloj… */
  function glyphTexture(ch, color, bg, size) {
    const T = global.THREE, S = size || 64, cv = document.createElement('canvas'); cv.width = cv.height = S;
    const g = cv.getContext('2d');
    if (bg) { g.fillStyle = bg; g.fillRect(0, 0, S, S); }
    g.fillStyle = color; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '600 ' + Math.round(S * 0.85) + 'px ' + FONT; g.fillText(ch, S / 2, S / 2 + S * 0.04);
    const tex = new T.CanvasTexture(cv); tex.magFilter = T.NearestFilter; tex.minFilter = T.NearestFilter; tex.generateMipmaps = false; tex.colorSpace = T.SRGBColorSpace;
    return tex;
  }
  function clockFaceTexture() {
    const T = global.THREE, S = 64, cv = document.createElement('canvas'); cv.width = cv.height = S; const g = cv.getContext('2d');
    g.fillStyle = '#e9e3cc'; g.fillRect(0, 0, S, S); g.fillStyle = '#2f353b';
    for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6, x = S / 2 + Math.sin(a) * 25, y = S / 2 - Math.cos(a) * 25; g.fillRect(Math.round(x) - 1, Math.round(y) - 1, i % 3 === 0 ? 3 : 2, i % 3 === 0 ? 3 : 2); }
    const tex = new T.CanvasTexture(cv); tex.magFilter = T.NearestFilter; tex.minFilter = T.NearestFilter; tex.generateMipmaps = false; tex.colorSpace = T.SRGBColorSpace;
    return tex;
  }

  /* ---------- "snap" de vértices (PS2) ---------- */
  const SNAP_U = { value: null };
  function patchSnap(mat) {
    if (!SNAP) return;
    mat.onBeforeCompile = (sh) => {
      sh.uniforms.uSnap = SNAP_U;
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nuniform vec2 uSnap;')
        .replace('#include <project_vertex>', '#include <project_vertex>\n  gl_Position.xy = floor(gl_Position.xy / gl_Position.w * uSnap + 0.5) / uSnap * gl_Position.w;');
    };
    mat.customProgramCacheKey = () => 'ps2snap';
  }

  /* ============================================================
   * Construcción de actores
   * ============================================================ */
  function createState(cv) {
    const T = global.THREE;
    const S = { cv, ok: false, actors: new Map(), geos: new Map(), texs: {}, mats: [], disposables: [], scr: new Map() };

    /* --- geometrías compartidas (cache por clave) --- */
    const geo = (key, make) => { let g = S.geos.get(key); if (!g) { g = make(); S.geos.set(key, g); } return g; };
    S.G = {
      box: (w, h, d) => geo('b' + [w, h, d], () => new T.BoxGeometry(w, h, d)),
      cyl: (rt, rb, h, n, open) => geo('c' + [rt, rb, h, n, !!open], () => new T.CylinderGeometry(rt, rb, h, n, 1, !!open)),
      cone: (r, h, n) => geo('k' + [r, h, n], () => new T.ConeGeometry(r, h, n)),
      sph: (r, w, h) => geo('s' + [r, w, h], () => new T.SphereGeometry(r, w || 7, h || 5)),
      ico: (r, d) => geo('i' + [r, d], () => new T.IcosahedronGeometry(r, d || 0)),
      tor: (R, r, a, b) => geo('t' + [R, r, a, b], () => new T.TorusGeometry(R, r, a, b)),
      plane: (w, h, sw, sh) => geo('p' + [w, h, sw, sh], () => new T.PlaneGeometry(w, h, sw || 1, sh || 1)),
    };
    S.tex = (kind) => S.texs[kind] || (S.texs[kind] = makeTexture(kind, hash(kind)));
    S.glyph = (ch, color) => { const k = 'g' + ch + color; return S.texs[k] || (S.texs[k] = glyphTexture(ch, color)); };
    return S;
  }

  /** "Rig": ayudante para construir un actor (grupo + materiales propios). */
  class Rig {
    constructor(S, id) {
      const T = global.THREE; this.S = S; this.T = T; this.id = id;
      this.root = new T.Group();           // posición / escala / salto
      this.body = new T.Group(); this.root.add(this.body); // balanceo y animación
      this.mats = []; this.h = 2.5; this.lift = 0; this.rad = 0.8; this.fy = 0.1; this.bs = 1; this.anim = null;
    }
    /** material propio; o: {map, basic, op, emissive, side} */
    m(color, o) {
      const T = this.T; o = o || {};
      const p = { color, dithering: true };
      if (o.map) p.map = this.S.tex(o.map);
      if (o.tex) p.map = o.tex;
      if (o.side) p.side = o.side;
      if (o.alphaTest) p.alphaTest = o.alphaTest;
      let mat;
      if (o.basic) mat = new T.MeshBasicMaterial(p);
      else { p.flatShading = true; mat = new T.MeshLambertMaterial(p); }
      const op = o.op == null ? 1 : o.op;
      if (op < 1) { mat.transparent = true; mat.opacity = op; if (o.basic) mat.depthWrite = false; }
      patchSnap(mat);
      const e = { m: mat, base: new T.Color(color), op, basic: !!o.basic, glow: o.glow || 0, tr: op < 1, hl: -1, al: -1 };
      this.mats.push(e); this.S.mats.push(mat); return mat;
    }
    add(parent, g, mat, x, y, z, rx, ry, rz) {
      const me = new this.T.Mesh(g, mat); me.position.set(x || 0, y || 0, z || 0);
      if (rx || ry || rz) me.rotation.set(rx || 0, ry || 0, rz || 0);
      (parent || this.body).add(me); return me;
    }
    pivot(parent, x, y, z) { const g = new this.T.Group(); g.position.set(x || 0, y || 0, z || 0); (parent || this.body).add(g); return g; }
  }

  /* Cada constructor recibe (r) y rellena r.body; opcionalmente asigna r.anim(a,t) */
  const BUILD = {
    monigote(r) {
      const G = r.S.G, ph = hash(r.id) % 7, hsh = hash(r.id);
      const skin = r.m(C.skin), shirt = r.m(SHIRTS[hsh % SHIRTS.length], { map: 'noise' }), pants = r.m(C.blue2), dark = r.m(C.dark, { basic: true }), hair = r.m([0x4a3a2c, 0x2f2a28, 0x7a5a38, 0x8a8a84][hsh % 4]);
      r.h = 2.9; r.rad = 0.7; r.fy = 0.16;
      const legL = r.pivot(null, -0.22, 1.0, 0), legR = r.pivot(null, 0.22, 1.0, 0);
      [legL, legR].forEach(l => { r.add(l, G.box(0.3, 1.0, 0.3), pants, 0, -0.5, 0); r.add(l, G.box(0.34, 0.14, 0.5), dark, 0, -0.97, 0.08); });
      r.add(null, G.box(0.86, 1.05, 0.48), shirt, 0, 1.52, 0);
      const armL = r.pivot(null, -0.56, 1.95, 0), armR = r.pivot(null, 0.56, 1.95, 0);
      [armL, armR].forEach(a => { r.add(a, G.box(0.22, 0.9, 0.22), shirt, 0, -0.4, 0); r.add(a, G.box(0.2, 0.2, 0.2), skin, 0, -0.9, 0); });
      const head = r.pivot(null, 0, 2.4, 0);
      r.add(head, G.sph(0.44, 7, 6), skin, 0, 0, 0); r.add(head, G.box(0.84, 0.2, 0.78), hair, 0, 0.34, -0.02);
      r.add(head, G.box(0.1, 0.1, 0.06), dark, -0.16, 0.05, 0.4); r.add(head, G.box(0.1, 0.1, 0.06), dark, 0.16, 0.05, 0.4);
      const mouth = r.add(head, G.box(0.22, 0.05, 0.06), dark, 0, -0.17, 0.41);
      r.anim = (a, t) => {
        const mv = a.moving, sw = mv ? Math.sin(t * 11) * 0.75 : Math.sin(t * 2 + ph) * 0.04;
        legL.rotation.x = sw; legR.rotation.x = -sw;
        r.body.position.y = mv ? Math.abs(Math.sin(t * 11)) * 0.14 : Math.sin(t * 2 + ph) * 0.03;
        if (a.speaking || a.jump > 0.1) {
          armL.rotation.set(0, 0, -2.5 - Math.sin(t * 9) * 0.35); armR.rotation.set(0, 0, 2.3 + Math.sin(t * 9 + 1) * 0.35);
        } else if (a.thinking) {
          armL.rotation.set(0, 0, -0.12); armR.rotation.set(-2.3, 0, 0.35);
        } else {
          armL.rotation.set(mv ? -sw : 0, 0, -0.1 - Math.sin(t * 2 + ph) * 0.03); armR.rotation.set(mv ? sw : 0, 0, 0.1 + Math.sin(t * 2.2 + ph) * 0.03);
        }
        head.rotation.z = a.thinking ? 0.18 : Math.sin(t * 1.4 + ph) * 0.04; head.rotation.x = a.speaking ? Math.sin(t * 7) * 0.08 : 0;
        mouth.scale.y = a.speaking ? 1 + Math.abs(Math.sin(t * 12)) * 3 : 1;
      };
    },
    silueta_grande(r) {
      const G = r.S.G, body = r.m(0x2a3038), glow = r.m(C.gold, { basic: true, op: 0.3 }), glow2 = r.m(C.yellow, { basic: true, op: 0.18 });
      r.h = 6.2; r.rad = 1.6; r.fy = 0.2; r.bs = 0.72;
      r.add(null, G.cyl(0.9, 1.9, 4.2, 8), body, 0, 2.1, 0);
      r.add(null, G.box(3.0, 0.7, 1.1), body, 0, 3.9, 0);
      const head = r.add(null, G.sph(0.85, 8, 6), body, 0, 5.1, 0);
      const h1 = r.add(null, G.cyl(3.4, 3.4, 0.05, 12), glow, 0, 3.4, -1.3, Math.PI / 2, 0, 0);
      const h2 = r.add(null, G.cyl(2.2, 2.2, 0.05, 12), glow2, 0, 3.4, -1.2, Math.PI / 2, 0, 0);
      r.anim = (a, t) => { const br = 1 + Math.sin(t * 1.6) * 0.015; r.body.scale.set(br, br, br); h1.scale.setScalar(1 + a.hl * 0.25 + Math.sin(t * 2) * 0.03); h2.scale.setScalar(1 + a.hl * 0.2 + Math.sin(t * 2.7) * 0.04); head.position.y = 5.1 + Math.sin(t * 1.6) * 0.04; };
    },
    libro(r) {
      const G = r.S.G, cover = r.m(0x84443c), page = r.m(C.cream, { map: 'stripes' });
      r.h = 1.2; r.rad = 1.0; r.lift = 0.45; r.fy = 0.07;
      const L = r.pivot(null, -0.04, 0, 0), R = r.pivot(null, 0.04, 0, 0); L.rotation.z = 0.2; R.rotation.z = -0.2;
      r.add(L, G.box(1.15, 0.09, 1.55), cover, -0.58, 0, 0); r.add(L, G.box(1.05, 0.14, 1.45), page, -0.58, 0.1, 0);
      r.add(R, G.box(1.15, 0.09, 1.55), cover, 0.58, 0, 0); r.add(R, G.box(1.05, 0.14, 1.45), page, 0.58, 0.1, 0);
      r.body.rotation.x = -0.45;
      r.anim = (a, t) => { r.body.position.y = Math.sin(t * 2 + 1) * 0.08; };
    },
    sol(r) {
      const G = r.S.G, sun = r.m(C.yellow, { basic: true }), ray = r.m(C.gold, { basic: true });
      r.h = 2.4; r.rad = 0.8; r.lift = 4.3; r.fy = 0.0;
      r.add(null, G.sph(1.0, 8, 6), sun, 0, 0, 0);
      const ring = r.pivot(null, 0, 0, 0);
      for (let i = 0; i < 10; i++) { const an = i * Math.PI / 5; r.add(ring, G.cone(0.2, 0.8, 4), ray, Math.sin(an) * 1.5, Math.cos(an) * 1.5, 0, 0, 0, -an); }
      r.anim = (a, t) => { ring.rotation.z = t * 0.4; const s = 1 + Math.sin(t * 2) * 0.03; r.body.scale.set(s, s, s); };
    },
    arbol(r) {
      const G = r.S.G, ph = hash(r.id) % 7, trunk = r.m(C.wood, { map: 'planks' }), leaf = r.m(C.leaf, { map: 'grass' }), leaf2 = r.m(C.leaf2, { map: 'grass' });
      r.h = 4.8; r.rad = 1.3; r.fy = 0.13;
      r.add(null, G.cyl(0.3, 0.42, 1.5, 6), trunk, 0, 0.75, 0);
      r.add(null, G.cone(1.7, 1.9, 7), leaf, 0, 2.2, 0); r.add(null, G.cone(1.35, 1.7, 7), leaf2, 0, 3.2, 0); r.add(null, G.cone(0.9, 1.5, 7), leaf, 0, 4.1, 0);
      r.anim = (a, t) => { r.body.rotation.z = Math.sin(t * 1.3 + ph) * 0.02; };
    },
    reloj(r) {
      const G = r.S.G, T = r.T, wood = r.m(C.wood2, { map: 'planks' }), rim = r.m(C.gold), face = r.m(0xffffff, { tex: clockFaceTexture() }), hand = r.m(C.dark, { basic: true });
      r.h = 3.8; r.rad = 0.9; r.lift = 0; r.fy = 0.12;
      r.add(null, G.cyl(0.14, 0.18, 1.4, 6), wood, 0, 0.7, 0);
      r.add(null, G.cyl(0.7, 0.8, 0.2, 8), wood, 0, 0.1, 0);
      const disc = r.add(null, G.cyl(1.15, 1.15, 0.28, 12), [rim, face, rim], 0, 2.5, 0, Math.PI / 2, 0, 0);
      const hp = r.pivot(null, 0, 2.5, 0.18);
      const hh = r.pivot(hp, 0, 0, 0), mh = r.pivot(hp, 0, 0, 0.04);
      r.add(hh, G.box(0.1, 0.55, 0.05), hand, 0, 0.27, 0); r.add(mh, G.box(0.07, 0.85, 0.05), hand, 0, 0.42, 0);
      r.anim = (a, t) => { const m = t * 1.2; mh.rotation.z = -m; hh.rotation.z = -m / 12; };
    },
    cadena(r) {
      const G = r.S.G, steel = r.m(C.steel, { map: 'noise' });
      r.h = 1.6; r.rad = 1.5; r.fy = 0.07;
      const links = [-1.0, 0, 1.0].map((x, i) => r.add(null, G.tor(0.45, 0.13, 5, 8), steel, x, 0.6, 0, 0, i % 2 ? Math.PI / 2 : 0, 0));
      links.forEach(l => l.scale.x = 1.35);
      r.anim = (a, t) => { r.body.rotation.z = a.shake ? Math.sin(t * 50) * 0.05 : 0; };
    },
    martillo(r) {
      const G = r.S.G, wood = r.m(C.wood, { map: 'planks' }), iron = r.m(C.steel, { map: 'noise' });
      r.h = 3.2; r.rad = 1.0; r.fy = 0.1;
      r.add(null, G.cyl(0.11, 0.13, 2.7, 6), wood, 0, 1.35, 0);
      r.add(null, G.box(1.5, 0.7, 0.7), iron, 0, 2.7, 0); r.add(null, G.box(0.2, 0.8, 0.8), r.m(C.dark), 0.55, 2.7, 0);
      r.body.rotation.z = -0.18;
      r.anim = (a, t) => { r.body.rotation.z = -0.18 + (a.hl ? Math.sin(t * 6) * 0.25 * a.hl : 0); };
    },
    balanza(r) {
      const G = r.S.G, gold = r.m(C.gold), wood = r.m(C.wood2, { map: 'planks' });
      r.h = 4.2; r.rad = 1.5; r.fy = 0.14;
      r.add(null, G.cyl(0.9, 1.1, 0.25, 8), wood, 0, 0.12, 0); r.add(null, G.cyl(0.11, 0.15, 3.3, 6), gold, 0, 1.8, 0);
      const beam = r.pivot(null, 0, 3.5, 0); r.add(beam, G.box(3.4, 0.14, 0.14), gold, 0, 0, 0); r.add(null, G.sph(0.2, 6, 4), gold, 0, 3.55, 0);
      const pans = [-1.6, 1.6].map(x => {
        const p = r.pivot(beam, x, 0, 0);
        r.add(p, G.box(0.04, 1.1, 0.04), gold, -0.3, -0.55, 0, 0, 0, -0.45); r.add(p, G.box(0.04, 1.1, 0.04), gold, 0.3, -0.55, 0, 0, 0, 0.45);
        r.add(p, G.cyl(0.62, 0.45, 0.14, 8), gold, 0, -1.12, 0); return p;
      });
      r.anim = (a, t) => { const tilt = Math.sin(t * 1.5) * 0.08 * (a.hl > 0 ? 3 : 1); beam.rotation.z = tilt; pans.forEach(p => p.rotation.z = -tilt); };
    },
    corazon(r) {
      const G = r.S.G, red = r.m(C.red, { map: 'noise' });
      r.h = 2.6; r.rad = 0.9; r.lift = 1.4; r.fy = 0.03;
      r.add(null, G.sph(0.62, 7, 5), red, -0.42, 0.5, 0); r.add(null, G.sph(0.62, 7, 5), red, 0.42, 0.5, 0);
      r.add(null, G.cone(1.0, 1.55, 6), red, 0, -0.1, 0, 0, 0, Math.PI);
      r.anim = (a, t) => { const s = 1 + Math.max(0, Math.sin(t * 6)) * 0.1; r.body.scale.set(s, s, s); r.body.rotation.y = Math.sin(t * 1.2) * 0.5; };
    },
    cerebro(r) {
      const G = r.S.G, pk = r.m(C.pink, { map: 'noise' });
      r.h = 2.5; r.rad = 1.0; r.lift = 1.2; r.fy = 0.04;
      [[-0.55, 0.3, 0, 0.75], [0.55, 0.3, 0, 0.78], [0, 0.65, 0.05, 0.7], [-0.35, -0.2, 0.1, 0.62], [0.4, -0.2, 0.1, 0.6]].forEach(b => r.add(null, G.ico(b[3], 1), pk, b[0], b[1], b[2]));
      r.add(null, G.cyl(0.18, 0.22, 0.6, 6), r.m(0xb88690), 0, -0.75, 0);
      r.anim = (a, t) => { const s = 1 + Math.sin(t * 2.4) * 0.03; r.body.scale.set(s, s, s); r.body.rotation.y = Math.sin(t * 0.9) * 0.4; };
    },
    nube(r) {
      const G = r.S.G, wh = r.m(C.white, { map: 'noise' });
      r.h = 1.8; r.rad = 1.6; r.lift = 4.6; r.fy = 0.0;
      [[-1.1, 0, 0, 0.8], [0, 0.35, 0, 1.0], [1.1, 0, 0, 0.8], [0.4, -0.15, 0.4, 0.8], [-0.5, -0.1, 0.4, 0.7]].forEach(b => r.add(null, G.ico(b[3], 1), wh, b[0], b[1], b[2]));
      r.body.scale.y = 0.75;
      r.anim = (a, t) => { r.body.position.x = Math.sin(t * 0.5 + hash(r.id)) * 0.25; r.body.position.y = Math.sin(t * 0.8) * 0.1; };
    },
    casa(r) {
      const G = r.S.G, wall = r.m(C.cream, { map: 'bricks' }), roof = r.m(C.red, { map: 'bricks' }), door = r.m(C.wood2, { map: 'planks' }), win = r.m(0xa8c4d0, { basic: true });
      r.h = 4.2; r.rad = 1.9; r.fy = 0.1;
      r.add(null, G.box(3.0, 2.0, 2.4), wall, 0, 1.0, 0);
      r.add(null, G.cone(2.5, 1.6, 4), roof, 0, 2.8, 0, 0, Math.PI / 4, 0).scale.z = 0.85;
      r.add(null, G.box(0.6, 1.2, 0.1), door, -0.5, 0.6, 1.2); r.add(null, G.box(0.6, 0.6, 0.1), win, 0.75, 1.2, 1.2);
      r.add(null, G.box(0.4, 0.9, 0.4), wall, 0.8, 3.1, -0.4);
    },
    piedra(r) {
      const G = r.S.G, st = r.m(C.stone, { map: 'noise' });
      r.h = 1.5; r.rad = 1.3; r.fy = 0.07;
      r.add(null, G.ico(1, 0), st, 0, 0.6, 0, 0.3, 0.5, 0).scale.set(1.5, 0.9, 1.2); r.add(null, G.ico(0.5, 0), st, 1.2, 0.25, 0.5, 0.2, 0.1, 0);
    },
    espejo(r) {
      const G = r.S.G, wood = r.m(C.gold, { map: 'planks' }), glass = r.m(0x9cbcc8, { basic: true }), shine = r.m(0xe6f0ef, { basic: true, op: 0.45 });
      r.h = 3.9; r.rad = 1.0; r.fy = 0.14;
      r.add(null, G.box(1.8, 2.8, 0.2), wood, 0, 2.0, 0); r.add(null, G.box(1.46, 2.46, 0.06), glass, 0, 2.0, 0.12);
      const sh = r.add(null, G.box(0.24, 2.46, 0.07), shine, 0, 2.0, 0.14); sh.rotation.z = 0.35;
      r.add(null, G.box(0.14, 1.0, 0.14), wood, -0.55, 0.45, -0.25, -0.3, 0, 0); r.add(null, G.box(0.14, 1.0, 0.14), wood, 0.55, 0.45, -0.25, -0.3, 0, 0);
      r.anim = (a, t) => { sh.position.x = ((t * 0.5) % 2.4) * 1.0 - 1.2; };
    },
    puerta(r) {
      const G = r.S.G, frame = r.m(C.wood2, { map: 'planks' }), pan = r.m(C.wood, { map: 'planks' }), gold = r.m(C.gold);
      r.h = 3.9; r.rad = 1.1; r.fy = 0.13;
      r.add(null, G.box(1.9, 3.1, 0.3), frame, 0, 1.55, 0); r.add(null, G.cyl(0.95, 0.95, 0.3, 8), frame, 0, 3.1, 0, Math.PI / 2, 0, 0);
      r.add(null, G.box(1.5, 2.95, 0.2), pan, 0, 1.5, 0.1); r.add(null, G.cyl(0.75, 0.75, 0.2, 8), pan, 0, 3.0, 0.1, Math.PI / 2, 0, 0);
      r.add(null, G.sph(0.1, 5, 4), gold, 0.55, 1.5, 0.28);
    },
    caja(r) {
      const G = r.S.G, w = r.m(0xb89a62, { map: 'planks' }), lid = r.m(0xa08550, { map: 'planks' }), band = r.m(C.dark);
      r.h = 1.9; r.rad = 1.1; r.fy = 0.08;
      r.add(null, G.box(1.5, 1.2, 1.5), w, 0, 0.6, 0); r.add(null, G.box(1.62, 0.22, 1.62), lid, 0, 1.28, 0); r.add(null, G.box(0.18, 1.25, 1.56), band, 0, 0.62, 0);
    },
    estrella(r) {
      const T = r.T, sh = new T.Shape(), pts = []; for (let i = 0; i < 10; i++) { const an = Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? 0.55 : 1.25; pts.push([Math.cos(an) * rr, Math.sin(an) * rr]); }
      pts.forEach((p, i) => i ? sh.lineTo(p[0], p[1]) : sh.moveTo(p[0], p[1]));
      const g = r.S.geos.get('star') || (() => { const gg = new T.ExtrudeGeometry(sh, { depth: 0.4, bevelEnabled: false }); gg.translate(0, 0, -0.2); r.S.geos.set('star', gg); return gg; })();
      r.h = 3.0; r.rad = 0.9; r.lift = 2.3; r.fy = 0.03;
      r.add(null, g, r.m(C.yellow, { basic: true }), 0, 0, 0);
      r.anim = (a, t) => { r.body.rotation.y = Math.sin(t * 1.5) * 0.7; const s = 1 + Math.sin(t * 3) * 0.04; r.body.scale.set(s, s, s); };
    },
    corona(r) {
      const G = r.S.G, gold = r.m(C.gold, { side: 2 }), gem = r.m(C.red);
      r.h = 2.4; r.rad = 1.0; r.lift = 1.4; r.fy = 0.04;
      r.add(null, G.cyl(0.95, 0.8, 0.55, 8, true), gold, 0, 0, 0);
      for (let i = 0; i < 5; i++) { const an = i * Math.PI * 2 / 5; r.add(null, G.cone(0.2, 0.8, 4), gold, Math.sin(an) * 0.95, 0.65, Math.cos(an) * 0.95); r.add(null, G.sph(0.11, 4, 3), gem, Math.sin(an) * 0.95, 1.1, Math.cos(an) * 0.95); }
      r.add(null, G.sph(0.16, 5, 4), gem, 0, 0, 0.9);
      r.body.rotation.x = 0.35;
      r.anim = (a, t) => { r.body.rotation.y = t * 0.8; };
    },
    bandera(r) {
      const T = r.T, G = r.S.G, pole = r.m(C.wood, { map: 'planks' }), cloth = r.m(C.red, { side: T.DoubleSide, map: 'noise' }), gold = r.m(C.gold);
      r.h = 4.2; r.rad = 1.0; r.fy = 0.14;
      r.add(null, G.cyl(0.07, 0.09, 4.0, 6), pole, -1.0, 2.0, 0); r.add(null, G.sph(0.15, 5, 4), gold, -1.0, 4.05, 0);
      const fg = new T.PlaneGeometry(2.0, 1.2, 7, 2); r.S.disposables.push(fg);
      const flag = r.add(null, fg, cloth, 0, 3.3, 0); const base = Array.from(fg.attributes.position.array);
      r.anim = (a, t) => { const p = fg.attributes.position; for (let i = 0; i < p.count; i++) { const x0 = base[i * 3], k = (x0 + 1) / 2; p.setZ(i, Math.sin(t * 5 + x0 * 3) * 0.2 * k); } p.needsUpdate = true; };
    },
    moneda(r) {
      const T = r.T, G = r.S.G, gold = r.m(C.gold, { map: 'noise' }), gl = r.m(0x8a6e2a, { tex: r.S.glyph('€', '#8a6e2a'), alphaTest: 0.5, side: T.DoubleSide });
      r.h = 2.9; r.rad = 0.9; r.lift = 1.7; r.fy = 0.03;
      r.add(null, G.cyl(1.0, 1.0, 0.2, 12), gold, 0, 0, 0, Math.PI / 2, 0, 0);
      const f = r.add(null, G.plane(1.3, 1.3), gl, 0, 0, 0.12); const b = r.add(null, G.plane(1.3, 1.3), gl, 0, 0, -0.12, 0, Math.PI, 0);
      gl.transparent = false;
      r.anim = (a, t) => { r.body.rotation.y = t * 2.2; };
    },
    engranaje(r) {
      const G = r.S.G, steel = r.m(C.steel, { map: 'noise' }), dark = r.m(C.dark);
      r.h = 3.8; r.rad = 1.2; r.lift = 1.9; r.fy = 0.04;
      const gear = r.pivot(null, 0, 0, 0);
      r.add(gear, G.cyl(1.0, 1.0, 0.4, 10), steel, 0, 0, 0, Math.PI / 2, 0, 0);
      for (let i = 0; i < 10; i++) { const an = i * Math.PI / 5; r.add(gear, G.box(0.38, 0.36, 0.4), steel, Math.cos(an) * 1.15, Math.sin(an) * 1.15, 0, 0, 0, an); }
      r.add(gear, G.cyl(0.32, 0.32, 0.46, 8), dark, 0, 0, 0, Math.PI / 2, 0, 0);
      r.anim = (a, t) => { gear.rotation.z = t * 0.8; r.body.rotation.y = Math.sin(t * 0.7) * 0.3; };
    },
    fuego(r) {
      const G = r.S.G, wood = r.m(C.wood2, { map: 'planks' }), f1 = r.m(C.red, { basic: true, op: 0.9 }), f2 = r.m(C.orange, { basic: true, op: 0.92 }), f3 = r.m(C.yellow, { basic: true }), em = r.m(C.yellow, { basic: true });
      r.h = 2.8; r.rad = 1.0; r.fy = 0.08;
      r.add(null, G.cyl(0.14, 0.14, 1.6, 5), wood, 0, 0.14, 0, 0, 0.5, Math.PI / 2); r.add(null, G.cyl(0.14, 0.14, 1.6, 5), wood, 0, 0.14, 0, 0, -0.5, Math.PI / 2);
      const fl = [r.add(null, G.cone(0.75, 2.0, 6), f1, 0, 1.1, 0), r.add(null, G.cone(0.55, 1.5, 6), f2, 0.05, 0.9, 0.05), r.add(null, G.cone(0.32, 1.0, 5), f3, 0, 0.7, 0.1)];
      const em4 = [0, 1, 2, 3].map(i => r.add(null, G.box(0.08, 0.08, 0.08), em, 0, 0, 0));
      r.anim = (a, t) => { fl.forEach((m, i) => { m.scale.y = 1 + Math.sin(t * 13 + i * 2) * 0.14; m.scale.x = m.scale.z = 1 + Math.sin(t * 9 + i) * 0.07; m.rotation.y = t * (1 + i); }); em4.forEach((m, i) => { const u = (t * 0.7 + i * 0.25) % 1; m.position.set(Math.sin(i * 2 + t) * 0.4 * u, 0.6 + u * 2.4, Math.cos(i * 3) * 0.2); m.scale.setScalar(1 - u); }); };
    },
    ojo(r) {
      const G = r.S.G, wh = r.m(C.cream), iris = r.m(C.blue), pup = r.m(C.dark, { basic: true });
      r.h = 2.8; r.rad = 1.0; r.lift = 1.7; r.fy = 0.03;
      const eye = r.pivot(null, 0, 0, 0); r.add(eye, G.sph(1.05, 8, 6), wh, 0, 0, 0);
      const ig = r.pivot(eye, 0, 0, 0.0); r.add(ig, G.cyl(0.46, 0.46, 0.08, 8), iris, 0, 0, 1.0, Math.PI / 2, 0, 0); r.add(ig, G.cyl(0.2, 0.2, 0.1, 6), pup, 0, 0, 1.03, Math.PI / 2, 0, 0);
      r.anim = (a, t) => { ig.rotation.y = Math.sin(t * 1.3) * 0.5; ig.rotation.x = Math.sin(t * 0.9) * 0.15; const ph = hash(r.id) % 5; eye.scale.y = ((t + ph) % 4) < 0.15 ? 0.15 : 1; };
    },
    interrogacion(r) {
      const T = r.T, G = r.S.G, ma = r.m(C.red, { tex: r.S.glyph('?', '#ffffff'), alphaTest: 0.5, side: T.DoubleSide, basic: true });
      r.h = 3.4; r.rad = 0.9; r.lift = 1.7; r.fy = 0.03;
      r.add(null, G.plane(2.4, 2.4), ma, 0, 0, 0.06); r.add(null, G.plane(2.4, 2.4), ma, 0, 0, -0.06);
      r.anim = (a, t) => { r.body.rotation.y = Math.sin(t * 2) * 0.5; r.body.rotation.z = Math.sin(t * 2.4) * 0.08; };
    },
    bombilla(r) {
      const G = r.S.G, glass = r.m(C.yellow, { basic: true, glow: 1 }), base = r.m(C.steel, { map: 'stripes' }), ray = r.m(C.gold, { basic: true });
      r.h = 3.4; r.rad = 0.8; r.lift = 1.7; r.fy = 0.03;
      r.add(null, G.sph(0.85, 8, 6), glass, 0, 0.3, 0); r.add(null, G.cyl(0.4, 0.5, 0.5, 8), base, 0, -0.7, 0); r.add(null, G.cyl(0.3, 0.3, 0.3, 8), base, 0, -1.05, 0);
      const rays = r.pivot(null, 0, 0.3, 0); for (let i = 0; i < 7; i++) { const an = -Math.PI / 2 - 1.6 + i * 0.55; r.add(rays, G.box(0.08, 0.4, 0.08), ray, Math.cos(an + Math.PI / 2 * 0) * 1.3, Math.sin(an) * -1.3, 0, 0, 0, an + Math.PI / 2 - Math.PI / 2); }
      r.anim = (a, t) => { rays.visible = Math.sin(t * 4) > -0.6; r.body.rotation.z = Math.sin(t * 1.5) * 0.06; };
    },
    rayo(r) {
      const T = r.T, sh = new T.Shape(); [[0.4, 1.8], [-0.6, 0.1], [-0.05, 0.1], [-0.45, -1.8], [0.7, 0.3], [0.1, 0.3], [0.7, 1.8]].forEach((p, i) => i ? sh.lineTo(p[0], p[1]) : sh.moveTo(p[0], p[1]));
      const g = new T.ExtrudeGeometry(sh, { depth: 0.3, bevelEnabled: false }); g.translate(0, 0, -0.15); r.S.disposables.push(g);
      const ma = r.m(C.yellow, { basic: true });
      r.h = 4.0; r.rad = 0.8; r.lift = 2.0; r.fy = 0.03;
      r.add(null, g, ma, 0, 0, 0);
      r.anim = (a, t) => { r.body.visible = Math.sin(t * 17) > -0.7; r.body.rotation.y = Math.sin(t * 2) * 0.35; };
    },
    flor(r) {
      const G = r.S.G, ph = hash(r.id) % 7, stem = r.m(C.leaf), pet = r.m(C.pink, { map: 'noise' }), cen = r.m(C.yellow);
      r.h = 2.6; r.rad = 0.8; r.fy = 0.08;
      r.add(null, G.cyl(0.06, 0.08, 1.5, 5), stem, 0, 0.75, 0); r.add(null, G.box(0.5, 0.06, 0.25), stem, 0.3, 0.5, 0, 0, 0, 0.5); r.add(null, G.box(0.5, 0.06, 0.25), stem, -0.3, 0.8, 0, 0, 0, -0.5);
      const head = r.pivot(null, 0, 1.6, 0); head.rotation.x = -0.35;
      for (let i = 0; i < 6; i++) { const an = i * Math.PI / 3; r.add(head, G.sph(0.3, 5, 4), pet, Math.cos(an) * 0.48, Math.sin(an) * 0.48, 0).scale.z = 0.5; }
      r.add(head, G.sph(0.28, 6, 4), cen, 0, 0, 0.1);
      r.anim = (a, t) => { r.body.rotation.z = Math.sin(t * 1.6 + ph) * 0.05; head.rotation.y = Math.sin(t * 1.2 + ph) * 0.25; };
    },
    texto(r) { r.h = 0.5; r.rad = 0.1; r.fy = 0; r.noShadow = true; },
  };

  /* ============================================================
   * Escena base: cielo, suelo, colinas, luces
   * ============================================================ */
  function buildWorld(S) {
    const T = global.THREE, R = S.renderer;
    const scene = S.scene = new T.Scene();
    scene.background = new T.Color(C.sky); scene.fog = new T.Fog(C.sky, 30, 88);
    // luces
    scene.add(new T.AmbientLight(0xc9d4e0, 1.35));
    const dl = new T.DirectionalLight(0xfff0d2, 2.0); dl.position.set(-6, 12, 9); scene.add(dl);
    // suelo con textura de hierba
    const gt = S.tex('grass').clone(); gt.needsUpdate = true; gt.repeat.set(26, 20); S.texs._gg = gt;
    const gm = new T.MeshLambertMaterial({ color: C.grass, map: gt, dithering: true }); patchSnap(gm); S.mats.push(gm);
    const ground = new T.Mesh(new T.PlaneGeometry(130, 110, 1, 1), gm); ground.rotation.x = -Math.PI / 2; scene.add(ground); S.disposables.push(ground.geometry);
    // "escenario" circular de arena (12 lados)
    const st = S.tex('sand').clone(); st.needsUpdate = true; st.repeat.set(9, 9); S.texs._st = st;
    const sm = new T.MeshLambertMaterial({ color: C.sand, map: st, dithering: true }); patchSnap(sm); S.mats.push(sm);
    const stage = new T.Mesh(new T.CircleGeometry(15, 14), sm); stage.rotation.x = -Math.PI / 2; stage.position.set(0, 0.08, 0); stage.scale.set(1.15, 1, 0.8); scene.add(stage); S.disposables.push(stage.geometry);
    // colinas y pinos lejanos
    const hm = new T.MeshLambertMaterial({ color: 0x6f8f7a, flatShading: true, dithering: true }); patchSnap(hm); S.mats.push(hm);
    const hm2 = new T.MeshLambertMaterial({ color: 0x5d7d68, flatShading: true, dithering: true }); patchSnap(hm2); S.mats.push(hm2);
    const hg = new T.ConeGeometry(1, 1, 7); S.disposables.push(hg);
    const r = rng(11);
    for (let i = 0; i < 16; i++) {
      const x = -48 + i * 6.4 + (r() - 0.5) * 3, z = -30 - r() * 9, h = 7 + r() * 8, w = 9 + r() * 6;
      const m = new T.Mesh(hg, i % 2 ? hm : hm2); m.scale.set(w, h, w * 0.8); m.position.set(x, h / 2 - 0.5, z); scene.add(m);
    }
    const tg = new T.ConeGeometry(1, 3.4, 6); S.disposables.push(tg);
    const tm = new T.MeshLambertMaterial({ color: 0x4d7152, flatShading: true, dithering: true }); patchSnap(tm); S.mats.push(tm);
    for (let i = 0; i < 26; i++) {
      const side = i % 2 ? 1 : -1, x = side * (13 + r() * 14), z = -12 - r() * 18, s = 0.8 + r() * 0.9;
      const m = new T.Mesh(tg, tm); m.scale.set(s, s * 1.2, s); m.position.set(x, 1.7 * s * 1.2, z); scene.add(m);
    }
    // nubes de fondo
    const cm = new T.MeshBasicMaterial({ color: 0xdfe8e8, fog: false, dithering: true }); S.mats.push(cm); S.bgClouds = [];
    const cg = new T.IcosahedronGeometry(1, 0); S.disposables.push(cg);
    for (let i = 0; i < 5; i++) {
      const g = new T.Group(); for (let j = 0; j < 3; j++) { const m = new T.Mesh(cg, cm); m.scale.set(2.5 + r() * 2, 1.2, 1.4); m.position.set(j * 2.2, r() * 0.5, 0); g.add(m); }
      g.position.set(-40 + i * 20, 22 + r() * 5, -45); scene.add(g); S.bgClouds.push(g);
    }
    // recursos compartidos: sombra, anillo, flecha
    S.shadowGeo = new T.CircleGeometry(1, 9); S.shadowGeo.rotateX(-Math.PI / 2);
    S.ringGeo = new T.RingGeometry(0.8, 1.05, 12); S.ringGeo.rotateX(-Math.PI / 2);
    S.arrowGeo = new T.ConeGeometry(0.3, 0.6, 4); S.arrowGeo.rotateX(Math.PI);
    S.disposables.push(S.shadowGeo, S.ringGeo, S.arrowGeo);
    S.shadowMat = new T.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28, depthWrite: false, fog: false });
    S.ringMat = new T.MeshBasicMaterial({ color: 0xe3cf78, transparent: true, opacity: 0.9, depthWrite: false, fog: false });
    S.arrowMat = new T.MeshBasicMaterial({ color: 0xe3cf78, fog: false });
    S.mats.push(S.shadowMat, S.ringMat, S.arrowMat);
    // enlaces y flujos
    S.linkPool = []; S.flowPool = [];
    S.flowGeo = new T.BoxGeometry(0.22, 0.22, 0.22); S.disposables.push(S.flowGeo);
    S.flowMats = [new T.MeshBasicMaterial({ color: C.yellow, transparent: true }), new T.MeshBasicMaterial({ color: C.orange, transparent: true })]; S.flowMats.forEach(m => S.mats.push(m));
    S.linkMat = new T.LineDashedMaterial({ color: 0xb5cdf0, dashSize: 0.35, gapSize: 0.22, fog: false }); S.mats.push(S.linkMat);

    // cámara base (para proyectar posiciones 2D → suelo) y cámara con temblor
    S.cam = new T.PerspectiveCamera(30, RW / RH, 2, 140);
    S.camBase = new T.Vector3(0, 14, 19); S.camTarget = new T.Vector3(0, 0, 2);
    S.cam.position.copy(S.camBase); S.cam.lookAt(S.camTarget); S.cam.updateMatrixWorld(true);
    S.rayO = new T.Vector3(); S.rayD = new T.Vector3(); S.refDist = 0;
    S.tmpV = new T.Vector3(); groundPoint(S, 0.5, 0.5, S.tmpV); S.refDist = S.cam.position.distanceTo(S.tmpV);
  }

  /* --- punto del suelo (y=0) bajo el píxel normalizado (sx, sy) --- */
  function groundPoint(S, sx, sy, out) {
    const T = global.THREE;
    out.set(sx * 2 - 1, -(sy * 2 - 1), 0.5).unproject(S.cam);
    const o = S.cam.position, dx = out.x - o.x, dy = out.y - o.y, dz = out.z - o.z;
    const u = dy < -1e-4 ? -o.y / dy : 40;
    out.set(o.x + dx * u, 0, o.z + dz * u);
    return true;
  }

  /* ============================================================
   * Overlay 2D: cajas estilo menú PS2 y texto
   * ============================================================ */
  function panel(ctx, x, y, w, h, o) {
    o = o || {}; x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h); const c = o.chamfer == null ? 5 : o.chamfer;
    const path = (ix) => { ctx.beginPath(); ctx.moveTo(x + c + ix, y + ix); ctx.lineTo(x + w - c - ix, y + ix); ctx.lineTo(x + w - ix, y + c + ix); ctx.lineTo(x + w - ix, y + h - c - ix); ctx.lineTo(x + w - c - ix, y + h - ix); ctx.lineTo(x + c + ix, y + h - ix); ctx.lineTo(x + ix, y + h - c - ix); ctx.lineTo(x + ix, y + c + ix); ctx.closePath(); };
    ctx.save(); const A0 = ctx.globalAlpha; path(0);
    const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, o.top || '#2a4aa6'); g.addColorStop(1, o.bot || '#0b1648');
    ctx.globalAlpha = A0 * (o.a == null ? 0.94 : o.a); ctx.fillStyle = g; ctx.fill();
    if (o.border !== false) {
      ctx.globalAlpha = A0; ctx.lineJoin = 'miter';
      ctx.lineWidth = 2; ctx.strokeStyle = o.border || '#c7d5ff'; path(1); ctx.stroke();
      ctx.lineWidth = 1; ctx.strokeStyle = o.inner || 'rgba(8,14,50,.9)'; path(3); ctx.stroke();
    }
    ctx.restore();
  }
  function shadowText(ctx, txt, x, y, fill, sh) {
    ctx.fillStyle = sh || 'rgba(0,0,0,.85)'; ctx.fillText(txt, x + 2, y + 2); ctx.fillStyle = fill || '#fff'; ctx.fillText(txt, x, y);
  }

  /* ============================================================
   * El skin
   * ============================================================ */
  const skin = {
    id: 'ps2', nombre: 'PS2',

    init(cv) {
      if (this._s) this.dispose();
      const T = global.THREE; if (!T) { this._s = { ok: false, cv }; return; }
      const S = createState(cv); this._s = S;
      const parent = cv.parentElement; S.parent = parent;
      try {
        const gl = S.glc = document.createElement('canvas'); gl.width = RW; gl.height = RH; gl.setAttribute('aria-hidden', 'true');
        gl.style.cssText = 'position:absolute;display:block;pointer-events:none;image-rendering:pixelated;image-rendering:crisp-edges;image-rendering:pixelated;z-index:0;background:#9db3b4';
        S.parentPos = parent.style.position; S.cvStyle = { position: cv.style.position, zIndex: cv.style.zIndex, background: cv.style.background };
        if (getComputedStyle(parent).position === 'static') parent.style.position = 'relative';
        cv.style.position = 'relative'; cv.style.zIndex = '1'; cv.style.background = 'transparent';
        parent.insertBefore(gl, cv);
        S.renderer = new T.WebGLRenderer({ canvas: gl, antialias: false, alpha: false, powerPreference: 'low-power', stencil: false });
        S.renderer.setPixelRatio(1); S.renderer.setSize(RW, RH, false);
        S.renderer.shadowMap.enabled = false;
        SNAP_U.value = new T.Vector2(RW / 2 / 1.6, RH / 2 / 1.6);
        S.onLost = (e) => { e.preventDefault(); S.lost = true; }; S.onRest = () => { S.lost = false; };
        gl.addEventListener('webglcontextlost', S.onLost); gl.addEventListener('webglcontextrestored', S.onRest);
        buildWorld(S);
        S.tmpV = new T.Vector3(); S.tmpV2 = new T.Vector3();
        S.ok = true;
      } catch (err) {
        console.warn('[skin-ps2] WebGL no disponible:', err && err.message); S.ok = false; S.err = err;
      }
      if (typeof ResizeObserver !== 'undefined') { S.ro = new ResizeObserver(() => this._layout()); S.ro.observe(cv); }
      this._layout();
    },

    /** coloca el canvas WebGL exactamente bajo el canvas 2D */
    _layout() {
      const S = this._s; if (!S || !S.glc) return; const cv = S.cv;
      S.glc.style.left = cv.offsetLeft + 'px'; S.glc.style.top = cv.offsetTop + 'px'; S.glc.style.width = cv.offsetWidth + 'px'; S.glc.style.height = cv.offsetHeight + 'px';
    },
    resize(cv) { this._layout(); },

    /* ---------- actores ---------- */
    _actor(S, a) {
      let e = S.actors.get(a.id);
      if (e) return e;
      const T = global.THREE, r = new Rig(S, a.id); (BUILD[a.tipo] || BUILD.caja)(r);
      // marcador de sombra, anillo y flecha de "resalta"
      const sh = new T.Mesh(S.shadowGeo, S.shadowMat); sh.renderOrder = 1; const ring = new T.Mesh(S.ringGeo, S.ringMat); ring.visible = false;
      const arrow = new T.Mesh(S.arrowGeo, S.arrowMat); arrow.visible = false;
      S.scene.add(r.root); S.scene.add(sh); S.scene.add(ring); S.scene.add(arrow);
      e = { r, sh, ring, arrow, ph: (hash(a.id) % 100) / 10 }; S.actors.set(a.id, e);
      return e;
    },

    _updateActor(S, a, t, W, H) {
      const e = this._actor(S, a), r = e.r, root = r.root, T = global.THREE;
      const fyN = a.y + r.fy;                             // y normalizada del pie
      groundPoint(S, a.x, clamp(fyN, 0.02, 0.98), S.tmpV);
      const gx = S.tmpV.x, gz = S.tmpV.z, dist = S.cam.position.distanceTo(S.tmpV);
      const comp = Math.pow(dist / S.refDist, 0.62);        // compensa parcialmente la perspectiva
      const sc = a.scale * comp * 1.1 * r.bs * (1 + a.hl * 0.1);
      const shk = a.shake ? Math.sin(t * 60) * 0.12 : 0;
      const jy = a.jump * 1.5 * a.scale;
      root.visible = true; root.position.set(gx + shk, r.lift * sc * 0.9 + jy, gz); root.scale.setScalar(Math.max(0.001, sc));
      root.rotation.z = a.moving ? Math.sin(t * 11) * 0.1 : 0;
      r.body.position.set(0, 0, 0); r.body.rotation.set(0, 0, 0); r.body.scale.set(1, 1, 1);
      if (r.anim) r.anim(a, t);
      // materiales: alpha y resalte
      const al = clamp(a.alpha, 0, 1), hl = a.hl;
      for (let i = 0; i < r.mats.length; i++) {
        const m = r.mats[i];
        const tr = m.op < 1 || al < 0.995;
        if (tr !== m.m.transparent) { m.m.transparent = tr; m.m.needsUpdate = true; if (!m.basic) m.m.depthWrite = !tr; }
        if (m.al !== al) { m.m.opacity = m.op * al; m.al = al; }
        if (m.hl !== hl) {
          m.hl = hl;
          if (m.basic) m.m.color.copy(m.base).lerp(HLC, hl * 0.5);
          else m.m.emissive.setRGB(0.5 * hl, 0.42 * hl, 0.12 * hl);
        }
      }
      // sombra circular, anillo y flecha
      const rad = r.rad * sc;
      e.sh.visible = !r.noShadow; e.sh.position.set(gx + shk, 0.03, gz); const ss = rad * (1 - clamp(r.lift * 0.04, 0, 0.3)); e.sh.scale.set(ss, 1, ss * 0.8);
      S.shadowMat.opacity = 0.28;
      e.ring.visible = hl > 0.02 && a.tipo !== 'texto'; e.ring.position.set(gx, 0.05, gz); e.ring.scale.set(rad * (1.3 + hl * 0.25), 1, rad * (1.3 + hl * 0.25) * 0.85);
      const top = r.lift * sc * 0.9 + r.h * sc + jy;
      e.arrow.visible = e.ring.visible; e.arrow.position.set(gx, top + 0.7 + Math.sin(t * 6) * 0.15, gz); e.arrow.rotation.y = t * 2; e.arrow.scale.setScalar(Math.max(0.5, comp));
      e.vis = true; e.al = al; e.bot = r.lift * sc * 0.9 + jy; e.top = top; e.gx = gx; e.gz = gz; e.sc = sc;
    },

    /* ---------- enlaces y flujos ---------- */
    _link(S, i, l, W, H, t) {
      const T = global.THREE; let L = S.linkPool[i];
      if (!L) {
        const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(new Float32Array(13 * 3), 3));
        L = { line: new T.Line(g, S.linkMat), g }; L.line.frustumCulled = false; S.scene.add(L.line); S.disposables.push(g); S.linkPool[i] = L;
      }
      const A = S.actors.get(l.from.a.id), B = S.actors.get(l.to.a.id); if (!A || !B) { L.line.visible = false; return null; }
      const ya = A.r.lift * A.sc * 0.9 + A.r.h * A.sc * 0.45, yb = B.r.lift * B.sc * 0.9 + B.r.h * B.sc * 0.45;
      const dx = B.gx - A.gx, dz = B.gz - A.gz, len = Math.hypot(dx, dz), arc = 0.4 + len * 0.12, p = L.g.attributes.position;
      for (let k = 0; k < 13; k++) { const u = k / 12; p.setXYZ(k, A.gx + dx * u, ya + (yb - ya) * u + Math.sin(u * Math.PI) * arc, A.gz + dz * u); }
      p.needsUpdate = true; L.g.setDrawRange(0, Math.max(2, Math.round(13 * l.grow))); L.line.computeLineDistances(); L.line.visible = true;
      return { x: A.gx + dx * 0.5, y: (ya + yb) / 2 + arc, z: A.gz + dz * 0.5 };
    },
    _flow(S, i, f, t) {
      const T = global.THREE; let P = S.flowPool[i];
      if (!P) { P = S.flowPool[i] = []; for (let k = 0; k < 14; k++) { const m = new T.Mesh(S.flowGeo, S.flowMats[k % 2]); S.scene.add(m); P.push(m); } }
      const A = S.actors.get(f.from.a.id), B = S.actors.get(f.to.a.id); if (!A || !B) { P.forEach(m => m.visible = false); return null; }
      const ya = A.r.lift * A.sc * 0.9 + A.r.h * A.sc * 0.5, yb = B.r.lift * B.sc * 0.9 + B.r.h * B.sc * 0.5, arc = 1.8 + Math.hypot(B.gx - A.gx, B.gz - A.gz) * 0.18;
      const env = Math.sin(Math.min(1, f.p) * Math.PI);
      P.forEach((m, k) => {
        const u = (f.p * 1.6 + k / P.length) % 1;
        m.position.set(A.gx + (B.gx - A.gx) * u, ya + (yb - ya) * u + Math.sin(u * Math.PI) * arc, A.gz + (B.gz - A.gz) * u);
        m.rotation.set(t * 4 + k, t * 3 + k * 2, 0); m.scale.setScalar(0.6 + 0.8 * Math.sin(u * Math.PI)); m.visible = env > 0.02;
      });
      S.flowMats[0].opacity = S.flowMats[1].opacity = clamp(env * 1.2, 0, 1);
      return { x: (A.gx + B.gx) / 2, y: (ya + yb) / 2 + arc, z: (A.gz + B.gz) / 2 };
    },

    _proj(S, x, y, z, W, H, out) { out.set(x, y, z).project(S.cam); out.x = (out.x * 0.5 + 0.5) * W; out.y = (-out.y * 0.5 + 0.5) * H; return out; },

    /* ---------- render ---------- */
    render(ctx, st, t, W, H, k, cv) {
      const S = this._s; if (!S) return;
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      ctx.setTransform(k, 0, 0, k, 0, 0);
      if (!S.ok) { // sin WebGL: aviso mínimo
        ctx.fillStyle = '#0b1648'; ctx.fillRect(0, 0, W, H); ctx.fillStyle = '#c7d5ff'; ctx.font = '600 22px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('Estilo PS2: WebGL no disponible', W / 2, H / 2);
        this.text(ctx, st, t, W, H, null); return;
      }
      if (S.lost) { this.text(ctx, st, t, W, H, null); return; }
      this._layout();
      const T = global.THREE, cam = S.cam;

      // 1) cámara base → cámara con temblor determinista
      cam.position.copy(S.camBase); cam.lookAt(S.camTarget); cam.updateMatrixWorld(true);
      S.actors.forEach(e => { e.vis = false; });
      const sorted = st.actors;
      sorted.forEach(a => this._updateActor(S, a, t, W, H));
      S.actors.forEach(e => { if (!e.vis) { e.r.root.visible = false; e.sh.visible = false; e.ring.visible = false; e.arrow.visible = false; } });
      // enlaces / flujos
      const linkPts = st.links.map((l, i) => this._link(S, i, l, W, H, t)); for (let i = st.links.length; i < S.linkPool.length; i++) S.linkPool[i].line.visible = false;
      const flowPts = st.flows.map((f, i) => this._flow(S, i, f, t)); for (let i = st.flows.length; i < S.flowPool.length; i++) S.flowPool[i].forEach(m => m.visible = false);
      // fondo
      S.bgClouds.forEach((g, i) => { g.position.x = ((-40 + i * 20 + t * 0.6 + 60) % 120) - 60; });

      // temblor de cámara: balanceo suave + sacudida cuantizada (12 Hz) determinista
      const q = Math.floor(t * 12), r1 = (hash('j' + q) / 4294967296 - 0.5), r2 = (hash('k' + q) / 4294967296 - 0.5);
      cam.position.set(S.camBase.x + Math.sin(t * 0.5) * 0.35 + r1 * 0.05, S.camBase.y + Math.sin(t * 0.37) * 0.15 + r2 * 0.05, S.camBase.z + Math.sin(t * 0.23) * 0.2);
      cam.lookAt(S.camTarget.x + r2 * 0.03, S.camTarget.y, S.camTarget.z); cam.updateMatrixWorld(true);

      S.renderer.render(S.scene, cam);

      // 2) posiciones en pantalla para el texto
      const sc = new Map(); const v = S.tmpV2;
      st.actors.forEach(a => {
        const e = S.actors.get(a.id); if (!e) return;
        const r = e.r;
        this._proj(S, e.gx, e.top, e.gz, W, H, v); const hx = v.x, hy = v.y;
        this._proj(S, e.gx, e.bot, e.gz, W, H, v); sc.set(a.id, { hx, hy, fx: v.x, fy: v.y, a });
      });
      const lp = linkPts.map(p => p ? this._proj(S, p.x, p.y, p.z, W, H, S.tmpV2).clone() : null);
      const fp = flowPts.map(p => p ? this._proj(S, p.x, p.y, p.z, W, H, S.tmpV2).clone() : null);
      this.text(ctx, st, t, W, H, { sc, lp, fp });
    },

    /* ---------- texto 2D encima del WebGL ---------- */
    text(ctx, st, t, W, H, P) {
      ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
      // título
      if (st.titulo) { ctx.font = '600 15px ' + FONT; ctx.globalAlpha = 0.85; shadowText(ctx, '▸ ' + st.titulo, 18, 20, '#d6e2ff'); ctx.globalAlpha = 1; }
      // etiquetas de actores
      st.actors.forEach(a => {
        if (!a.label) return; ctx.save(); ctx.globalAlpha = clamp(a.alpha, 0, 1);
        const big = a.tipo === 'texto';
        if (big) { ctx.font = '600 40px ' + FONT; ctx.textAlign = 'center'; shadowText(ctx, a.label, a.x * W, a.y * H, '#fff'); ctx.restore(); return; }
        const s = P && P.sc.get(a.id); const fx = s ? s.fx : a.x * W, fy = s ? s.fy : a.y * H + 60;
        ctx.font = '600 15px ' + FONT; const w = ctx.measureText(a.label).width + 16, h = 22, x = clamp(fx - w / 2, 6, W - w - 6), y = clamp(fy + 8, 4, H - h - 70);
        panel(ctx, x, y, w, h, { chamfer: 3, top: '#33498a', bot: '#14204f', a: 0.88, border: '#aebfef', inner: 'rgba(8,14,50,.8)' });
        ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.fillText(a.label, x + w / 2, y + h / 2 + 1); ctx.restore();
      });
      // enlaces (notas)
      st.links.forEach((l, i) => {
        const p = P && P.lp[i]; if (!p || !l.nota || l.grow < 1) return;
        ctx.font = '600 15px ' + FONT; ctx.textAlign = 'center'; shadowText(ctx, l.nota, p.x, p.y - 8, '#bcd3ff');
      });
      // flujos (notas)
      st.flows.forEach((f, i) => {
        const p = P && P.fp[i]; if (!p || !f.nota) return; const env = Math.sin(Math.min(1, f.p) * Math.PI);
        ctx.save(); ctx.globalAlpha = clamp(env * 1.5, 0, 1); ctx.font = '600 17px ' + FONT; ctx.textAlign = 'center'; shadowText(ctx, f.nota, p.x, p.y - 8, '#ffe9a0'); ctx.restore();
      });
      // burbujas
      st.bubbles.forEach(b => this.bubble(ctx, b, t, W, H, P));
      if (st.quote) this.quote(ctx, st.quote, W, H);
      if (st.subtitle) this.subtitle(ctx, st.subtitle, W, H);
    },
    bubble(ctx, b, t, W, H, P) {
      const a = b.a, s = P && P.sc.get(a.id), hx = s ? s.hx : a.x * W, hy = s ? s.hy : a.y * H - 80;
      ctx.save(); ctx.globalAlpha = Math.min(b.p, b.out); ctx.font = '600 19px ' + FONT; ctx.textAlign = 'center';
      const lines = wrap(ctx, b.text, 290), lh = 25, tw = Math.max.apply(null, lines.map(l => ctx.measureText(l).width)), bw = tw + 32, bh = lines.length * lh + 20;
      let bx = clamp(hx - bw / 2, 12, W - bw - 12), by = Math.max(34, hy - bh - 26 - (1 - b.p) * 8);
      const think = b.kind !== 'dice';
      panel(ctx, bx, by, bw, bh, think ? { top: '#3a3f78', bot: '#161a44', border: '#d8c8ff' } : {});
      const tx = clamp(hx, bx + 18, bx + bw - 18), ty = Math.round(by + bh);
      ctx.fillStyle = think ? '#d8c8ff' : '#c7d5ff';
      if (think) { [[0, 8, 8], [-4, 18, 6], [-8, 26, 4]].forEach(d => ctx.fillRect(Math.round(tx + d[0] - d[2] / 2), ty + d[1] - 4, d[2], d[2])); }
      else { ctx.beginPath(); ctx.moveTo(tx - 9, ty - 1); ctx.lineTo(tx + 9, ty - 1); ctx.lineTo(Math.round(clamp(hx, tx - 14, tx + 14)), ty + 16); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#15266c'; ctx.beginPath(); ctx.moveTo(tx - 6, ty - 1); ctx.lineTo(tx + 6, ty - 1); ctx.lineTo(Math.round(clamp(hx, tx - 14, tx + 14)), ty + 11); ctx.closePath(); ctx.fill(); }
      ctx.fillStyle = '#fff'; lines.forEach((l, i) => ctx.fillText(l, bx + bw / 2, by + 10 + lh / 2 + i * lh + 1));
      ctx.restore();
    },
    quote(ctx, q, W, H) {
      ctx.save(); ctx.globalAlpha = Math.min(q.p, q.out); ctx.font = 'italic 600 22px ' + FONT;
      const lines = wrap(ctx, q.text, 640), lh = 30, bw = 700, bh = lines.length * lh + 30, x = (W - bw) / 2, y = 44 - (1 - q.p) * 14;
      panel(ctx, x, y, bw, bh, { top: '#4a3a16', bot: '#1c1608', border: '#e6cf86', inner: 'rgba(40,28,6,.9)' });
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff4d0'; lines.forEach((l, i) => ctx.fillText((i === 0 ? '“' : '') + l + (i === lines.length - 1 ? '”' : ''), W / 2, y + 15 + lh / 2 + i * lh));
      ctx.restore();
    },
    subtitle(ctx, s, W, H) {
      ctx.save(); ctx.globalAlpha = s.p; ctx.font = '600 26px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const lines = wrap(ctx, s.text, 820), lh = 32, bh = lines.length * lh + 12, y = H - bh - 16;
      panel(ctx, 70, y, W - 140, bh, { chamfer: 0, border: false, top: '#000', bot: '#000', a: 0.55 });
      lines.forEach((l, i) => { const yy = y + 6 + lh / 2 + i * lh + 1; ctx.fillStyle = '#000'; [[-2, 0], [2, 0], [0, -2], [0, 2], [2, 2]].forEach(d => ctx.fillText(l, W / 2 + d[0], yy + d[1])); ctx.fillStyle = '#f4f4ee'; ctx.fillText(l, W / 2, yy); });
      ctx.restore();
    },

    /* ---------- liberar todo ---------- */
    dispose() {
      const S = this._s; this._s = null; if (!S) return;
      try {
        if (S.ro) S.ro.disconnect();
        if (S.glc) { S.glc.removeEventListener('webglcontextlost', S.onLost); S.glc.removeEventListener('webglcontextrestored', S.onRest); }
        if (S.geos) S.geos.forEach(g => g.dispose());
        (S.disposables || []).forEach(g => g.dispose && g.dispose());
        (S.mats || []).forEach(m => m.dispose && m.dispose());
        Object.keys(S.texs || {}).forEach(k => S.texs[k].dispose && S.texs[k].dispose());
        if (S.scene) S.scene.traverse(o => { if (o.geometry && o.geometry.dispose) o.geometry.dispose(); });
        if (S.renderer) { S.renderer.dispose(); if (S.renderer.forceContextLoss) S.renderer.forceContextLoss(); }
        if (S.glc && S.glc.parentNode) S.glc.parentNode.removeChild(S.glc);
        if (S.cv && S.cvStyle) { S.cv.style.position = S.cvStyle.position; S.cv.style.zIndex = S.cvStyle.zIndex; S.cv.style.background = S.cvStyle.background; }
        if (S.parent && S.parentPos != null) S.parent.style.position = S.parentPos;
      } catch (err) { console.warn('[skin-ps2] dispose:', err && err.message); }
    },
  };

  // color de resalte para materiales "basic" (se crea tras cargar THREE)
  let HLC = null;
  const _init = skin.init; skin.init = function (cv) { if (global.THREE && !HLC) HLC = new global.THREE.Color(0xfff2b0); return _init.call(this, cv); };

  global.SceneSkins = global.SceneSkins || {};
  global.SceneSkins.ps2 = skin;
})(window);
