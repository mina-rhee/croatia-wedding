const fs = require('fs');
const http = require('http');
const path = require('path');

const root = path.resolve(__dirname, '..');
const host = process.env.HOST || '127.0.0.1';
const port = Number(process.env.PORT || 3000);
const clients = new Set();
let reloadTimer = null;

const liveReloadScript = `
<script>
  (() => {
    const source = new EventSource('/__live-reload');
    source.addEventListener('reload', () => window.location.reload());
  })();
</script>`;

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
};

function sendReload() {
  clearTimeout(reloadTimer);
  reloadTimer = setTimeout(() => {
    for (const res of clients) {
      res.write('event: reload\ndata: now\n\n');
    }
  }, 100);
}

function watch(target) {
  const fullPath = path.join(root, target);
  if (!fs.existsSync(fullPath)) return;

  fs.watch(fullPath, { recursive: true }, (eventType, filename) => {
    if (!filename) return;
    sendReload();
  });
}

function resolveRequestPath(urlPath) {
  const cleanPath = decodeURIComponent(urlPath.split('?')[0]);
  const requestedPath = cleanPath === '/' ? '/index.html' : cleanPath;
  const filePath = path.normalize(path.join(root, requestedPath));

  if (!filePath.startsWith(root)) return null;
  return filePath;
}

const server = http.createServer((req, res) => {
  if (req.url === '/__live-reload') {
    res.writeHead(200, {
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Content-Type': 'text/event-stream',
    });
    res.write('\n');
    clients.add(res);
    req.on('close', () => clients.delete(res));
    return;
  }

  const filePath = resolveRequestPath(req.url || '/');
  if (!filePath) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  const ext = path.extname(filePath);
  fs.readFile(filePath, ext === '.html' ? 'utf8' : null, (err, file) => {
    if (err) {
      res.writeHead(err.code === 'ENOENT' ? 404 : 500);
      res.end(err.code === 'ENOENT' ? 'Not found' : 'Server error');
      return;
    }

    res.setHeader('Content-Type', contentTypes[ext] || 'application/octet-stream');
    res.setHeader('Cache-Control', 'no-store');

    if (ext === '.html') {
      res.end(file.replace('</body>', `${liveReloadScript}\n</body>`));
      return;
    }

    res.end(file);
  });
});

['index.html', 'css', 'js', 'assets'].forEach(watch);

server.listen(port, host, () => {
  console.log(`Local server running at http://${host}:${port}`);
  console.log('Watching for changes...');
});
