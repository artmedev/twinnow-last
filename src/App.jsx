import { useState, useEffect, useMemo } from 'react';

const api = window.api;
const cache = new Map();
const url = f => 'file:///' + f.replace(/\\/g, '/').split('/').map((s, i) => i ? encodeURIComponent(s) : s).join('/');
const base = f => f.split(/[\\/]/).pop();
const byName = (a, b) => a[0].localeCompare(b[0], undefined, { numeric: true });

function Thumb({ f }) {
  const [src, setSrc] = useState(cache.get(f) || '');
  useEffect(() => {
    if (cache.has(f)) return setSrc(cache.get(f));
    let live = true;
    api.thumb(f).then(s => { cache.set(f, s); live && setSrc(s); });
    return () => { live = false; };
  }, [f]);
  return <img src={src || undefined} />;
}

function buildTree(root, dirs) {
  const t = { kids: {}, dir: root, n: 0 };
  for (const { dir, n } of dirs) {
    let node = t, p = root.replace(/[\\/]$/, '');
    for (const part of dir.slice(root.length).split(/[\\/]/).filter(Boolean)) {
      p += '\\' + part;
      node = node.kids[part] ||= { kids: {}, dir: p, n: 0 };
    }
    node.n = n;
  }
  return t;
}

function TreeNode({ name, node, favs, curDir, open }) {
  const kids = Object.entries(node.kids).sort(byName);
  const f = favs[node.dir];
  const label = (
    <div className={'node' + (f ? ' done' : '') + (node.dir === curDir ? ' sel' : '')}
      title={f ? `Обработана: избранных ${f.length}` : ''}
      onClick={e => { if (node.n) { e.preventDefault(); open(node.dir); } }}>
      {name}{node.n ? ` (${node.n})` : ''}
    </div>
  );
  if (!kids.length) return label;
  return (
    <details open>
      <summary>{label}</summary>
      {kids.map(([k, v]) => <TreeNode key={k} name={k} node={v} favs={favs} curDir={curDir} open={open} />)}
    </details>
  );
}

export default function App() {
  const [root, setRoot] = useState(null);
  const [tree, setTree] = useState(null);
  const [status, setStatus] = useState('');
  const [favs, setFavs] = useState({});
  const [curDir, setCurDir] = useState(null);
  const [groups, setGroups] = useState(null);
  const [gi, setGi] = useState(0);
  const [cur, setCur] = useState(null);
  const [thr, setThr] = useState(12);

  useEffect(() => {
    api.getFavs().then(setFavs);
    api.onScan(n => setStatus(`Сканирование… папок с фото: ${n}`));
  }, []);

  const pick = async () => {
    const d = await api.pickDir(); if (!d) return;
    setRoot(d); setTree(null); setCurDir(null); setGroups(null);
    const dirs = await api.scan(d);
    setStatus(`Папок с фото: ${dirs.length}`);
    setTree(buildTree(d, dirs));
  };

  const openGroup = (gs, i) => { setGi(i); setCur(gs[i]?.[0] || null); };
  const open = async (dir, t = thr) => {
    setCurDir(dir); setGroups(null);
    const gs = await api.groups(dir, t);
    setGroups(gs); openGroup(gs, 0);
  };

  const favSet = useMemo(() => new Set(favs[curDir] || []), [favs, curDir]);
  const toggle = async f => f && setFavs(await api.setFav(curDir, f, !favSet.has(f)));
  const g = groups?.[gi] || [];

  useEffect(() => {
    const h = e => {
      if (!groups || e.target.tagName === 'INPUT') return;
      const i = g.indexOf(cur);
      if (e.key === 'ArrowRight' && i < g.length - 1) setCur(g[i + 1]);
      else if (e.key === 'ArrowLeft' && i > 0) setCur(g[i - 1]);
      else if (e.key === 'ArrowDown' && gi < groups.length - 1) openGroup(groups, gi + 1);
      else if (e.key === 'ArrowUp' && gi > 0) openGroup(groups, gi - 1);
      else if (e.key === ' ' || e.key.toLowerCase() === 'f') { e.preventDefault(); toggle(cur); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  });

  return (
    <div id="app">
      <div id="bar">
        <button onClick={pick}>Выбрать папку / диск…</button>
        <label>Порог похожести <input type="range" min="2" max="24" value={thr}
          onChange={e => setThr(+e.target.value)} onMouseUp={() => curDir && open(curDir, thr)} /> {thr}</label>
        <span>{status}</span>
      </div>
      <div id="main">
        <div id="tree">{tree && <TreeNode name={root} node={tree} favs={favs} curDir={curDir} open={open} />}</div>
        <div id="right">
          <div id="groups">
            {curDir && !groups && 'Группировка…'}
            {groups?.map((gr, i) => (
              <div key={gr[0]} className={'grp' + (i === gi ? ' sel' : '') + (gr.some(f => favSet.has(f)) ? ' hasfav' : '')}
                onClick={() => openGroup(groups, i)}>
                <Thumb f={gr[0]} /><span>{gr.length}</span>
              </div>
            ))}
          </div>
          <div id="bottom">
            <div id="grid">
              {g.map(f => (
                <div key={f} className={'ph' + (f === cur ? ' cur' : '') + (favSet.has(f) ? ' fav' : '')}
                  title={base(f) + '\nКлик — просмотр, ★ или двойной клик — избранное'}
                  onClick={() => setCur(f)} onDoubleClick={() => toggle(f)}>
                  <Thumb f={f} /><b onClick={e => { e.stopPropagation(); toggle(f); }}>★</b>
                </div>
              ))}
            </div>
            <div id="view">{cur && <><img src={url(cur)} /><div>{base(cur)}</div></>}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
