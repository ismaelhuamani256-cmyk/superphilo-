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
| **Disertación** | Planes por sujeto armados solo con autores del cours + el método de la dissertation y de l'explication de texte de tu libro. |
| **Repères** | Glosario de repères y cronología de autores del final del libro, con buscador. |

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
tools/               build.js (ensambla), validar.js (esquema + citas), ESQUEMA_CAPITULO.md
```
Si editas un capítulo a mano: `node tools/validar.js data/capitulos/NN-id.json` y luego `node tools/build.js` (o reinicia `server.js`, que ensambla al arrancar).

## Escenas (cómo funciona)
El motor (`js/scene-model.js`) reproduce guiones JSON con un vocabulario fijo de actores y acciones (ver `tools/ESQUEMA_CAPITULO.md`). Los *skins* (`js/skin-*.js`) solo dibujan el estado; añadir un estilo nuevo = un archivo nuevo que registre `SceneSkins.miestilo`.
