// Similarity methods and grouping. Settings: { mode: 'and'|'or', m: { key: { on, thr } } }
const hexBytes = h => Uint8Array.from(h.match(/../g), x => parseInt(x, 16));
const POP = Uint8Array.from({ length: 256 }, (_, i) => { let c = 0; for (let v = i; v; v >>= 1) c += v & 1; return c; });
const ham = (a, b) => { let d = 0; for (let i = 0; i < a.length; i++) d += POP[a[i] ^ b[i]]; return d; };

const METHODS = {
  dh: { prep: hexBytes, sim: (a, b, thr) => ham(a, b) <= thr },
  ph: { prep: hexBytes, sim: (a, b, thr) => ham(a, b) <= thr },
  // histogram distance in % (half L1)
  hi: { sim: (a, b, thr) => { let d = 0; for (let i = 0; i < 64; i++) d += Math.abs(a[i] - b[i]); return d * 50 <= thr; } },
  // shot within thr seconds
  t: { sim: (a, b, thr) => Math.abs(a - b) <= thr * 1000 },
  // neural embedding: cosine similarity in %
  em: {
    prep: s => new Float32Array(new Uint8Array(Buffer.from(s, 'base64')).buffer),
    sim: (a, b, thr) => { let d = 0; for (let i = 0; i < a.length; i++) d += a[i] * b[i]; return d * 100 >= thr; },
  },
};
const DEFAULTS = { mode: 'and', m: { dh: { on: true, thr: 12 } } };

function similar(a, b, on, mode) {
  for (const [k, thr] of on) {
    const ok = a[k] != null && b[k] != null && METHODS[k].sim(a[k], b[k], thr);
    if (mode === 'or' ? ok : !ok) return ok;
  }
  return mode !== 'or';
}

const enabled = s => Object.entries(s.m).filter(([k, v]) => v.on && METHODS[k]).map(([k, v]) => [k, v.thr]);
// features to compute: enabled ones + time (always used for ordering)
const needed = s => [...new Set(['t', ...enabled(s).map(x => x[0])])];

// items: [{ f, ...features }] -> array of groups (arrays of paths), largest first
function group(items, s) {
  const on = enabled(s);
  const P = items.map(it => {
    const p = { f: it.f, t: it.t };
    for (const [k] of on) p[k] = it[k] == null ? null : METHODS[k].prep ? METHODS[k].prep(it[k]) : it[k];
    return p;
  });
  P.sort((a, b) => (a.t ?? 0) - (b.t ?? 0) || a.f.localeCompare(b.f, undefined, { numeric: true }));
  const groups = [];
  for (const p of P) {
    // join a group only if similar to both its first and last member (limits chaining)
    const g = on.length && groups.findLast(G => similar(p, G[0], on, s.mode) && similar(p, G[G.length - 1], on, s.mode));
    g ? g.push(p) : groups.push([p]);
  }
  return groups.map(g => g.map(p => p.f)).sort((a, b) => b.length - a.length);
}

module.exports = { group, enabled, needed, METHODS, DEFAULTS };
