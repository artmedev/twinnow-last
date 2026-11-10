import { useState } from 'react';

const META = {
  dh: { name: 'dHash — градиент яркости', min: 0, max: 32, unit: 'бит различий ≤' },
  ph: { name: 'pHash — частоты (DCT)', min: 0, max: 32, unit: 'бит различий ≤' },
  hi: { name: 'Цвета — гистограмма', min: 2, max: 60, unit: '% различий ≤' },
  t: { name: 'Время съёмки', min: 1, max: 600, unit: 'сек между кадрами ≤' },
  em: { name: 'Нейросеть (CLIP)', min: 60, max: 99, unit: '% сходства ≥' },
};

export default function Settings({ value, onApply }) {
  const [s, setS] = useState(value);
  const setM = (k, patch) => setS({ ...s, m: { ...s.m, [k]: { ...s.m[k], ...patch } } });
  return (
    <div id="settings">
      {Object.entries(META).map(([k, m]) => (
        <div key={k} className="meth">
          <label><input type="checkbox" checked={s.m[k].on} onChange={e => setM(k, { on: e.target.checked })} /> {m.name}</label>
          <input type="range" min={m.min} max={m.max} value={s.m[k].thr} disabled={!s.m[k].on}
            onChange={e => setM(k, { thr: +e.target.value })} />
          <span>{m.unit} {s.m[k].thr}</span>
        </div>
      ))}
      <div className="meth">
        <label>Комбинация: <select value={s.mode} onChange={e => setS({ ...s, mode: e.target.value })}>
          <option value="and">все отмеченные (И)</option>
          <option value="or">любой из отмеченных (ИЛИ)</option>
        </select></label>
        <button onClick={() => onApply(s)}>Применить</button>
        {s.m.em.on && <small>Нейросеть: при первом запуске скачивается модель (~90 МБ)</small>}
      </div>
    </div>
  );
}
