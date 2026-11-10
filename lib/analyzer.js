// Computes and caches features for all photos of a folder (cache survives restarts, invalidated by mtime/size)
const fsp = require('fs').promises, path = require('path');
const store = require('./store');
const { extract } = require('./features');

const EXT = new Set(['.jpg', '.jpeg', '.png', '.bmp', '.gif', '.webp', '.tif', '.tiff']);
const isImg = f => EXT.has(path.extname(f).toLowerCase());

const caches = new Map();
function dirCache(dir) {
  if (!caches.has(dir)) {
    if (caches.size > 50) caches.delete(caches.keys().next().value);
    caches.set(dir, store.load(store.cacheName(dir), { dir, files: {} }));
  }
  return caches.get(dir);
}

async function run(dir, keys, onFile) {
  const c = dirCache(dir), name = store.cacheName(dir);
  const names = (await fsp.readdir(dir)).filter(isImg);
  let changed = 0;
  for (const [i, n] of names.entries()) {
    let st; try { st = await fsp.stat(path.join(dir, n)); } catch { continue; }
    let e = c.files[n];
    if (!e || e.mt !== st.mtimeMs || e.sz !== st.size) e = c.files[n] = { mt: st.mtimeMs, sz: st.size };
    if (await extract(path.join(dir, n), e, keys) && ++changed % 20 === 0) store.save(name, c);
    onFile?.(i + 1, names.length);
  }
  if (changed) store.save(name, c);
  return names.filter(n => c.files[n]).map(n => ({ f: path.join(dir, n), ...c.files[n] }));
}

// one analysis per folder at a time; callers share the running promise chain
const locks = new Map();
function analyzeDir(dir, keys, onFile) {
  const p = (locks.get(dir) || Promise.resolve()).then(() => run(dir, keys, onFile));
  locks.set(dir, p.catch(() => {}));
  return p;
}

module.exports = { analyzeDir, isImg };
