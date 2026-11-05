// Mini servidor SIN dependencias. Sirve la app y guarda el progreso en data/progreso.json.
// No usa ninguna API ni key: todo el contenido ya está generado en data/cours.json.
// Escucha SOLO en 127.0.0.1 (usa  node server.js --lan  para abrirlo al wifi, p.ej. para el celular).
const http = require('http'), fs = require('fs'), path = require('path'), { exec } = require('child_process');
const ROOT = __dirname, DATA = path.join(ROOT, 'data'), PROG = path.join(DATA, 'progreso.json');
const PORT = +process.env.PORT || 3000, HOST = process.argv.includes('--lan') ? '0.0.0.0' : '127.0.0.1';
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.woff2': 'font/woff2', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };
const PUBLIC = [/^\/$/, /^\/index\.html$/, /^\/(css|js|vendor)\//, /^\/data\/(cours\.(json|js))$/];   // el resto (pdf, páginas, .env) NO se sirve

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
  res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
  fs.createReadStream(f).pipe(res);
}).listen(PORT, HOST, () => {
  const u = `http://localhost:${PORT}`; console.log(`PHILO BAC en ${u}  (${HOST})`);
  if (!process.env.NO_OPEN) exec(process.platform === 'win32' ? `start ${u}` : process.platform === 'darwin' ? `open ${u}` : `xdg-open ${u}`, () => {});
});
