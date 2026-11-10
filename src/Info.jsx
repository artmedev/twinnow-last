import { useState, useEffect } from 'react';
import { t, getLang } from './i18n.jsx';

const api = window.api;
const exp = s => (s >= 1 ? s + ' s' : '1/' + Math.round(1 / s) + ' s');
const SC = { dh: v => `dHash ${v}`, ph: v => `pHash ${v}`, hi: v => `${t('m_hi').split(/[:：]/)[0]} ${v}%`, t: v => `Δt ${v}s`, em: v => `CLIP ${v}%` };
const KEY = 'infoOpen';
const load = () => { try { return localStorage.getItem(KEY) === '1'; } catch { return false; } };

// photo details under the viewer: one summary line, click to expand
export default function Info({ f, dims, score }) {
  const [x, setX] = useState(null);
  const [open, setOpen] = useState(load);
  useEffect(() => { let live = true; setX(null); api.info(f).then(r => live && setX(r)); return () => { live = false; }; }, [f]);
  const toggle = () => { setOpen(!open); try { localStorage.setItem(KEY, open ? '0' : '1'); } catch {} };
  const date = x && (x.taken || x.mtime) && new Date(x.taken || x.mtime).toLocaleString(getLang());
  const rows = x ? [
    ['res', dims && `${dims[0]} × ${dims[1]} · ${(dims[0] * dims[1] / 1e6).toFixed(1)} MP`],
    ['size', (x.size / 1048576).toFixed(1) + ' MB'],
    ['taken', date],
    ['camera', [x.make, x.model].filter(Boolean).join(' ')],
    ['lens', x.lens],
    ['exposure', [x.exp && exp(x.exp), x.f && 'f/' + x.f, x.iso && 'ISO ' + x.iso, x.focal && x.focal + ' mm'].filter(Boolean).join(' · ')],
    ['gps', x.lat != null && `${x.lat.toFixed(5)}, ${x.lon.toFixed(5)}`],
    ['scores', score && Object.entries(score).map(([k, v]) => SC[k](v)).join(' · ')],
  ].filter(r => r[1]) : [];
  return (
    <div id="info" className={open ? 'open' : ''}>
      <div className="sum" onClick={toggle}>
        <span className="arr">{open ? '▾' : '▸'}</span>
        <b>{f.split(/[\\/]/).pop()}</b>
        <span>{rows.slice(0, 3).map(r => r[1]).join(' · ')}</span>
      </div>
      {open && <div className="rows">
        {rows.map(([k, v]) => <div key={k}><i>{t(k)}</i>{v}</div>)}
        <div className="path">{f}</div>
      </div>}
    </div>
  );
}
