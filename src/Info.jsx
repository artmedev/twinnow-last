import { useState, useEffect } from 'react';
import { t, getLang } from './i18n.jsx';

const api = window.api;
const exp = s => (s >= 1 ? s + ' s' : '1/' + Math.round(1 / s) + ' s');
const SC = { dh: v => `dHash ${v}`, ph: v => `pHash ${v}`, hi: v => `${t('m_hi').split(/[:：]/)[0]} ${v}%`, t: v => `Δt ${v}s`, em: v => `CLIP ${v}%` };

// concise photo details next to the viewer
export default function Info({ f, dims, score }) {
  const [x, setX] = useState(null);
  useEffect(() => { let live = true; setX(null); api.info(f).then(r => live && setX(r)); return () => { live = false; }; }, [f]);
  const row = (k, v) => v ? <div><b>{t(k)}</b>{v}</div> : null;
  const date = x && (x.taken || x.mtime) && new Date(x.taken || x.mtime).toLocaleString(getLang());
  return (
    <aside id="info">
      <div className="name">{f.split(/[\\/]/).pop()}</div>
      {x && <>
        {row('size', (x.size / 1048576).toFixed(1) + ' MB')}
        {row('res', dims && `${dims[0]} × ${dims[1]} · ${(dims[0] * dims[1] / 1e6).toFixed(1)} MP`)}
        {row('taken', date)}
        {row('camera', [x.make, x.model].filter(Boolean).join(' '))}
        {row('lens', x.lens)}
        {row('exposure', [x.exp && exp(x.exp), x.f && 'f/' + x.f, x.iso && 'ISO ' + x.iso, x.focal && x.focal + ' mm'].filter(Boolean).join(' · '))}
        {row('gps', x.lat != null && `${x.lat.toFixed(5)}, ${x.lon.toFixed(5)}`)}
      </>}
      {score && Object.keys(score).length > 0 && row('scores', Object.entries(score).map(([k, v]) => SC[k](v)).join(' · '))}
      <div className="path">{f}</div>
    </aside>
  );
}
