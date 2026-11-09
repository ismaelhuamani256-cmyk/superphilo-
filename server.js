// Mini servidor SIN dependencias. Sirve la app y guarda el progreso en data/progreso.json.
// No usa ninguna API ni key: todo el contenido ya está generado en data/cours.json.
// Escucha SOLO en 127.0.0.1 (usa  node server.js --lan  para abrirlo al wifi, p.ej. para el celular).
const http = require('http'), fs = require('fs'), path = require('path'), { exec } = require('child_process');
const ROOT = __dirname, DATA = path.join(ROOT, 'data'), PROG = path.join(DATA, 'progreso.json');
const PORT = +process.env.PORT || 3000, HOST = process.argv.includes('--lan') ? '0.0.0.0' : '127.0.0.1';
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.woff2': 'font/woff2', '.png': 'image/png', '.m4a': 'audio/mp4', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };
const PUBLIC = [/^\/audio\/.+\.(m4a|json)$/, /^\/$/, /^\/index\.html$/, /^\/(css|js|vendor)\//, /^\/data\/(cours\.(json|js))$/];   // el resto (pdf, páginas, .env) NO se sirve

try { require('./tools/build.js'); } catch (e) { console.warn('build:', e.message); }

http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  if (url === '/api/progreso') {
    if (req.method === 'GET') { res.writeHead(200, { 'Content-Type': MIME['.json'] }); return res.end(fs.existsSync(PROG) ? fs.readFileSync(PROG) : 'null'); }
    if (req.method === 'POST') {
      let b = ''; req.on('data', c => { b += c; if (b.length > 5e6) req.destroy(); });
      req.on('end', () => { try { JSON.parse(b); fs.writeFileSync(PROG, b); res.writeHead(200); res.end('ok'); } catch { res.writeHead(400); res.end('json inválido'); } });
      return;
    }
  }
  const p = url === '/' ? '/index.html' : url;
  if (!PUBLIC.some(r => r.test(p))) { res.writeHead(404); return res.end('no encontrado'); }
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end('no encontrado'); }
  const type = MIME[path.extname(f)] || 'application/octet-stream', size = fs.statSync(f).size, m = /bytes=(\d*)-(\d*)/.exec(req.headers.range || '');
  if (m && path.extname(f) === '.m4a') {                      // Range: el celular necesita poder saltar y reanudar el audio
    const a = m[1] ? +m[1] : 0, b = m[2] ? Math.min(+m[2], size - 1) : size - 1;
    res.writeHead(206, { 'Content-Type': type, 'Content-Range': `bytes ${a}-${b}/${size}`, 'Accept-Ranges': 'bytes', 'Content-Length': b - a + 1 }); return fs.createReadStream(f, { start: a, end: b }).pipe(res);
  }
  res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-cache', 'Accept-Ranges': 'bytes', 'Content-Length': size });
  fs.createReadStream(f).pipe(res);
}).listen(PORT, HOST, () => {
  const u = `http://localhost:${PORT}`; console.log(`PHILO BAC en ${u}  (${HOST})`);
  if (!process.env.NO_OPEN) exec(process.platform === 'win32' ? `start ${u}` : process.platform === 'darwin' ? `open ${u}` : `xdg-open ${u}`, () => {});
});
