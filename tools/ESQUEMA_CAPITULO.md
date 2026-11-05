# Esquema de un capítulo (`data/capitulos/NN-id.json`)

Fuente ÚNICA: el texto del PDF en `data/paginas/pNNN.txt` (una página del PDF por archivo; `pagina_pdf` = número NNN de esos archivos; página del libro = pagina_pdf − 1).
El libro está en **francés**. Las citas y los términos clave van en francés (idioma original). Explicaciones, resúmenes y subtítulos de escenas van en **español**.
**Fidelidad ante todo:** no inventes filósofos, ideas ni citas que no estén en tu rango de páginas. Una cita sólo se incluye si aparece textualmente en el PDF (copia exacta, el validador lo comprueba contra la página indicada ±1). Si el cours no da cita textual de un autor, deja `"citas": []`.

```json
{
  "id": "religion",                     // slug del nombre de la nociόn, sin tildes
  "numero": 8,
  "titulo": "La religion",
  "titulo_es": "La religión",
  "resumen": "3-4 líneas en español",
  "paginas": { "inicio": 140, "fin": 153 },   // páginas PDF del capítulo
  "puntos_incontournables": ["los 5 puntos del libro, en español (+ término francés entre paréntesis si ayuda)"],
  "nociones_clave": ["términos en francés"],
  "problematicas_bac": ["Une religion est-elle nécessaire ?", "..."],   // sólo las que aparecen en el libro (exercices, 'En perspectives', corrigés). Mínimo 3 si existen.
  "conceptos": [                         // 4-8 conceptos/ideas centrales sin autor único (nodos "concepto" del mapa)
    { "id": "fait-social", "nombre": "Fait social universel", "definicion": "español, 1-2 frases", "pagina_pdf": 141, "autores": ["durkheim"] }
  ],
  "filosofos": [                         // TODOS los autores con peso en el capítulo (mín 3, típico 5-9). id = slug del apellido
    {
      "id": "feuerbach",
      "nombre": "Ludwig Feuerbach",
      "epoca": "siglo XIX",              // si el libro no la da, usa tu conocimiento mínimo (siglo) — es metadato
      "tesis_principal": "1-2 frases en español",
      "ideas_clave": ["3-5 ideas cortas en español, con el término francés clave entre paréntesis"],
      "citas": [{ "texto": "cita EXACTA del PDF", "idioma": "fr", "obra": "obra si el libro la menciona", "pagina_pdf": 145 }],
      "debate_con": ["marx", "pascal"],  // ids de filósofos DEL MISMO capítulo (si no, omítelos)
      "como_usarlo_en_disertacion": "español: en qué tipo de sujeto/parte del plan y cómo (2-3 frases)",
      "escena_sugerida": "descripción corta",
      "pagina_pdf": 145,                 // página principal donde se trata
      "escena": { ...GUION DE ESCENA, ver abajo... }
    }
  ],
  "relaciones": [                        // 5-12 relaciones entre ids (filósofos o conceptos) del capítulo
    { "de": "feuerbach", "a": "marx", "tipo": "influye|se opone|complementa", "nota": "español, 1 frase" }
  ],
  "quiz": [                              // 10-14 preguntas de opción múltiple. Reutiliza los "10 QCM" del libro (usa sus corrigés) y completa con preguntas propias SÓLO si el contenido está en el cours
    { "pregunta": "en francés o español (como en el libro)", "opciones": ["a","b","c","d"], "correcta": 2, "explicacion": "español, 1-2 frases, citando el cours", "filosofo": "feuerbach|null", "pagina_pdf": 149 }
  ],
  "preguntas_abiertas": [                // 3-4 preguntas de respuesta abierta (autoevaluación con pauta)
    { "enunciado": "en francés", "puntos_clave": ["4-6 elementos que una buena respuesta debe contener, en español, con autores del cours"], "filosofos": ["id"], "pagina_pdf": 150 }
  ],
  "disertaciones": [                     // 2-3 sujetos tipo bac (usa los del libro si los hay) con plan armado SOLO con autores del cours
    { "sujeto": "Une religion est-elle nécessaire ?", "tipo_plan": "dialectique|progressif|thématique",
      "problematica": "español, 2-3 frases",
      "plan": [ { "parte": "I. ...", "idea": "español", "autores": ["id"], "ejemplo": "ejemplo del cours" } ],
      "pagina_pdf": 150 }
  ]
}
```

## Guion de escena (campo `escena` de cada filósofo)

Lo reproduce un motor fijo. Usa SÓLO este vocabulario (nada más). Coordenadas normalizadas `[x, y]` con 0..1 (x izq→der, y arriba→abajo). Escena de **20-28 s**, 6-12 actores como máximo, 10-18 pasos. Cuenta una idea concreta del filósofo con una mini-historia visual clara (conflicto → insight), no una lista de conceptos.

```json
{
  "titulo": "Feuerbach : Dieu comme projection de l'homme",
  "estilo": "monigotes",
  "duracion_seg": 25,
  "actores": [ { "id": "humano", "tipo": "monigote", "pos": [0.3, 0.7], "etiqueta": "L'homme", "escala": 1 } ],
  "pasos": [ { "t": 0, "accion": "aparece", "actor": "humano" } ]
}
```

**tipos de actor permitidos:** `monigote` (persona palitos), `silueta_grande` (figura enorme, p. ej. Dios/Estado/sociedad), `libro`, `sol`, `arbol`, `reloj`, `cadena`, `martillo`, `balanza`, `corazon`, `cerebro`, `nube`, `casa`, `piedra`, `espejo`, `puerta`, `caja`, `estrella`, `corona`, `bandera`, `moneda`, `engranaje`, `fuego`, `ojo`, `interrogacion`, `bombilla`, `rayo`, `flor`, `texto` (sólo una etiqueta grande).
`etiqueta` (opcional): nombre corto bajo el actor. `escala` (opcional, 0.5-2).

**acciones permitidas** (todas con `t` en segundos, crecientes):
| accion | campos |
|---|---|
| `aparece` | `actor` |
| `desaparece` | `actor` |
| `mueve` | `actor`, `a:[x,y]`, `dur` (seg, opcional) |
| `dice` | `actor`, `texto` (≤ 60 caracteres, español) |
| `piensa` | `actor`, `texto` (≤ 60 car.) |
| `proyecta` | `de`, `a`, `nota` (opcional) — flujo de partículas de un actor a otro |
| `une` | `de`, `a`, `nota` (opcional) — línea que queda dibujada |
| `resalta` | `actor` |
| `tiembla` | `actor` |
| `salta` | `actor` |
| `etiqueta` | `actor`, `texto` — cambia la etiqueta |
| `cita` | `texto` — tarjeta con la cita en idioma original (≤ 140 car., debe ser la cita real del filósofo o un fragmento) |
| `subtitulo` | `texto` — narración en español (≤ 110 caracteres); pon uno cada 4-6 s |

Cada actor mencionado en un paso debe existir en `actores` y haber `aparecido` antes de usarse.
Termina siempre con un `subtitulo` que resuma la idea.

## Archivo de salida
Escribe `data/capitulos/NN-id.json` (NN con 2 dígitos). Valida con:
`node tools/validar.js data/capitulos/NN-id.json` y corrige hasta que no haya errores.
