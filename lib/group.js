// Similarity methods and grouping. Settings: { mode: 'and'|'or', m: { key: { on, thr } } }
const hexBytes = h => Uint8Array.from(h.match(/../g), x => parseInt(x, 16));
const POP = Uint8Array.from({ length: 256 }, (_, i) => { let c = 0; for (let v = i; v; v >>= 1) c += v & 1; return c; });
const ham = (a, b) => { let d = 0; for (let i = 0; i < a.length; i++) d += POP[a[i] ^ b[i]]; return d; };

// score(a, b): distance (or similarity if ge) used both for grouping and for per-file scores
const METHODS = {
  dh: { prep: hexBytes, score: ham },                       // differing bits
  ph: { prep: hexBytes, score: ham },                       // differing bits
  hi: { score: (a, b) => { let d = 0; for (let i = 0; i < 64; i++) d += Math.abs(a[i] - b[i]); return Math.round(d * 50); } }, // % difference
  t: { score: (a, b) => Math.round(Math.abs(a - b) / 1000) }, // seconds apart
  em: {                                                     // cosine similarity %
    ge: true,
    prep: s => new Float32Array(new Uint8Array(Buffer.from(s, 'base64')).buffer),
    score: (a, b) => { let d = 0; for (let i = 0; i < a.length; i++) d += a[i] * b[i]; return Math.round(d * 100); },
  },
};
const DEFAULTS = { mode: 'and', m: { dh: { on: true, thr: 12 }, ph: { on: false, thr: 10 }, hi: { on: false, thr: 25 }, t: { on: false, thr: 30 }, em: { on: false, thr: 85 } } };

const pass = (k, a, b, thr) => a != null && b != null && (METHODS[k].ge ? METHODS[k].score(a, b) >= thr : METHODS[k].score(a, b) <= thr);
function similar(a, b, on, mode) {
  for (const [k, thr] of on) {
    const ok = pass(k, a[k], b[k], thr);
    if (mode === 'or' ? ok : !ok) return ok;
  }
  return mode !== 'or';
}

const enabled = s => Object.entries(s.m).filter(([k, v]) => v.on && METHODS[k]).map(([k, v]) => [k, v.thr]);
// features computed for every file: all methods (neural only when its model is available)
const needed = withEm => Object.keys(METHODS).filter(k => k !== 'em' || withEm);

// items: [{ f, ...features }] -> { groups: [[path]] largest first, scores: { path: { method: score vs group's first photo } } }
function group(items, s) {
  const on = enabled(s);
  const P = items.map(it => {
    const p = { f: it.f };
    for (const k in METHODS) p[k] = it[k] == null ? null : METHODS[k].prep ? METHODS[k].prep(it[k]) : it[k];
    return p;
  });
  P.sort((a, b) => (a.t ?? 0) - (b.t ?? 0) || a.f.localeCompare(b.f, undefined, { numeric: true }));
  const groups = [];
  for (const p of P) {
    // join a group only if similar to both its first and last member (limits chaining)
    const g = on.length && groups.findLast(G => similar(p, G[0], on, s.mode) && similar(p, G[G.length - 1], on, s.mode));
    g ? g.push(p) : groups.push([p]);
  }
  const scores = {};
  for (const G of groups) for (const p of G) {
    scores[p.f] = {};
    for (const k in METHODS) if (p[k] != null && G[0][k] != null) scores[p.f][k] = METHODS[k].score(p[k], G[0][k]);
  }
  return { groups: groups.map(g => g.map(p => p.f)).sort((a, b) => b.length - a.length), scores };
}

module.exports = { group, enabled, needed, METHODS, DEFAULTS };
