import { useState, useEffect, useMemo, useRef } from 'react';
import Settings from './Settings.jsx';
import { t, LangSwitch } from './i18n.jsx';
import ModelToast from './ModelToast.jsx';

const api = window.api;
const cache = new Map();
const url = f => 'file:///' + f.replace(/\\/g, '/').split('/').map((s, i) => i ? encodeURIComponent(s) : s).join('/');
const base = f => f.split(/[\\/]/).pop();
const fmtTime = s => s >= 3600 ? `${Math.floor(s / 3600)}h ${Math.round(s % 3600 / 60)}m` : s >= 60 ? `${Math.floor(s / 60)}m ${s % 60}s` : `${s}s`;
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

function TreeNode({ name, node, favs, curDir, open, done }) {
  const kids = Object.entries(node.kids).sort(byName);
  const f = favs[node.dir];
  const label = (
    <div className={'node' + (f ? ' done' : '') + (node.dir === curDir ? ' sel' : '') + (node.n && !done.has(node.dir) ? ' todo' : '')}
      title={f ? t('processed', f.length) : ''}
      onClick={e => { if (node.n) { e.preventDefault(); open(node.dir); } }}>
      {name}{node.n ? ` (${node.n})` : ''}
    </div>
  );
  if (!kids.length) return label;
  return (
    <details open>
      <summary>{label}</summary>
      {kids.map(([k, v]) => <TreeNode key={k} name={k} node={v} favs={favs} curDir={curDir} open={open} done={done} />)}
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
  const [scores, setScores] = useState({});
  const [gi, setGi] = useState(0);
  const [cur, setCur] = useState(null);
  const now = useRef({});
  now.current = { curDir, cur };
  const [settings, setSettings] = useState(null);
  const [showSet, setShowSet] = useState(false);
  const [prog, setProg] = useState(null);
  const [dirProg, setDirProg] = useState({});
  const [done, setDone] = useState(new Set());
  const [, setLang] = useState();
  const loadDone = () => api.doneDirs().then(d => setDone(new Set(d)));

  const scan = async d => {
    setRoot(d);
    const dirs = await api.scan(d);
    setStatus(t('folders', dirs.length));
    setTree(buildTree(d, dirs)); loadDone();
  };

  // restore previous session
  useEffect(() => {
    api.onScan(n => setStatus(t('scanning', n)));
    api.onProgress(setProg);
    api.onDirProgress(p => setDirProg(s => ({ ...s, [p.dir]: p })));
    api.onDirDone(d => setDone(s => new Set(s).add(d)));
    loadDone();
    api.getState().then(s => {
      setFavs(s.favs); setSettings(s.settings);
      if (!s.root) return;
      setRoot(s.root); setTree(buildTree(s.root, s.dirs));
      if (s.ui.curDir) open(s.ui.curDir, s.ui);
      if (s.scanning) scan(s.root);
    });
  }, []);

  const pick = async () => {
    const d = await api.pickDir(); if (!d) return;
    setTree(null); setCurDir(null); setGroups(null);
    scan(d);
  };

  useEffect(() => { if (curDir) api.setUi({ curDir, gi, cur }); }, [curDir, gi, cur]);

  const copy = async () => {
    if (!Object.keys(favs).length) return alert(t('noFavs'));
    const r = await api.copyFavs(root, t('copyTitle')); if (!r) return;
    alert(t('copied', r.copied, r.skipped, r.errors, r.dest));
  };

  const openGroup = (gs, i) => { setGi(i); setCur(gs[i]?.[0] || null); };
  // show saved (or provisional) groups at once, then fresh ones; keep the group of the viewed photo selected
  const show = (r, keep) => {
    setGroups(r.groups); setScores(r.scores);
    let i = r.groups.findIndex(g => g.includes(keep?.cur));
    if (i < 0) i = r.groups[keep?.gi] ? keep.gi : 0;
    setGi(i); setCur(r.groups[i]?.includes(keep?.cur) ? keep.cur : r.groups[i]?.[0] || null);
  };
  const open = async (dir, keep) => {
    setCurDir(dir); now.current.curDir = dir; setGroups(null);
    const q = await api.groupsQuick(dir);
    if (now.current.curDir === dir) show(q, keep);
    const r = await api.groups(dir);
    if (now.current.curDir === dir) show(r, { cur: now.current.cur, gi: keep?.gi });
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
        <button onClick={pick}>{t('pick')}</button>
        <button onClick={copy}>{t('copy')}</button>
        <button onClick={() => setShowSet(!showSet)}>{t('algo')}</button>
        <button onClick={() => api.setRunning(!prog?.running)}>{prog?.running ? t('pause') : t('run')}</button>
        <span>{prog && t('analyzed', prog.done, prog.total) + (prog.running && prog.dir ? ` · ${base(prog.dir)} ${prog.i}/${prog.n}` : '') + (prog.error ? ' · ' + t(prog.error) : '')}</span>
        <span>{status}</span>
        <LangSwitch onChange={setLang} />
      </div>
      {showSet && settings && <Settings value={settings} onApply={async s => { await api.setSettings(s); setSettings(s); loadDone(); setShowSet(false); curDir && open(curDir, { cur }); }} />}
      <ModelToast onReady={s => { setSettings(s); loadDone(); curDir && open(curDir, { cur }); }} />
      <div id="main">
        <div id="tree">{tree && <TreeNode name={root} node={tree} favs={favs} curDir={curDir} open={open} done={done} />}</div>
        <div id="right">
          <div id="groups">
            {curDir && !groups && t('grouping')}
            {dirProg[curDir]?.i < dirProg[curDir]?.n && <div id="eta">{t('eta', dirProg[curDir].i, dirProg[curDir].n, fmtTime(dirProg[curDir].eta))}</div>}
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
                  title={base(f) + '\n' + t('hint')}
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
