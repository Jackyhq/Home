import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const port = Number.parseInt(process.argv[2] ?? '4321', 10);
const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const outputDirectory = process.env.PLAYWRIGHT_DIST_DIR?.trim() || 'dist';
const root = resolve(projectRoot, outputDirectory);
const contentTypes = new Map([
  ['.avif', 'image/avif'],
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.ico', 'image/x-icon'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
  ['.webp', 'image/webp'],
  ['.xml', 'application/xml; charset=utf-8'],
]);

const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname);
    const requestedPath = pathname.endsWith('/') ? `${pathname}index.html` : pathname;
    const filePath = resolve(root, `.${requestedPath}`);

    if (filePath !== root && !filePath.startsWith(`${root}${sep}`)) {
      response.writeHead(403).end('Forbidden');
      return;
    }

    const fileStat = await stat(filePath);
    const finalPath = fileStat.isDirectory() ? resolve(filePath, 'index.html') : filePath;
    const body = await readFile(finalPath);
    response.writeHead(200, {
      'Content-Type': contentTypes.get(extname(finalPath)) ?? 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    response.end(body);
  } catch {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Not found');
  }
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Serving ${outputDirectory} at http://127.0.0.1:${port}`);
});
