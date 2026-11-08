/* ============================================================
 * i18n.js — traducción de la INTERFAZ (ES → FR) sin tocar el código de cada pantalla.
 * El contenido del cours ya viene traducido (data/fr/*.json); aquí solo se traducen
 * los textos fijos (botones, títulos, etiquetas). Recorre el DOM, guarda el texto
 * original en español y lo sustituye por el francés cuando el idioma activo es 'fr'.
 * Para añadir un texto: agrega  'español': 'français'  al diccionario DIC.
 * ============================================================ */
(function (global) {
  'use strict';
  const DIC = {
    // barra superior y navegación
    'Capítulos': 'Chapitres', 'Audio': 'Audio', 'Música ambiental': 'Musique d’ambiance', 'Música': 'Musique', 'Anterior': 'Précédent', 'Siguiente': 'Suivant', 'Examen': 'Examen', 'Tarjetas': 'Cartes', 'Autores': 'Auteurs', 'Plan': 'Plan', '🧠 Carte mentale': '🧠 Carte mentale', 'Repaso': 'Révisions', 'Disertación': 'Dissertation', 'Dilemas': 'Dilemmes', 'Repères': 'Repères',
    'Volver a los capítulos': 'Retour aux chapitres', 'Ajustes': 'Réglages', 'Tu nivel y XP': 'Ton niveau et tes XP', 'Ruta': 'Chemin',
    'Arrastra para girar · pasa el cursor por un capítulo · clic para entrar': 'Fais glisser pour tourner · survole un chapitre · clique pour entrer',
    'influye': 'influence', 'se opone': 's’oppose', 'complementa': 'complète', '◆ concepto': '◆ concept',
    'Mapa de filósofos y conceptos': 'Carte des philosophes et des concepts', 'Cerrar': 'Fermer', 'Arrastra para cambiar el ancho (doble clic: restablecer)': 'Glisse pour changer la largeur (double-clic : réinitialiser)',
    'Ampliar / reducir': 'Agrandir / réduire',
    // mapa / capítulo
    'Los 5 puntos incontournables': 'Les 5 points incontournables', 'Nociones clave': 'Notions clés', 'Problemáticas tipo bac': 'Problématiques type bac',
    'Quiz del capítulo': 'Quiz du chapitre', 'Dilema 🎮': 'Dilemme 🎮',
    // ficha
    '▶ Ver escena': '▶ Voir la scène', 'Ponme a prueba': 'Teste-moi', 'Tesis principal': 'Thèse principale', 'Ideas clave': 'Idées clés', 'Citas': 'Citations',
    'Debate con': 'En débat avec', 'Cómo usarlo en la disertación': 'Comment l’utiliser en dissertation', 'Concepto': 'Concept', 'Definición': 'Définition',
    'Autores asociados': 'Auteurs associés', 'No está en el cours: el libro no da cita textual de este autor.': 'Absent du cours : le livre ne donne pas de citation textuelle de cet auteur.',
    'nuevo': 'nouveau', 'visto': 'vu', 'practicado': 'pratiqué', 'dominado': 'maîtrisé', 'Página del PDF': 'Page du PDF',
    // escena
    '⏸ Pausa': '⏸ Pause', '▶ Reproducir': '▶ Lire', '↺ Repetir': '↺ Rejouer', 'Línea de tiempo': 'Ligne de temps', 'Velocidad': 'Vitesse', 'Estilo:': 'Style :',
    'Monigotes': 'Bonshommes', 'Cómic': 'BD', 'Próximamente': 'Bientôt',
    // quiz
    'Siguiente →': 'Suivant →', 'Ver resultado': 'Voir le résultat', '¡Correcto!': 'Correct !', 'Ojo:': 'Attention :', 'Otra vez': 'Encore', 'Dominas esto 🔥': 'Tu maîtrises ça 🔥',
    'Vas bien, repasa los fallos': 'Ça va, revois tes erreurs', 'Vuelve a la ficha y reintenta': 'Retourne à la fiche et réessaie', 'Resultado final': 'Résultat final',
    'Pregunta abierta': 'Question ouverte', 'Ver la pauta': 'Voir le barème', 'Una buena respuesta contiene…': 'Une bonne réponse contient…', 'Evaluarme': 'M’évaluer',
    'Nada que repasar': 'Rien à réviser', 'No hay preguntas': 'Aucune question', 'Preguntas abiertas': 'Questions ouvertes', 'Abierta': 'Ouverte', 'Mapa': 'Carte',
    'Escribe tu respuesta (en francés si quieres practicar el bac). Después compárala con la pauta del cours y marca lo que cubriste.': 'Écris ta réponse (en français pour t’entraîner au bac). Compare-la ensuite avec le barème du cours et coche ce que tu as couvert.',
    // repaso
    'Repaso y progreso': 'Révisions et progression', 'dominio global': 'maîtrise globale', 'filósofos dominados': 'philosophes maîtrisés',
    '🎲 Mezcla de todo el cours (15)': '🎲 Mélange de tout le cours (15)', '⬇ Exportar respaldo': '⬇ Exporter la sauvegarde', '⬆ Importar respaldo': '⬆ Importer la sauvegarde',
    'Respaldo exportado': 'Sauvegarde exportée', 'Respaldo importado': 'Sauvegarde importée', 'Archivo no válido': 'Fichier non valide', 'Progreso borrado': 'Progression effacée',
    'Mezcla de todo el cours': 'Mélange de tout le cours', 'Repaso de mis fallos': 'Révision de mes erreurs',
    // disertación
    'Modo disertación': 'Mode dissertation', 'Noción': 'Notion', 'Problemáticas del cours': 'Problématiques du cours', 'Planes de disertación': 'Plans de dissertation', 'Método del libro': 'Méthode du livre',
    'La dissertation': 'La dissertation', 'Ejemplo:': 'Exemple :', 'Problemática:': 'Problématique :', '✓ Plan estudiado': '✓ Plan étudié', 'Marcar como estudiado (+15 XP)': 'Marquer comme étudié (+15 XP)',
    // repères
    'Repères et chronologie': 'Repères et chronologie', 'Glossaire des repères': 'Glossaire des repères', 'Chronologie des auteurs': 'Chronologie des auteurs',
    'Buscar un repère o un autor…': 'Chercher un repère ou un auteur…', 'Auteur': 'Auteur', 'Fechas': 'Dates', 'Época': 'Époque', 'Nota': 'Note',
    // ajustes
    'Idioma': 'Langue', 'Idioma de la interfaz y del cours': 'Langue de l’interface et du cours', 'Estilo de escena por defecto': 'Style de scène par défaut', 'Movimiento y sonido': 'Mouvement et son',
    'Reducir animaciones (menos calor, respeta prefers-reduced-motion)': 'Réduire les animations (moins de chauffe, respecte prefers-reduced-motion)',
    'Sonidos suaves (aciertos / fallos)': 'Sons doux (réussites / erreurs)', 'Cronómetro en los dilemas (estilo Detroit)': 'Chronomètre dans les dilemmes (style Detroit)', 'Datos': 'Données', 'Borrar mi progreso': 'Effacer ma progression',
    // dilemas
    'Dilemas: decide y vive las consecuencias': 'Dilemmes : décide et assume les conséquences', 'Jugar': 'Jouer', 'Seguir': 'Continuer', 'Empezar': 'Commencer', 'Saltar escena': 'Passer la scène', 'Ver escena otra vez': 'Revoir la scène',
    'Mapa de decisiones': 'Carte des décisions', 'Otro camino': 'Un autre chemin', 'finales': 'fins', 'Final': 'Fin', 'Trágico': 'Tragique', 'Ambiguo': 'Ambigu', 'Luminoso': 'Lumineux',
    'Idea filosófica': 'Idée philosophique', 'Para pensar': 'Pour réfléchir', 'Ver al autor en el mapa': 'Voir l’auteur sur la carte', 'Tu elección': 'Ton choix', 'Se acabó el tiempo': 'Temps écoulé',
    'Final sin descubrir': 'Fin non découverte', 'Decisión': 'Décision', 'Capítulo': 'Chapitre', 'Elegiste': 'Tu as choisi',
  };
  // textos con números / variables
  const RX = [
    [/^NOCIÓN (\d+) \/ 17 · pp\. (.+)$/, 'NOTION $1 / 17 · pp. $2'], [/^Noción (\d+) \/ 17$/, 'Notion $1 / 17'], [/^(.*) · dominio (\d+)%$/, '$1 · maîtrise $2%'], [/^dominio (\d+)%$/, 'maîtrise $1%'], [/^sin empezar$/, 'pas commencé'],
    [/^Concepto · (.+)$/, 'Concept · $1'], [/^Quiz \((\d+)\)$/, 'Quiz ($1)'], [/^Filósofos \((\d+)\)$/, 'Philosophes ($1)'], [/^acierto en quizzes \((\d+)\)$/, 'réussite aux quiz ($1)'], [/^Repasar mis fallos \((\d+)\)$/, 'Revoir mes erreurs ($1)'],
    [/^(\d+) filósofos · (\d+) conceptos$/, '$1 philosophes · $2 concepts'], [/^(\d+) XP$/, '$1 XP'], [/^Nv (\d+)$/, 'Niv $1'], [/^\+(\d+) XP · (.+)$/, '+$1 XP · $2'],
    [/^ficha vista$/, 'fiche vue'], [/^escena vista$/, 'scène vue'], [/^plan estudiado$/, 'plan étudié'], [/^respuesta abierta$/, 'réponse ouverte'], [/^¡quiz perfecto!$/, 'quiz parfait !'],
    [/^Plan (.+)$/, 'Plan $1'], [/^Ponme a prueba · (.+)$/, 'Teste-moi · $1'], [/^Quiz · (.+)$/, 'Quiz · $1'], [/^Pregunta abierta · (.+)$/, 'Question ouverte · $1'], [/^Preguntas abiertas · (.+)$/, 'Questions ouvertes · $1'],
    [/^Marcar como estudiado/, 'Marquer comme étudié'], [/^mejor (\d+)%$/, 'meilleur $1%'], [/^Cubriste (\d+)\/(\d+) puntos \((\d+)%\)\./, 'Tu as couvert $1/$2 points ($3%).'],
    [/^Muy sólido\.$/, 'Très solide.'], [/^Buena base: añade los puntos que faltan con su autor\.$/, 'Bonne base : ajoute les points manquants avec leur auteur.'], [/^Relee la ficha de los autores y vuelve a intentarlo\.$/, 'Relis la fiche des auteurs et réessaie.'],
    [/^(\d+) finales$/, '$1 fins'], [/^(\d+)\/(\d+) finales$/, '$1/$2 fins'], [/^Este autor no tiene escena todavía$/, 'Cet auteur n’a pas encore de scène'], [/^¿Borrar todo tu progreso y XP\?$/, 'Effacer toute ta progression et tes XP ?'],
    [/^Tu progreso se guarda en/, 'Ta progression est enregistrée dans'], [/^Resultado: (.+)$/, 'Résultat : $1'], [/^(\d+)\/(\d+) puntos$/, '$1/$2 points'],
  ];
  const ATTRS = ['title', 'placeholder', 'aria-label', 'alt'];
  const orig = new WeakMap(), origAttr = new WeakMap();
  let lang = 'es';

  function tr(s) {
    const t = s.trim(); if (!t) return s;
    let r = DIC[t];
    if (r === undefined) for (const [re, rep] of RX) { if (re.test(t)) { r = t.replace(re, rep); break; } }
    if (r === undefined) return s;
    return s.replace(t, r);
  }
  function node(n) {
    if (n.nodeType === 3) {
      let o = orig.get(n);
      if (o === undefined || (lang === 'es' ? false : n.nodeValue !== o.fr && n.nodeValue !== o.es)) { o = { es: n.nodeValue, fr: null }; orig.set(n, o); }
      if (lang === 'fr') { const f = tr(o.es); o.fr = f; if (n.nodeValue !== f) n.nodeValue = f; }
      else if (n.nodeValue !== o.es) n.nodeValue = o.es;
    } else if (n.nodeType === 1) {
      if (n.tagName === 'SCRIPT' || n.tagName === 'STYLE' || n.tagName === 'CANVAS' || n.tagName === 'SVG' && false) return;
      for (const a of ATTRS) if (n.hasAttribute && n.hasAttribute(a)) {
        let m = origAttr.get(n); if (!m) origAttr.set(n, m = {});
        if (m[a] === undefined || (lang === 'fr' && n.getAttribute(a) !== m[a + '_fr'] && n.getAttribute(a) !== m[a])) m[a] = n.getAttribute(a);
        const v = lang === 'fr' ? tr(m[a]) : m[a]; m[a + '_fr'] = v; if (n.getAttribute(a) !== v) n.setAttribute(a, v);
      }
      n.childNodes.forEach(node);
    }
  }
  let busy = false;
  const obs = new MutationObserver(muts => {
    if (busy || lang === 'es') return; busy = true;
    try { muts.forEach(m => { if (m.type === 'childList') m.addedNodes.forEach(node); else if (m.type === 'characterData') node(m.target); }); } finally { busy = false; }
  });
  function setLang(l) {
    lang = l; busy = true; try { node(document.body); } finally { busy = false; }
    document.documentElement.lang = l;
  }
  function start() { obs.observe(document.body, { childList: true, subtree: true, characterData: true }); }
  global.I18N = { setLang, start, tr, DIC };
})(window);
