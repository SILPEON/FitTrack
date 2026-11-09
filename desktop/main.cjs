// FitTrack desktop: the same web app, served from inside the program.
const { app, BrowserWindow, protocol, net, session, shell } = require('electron');
const path = require('path');
const { pathToFileURL } = require('url');

const ROOT = path.join(__dirname, 'app');

// A fixed origin (app://fittrack) so the database always lives in the same place.
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true } },
]);

if (!app.requestSingleInstanceLock()) app.quit();

let win;
function createWindow() {
  win = new BrowserWindow({
    width: 480, height: 900, minWidth: 360, minHeight: 600,
    title: 'FitTrack', backgroundColor: '#000000', autoHideMenuBar: true,
    icon: path.join(__dirname, 'app', 'icon-512.png'),
    webPreferences: { contextIsolation: true, sandbox: true },
  });
  win.loadURL('app://fittrack/index.html');
  // Links that leave the app open in the normal browser.
  win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (e, url) => { if (!url.startsWith('app://')) { e.preventDefault(); shell.openExternal(url); } });
}

app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });

app.whenReady().then(() => {
  protocol.handle('app', (req) => {
    const { pathname } = new URL(req.url);
    const file = path.normalize(path.join(ROOT, decodeURIComponent(pathname)));
    if (!file.startsWith(ROOT)) return new Response('Not found', { status: 404 });
    return net.fetch(pathToFileURL(file).toString());
  });

  // Camera (barcode scanner, progress photos) and location are allowed; everything else is denied.
  const allowed = new Set(['media', 'geolocation', 'fullscreen', 'clipboard-sanitized-write', 'persistent-storage']);
  session.defaultSession.setPermissionRequestHandler((_wc, perm, cb) => cb(allowed.has(perm)));
  session.defaultSession.setPermissionCheckHandler((_wc, perm) => allowed.has(perm));

  // OpenStreetMap's tile policy requires a referer; send the app's public address.
  session.defaultSession.webRequest.onBeforeSendHeaders({ urls: ['https://tile.openstreetmap.org/*', 'https://nominatim.openstreetmap.org/*'] }, (details, cb) => {
    details.requestHeaders.Referer = 'https://silpeon.github.io/FitTrack/';
    cb({ requestHeaders: details.requestHeaders });
  });

  createWindow();
});

app.on('window-all-closed', () => app.quit());
