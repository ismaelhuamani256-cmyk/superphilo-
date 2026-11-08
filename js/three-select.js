/* ============================================================
 * three-select.js — 4.1 Selector de capítulos en 3D (Three.js)
 * Anillo de "monolitos" que giran suavemente. Parallax con el mouse,
 * hover = se acerca y brilla, clic = la cámara vuela hacia el capítulo.
 * Se pausa cuando la vista no está visible (para que no caliente la laptop).
 * ============================================================ */
(function (global) {
  'use strict';

  // color de acento de cada capítulo (se reparte el círculo cromático)
  const capColor = (cap, l = 62) => `hsl(${(((cap.numero - 1) * 360 / 17) + 28) % 360},68%,${l}%)`;
  global.capColor = capColor;

  const Select = {
    inited: false, running: false, hovered: -1, onEnter: null, onHover: null,

    async init(canvas, caps, opts) {
      this.caps = caps; this.onEnter = opts.onEnter; this.onHover = opts.onHover; this.canvas = canvas; this.reduced = () => State.P.ajustes.reducirMov;
      try {
        if (!global.THREE) throw new Error('three');
        this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
      } catch (e) { return this.fallback(); }
      const T = THREE, R = this.R = 8.4, N = caps.length;
      this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
      this.scene = new T.Scene(); this.scene.fog = new T.FogExp2(0x070914, 0.035);
      this.camera = new T.PerspectiveCamera(48, 1, 0.1, 200);
      this.camBase = new T.Vector3(0, 1.1, R + 7.2); this.camera.position.copy(this.camBase);
      this.ringRot = 0; this.vel = 0; this.mouse = { x: 0, y: 0 }; this.tmp = new T.Vector3();
      this.fly = null; this.spin = null;

      await Promise.all([document.fonts.load('700 60px "Cormorant Garamond"'), document.fonts.load('italic 500 30px "Cormorant Garamond"'), document.fonts.load('400 20px Inter')]).catch(() => {});

      // estrellas 3D (profundidad para el parallax)
      const sg = new T.BufferGeometry(), sp = new Float32Array(900 * 3);
      for (let i = 0; i < 900; i++) { const r = 30 + Math.random() * 60, a = Math.random() * 6.283, b = (Math.random() - 0.5) * 1.6; sp[i * 3] = Math.cos(a) * r; sp[i * 3 + 1] = b * r * 0.5; sp[i * 3 + 2] = Math.sin(a) * r; }
      sg.setAttribute('position', new T.BufferAttribute(sp, 3));
      this.stars = new T.Points(sg, new T.PointsMaterial({ color: 0xcfd6ff, size: 0.22, transparent: true, opacity: 0.8, fog: false })); this.scene.add(this.stars);

      // suelo: anillo dorado tenue
      const ring = new T.Mesh(new T.RingGeometry(R - 0.03, R + 0.03, 128), new T.MeshBasicMaterial({ color: 0xe0b862, transparent: true, opacity: 0.18, side: T.DoubleSide }));
      ring.rotation.x = -Math.PI / 2; ring.position.y = -2.3; this.scene.add(ring); this.floor = ring;

      this.cards = caps.map((c, i) => {
        const g = new T.Group(), tex = new T.CanvasTexture(this.cardCanvas(c)); tex.anisotropy = 4; tex.colorSpace = T.SRGBColorSpace;
        const face = new T.Mesh(new T.PlaneGeometry(2.3, 3.23), new T.MeshBasicMaterial({ map: tex, transparent: true }));
        const glow = new T.Mesh(new T.PlaneGeometry(4.2, 5.2), new T.MeshBasicMaterial({ map: this.glowTex(), color: new T.Color(capColor(c, 60)), transparent: true, opacity: 0.0, blending: T.AdditiveBlending, depthWrite: false }));
        glow.position.z = -0.05;
        const back = new T.Mesh(new T.PlaneGeometry(2.3, 3.23), new T.MeshBasicMaterial({ color: 0x151a3a, transparent: true, opacity: 0.35 })); back.rotation.y = Math.PI; back.position.z = -0.01;
        g.add(glow, face, back); g.userData = { i, face, glow, tex, hv: 0, mastery: -1, phase: Math.random() * 6.28 }; this.scene.add(g); return g;
      });

      this.ray = new T.Raycaster(); this.ndc = new T.Vector2();
      this.bind(); this.resize(); this.inited = true; this.layout(0);
      new ResizeObserver(() => this.resize()).observe(canvas.parentElement);
    },

    glowTex() { if (this._gt) return this._gt; const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'), g = x.createRadialGradient(64, 64, 8, 64, 64, 64); g.addColorStop(0, 'rgba(255,255,255,.9)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); return this._gt = new THREE.CanvasTexture(c); },

    /* textura de la tarjeta: número, título, dominio */
    cardCanvas(c) {
      const cv = document.createElement('canvas'); cv.width = 512; cv.height = 720; this.paintCard(cv, c); return cv;
    },
    paintCard(cv, c) {
      const x = cv.getContext('2d'), W = 512, H = 720, col = capColor(c), m = State.chapterMastery(c.id);
      x.clearRect(0, 0, W, H);
      const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#161b3c'); g.addColorStop(1, '#090c1e');
      x.fillStyle = g; x.beginPath(); x.roundRect(6, 6, W - 12, H - 12, 26); x.fill();
      x.strokeStyle = col; x.lineWidth = 4; x.globalAlpha = .9; x.stroke(); x.globalAlpha = 1;
      // constelación decorativa determinista
      let s = c.numero * 977; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
      x.fillStyle = 'rgba(255,255,255,.55)'; for (let i = 0; i < 38; i++) { x.beginPath(); x.arc(30 + rnd() * 452, 30 + rnd() * 660, rnd() * 1.8 + .4, 0, 7); x.fill(); }
      x.strokeStyle = col; x.globalAlpha = .18; x.lineWidth = 1.5; x.beginPath(); for (let i = 0; i < 6; i++) { const px = 60 + rnd() * 392, py = 360 + rnd() * 250; i ? x.lineTo(px, py) : x.moveTo(px, py); } x.stroke(); x.globalAlpha = 1;
      // número romano grande
      x.fillStyle = col; x.globalAlpha = .9; x.font = '700 150px "Cormorant Garamond", serif'; x.textAlign = 'center'; x.textBaseline = 'alphabetic'; x.fillText(String(c.numero).padStart(2, '0'), W / 2, 190); x.globalAlpha = 1;
      // título
      x.fillStyle = '#f3ecd8'; x.font = '700 64px "Cormorant Garamond", serif';
      const words = c.titulo.split(' '); let lines = [], cur = ''; words.forEach(w => { const t = cur ? cur + ' ' + w : w; if (x.measureText(t).width > 420 && cur) { lines.push(cur); cur = w; } else cur = t; }); lines.push(cur);
      lines.forEach((l, i) => x.fillText(l, W / 2, 300 + i * 66));
      if (State.lang !== 'fr') { x.fillStyle = '#9a9db5'; x.font = 'italic 500 30px "Cormorant Garamond", serif'; x.fillText(c.titulo_es, W / 2, 300 + lines.length * 66 + 8); }
      // pie: nº de filósofos y dominio
      x.font = '400 22px Inter, sans-serif'; x.fillStyle = '#c9c6b8'; x.fillText(`${c.filosofos.length} ${L('filósofos', 'philosophes')} · ${c.conceptos.length} ${L('conceptos', 'concepts')}`, W / 2, 606);
      x.fillStyle = 'rgba(255,255,255,.12)'; x.beginPath(); x.roundRect(70, 630, 372, 14, 7); x.fill();
      if (m > 0) { x.fillStyle = col; x.beginPath(); x.roundRect(70, 630, Math.max(14, 372 * m / 100), 14, 7); x.fill(); }
      x.fillStyle = '#9a9db5'; x.font = '400 18px Inter, sans-serif'; x.fillText(m ? `${L('dominio', 'maîtrise')} ${m}%` : L('sin empezar', 'pas commencé'), W / 2, 670);
    },
    /** Cambia la lista de capítulos (al cambiar de idioma) y repinta las tarjetas. */
    setCaps(caps) { this.caps = caps; if (this.cards) this.cards.forEach(g => g.userData.mastery = -1); this.refresh(); },
    refresh() {
      if (!this.inited || !this.cards) return;
      this.cards.forEach((g, i) => { const m = State.chapterMastery(this.caps[i].id); if (m !== g.userData.mastery) { g.userData.mastery = m; this.paintCard(g.userData.tex.image, this.caps[i]); g.userData.tex.needsUpdate = true; } });
    },

    bind() {
      const cv = this.canvas; let down = null;
      cv.addEventListener('pointerdown', e => { if (this.fly) return; down = { x: e.clientX, y: e.clientY, moved: 0, last: e.clientX }; this.vel = 0; this.spin = null; cv.setPointerCapture(e.pointerId); cv.style.cursor = 'grabbing'; });
      cv.addEventListener('pointermove', e => {
        const r = cv.getBoundingClientRect(); this.mouse.x = ((e.clientX - r.left) / r.width) * 2 - 1; this.mouse.y = -(((e.clientY - r.top) / r.height) * 2 - 1);
        this.ndc.set(this.mouse.x, this.mouse.y);
        if (down) { const dx = e.clientX - down.last; down.last = e.clientX; down.moved += Math.abs(dx); this.ringRot += dx * 0.0062; this.vel = dx * 0.0062 * 60; }
        else this.pick();
      });
      cv.addEventListener('pointerup', e => {
        cv.style.cursor = ''; if (!down) return; const moved = down.moved; down = null;
        if (moved < 6) { const r = cv.getBoundingClientRect(); this.ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -(((e.clientY - r.top) / r.height) * 2 - 1)); this.pick(); if (this.hovered >= 0) this.enter(this.hovered); }
      });
      cv.addEventListener('pointerleave', () => { this.setHover(-1); });
      cv.addEventListener('wheel', e => { e.preventDefault(); this.vel += e.deltaY * 0.004; }, { passive: false });
      addEventListener('keydown', e => { if (!this.running) return; if (e.key === 'ArrowLeft') this.vel -= 1.2; if (e.key === 'ArrowRight') this.vel += 1.2; if (e.key === 'Enter' && this.hovered >= 0) this.enter(this.hovered); });
    },

    pick() {
      if (!this.cards || this.fly) return;
      this.ray.setFromCamera(this.ndc, this.camera);
      const hits = this.ray.intersectObjects(this.cards.map(c => c.userData.face));
      let idx = -1;
      for (const h of hits) { const g = h.object.parent; // sólo cartas que miran a la cámara
        this.tmp.setFromMatrixPosition(g.matrixWorld); if (this.tmp.z > 0) { idx = g.userData.i; break; } }
      this.setHover(idx);
    },
    setHover(i) {
      if (i === this.hovered) return; this.hovered = i; this.canvas.classList.toggle('hover', i >= 0);
      this.onHover && this.onHover(i >= 0 ? this.caps[i] : null);
    },

    layout(t) {
      const N = this.cards.length, R = this.R, red = this.reduced();
      this.cards.forEach((g, i) => {
        const th = i / N * Math.PI * 2 + this.ringRot, u = g.userData;
        const target = (i === this.hovered ? 1 : 0); u.hv += (target - u.hv) * 0.14;
        const bob = red ? 0 : Math.sin(t * 0.8 + u.phase) * 0.14;
        const rr = R + u.hv * 1.5;
        g.position.set(Math.sin(th) * rr, bob + u.hv * 0.1, Math.cos(th) * rr);
        g.rotation.set(0, th, red ? 0 : Math.sin(t * 0.5 + u.phase) * 0.025);
        const sc = 1 + u.hv * 0.16; g.scale.setScalar(sc);
        u.glow.material.opacity = 0.05 + u.hv * 0.55;
      });
    },

    /** Gira el anillo hasta traer la carta i al frente y luego vuela hacia ella. */
    enter(i) {
      if (this.fly) return; const N = this.cards.length, TWO = Math.PI * 2;
      let want = -(i / N) * TWO; let d = ((want - this.ringRot) % TWO + TWO) % TWO; if (d > Math.PI) d -= TWO;
      this.spin = { from: this.ringRot, to: this.ringRot + d, t0: performance.now(), dur: this.reduced() ? 1 : Math.min(900, 250 + Math.abs(d) * 420), i };
      this.vel = 0;
    },
    _startFly(i) {
      const g = this.cards[i]; this.tmp.setFromMatrixPosition(g.matrixWorld);
      const from = this.camera.position.clone(), to = new THREE.Vector3(this.tmp.x, this.tmp.y + 0.05, this.tmp.z + 2.9);
      global.Voz && Voz.Sfx2.ui('fly');
      this.fly = { from, to, t0: performance.now(), dur: this.reduced() ? 1 : 1150, i, done: false };
      document.getElementById('fade').classList.add('on');
      setTimeout(() => document.getElementById('fade').classList.add('on'), this.fly.dur - 500);
    },

    resize() {
      if (!this.renderer) return; const p = this.canvas.parentElement, w = p.clientWidth, h = p.clientHeight; if (!w) return;
      this.renderer.setSize(w, h, false); this.camera.aspect = w / h;
      this.camBase.z = this.R + (w / h < 1 ? 11.5 : 7.2); this.camera.updateProjectionMatrix();
    },

    start() {
      if (!this.inited || this.running) return; this.running = true; this.fly = null; this.spin = null; this.camera.position.copy(this.camBase); this.refresh(); this.resize();
      let last = performance.now(); const loop = now => {
        if (!this.running) return; this._raf = requestAnimationFrame(loop);
        const dt = Math.min(0.05, (now - last) / 1000); last = now; const t = now / 1000, red = this.reduced();
        // rotación: arrastre con inercia + giro lento en reposo
        if (this.spin) { const k = Math.min(1, (now - this.spin.t0) / this.spin.dur), e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; this.ringRot = this.spin.from + (this.spin.to - this.spin.from) * e; if (k >= 1) { const i = this.spin.i; this.spin = null; this._startFly(i); } }
        else if (!this.fly) { this.ringRot += this.vel * dt; this.vel *= Math.pow(0.04, dt); if (!red && Math.abs(this.vel) < 0.05 && this.hovered < 0) this.ringRot += dt * 0.07; }
        // cámara: parallax o vuelo
        if (this.fly) {
          const k = Math.min(1, (now - this.fly.t0) / this.fly.dur), e = k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
          this.camera.position.lerpVectors(this.fly.from, this.fly.to, e); this.camera.lookAt(this.tmp.x, this.tmp.y, this.tmp.z);
          if (k >= 1 && !this.fly.done) { this.fly.done = true; const i = this.fly.i; this.onEnter && this.onEnter(this.caps[i]); }
        } else {
          const px = red ? 0 : this.mouse.x * 1.6, py = red ? 0 : this.mouse.y * 0.7;
          this.camera.position.x += (this.camBase.x + px - this.camera.position.x) * 0.06; this.camera.position.y += (this.camBase.y + py - this.camera.position.y) * 0.06; this.camera.position.z += (this.camBase.z - this.camera.position.z) * 0.06;
          this.camera.lookAt(0, 0.1, this.R * 0.55);
        }
        if (!red) this.stars.rotation.y = t * 0.012;
        this.layout(t); this.renderer.render(this.scene, this.camera);
      };
      this._raf = requestAnimationFrame(loop);
    },
    stop() { this.running = false; cancelAnimationFrame(this._raf); },

    /* sin WebGL: rejilla HTML equivalente */
    fallback() {
      const fb = document.getElementById('gl-fallback'); document.getElementById('gl').hidden = true; fb.hidden = false; fb.className = 'page grid';
      fb.style.cssText = 'position:absolute;inset:100px 0 0 0;overflow:auto;padding:20px 5vw';
      fb.innerHTML = this.caps.map(c => `<button class="card" style="--accent:${capColor(c)};text-align:left" data-id="${c.id}"><div class="n">${String(c.numero).padStart(2, '0')}</div><h3>${c.titulo}</h3><div style="color:var(--muted);font-size:13px">${c.titulo_es} · ${c.filosofos.length} ${L('filósofos','philosophes')}</div></button>`).join('');
      fb.onclick = e => { const b = e.target.closest('[data-id]'); if (b) this.onEnter(State.byCap[b.dataset.id]); };
      this.inited = true; this.start = () => {}; this.stop = () => {}; this.refresh = () => {};
    },
  };
  global.Select = Select;
})(window);
