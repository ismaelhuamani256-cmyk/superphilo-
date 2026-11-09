# PHILO BAC — tu cours de filosofía, interactivo y 100 % local

App web para estudiar el bac de filosofía a partir de **tu libro** (`665730429-ABC-Philo.pdf`, 321 págs., francés).
No usa API key ni nube: el contenido (17 nociones, 155 autores, escenas, quizzes) ya está generado en `data/` y tu progreso se guarda en tu laptop.

## Cómo abrirla (3 pasos)
1. Instala **Node.js** (LTS) desde <https://nodejs.org> (una sola vez).
2. Descarga/copia esta carpeta a tu laptop.
3. Doble clic en **`iniciar.bat`** (Windows) o **`iniciar.command`** (Mac). Se abre `http://localhost:3000`.

Alternativa por terminal: `node server.js`  (opcional: `--lan` para abrirla desde el celular en el mismo wifi, `PORT=4000` para cambiar el puerto).
Sin Node también funciona: abre `index.html` con doble clic (el progreso se guarda entonces en el navegador, no en `data/progreso.json`).

## Qué hay
| Pantalla | Qué hace |
|---|---|
| **Capítulos** | Las 17 nociones como monolitos 3D (Three.js): arrastra para girar, parallax con el mouse, hover = brillan, clic = la cámara vuela hacia el capítulo. |
| **Mapa** | Filósofos (círculos) y conceptos (rombos); líneas de colores según relación (*influye / se opone / complementa*) que se dibujan animadas. El aro de cada nodo se llena según tu dominio. |
| **Ficha** | Tesis, ideas clave, citas **literales con página del PDF**, con quién debate, cómo usarlo en la disertación. Botones **▶ Ver escena** y **Ponme a prueba**. |
| **Escenas** | 155 mini-películas (una por autor) generadas por un motor fijo a partir de guiones JSON. Estilos: Monigotes (cuaderno), Cómic, Lego y PS2. |
| **Repaso** | Quiz de opción múltiple (los QCM de tu libro + extras), preguntas abiertas con autoevaluación guiada por pauta, "repasar mis fallos", XP, niveles y estados *visto → practicado → dominado*. Exportar / importar respaldo. |
| **Examen** | Simulacro con cronómetro (4 h / 2 h / 1 h / 30 min: 2 disertaciones + 1 explicación al azar, editor con autoguardado y corrección guiada con el corrigé del libro), **explicación de texto guiada** (subrayar, tesis → movimientos → enjeu), **entrenador de planes** (ordenar partes y atribuir autores), y los **3 sujetos del bac + ejercicios de cada capítulo** con corrigé. |
| **Tarjetas** | Repetición espaciada (SM-2): autor → tesis, cita → autor, concepto → definición, repères. Atajos: Espacio para voltear, 1-4 para calificar. |
| **Autores** | Índice transversal: cada autor con todo lo que dice en todas las nociones (tesis, ideas, citas), para reciclarlo en cualquier sujeto. |
| **Plan** | Dices la fecha del examen y los minutos por día: reparte los 17 capítulos (empezando por los más flojos), práctica y simulacros; + estadísticas (racha, acierto, dominio por noción, autores más flojos). |
| **Audio** | Las **escenas y dilemas tienen sonido**: la voz lee los subtítulos y las citas (en francés) y hay efectos al aparecer, hablar, proyectar, etc. (botón 🔊 para silenciar). Además: botón 🔊 en cada ficha, 🎧 por capítulo, **modo podcast** (capítulo completo, tesis, citas, conceptos, planes, repères) con ⏮ ⏯ ⏭, velocidad y temporizador, lectura de tarjetas y del texto de la explicación, y música ambiental opcional. Usa las voces de tu navegador/sistema (sin API); elige la voz en Ajustes. |
| **Dilemas** | 10 mini-videojuegos de decisiones estilo *Detroit: Become Human* en monigotes: eliges, la historia se ramifica (con cronómetro opcional) y llegas a finales trágicos, ambiguos o luminosos que revelan la idea y el autor del cours. Incluye el mapa de decisiones (flowchart) con los finales que has descubierto. |
| **Disertación** | Planes por sujeto armados solo con autores del cours + el método de la dissertation y de l'explication de texte de tu libro. |
| **Repères** | Glosario de repères y cronología de autores del final del libro, con buscador. |

## En el celular
- **Lo más fácil:** descarga **`dist/philo-bac-movil.html`** (un solo archivo, ~4 MB, con todo incrustado) y ábrelo con Chrome (Android: Archivos → tocar el archivo → abrir con Chrome). El progreso se guarda en el navegador del celular. Si lo abres desde un ZIP o una vista previa del gestor de archivos, **primero extrae/copia el archivo** a Descargas.
- **Con la laptop (wifi de casa):** `node server.js --lan` y abre `http://IP-de-la-laptop:3000` en el celular; el progreso se guarda en la laptop.
- En pantallas chicas el menú está abajo (desliza para ver todas las pestañas); el resumen del capítulo se abre con el botón ℹ del mapa; en el mapa se puede hacer zoom con dos dedos.
- Tras cambiar algo del contenido: `node tools/build.js && node tools/empaquetar-movil.js` regenera el archivo único.

## Audios para el celular (segundo plano, sin internet)
La carpeta `audio/` trae **70 audios .m4a (9 h, ~100 MB)** generados con voz neuronal local (Piper): por noción, el *capítulo completo* (~10-16 min) y las *tesis de los autores* (~2-3 min), en **español y francés**, más los *repères*. Las citas se leen con la voz francesa. Pasan al celular copiando la carpeta (cable / Drive / WhatsApp), descargándolos desde la pestaña **Audio** (`node server.js --lan` y abrir `http://IP-de-la-laptop:3000` desde el celular en el mismo wifi) o desde GitHub; una vez en el celular suenan con la pantalla bloqueada y sin conexión. Se regeneran con `tools/generar-audios.py` (instrucciones dentro del archivo).

## Idioma ES / FR
El botón **ES | FR** de la barra superior cambia la interfaz **y todo el contenido** (resúmenes, fichas, escenas, quizzes, disertaciones, repères, dilemas). Citas y términos clave siempre van en francés (idioma original del libro). La versión francesa vive en `data/fr/` (se genera con `tools/fr-extract.js` + `tools/fr-merge.js`).

## Barras laterales
La barra del capítulo (izquierda) y la ficha (derecha) se **arrastran por su borde** para cambiar el ancho (doble clic = restablecer; el ancho se recuerda). La ficha tiene además un botón ⤢ para ampliarla.

## Fidelidad al cours
- Todo sale de las páginas de tu PDF; cada dato lleva su `pagina_pdf` (la página del libro = página PDF − 1).
- Las citas se verifican automáticamente contra el texto del PDF (`node tools/validar.js data/capitulos/*.json`). Algunas citas largas van partidas con `[…]` porque el PDF tiene dos columnas.
- Si el libro no da una cita textual de un autor, la ficha dice "No está en el cours".
- Cuando una pregunta del libro aceptaba varias respuestas, se reformuló para dejar una sola correcta; y se añadió una 4.ª opción a los QCM de 3 opciones. Los sujetos de disertación que no son del libro están marcados en el plan como derivados del cours.

## Estructura
```
index.html  css/  js/  vendor/(three.js + fuentes locales)
server.js            servidor sin dependencias (solo 127.0.0.1) + guarda data/progreso.json
data/cours.json|js   contenido ensamblado (lo lee la app)
data/capitulos/      un JSON por noción (editable a mano)
data/extras.json     método, repères, cronología
data/fr/             versión francesa de todo lo anterior
data/dilemas/        novelas interactivas (esquema en tools/ESQUEMA_DILEMA.md)
data/ejercicios/     ejercicios con corrigé, sujetos del bac y cartes mentales (tools/ESQUEMA_EXAMEN.md)
tools/               build.js (ensambla), validar.js (esquema + citas), ESQUEMA_CAPITULO.md
```
Si editas un capítulo a mano: `node tools/validar.js data/capitulos/NN-id.json` y luego `node tools/build.js` (o reinicia `server.js`, que ensambla al arrancar).

## Escenas (cómo funciona)
El motor (`js/scene-model.js`) reproduce guiones JSON con un vocabulario fijo de actores y acciones (ver `tools/ESQUEMA_CAPITULO.md`). Los *skins* (`js/skin-*.js`) solo dibujan el estado; añadir un estilo nuevo = un archivo nuevo que registre `SceneSkins.miestilo`.
