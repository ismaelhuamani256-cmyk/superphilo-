#!/usr/bin/env node
// Empaqueta TODA la app en un solo archivo (dist/philo-bac-movil.html): CSS, JS, Three.js, fuentes y el cours
// van incrustados, así abre en el celular desde cualquier gestor de archivos sin depender de carpetas.
// Los audios (.m4a) quedan aparte: pon la carpeta audio/ junto al archivo si quieres que aparezcan los reproductores.
// Uso: node tools/build.js && node tools/empaquetar-movil.js
const fs = require('fs'), path = require('path');
const R = p => path.join(__dirname, '..', p), rd = p => fs.readFileSync(R(p), 'utf8');
let html = rd('index.html');
const b64 = f => 'data:font/woff2;base64,' + fs.readFileSync(R(f)).toString('base64');
let css = rd('css/app.css').replace(/url\(\.\.\/(vendor\/fonts\/[^)]+)\)/g, (_, f) => `url(${b64(f)})`);
html = html.replace(/<link rel="stylesheet" href="css\/app.css">/, () => `<style>\n${css}\n</style>`);
html = html.replace(/<script src="([^"]+)"><\/script>/g, (_, src) => `<script>\n${rd(src).replace(/<\/script/gi, '<\\/script')}\n</script>`);
fs.mkdirSync(R('dist'), { recursive: true }); fs.writeFileSync(R('dist/philo-bac-movil.html'), html);
console.log('dist/philo-bac-movil.html', (html.length / 1e6).toFixed(2), 'MB');

// Variante para publicar como página (Artifact): el servicio añade su propio <html><head><body>, así que se entrega solo título + estilos + contenido.
if (process.argv.includes('--artifact')) {
  const out = process.argv[process.argv.indexOf('--artifact') + 1] || R('dist/philo-bac-artifact.html');
  const styleBlock = html.match(/<style>[\s\S]*?<\/style>/)[0];
  const body = html.match(/<body>([\s\S]*)<\/body>/)[1];
  fs.writeFileSync(out, `<title>PHILO BAC</title>\n${styleBlock}\n${body}`); console.log(out, (fs.statSync(out).size / 1e6).toFixed(2), 'MB');
}
