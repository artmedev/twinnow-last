// Per-file feature extraction. Each extractor returns a JSON-serializable value (null on failure).
const { nativeImage } = require('electron');

async function loadImg(file) {
  let img = await nativeImage.createThumbnailFromPath(file, { width: 256, height: 256 }).catch(() => null);
  if (!img || img.isEmpty()) img = nativeImage.createFromPath(file);
  return img.isEmpty() ? null : img;
}
const bgra = (img, w, h) => img.resize({ width: w, height: h, quality: 'good' }).toBitmap();
function gray(img, w, h) {
  const b = bgra(img, w, h), g = new Float32Array(w * h);
  for (let i = 0; i < g.length; i++) g[i] = b[i * 4] * 0.11 + b[i * 4 + 1] * 0.59 + b[i * 4 + 2] * 0.3;
  return g;
}
const toHex = bits => { let s = ''; for (let i = 0; i < 64; i += 4) s += (bits[i] * 8 + bits[i + 1] * 4 + bits[i + 2] * 2 + bits[i + 3]).toString(16); return s; };

const N = 32, COS = Array.from({ length: 8 }, (_, u) => Float32Array.from({ length: N }, (_, x) => Math.cos(((2 * x + 1) * u * Math.PI) / (2 * N))));

const EXTRACT = {
  // difference hash: brightness gradient of 9x8 image
  dh: { img: true, fn: img => {
    const g = gray(img, 9, 8), bits = [];
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) bits.push(g[y * 9 + x] > g[y * 9 + x + 1] ? 1 : 0);
    return toHex(bits);
  } },
  // perceptual hash: low-frequency DCT coefficients of 32x32 image vs median
  ph: { img: true, fn: img => {
    const g = gray(img, N, N), c = [];
    for (let u = 0; u < 8; u++) for (let v = 0; v < 8; v++) {
      let s = 0;
      for (let y = 0; y < N; y++) { let r = 0; for (let x = 0; x < N; x++) r += g[y * N + x] * COS[v][x]; s += r * COS[u][y]; }
      c.push(s);
    }
    const m = c.slice(1).sort((a, b) => a - b)[31];
    return toHex(c.map(x => (x > m ? 1 : 0)));
  } },
};

// fill missing features `keys` into cache entry `e`; returns true if anything was computed
async function extract(file, e, keys) {
  const need = keys.filter(k => e[k] === undefined && EXTRACT[k]);
  if (!need.length) return false;
  let img;
  for (const k of need) {
    const x = EXTRACT[k];
    if (x.img && img === undefined) img = await loadImg(file).catch(() => null);
    try { e[k] = x.img ? (img ? await x.fn(img) : null) : await x.fn(file, e); } catch { e[k] = null; }
  }
  return true;
}

module.exports = { extract, EXTRACT };
