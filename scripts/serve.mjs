import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(fileURLToPath(new URL('../', import.meta.url)));
const host = '127.0.0.1';
const port = Number(process.env.PORT || 8000);
const mimeTypes = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
]);

const server = createServer(async (request, response) => {
  try {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      response.writeHead(405, { Allow: 'GET, HEAD' }).end('Method not allowed');
      return;
    }

    const pathname = decodeURIComponent(new URL(request.url, `http://${host}`).pathname);
    const targetPath = resolve(projectRoot, pathname.replace(/^[/\\]+/, ''));
    const relativePath = relative(projectRoot, targetPath);
    if (isAbsolute(relativePath) || relativePath === '..' || relativePath.startsWith(`..${sep}`)) {
      response.writeHead(403).end('Forbidden');
      return;
    }

    const fileInfo = await stat(targetPath);
    const filePath = fileInfo.isDirectory() ? resolve(targetPath, 'index.html') : targetPath;
    const body = await readFile(filePath);
    response.writeHead(200, {
      'Cache-Control': 'no-store',
      'Content-Length': body.length,
      'Content-Type': mimeTypes.get(extname(filePath)) || 'application/octet-stream',
    });
    response.end(request.method === 'HEAD' ? undefined : body);
  } catch {
    response.writeHead(404).end('Not found');
  }
});

server.listen(port, host, () => {
  console.log(`AI 机械臂模拟器已启动：http://${host}:${port}/`);
});
