import { useState, useEffect } from 'react';
import { t } from './i18n.jsx';

const api = window.api;
const KEY = 'modelToastHidden';
const hidden = () => { try { return localStorage.getItem(KEY) === '1'; } catch { return false; } };

// bottom-corner hint: offers to download the neural model, shows download progress
export default function ModelToast({ onReady }) {
  const [st, setSt] = useState(null); // null | need | dl | done | err
  const [pct, setPct] = useState(0);
  useEffect(() => {
    api.modelReady().then(r => !r && !hidden() && setSt('need'));
    api.onModelProgress(setPct);
  }, []);
  if (!st) return null;
  const download = async () => {
    if (st === 'dl' || st === 'done') return;
    setSt('dl'); setPct(0);
    const s = await api.downloadModel();
    if (!s) return setSt('err');
    setSt('done'); onReady(s);
    setTimeout(() => setSt(null), 4000);
  };
  const close = e => { e.stopPropagation(); setSt(null); try { localStorage.setItem(KEY, '1'); } catch {} };
  return (
    <div id="toast" onClick={download}>
      {st !== 'dl' && st !== 'done' && <span className="x" onClick={close}>×</span>}
      <div>{st === 'dl' ? t('dl', pct) : st === 'done' ? t('dlDone') : st === 'err' ? t('dlErr') : t('toast')}</div>
      {st === 'dl' && <div className="bar"><i style={{ width: pct + '%' }} /></div>}
    </div>
  );
}
