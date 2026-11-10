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

// cancelled(): stop early; the result is then marked .cancelled and must not count as complete
async function run(dir, keys, onFile, cancelled) {
  const c = dirCache(dir), name = store.cacheName(dir);
  const names = (await fsp.readdir(dir)).filter(isImg);
  let changed = 0, spent = 0;
  let stopped = false;
  for (const [i, n] of names.entries()) {
    if (cancelled?.()) { stopped = true; break; }
    let st; try { st = await fsp.stat(path.join(dir, n)); } catch { continue; }
    let e = c.files[n];
    if (!e || e.mt !== st.mtimeMs || e.sz !== st.size) e = c.files[n] = { mt: st.mtimeMs, sz: st.size };
    const t0 = Date.now();
    if (await extract(path.join(dir, n), e, keys)) { spent += Date.now() - t0; if (++changed % 20 === 0) store.save(name, c); }
    // eta (s): average time per computed file × files left
    onFile?.(i + 1, names.length, changed ? Math.round(spent / changed * (names.length - i - 1) / 1000) : 0);
  }
  if (changed) store.save(name, c);
  const items = names.filter(n => c.files[n]).map(n => ({ f: path.join(dir, n), ...c.files[n] }));
  items.cancelled = stopped;
  return items;
}

// one analysis per folder at a time; callers share the running promise chain
const locks = new Map();
function analyzeDir(dir, keys, onFile, cancelled) {
  const p = (locks.get(dir) || Promise.resolve()).then(() => run(dir, keys, onFile, cancelled));
  locks.set(dir, p.catch(() => {}));
  return p;
}

// last grouping result (groups + per-file scores) is stored with the folder cache
const getLast = dir => dirCache(dir).last;
function setLast(dir, last) { const c = dirCache(dir); c.last = last; store.save(store.cacheName(dir), c); }

module.exports = { analyzeDir, isImg, getLast, setLast };
