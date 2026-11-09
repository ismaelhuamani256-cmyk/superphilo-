/* ============================================================
 * map.js — 4.2 Mapa del capítulo (SVG)
 * Nodos = filósofos (círculo) y conceptos (rombo). Líneas = relaciones
 * (color por tipo) + hilos finos de "debate" y de autoría de conceptos.
 * Las líneas se dibujan animadas; los nodos "respiran"; el aro de cada
 * filósofo se llena según tu dominio.
 * ============================================================ */
(function (global) {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  const el = (n, a = {}, p) => { const e = document.createElementNS(NS, n); for (const k in a) e.setAttribute(k, a[k]); p && p.appendChild(e); return e; };
  const TIPO = { 'influye': 'var(--infl)', 'se opone': 'var(--opp)', 'complementa': 'var(--comp)' };

  /** Fuerza dirigida determinista (siempre el mismo dibujo para el mismo capítulo). */
  function layout(nodes, edges, W, H) {
    const n = nodes.length; let s = 12345; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    nodes.forEach((d, i) => { const a = i / n * Math.PI * 2; d.x = W / 2 + Math.cos(a) * W * 0.3 + (rnd() - .5) * 30; d.y = H / 2 + Math.sin(a) * H * 0.3 + (rnd() - .5) * 30; d.vx = d.vy = 0; });
    const idx = Object.fromEntries(nodes.map((d, i) => [d.id, i]));
    const L = Math.min(W, H) * 0.3, pad = 80;
    for (let it = 0; it < 520; it++) {
      const cool = 1 - it / 520;
      for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
        let dx = nodes[j].x - nodes[i].x, dy = nodes[j].y - nodes[i].y, d2 = dx * dx + dy * dy + 0.01, d = Math.sqrt(d2), f = 21000 / d2 + (d < 130 ? (130 - d) * 0.35 : 0);
        dx /= d; dy /= d; nodes[i].vx -= dx * f; nodes[i].vy -= dy * f; nodes[j].vx += dx * f; nodes[j].vy += dy * f;
      }
      edges.forEach(e => { const a = nodes[idx[e.de]], b = nodes[idx[e.a]]; if (!a || !b) return; let dx = b.x - a.x, dy = b.y - a.y, d = Math.sqrt(dx * dx + dy * dy) + 0.01, f = (d - L) * 0.012 * (e.w || 1); dx /= d; dy /= d; a.vx += dx * f * d * 0.1; a.vy += dy * f * d * 0.1; b.vx -= dx * f * d * 0.1; b.vy -= dy * f * d * 0.1; });
      nodes.forEach(d => { d.vx += (W / 2 - d.x) * 0.0022; d.vy += (H / 2 - d.y) * 0.0026; d.x += Math.max(-14, Math.min(14, d.vx)) * cool; d.y += Math.max(-14, Math.min(14, d.vy)) * cool; d.vx *= 0.6; d.vy *= 0.6; d.x = Math.max(pad, Math.min(W - pad, d.x)); d.y = Math.max(pad, Math.min(H - pad - 25, d.y)); });
    }
  }

  const Map_ = {
    render(cap, handlers) {
      this.cap = cap; this.h = handlers; const svg = this.svg = document.getElementById('map'); svg.innerHTML = '';
      const box = svg.getBoundingClientRect(); const mob = (box.width || 900) < 700, W = mob ? Math.max(560, (box.width || 400) * 1.5) : Math.max(500, box.width || 900), H = mob ? Math.max(780, (box.height || 600) * 1.5) : Math.max(420, box.height || 600); this.mob = mob;
      svg.setAttribute('viewBox', `0 0 ${W} ${H}`); this.W = W; this.H = H; this.z = { k: 1, x: 0, y: 0 };
      const col = capColor(cap); svg.style.setProperty('--accent', col); document.documentElement.style.setProperty('--accent', col);

      const nodes = [
        ...cap.filosofos.map(f => ({ id: f.id, kind: 'f', label: f.nombre, data: f })),
        ...cap.conceptos.map(c => ({ id: c.id, kind: 'c', label: c.nombre, data: c })),
      ];
      const ids = new Set(nodes.map(n => n.id)), seen = new Set(), edges = [];
      const add = (de, a, tipo, nota, w) => { if (!ids.has(de) || !ids.has(a) || de === a) return; const k = [de, a].sort().join('|') + tipo; if (seen.has(k)) return; seen.add(k); edges.push({ de, a, tipo, nota, w }); };
      cap.relaciones.forEach(r => add(r.de, r.a, r.tipo, r.nota, 1.4));
      const strong = new Set(edges.map(e => [e.de, e.a].sort().join('|')));
      cap.filosofos.forEach(f => (f.debate_con || []).forEach(o => { if (!strong.has([f.id, o].sort().join('|'))) add(f.id, o, 'debate', L('debate con', 'débat avec'), 0.5); }));
      cap.conceptos.forEach(c => (c.autores || []).forEach(a => add(c.id, a, 'autor', '', 0.7)));
      this.nodes = nodes; this.edges = edges; layout(nodes, edges, W, H);
      const pos = Object.fromEntries(nodes.map(n => [n.id, n]));

      // defs: flecha para "influye"
      const defs = el('defs', {}, svg);
      const mk = el('marker', { id: 'arr', viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' }, defs); el('path', { d: 'M0,0 L10,5 L0,10 z', fill: 'var(--infl)' }, mk);
      const gl = el('filter', { id: 'glow', x: '-50%', y: '-50%', width: '200%', height: '200%' }, defs); el('feGaussianBlur', { stdDeviation: 5 }, gl);

      const root = this.root = el('g', {}, svg);
      const gE = el('g', {}, root), gN = el('g', {}, root);
      this.edgeEls = [];
      edges.forEach((e, i) => {
        const a = pos[e.de], b = pos[e.a], mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1, bend = (i % 2 ? 1 : -1) * Math.min(40, d * 0.14);
        const cx = mx - dy / d * bend, cy = my + dx / d * bend;
        const color = TIPO[e.tipo] || 'rgba(190,195,220,.35)', thin = e.tipo === 'debate' || e.tipo === 'autor';
        // acortar extremos para no tapar el nodo
        const ra = a.kind === 'f' ? 40 : 20, rb = b.kind === 'f' ? 44 : 24, ux = (cx - a.x), uy = (cy - a.y), vx = (cx - b.x), vy = (cy - b.y), ul = Math.hypot(ux, uy) || 1, vl = Math.hypot(vx, vy) || 1;
        const sx = a.x + ux / ul * ra, sy = a.y + uy / ul * ra, ex = b.x + vx / vl * rb, ey = b.y + vy / vl * rb;
        const p = el('path', { d: `M${sx},${sy} Q${cx},${cy} ${ex},${ey}`, class: 'edge', pathLength: 1, stroke: color, 'stroke-width': thin ? 1.3 : 2.6, 'stroke-dasharray': e.tipo === 'autor' ? '1' : '1', 'data-a': e.de, 'data-b': e.a }, gE);
        if (e.tipo === 'influye') p.setAttribute('marker-end', 'url(#arr)');
        if (e.tipo === 'debate' || e.tipo === 'autor') p.style.opacity = '.4';
        // animación de dibujado (se reparte en el tiempo)
        p.style.strokeDashoffset = 1; p.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: State.P.ajustes.reducirMov ? 1 : 1100, delay: State.P.ajustes.reducirMov ? 0 : 350 + i * 70, fill: 'forwards', easing: 'ease-out' });
        const t = el('title', {}, p); t.textContent = (e.tipo !== 'debate' && e.tipo !== 'autor' ? e.tipo + ': ' : '') + (e.nota || '');
        this.edgeEls.push(p);
      });

      this.nodeEls = {};
      nodes.forEach((n, i) => {
        const g = el('g', { class: 'node', transform: `translate(${n.x},${n.y})`, tabindex: 0, role: 'button', 'aria-label': n.label, 'data-id': n.id }, gN);
        const br = el('g', { class: 'breath' }, g); br.style.animationDelay = (-(i * 0.7) % 4.6) + 's';
        if (n.kind === 'f') {
          el('circle', { r: 46, fill: col, opacity: 0.10, filter: 'url(#glow)' }, br);
          el('circle', { class: 'core', r: 34, fill: '#0e1230', stroke: col, 'stroke-width': 2 }, br);
          const C = 2 * Math.PI * 40; const arc = el('circle', { class: 'mast', r: 40, fill: 'none', stroke: col, 'stroke-width': 5, 'stroke-linecap': 'round', 'stroke-dasharray': `0 ${C}`, transform: 'rotate(-90)' }, br); arc.dataset.c = C;
          const ini = n.label.replace(/^(le |la |les |saint |sainte )/i, '').split(/[\s-]+/).filter(Boolean); const initials = (ini.length > 1 ? ini[0][0] + ini[ini.length - 1][0] : ini[0].slice(0, 2));
          const tx = el('text', { 'text-anchor': 'middle', y: 8, 'font-size': 22, fill: col }, br); tx.textContent = initials; tx.style.fill = col;
          const lb = el('text', { 'text-anchor': 'middle', y: 64, 'font-size': mob ? 21 : 16 }, g); lb.textContent = n.label;
        } else {
          el('rect', { class: 'core', x: -15, y: -15, width: 30, height: 30, rx: 4, transform: 'rotate(45)', fill: '#0e1230', stroke: 'rgba(224,184,98,.8)', 'stroke-width': 1.8 }, br);
          const lb = el('text', { 'text-anchor': 'middle', y: 36, 'font-size': mob ? 18 : 13.5 }, g); lb.textContent = n.label.length > 24 ? n.label.slice(0, 23) + '…' : n.label; el('title', {}, g).textContent = n.label; lb.style.fill = '#c9c6b8'; lb.style.fontWeight = 600;
        }
        // entrada escalonada
        g.animate([{ opacity: 0, transform: `translate(${n.x}px,${n.y}px) scale(.4)` }, { opacity: 1, transform: `translate(${n.x}px,${n.y}px) scale(1)` }], { duration: State.P.ajustes.reducirMov ? 1 : 600, delay: State.P.ajustes.reducirMov ? 0 : i * 45, easing: 'cubic-bezier(.2,.9,.3,1.3)' });
        const act = () => { global.Voz && Voz.Sfx2.ui('node'); this.select(n.id); handlers.onNode && handlers.onNode(n); };
        g.addEventListener('click', e => { e.stopPropagation(); act(); });
        g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); act(); } });
        g.addEventListener('mouseenter', () => this.hl(n.id)); g.addEventListener('mouseleave', () => this.hl(this.sel));
        this.nodeEls[n.id] = g;
      });
      svg.onclick = () => { this.select(null); handlers.onBg && handlers.onBg(); };
      this.bindZoom(); this.sel = null; this.refresh();
    },

    /** Resalta un nodo y sus vecinos; atenúa el resto. */
    hl(id) {
      const nb = new Set(id ? [id] : []);
      if (id) this.edges.forEach(e => { if (e.de === id) nb.add(e.a); if (e.a === id) nb.add(e.de); });
      this.edgeEls.forEach(p => p.classList.toggle('dim', !!id && p.dataset.a !== id && p.dataset.b !== id));
      Object.entries(this.nodeEls).forEach(([k, g]) => g.classList.toggle('dim', !!id && !nb.has(k)));
    },
    select(id) {
      this.sel = id; Object.entries(this.nodeEls).forEach(([k, g]) => g.classList.toggle('sel', k === id)); this.hl(id);
      if (id) { // onda al hacer clic
        const n = this.nodes.find(x => x.id === id), r = el('circle', { cx: n.x, cy: n.y, r: 30, fill: 'none', stroke: 'var(--accent)', 'stroke-width': 3 }, this.root);
        r.animate([{ r: 30, opacity: .9 }, { r: 90, opacity: 0 }], { duration: 700 }).onfinish = () => r.remove();
      }
    },
    /** Actualiza los aros de dominio. */
    refresh() {
      if (!this.nodes) return;
      this.nodes.forEach(n => { if (n.kind !== 'f') return; const arc = this.nodeEls[n.id].querySelector('.mast'), C = +arc.dataset.c, m = State.mastery(this.cap.id, n.id); arc.setAttribute('stroke-dasharray', `${C * m / 100} ${C}`); const est = State.estado(m); arc.setAttribute('stroke', est === 'dominado' ? 'var(--ok)' : 'var(--accent)'); });
    },
    bindZoom() {
      const svg = this.svg, root = this.root; let drag = null;
      const apply = () => root.setAttribute('transform', `translate(${this.z.x},${this.z.y}) scale(${this.z.k})`);
      svg.onwheel = e => { e.preventDefault(); const r = svg.getBoundingClientRect(), px = (e.clientX - r.left) * this.W / r.width, py = (e.clientY - r.top) * this.H / r.height; const k0 = this.z.k, k1 = Math.max(0.5, Math.min(2.6, k0 * (e.deltaY < 0 ? 1.12 : 0.89))); this.z.x = px - (px - this.z.x) * (k1 / k0); this.z.y = py - (py - this.z.y) * (k1 / k0); this.z.k = k1; apply(); };
      const ptrs = new Map(); let pinch = null;
      svg.addEventListener('pointerdown', e => { ptrs.set(e.pointerId, [e.clientX, e.clientY]); if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), k: this.z.k }; drag = null; } });
      svg.addEventListener('pointermove', e => { if (!ptrs.has(e.pointerId)) return; ptrs.set(e.pointerId, [e.clientX, e.clientY]); if (pinch && ptrs.size === 2) { const [a, b] = [...ptrs.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]), k1 = Math.max(0.5, Math.min(3, pinch.k * d / pinch.d)), r = svg.getBoundingClientRect(), cx = ((a[0] + b[0]) / 2 - r.left) * this.W / r.width, cy = ((a[1] + b[1]) / 2 - r.top) * this.H / r.height, k0 = this.z.k; this.z.x = cx - (cx - this.z.x) * (k1 / k0); this.z.y = cy - (cy - this.z.y) * (k1 / k0); this.z.k = k1; apply(); } });
      const endp = e => { ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch = null; }; svg.addEventListener('pointerup', endp); svg.addEventListener('pointercancel', endp);
      svg.onpointerdown = e => { if (e.target.closest('.node') || pinch || ptrs.size > 1) return; drag = { x: e.clientX, y: e.clientY, zx: this.z.x, zy: this.z.y, m: 0 }; };
      svg.onpointermove = e => { if (!drag) return; const r = svg.getBoundingClientRect(); const dx = (e.clientX - drag.x) * this.W / r.width, dy = (e.clientY - drag.y) * this.H / r.height; drag.m += Math.abs(dx) + Math.abs(dy); this.z.x = drag.zx + dx; this.z.y = drag.zy + dy; apply(); };
      svg.onpointerup = () => { drag = null; };
    },
  };
  global.MapView = Map_;
})(window);
