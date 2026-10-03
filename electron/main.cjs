const { app, BrowserWindow, dialog, Menu, protocol } = require('electron');
const { readFile, stat } = require('node:fs/promises');
const { extname, isAbsolute, relative, resolve, sep } = require('node:path');

const APP_SCHEME = 'robotarm';
const APP_HOST = 'app';
const APP_ORIGIN = `${APP_SCHEME}://${APP_HOST}/`;
const THREE_CDN_ROOT = 'https://cdn.jsdelivr.net/npm/three@0.186.0';
const THREE_EXAMPLES_PREFIX = '/node_modules/three/examples/jsm/';
const MIME_TYPES = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.map', 'application/json; charset=utf-8'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
  ['.woff', 'font/woff'],
  ['.woff2', 'font/woff2'],
]);

protocol.registerSchemesAsPrivileged([{
  scheme: APP_SCHEME,
  privileges: {
    standard: true,
    secure: true,
    supportFetchAPI: true,
    corsEnabled: true,
  },
}]);

function createNotFound() {
  return new Response('Not found', { status: 404 });
}

function registerAppProtocol() {
  const root = app.getAppPath();
  const examplesRoot = app.isPackaged
    ? resolve(process.resourcesPath, 'three-examples')
    : resolve(root, 'node_modules/three/examples/jsm');

  protocol.handle(APP_SCHEME, async (request) => {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response('Method not allowed', {
        status: 405,
        headers: { Allow: 'GET, HEAD' },
      });
    }

    let url;
    let pathname;
    try {
      url = new URL(request.url);
      pathname = decodeURIComponent(url.pathname);
    } catch {
      return new Response('Bad request', { status: 400 });
    }
    if (url.hostname !== APP_HOST) return createNotFound();

    const servingExamples = pathname.startsWith(THREE_EXAMPLES_PREFIX);
    const servingRoot = servingExamples ? examplesRoot : root;
    const requestedPath = servingExamples
      ? pathname.slice(THREE_EXAMPLES_PREFIX.length)
      : pathname.replace(/^[/\\]+/, '');
    const targetPath = resolve(servingRoot, requestedPath || 'index.html');
    const relativePath = relative(servingRoot, targetPath);
    if (isAbsolute(relativePath) || relativePath === '..' || relativePath.startsWith(`..${sep}`)) {
      return new Response('Forbidden', { status: 403 });
    }

    try {
      const info = await stat(targetPath);
      const filePath = info.isDirectory() ? resolve(targetPath, 'index.html') : targetPath;
      const fileInfo = await stat(filePath);
      if (!fileInfo.isFile()) return createNotFound();

      let body = await readFile(filePath);
      if (!servingExamples && filePath === resolve(root, 'index.html')) {
        body = Buffer.from(body.toString('utf8').replaceAll(THREE_CDN_ROOT, './node_modules/three'));
      }
      return new Response(request.method === 'HEAD' ? null : body, {
        status: 200,
        headers: {
          'Cache-Control': 'no-store',
          'Content-Type': MIME_TYPES.get(extname(filePath)) || 'application/octet-stream',
          'X-Content-Type-Options': 'nosniff',
        },
      });
    } catch (error) {
      console.error(`Unable to serve app resource ${pathname}:`, error);
      return createNotFound();
    }
  });
}

async function createWindow() {
  const window = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 960,
    minHeight: 640,
    backgroundColor: '#0b1220',
    autoHideMenuBar: true,
    webPreferences: {
      preload: resolve(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith(APP_ORIGIN)) event.preventDefault();
  });
  await window.loadURL(`${APP_ORIGIN}index.html`);
  return window;
}

app.whenReady().then(async () => {
  try {
    Menu.setApplicationMenu(null);
    registerAppProtocol();
    await createWindow();
  } catch (error) {
    console.error('Failed to start Robot Arm Simulator:', error);
    dialog.showErrorBox('启动失败', `机械臂模拟器无法启动。\n\n${error.message}`);
    app.quit();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', async () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    try {
      await createWindow();
    } catch (error) {
      console.error('Failed to reopen the application window:', error);
    }
  }
});
