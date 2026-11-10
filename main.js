const { app, BrowserWindow, ipcMain, dialog, nativeImage } = require('electron');
const fs = require('fs'), fsp = fs.promises, path = require('path');

const SKIP = new Set(['windows', 'program files', 'program files (x86)', 'programdata', 'appdata', 'node_modules', '$recycle.bin', 'system volume information']);
const { isImg } = require('./lib/analyzer');
const store = require('./lib/store');
store.init(app.getPath('userData'));
const state = store.load('state.json', { root: null, dirs: [], ui: {}, scanning: false });
const favs = store.load('favorites.json', {});
const saveState = () => store.save('state.json', state);
const saveFavs = () => store.save('favorites.json', favs, 0);
app.on('before-quit', store.flush);

ipcMain.handle('getState', () => ({ ...state, favs }));
ipcMain.handle('setUi', (e, ui) => { state.ui = ui; saveState(); });

let win;
app.whenReady().then(() => {
  win = new BrowserWindow({ width: 1400, height: 900, webPreferences: { preload: path.join(__dirname, 'preload.js') } });
  win.setMenuBarVisibility(false);
  win.webContents.on('did-finish-load', () => state.running ? analyzeLoop() : progress());
  win.loadFile(path.join(__dirname, 'dist', 'index.html'));
});
app.on('window-all-closed', () => app.quit());

ipcMain.handle('pickDir', async () => {
  const r = await dialog.showOpenDialog({ properties: ['openDirectory'] });
  return r.canceled ? null : r.filePaths[0];
});

// Recursively find folders containing images
ipcMain.handle('scan', async (e, root) => {
  const out = [];
  Object.assign(state, { root, dirs: out, scanning: true });
  async function walk(dir) {
    let ents;
    try { ents = await fsp.readdir(dir, { withFileTypes: true }); } catch { return; }
    let n = 0;
    for (const d of ents) {
      if (d.isDirectory()) {
        if (!SKIP.has(d.name.toLowerCase()) && !d.name.startsWith('.')) await walk(path.join(dir, d.name));
      } else if (isImg(d.name)) n++;
    }
    if (n) { out.push({ dir, n }); e.sender.send('scanProgress', out.length); saveState(); }
  }
  await walk(root);
  state.scanning = false; saveState();
  return out;
});

const { analyzeDir, setLast, getLast } = require('./lib/analyzer');
const embed = require('./lib/embed');
const { group, needed: neededFor, DEFAULTS } = require('./lib/group');
const needed = s => neededFor(s.m.em.on || embed.isReady());
state.settings = { ...DEFAULTS, ...state.settings, m: { ...DEFAULTS.m, ...state.settings?.m } };

// Group similar photos in folder
ipcMain.handle('groups', async (e, dir) => {
  const keys = needed(state.settings), items = await analyzeDir(dir, keys, (i, n, eta) => e.sender.send('dirProgress', { dir, i, n, eta }));
  markDone(dir, keys, items);
  const r = group(items, state.settings);
  setLast(dir, r);
  return r;
});
// instant result: last saved grouping, or all photos as one provisional group
ipcMain.handle('groupsQuick', async (e, dir) => getLast(dir) ||
  { groups: [(await fsp.readdir(dir)).filter(isImg).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })).map(f => path.join(dir, f))], scores: {} });
// neural model: availability check and download with progress; enables the method when done
ipcMain.handle('modelReady', () => embed.isReady());
ipcMain.handle('downloadModel', async e => {
  const files = {};
  const onProgress = p => {
    if (p.status !== 'progress' || !p.total) return;
    files[p.file] = [p.loaded, p.total];
    const v = Object.values(files);
    e.sender.send('modelProgress', Math.round(100 * v.reduce((s, x) => s + x[0], 0) / v.reduce((s, x) => s + x[1], 0)));
  };
  try { await embed.load(onProgress); } catch { return null; }
  state.settings.m.em.on = true; saveState(); progress();
  return state.settings;
});
ipcMain.handle('setSettings', (e, s) => { state.settings = s; saveState(); });

ipcMain.handle('thumb', async (e, file) => {
  try {
    const img = await nativeImage.createThumbnailFromPath(file, { width: 200, height: 200 });
    return img.toDataURL();
  } catch {
    const img = nativeImage.createFromPath(file);
    return img.isEmpty() ? '' : img.resize({ height: 160 }).toDataURL();
  }
});

// photo details for the info panel
ipcMain.handle('info', async (e, f) => {
  const st = await fsp.stat(f).catch(() => null);
  const x = (await require('exifr').parse(f, { tiff: true, exif: true, gps: true }).catch(() => null)) || {};
  return { size: st?.size, mtime: st?.mtimeMs, make: x.Make, model: x.Model, lens: x.LensModel, taken: (x.DateTimeOriginal || x.CreateDate)?.getTime?.(),
    exp: x.ExposureTime, f: x.FNumber, iso: x.ISO, focal: x.FocalLength, lat: x.latitude, lon: x.longitude };
});

ipcMain.handle('setFav', (e, dir, file, on) => {
  const s = new Set(favs[dir] || []);
  on ? s.add(file) : s.delete(file);
  if (s.size) favs[dir] = [...s]; else delete favs[dir];
  saveFavs();
  return favs;
});

// Copy favorites keeping folder structure (relative to root, or to drive root if outside). Never overwrites.
ipcMain.handle('copyFavs', async (e, root, title) => {
  const r = await dialog.showOpenDialog({ properties: ['openDirectory', 'createDirectory'], title });
  if (r.canceled) return null;
  const dest = r.filePaths[0];
  let copied = 0, skipped = 0, errors = 0;
  for (const files of Object.values(favs)) for (const f of files) {
    let rel = root ? path.relative(root, f) : '';
    if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) rel = path.join(path.parse(f).root.replace(/[:\\\/]/g, ''), path.relative(path.parse(f).root, f));
    const t = path.join(dest, rel);
    try {
      await fsp.mkdir(path.dirname(t), { recursive: true });
      await fsp.copyFile(f, t, fs.constants.COPYFILE_EXCL);
      copied++;
    } catch (err) { err.code === 'EEXIST' ? skipped++ : errors++; }
  }
  return { dest, copied, skipped, errors };
});

// Background analysis of all folders. Progress persists in state.done (dir -> computed feature keys) and resumes on restart.
state.done ||= {};
let loop = null;
const isDone = (dir, keys) => keys.every(k => state.done[dir]?.includes(k));
const complete = (items, keys) => items.every(it => keys.every(k => it[k] !== undefined));
function markDone(dir, keys, items) {
  if (!complete(items, keys)) return false;
  state.done[dir] = [...new Set([...(state.done[dir] || []), ...keys])];
  saveState(); win?.webContents.send('dirDone', dir);
  return true;
}
function progress(extra) {
  const keys = needed(state.settings);
  win?.webContents.send('progress', { running: state.running, done: state.dirs.filter(d => isDone(d.dir, keys)).length, total: state.dirs.length, ...extra });
}
function analyzeLoop() {
  loop ||= (async () => {
    let error;
    while (state.running) {
      const keys = needed(state.settings), d = state.dirs.find(d => !isDone(d.dir, keys));
      if (!d) break;
      const items = await analyzeDir(d.dir, keys, (i, n, eta) => { progress({ dir: d.dir, i, n }); win?.webContents.send('dirProgress', { dir: d.dir, i, n, eta }); }).catch(() => []);
      if (!markDone(d.dir, keys, items)) { error = 'errFeatures'; break; }
    }
    loop = null; progress({ error });
  })();
}
ipcMain.handle('setRunning', (e, on) => { state.running = on; saveState(); on ? analyzeLoop() : progress(); });
ipcMain.handle('doneDirs', () => state.dirs.map(d => d.dir).filter(d => isDone(d, needed(state.settings))));
