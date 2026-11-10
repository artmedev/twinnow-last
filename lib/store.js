// JSON persistence in userData: debounced atomic writes + per-folder caches
const fs = require('fs'), path = require('path'), crypto = require('crypto');
let base;
const pending = new Map();

function init(dir) { base = dir; fs.mkdirSync(path.join(base, 'cache'), { recursive: true }); }
function load(name, def) {
  try { return JSON.parse(fs.readFileSync(path.join(base, name), 'utf8')); } catch { return def; }
}
function saveNow(name) {
  const p = pending.get(name); if (!p) return;
  clearTimeout(p.t); pending.delete(name);
  const f = path.join(base, name);
  fs.writeFileSync(f + '.tmp', JSON.stringify(p.data));
  fs.renameSync(f + '.tmp', f);
}
function save(name, data, delay = 500) {
  const p = pending.get(name); // throttle: keep the scheduled write, just update data
  if (p) p.data = data;
  else pending.set(name, { data, t: setTimeout(() => saveNow(name), delay) });
}
const flush = () => [...pending.keys()].forEach(saveNow);
const cacheName = dir => path.join('cache', crypto.createHash('sha1').update(dir.toLowerCase()).digest('hex').slice(0, 20) + '.json');

module.exports = { init, load, save, flush, cacheName };
