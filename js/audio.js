/* ============================================================
 * audio.js — voz (narración), modo podcast y música ambiental
 *
 *  - Voz: usa las voces del navegador/sistema (Web Speech API): sin API, sin key,
 *    sin archivos. Español y francés (las citas siempre se leen en francés).
 *  - Cola ("podcast"): lista de textos que se leen seguidos, con ⏮ ⏯ ⏭, velocidad
 *    y temporizador de apagado. Sigue sonando mientras navegas por la app.
 *  - Música: pad ambiental generado con WebAudio (no hay archivos de audio), opcional.
 * ============================================================ */
(function (global) {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const S = global.State, P = () => S.P;
  const supported = 'speechSynthesis' in global && 'SpeechSynthesisUtterance' in global;
  const BCP = { es: ['es-ES', 'es-MX', 'es-US', 'es'], fr: ['fr-FR', 'fr-CA', 'fr-BE', 'fr'] };

  /* ================= VOZ ================= */
  let voices = [];
  const loadVoices = () => { voices = supported ? speechSynthesis.getVoices() : []; };
  if (supported) { loadVoices(); speechSynthesis.addEventListener && speechSynthesis.addEventListener('voiceschanged', loadVoices); }

  /** Mejor voz para un idioma: la elegida en Ajustes, si no una "natural/neural/Google" y si no la primera. */
  function pickVoice(lang) {
    if (!voices.length) loadVoices();
    const saved = P().ajustes[lang === 'fr' ? 'vozFr' : 'vozEs']; const byName = saved && voices.find(v => v.name === saved); if (byName) return byName;
    const cand = voices.filter(v => v.lang && v.lang.toLowerCase().startsWith(lang));
    if (!cand.length) return null;
    const score = v => (/natural|neural|online/i.test(v.name) ? 4 : 0) + (/google|microsoft|apple|siri|premium|enhanced/i.test(v.name) ? 2 : 0) + (BCP[lang][0].toLowerCase() === v.lang.toLowerCase() ? 1 : 0) + (v.localService ? 0.5 : 0);
    return cand.sort((a, b) => score(b) - score(a))[0];
  }
  /** Limpia el texto para que suene bien (sin viñetas, páginas ni símbolos). */
  function clean(t) { return String(t || '').replace(/\[…\]|\[\.\.\.\]/g, ', ').replace(/…/g, '.').replace(/[«»“”"]/g, '').replace(/\s*\((?:p\.?\s*\d+)\)/g, '').replace(/[✦◆➜→↑↓]/g, ',').replace(/\s+/g, ' ').trim(); }
  /** Trozos de ≤ 220 caracteres cortando por frases (Chrome corta los textos largos). */
  function chunk(t) {
    t = clean(t); if (t.length <= 220) return t ? [t] : [];
    const out = []; let cur = ''; (t.match(/[^.!?;:]+[.!?;:]?\s*/g) || [t]).forEach(s => { if ((cur + s).length > 220 && cur) { out.push(cur.trim()); cur = s; } else cur += s; }); if (cur.trim()) out.push(cur.trim());
    return out.flatMap(c => c.length > 260 ? c.match(/.{1,240}(\s|$)/g) : [c]);
  }
  function utter(text, lang, rate) {
    const u = new SpeechSynthesisUtterance(text), v = pickVoice(lang);
    if (v) { u.voice = v; u.lang = v.lang; } else u.lang = BCP[lang][0];
    u.rate = rate || P().ajustes.vozRate || 1; u.pitch = 1; u.volume = 1; return u;
  }
  let sayTok = 0;
  /** Lee un texto suelto (narración de escenas). Con queue=true se encadena tras lo que suena. */
  function say(text, lang, queue) {
    if (!supported) return false; if (!pickVoice(lang) && !voices.length) loadVoices();
    if (!queue) { speechSynthesis.cancel(); sayTok++; }
    chunk(text).forEach(c => speechSynthesis.speak(utter(c, lang))); Musica.duck(true);
    const tok = sayTok; setTimeout(function chk() { if (tok !== sayTok) return; if (speechSynthesis.speaking || speechSynthesis.pending) setTimeout(chk, 400); else Musica.duck(false); }, 500);
    return true;
  }
  function cancel() { if (!supported) return; sayTok++; speechSynthesis.cancel(); Musica.duck(false); }
  function hasVoice(lang) { if (!voices.length) loadVoices(); return !supported ? false : voices.some(v => v.lang && v.lang.toLowerCase().startsWith(lang)); }
  function warnIfNoVoice(lang) { if (!supported) { toast(L('Tu navegador no tiene síntesis de voz. Prueba con Chrome o Edge.', 'Ton navigateur n’a pas de synthèse vocale. Essaie Chrome ou Edge.')); return true; } if (voices.length && !hasVoice(lang)) { toast(L('No hay una voz en ' + (lang === 'fr' ? 'francés' : 'español') + ' instalada en tu sistema.', 'Aucune voix ' + (lang === 'fr' ? 'française' : 'espagnole') + ' installée sur ton système.')); return true; } return false; }

  /* ================= COLA / PODCAST ================= */
  const Q = { items: [], i: 0, playing: false, tok: 0, title: '', sleep: 0 };
  function bar() { return $('#audiobar'); }
  function paintBar() {
    const b = bar(); if (!b) return; if (!Q.items.length) { b.hidden = true; return; } b.hidden = false;
    const it = Q.items[Math.min(Q.i, Q.items.length - 1)];
    $('#ab-title', b).textContent = Q.title; $('#ab-now', b).textContent = (it && it.label) || ''; $('#ab-pos', b).textContent = `${Math.min(Q.i + 1, Q.items.length)}/${Q.items.length}`;
    $('#ab-play', b).textContent = Q.playing ? '⏸' : '▶'; $('#ab-fill', b).style.width = (Q.i / Math.max(1, Q.items.length) * 100) + '%';
    $('#ab-rate', b).value = String(P().ajustes.vozRate || 1);
  }
  function runQ() {
    if (!Q.playing) return; if (Q.i >= Q.items.length) return stopQ(true);
    const it = Q.items[Q.i], tok = ++Q.tok; speechSynthesis.cancel(); Musica.duck(true); paintBar();
    const parts = chunk(it.text); if (!parts.length) { Q.i++; return runQ(); }
    let k = 0; const next = () => { if (tok !== Q.tok || !Q.playing) return; if (k >= parts.length) { Q.i++; return runQ(); } const u = utter(parts[k++], it.lang); u.onend = next; u.onerror = e => { if (e.error !== 'canceled' && e.error !== 'interrupted') next(); }; speechSynthesis.speak(u); };
    next();
  }
  /** Reproduce una lista [{text, lang, label}] como podcast. */
  function playQ(items, title, from) {
    if (!supported) return warnIfNoVoice('es'); if (warnIfNoVoice(items[0] ? items[0].lang : 'es')) return;
    cancel(); Q.items = items.filter(x => clean(x.text)); Q.i = from || 0; Q.title = title; Q.playing = true; runQ(); paintBar();
  }
  function stopQ(done) { Q.tok++; Q.playing = false; if (supported) speechSynthesis.cancel(); Musica.duck(false); if (!done) Q.items = []; else Q.i = 0; clearTimeout(Q.sleep); paintBar(); if (done) { Q.items = []; paintBar(); } }
  function toggleQ() { if (!Q.items.length) return; Q.playing = !Q.playing; if (Q.playing) runQ(); else { Q.tok++; speechSynthesis.cancel(); Musica.duck(false); } paintBar(); }
  function skipQ(d) { if (!Q.items.length) return; Q.i = Math.max(0, Math.min(Q.items.length - 1, Q.i + d)); Q.playing = true; runQ(); }
  function setRate(r) { S.setAjuste('vozRate', +r); if (Q.playing) runQ(); paintBar(); }
  function sleepIn(min) { clearTimeout(Q.sleep); if (min) { Q.sleep = setTimeout(() => stopQ(), min * 60000); toast(L('Se apagará en ' + min + ' min', 'Arrêt dans ' + min + ' min')); } }

  /* ---------- constructores de listas ---------- */
  const lg = () => S.lang;      // idioma del contenido (es / fr)
  const T = (s, f) => L(s, f);
  function fichaItems(cap, f) {
    const l = lg(), it = [{ text: f.nombre + '. ' + f.epoca, lang: l, label: f.nombre }, { text: T('Tesis principal. ', 'Thèse principale. ') + f.tesis_principal, lang: l, label: T('Tesis', 'Thèse') }];
    f.ideas_clave.forEach((x, i) => it.push({ text: T('Idea ', 'Idée ') + (i + 1) + '. ' + x, lang: l, label: T('Idea ', 'Idée ') + (i + 1) }));
    (f.citas || []).forEach(c => { it.push({ text: T('Cita de ', 'Citation de ') + f.nombre + '.', lang: l, label: T('Cita', 'Citation') }, { text: c.texto, lang: 'fr', label: '« ' + c.texto.slice(0, 40) + '… »' }); });
    it.push({ text: T('Cómo usarlo en la disertación. ', 'Comment l’utiliser en dissertation. ') + f.como_usarlo_en_disertacion, lang: l, label: T('Disertación', 'Dissertation') });
    return it;
  }
  function chapterItems(cap, mode) {
    const l = lg(), it = [];
    const intro = [{ text: T('Noción ', 'Notion ') + cap.numero + '. ' + (l === 'fr' ? cap.titulo : cap.titulo_es + '. ' + cap.titulo), lang: l, label: cap.titulo }];
    if (mode === 'completo') {
      it.push(...intro, { text: cap.resumen, lang: l, label: T('Resumen', 'Résumé') });
      it.push({ text: T('Los cinco puntos incontournables.', 'Les cinq points incontournables.'), lang: l, label: T('Puntos clave', 'Points clés') }); cap.puntos_incontournables.forEach((x, i) => it.push({ text: (i + 1) + '. ' + x, lang: l, label: T('Punto ', 'Point ') + (i + 1) }));
      cap.conceptos.forEach(k => it.push({ text: k.nombre + '. ' + k.definicion, lang: l, label: k.nombre }));
      cap.filosofos.forEach(f => it.push(...fichaItems(cap, f)));
      it.push({ text: T('Problemáticas tipo bac. ', 'Problématiques type bac. ') + cap.problematicas_bac.join(' . '), lang: l, label: T('Problemáticas', 'Problématiques') });
    } else if (mode === 'tesis') {
      it.push(...intro); cap.filosofos.forEach(f => it.push({ text: f.nombre + '. ' + f.tesis_principal, lang: l, label: f.nombre }));
    } else if (mode === 'citas') {
      cap.filosofos.forEach(f => (f.citas || []).forEach(c => it.push({ text: f.nombre + '.', lang: l, label: f.nombre }, { text: c.texto, lang: 'fr', label: '« ' + c.texto.slice(0, 40) + '… »' })));
    } else if (mode === 'conceptos') {
      cap.conceptos.forEach(k => it.push({ text: k.nombre + '. ' + k.definicion, lang: l, label: k.nombre }));
    } else if (mode === 'disertaciones') {
      cap.disertaciones.forEach(d => { it.push({ text: T('Sujeto: ', 'Sujet : ') + d.sujeto, lang: 'fr', label: d.sujeto }, { text: T('Problemática. ', 'Problématique. ') + d.problematica, lang: l, label: T('Problemática', 'Problématique') }); d.plan.forEach(p => it.push({ text: p.parte + '. ' + p.idea, lang: l, label: p.parte })); });
    }
    return it;
  }
  function reperesItems() { const l = lg(); return ((S.COURS.extras || {}).reperes || []).map(r => ({ text: r.termino_fr + '. ' + r.definicion_es, lang: l, label: r.termino_fr })); }

  /* ================= MÚSICA AMBIENTAL (WebAudio, sin archivos) ================= */
  const Musica = (() => {
    let ctx, master, lp, voices_ = [], timer = 0, on = false, step = 0, root = 57, duckG = 1;
    const CH = [[0, 4, 7, 11], [5, 9, 12, 16], [3, 7, 10, 14], [7, 11, 14, 17]];    // acordes sobre la raíz (Imaj7 / IV / bIII / V)
    const f = n => 440 * Math.pow(2, (n - 69) / 12);
    function build() {
      ctx = new (global.AudioContext || global.webkitAudioContext)(); master = ctx.createGain(); master.gain.value = 0; lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900; lp.Q.value = 0.4;
      const dly = ctx.createDelay(1.2); dly.delayTime.value = 0.43; const fb = ctx.createGain(); fb.gain.value = 0.38; const wet = ctx.createGain(); wet.gain.value = 0.35;
      lp.connect(master); lp.connect(dly); dly.connect(fb); fb.connect(dly); dly.connect(wet); wet.connect(master); master.connect(ctx.destination);
      voices_ = [0, 1, 2, 3].map(i => { const o = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain(); o.type = 'triangle'; o2.type = 'sine'; o2.detune.value = 7; g.gain.value = 0.0; o.connect(g); o2.connect(g); g.connect(lp); o.start(); o2.start(); return { o, o2, g }; });
      const lfo = ctx.createOscillator(), lg_ = ctx.createGain(); lfo.frequency.value = 0.07; lg_.gain.value = 260; lfo.connect(lg_); lg_.connect(lp.frequency); lfo.start();
    }
    function chord() { const c = CH[step++ % CH.length], t = ctx.currentTime; voices_.forEach((v, i) => { const n = root + c[i] - (i === 0 ? 12 : 0); v.o.frequency.setTargetAtTime(f(n), t, 1.4); v.o2.frequency.setTargetAtTime(f(n), t, 1.4); v.g.gain.setTargetAtTime(i === 0 ? 0.20 : 0.11, t, 1.8); }); }
    function vol() { return (P().ajustes.musicaVol == null ? 0.5 : P().ajustes.musicaVol) * 0.22 * duckG; }
    function apply() { if (master) master.gain.setTargetAtTime(on ? vol() : 0, ctx.currentTime, 0.6); }
    return {
      get on() { return on; },
      start() { if (on) return; try { if (!ctx) build(); ctx.resume(); } catch (e) { return toast(L('Tu navegador no permite audio', 'Ton navigateur ne permet pas l’audio')); } on = true; chord(); clearInterval(timer); timer = setInterval(chord, 9000); apply(); S.setAjuste('musica', true); },
      stop() { on = false; apply(); clearInterval(timer); S.setAjuste('musica', false); },
      toggle() { on ? this.stop() : this.start(); paintMusicBtn(); },
      setVol(v) { S.setAjuste('musicaVol', +v); apply(); },
      duck(d) { duckG = d ? 0.35 : 1; apply(); },
      setRoot(n) { root = 52 + ((n * 2) % 12); },       // cada noción tiene su tono
    };
  })();
  function paintMusicBtn() { const b = $('#btn-music'); if (b) { b.classList.toggle('on', Musica.on); b.title = Musica.on ? L('Música: apagar', 'Musique : couper') : L('Música ambiental', 'Musique d’ambiance'); } }

  /* ================= EFECTOS DE SONIDO DE LAS ESCENAS (WebAudio) ================= */
  const Sfx2 = (() => {
    let ctx;
    const tone = (f1, f2, d, type, vol, delay) => { try { ctx = ctx || new (global.AudioContext || global.webkitAudioContext)(); if (ctx.state === 'suspended') ctx.resume(); const t = ctx.currentTime + (delay || 0), o = ctx.createOscillator(), g = ctx.createGain(); o.type = type || 'sine'; o.frequency.setValueAtTime(f1, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + d); o.connect(g); g.connect(ctx.destination); o.start(t); o.stop(t + d + 0.03); } catch (e) {} };
    const noise = (d, vol, lo, hi) => { try { ctx = ctx || new (global.AudioContext || global.webkitAudioContext)(); const n = Math.floor(ctx.sampleRate * d), buf = ctx.createBuffer(1, n, ctx.sampleRate), ch = buf.getChannelData(0); for (let i = 0; i < n; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / n); const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(); src.buffer = buf; f.type = 'bandpass'; f.frequency.setValueAtTime(lo, ctx.currentTime); f.frequency.exponentialRampToValueAtTime(hi, ctx.currentTime + d); g.gain.value = vol; src.connect(f); f.connect(g); g.connect(ctx.destination); src.start(); } catch (e) {} };
    const K = {
      aparece: () => { tone(420, 880, 0.14, 'sine', 0.10); },
      desaparece: () => tone(500, 180, 0.22, 'sine', 0.07),
      dice: () => { tone(620, 540, 0.07, 'square', 0.035); tone(740, 640, 0.07, 'square', 0.03, 0.08); },
      piensa: () => { tone(330, 420, 0.18, 'triangle', 0.06); tone(280, 360, 0.2, 'triangle', 0.05, 0.12); },
      proyecta: () => noise(0.9, 0.07, 300, 2400),
      une: () => tone(260, 390, 0.25, 'triangle', 0.07),
      resalta: () => { tone(880, 0, 0.35, 'sine', 0.08); tone(1320, 0, 0.3, 'sine', 0.05, 0.05); },
      tiembla: () => tone(70, 55, 0.9, 'sawtooth', 0.06),
      salta: () => tone(240, 620, 0.18, 'sine', 0.08),
      cita: () => { tone(660, 0, 0.5, 'sine', 0.07); tone(990, 0, 0.6, 'sine', 0.05, 0.12); },
      mueve: () => noise(0.35, 0.03, 500, 900),
      etiqueta: () => tone(520, 0, 0.08, 'triangle', 0.04),
      fin: () => { tone(523, 0, 0.5, 'sine', 0.07); tone(659, 0, 0.5, 'sine', 0.06, 0.15); tone(784, 0, 0.8, 'sine', 0.06, 0.3); },
      final_tragico: () => { tone(220, 110, 1.4, 'sawtooth', 0.06); tone(165, 82, 1.6, 'triangle', 0.07, 0.2); },
      final_luminoso: () => { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0, 0.9, 'sine', 0.06, i * 0.14)); },
    };
    return { play(k) { if (P().ajustes.sfxEscena === false) return; (K[k] || (() => {}))(); }, ensure() { try { ctx = ctx || new (global.AudioContext || global.webkitAudioContext)(); ctx.resume(); } catch (e) {} } };
  })();

  /* ================= AUDIO DE LAS ESCENAS: voz + efectos ================= */
  /** Devuelve {tick(t), reset()}: llámalo en cada onTime del reproductor. Lee subtítulos y citas y dispara efectos. */
  function sceneAudio(getModel) {
    let lastSub = null, lastQuote = null, last = 0;
    return {
      tick(t) {
        const m = getModel(); if (!m) return;
        if (t < last - 0.3) { lastSub = lastQuote = null; last = Math.max(0, t - 0.05); }
        const jump = t - last > 1.5;                                   // salto en la línea de tiempo: no disparar efectos atrasados
        if (!jump) m.script.pasos.forEach(p => { if (p.t > last && p.t <= t) Sfx2.play(p.accion); });
        last = t;
        if (!P().ajustes.narrar) return;
        const st = m.evaluate(t);
        if (st.subtitle && st.subtitle.text !== lastSub) { lastSub = st.subtitle.text; say(st.subtitle.text, lg(), false); }
        if (st.quote && st.quote.text !== lastQuote) { lastQuote = st.quote.text; say(st.quote.text, 'fr', true); }
      },
      reset() { lastSub = lastQuote = null; last = 0; cancel(); },
      pause() { cancel(); },
    };
  }

  /* ================= VISTA "AUDIO" ================= */
  function renderAudio(root) {
    const caps = S.COURS.capitulos, r = P().ajustes.vozRate || 1;
    root.innerHTML = `<h1>🎧 ${L('Audio', 'Audio')}</h1><p class="lead">${L('Estudia sin mirar la pantalla: la app lee tu cours en voz alta (con las voces de tu navegador o sistema) y sigue sonando mientras navegas. Las citas siempre se leen en francés.', 'Étudie sans regarder l’écran : l’appli lit ton cours à voix haute (avec les voix de ton navigateur ou système) et continue pendant que tu navigues. Les citations sont toujours lues en français.')}</p>
      ${!supported ? `<div class="expl">${L('Este navegador no tiene síntesis de voz. Usa Chrome o Edge.', 'Ce navigateur n’a pas de synthèse vocale. Utilise Chrome ou Edge.')}</div>` : (!hasVoice('fr') || !hasVoice('es')) && voices.length ? `<div class="expl">${L('Ojo: no encuentro voz instalada en ' + (!hasVoice('fr') ? 'francés' : 'español') + '. Instálala en la configuración de voz de tu sistema (Windows: Configuración → Hora e idioma → Voz).', 'Attention : aucune voix installée en ' + (!hasVoice('fr') ? 'français' : 'espagnol') + '. Installe-la dans les réglages vocaux du système.')}</div>` : ''}
      <div class="field" style="display:flex;gap:18px;flex-wrap:wrap;align-items:flex-end"><div><label>${L('Velocidad', 'Vitesse')}</label><div class="seg" id="au-rate">${[0.8, 1, 1.2, 1.5].map(v => `<button data-v="${v}" class="${r === v ? 'on' : ''}">${v}×</button>`).join('')}</div></div>
        <div><label>${L('Apagar en', 'Arrêt dans')}</label><select id="au-sleep"><option value="0">—</option><option value="15">15 min</option><option value="30">30 min</option><option value="60">60 min</option></select></div>
        <div><label>${L('Música ambiental', 'Musique d’ambiance')}</label><button class="btn sm" id="au-music">${Musica.on ? '🎵 ' + L('Apagar', 'Couper') : '🎵 ' + L('Encender', 'Allumer')}</button></div></div>
      <div class="grid" style="margin-bottom:22px"><div class="card"><h3>🔖 ${L('Repères (glosario)', 'Repères (glossaire)')}</h3><p style="color:#c9c6b8;font-size:14px;margin:4px 0 8px">${L('Los 31 pares de repères del libro.', 'Les 31 paires de repères du livre.')}</p><div class="row"><button class="btn primary sm" id="au-rep">▶ ${L('Escuchar', 'Écouter')}</button></div></div>
        <div class="card"><h3>⚡ ${L('Repaso express', 'Révision express')}</h3><p style="color:#c9c6b8;font-size:14px;margin:4px 0 8px">${L('Tesis de todos los autores de todas las nociones (~25 min).', 'Thèses de tous les auteurs de toutes les notions (~25 min).')}</p><div class="row"><button class="btn primary sm" id="au-all">▶ ${L('Escuchar', 'Écouter')}</button></div></div></div>
      <div class="grid">${caps.map(c => `<div class="card" style="--accent:${capColor(c)}"><div class="n">${String(c.numero).padStart(2, '0')}</div><h3>${esc(UI.titulo(c))}</h3><div class="row" style="flex-direction:column;align-items:stretch;gap:6px">${[['completo', '🎧 ' + L('Capítulo completo', 'Chapitre complet')], ['tesis', '⚡ ' + L('Tesis de los autores', 'Thèses des auteurs')], ['citas', '❝ ' + L('Citas (francés)', 'Citations (français)')], ['conceptos', '◆ ' + L('Conceptos', 'Concepts')], ['disertaciones', '🧩 ' + L('Planes de disertación', 'Plans de dissertation')]].map(([m, n]) => `<button class="btn sm" data-ch="${c.id}|${m}" style="justify-content:flex-start">${n}</button>`).join('')}</div></div>`).join('')}</div>`;
    $('#au-rate', root).onclick = e => { const b = e.target.closest('[data-v]'); if (!b) return; setRate(b.dataset.v); root.querySelectorAll('#au-rate button').forEach(x => x.classList.toggle('on', x === b)); };
    $('#au-sleep', root).onchange = e => sleepIn(+e.target.value);
    $('#au-music', root).onclick = () => { Musica.toggle(); renderAudio(root); };
    $('#au-rep', root).onclick = () => playQ(reperesItems(), L('Repères', 'Repères'));
    $('#au-all', root).onclick = () => playQ(caps.flatMap(c => chapterItems(c, 'tesis')), L('Repaso express', 'Révision express'));
    root.querySelectorAll('[data-ch]').forEach(b => b.onclick = () => { const [id, m] = b.dataset.ch.split('|'), c = S.byCap[id]; playQ(chapterItems(c, m), c.titulo + ' · ' + b.textContent.replace(/^\S+\s/, '')); });
  }

  /* ================= arranque de la barra ================= */
  function init() {
    const b = bar(); if (!b) return;
    $('#ab-play', b).onclick = toggleQ; $('#ab-prev', b).onclick = () => skipQ(-1); $('#ab-next', b).onclick = () => skipQ(1); $('#ab-close', b).onclick = () => stopQ();
    $('#ab-rate', b).onchange = e => setRate(e.target.value);
    const mb = $('#btn-music'); if (mb) mb.onclick = () => Musica.toggle(); paintMusicBtn(); paintBar();
    addEventListener('beforeunload', () => supported && speechSynthesis.cancel());
  }

  global.Voz = { supported, say, cancel, hasVoice, warnIfNoVoice, pickVoice, voices: () => voices, playQ, stopQ, fichaItems, chapterItems, sceneAudio, Sfx2, renderAudio, init, Musica, loadVoices, get playing() { return Q.playing; } };
})(window);
