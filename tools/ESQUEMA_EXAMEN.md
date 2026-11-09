# Ejercicios, sujetos de examen y cartes mentales — `data/ejercicios/<id>.json`

Fuente ÚNICA: data/paginas/pNNN.txt (texto del PDF a 2 columnas; el orden puede salir algo mezclado; los textos de los autores traen números de línea 5, 10, 15… en el margen: **no los copies**). Libro en francés. **Todo texto visible es bilingüe `{ "es": "…", "fr": "…" }`**: el `fr` es el del libro (fiel; puedes condensar corrigés largos, sin inventar), el `es` es tu traducción natural. Los textos de los autores (`texto.fr`) se copian **EXACTOS** del libro (el validador los busca en la página).

## Archivo de un capítulo
```json
{
  "capitulo": "religion",
  "perspectivas": {                          // del MÉMO «En perspectives» (carte mentale) del capítulo
    "autores": ["Durkheim", "Bergson"],      // lista «Auteurs» tal cual
    "nociones_liadas": ["liberté", "justice"],  // lista «Notions liées» tal cual (francés)
    "ramas": [                               // las 3 perspectivas del programa, tal como aparecen numeradas en la página
      { "titulo": {"es":"La existencia humana y la cultura","fr":"L’existence humaine et la culture"},
        "ideas": [ { "texto": {"es":"…","fr":"…"}, "autor": "Freud", "cours": "2. b." } ] },
      { "titulo": {"es":"La moral y la política","fr":"La morale et la politique"}, "ideas": [ … ] },
      { "titulo": {"es":"El conocimiento","fr":"La connaissance"}, "ideas": [ … ] }
    ],
    "pagina_pdf": 63
  },
  "ejercicios": [
    {
      "id": "religion-diss", "tipo": "dissertation",
      "enunciado": {"es":"…","fr":"Le sujet exactement como en el libro"},
      "consigna": {"es":"qué se pide (plan, introducción…)","fr":"…"},
      "corrige": {
        "orientacion": {"es":"consejos previos del corrigé (si los hay)","fr":"…"},
        "introduccion": {"es":"introducción modelo (accroche, définition, problématique, annonce du plan)","fr":"…"},
        "problematica": {"es":"…","fr":"…"},
        "plan": [ { "parte": {"es":"I. …","fr":"I. …"}, "idea": {"es":"…","fr":"…"}, "autores": ["freud"] } ],   // 2-3 partes; autores = slugs del apellido (ids de data/capitulos/NN-id.json cuando existan)
        "conclusion": {"es":"…","fr":"…"},
        "puntos_clave": [ {"es":"criterio de autoevaluación 1","fr":"…"} ]    // 5-8 criterios que una buena respuesta cumple, derivados del corrigé
      },
      "pagina_pdf": 66, "pagina_corrige": 67
    },
    {
      "id": "religion-expl", "tipo": "explication",
      "enunciado": {"es":"consigna","fr":"consigne"},
      "texto": { "fr": "texto del autor COPIADO EXACTO del libro, sin números de línea", "autor": "Freud", "obra": "…", "pagina_pdf": 66 },
      "consigna": {"es":"…","fr":"…"},
      "corrige": {
        "tesis": {"es":"tesis del texto","fr":"…"},
        "etapas": [ { "titulo": {"es":"…","fr":"…"}, "idea": {"es":"…","fr":"…"}, "lineas": "l. 1-5" } ],
        "introduccion": {"es":"…","fr":"…"},
        "enjeu": {"es":"lo que está en juego filosóficamente","fr":"…"},
        "puntos_clave": [ … ]
      },
      "pagina_pdf": 66, "pagina_corrige": 67
    }
  ]
}
```
Incluye **todos** los ejercicios del capítulo con corrigé (normalmente 1 dissertation + 1 explication; si hay más de uno de un tipo, inclúyelos). Si el corrigé es sólo parcial, rellena sólo lo que el libro da (los campos ausentes se omiten; `puntos_clave` siempre).

## Sujetos del examen (pp. 289-311): `data/ejercicios/bac-N.json`
Misma forma con `"capitulo": null` y un solo ejercicio (`id` "bac-N", `tipo` según el sujeto, `notions`: lista de nociones del sujeto) y, si no hay «perspectivas», omite ese campo.

Valida: `node tools/validar-ejercicios.js data/ejercicios/<archivo>.json` hasta 0 errores.
