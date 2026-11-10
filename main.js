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

app.whenReady().then(() => {
  const w = new BrowserWindow({ width: 1400, height: 900, webPreferences: { preload: path.join(__dirname, 'preload.js') } });
  w.setMenuBarVisibility(false);
  w.loadFile(path.join(__dirname, 'dist', 'index.html'));
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

const { analyzeDir } = require('./lib/analyzer');
const { group, enabled } = require('./lib/group');

// Group similar photos in folder
ipcMain.handle('groups', async (e, dir, thr = 12) => {
  const s = { mode: 'and', m: { dh: { on: true, thr } } };
  return group(await analyzeDir(dir, enabled(s).map(x => x[0])), s);
});

ipcMain.handle('thumb', async (e, file) => {
  try {
    const img = await nativeImage.createThumbnailFromPath(file, { width: 200, height: 200 });
    return img.toDataURL();
  } catch {
    const img = nativeImage.createFromPath(file);
    return img.isEmpty() ? '' : img.resize({ height: 160 }).toDataURL();
  }
});

ipcMain.handle('setFav', (e, dir, file, on) => {
  const s = new Set(favs[dir] || []);
  on ? s.add(file) : s.delete(file);
  if (s.size) favs[dir] = [...s]; else delete favs[dir];
  saveFavs();
  return favs;
});

// Copy favorites keeping folder structure (relative to root, or to drive root if outside). Never overwrites.
ipcMain.handle('copyFavs', async (e, root) => {
  const r = await dialog.showOpenDialog({ properties: ['openDirectory', 'createDirectory'], title: 'Куда копировать избранные' });
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
