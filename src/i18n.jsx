import { useState } from 'react';

// keys: UI strings; {0},{1}… are placeholders
const D = {
  en: {
    clear: "Clear favorites", clearQ: "Remove all {0} favorites? Only the stars are cleared, files stay untouched.",
    magic: "✨ Magic mode", magicQ: "Analyze all folders with the current algorithm and mark as favorites every unique photo and one random photo from each group of similar ones? Folders that already have favorites are skipped.", magicRun: "Magic mode: {0}/{1} folders", magicDone: "Magic mode done: {0} favorites in {1} folders",
    pick: 'Choose folder / drive…', copy: 'Copy favorites…', algo: 'Similarity…', run: '▶ Analyze all folders', pause: '⏸ Pause analysis',
    analyzed: 'Analyzed folders: {0}/{1}', scanning: 'Scanning… photo folders: {0}', folders: 'Photo folders: {0}', grouping: 'Grouping…',
    processed: 'Processed: {0} favorites', noFavs: 'No favorite photos', copied: 'Copied: {0}\nAlready existed (skipped): {1}\nErrors: {2}\n→ {3}',
    copyTitle: 'Where to copy favorites', hint: 'Click: view · ★ or double click: favorite', errFeatures: 'Could not compute features (no network to download the model?)',
    m_dh: 'dHash: brightness gradient', m_ph: 'pHash: frequencies (DCT)', m_hi: 'Colors: histogram', m_t: 'Capture time', m_em: 'Neural network (CLIP)',
    u_bits: 'differing bits ≤', u_pct: '% difference ≤', u_sec: 'seconds apart ≤', u_sim: '% similarity ≥',
    combo: 'Combine:', and: 'all checked (AND)', or: 'any checked (OR)', apply: 'Apply',
    eta: 'Analyzing folder: {0}/{1} · ~{2} left', toast: 'A neural network can group photos more accurately. Click to download (~90 MB).',
    dl: 'Downloading neural network… {0}%', dlDone: 'Neural network ready and enabled', dlErr: 'Download failed, click to retry',
    size: 'Size', res: 'Resolution', taken: 'Taken', camera: 'Camera', lens: 'Lens', exposure: 'Exposure', gps: 'Location', scores: 'Vs first in group',
  },
  es: {
    clear: "Quitar favoritas", clearQ: "¿Quitar las {0} favoritas? Solo se borran las estrellas, los archivos no se tocan.",
    magic: "✨ Modo mágico", magicQ: "¿Analizar todas las carpetas con el algoritmo actual y marcar como favoritas las fotos únicas y una al azar de cada grupo de similares? Se omiten las carpetas que ya tienen favoritas.", magicRun: "Modo mágico: {0}/{1} carpetas", magicDone: "Modo mágico listo: {0} favoritas en {1} carpetas",
    pick: 'Elegir carpeta / disco…', copy: 'Copiar favoritas…', algo: 'Similitud…', run: '▶ Analizar todas', pause: '⏸ Pausar análisis',
    analyzed: 'Carpetas analizadas: {0}/{1}', scanning: 'Escaneando… carpetas con fotos: {0}', folders: 'Carpetas con fotos: {0}', grouping: 'Agrupando…',
    processed: 'Procesada: {0} favoritas', noFavs: 'No hay fotos favoritas', copied: 'Copiadas: {0}\nYa existían (omitidas): {1}\nErrores: {2}\n→ {3}',
    copyTitle: 'Dónde copiar las favoritas', hint: 'Clic: ver · ★ o doble clic: favorita', errFeatures: 'No se pudieron calcular rasgos (¿sin red para descargar el modelo?)',
    m_dh: 'dHash: gradiente de brillo', m_ph: 'pHash: frecuencias (DCT)', m_hi: 'Colores: histograma', m_t: 'Hora de captura', m_em: 'Red neuronal (CLIP)',
    u_bits: 'bits distintos ≤', u_pct: '% diferencia ≤', u_sec: 'segundos entre fotos ≤', u_sim: '% similitud ≥',
    combo: 'Combinar:', and: 'todas marcadas (Y)', or: 'cualquiera (O)', apply: 'Aplicar',
    eta: 'Analizando carpeta: {0}/{1} · ~{2} restante', toast: 'Una red neuronal puede agrupar fotos con más precisión. Clic para descargar (~90 MB).',
    dl: 'Descargando red neuronal… {0}%', dlDone: 'Red neuronal lista y activada', dlErr: 'Error de descarga, clic para reintentar',
    size: 'Tamaño', res: 'Resolución', taken: 'Fecha', camera: 'Cámara', lens: 'Objetivo', exposure: 'Exposición', gps: 'Ubicación', scores: 'Vs primera del grupo',
  },
  fr: {
    clear: "Effacer les favoris", clearQ: "Retirer les {0} favoris ? Seules les étoiles sont effacées, les fichiers restent intacts.",
    magic: "✨ Mode magique", magicQ: "Analyser tous les dossiers avec l’algorithme actuel et marquer en favori chaque photo unique et une photo au hasard de chaque groupe similaire ? Les dossiers ayant déjà des favoris sont ignorés.", magicRun: "Mode magique : {0}/{1} dossiers", magicDone: "Mode magique terminé : {0} favoris dans {1} dossiers",
    pick: 'Choisir dossier / disque…', copy: 'Copier les favoris…', algo: 'Similarité…', run: '▶ Analyser tous', pause: '⏸ Pause analyse',
    analyzed: 'Dossiers analysés : {0}/{1}', scanning: 'Analyse… dossiers photo : {0}', folders: 'Dossiers photo : {0}', grouping: 'Regroupement…',
    processed: 'Traité : {0} favoris', noFavs: 'Aucune photo favorite', copied: 'Copiées : {0}\nDéjà présentes (ignorées) : {1}\nErreurs : {2}\n→ {3}',
    copyTitle: 'Où copier les favoris', hint: 'Clic : voir · ★ ou double-clic : favori', errFeatures: 'Calcul impossible (pas de réseau pour télécharger le modèle ?)',
    m_dh: 'dHash : gradient de luminosité', m_ph: 'pHash : fréquences (DCT)', m_hi: 'Couleurs : histogramme', m_t: 'Heure de prise', m_em: 'Réseau neuronal (CLIP)',
    u_bits: 'bits différents ≤', u_pct: '% différence ≤', u_sec: 'secondes d’écart ≤', u_sim: '% similarité ≥',
    combo: 'Combiner :', and: 'tous cochés (ET)', or: 'n’importe lequel (OU)', apply: 'Appliquer',
    eta: 'Analyse du dossier : {0}/{1} · ~{2} restant', toast: 'Un réseau neuronal peut regrouper les photos plus précisément. Cliquez pour télécharger (~90 Mo).',
    dl: 'Téléchargement du réseau… {0} %', dlDone: 'Réseau neuronal prêt et activé', dlErr: 'Échec, cliquez pour réessayer',
    size: 'Taille', res: 'Résolution', taken: 'Prise', camera: 'Appareil', lens: 'Objectif', exposure: 'Exposition', gps: 'Lieu', scores: 'Vs première du groupe',
  },
  ru: {
    clear: "Сбросить избранные", clearQ: "Сбросить все избранные ({0})? Снимаются только звёздочки, файлы не трогаются.",
    magic: "✨ Magic mode", magicQ: "Обработать все папки текущим алгоритмом и сделать избранными все одиночные фото и по одному случайному из каждой группы похожих? Папки, где уже есть избранные, пропускаются.", magicRun: "Magic mode: {0}/{1} папок", magicDone: "Magic mode готово: {0} избранных в {1} папках",
    pick: 'Выбрать папку / диск…', copy: 'Копировать избранные…', algo: 'Похожесть…', run: '▶ Анализ всех папок', pause: '⏸ Пауза анализа',
    analyzed: 'Проанализировано папок: {0}/{1}', scanning: 'Сканирование… папок с фото: {0}', folders: 'Папок с фото: {0}', grouping: 'Группировка…',
    processed: 'Обработана: избранных {0}', noFavs: 'Нет избранных фото', copied: 'Скопировано: {0}\nУже существовало (пропущено): {1}\nОшибок: {2}\n→ {3}',
    copyTitle: 'Куда копировать избранные', hint: 'Клик: просмотр · ★ или двойной клик: избранное', errFeatures: 'Не удалось вычислить признаки (нет сети для загрузки модели?)',
    m_dh: 'dHash: градиент яркости', m_ph: 'pHash: частоты (DCT)', m_hi: 'Цвета: гистограмма', m_t: 'Время съёмки', m_em: 'Нейросеть (CLIP)',
    u_bits: 'бит различий ≤', u_pct: '% различий ≤', u_sec: 'сек между кадрами ≤', u_sim: '% сходства ≥',
    combo: 'Комбинация:', and: 'все отмеченные (И)', or: 'любой (ИЛИ)', apply: 'Применить',
    eta: 'Анализ папки: {0}/{1} · ~{2} осталось', toast: 'Нейросеть группирует фото точнее. Нажмите, чтобы скачать (~90 МБ).',
    dl: 'Загрузка нейросети… {0}%', dlDone: 'Нейросеть готова и включена', dlErr: 'Ошибка загрузки, нажмите для повтора',
    size: 'Размер', res: 'Разрешение', taken: 'Снято', camera: 'Камера', lens: 'Объектив', exposure: 'Экспозиция', gps: 'Место', scores: 'Против первого в группе',
  },
  ar: {
    clear: "مسح المفضلة", clearQ: "إزالة كل المفضلة ({0})؟ تُزال النجوم فقط ولا تُمس الملفات.",
    magic: "✨ الوضع السحري", magicQ: "تحليل كل المجلدات بالخوارزمية الحالية وتعليم كل صورة فريدة وصورة عشوائية من كل مجموعة متشابهة كمفضلة؟ يتم تخطي المجلدات التي بها مفضلة.", magicRun: "الوضع السحري: {0}/{1} مجلد", magicDone: "اكتمل الوضع السحري: {0} مفضلة في {1} مجلد",
    pick: 'اختر مجلدًا / قرصًا…', copy: 'نسخ المفضلة…', algo: 'التشابه…', run: '▶ تحليل كل المجلدات', pause: '⏸ إيقاف التحليل',
    analyzed: 'المجلدات المحللة: {0}/{1}', scanning: 'جارٍ الفحص… مجلدات الصور: {0}', folders: 'مجلدات الصور: {0}', grouping: 'جارٍ التجميع…',
    processed: 'تمت المعالجة: {0} مفضلة', noFavs: 'لا توجد صور مفضلة', copied: 'تم النسخ: {0}\nموجودة مسبقًا (تخطي): {1}\nأخطاء: {2}\n← {3}',
    copyTitle: 'مكان نسخ المفضلة', hint: 'نقرة: عرض · ★ أو نقرتان: مفضلة', errFeatures: 'تعذر حساب الخصائص (لا يوجد اتصال لتنزيل النموذج؟)',
    m_dh: 'dHash: تدرج السطوع', m_ph: 'pHash: الترددات (DCT)', m_hi: 'الألوان: مدرج تكراري', m_t: 'وقت الالتقاط', m_em: 'شبكة عصبية (CLIP)',
    u_bits: 'بتات مختلفة ≤', u_pct: '% اختلاف ≤', u_sec: 'ثوانٍ بين اللقطات ≤', u_sim: '% تشابه ≥',
    combo: 'الدمج:', and: 'كل المحدد (و)', or: 'أي محدد (أو)', apply: 'تطبيق',
    eta: 'تحليل المجلد: {0}/{1} · ~{2} متبقٍ', toast: 'يمكن للشبكة العصبية تجميع الصور بدقة أكبر. انقر للتنزيل (~90 م.ب).',
    dl: 'جارٍ تنزيل الشبكة العصبية… {0}%', dlDone: 'الشبكة العصبية جاهزة ومفعلة', dlErr: 'فشل التنزيل، انقر لإعادة المحاولة',
    size: 'الحجم', res: 'الدقة', taken: 'التاريخ', camera: 'الكاميرا', lens: 'العدسة', exposure: 'التعريض', gps: 'الموقع', scores: 'مقارنة بأول صورة',
  },
  zh: {
    clear: "清除收藏", clearQ: "清除全部 {0} 个收藏？只清除星标，文件不受影响。",
    magic: "✨ 魔法模式", magicQ: "用当前算法分析所有文件夹，将每张独特照片以及每组相似照片中随机一张设为收藏？已有收藏的文件夹将被跳过。", magicRun: "魔法模式：{0}/{1} 个文件夹", magicDone: "魔法模式完成：{1} 个文件夹中 {0} 张收藏",
    pick: '选择文件夹 / 磁盘…', copy: '复制收藏…', algo: '相似度…', run: '▶ 分析所有文件夹', pause: '⏸ 暂停分析',
    analyzed: '已分析文件夹：{0}/{1}', scanning: '扫描中… 照片文件夹：{0}', folders: '照片文件夹：{0}', grouping: '分组中…',
    processed: '已处理：{0} 张收藏', noFavs: '没有收藏的照片', copied: '已复制：{0}\n已存在（跳过）：{1}\n错误：{2}\n→ {3}',
    copyTitle: '收藏复制到', hint: '单击：查看 · ★ 或双击：收藏', errFeatures: '无法计算特征（无网络下载模型？）',
    m_dh: 'dHash：亮度梯度', m_ph: 'pHash：频率 (DCT)', m_hi: '颜色：直方图', m_t: '拍摄时间', m_em: '神经网络 (CLIP)',
    u_bits: '不同位 ≤', u_pct: '% 差异 ≤', u_sec: '间隔秒数 ≤', u_sim: '% 相似 ≥',
    combo: '组合：', and: '全部勾选（与）', or: '任一勾选（或）', apply: '应用',
    eta: '分析文件夹：{0}/{1} · 约剩 {2}', toast: '神经网络可以更准确地分组照片。点击下载（约 90 MB）。',
    dl: '正在下载神经网络… {0}%', dlDone: '神经网络已就绪并启用', dlErr: '下载失败，点击重试',
    size: '大小', res: '分辨率', taken: '拍摄于', camera: '相机', lens: '镜头', exposure: '曝光', gps: '位置', scores: '与组内首张比较',
  },
};

let lang = 'en';
try { lang = localStorage.getItem('lang') || 'en'; } catch {}
export const t = (k, ...a) => (D[lang][k] ?? D.en[k] ?? k).replace(/\{(\d)\}/g, (_, i) => a[i]);
export const getLang = () => lang;
const applyDir = () => { document.documentElement.lang = lang; document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'; };
applyDir();

const F = {
  en: <><rect width="18" height="12" fill="#012169" /><path d="M0 0l18 12M18 0L0 12" stroke="#fff" strokeWidth="2.4" /><path d="M0 0l18 12M18 0L0 12" stroke="#C8102E" strokeWidth="1" /><path d="M9 0v12M0 6h18" stroke="#fff" strokeWidth="4" /><path d="M9 0v12M0 6h18" stroke="#C8102E" strokeWidth="2.2" /></>,
  es: <><rect width="18" height="12" fill="#AA151B" /><rect y="3" width="18" height="6" fill="#F1BF00" /></>,
  fr: <><rect width="18" height="12" fill="#fff" /><rect width="6" height="12" fill="#002395" /><rect x="12" width="6" height="12" fill="#ED2939" /></>,
  ru: <><rect width="18" height="12" fill="#fff" /><rect y="4" width="18" height="4" fill="#0039A6" /><rect y="8" width="18" height="4" fill="#D52B1E" /></>,
  ar: <><rect width="18" height="12" fill="#006C35" /><rect x="4" y="7.5" width="10" height="1" fill="#fff" /><rect x="4" y="4" width="10" height="1.5" fill="#fff" opacity=".7" /></>,
  zh: <><rect width="18" height="12" fill="#DE2910" /><path d="M3.5 1.5l.9 2.6h2.7l-2.2 1.6.8 2.6-2.2-1.6-2.2 1.6.8-2.6L.0 4.1h2.7z" fill="#FFDE00" transform="translate(.6 .4) scale(.9)" /></>,
};
const NAMES = { en: 'English', es: 'Español', fr: 'Français', ru: 'Русский', ar: 'العربية', zh: '中文' };
const Flag = ({ l }) => <svg width="18" height="12" viewBox="0 0 18 12">{F[l]}</svg>;

export function LangSwitch({ onChange }) {
  const [open, setOpen] = useState(false);
  const set = l => { lang = l; try { localStorage.setItem('lang', l); } catch {} applyDir(); setOpen(false); onChange(l); };
  return (
    <div id="lang">
      <button title={NAMES[lang]} onClick={() => setOpen(!open)}><Flag l={lang} /></button>
      {open && <div className="menu">{Object.keys(NAMES).map(l => <div key={l} onClick={() => set(l)}><Flag l={l} /> {NAMES[l]}</div>)}</div>}
    </div>
  );
}
