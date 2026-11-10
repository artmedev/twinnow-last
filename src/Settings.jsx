import { useState } from 'react';
import { t } from './i18n.jsx';

const META = {
  dh: { min: 0, max: 32, unit: 'u_bits' },
  ph: { min: 0, max: 32, unit: 'u_bits' },
  hi: { min: 2, max: 60, unit: 'u_pct' },
  t: { min: 1, max: 600, unit: 'u_sec' },
  em: { min: 60, max: 99, unit: 'u_sim' },
};

export default function Settings({ value, onApply }) {
  const [s, setS] = useState(value);
  const setM = (k, patch) => setS({ ...s, m: { ...s.m, [k]: { ...s.m[k], ...patch } } });
  return (
    <div id="settings">
      {Object.entries(META).map(([k, m]) => (
        <div key={k} className="meth">
          <label><input type="checkbox" checked={s.m[k].on} onChange={e => setM(k, { on: e.target.checked })} /> {t('m_' + k)}</label>
          <input type="range" min={m.min} max={m.max} value={s.m[k].thr} disabled={!s.m[k].on}
            onChange={e => setM(k, { thr: +e.target.value })} />
          <span>{t(m.unit)} {s.m[k].thr}</span>
        </div>
      ))}
      <div className="meth">
        <label>{t('combo')} <select value={s.mode} onChange={e => setS({ ...s, mode: e.target.value })}>
          <option value="and">{t('and')}</option>
          <option value="or">{t('or')}</option>
        </select></label>
        <button onClick={() => onApply(s)}>{t('apply')}</button>
      </div>
    </div>
  );
}
