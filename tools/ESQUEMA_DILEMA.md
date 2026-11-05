# Dilemas (novelas interactivas estilo "Detroit: Become Human") — `data/dilemas/<id>.json`

Mini-videojuego de **toma de decisiones** en estilo monigotes que encarna una idea filosófica del cours. El jugador ve una escena animada, toma una decisión (opcional: con cronómetro), la historia se ramifica y llega a un **final** (trágico, ambiguo o luminoso) que revela qué autor/idea del cours representa su camino. Debe sentirse dramático, humano y emocionante (conflicto moral real, consecuencias), pero sin violencia gráfica.

**Todo texto visible es bilingüe: `{ "es": "…", "fr": "…" }`** (español natural; francés correcto de nivel lycée). Citas de autores: sólo en francés original, **textuales del PDF** (data/paginas/pNNN.txt; el validador lo comprueba). Contenido filosófico fiel al cours (pp. del capítulo); no inventes tesis de autores.

```json
{
  "id": "liberte-bateau",            // slug
  "capitulo": "liberte",             // id del capítulo
  "titulo": {"es":"…","fr":"…"},
  "premisa": {"es":"2-3 frases que plantean la situación y el dilema","fr":"…"},
  "protagonista": "Alma",            // nombre del personaje principal (monigote)
  "inicio": "n1",
  "nodos": {
    "n1": {
      "escena": { ...guion de escena... },          // 8-14 s, ver abajo
      "narracion": {"es":"1-2 frases de contexto mostradas junto a la escena","fr":"…"},
      "decision": {
        "pregunta": {"es":"¿Qué haces?","fr":"Que fais-tu ?"},
        "tiempo_seg": 12,            // opcional: cronómetro estilo Detroit (si se acaba, se elige la ÚLTIMA opción)
        "opciones": [                // 2 a 4
          {"texto": {"es":"≤ 48 caracteres","fr":"…"}, "a": "n2", "postura": {"es":"Etiqueta corta de la postura filosófica, p. ej. «Deber kantiano»","fr":"…"}}
        ]
      }
    },
    "f1": {
      "escena": { ... },
      "narracion": {"es":"…","fr":"…"},
      "final": {
        "id": "f1", "titulo": {"es":"…","fr":"…"}, "tipo": "tragico|ambiguo|luminoso",
        "idea": {"es":"qué idea filosófica representa este final (2-3 frases)","fr":"…"},
        "filosofo": "sartre",        // id de un filósofo del capítulo
        "cita": {"texto":"cita EXACTA del PDF (francés)","pagina_pdf": 262},   // opcional pero recomendada
        "pagina_pdf": 262,
        "reflexion": {"es":"pregunta final para pensar / enlace con una problématique bac","fr":"…"}
      }
    }
  }
}
```

## Reglas de estructura
- Entre **12 y 20 nodos**: 4-6 decisiones de profundidad, caminos que convergen, **4 o 5 finales distintos** (≥ 2 trágicos, ≥ 1 luminoso o ambiguo). Sin ciclos. Todo nodo no final tiene `decision`; todo final tiene `final`.
- Cada camino debe enseñar algo distinto: las opciones representan posturas filosóficas reales del cours (p. ej. deber vs. consecuencias, obedecer vs. desobedecer), y el final deja ver el costo de esa postura.
- Los finales deben conectar con autores/ideas del capítulo (campo `filosofo`, `idea`, `cita`).

## Guion de escena (cada nodo) — mismo motor que el resto de la app
Léelo en tools/ESQUEMA_CAPITULO.md (sección "Guion de escena": tipos de actor y acciones permitidos, coordenadas 0..1). Diferencias:
- Duración **8-14 s**, 3-7 actores, 5-10 pasos. Usa SIEMPRE un `monigote` para el protagonista (puedes reutilizar id y etiqueta en todos los nodos para continuidad) y otros monigotes/props para el conflicto.
- Los campos de texto (`texto` en dice/piensa/subtitulo/etiqueta, y `etiqueta` de los actores) son **bilingües `{es,fr}`**. `cita` (tarjeta de cita) sólo en francés como string.
- Los finales trágicos deben verse trágicos (p. ej. actor que desaparece, reloj, cadena, nube, rayo, `tiembla`, `desaparece`) y llevar subtítulo final.
- Termina cada escena con un `subtitulo`.

Valida: `node tools/validar-dilema.js data/dilemas/<id>.json` y corrige hasta 0 errores.
