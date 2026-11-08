/* ============================================================
 * state.js — datos del cours, ajustes y progreso (XP, dominio)
 * El progreso se guarda en data/progreso.json (vía server.js) y,
 * como respaldo / si abres index.html sin servidor, en localStorage.
 * ============================================================ */
(function (global) {
  'use strict';
  const LS = 'philo-bac-progreso-v1';
  const ES = global.COURS || { capitulos: [], extras: {} };
  const FR = global.COURS_FR || null;     // versión francesa completa (si existe)
  const index = d => Object.fromEntries(d.capitulos.map(c => [c.id, c]));
  const IDX = { es: index(ES), fr: FR ? index(FR) : null };
  const DILEMAS = global.DILEMAS || [];

  const defaults = () => ({
    version: 1, xp: 0,
    ajustes: { lang: 'es', idioma: 'bilingue', cronometro: true, narrar: true, sfxEscena: true, vozRate: 1, musica: false, musicaVol: 0.5, vozEs: '', vozFr: '', tarjetasVoz: false, estilo: 'monigotes', reducirMov: matchMedia('(prefers-reduced-motion: reduce)').matches, sonido: false },
    fil: {},      // "cap/fil" -> {visto, escena, intentos, aciertos, xp}
    cap: {},      // cap -> {quizIntentos, quizAciertos, mejor}
    abiertas: {}, // "cap#i" -> {veces, mejor}
    disert: {},   // "cap#i" -> true (plan estudiado)
    dificiles: {},// "cap#i" -> fallos acumulados (repaso espaciado ligero)
    dilemas: {},  // id -> {finales:{}, visitados:{}, aristas:{}, jugadas}
    cards: {},    // tarjetas SRS: id -> {ef, int, rep, due}
    escritos: {}, // borradores del simulacro / entrenadores: id -> {texto, ts}
    simulacro: null, simulacros: [], // examen en curso e historial
    plan: null,   // {fecha, minutos, hecho:{}}
    hist: [],     // registro de actividad [{t, k, cap, ok}] (últimos 600)
  });
  let P = defaults(), saveTimer = 0, useServer = false;
  const listeners = new Set();

  function merge(a, b) { for (const k in b) { if (b[k] && typeof b[k] === 'object' && !Array.isArray(b[k]) && a[k] && typeof a[k] === 'object') merge(a[k], b[k]); else a[k] = b[k]; } return a; }

  async function load() {
    let loaded = null;
    try { const r = await fetch('/api/progreso', { cache: 'no-store' }); if (r.ok) { useServer = true; loaded = await r.json(); } } catch (e) { /* sin servidor */ }
    if (!loaded) { try { loaded = JSON.parse(localStorage.getItem(LS) || 'null'); } catch (e) {} }
    if (loaded) P = merge(defaults(), loaded);
    emit();
  }
  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      const s = JSON.stringify(P);
      try { localStorage.setItem(LS, s); } catch (e) {}
      if (useServer) fetch('/api/progreso', { method: 'POST', body: s }).catch(() => {});
    }, 250);
  }
  function emit() { listeners.forEach(f => f(P)); }
  const on = f => { listeners.add(f); return () => listeners.delete(f); };

  /* ---------- XP y niveles ---------- */
  const level = xp => Math.floor(Math.sqrt(xp / 40)) + 1;
  const levelBase = l => (l - 1) * (l - 1) * 40;
  function addXP(n, motivo) { P.xp += n; save(); emit(); if (motivo) global.toast && global.toast('+' + n + ' XP · ' + motivo); }

  /* ---------- progreso por filósofo ---------- */
  const key = (cap, fil) => cap + '/' + fil;
  function F(cap, fil) { return P.fil[key(cap, fil)] || (P.fil[key(cap, fil)] = { visto: false, escena: false, intentos: 0, aciertos: 0, xp: 0 }); }
  function markVisto(cap, fil) { const f = F(cap, fil); if (!f.visto) { f.visto = true; addXP(5, 'ficha vista'); } save(); emit(); }
  function markEscena(cap, fil) { const f = F(cap, fil); if (!f.escena) { f.escena = true; addXP(10, 'escena vista'); } save(); emit(); }
  function log(k, cap, ok) { P.hist.push({ t: Date.now(), k, cap: cap || null, ok: ok === undefined ? null : !!ok }); if (P.hist.length > 600) P.hist.splice(0, P.hist.length - 600); }
  function markRespuesta(cap, fil, ok) { log('q', cap, ok); if (!fil) { save(); return; } const f = F(cap, fil); f.intentos++; if (ok) f.aciertos++; save(); emit(); }

  /** Dominio 0..100 de un filósofo: visto 15 + escena 15 + precisión de quiz hasta 70 (necesita ≥3 intentos para el máximo). */
  function mastery(cap, fil) {
    const f = P.fil[key(cap, fil)]; if (!f) return 0;
    let m = (f.visto ? 15 : 0) + (f.escena ? 15 : 0);
    if (f.intentos) m += 70 * (f.aciertos / f.intentos) * Math.min(1, f.intentos / 3);
    return Math.round(m);
  }
  const estado = m => m >= 80 ? 'dominado' : m >= 35 ? 'practicado' : m > 0 ? 'visto' : 'nuevo';
  function chapterMastery(cap) {
    const c = IDX.es[cap]; if (!c || !c.filosofos.length) return 0;
    return Math.round(c.filosofos.reduce((s, f) => s + mastery(cap, f.id), 0) / c.filosofos.length);
  }
  function globalMastery() { const cs = ES.capitulos; return cs.length ? Math.round(cs.reduce((s, c) => s + chapterMastery(c.id), 0) / cs.length) : 0; }

  function setAjuste(k, v) { P.ajustes[k] = v; save(); emit(); }
  function exportar() { return JSON.stringify(P, null, 2); }
  function importar(txt) { const o = JSON.parse(txt); if (typeof o !== 'object' || o.xp === undefined) throw new Error('Archivo no válido'); P = merge(defaults(), o); save(); emit(); }
  function reset() { P = defaults(); save(); emit(); }

  /* ---------- idioma de la interfaz y del contenido ---------- */
  const lang = () => (P.ajustes.lang === 'fr' && FR ? 'fr' : 'es');
  const tx = v => (v && typeof v === 'object' && !Array.isArray(v)) ? (v[lang()] || v.es || '') : v;   // {es,fr} -> texto
  global.L = (es, fr) => lang() === 'fr' ? fr : es;
  global.tx = tx;

  global.State = {
    get COURS() { return lang() === 'fr' ? FR : ES; }, get byCap() { return IDX[lang()]; }, ES, DILEMAS, EJERCICIOS: global.EJERCICIOS || [], hasFR: !!FR, get lang() { return lang(); }, tx, load, save, on, emit, addXP, log, level, levelBase, markVisto, markEscena, markRespuesta, mastery, estado,
    chapterMastery, globalMastery, setAjuste, exportar, importar, reset,
    get P() { return P; }, get useServer() { return useServer; },
  };
})(window);
