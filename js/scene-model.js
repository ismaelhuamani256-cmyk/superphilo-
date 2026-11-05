/* ============================================================
 * scene-model.js — MOTOR DE ESCENAS (modelo, sin dibujo)
 *
 * Toma un guion JSON (actores + pasos) y, dado un instante t,
 * devuelve el ESTADO de la escena (posiciones, burbujas, flujos…).
 * Es determinista: evaluate(t) siempre da lo mismo → permite
 * pausa, repetir y saltar a cualquier instante.
 *
 * Los "skins" (js/skin-*.js) sólo reciben ese estado y lo dibujan.
 * Contrato de un skin:   { id, nombre, render(ctx, st, t, W, H) }
 * ============================================================ */
(function (global) {
  'use strict';

  // textos bilingües {es,fr} → string según el idioma activo (los guiones normales ya son strings)
  const tx = v => (v && typeof v === 'object') ? (v[(global.State && global.State.lang) || 'es'] || v.es || '') : v;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const easeInOut = p => p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
  const easeOutBack = p => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2); };

  class SceneModel {
    constructor(script) {
      this.script = script || { actores: [], pasos: [] };
      this.actors = new Map();
      (this.script.actores || []).forEach(a => this.actors.set(a.id, {
        id: a.id, tipo: a.tipo, escala: a.escala || 1, label0: tx(a.etiqueta) || '', pos0: a.pos || [0.5, 0.5],
        appear: [], disappear: [], moves: [], labels: [], hl: [], shake: [], jump: [],
      }));
      this.bubbles = []; this.flows = []; this.links = []; this.quotes = []; this.subs = [];
      this._compile();
      const last = this.script.pasos.length ? this.script.pasos[this.script.pasos.length - 1].t : 0;
      this.duration = Math.max(this.script.duracion_seg || 0, last + 4);
    }

    _compile() {
      const steps = (this.script.pasos || []).slice().sort((a, b) => a.t - b.t);
      const cur = new Map(); // última posición conocida de cada actor al compilar movimientos
      this.actors.forEach(a => cur.set(a.id, a.pos0.slice()));
      const lastMoveEnd = new Map();
      steps.forEach((p, i) => {
        const A = p.actor && this.actors.get(p.actor);
        switch (p.accion) {
          case 'aparece': A && A.appear.push(p.t); break;
          case 'desaparece': A && A.disappear.push(p.t); break;
          case 'mueve': {
            if (!A) break;
            const dur = p.dur || 1.6;
            const t0 = Math.max(p.t, lastMoveEnd.get(A.id) || 0);
            A.moves.push({ t0, t1: t0 + dur, from: cur.get(A.id).slice(), to: p.a.slice() });
            cur.set(A.id, p.a.slice()); lastMoveEnd.set(A.id, t0 + dur);
            break;
          }
          case 'etiqueta': A && A.labels.push({ t: p.t, text: tx(p.texto) }); break;
          case 'resalta': A && A.hl.push([p.t, p.t + 1.8]); break;
          case 'tiembla': A && A.shake.push([p.t, p.t + 1.4]); break;
          case 'salta': A && A.jump.push([p.t, p.t + 0.9]); break;
          case 'dice': case 'piensa':
            this.bubbles.push({ actor: p.actor, text: tx(p.texto), kind: p.accion, t0: p.t, t1: p.t + Math.max(2.6, (tx(p.texto) || '').length * 0.075) });
            break;
          case 'proyecta': this.flows.push({ de: p.de, a: p.a, nota: tx(p.nota) || '', t0: p.t, t1: p.t + 2.6 }); break;
          case 'une': this.links.push({ de: p.de, a: p.a, nota: tx(p.nota) || '', t0: p.t }); break;
          case 'cita': this.quotes.push({ text: tx(p.texto), t0: p.t, t1: p.t + Math.max(5, (tx(p.texto) || '').length * 0.06) }); break;
          case 'subtitulo': this.subs.push({ text: tx(p.texto), t0: p.t, t1: p.t + Math.max(4.5, (tx(p.texto) || '').length * 0.06) }); break;
        }
      });
      // un subtítulo dura hasta que llega el siguiente
      this.subs.forEach((s, i) => { if (this.subs[i + 1]) s.t1 = Math.min(s.t1 + 1.5, this.subs[i + 1].t0 + 0.2); });
    }

    _pos(A, t) {
      let p = A.pos0.slice();
      for (const m of A.moves) {
        if (t >= m.t1) p = m.to.slice();
        else if (t > m.t0) { const k = easeInOut((t - m.t0) / (m.t1 - m.t0)); return [m.from[0] + (m.to[0] - m.from[0]) * k, m.from[1] + (m.to[1] - m.from[1]) * k, true]; }
        else break;
      }
      return [p[0], p[1], false];
    }

    /** Estado completo en el instante t (segundos). */
    evaluate(t) {
      const inWin = (arr) => arr.some(([a, b]) => t >= a && t <= b);
      const actors = [];
      this.actors.forEach(A => {
        // aparece/desaparece: toma el último evento ocurrido
        const ap = A.appear.filter(x => x <= t).pop();
        const dis = A.disappear.filter(x => x <= t).pop();
        if (ap === undefined) return;
        if (dis !== undefined && dis >= ap) { const k = clamp((t - dis) / 0.5, 0, 1); if (k >= 1) return; actors.push(this._mk(A, t, 1 - k, 1 - k * 0.3, ap)); return; }
        const k = clamp((t - ap) / 0.55, 0, 1);
        actors.push(this._mk(A, t, k, easeOutBack(k), ap));
      });
      const byId = new Map(actors.map(a => [a.id, a]));
      const pt = id => { const a = byId.get(id); return a ? { x: a.x, y: a.y, a } : null; };
      const bubbles = this.bubbles.filter(b => t >= b.t0 && t <= b.t1 && byId.has(b.actor))
        .map(b => ({ ...b, p: clamp((t - b.t0) / 0.35, 0, 1), out: clamp((b.t1 - t) / 0.3, 0, 1), a: byId.get(b.actor) }));
      const flows = this.flows.filter(f => t >= f.t0 && t <= f.t1 && pt(f.de) && pt(f.a))
        .map(f => ({ from: pt(f.de), to: pt(f.a), nota: f.nota, p: (t - f.t0) / (f.t1 - f.t0), t0: f.t0 }));
      const links = this.links.filter(l => t >= l.t0 && pt(l.de) && pt(l.a))
        .map(l => ({ from: pt(l.de), to: pt(l.a), nota: l.nota, grow: clamp((t - l.t0) / 0.8, 0, 1) }));
      const q = this.quotes.filter(x => t >= x.t0 && t <= x.t1).pop();
      const s = this.subs.filter(x => t >= x.t0 && t <= x.t1).pop();
      return {
        t, actors, bubbles, flows, links,
        quote: q ? { text: q.text, p: clamp((t - q.t0) / 0.5, 0, 1), out: clamp((q.t1 - t) / 0.4, 0, 1) } : null,
        subtitle: s ? { text: s.text, p: clamp((t - s.t0) / 0.3, 0, 1) } : null,
        titulo: tx(this.script.titulo) || '',
      };
    }

    _mk(A, t, alpha, scale, appearT) {
      const [x, y0, moving] = this._pos(A, t);
      // "escenario": deja libre la franja de subtítulos (abajo) y el título (arriba)
      const y = 0.13 + y0 * 0.61;
      let label = A.label0;
      A.labels.forEach(l => { if (l.t <= t) label = l.text; });
      const jw = A.jump.find(([a, b]) => t >= a && t <= b);
      const jump = jw ? Math.sin(((t - jw[0]) / (jw[1] - jw[0])) * Math.PI) : 0;
      const hw = A.hl.find(([a, b]) => t >= a && t <= b);
      const speaking = this.bubbles.some(b => b.actor === A.id && b.kind === 'dice' && t >= b.t0 && t <= b.t1);
      const thinking = this.bubbles.some(b => b.actor === A.id && b.kind === 'piensa' && t >= b.t0 && t <= b.t1);
      return {
        id: A.id, tipo: A.tipo, x, y, scale: A.escala * scale * 0.85, alpha, label, moving,
        hl: hw ? Math.sin(((t - hw[0]) / (hw[1] - hw[0])) * Math.PI) : 0,
        shake: inWin(A.shake) ? 1 : 0, jump, speaking, thinking, age: t - appearT,
      };
      function inWin(arr) { return arr.some(([a, b]) => t >= a && t <= b); }
    }
  }

  /* ------------------------------------------------------------
   * ScenePlayer: reproductor (play / pausa / repetir / barra de tiempo)
   * sobre un <canvas>, con cualquier skin.
   * ------------------------------------------------------------ */
  class ScenePlayer {
    constructor(canvas, opts = {}) {
      this.cv = canvas; this.ctx = canvas.getContext('2d');
      this.skin = null; this.model = null; this.t = 0; this.playing = false; this.speed = 1;
      this.onTime = opts.onTime || (() => {}); this.onEnd = opts.onEnd || (() => {});
      this.reduced = !!opts.reduced; this._last = 0; this._raf = 0;
      this._resize = this.resize.bind(this); window.addEventListener('resize', this._resize);
      this.resize();
    }
    load(script, skin) { this.model = new SceneModel(script); this.setSkin(skin); this.t = 0; this.draw(); }
    setSkin(skin) {
      if (this.skin && this.skin.dispose) this.skin.dispose();
      this.skin = skin; if (skin && skin.init) skin.init(this.cv);
      this.resize();
    }
    resize() {
      const r = this.cv.getBoundingClientRect(); if (!r.width) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.W = 960; this.H = 540;
      this.cv.width = Math.round(r.width * dpr); this.cv.height = Math.round(r.width * 9 / 16 * dpr);
      this.k = this.cv.width / this.W;
      if (this.skin && this.skin.resize) this.skin.resize(this.cv);
      this.draw();
    }
    play() { if (!this.model) return; if (this.t >= this.model.duration) this.t = 0; this.playing = true; this._last = performance.now(); cancelAnimationFrame(this._raf); this._raf = requestAnimationFrame(this._tick.bind(this)); }
    pause() { this.playing = false; cancelAnimationFrame(this._raf); }
    toggle() { this.playing ? this.pause() : this.play(); }
    restart() { this.t = 0; this.play(); }
    seek(t) { this.t = clamp(t, 0, this.model.duration); this.draw(); this.onTime(this.t, this.model.duration); }
    _tick(now) {
      if (!this.playing) return;
      const dt = Math.min(0.1, (now - this._last) / 1000) * this.speed; this._last = now;
      this.t += dt;
      if (this.t >= this.model.duration) { this.t = this.model.duration; this.draw(); this.onTime(this.t, this.model.duration); this.playing = false; this.onEnd(); return; }
      this.draw(); this.onTime(this.t, this.model.duration);
      this._raf = requestAnimationFrame(this._tick.bind(this));
    }
    draw() {
      if (!this.model || !this.skin) return;
      const st = this.model.evaluate(this.t);
      this.skin.render(this.ctx, st, this.t, this.W, this.H, this.k, this.cv);
    }
    destroy() { this.pause(); window.removeEventListener('resize', this._resize); if (this.skin && this.skin.dispose) this.skin.dispose(); }
  }

  global.SceneModel = SceneModel; global.ScenePlayer = ScenePlayer;
  global.SceneSkins = global.SceneSkins || {};
})(window);
