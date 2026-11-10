const { app, BrowserWindow, ipcMain, dialog, nativeImage } = require('electron');
const fs = require('fs'), fsp = fs.promises, path = require('path');

const SKIP = new Set(['windows', 'program files', 'program files (x86)', 'programdata', 'appdata', 'node_modules', '$recycle.bin', 'system volume information', 'proc', 'sys', 'dev', 'run', 'snap']);
const { isImg } = require('./lib/analyzer');
const store = require('./lib/store');
// keep the data of the app's previous name (BestPhoto): copied once, the old folder stays as is
const ud = app.getPath('userData'), oldUd = path.join(app.getPath('appData'), 'bestphoto');
if (!fs.existsSync(path.join(ud, 'state.json')) && fs.existsSync(path.join(oldUd, 'state.json'))) {
  try { fs.cpSync(oldUd, ud, { recursive: true, filter: s => !/Cache|Dawn|Local Storage|Network/i.test(s) }); } catch {}
}
store.init(ud);
const state = store.load('state.json', { root: null, dirs: [], ui: {}, scanning: false });
const favs = store.load('favorites.json', {});
const saveState = () => store.save('state.json', state);
const saveFavs = () => store.save('favorites.json', favs, 0);
app.on('before-quit', store.flush);

ipcMain.handle('getState', () => ({ ...state, favs }));

// is folder d the chosen root or inside it (case-insensitive on Windows)
const norm = p => (process.platform === 'win32' ? p.toLowerCase() : p).replace(/[\\/]+$/, '');
const inRoot = (d, root) => !!root && (norm(d) === norm(root) || norm(d).startsWith(norm(root) + path.sep));
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
// rootGen changes when another root folder is chosen: everything working on the old one stops
let rootGen = 0, viewGen = 0;
ipcMain.handle('scan', async (e, root) => {
  const out = [], gen = ++rootGen;
  Object.assign(state, { root, dirs: out, scanning: true });
  async function walk(dir) {
    let ents;
    if (gen !== rootGen) return;
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
  if (gen !== rootGen) return null;
  state.scanning = false; saveState();
  if (state.running) analyzeLoop();
  return out;
});

const { analyzeDir, setLast, getLast } = require('./lib/analyzer');
const embed = require('./lib/embed');
const { group, needed: neededFor, DEFAULTS } = require('./lib/group');
const needed = s => neededFor(s.m.em.on || embed.isReady());
state.settings = { ...DEFAULTS, ...state.settings, m: { ...DEFAULTS.m, ...state.settings?.m } };

// Group similar photos in folder
ipcMain.handle('groups', async (e, dir) => {
  const my = ++viewGen, keys = needed(state.settings);
  const items = await analyzeDir(dir, keys, (i, n, eta) => e.sender.send('dirProgress', { dir, i, n, eta }), () => my !== viewGen);
  if (items.cancelled) { e.sender.send('dirProgress', { dir, i: 0, n: 0 }); return null; }
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

// clears favorites of the chosen root folder (only the app's list, files are untouched)
ipcMain.handle('clearFavs', () => {
  for (const k of Object.keys(favs)) if (inRoot(k, state.root)) delete favs[k];
  for (const k of Object.keys(magicPicks)) if (inRoot(k, state.root)) delete magicPicks[k];
  saveFavs(); store.save('magic.json', magicPicks);
  return favs;
});

ipcMain.handle('setFav', (e, dir, file, on) => {
  const s = new Set(favs[dir] || []);
  on ? s.add(file) : s.delete(file);
  if (magicPicks[dir]) magicPicks[dir] = magicPicks[dir].filter(f => f !== file), store.save('magic.json', magicPicks);
  if (s.size) favs[dir] = [...s]; else delete favs[dir];
  saveFavs();
  return favs;
});

// Copy favorites of the chosen root folder only, keeping folder structure (relative to root, or to drive root if outside). Never overwrites.
ipcMain.handle('copyFavs', async (e, root, title) => {
  const r = await dialog.showOpenDialog({ properties: ['openDirectory', 'createDirectory'], title });
  if (r.canceled) return null;
  const dest = r.filePaths[0];
  let copied = 0, skipped = 0, errors = 0;
  for (const [dir, files] of Object.entries(favs)) if (inRoot(dir, root)) for (const f of files) {
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
  if (items.cancelled || !complete(items, keys)) return false;
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
    const gen = rootGen;
    while (state.running && gen === rootGen) {
      const keys = needed(state.settings), d = state.dirs.find(d => !isDone(d.dir, keys));
      if (!d) break;
      const items = await analyzeDir(d.dir, keys, (i, n, eta) => { progress({ dir: d.dir, i, n }); win?.webContents.send('dirProgress', { dir: d.dir, i, n, eta }); }, () => !state.running || gen !== rootGen).catch(() => []);
      if (items.cancelled) break;
      if (!markDone(d.dir, keys, items)) { error = 'errFeatures'; break; }
    }
    loop = null; progress({ error });
    if (state.running && gen !== rootGen) analyzeLoop(); // restart for the new root
  })();
}
// Magic mode: in every folder, favorite each unique photo and one random photo of each group that has no favorite yet.
// Its own previous picks (magic.json) are replaced on every run; favorites set by hand are kept.
const magicPicks = store.load('magic.json', {});
let magicBusy = false;
ipcMain.handle('magic', async e => {
  if (magicBusy) return null;
  magicBusy = true;
  let added = 0, dirs = 0;
  try {
    const keys = needed(state.settings), list = state.dirs, gen = rootGen;
    for (const [i, d] of list.entries()) {
      if (gen !== rootGen) break;
      e.sender.send('magicProgress', { i, n: list.length, dir: d.dir });
      const items = await analyzeDir(d.dir, keys, null, () => gen !== rootGen).catch(() => null);
      if (!items?.length || items.cancelled) continue;
      markDone(d.dir, keys, items);
      const r = group(items, state.settings);
      setLast(d.dir, r);
      const prev = new Set(magicPicks[d.dir] || []);
      const manual = new Set((favs[d.dir] || []).filter(f => !prev.has(f)));
      const picks = r.groups.filter(g => !g.some(f => manual.has(f))).map(g => g[Math.floor(Math.random() * g.length)]);
      const all = [...manual, ...picks];
      if (all.length) favs[d.dir] = all; else delete favs[d.dir];
      magicPicks[d.dir] = picks;
      added += picks.length; dirs++;
      saveFavs(); store.save('magic.json', magicPicks);
      e.sender.send('magicDir', { dir: d.dir, list: favs[d.dir] || [] }); // live: folder processed + its favorites
    }
  } finally { magicBusy = false; e.sender.send('magicProgress', null); }
  return { added, dirs, favs };
});
ipcMain.handle('setRunning', (e, on) => { state.running = on; saveState(); on ? analyzeLoop() : progress(); });
ipcMain.handle('doneDirs', () => state.dirs.map(d => d.dir).filter(d => isDone(d, needed(state.settings))));
