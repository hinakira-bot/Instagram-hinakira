import React, { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Copy, Sparkles, Type, Image as ImageIcon, User, Palette, MonitorPlay, Check,
  Layout, List, FileText, Plus, Trash2, Instagram, Smile, MessageCircle,
  AlignLeft, AlignRight, AlignCenter, MousePointerClick, LayoutTemplate,
  Upload, X, Info, BoxSelect, Highlighter, Maximize, MinusSquare, Droplets,
  Layers, ArrowUpLeft, ArrowUpRight, ArrowDownLeft, ArrowDownRight,
  Settings, Download, Loader2, AlertCircle, Wand2, Eye, EyeOff, RefreshCw,
  ChevronDown, ArrowRight, Hash, Award, Star, Zap, Grid3x3, Columns, Square,
  BookOpenText, Link, StickyNote
} from 'lucide-react';
import { generateImage, generateImageWithReference, generateImageWithMultipleReferences, generatePostStructure, generateCaption, generateThreadsPosts, regenerateThreadsPost, generateBlogArticle, generateNoteArticle, fetchArticleFromUrl, extractArticleFromFile, generateBlogImagePrompts, generateBlogImage } from './geminiClient';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

// --- データ定義 ---
const THEMES = {
  tech_gadget: {
    name: 'テック・ガジェット',
    bg: 'dark matte workspace, neon blue rim light, sleek gadgets layout',
    atmosphere: 'tech-savvy, futuristic, professional, dark mode style',
    colors: { text: 'text-white', band: 'bg-blue-600', bg: 'from-slate-900 to-black', accent: 'text-blue-400' }
  },
  business_clean: {
    name: 'ビジネス・信頼',
    bg: 'blurred office background, geometric blue overlays',
    atmosphere: 'trustworthy, informative, corporate, educational',
    colors: { text: 'text-white', band: 'bg-navy-900', bg: 'from-blue-50 to-white', accent: 'text-blue-800' }
  },
  modern_lifestyle: {
    name: 'モダン・クリーン',
    bg: 'clean white marble background, soft shadows, minimalist style',
    atmosphere: 'aesthetic, clean, minimalist, high key lighting, instagrammable',
    colors: { text: 'text-slate-800', band: 'bg-stone-200', bg: 'from-stone-50 to-stone-100', accent: 'text-stone-600' }
  },
  pop_color: {
    name: 'ポップ・カラフル',
    bg: 'solid pastel color background, memphis pattern elements',
    atmosphere: 'energetic, playful, gen-z aesthetic, bold colors',
    colors: { text: 'text-slate-900', band: 'bg-yellow-400', bg: 'from-pink-200 to-yellow-100', accent: 'text-pink-600' }
  },
};

const FONT_STYLES = [
  { id: 'bold_sans', name: '太字ゴシック', prompt: 'heavy bold sans-serif typography, impact font', css: 'font-sans font-black' },
];

// --- 表紙3層デザイン定義 ---
const COVER_LAYOUTS = [
  { id: 'frame_title', name: 'デコ＋タイトル', icon: Layout, prompt: 'Clean white background with decorative organic wave/blob shapes in the light blue (#BDE8F5) at the top and bottom edges — like flowing water or soft clouds. Use a navy-blue color palette: dark navy (#0F2854), medium blue (#1C4D8D), blue (#4988C4), and light blue (#BDE8F5). The subtitle (in a clean outlined rounded box with blue border) is placed in the upper-center area. The main title is SUPER LARGE, EXTRA BOLD with visible dark navy (#0F2854) outline/stroke around each character (outlined text style), using medium blue (#1C4D8D) or blue (#4988C4) as fill — centered in the middle, dominant and attention-grabbing. The character (chibi style) is at the bottom-left. "Swipe >>>" small text at the bottom-right. Eye-catch badge at top area if enabled. The overall feel is clean, trustworthy, and professional with a blue color scheme.' },
  { id: 'band', name: '帯', icon: Maximize, prompt: 'Text on a distinct solid colored horizontal banner strip across the image' },
  { id: 'pop_frame', name: 'ポップ枠', icon: Layers, prompt: 'Pop style design with a white inner frame border, decorative elements and bold layout' },
  { id: 'card', name: 'カード型', icon: Square, prompt: 'A centered white/light card panel floating on the full-bleed background image. Text is inside the card with rounded corners and shadow. Background visible around the card edges' },
];

const TITLE_DESIGNS = [
  { id: 'bold_fill', name: '太字塗り', icon: Type, prompt: 'Extra bold filled title text in the main theme color. Solid color fill, heavy weight, clean and professional with no effects. Business-grade bold sans-serif typography with strong presence.' },
  { id: 'shadow', name: 'ドロップシャドウ', icon: Type, prompt: 'Bold text with strong dramatic drop shadow for depth and impact' },
  { id: 'frame', name: '枠文字', icon: BoxSelect, prompt: 'Title text with THICK visible dark navy (#0F2854) outline/stroke around each character. The text fill color is blue (#4988C4) or medium blue (#1C4D8D) while the outline is dark navy. This creates a bold, pop, eye-catching outlined typography effect — like manga or anime title styling. Very heavy weight, impactful.' },
  { id: 'gradient', name: 'グラデーション', icon: Palette, prompt: 'Text with gradient color fill effect, colorful typography' },
];

const SUBTITLE_DESIGNS = [
  { id: 'outline_box', name: '枠囲み', icon: BoxSelect, prompt: 'Subtitle enclosed in a rectangular outlined box/border (not filled, just a thin border stroke in the main theme color) with clean professional styling. The box has slightly rounded corners. Text is centered inside.' },
  { id: 'pill', name: 'ピル型', icon: MessageCircle, prompt: 'Subtitle in a rounded pill/capsule shaped badge with shadow' },
  { id: 'tag', name: 'タグ風', icon: FileText, prompt: 'Subtitle styled as a tag/label with angled left edge, like a price tag' },
  { id: 'marker', name: 'マーカー', icon: Highlighter, prompt: 'Subtitle text placed ON TOP of a bold, slightly diagonal/slanted highlighter marker stroke. The marker stroke is a wide, semi-transparent brush stroke in the theme accent color, tilted about 3-5 degrees. The subtitle text sits directly on top of the marker stroke in contrasting color, clearly readable. The marker has hand-drawn rough edges like a real highlighter pen stroke.' },
];

const BG_IMAGE_STYLES = [
  { id: 'marble', name: '大理石', prompt: 'elegant white and grey marble stone texture background, luxury natural pattern' },
  { id: 'nature', name: '自然', prompt: 'lush green nature background, soft bokeh leaves and sunlight, fresh outdoor' },
  { id: 'city', name: '都市', prompt: 'blurred city skyline background, soft bokeh lights, urban atmosphere' },
  { id: 'abstract', name: '抽象', prompt: 'abstract colorful gradient background, smooth flowing shapes, modern art' },
  { id: 'texture', name: 'テクスチャ', prompt: 'subtle fabric linen texture background, clean muted tones, minimalist' },
  { id: 'wood', name: '木目', prompt: 'warm natural wood grain texture background, rustic table top surface' },
  { id: 'sky', name: '空', prompt: 'beautiful clear blue sky with soft white clouds, dreamy atmosphere' },
];

const DEFAULT_SECTION_BG = { type: null, color: '#E2E8F0', image: null, imageStyle: null, desc: '' };

// --- 表紙追加オプション定義 ---
const SWIPE_GUIDES = [
  { id: 'none', name: 'なし', prompt: '' },
  { id: 'swipe_arrow', name: 'スワイプ矢印', prompt: 'A "Swipe ▸▸" or "スワイプ ▸▸" indicator with stylish triangle arrows at the bottom-right to encourage swiping' },
];

const EYE_CATCH_BADGES = [
  { id: 'none', name: 'なし', prompt: '' },
  { id: 'label', name: 'ラベル', prompt: 'A decorative label badge like "保存版" "完全攻略" "初心者OK" "永久保存版" in a rounded badge/chip placed at the TOP area of the cover (upper-left or upper-right corner)' },
];

const TITLE_EMPHASIS_OPTIONS = [
  { id: 'none', name: '均一', prompt: '' },
  { id: 'keyword_large', name: 'キーワード特大', prompt: 'The most important keyword/number in the title should be displayed 2-3x larger than the rest of the title text, creating dramatic size contrast for visual hierarchy' },
];

// --- 見出しスタイル定義（導入・コンテンツ・まとめ共通） ---
const HEADING_STYLES = [
  { id: 'band_full', name: '上部帯（端まで）', icon: Maximize, prompt: 'Header band pinned to the very top edge with NO top margin — a solid colored rectangular strip spanning the full width (edge-to-edge, zero margin on all sides of the band). The heading text is bold white, centered inside the band.' },
  { id: 'band_inset', name: '上部帯（余白あり）', icon: Square, prompt: 'Header band near the top WITH margin/padding — a solid colored rectangular strip with rounded corners, inset from the left and right edges (about 5% margin on each side), with a small top margin (about 3%). The heading text is bold white, centered inside the band. Looks like a floating label card.' },
];

// --- コンテンツボックススタイル定義 ---
const CONTENT_BOX_STYLES = [
  { id: 'none', name: 'なし', prompt: 'No background box or frame for the content area. Text and image are placed directly on the slide background.' },
  { id: 'white_full', name: '白ボックス（全体）', prompt: 'The entire content area below the heading band is covered by a large white/light semi-transparent background box (rounded corners, subtle shadow). All content (image + text) sits inside this single unified white box.' },
  { id: 'white_frame', name: '白ボックス（外枠）', prompt: 'The content area below the heading band has a white/light bordered frame — a visible border/outline (not filled solid) with rounded corners creating an elegant card-like frame. Content sits inside this outlined frame.' },
];

const POSITIONS = [
  { id: 'top_left', icon: ArrowUpLeft, label: '左上' },
  { id: 'top_right', icon: ArrowUpRight, label: '右上' },
  { id: 'bottom_left', icon: ArrowDownLeft, label: '左下' },
  { id: 'bottom_right', icon: ArrowDownRight, label: '右下' },
];

// --- カラーユーティリティ ---
function hexToRgb(hex) {
  const c = hex.replace('#', '');
  return { r: parseInt(c.substring(0, 2), 16), g: parseInt(c.substring(2, 4), 16), b: parseInt(c.substring(4, 6), 16) };
}
function rgbToHex(r, g, b) {
  const h = (c) => Math.max(0, Math.min(255, Math.round(c))).toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`;
}
function lightenColor(hex, amount) {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHex(r + (255 - r) * amount, g + (255 - g) * amount, b + (255 - b) * amount);
}
function darkenColor(hex, amount) {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHex(r * (1 - amount), g * (1 - amount), b * (1 - amount));
}
function isLightColor(hex) {
  const { r, g, b } = hexToRgb(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6;
}

// --- サブコンポーネント ---

/** ヘルプチップ — ℹ アイコンをクリックすると説明がトグル表示 */
const HelpTip = ({ text }) => {
  const [open, setOpen] = useState(false);
  const btnRef = useRef(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 4, left: rect.left });
    }
  }, [open]);

  // 画面外にはみ出す場合の補正
  useEffect(() => {
    if (!open) return;
    const handleScroll = () => setOpen(false);
    window.addEventListener('scroll', handleScroll, true);
    return () => window.removeEventListener('scroll', handleScroll, true);
  }, [open]);

  return (
    <span className="inline-flex items-center ml-1">
      <span
        ref={btnRef}
        role="button"
        tabIndex={0}
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); setOpen(!open); } }}
        className="w-3.5 h-3.5 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-500 flex items-center justify-center text-[9px] font-bold leading-none transition-colors cursor-pointer"
        aria-label="ヘルプ"
      >?</span>
      {open && createPortal(
        <div
          style={{ position: 'fixed', top: pos.top, left: Math.min(pos.left, window.innerWidth - 240), zIndex: 99999 }}
          className="w-56 p-2 bg-slate-800 text-white text-[10px] leading-relaxed rounded-lg shadow-lg"
        >
          {text}
          <div className="absolute -top-1 left-1.5 w-2 h-2 bg-slate-800 rotate-45" />
        </div>,
        document.body
      )}
    </span>
  );
};

/** 小型画像アップロードUI（キャラ画像・参考画像の共通コンポーネント） */
const MiniImageUpload = ({ label, icon: IconComp, image, setImage, accentColor = 'pink' }) => {
  // setImageの最新参照を保持（非同期コールバック内で古いクロージャにならないように）
  const setImageRef = useRef(setImage);
  setImageRef.current = setImage;

  const colors = {
    pink: { bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-500', hover: 'hover:bg-slate-100' },
    blue: { bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-500', hover: 'hover:bg-slate-100' },
  }[accentColor] || { bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-500', hover: 'hover:bg-slate-100' };

  const handleFileSelect = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setImageRef.current(reader.result);
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  return (
    <div className={`${colors.bg} p-2 rounded-lg border ${colors.border}`}>
      <div className="flex items-center gap-1.5 mb-1.5">
        <IconComp className={`w-3.5 h-3.5 ${colors.text}`} />
        <span className="text-[10px] font-bold text-slate-500">{label}</span>
      </div>
      <div
        className={`border border-dashed ${colors.border} bg-white rounded-md cursor-pointer ${colors.hover} transition-colors overflow-hidden`}
        onClick={handleFileSelect}
      >
        {image ? (
          <div className="relative h-20 flex items-center justify-center p-1">
            <img src={image} alt="" className="h-full object-contain rounded" />
            <button
              onClick={(e) => { e.stopPropagation(); setImageRef.current(null); }}
              className="absolute top-1 right-1 bg-red-500 text-white p-0.5 rounded-full shadow-md hover:bg-red-600"
            >
              <X className="w-2.5 h-2.5" />
            </button>
          </div>
        ) : (
          <div className="py-2 text-center">
            <Upload className={`w-4 h-4 ${colors.text} mx-auto mb-0.5`} />
            <p className={`text-[9px] ${colors.text} font-bold`}>画像を選択</p>
          </div>
        )}
      </div>
    </div>
  );
};

/** 参考画像アップロードUI（テイスト参考用） */
const RefImageUpload = ({ refImage, setRefImage }) => (
  <MiniImageUpload
    label="参考画像（テイスト参考） ※色味やレイアウトの参考にしたい画像をアップロード"
    icon={ImageIcon}
    image={refImage}
    setImage={setRefImage}
    accentColor="blue"
  />
);

/** セクション別背景設定UI */
const SectionBgSettings = ({ bg, setBg, frameColor }) => {
  const isCustom = bg.type !== null;
  const currentType = bg.type || 'theme';

  const updateBg = (field, value) => {
    setBg({ ...bg, [field]: value });
  };

  return (
    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 mt-2 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Palette className="w-3.5 h-3.5 text-slate-500" />
          <span className="text-[10px] font-bold text-slate-500">背景設定<HelpTip text="このスライド固有の背景を設定できます。「個別設定ON」にすると全体設定とは別の背景を使えます。OFFの場合はグローバル設定に従います。" /></span>
        </div>
        <button
          onClick={() => updateBg('type', isCustom ? null : 'theme')}
          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition-all ${
            isCustom ? 'bg-blue-50 border-blue-400 text-blue-700' : 'bg-white border-slate-200 text-slate-400'
          }`}
        >
          {isCustom ? '個別設定ON' : 'グローバル設定'}
        </button>
      </div>

      {isCustom && (
        <div className="space-y-2">
          <div className="grid grid-cols-5 gap-1">
            {[
              { id: 'white', label: '白' },
              { id: 'solid', label: '無地' },
              { id: 'theme', label: 'テーマ' },
              { id: 'frame', label: '枠+白' },
              { id: 'image', label: '画像' },
            ].map(opt => (
              <button
                key={opt.id}
                onClick={() => updateBg('type', opt.id)}
                className={`py-1 rounded text-[10px] font-bold border transition-all ${
                  currentType === opt.id
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-slate-200 text-slate-400 hover:bg-slate-50'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {currentType === 'solid' && (
            <div className="flex items-center gap-2">
              <input type="color" value={bg.color || '#E2E8F0'} onChange={(e) => updateBg('color', e.target.value)} className="w-6 h-6 rounded cursor-pointer border-none" />
              <input type="text" value={bg.color || '#E2E8F0'} onChange={(e) => updateBg('color', e.target.value)} className="flex-1 text-[10px] border border-slate-200 rounded px-2 py-1 uppercase font-mono" />
            </div>
          )}

          {currentType === 'frame' && (
            <div className="flex items-center gap-2 p-1.5 bg-white rounded border border-slate-200">
              <div className="w-8 aspect-[4/5] rounded border-[2px] bg-white" style={{ borderColor: frameColor }}></div>
              <span className="text-[9px] text-slate-400">枠カラー: {frameColor}</span>
            </div>
          )}

          {currentType === 'image' && (
            <div className="space-y-2">
              <MiniImageUpload
                label="背景画像"
                icon={ImageIcon}
                image={bg.image}
                setImage={(v) => updateBg('image', v)}
                accentColor="blue"
              />
              <div className="flex items-center gap-1.5">
                <div className="flex-1 border-t border-slate-200"></div>
                <span className="text-[8px] text-slate-400 font-bold">または AIスタイル</span>
                <div className="flex-1 border-t border-slate-200"></div>
              </div>
              <div className="grid grid-cols-4 gap-1">
                {BG_IMAGE_STYLES.map(style => (
                  <button
                    key={style.id}
                    onClick={() => updateBg('imageStyle', bg.imageStyle === style.id ? null : style.id)}
                    className={`py-1 px-0.5 rounded text-[9px] font-bold border transition-all ${
                      bg.imageStyle === style.id
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-slate-200 text-slate-400 hover:bg-slate-50'
                    }`}
                  >
                    {style.name}
                  </button>
                ))}
              </div>
              {bg.image && bg.imageStyle && (
                <p className="text-[8px] text-slate-500 bg-slate-50 p-1 rounded">アップロード画像が優先されます</p>
              )}
            </div>
          )}

          {/* 背景の特徴テキスト入力 */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 block mb-1">背景の特徴・詳細</label>
            <textarea
              value={bg.desc || ''}
              onChange={(e) => updateBg('desc', e.target.value)}
              placeholder="例: 桜が舞う春の公園、夕焼けのビーチ、カフェの内装..."
              className="w-full text-[11px] p-2 border border-slate-200 rounded-lg focus:border-emerald-500 outline-none resize-none bg-white"
              rows={2}
            />
          </div>
        </div>
      )}
    </div>
  );
};

/** スライドごとの表情設定UI（シンプル版） */
const SlideCharExpUI = ({ exp, setExp, bubble, setBubble, bubbleText, setBubbleText }) => (
  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 mt-2 space-y-2">
    <div className="flex items-center gap-2">
      <Smile className="w-3.5 h-3.5 text-slate-500" />
      <span className="text-[10px] font-bold text-slate-500">このスライドの表情<HelpTip text="このスライドでのキャラクターの表情・ポーズを指定します。例：「笑顔で指差し」「困った顔」「サムズアップ」など。" /></span>
    </div>
    <input
      type="text"
      value={exp || ''}
      onChange={(e) => setExp(e.target.value)}
      placeholder="例: 笑顔で指差し"
      className="w-full bg-white border border-slate-200 rounded px-2 py-1.5 text-sm outline-none focus:border-blue-400 placeholder:text-slate-300"
    />
    {setBubble && (
      <div className="flex items-center gap-2">
        <button
          onClick={() => setBubble(!bubble)}
          className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs border transition-all ${
            bubble ? 'bg-blue-50 border-blue-200 text-blue-600 font-bold' : 'bg-white border-slate-200 text-slate-500'
          }`}
        >
          <MessageCircle className={`w-3 h-3 ${bubble ? 'fill-current' : ''}`} />
          ふきだし {bubble ? 'ON' : 'OFF'}
        </button>
        {bubble && (
          <input
            type="text"
            value={bubbleText || ''}
            onChange={(e) => setBubbleText(e.target.value)}
            placeholder="セリフを入力..."
            className="flex-1 bg-white border border-slate-200 rounded px-2 py-1 text-xs outline-none focus:border-blue-400"
          />
        )}
      </div>
    )}
  </div>
);

export default function InstaFeedMaker() {
  // --- State ---
  const [selectedTheme, setSelectedTheme] = useState('tech_gadget');
  const [fontStyle, setFontStyle] = useState('bold_sans');
  const [globalTextAlign, setGlobalTextAlign] = useState('center');
  const [headingStyle, setHeadingStyle] = useState('band_full');
  const [contentBoxStyle, setContentBoxStyle] = useState('white_full');
  const [bgType, setBgType] = useState('white');
  const [customBgColor, setCustomBgColor] = useState('#E2E8F0');
  const [bgDesc, setBgDesc] = useState('');

  const [useCustomMainColor, setUseCustomMainColor] = useState(true);
  const [customMainColor, setCustomMainColor] = useState('#1C4D8D');

  const [useCharacter, setUseCharacter] = useState(true);
  const [characterSource, setCharacterSource] = useState('upload');
  const [characterDesc, setCharacterDesc] = useState('ちびキャラスタイルのイラスト風日本人女性、デフォルメされた可愛い頭身、明るい笑顔、カジュアルで可愛らしい服装');
  const [uploadedImage, setUploadedImage] = useState(() => { try { return localStorage.getItem('default_char_image') || null; } catch { return null; } });
  const [characterSize, setCharacterSize] = useState('chibi');
  const [globalCharPos, setGlobalCharPos] = useState('bottom_left');

  // キャラ画像を圧縮してlocalStorageに永続保存
  const compressAndStoreImage = useCallback((dataUrl) => {
    const img = new window.Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const MAX = 512;
      let w = img.width, h = img.height;
      if (w > MAX || h > MAX) {
        if (w > h) { h = Math.round(h * MAX / w); w = MAX; }
        else { w = Math.round(w * MAX / h); h = MAX; }
      }
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      const compressed = canvas.toDataURL('image/jpeg', 0.7);
      try {
        localStorage.setItem('default_char_image', compressed);
      } catch (e) {
        console.warn('localStorage保存失敗（容量不足）:', e);
      }
    };
    img.src = dataUrl;
  }, []);

  useEffect(() => {
    if (uploadedImage && characterSource === 'upload') {
      compressAndStoreImage(uploadedImage);
    }
  }, [uploadedImage, characterSource, compressAndStoreImage]);

  // 参考画像を圧縮してlocalStorageに保存する汎用関数
  const compressAndStoreRef = useCallback((storageKey, dataUrl) => {
    if (!dataUrl) {
      try { localStorage.removeItem(storageKey); } catch {}
      return;
    }
    const img = new window.Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const MAX = 512;
      let w = img.width, h = img.height;
      if (w > MAX || h > MAX) {
        if (w > h) { h = Math.round(h * MAX / w); w = MAX; }
        else { w = Math.round(w * MAX / h); h = MAX; }
      }
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      const compressed = canvas.toDataURL('image/jpeg', 0.7);
      try {
        localStorage.setItem(storageKey, compressed);
      } catch (e) {
        console.warn('localStorage保存失敗（容量不足）:', e);
      }
    };
    img.src = dataUrl;
  }, []);

  const [coverTitle, setCoverTitle] = useState('AI時代の\n最強スキルを\n完全解説');
  const [coverSubtitle, setCoverSubtitle] = useState('初心者でもOK！');
  const [coverLayout, setCoverLayout] = useState('frame_title');
  const [titleDesign, setTitleDesign] = useState('frame');
  const [subtitleDesign, setSubtitleDesign] = useState('marker');
  const [swipeGuide, setSwipeGuide] = useState('none');
  const [eyeCatchBadge, setEyeCatchBadge] = useState('label');
  const [titleEmphasis, setTitleEmphasis] = useState('keyword_large');
  const [coverCharExp, setCoverCharExp] = useState('自信満々な笑顔で指差し');
  const [coverBubble, setCoverBubble] = useState(false);
  const [coverBubbleText, setCoverBubbleText] = useState('保存必須！');
  const [coverRefImage, setCoverRefImage] = useState(() => { try { return localStorage.getItem('default_cover_ref') || null; } catch { return null; } });
  const [coverRefImage2, setCoverRefImage2] = useState(() => { try { return localStorage.getItem('default_cover_ref2') || null; } catch { return null; } });

  // 表紙参考画像をlocalStorageに永続保存
  useEffect(() => {
    compressAndStoreRef('default_cover_ref', coverRefImage);
  }, [coverRefImage, compressAndStoreRef]);
  useEffect(() => {
    compressAndStoreRef('default_cover_ref2', coverRefImage2);
  }, [coverRefImage2, compressAndStoreRef]);

  const [introText, setIntroText] = useState('「AIって難しそう...」\n「何から始めればいい？」\n\nそんな悩みを一気に解決！\n初心者でも今日から使える\n実践メソッドを完全公開します\n\n最後まで読めば、あなたも\nAIマスターに！');
  const [introCharExp, setIntroCharExp] = useState('困った顔で悩んでいるポーズ');
  const [introBubble, setIntroBubble] = useState(false);
  const [introBubbleText, setIntroBubbleText] = useState('');
  const [introSwipe, setIntroSwipe] = useState(true);
  const [introRefImage, setIntroRefImage] = useState(() => { try { return localStorage.getItem('default_intro_ref') || null; } catch { return null; } });

  // 導入キャラ個別設定
  const [introCharImage, setIntroCharImage] = useState(() => { try { return localStorage.getItem('default_intro_char') || null; } catch { return null; } });
  const [introCharDesc, setIntroCharDesc] = useState('ちびキャラスタイルのイラスト風日本人女性、困っている表情、悩んでいるポーズ');

  // 導入キャラ画像をlocalStorageに永続保存
  useEffect(() => {
    compressAndStoreRef('default_intro_char', introCharImage);
  }, [introCharImage, compressAndStoreRef]);

  // 導入参考画像をlocalStorageに永続保存
  useEffect(() => {
    compressAndStoreRef('default_intro_ref', introRefImage);
  }, [introRefImage, compressAndStoreRef]);

  const [mainSlides, setMainSlides] = useState([
    {
      title: '1. AIツールを選ぶ',
      imageDesc: 'AIツールの比較画面やロゴが並んでいる',
      text: 'まずは自分の目的に合った\nAIツールを見極めよう。\n無料でも十分使えるものが多い。',
      charExp: '真剣な顔で解説するポーズ', refImage: null,
    },
    {
      title: '2. プロンプトのコツ',
      imageDesc: 'チャットAIの画面でプロンプトを入力しているイメージ',
      text: 'AIは「聞き方」で結果が変わる。\n具体的に伝えるほど\n精度がグッと上がります。',
      charExp: 'プレゼンボードを示すポーズ', refImage: null,
    },
    {
      title: '3. 実践で使いこなす',
      imageDesc: 'ノートパソコンで作業している様子、画面にAI出力が表示',
      text: '学んだテクニックを\n実際の仕事や発信に活かす。\n行動した人だけが結果を出せる。',
      charExp: 'サムズアップで笑顔', refImage: null,
    },
  ]);

  // コンテンツ共通デフォルト参考画像（2枚で全コンテンツに適用）
  const [contentDefaultRef, setContentDefaultRef] = useState(() => { try { return localStorage.getItem('default_content_ref') || null; } catch { return null; } });
  const [contentDefaultRef2, setContentDefaultRef2] = useState(() => { try { return localStorage.getItem('default_content_ref2') || null; } catch { return null; } });
  useEffect(() => {
    compressAndStoreRef('default_content_ref', contentDefaultRef);
  }, [contentDefaultRef, compressAndStoreRef]);
  useEffect(() => {
    compressAndStoreRef('default_content_ref2', contentDefaultRef2);
  }, [contentDefaultRef2, compressAndStoreRef]);

  const [summaryItems, setSummaryItems] = useState(() =>
    ['AIツールを選ぶ', 'プロンプトのコツ', '実践で使いこなす']
  );
  const [summaryAutoSync, setSummaryAutoSync] = useState(true);

  // コンテンツタイトルからまとめを自動同期
  useEffect(() => {
    if (!summaryAutoSync) return;
    const items = mainSlides.map(s => {
      const title = s.title.replace(/^\d+\.\s*/, '');
      return title.length > 15 ? title.slice(0, 15) : title;
    });
    setSummaryItems(items);
  }, [mainSlides, summaryAutoSync]);
  const [summaryCharExp, setSummaryCharExp] = useState('幸せそうな笑顔でサムズアップ');
  const [summaryBubble, setSummaryBubble] = useState(true);
  const [summaryBubbleText, setSummaryBubbleText] = useState('毎日投稿するので、AIを学びたい方はフォローしといてね！');
  const [summaryRefImage, setSummaryRefImage] = useState(() => { try { return localStorage.getItem('default_summary_ref') || null; } catch { return null; } });
  useEffect(() => {
    compressAndStoreRef('default_summary_ref', summaryRefImage);
  }, [summaryRefImage, compressAndStoreRef]);

  const [activeTab, setActiveTab] = useState('edit');
  const [themeDropdownOpen, setThemeDropdownOpen] = useState(false);
  const [contentTab, setContentTab] = useState('cover');
  const [previewSlideIndex, setPreviewSlideIndex] = useState(0);
  const [copiedIndex, setCopiedIndex] = useState(null);

  // --- キャプション生成 ---
  const [captionText, setCaptionText] = useState('');
  const [captionGenerating, setCaptionGenerating] = useState(false);
  const [captionCopied, setCaptionCopied] = useState(false);

  // --- Threads投稿（ツリー投稿）生成 ---
  const [threadsPosts, setThreadsPosts] = useState([]);
  const [threadsGenerating, setThreadsGenerating] = useState(false);
  const [threadsCopiedIndex, setThreadsCopiedIndex] = useState(null);
  const [threadsRegeneratingIndex, setThreadsRegeneratingIndex] = useState(null);

  // --- ブログ記事生成 ---
  const [blogTitle, setBlogTitle] = useState('');
  const [blogBody, setBlogBody] = useState('');
  const [blogGenerating, setBlogGenerating] = useState(false);
  const [blogCopiedTarget, setBlogCopiedTarget] = useState(null);

  // --- note記事生成 ---
  const [noteTitle, setNoteTitle] = useState('');
  const [noteBody, setNoteBody] = useState('');
  const [noteGenerating, setNoteGenerating] = useState(false);
  const [noteCopiedTarget, setNoteCopiedTarget] = useState(null);

  // --- ブログ画像生成 ---
  const [blogImages, setBlogImages] = useState({ eyecatch: null, h2Images: [] });
  const [blogImagesGenerating, setBlogImagesGenerating] = useState(false);
  const [blogImagesProgress, setBlogImagesProgress] = useState('');

  // --- AI構成生成 ---
  const [aiSourceText, setAiSourceText] = useState('');
  const [aiSourceUrl, setAiSourceUrl] = useState('');
  const [aiUrlFetching, setAiUrlFetching] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [aiError, setAiError] = useState(null);

  // --- API Settings ---
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('gemini_api_key') || '');
  const [showSettings, setShowSettings] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState(() => localStorage.getItem('gemini_api_key') || '');

  // --- Image Generation ---
  const [generatedImages, setGeneratedImages] = useState({});
  const [generatingIndex, setGeneratingIndex] = useState(null);
  const [genError, setGenError] = useState(null);
  const [batchGenerating, setBatchGenerating] = useState(false);
  const [batchProgress, setBatchProgress] = useState({});
  const batchCancelRef = useRef(false);

  // --- Logic ---
  const handleImageUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setUploadedImage(reader.result);
          setCharacterSource('upload');
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  const removeUploadedImage = () => {
    setUploadedImage(null);
    localStorage.removeItem('default_char_image');
  };

  const addMainSlide = () => {
    if (mainSlides.length >= 7) return;
    setMainSlides([...mainSlides, {
      title: `ポイント ${mainSlides.length + 1}`,
      imageDesc: '',
      text: 'ここに説明文が入ります。',
      charExp: '解説している',
      refImage: null,
    }]);
  };

  const updateMainSlide = (index, field, value) => {
    const newSlides = [...mainSlides];
    newSlides[index][field] = value;
    setMainSlides(newSlides);
  };

  const removeMainSlide = (index) => {
    const newSlides = [...mainSlides];
    newSlides.splice(index, 1);
    setMainSlides(newSlides);
  };

  const updateSummaryItem = (index, value) => {
    const newItems = [...summaryItems];
    newItems[index] = value;
    setSummaryItems(newItems);
  };

  const addSummaryItem = () => {
    if (summaryItems.length >= 7) return;
    setSummaryItems([...summaryItems, '']);
  };

  const generatePrompt = (type, data) => {
    const theme = THEMES[selectedTheme];
    const font = FONT_STYLES.find(f => f.id === fontStyle) || FONT_STYLES[0];
    const layoutObj = COVER_LAYOUTS.find(s => s.id === coverLayout) || COVER_LAYOUTS[1];
    const titleDesignObj = TITLE_DESIGNS.find(s => s.id === titleDesign) || TITLE_DESIGNS[0];
    const subtitleDesignObj = SUBTITLE_DESIGNS.find(s => s.id === subtitleDesign) || SUBTITLE_DESIGNS[0];

    let p = "";

    // 一貫性維持のための指示（メインまたはまとめスライドの場合）
    if (type === 'main' || type === 'summary') {
      p += `【重要】ここで作成するキャラクターは{1.表紙}のキャラクターを使用してください (Use the SAME character as Slide 1). HAIR COLOR and HAIRSTYLE must be IDENTICAL to the cover slide — do NOT change them. `;
    }

    p += `Instagram feed post design, aspect ratio 4:5 vertical. `;

    // Background Logic (セクション別背景対応)
    const slideBg = getSlideBg();
    if (slideBg.type === 'white') {
      if (type === 'cover') {
        p += `Background: Clean white background with soft decorative organic wave/blob shapes in light blue (#BDE8F5) at the top and bottom edges. The center area is mostly white for clear text readability. The decorative shapes are subtle, like flowing water or soft clouds. Use the navy-blue palette: #0F2854, #1C4D8D, #4988C4, #BDE8F5 for all accent elements. `;
      } else {
        p += `Background: Clean white background. Use the navy-blue palette: #0F2854, #1C4D8D, #4988C4, #BDE8F5 for heading bands and accent elements. `;
      }
    } else if (slideBg.type === 'solid') {
      p += `Background: Solid flat color background (hex color code ${slideBg.color}). `;
    } else if (slideBg.type === 'frame') {
      p += `Background: Clean white background with a SINGLE border frame (color: ${frameColor}) around the entire image. The TOP and BOTTOM borders are WIDE/THICK (about 12-15% of image height). The LEFT and RIGHT borders are thinner (about 4-5% of image width). This creates a picture-frame effect. There must be absolutely NO inner border, NO double line, NO secondary frame — only ONE single frame touching the image edges. `;
    } else if (slideBg.type === 'image') {
      if (slideBg.image) {
        p += `Background: Use the uploaded background image as the full-bleed background behind all content. `;
      } else if (slideBg.imageStyle) {
        const styleObj = BG_IMAGE_STYLES.find(s => s.id === slideBg.imageStyle);
        if (styleObj) p += `Background: ${styleObj.prompt}. `;
        else p += `Background: Clean neutral background. `;
      } else {
        p += `Background: Clean neutral background. `;
      }
    } else {
      p += `Background: ${theme.bg}. `;
    }

    if (slideBg.desc && slideBg.desc.trim()) {
      p += `Background Details: ${slideBg.desc.trim()}. `;
    }

    p += `Style: ${theme.atmosphere}. High quality, 8k, trending on pinterest. `;
    if (useCustomMainColor) {
      p += `Main Theme Color: ${validMainColor}. Use this color prominently for header bands, accent elements, decorative shapes, highlights, and borders. Derive lighter tints for backgrounds and darker shades for emphasis. `;
    }
    p += `Text Layout: ${globalTextAlign === 'left' ? 'Left aligned text' : 'Center aligned text'} with generous whitespace margins/padding. `;
    p += `Language: Japanese. All text included in the image must be in Japanese. `;

    if (useCharacter) {
      const desc = characterDesc || 'Person';

      let expression = '';
      let position = globalCharPos;
      let bubble = false;
      let bubbleText = '';

      if (type === 'cover') {
        expression = coverCharExp; bubble = coverBubble; bubbleText = coverBubbleText;
      } else if (type === 'intro') {
        expression = introCharExp; bubble = introBubble; bubbleText = introBubbleText;
        position = 'bottom_left';
      } else if (type === 'summary') {
        expression = summaryCharExp; bubble = summaryBubble; bubbleText = summaryBubbleText;
      } else if (type === 'main' && data) {
        expression = data.charExp;
      }

      if (!expression) expression = 'neutral expression';

      let sizePrompt = 'Upper body shot (waist up)';
      if (characterSize === 'small') sizePrompt = 'Full body shot, wide shot showing entire figure';
      if (characterSize === 'large') sizePrompt = 'Close-up shot, bust up shot';
      if (characterSize === 'chibi') sizePrompt = 'Chibi style, super deformed, tiny full body shot, occupying 1/10 of the screen area';

      const posString = position.replace('_', ' ');

      const hasCharImage = characterSource === 'upload' && uploadedImage;

      // 導入スライドは個別キャラ設定を使用
      // 導入・コンテンツは全身表示を強制
      const effectiveSizePrompt = (type === 'intro' || type === 'main') ? 'FULL BODY shot — show the ENTIRE figure from head to feet, wide shot showing complete character' : sizePrompt;

      if (type === 'intro') {
        p += `**CHARACTER (DIFFERENT PERSON)**: This slide uses a DIFFERENT character from the cover/content slides. `;
        if (introCharImage) {
          p += `**HIGHEST PRIORITY — UPLOADED CHARACTER REFERENCE**: I have uploaded a reference image of this slide's character. You MUST use this uploaded image as the PRIMARY and DEFINITIVE reference. Reproduce this EXACT same character as closely as possible — the character's face, hairstyle, hair color, clothing, art style, body proportions, and overall appearance MUST match the uploaded reference image. Do NOT deviate from the uploaded image. This takes absolute priority over the text description below. `;
        }
        p += `Character: ${introCharDesc}. `;
        p += `Pose/Expression: ${expression}. `;
        p += `Shot Type: ${effectiveSizePrompt}. `;
        p += `Position: Character is positioned at the ${posString} of the layout. `;
      } else {
        // 表紙・コンテンツ・まとめ: 登録キャラを強制使用
        if (hasCharImage) {
          p += `**CRITICAL - EXACT CHARACTER MATCH**: I have uploaded a reference image of the MAIN character. You MUST reproduce this EXACT same character in this slide. The character's face, hairstyle, HAIR COLOR, clothing, art style, and proportions MUST be identical to the uploaded reference. **ESPECIALLY: hair color and hairstyle must NEVER change between slides — keep them pixel-perfect consistent.** Do NOT create a different character or alter any physical features. `;
          p += `Character Description: ${desc}. `;
          if (type === 'main') {
            p += `Pose/Expression: OVER-THE-TOP exaggerated reaction that matches the slide content. NOT subtle — think anime/manga level overreaction. Examples: mind-blown → jaw dropped with hands on cheeks and sparkly eyes, amazing tip → jumping with both fists pumped in the air and huge grin, warning → dramatically sweating with wide panicked eyes, great news → explosive joy with arms spread wide and tears of happiness, surprising fact → comically shocked face with mouth wide open. The character should look like they are FEELING the content intensely. Boring neutral poses are FORBIDDEN. `;
          } else {
            p += `Pose/Expression: ${expression}. `;
          }
        } else {
          p += `**MAIN CHARACTER (MUST BE CONSISTENT)**: Use the EXACT same character across all slides (cover, content, summary). **Hair color and hairstyle must NEVER change between slides — keep them perfectly consistent.** `;
          if (type === 'main') {
            p += `Character: (${desc}). Pose/Expression: OVER-THE-TOP exaggerated reaction matching the slide content — anime/manga level overreaction. Mind-blown → jaw dropped hands on cheeks, amazing → jumping fists pumped huge grin, warning → dramatically sweating wide eyes, surprising → comically shocked mouth wide open. Character must FEEL the content intensely. Boring neutral poses FORBIDDEN. `;
          } else {
            p += `Character: (${desc}) with (${expression}). `;
          }
        }
        if (type === 'main') {
          p += `Shot Type: FULL BODY (head to feet) but SMALL size — the character should be compact and tucked into the bottom-left corner, NOT overlapping the text area. `;
          p += `Position: Character is positioned at the BOTTOM-LEFT corner of the layout, small enough to not interfere with text. `;
        } else {
          p += `Shot Type: ${effectiveSizePrompt}. `;
          p += `Position: Character is positioned at the ${posString} of the layout. `;
        }
      }

      if (bubble && bubbleText) {
        p += `A speech bubble (balloon) containing Japanese text "${bubbleText}" is near the character. `;
      }
    }

    let sectionRefImage = null;
    let sectionRefImages = [];
    if (type === 'cover') {
      sectionRefImage = coverRefImage;
      if (coverRefImage2) sectionRefImages.push(coverRefImage2);
    } else if (type === 'intro') sectionRefImage = introRefImage;
    else if (type === 'summary') sectionRefImage = summaryRefImage;
    else if (type === 'main' && data) {
      sectionRefImage = data.refImage;
      // コンテンツはデフォルト参考画像2枚も追加
      if (contentDefaultRef) sectionRefImages.push(contentDefaultRef);
      if (contentDefaultRef2) sectionRefImages.push(contentDefaultRef2);
    }

    if (sectionRefImage || sectionRefImages.length > 0) {
      p += `**STYLE REFERENCE**: I have uploaded style reference image(s). Please match the overall visual style, color tone, layout composition, and atmosphere of the reference images as closely as possible. `;
    }

    if (type === 'cover') {
      p += `LAYOUT: Title Slide. Huge typography design. `;

      if (coverSubtitle) {
        p += `Subtitle: "${coverSubtitle}" (in Japanese) is placed at the top. `;
        if (subtitleDesignObj.id !== 'none') {
          p += `Subtitle Decoration: ${subtitleDesignObj.prompt}. `;
        }
      }

      p += `Main Title: "${coverTitle.replace(/\n/g, ' ')}" (in Japanese) in center, ${font.prompt}. `;
      p += `Cover Layout: ${layoutObj.prompt}. `;
      p += `Title Text Design: ${titleDesignObj.prompt}. `;

      // --- 追加デザイン機能 ---
      const swipeObj = SWIPE_GUIDES.find(s => s.id === swipeGuide);
      if (swipeObj && swipeObj.prompt) p += `Swipe Guide: ${swipeObj.prompt}. `;

      const badgeObj = EYE_CATCH_BADGES.find(s => s.id === eyeCatchBadge);
      if (badgeObj && badgeObj.prompt) p += `Eye-Catch Badge: ${badgeObj.prompt}. `;

      const emphObj = TITLE_EMPHASIS_OPTIONS.find(s => s.id === titleEmphasis);
      if (emphObj && emphObj.prompt) p += `Title Emphasis: ${emphObj.prompt}. `;

      p += `Spacing: Standard comfortable margins with balanced whitespace around all content, about 8-10% padding. `;
      p += `Design: Eye-catching, high contrast, bold and energetic. `;
    } else if (type === 'intro') {
      const headingObj = HEADING_STYLES.find(h => h.id === headingStyle) || HEADING_STYLES[0];
      p += `LAYOUT: Introduction Slide. `;
      p += `**BACKGROUND OVERRIDE**: Clean WHITE background. NO dark/black backgrounds. NO wave or blob decorations. `;
      p += `**SLIDE STRUCTURE**: THREE sections stacked vertically with NO gaps or margins at top and bottom edges: `;
      p += `1) TOP BAND: A colored heading band in the main theme color, flush to the very top edge of the image (ZERO margin/padding above it). Full width. Contains the heading text in white. The heading font size must be CLEARLY LARGER than the body text below, but sized so it fits in ONE single line — do NOT wrap to multiple lines. Bold and prominent, yet single-line. `;
      p += `2) MIDDLE AREA (white background): Layout from top to bottom: `;
      p += `  (A) CHIBI CHARACTER — placed near the TOP of the middle area, just below the heading band. VERY SMALL chibi-sized character (FULL BODY, head to feet), TINY and compact — occupying only about 15-20% of the middle area height. Keep the character miniature so it does not dominate the layout. `;
      p += `  (B) SPEECH BUBBLE with ONE WORRY — a single speech bubble (吹き出し) coming from or near the chibi character, containing ONE short worry/concern sentence (「」quotation style). Only ONE sentence — keep it natural, like something a real person would say. `;
      p += `  (C) TOPIC IMAGE — place ONE realistic image that represents the main topic of this post. If the topic is about a specific TOOL or APP (e.g. ChatGPT, Notion, Canva), show the actual tool's logo, icon, or a realistic screenshot/mockup of its interface. If about a PRODUCT or SERVICE, show a realistic image close to the actual product/service appearance. If about a concept or technique, show a recognizable related visual. The image should be compact (about 20-25% of middle area), clean, and clearly identifiable. NO emojis, NO doodles, NO decorative illustrations — only realistic representative imagery. `;
      p += `  (D) OVERVIEW & HOOK TEXT — below the image, the post overview, benefit, and a hook phrase to spark interest. **LEFT-ALIGNED text**. Use a SMALL, modest text size (around 26-28px) — do NOT make it too large. Keep GENEROUS whitespace/margins around the text for a clean, balanced, airy layout that is easy to read. Each sentence on its own line with clear spacing. **EMPHASIS STYLING**: Use RED text color (#E04040) SPARINGLY — only for 1-2 truly important key phrases (do NOT overuse). NO emojis, NO decorative illustrations, NO doodles. `;
      p += `3) BOTTOM BAND: A colored band in the main theme color, flush to the very bottom edge of the image (ZERO margin/padding below it). Full width. ${introSwipe ? 'Place "Swipe >>>" text in white at the RIGHT side of the bottom band (right-aligned).' : ''} `;
      p += `HEADING BAND: A brief, concise summary of the cover title "${coverTitle.replace(/\n/g, ' ')}" — condense it into a SHORT single-line heading (in Japanese). Use white BOLD text on the top colored band. The heading must be NOTICEABLY LARGER than the body text in the middle area, but compact enough to fit in one line. Heading style: ${headingObj.prompt} `;
      p += `MAIN TEXT: "${introText.replace(/\n/g, ' ')}" (in Japanese). Split into two parts: the FIRST「」sentence goes inside the speech bubble (ONE worry only), and the REST goes below as left-aligned overview/hook text. **LINE BREAKS**: Each sentence on its OWN separate line with clear paragraph spacing. Text size small and modest (26-28px). Plenty of whitespace for a balanced, breathable layout. Use RED colored text SPARINGLY — only for 1-2 truly critical words or phrases. NO marker highlights. `;
      p += `Design: Clean, trustworthy, text-focused with navy-blue color scheme (#0F2854, #1C4D8D, #4988C4, #BDE8F5). `;
    } else if (type === 'main' && data) {
      const headingObj = HEADING_STYLES.find(h => h.id === headingStyle) || HEADING_STYLES[0];
      const boxObj = CONTENT_BOX_STYLES.find(b => b.id === contentBoxStyle) || CONTENT_BOX_STYLES[0];
      p += `LAYOUT: Content Slide. `;
      p += `**SLIDE STRUCTURE**: The slide has TWO main zones stacked vertically: `;
      p += `1) UPPER ZONE (~55-60% of the slide): Contains the heading band at the very top, and below it a large IMAGE/VISUAL area that fills most of this zone. The background of this zone can be the theme color or a complementary color. `;
      p += `2) LOWER ZONE (~40-45% of the slide): A clean WHITE PANEL/BOX area at the bottom of the slide — like a white card or white rectangle with rounded top corners overlapping slightly into the image area. This white panel contains the explanation text and a small character. `;
      p += `HEADING BAND: "${data.title}" (in Japanese) in white text on a colored band at the very top. Heading style: ${headingObj.prompt} `;
      const isScreenshotStyle = data.imageDesc && /screenshot|UI image|interface|screen|操作|手順|設定画面/i.test(data.imageDesc);
      if (isScreenshotStyle) {
        p += `UPPER ZONE — REALISTIC SCREENSHOT IMAGE: **OVERRIDE ALL DEFAULT DESIGN/THEME/CHARACTER SETTINGS FOR THIS ZONE.** Do NOT use the default decorative style, character, or color theme for this image area. Instead, create a PHOTOREALISTIC screenshot of the actual application/tool/website interface described below. The screenshot must look as close to the REAL software screen as possible — accurate UI elements, real button placements, actual menu layouts, proper color schemes of the real app. Add RED ARROW annotations (🔴➡️) and RED CIRCLE highlights pointing to the key areas being explained. Use a clean, realistic software aesthetic. Image description: (${data.imageDesc}). `;
      } else {
        p += `UPPER ZONE — IMAGE/VISUAL (ENTERTAINMENT + CLARITY): Create a VISUALLY STRIKING and MEMORABLE image for (${data.imageDesc}). **This is NOT a boring textbook diagram.** Make it eye-catching, dramatic, and entertaining — something that makes people stop scrolling. Use BOLD visual metaphors, exaggerated contrasts (before/after with dramatic difference), provocative imagery, or surprising visual storytelling. Think: comic-book style impact, meme-worthy visuals, dramatic lighting, unexpected juxtapositions. If using a diagram/infographic, make it VISUALLY EXCITING with bold colors, dynamic layouts, and impactful iconography — NOT a plain corporate chart. **TEXT RULES: Keep text to ABSOLUTE MINIMUM — only short keywords/labels (1-3 words max). Use icons, arrows, and visual elements instead of text. Too much text causes garbled characters.** If a diagram is difficult, use recognizable imagery such as: actual tool/service logos, product images, or illustrative icons with dramatic visual treatment. The goal: viewers think "this looks interesting!" at a glance. `;
      }
      p += `LOWER ZONE — WHITE PANEL: A clean WHITE background panel/card at the bottom. Contains: **LEFT-ALIGNED text**: Render the following text EXACTLY as provided (do NOT rewrite): "${data.text.replace(/\n/g, ' ')}" (in Japanese). **TEXT RULES**: Text font size approximately 24-26px. Each sentence on its OWN separate line with clear paragraph spacing. Use dark navy (#0F2854) text color — SAME color on every content slide. A SMALL full-body character is at the BOTTOM-LEFT of this white panel, compact and NOT overlapping text. `;
      p += `FOOTER: "スワイプ ▸▸" text in readable size at the bottom-right corner of the white panel. `;
      p += `**UNIFORMITY RULE**: All content slides (slides 3-9) MUST look identical in layout structure — same heading band, same image zone size, same white panel style, same text color, same text size (~24-26px). Match the design of slide 3 exactly. `;
    } else if (type === 'summary') {
      const headingObj = HEADING_STYLES.find(h => h.id === headingStyle) || HEADING_STYLES[0];
      const boxObj = CONTENT_BOX_STYLES.find(b => b.id === contentBoxStyle) || CONTENT_BOX_STYLES[0];
      p += `LAYOUT: Summary/Conclusion Slide. `;
      p += `**SLIDE STRUCTURE**: Clean white background. NO wave or blob decorations. At the very top is a colored heading band (full width) in the main theme color. Below the heading band, the layout from top to bottom: (1) Bullet list inside a bordered box, (2) Character with speech bubble, (3) Footer. `;
      p += `HEADING: "まとめ" (in Japanese). Heading style: ${headingObj.prompt} Same heading band as content slides. `;
      p += `BULLET LIST BOX: Render the following bullet items EXACTLY as provided (do NOT rewrite): ${summaryItems.map((item, i) => `${i + 1}. ${item}`).join(' / ')}. Display all ${summaryItems.length} items clearly as a numbered or bulleted list. Place ONLY the bullet list inside a BORDERED BOX/FRAME (rounded rectangle with a subtle border in the theme color). Each item should be short and concise. Nothing else goes inside this box. `;
      p += `CHARACTER & SPEECH BUBBLE: Below the bordered box, place the CHARACTER at the BOTTOM-LEFT (full body, small, compact) with an OVER-THE-TOP excited/satisfied expression (big smile, thumbs up, fist pump, sparkling eyes — anime-level enthusiasm). To the RIGHT of the character, place a SPEECH BUBBLE containing: "${summaryBubbleText}". The character and speech bubble are OUTSIDE the bordered box. `;
      p += `FOOTER: "📌 ブックマークがおすすめ！" text at the BOTTOM-RIGHT corner in readable size. `;
      p += `Match the heading band style as content slides. `;
    }

    if (slideBg.type === 'theme') {
      if (useCustomMainColor) {
        p += ` Color palette: The main/brand color is ${validMainColor}. Use this hex color for header bands, accent borders, highlights, and decorative elements. Background should use a very light tint of this color.`;
      } else {
        if (theme.colors.band.includes('yellow')) p += ` Color palette: Yellow and Pop accents.`;
        if (theme.colors.band.includes('blue')) p += ` Color palette: Blue and Professional accents.`;
      }
    } else if (slideBg.type === 'frame') {
      if (useCustomMainColor) {
        p += ` Frame/Border Color: ${validMainColor}. Use this as the frame border color and accent color for header bands and decorative elements.`;
      } else {
        p += ` Frame/Border Color: Use the theme's accent color for the frame border.`;
      }
    } else if (useCustomMainColor) {
      p += ` Accent/Brand Color: Use ${validMainColor} as the main accent color for text bands, highlights, borders, and decorative elements.`;
    }

    return p;
  };

  const copyToClipboard = (text, index) => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
      console.error('Copy failed', err);
    }
    document.body.removeChild(textArea);
  };

  // --- API Settings Logic ---
  const saveApiKey = () => {
    localStorage.setItem('gemini_api_key', apiKeyInput);
    setApiKey(apiKeyInput);
    setShowSettings(false);
  };

  // --- URL記事取得 ---
  const handleFetchUrl = useCallback(async () => {
    if (!apiKey) {
      setAiError('APIキーを設定してください。');
      return;
    }
    if (!aiSourceUrl.trim()) {
      setAiError('URLを入力してください。');
      return;
    }
    setAiUrlFetching(true);
    setAiError(null);
    try {
      const articleText = await fetchArticleFromUrl(apiKey, aiSourceUrl.trim());
      setAiSourceText(articleText);
    } catch (e) {
      setAiError('URL記事取得エラー: ' + e.message);
    } finally {
      setAiUrlFetching(false);
    }
  }, [apiKey, aiSourceUrl]);

  // --- PDF/画像ファイルから記事を読み込み ---
  const handleFileExtract = useCallback(async (file) => {
    if (!apiKey) {
      setAiError('APIキーを設定してください。');
      return;
    }
    if (!file) return;
    setAiUrlFetching(true);
    setAiError(null);
    try {
      const articleText = await extractArticleFromFile(apiKey, file);
      setAiSourceText(articleText);
    } catch (e) {
      setAiError('ファイル読み込みエラー: ' + e.message);
    } finally {
      setAiUrlFetching(false);
    }
  }, [apiKey]);

  // --- AI構成生成ロジック ---
  const handleAiGenerate = async () => {
    if (!apiKey) { setAiError('APIキーを設定してください。'); return; }
    if (!aiSourceText.trim()) { setAiError('文章を入力してください。'); return; }
    setAiGenerating(true);
    setAiError(null);
    setAiResult(null);
    try {
      const result = await generatePostStructure(apiKey, aiSourceText);
      setAiResult(result);
    } catch (err) {
      setAiError(err.message || 'AI構成の生成に失敗しました。');
    } finally {
      setAiGenerating(false);
    }
  };

  const applyAiResult = () => {
    if (!aiResult) return;
    setCoverTitle(aiResult.coverTitle || '');
    setCoverSubtitle(aiResult.coverSubtitle || '');
    setIntroText(aiResult.introText || '');
    if (aiResult.mainSlides && Array.isArray(aiResult.mainSlides)) {
      setMainSlides(aiResult.mainSlides.map((s, i) => ({
        title: s.title || `ページ ${i + 1}`,
        imageDesc: s.imageDesc || '',
        text: s.text || '',
        charExp: '',
        refImage: null,
      })));
    }
    if (aiResult.summaryItems && Array.isArray(aiResult.summaryItems)) {
      setSummaryItems(aiResult.summaryItems);
    }
    setActiveTab('edit');
    setContentTab('cover');
  };

  // --- Image Generation Logic ---
  // スライドの画像を取得するヘルパー
  const getSlideImages = (slideType, slideContent) => {
    let charImg = null;
    let refImg = null;

    if (slideType === 'cover') { refImg = coverRefImage; }
    else if (slideType === 'intro') { refImg = introRefImage; }
    else if (slideType === 'summary') { refImg = summaryRefImage; }
    else if (slideType === 'main' && slideContent) { refImg = slideContent.refImage || contentDefaultRef; }

    // 表紙・コンテンツの場合は2枚目の参考画像も追加
    let refImg2 = null;
    if (slideType === 'cover') { refImg2 = coverRefImage2; }
    else if (slideType === 'main') { refImg2 = contentDefaultRef2; }

    // キャラ画像（導入は個別キャラ優先、それ以外はグローバル）
    if (slideType === 'intro' && introCharImage) {
      charImg = introCharImage;
    } else if (characterSource === 'upload' && uploadedImage) {
      charImg = uploadedImage;
    }

    return { charImg, refImg, refImg2, bgImg: null };
  };

  // --- 表紙プレビュー用ヘルパー ---
  const renderSubtitleBadge = (text) => {
    if (!text) return null;
    const isDarkLayout = false; // dark_overlay removed
    const baseColor = useCustomMainColor ? validMainColor : '#ec4899';
    switch (subtitleDesign) {
      case 'outline_box':
        return (
          <div
            className="mb-4 px-5 py-1.5 text-xs font-bold inline-block bg-transparent"
            style={{
              border: `2px solid ${baseColor}`,
              borderRadius: '4px',
              color: isDarkLayout ? '#fff' : baseColor,
            }}
          >{text}</div>
        );
      case 'pill':
        return (
          <div
            className={`mb-4 px-4 py-1.5 rounded-full shadow-md text-xs font-bold inline-block ${isDarkLayout ? 'bg-yellow-400 text-black' : (!useCustomMainColor ? 'bg-white text-pink-500 border border-pink-200' : 'bg-white border border-slate-200')}`}
            style={useCustomMainColor && !isDarkLayout ? { color: baseColor } : undefined}
          >{text}</div>
        );
      case 'tag':
        return (
          <div className="mb-4 inline-block">
            <div
              className={`relative pl-5 pr-3 py-1.5 text-xs font-bold shadow ${isDarkLayout ? 'bg-yellow-400 text-black' : 'bg-white'}`}
              style={{
                clipPath: 'polygon(12px 0%, 100% 0%, 100% 100%, 12px 100%, 0% 50%)',
                ...(useCustomMainColor && !isDarkLayout ? { color: baseColor } : !isDarkLayout ? { color: '#ec4899' } : {})
              }}
            >{text}</div>
          </div>
        );
      case 'bubble':
        return (
          <div className="mb-4 inline-block relative">
            <div
              className={`relative rounded-xl px-4 py-2 text-xs font-bold shadow ${isDarkLayout ? 'bg-yellow-400 text-black' : 'bg-white'}`}
              style={useCustomMainColor && !isDarkLayout ? { color: baseColor } : !isDarkLayout ? { color: '#ec4899' } : {}}
            >
              {text}
              <div className={`absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 ${isDarkLayout ? 'bg-yellow-400' : 'bg-white'}`}></div>
            </div>
          </div>
        );
      case 'underline':
        return (
          <div className="mb-4 inline-block">
            <span
              className={`text-xs font-bold pb-1 ${isDarkLayout ? 'text-yellow-400' : effectiveColors.text}`}
              style={{
                borderBottom: `3px solid ${isDarkLayout ? '#facc15' : (useCustomMainColor ? baseColor : '#ec4899')}`,
                ...(effectiveColors.textColor && !isDarkLayout ? { color: effectiveColors.textColor } : {})
              }}
            >{text}</span>
          </div>
        );
      case 'none':
        return (
          <div className="mb-3">
            <span
              className={`text-xs font-bold ${isDarkLayout ? 'text-yellow-400' : effectiveColors.text}`}
              style={effectiveColors.textColor && !isDarkLayout ? { color: effectiveColors.textColor } : undefined}
            >{text}</span>
          </div>
        );
      default:
        return null;
    }
  };

  const getTitleH1Style = () => {
    const isDarkLayout = false; // dark_overlay removed
    const baseColor = useCustomMainColor ? validMainColor : '#ec4899';
    const darkBaseColor = useCustomMainColor ? darkenColor(validMainColor, 0.2) : '#be185d';

    let className = 'text-2xl font-black leading-tight w-full whitespace-pre-wrap ';
    let style = {};

    // Layout-based text color
    if (isDarkLayout) {
      className += 'text-white ';
    } else if (coverLayout === 'pop_frame') {
      className += 'text-white text-3xl ';
    } else {
      className += effectiveColors.text + ' ';
      if (effectiveColors.textColor) style.color = effectiveColors.textColor;
    }

    // Title design effects
    switch (titleDesign) {
      case 'bold_fill':
        style.color = baseColor;
        style.fontWeight = '900';
        className += 'text-3xl ';
        break;
      case 'shadow':
        className += 'drop-shadow-xl ';
        break;
      case 'frame':
        style.WebkitTextStroke = isDarkLayout ? '1.5px rgba(255,255,255,0.6)' : `1.5px ${darkBaseColor}`;
        break;
      case 'marker':
        // Marker handled via separate element
        break;
      case 'gradient':
        style.background = `linear-gradient(135deg, ${baseColor}, ${isDarkLayout ? '#facc15' : darkenColor(baseColor, 0.3)})`;
        style.WebkitBackgroundClip = 'text';
        style.WebkitTextFillColor = 'transparent';
        style.backgroundClip = 'text';
        break;
      case 'outline':
        style.textShadow = '-2px -2px 0 #fff, 2px -2px 0 #fff, -2px 2px 0 #fff, 2px 2px 0 #fff, 0 -2px 0 #fff, 0 2px 0 #fff, -2px 0 0 #fff, 2px 0 0 #fff';
        if (isDarkLayout) {
          style.textShadow = '-2px -2px 0 rgba(255,255,255,0.3), 2px -2px 0 rgba(255,255,255,0.3), -2px 2px 0 rgba(255,255,255,0.3), 2px 2px 0 rgba(255,255,255,0.3)';
        }
        break;
    }

    return { className: className.trim(), style };
  };

  const handleGenerateSingle = useCallback(async (slideIndex) => {
    if (!apiKey) {
      setShowSettings(true);
      return;
    }
    const slides = [
      { type: 'cover', title: '1. 表紙', content: coverTitle },
      { type: 'intro', title: '2. 導入', content: introText },
      ...mainSlides.map((s, i) => ({ type: 'main', title: `${i + 3}. ${s.title}`, content: s, index: i })),
      { type: 'summary', title: '10. まとめ', content: summaryItems }
    ];
    const slide = slides[slideIndex];
    if (!slide) return;

    setGeneratingIndex(slideIndex);
    setGenError(null);

    try {
      const prompt = generatePrompt(slide.type, slide.content);
      const { charImg, refImg, refImg2, bgImg } = getSlideImages(slide.type, slide.content);
      let imageUrl;

      const refImages = [charImg, refImg, refImg2, bgImg].filter(Boolean);
      if (refImages.length > 1) {
        imageUrl = await generateImageWithMultipleReferences(apiKey, prompt, refImages);
      } else if (refImages.length === 1) {
        imageUrl = await generateImageWithReference(apiKey, prompt, refImages[0]);
      } else {
        imageUrl = await generateImage(apiKey, prompt);
      }

      setGeneratedImages(prev => ({ ...prev, [slideIndex]: imageUrl }));
    } catch (err) {
      console.error('Generation failed:', err);
      setGenError(err.message || '画像生成に失敗しました');
    } finally {
      setGeneratingIndex(null);
    }
  }, [apiKey, coverTitle, introText, mainSlides, summaryItems, characterSource, uploadedImage, coverRefImage, coverRefImage2, introRefImage, summaryRefImage, generatePrompt]);

  // --- キャプション生成 ---
  const handleGenerateCaption = useCallback(async () => {
    if (!apiKey) {
      alert('APIキーを設定してください');
      return;
    }
    setCaptionGenerating(true);
    try {
      const result = await generateCaption(apiKey, {
        coverTitle: coverTitle.replace(/\n/g, ' '),
        coverSubtitle,
        introText,
        mainSlides,
        summaryItems
      });
      setCaptionText(result);
    } catch (e) {
      alert('キャプション生成エラー: ' + e.message);
    } finally {
      setCaptionGenerating(false);
    }
  }, [apiKey, coverTitle, coverSubtitle, introText, mainSlides, summaryItems]);

  const handleCopyCaption = useCallback(() => {
    navigator.clipboard.writeText(captionText).then(() => {
      setCaptionCopied(true);
      setTimeout(() => setCaptionCopied(false), 2000);
    });
  }, [captionText]);

  // --- Threads投稿生成 ---
  const handleGenerateThreads = useCallback(async () => {
    if (!apiKey) {
      alert('APIキーを設定してください');
      return;
    }
    setThreadsGenerating(true);
    try {
      const posts = await generateThreadsPosts(apiKey, {
        coverTitle: coverTitle.replace(/\n/g, ' '),
        coverSubtitle,
        introText,
        mainSlides,
        summaryItems
      });
      setThreadsPosts(posts);
    } catch (e) {
      alert('Threads投稿生成エラー: ' + e.message);
    } finally {
      setThreadsGenerating(false);
    }
  }, [apiKey, coverTitle, coverSubtitle, introText, mainSlides, summaryItems]);

  const handleRegenerateThreadsPost = useCallback(async (index) => {
    if (!apiKey) {
      alert('APIキーを設定してください');
      return;
    }
    setThreadsRegeneratingIndex(index);
    try {
      const newPost = await regenerateThreadsPost(apiKey, {
        allPosts: threadsPosts,
        postIndex: index,
        coverTitle: coverTitle.replace(/\n/g, ' '),
      });
      setThreadsPosts(prev => {
        const updated = [...prev];
        updated[index] = newPost;
        return updated;
      });
    } catch (e) {
      alert('投稿の再生成エラー: ' + e.message);
    } finally {
      setThreadsRegeneratingIndex(null);
    }
  }, [apiKey, threadsPosts, coverTitle]);

  const handleCopyThreadsPost = useCallback((index) => {
    navigator.clipboard.writeText(threadsPosts[index]).then(() => {
      setThreadsCopiedIndex(index);
      setTimeout(() => setThreadsCopiedIndex(null), 2000);
    });
  }, [threadsPosts]);

  const handleCopyAllThreads = useCallback(() => {
    const allText = threadsPosts.join('\n\n---POST---\n\n');
    navigator.clipboard.writeText(allText).then(() => {
      setThreadsCopiedIndex(-1);
      setTimeout(() => setThreadsCopiedIndex(null), 2000);
    });
  }, [threadsPosts]);

  const handleEditThreadsPost = useCallback((index, newText) => {
    setThreadsPosts(prev => {
      const updated = [...prev];
      updated[index] = newText;
      return updated;
    });
  }, []);

  // --- ブログ記事（X記事 + note記事）同時生成ハンドラー ---
  const handleGenerateBlog = useCallback(async () => {
    if (!apiKey) {
      alert('APIキーを設定してください');
      return;
    }
    setBlogGenerating(true);
    setNoteGenerating(true);
    try {
      // まずX記事を生成
      const blogResult = await generateBlogArticle(apiKey, {
        coverTitle: coverTitle.replace(/\n/g, ' '),
        coverSubtitle,
        introText,
        mainSlides,
        summaryItems
      });
      setBlogTitle(blogResult.title);
      setBlogBody(blogResult.body);

      // X記事のbodyを使ってnote記事を生成
      try {
        const noteResult = await generateNoteArticle(apiKey, {
          coverTitle: coverTitle.replace(/\n/g, ' '),
          coverSubtitle,
          introText,
          mainSlides,
          summaryItems,
          xArticleBody: blogResult.body
        });
        setNoteTitle(noteResult.title);
        setNoteBody(noteResult.body);
      } catch (e) {
        alert('note記事生成エラー: ' + e.message);
      } finally {
        setNoteGenerating(false);
      }
    } catch (e) {
      alert('ブログ記事生成エラー: ' + e.message);
      setNoteGenerating(false);
    } finally {
      setBlogGenerating(false);
    }
  }, [apiKey, coverTitle, coverSubtitle, introText, mainSlides, summaryItems]);

  const handleCopyBlogTitle = useCallback(() => {
    navigator.clipboard.writeText(blogTitle).then(() => {
      setBlogCopiedTarget('title');
      setTimeout(() => setBlogCopiedTarget(null), 2000);
    });
  }, [blogTitle]);

  const handleCopyBlogBody = useCallback(() => {
    navigator.clipboard.writeText(blogBody).then(() => {
      setBlogCopiedTarget('body');
      setTimeout(() => setBlogCopiedTarget(null), 2000);
    });
  }, [blogBody]);

  const handleCopyBlogAll = useCallback(() => {
    const allText = blogTitle + '\n\n' + blogBody;
    navigator.clipboard.writeText(allText).then(() => {
      setBlogCopiedTarget('all');
      setTimeout(() => setBlogCopiedTarget(null), 2000);
    });
  }, [blogTitle, blogBody]);

  // --- note記事生成ハンドラー ---
  const handleGenerateNote = useCallback(async () => {
    if (!apiKey) {
      alert('APIキーを設定してください');
      return;
    }
    setNoteGenerating(true);
    try {
      const result = await generateNoteArticle(apiKey, {
        coverTitle: coverTitle.replace(/\n/g, ' '),
        coverSubtitle,
        introText,
        mainSlides,
        summaryItems,
        xArticleBody: blogBody
      });
      setNoteTitle(result.title);
      setNoteBody(result.body);
    } catch (e) {
      alert('note記事生成エラー: ' + e.message);
    } finally {
      setNoteGenerating(false);
    }
  }, [apiKey, coverTitle, coverSubtitle, introText, mainSlides, summaryItems, blogBody]);

  const handleCopyNoteTitle = useCallback(() => {
    navigator.clipboard.writeText(noteTitle).then(() => {
      setNoteCopiedTarget('title');
      setTimeout(() => setNoteCopiedTarget(null), 2000);
    });
  }, [noteTitle]);

  const handleCopyNoteBody = useCallback(() => {
    navigator.clipboard.writeText(noteBody).then(() => {
      setNoteCopiedTarget('body');
      setTimeout(() => setNoteCopiedTarget(null), 2000);
    });
  }, [noteBody]);

  const handleCopyNoteAll = useCallback(() => {
    const allText = noteTitle + '\n\n' + noteBody;
    navigator.clipboard.writeText(allText).then(() => {
      setNoteCopiedTarget('all');
      setTimeout(() => setNoteCopiedTarget(null), 2000);
    });
  }, [noteTitle, noteBody]);

  // --- ブログ画像生成ハンドラ ---
  const handleGenerateBlogImages = useCallback(async () => {
    if (!apiKey) {
      alert('APIキーを設定してください');
      return;
    }
    if (!blogBody) {
      alert('先にX記事を生成してください');
      return;
    }
    setBlogImagesGenerating(true);
    setBlogImagesProgress('画像プロンプトを設計中...');
    try {
      // Step1: テキストモデルでプロンプト設計
      const prompts = await generateBlogImagePrompts(apiKey, { title: blogTitle, body: blogBody });

      // Step2: アイキャッチ画像を生成
      setBlogImagesProgress('アイキャッチ画像を生成中...');
      const eyecatchImg = await generateBlogImage(apiKey, prompts.eyecatch);

      // Step3: h2見出しごとの図解を順次生成
      const h2Results = [];
      for (let i = 0; i < prompts.h2Images.length; i++) {
        const h2 = prompts.h2Images[i];
        setBlogImagesProgress(`図解を生成中... (${i + 1}/${prompts.h2Images.length}) ${h2.heading}`);
        try {
          const img = await generateBlogImage(apiKey, h2.prompt);
          h2Results.push({ heading: h2.heading, image: img, prompt: h2.prompt });
        } catch (e) {
          console.warn(`h2図解生成失敗 (${h2.heading}):`, e.message);
          h2Results.push({ heading: h2.heading, image: null, error: e.message, prompt: h2.prompt });
        }
      }

      setBlogImages({ eyecatch: eyecatchImg, h2Images: h2Results });
    } catch (e) {
      alert('ブログ画像生成エラー: ' + e.message);
    } finally {
      setBlogImagesGenerating(false);
      setBlogImagesProgress('');
    }
  }, [apiKey, blogTitle, blogBody]);

  // 個別h2図解の再生成
  const handleRegenerateBlogH2Image = useCallback(async (index) => {
    if (!apiKey || !blogImages.h2Images[index]) return;
    const h2 = blogImages.h2Images[index];
    setBlogImagesProgress(`図解を再生成中... ${h2.heading}`);
    setBlogImagesGenerating(true);
    try {
      const img = await generateBlogImage(apiKey, h2.prompt);
      setBlogImages(prev => {
        const updated = [...prev.h2Images];
        updated[index] = { ...updated[index], image: img, error: undefined };
        return { ...prev, h2Images: updated };
      });
    } catch (e) {
      alert('図解再生成エラー: ' + e.message);
    } finally {
      setBlogImagesGenerating(false);
      setBlogImagesProgress('');
    }
  }, [apiKey, blogImages]);

  // アイキャッチの再生成
  const handleRegenerateBlogEyecatch = useCallback(async () => {
    if (!apiKey || !blogBody) return;
    setBlogImagesGenerating(true);
    setBlogImagesProgress('アイキャッチを再生成中...');
    try {
      const prompts = await generateBlogImagePrompts(apiKey, { title: blogTitle, body: blogBody });
      const eyecatchImg = await generateBlogImage(apiKey, prompts.eyecatch);
      setBlogImages(prev => ({ ...prev, eyecatch: eyecatchImg }));
    } catch (e) {
      alert('アイキャッチ再生成エラー: ' + e.message);
    } finally {
      setBlogImagesGenerating(false);
      setBlogImagesProgress('');
    }
  }, [apiKey, blogTitle, blogBody]);

  const handleBatchGenerate = useCallback(async () => {
    if (!apiKey) {
      setShowSettings(true);
      return;
    }
    const slides = [
      { type: 'cover', title: '1. 表紙', content: coverTitle },
      { type: 'intro', title: '2. 導入', content: introText },
      ...mainSlides.map((s, i) => ({ type: 'main', title: `${i + 3}. ${s.title}`, content: s, index: i })),
      { type: 'summary', title: '10. まとめ', content: summaryItems }
    ];

    setBatchGenerating(true);
    batchCancelRef.current = false;
    const progress = {};
    slides.forEach((_, i) => { progress[i] = 'pending'; });
    setBatchProgress({ ...progress });

    for (let i = 0; i < slides.length; i++) {
      if (batchCancelRef.current) break;
      if (generatedImages[i]) {
        progress[i] = 'done';
        setBatchProgress({ ...progress });
        continue;
      }

      progress[i] = 'generating';
      setBatchProgress({ ...progress });
      setPreviewSlideIndex(i);

      try {
        const prompt = generatePrompt(slides[i].type, slides[i].content);
        const { charImg, refImg, refImg2, bgImg } = getSlideImages(slides[i].type, slides[i].content);
        let imageUrl;

        const refImages = [charImg, refImg, refImg2, bgImg].filter(Boolean);
        if (refImages.length > 1) {
          imageUrl = await generateImageWithMultipleReferences(apiKey, prompt, refImages);
        } else if (refImages.length === 1) {
          imageUrl = await generateImageWithReference(apiKey, prompt, refImages[0]);
        } else {
          imageUrl = await generateImage(apiKey, prompt);
        }
        setGeneratedImages(prev => ({ ...prev, [i]: imageUrl }));
        progress[i] = 'done';
      } catch (err) {
        console.error(`Slide ${i} failed:`, err);
        progress[i] = 'error';
      }
      setBatchProgress({ ...progress });

      // Rate limit: wait 2s between requests
      if (i < slides.length - 1 && !batchCancelRef.current) {
        await new Promise(r => setTimeout(r, 2000));
      }
    }
    setBatchGenerating(false);
  }, [apiKey, coverTitle, introText, mainSlides, summaryItems, characterSource, uploadedImage, coverRefImage, coverRefImage2, introRefImage, summaryRefImage, generatedImages, generatePrompt]);

  const handleCancelBatch = () => {
    batchCancelRef.current = true;
  };

  const handleDownloadSingle = (slideIndex, title) => {
    const dataUrl = generatedImages[slideIndex];
    if (!dataUrl) return;
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `slide_${String(slideIndex + 1).padStart(2, '0')}_${title.replace(/[^a-zA-Z0-9\u3000-\u9FFF]/g, '_')}.png`;
    link.click();
  };

  const handleDownloadAll = async () => {
    const slides = [
      { type: 'cover', title: 'cover' },
      { type: 'intro', title: 'intro' },
      ...mainSlides.map((s, i) => ({ type: 'main', title: `main_${i + 1}` })),
      { type: 'summary', title: 'summary' }
    ];
    const zip = new JSZip();
    let hasAny = false;

    for (let i = 0; i < slides.length; i++) {
      const dataUrl = generatedImages[i];
      if (dataUrl) {
        const base64 = dataUrl.split(',')[1];
        zip.file(`slide_${String(i + 1).padStart(2, '0')}_${slides[i].title}.png`, base64, { base64: true });
        hasAny = true;
      }
    }

    if (!hasAny) return;
    const blob = await zip.generateAsync({ type: 'blob' });
    saveAs(blob, 'insta_feed_slides.zip');
  };

  const allSlides = [
    { type: 'cover', title: '1. 表紙', content: coverTitle },
    { type: 'intro', title: '2. 導入', content: introText },
    ...mainSlides.map((s, i) => ({ type: 'main', title: `${i + 3}. ${s.title}`, content: s, index: i })),
    { type: 'summary', title: '10. まとめ', content: summaryItems }
  ];

  const currentTheme = THEMES[selectedTheme];

  // カスタムカラー有効時のバリデーション
  const validMainColor = /^#[0-9A-Fa-f]{6}$/.test(customMainColor) ? customMainColor : '#E91E63';

  // effectiveColors: カスタムカラーON時はinline style、OFF時はTailwindクラス
  const effectiveColors = useCustomMainColor
    ? {
        band: '',
        bg: '',
        text: '',
        accent: '',
        bandStyle: { backgroundColor: validMainColor },
        bgGradientStyle: { background: `linear-gradient(to bottom right, ${lightenColor(validMainColor, 0.85)}, ${lightenColor(validMainColor, 0.92)})` },
        textColor: isLightColor(validMainColor) ? '#1e293b' : '#ffffff',
        accentColor: darkenColor(validMainColor, 0.3),
      }
    : {
        band: currentTheme.colors.band,
        bg: currentTheme.colors.bg,
        text: currentTheme.colors.text,
        accent: currentTheme.colors.accent,
        bandStyle: null,
        bgGradientStyle: null,
        textColor: null,
        accentColor: null,
      };

  // 枠カラー（frame背景用）
  const frameColor = useCustomMainColor
    ? validMainColor
    : (() => {
        const bandColorMap = {
          'bg-stone-200': '#a8a29e', 'bg-indigo-400': '#818cf8', 'bg-lime-400': '#a3e635',
          'bg-blue-600': '#2563eb', 'bg-yellow-400': '#facc15', 'bg-orange-500/80': '#f97316',
          'bg-navy-900': '#1e3a5f', 'bg-rose-200': '#fda4af',
        };
        return bandColorMap[currentTheme.colors.band] || '#ec4899';
      })();

  // 背景ヘルパー（グローバル設定のみ）
  const getSlideBg = () => {
    return { type: bgType, color: customBgColor, image: null, imageStyle: null, desc: bgDesc };
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans pb-20">

      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-slate-700 p-1.5 rounded-lg">
              <Instagram className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-lg font-bold text-slate-800 hidden sm:block">Insta Feed <span className="text-blue-600">Generator</span></h1>
            <h1 className="text-lg font-bold text-slate-800 sm:hidden">Insta Gen</h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex bg-slate-100 rounded-lg p-1">
              <button onClick={() => setActiveTab('edit')} className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-2 ${activeTab === 'edit' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}><Layout className="w-3 h-3" /> 手動作成</button>
              <button onClick={() => setActiveTab('ai')} className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-2 ${activeTab === 'ai' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}><Wand2 className="w-3 h-3" /> AI構成</button>
              <button onClick={() => setActiveTab('preview')} className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-2 ${activeTab === 'preview' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}><MonitorPlay className="w-3 h-3" /> 出力</button>
              <button onClick={() => setActiveTab('caption')} className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-2 ${activeTab === 'caption' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}><FileText className="w-3 h-3" /> キャプション</button>
              <button onClick={() => setActiveTab('blog')} className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-2 ${activeTab === 'blog' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}><BookOpenText className="w-3 h-3" /> ブログ</button>
            </div>
            <button
              onClick={() => { setApiKeyInput(apiKey); setShowSettings(true); }}
              className={`p-2 rounded-lg border transition-all ${apiKey ? 'text-blue-600 border-blue-200 bg-blue-50 hover:bg-blue-100' : 'text-slate-400 border-slate-200 hover:bg-slate-50'}`}
              title="API設定"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* --- Settings Modal --- */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowSettings(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="font-bold text-slate-700 flex items-center gap-2"><Settings className="w-5 h-5" /> API設定</h2>
              <button onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <label className="text-xs font-bold text-slate-500 block mb-2">Gemini APIキー<HelpTip text="Google AI StudioでGemini APIキーを取得して入力してください。画像生成・AI構成機能に必要です。キーはこのブラウザのみに保存され、外部には送信されません。" /></label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type={showApiKey ? 'text' : 'password'}
                      value={apiKeyInput}
                      onChange={(e) => setApiKeyInput(e.target.value)}
                      placeholder="AIza..."
                      className="w-full pr-10 text-sm p-3 border border-slate-200 rounded-lg focus:border-blue-400 outline-none font-mono"
                    />
                    <button
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 mt-2">Google AI Studio で取得できます。APIキーはこのブラウザにのみ保存されます。</p>
              </div>

              <button
                onClick={saveApiKey}
                disabled={!apiKeyInput.trim()}
                className="w-full py-3 bg-slate-700 text-white rounded-lg font-bold text-sm hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                保存
              </button>

              {apiKey && (
                <div className="flex items-center gap-2 text-xs text-blue-600 bg-blue-50 p-2 rounded-lg">
                  <Check className="w-4 h-4" />
                  APIキー設定済み
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 py-6">

        {activeTab === 'edit' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

            <div className="lg:col-span-4 space-y-6">

              <section className="bg-white rounded-xl border border-slate-200 overflow-hidden relative">
                <button
                  onClick={() => setThemeDropdownOpen(!themeDropdownOpen)}
                  className="w-full bg-slate-50 px-4 py-2.5 flex items-center justify-between hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Palette className="w-4 h-4 text-slate-500" />
                    <span className="text-xs font-bold text-slate-500 uppercase">テーマ</span><HelpTip text="投稿全体の雰囲気を決めるベーススタイルです。背景・配色・フォントのトーンがテーマに応じて変わります。" />
                    <span className="text-sm font-bold text-slate-800">{THEMES[selectedTheme].name}</span>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${themeDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                {themeDropdownOpen && (
                  <div className="border-t border-slate-200 p-3 grid grid-cols-1 gap-1.5">
                    {Object.entries(THEMES).map(([key, theme]) => (
                      <button
                        key={key}
                        onClick={() => { setSelectedTheme(key); setThemeDropdownOpen(false); }}
                        className={`text-left px-3 py-2 rounded-lg text-sm border transition-all flex items-center justify-between ${
                          selectedTheme === key ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <span>{theme.name}</span>
                        {selectedTheme === key && <Check className="w-4 h-4" />}
                      </button>
                    ))}
                  </div>
                )}
              </section>

              {/* メインカラー */}
              <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex justify-between items-center">
                  <h2 className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                    <Droplets className="w-4 h-4" /> メインカラー<HelpTip text="ONにすると、見出し帯・枠・アクセント色を好きな色に統一できます。OFFの場合はテーマのデフォルト色が使われます。" />
                  </h2>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={useCustomMainColor} onChange={() => setUseCustomMainColor(!useCustomMainColor)} />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-500"></div>
                  </label>
                </div>

                {useCustomMainColor && (
                  <div className="p-4 space-y-3">
                    <p className="text-[10px] text-slate-400">帯・背景・アクセント色をカスタムカラーで統一します</p>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={validMainColor}
                        onChange={(e) => setCustomMainColor(e.target.value)}
                        className="w-10 h-10 rounded-lg cursor-pointer border border-slate-200 p-0.5"
                      />
                      <input
                        type="text"
                        value={customMainColor}
                        onChange={(e) => setCustomMainColor(e.target.value)}
                        className="flex-1 text-xs border border-slate-200 rounded px-2 py-1.5 uppercase font-mono focus:border-blue-400 outline-none"
                        placeholder="#E91E63"
                      />
                    </div>
                    {/* プレビュースウォッチ */}
                    <div className="flex gap-1.5 items-center">
                      <div className="w-7 h-7 rounded-md border border-slate-200 shadow-sm" style={{ backgroundColor: validMainColor }} title="帯の色"></div>
                      <div className="w-7 h-7 rounded-md border border-slate-200 shadow-sm" style={{ backgroundColor: lightenColor(validMainColor, 0.85) }} title="背景 (薄)"></div>
                      <div className="w-7 h-7 rounded-md border border-slate-200 shadow-sm" style={{ backgroundColor: lightenColor(validMainColor, 0.92) }} title="背景 (最薄)"></div>
                      <div className="w-7 h-7 rounded-md border border-slate-200 shadow-sm" style={{ backgroundColor: darkenColor(validMainColor, 0.3) }} title="アクセント"></div>
                      <div className="flex flex-col ml-1">
                        <span className="text-[9px] text-slate-400 leading-tight">帯 / 背景 / アクセント</span>
                        <span className="text-[9px] text-slate-300 leading-tight">テキスト: {isLightColor(validMainColor) ? '暗色' : '白色'}自動</span>
                      </div>
                    </div>
                  </div>
                )}
              </section>

              {/* テキスト設定（固定: 太字ゴシック・中央揃え） */}
              <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="bg-slate-50 px-4 py-2 border-b border-slate-200">
                  <h2 className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                    <Type className="w-4 h-4" /> テキスト
                  </h2>
                </div>
                <div className="p-4">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Check className="w-3.5 h-3.5 text-blue-500" />
                    <span className="font-bold">太字ゴシック・中央揃え</span>
                    <span className="text-slate-400">（固定）</span>
                  </div>
                </div>
              </section>

              {/* 見出し・ボックススタイル */}
              <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="bg-slate-50 px-4 py-2 border-b border-slate-200">
                  <h2 className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                    <Maximize className="w-4 h-4" /> 見出し・ボックス
                  </h2>
                </div>
                <div className="p-4 space-y-4">
                  <div>
                    <label className="text-xs font-bold text-slate-400 block mb-2">見出し帯スタイル<HelpTip text="導入・コンテンツ・まとめスライドの上部に表示される見出し帯のデザインです。端まで帯＝画面いっぱいに広がる帯、余白あり＝少し内側に配置される角丸の帯。" /></label>
                    <p className="text-[10px] text-slate-400 mb-2">導入・コンテンツ・まとめ共通</p>
                    <div className="grid grid-cols-1 gap-2">
                      {HEADING_STYLES.map(h => (
                        <button
                          key={h.id}
                          onClick={() => setHeadingStyle(h.id)}
                          className={`flex items-center gap-3 p-3 rounded-lg border transition-all text-left ${
                            headingStyle === h.id
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <div className={`w-16 h-10 rounded border flex-shrink-0 flex flex-col overflow-hidden ${
                            headingStyle === h.id ? 'border-blue-400' : 'border-slate-300'
                          }`}>
                            {h.id === 'band_full' ? (
                              <>
                                <div className="h-3 bg-blue-400 w-full" />
                                <div className="flex-1 bg-slate-100" />
                              </>
                            ) : (
                              <>
                                <div className="h-1 bg-transparent" />
                                <div className="h-3 bg-blue-400 mx-1 rounded-sm" />
                                <div className="flex-1 bg-slate-100" />
                              </>
                            )}
                          </div>
                          <div>
                            <span className={`text-xs font-bold block ${headingStyle === h.id ? 'text-blue-700' : 'text-slate-600'}`}>{h.name}</span>
                            <span className="text-[9px] text-slate-400">{h.id === 'band_full' ? '端から端まで帯' : '余白付き帯（角丸）'}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 block mb-2">コンテンツボックス<HelpTip text="コンテンツスライド（3〜9枚目）の見出し帯の下エリアのデザイン。なし＝背景に直接配置、白ボックス全体＝白い背景で覆う、白ボックス外枠＝枠線だけ表示。" /></label>
                    <p className="text-[10px] text-slate-400 mb-2">3〜9枚目共通の中身エリア</p>
                    <div className="grid grid-cols-1 gap-2">
                      {CONTENT_BOX_STYLES.map(b => (
                        <button
                          key={b.id}
                          onClick={() => setContentBoxStyle(b.id)}
                          className={`flex items-center gap-3 p-3 rounded-lg border transition-all text-left ${
                            contentBoxStyle === b.id
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <div className={`w-16 h-10 rounded border flex-shrink-0 flex flex-col overflow-hidden ${
                            contentBoxStyle === b.id ? 'border-blue-400' : 'border-slate-300'
                          }`}>
                            {b.id === 'none' ? (
                              <div className="flex-1 bg-slate-100 flex items-center justify-center">
                                <span className="text-[8px] text-slate-400">−</span>
                              </div>
                            ) : b.id === 'white_full' ? (
                              <>
                                <div className="h-2.5 bg-blue-400 w-full" />
                                <div className="flex-1 bg-white m-0.5 rounded-sm" />
                              </>
                            ) : (
                              <>
                                <div className="h-2.5 bg-blue-400 w-full" />
                                <div className="flex-1 border border-slate-300 m-0.5 rounded-sm bg-transparent" />
                              </>
                            )}
                          </div>
                          <div>
                            <span className={`text-xs font-bold block ${contentBoxStyle === b.id ? 'text-blue-700' : 'text-slate-600'}`}>{b.name}</span>
                            <span className="text-[9px] text-slate-400">{b.id === 'none' ? '背景に直接配置' : b.id === 'white_full' ? '白背景で全面カバー' : '枠線のみ（中は透過）'}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              {/* 背景 */}
              <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="bg-slate-50 px-4 py-2 border-b border-slate-200">
                  <h2 className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                    <ImageIcon className="w-4 h-4" /> 背景
                  </h2>
                </div>
                <div className="p-4 space-y-3">
                  <div>
                    <label className="text-xs font-bold text-slate-400 block mb-2">背景タイプ（デフォルト）<HelpTip text="全スライド共通のベース背景です。白＝シンプル、無地＝好きな色、テーマ＝テーマに沿った背景、枠+白＝装飾枠付き、画像＝写真やテクスチャ。各スライドで個別変更も可能。" /></label>
                    <div className="grid grid-cols-3 gap-2 mb-2">
                      <button onClick={() => setBgType('white')} className={`py-2 rounded-md text-xs font-bold border ${bgType === 'white' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-500'}`}>白背景</button>
                      <button onClick={() => setBgType('solid')} className={`py-2 rounded-md text-xs font-bold border ${bgType === 'solid' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-500'}`}>無地(色)</button>
                      <button onClick={() => setBgType('theme')} className={`py-2 rounded-md text-xs font-bold border ${bgType === 'theme' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-500'}`}>テーマ</button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <button onClick={() => setBgType('frame')} className={`py-2 rounded-md text-xs font-bold border flex items-center justify-center gap-1 ${bgType === 'frame' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-500'}`}>
                        <BoxSelect className="w-3 h-3" /> 枠+白
                      </button>
                      <button onClick={() => setBgType('image')} className={`py-2 rounded-md text-xs font-bold border flex items-center justify-center gap-1 ${bgType === 'image' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-500'}`}>
                        <ImageIcon className="w-3 h-3" /> 画像
                      </button>
                    </div>
                    {bgType === 'solid' && (
                      <div className="flex items-center gap-2">
                        <input type="color" value={customBgColor} onChange={(e) => setCustomBgColor(e.target.value)} className="w-8 h-8 rounded cursor-pointer border-none" />
                        <input type="text" value={customBgColor} onChange={(e) => setCustomBgColor(e.target.value)} className="flex-1 text-xs border border-slate-200 rounded px-2 py-1.5 uppercase font-mono" placeholder="#FFFFFF" />
                      </div>
                    )}
                    {bgType === 'frame' && (
                      <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg border border-slate-200">
                        <div className="w-10 aspect-[4/5] rounded border-[3px] bg-white" style={{ borderColor: frameColor }}></div>
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-slate-500">枠カラー: {frameColor}</span>
                          <span className="text-[9px] text-slate-400">{useCustomMainColor ? 'メインカラー準拠' : 'テーマカラー準拠'}</span>
                        </div>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 block mb-1">背景の特徴・詳細（デフォルト）<HelpTip text="AIに背景の具体的なイメージを伝えるテキストです。例：「桜が舞う春の公園」「カフェの内装」など。空欄でもOK。" /></label>
                    <textarea
                      value={bgDesc}
                      onChange={(e) => setBgDesc(e.target.value)}
                      placeholder="例: 桜が舞う春の公園、夕焼けのビーチ、カフェの内装..."
                      className="w-full text-xs p-2 border border-slate-200 rounded-lg focus:border-blue-400 outline-none resize-none"
                      rows={2}
                    />
                  </div>
                  <p className="text-[9px] text-slate-400">※全スライド共通で適用されます</p>
                </div>
              </section>

              {/* キャラクター基本設定 */}
              <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex justify-between items-center">
                  <h2 className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                    <User className="w-4 h-4" /> キャラクター基本設定<HelpTip text="スライドに登場する人物キャラクターの設定です。ONにすると全スライドにキャラクターが配置されます。テキストで特徴を指定するか、参考画像をアップロードできます。" />
                  </h2>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={useCharacter} onChange={() => setUseCharacter(!useCharacter)} />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-500"></div>
                  </label>
                </div>

                {useCharacter && (
                  <div className="p-4 space-y-4">

                    <div>
                      <label className="text-xs font-bold text-slate-400 block mb-2">サイズ（表示の大きさ）<HelpTip text="キャラクターの表示サイズ。ちびキャラ＝デフォルメされた極小サイズ、小＝全身が見える、中＝上半身、大＝顔のアップ。" /></label>
                      <div className="grid grid-cols-2 gap-2">
                        {['chibi', 'small', 'medium', 'large'].map((size) => (
                          <button
                            key={size}
                            onClick={() => setCharacterSize(size)}
                            className={`py-1.5 text-xs font-bold rounded border ${characterSize === size ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-slate-200 text-slate-500'}`}
                          >
                            {size === 'chibi' ? 'ちびキャラ (極小)' :
                             size === 'small' ? '小 (全身)' :
                             size === 'medium' ? '中 (上半身)' : '大 (胸から上)'}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="bg-slate-100 p-1 rounded-lg flex">
                      <button onClick={() => setCharacterSource('ai')} className={`flex-1 py-1.5 text-xs font-bold rounded-md ${characterSource === 'ai' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500'}`}>AI生成用テキスト</button>
                      <button onClick={() => setCharacterSource('upload')} className={`flex-1 py-1.5 text-xs font-bold rounded-md ${characterSource === 'upload' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500'}`}>画像アップロード利用</button>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 block">
                        {characterSource === 'upload' ? '画像の特徴を詳細に言語化してください（AI生成用）' : 'キャラクターの特徴を入力'}
                      </label>
                      <textarea
                        className="w-full text-sm p-3 border rounded-md focus:ring-2 focus:ring-blue-100 outline-none resize-none"
                        rows={3}
                        value={characterDesc}
                        onChange={(e) => setCharacterDesc(e.target.value)}
                        placeholder={characterSource === 'upload'
                          ? "アップロード画像の特徴（例：茶髪ショートヘア、青いパーカーの女性...）\n※このテキストはプロンプトに使用されます"
                          : "例：眼鏡をかけた知的な女性、スーツ姿..."
                        }
                      />
                    </div>

                    {characterSource === 'upload' && (
                      <div className="space-y-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
                        <div
                          className="border-2 border-dashed border-slate-300 bg-white/50 rounded-lg p-4 text-center cursor-pointer hover:bg-white transition-colors relative overflow-hidden"
                          onClick={uploadedImage ? undefined : handleImageUpload}
                        >
                          {uploadedImage ? (
                            <div className="relative h-32 w-full flex items-center justify-center group">
                              <img src={uploadedImage} alt="Uploaded Character" className="h-full object-contain" />
                              <div className="absolute top-1 right-1 flex gap-1">
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleImageUpload(); }}
                                  className="bg-slate-600 text-white p-1 rounded-full shadow-md hover:bg-slate-700"
                                  title="画像を変更"
                                >
                                  <Upload className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); removeUploadedImage(); }}
                                  className="bg-red-500 text-white p-1 rounded-full shadow-md hover:bg-red-600"
                                  title="画像を削除"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="py-3">
                              <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                              <p className="text-xs text-slate-600 font-bold">キャラ画像をアップロード</p>
                              <p className="text-[10px] text-slate-400 mt-1">初回のみ。ブラウザに保存され次回以降自動読込</p>
                              <p className="text-[10px] text-slate-300">(PNG/JPG)</p>
                            </div>
                          )}
                        </div>

                        <div className="flex gap-2 text-[10px] text-slate-600 bg-white p-2 rounded border border-slate-100">
                          <Info className="w-4 h-4 text-slate-400 flex-shrink-0" />
                          <div>
                            画像はブラウザに保存されます。一度アップすれば次回以降は自動で読み込まれます。API呼び出し時にキャラクター参照として自動送信されます。
                          </div>
                        </div>
                      </div>
                    )}

                    {/* グローバル配置 */}
                    <div>
                      <label className="text-xs font-bold text-slate-400 block mb-2">配置（全スライド共通）<HelpTip text="全スライドでキャラクターを配置する位置です。一貫したレイアウトのために統一されます。" /></label>
                      <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
                        {POSITIONS.map((p) => {
                          const Icon = p.icon;
                          return (
                            <button
                              key={p.id}
                              onClick={() => setGlobalCharPos(p.id)}
                              className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md text-xs font-bold transition-all ${globalCharPos === p.id ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}
                              title={p.label}
                            >
                              <Icon className="w-3.5 h-3.5" />
                              {p.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </section>
            </div>

            {/* Right: Content Edit (Tabbed) */}
            <div className="lg:col-span-8">

              <div className="flex border-b border-slate-200 bg-white rounded-t-xl overflow-hidden">
                {['cover', 'intro', 'main', 'summary'].map(tab => (
                  <button
                    key={tab}
                    onClick={() => setContentTab(tab)}
                    className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${contentTab === tab ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-500' : 'text-slate-500 hover:bg-slate-50'}`}
                  >
                    {tab === 'cover' && <MousePointerClick className="w-4 h-4" />}
                    {tab === 'intro' && <FileText className="w-4 h-4" />}
                    {tab === 'main' && <ImageIcon className="w-4 h-4" />}
                    {tab === 'summary' && <List className="w-4 h-4" />}
                    {tab === 'cover' ? '表紙' : tab === 'intro' ? '導入' : tab === 'main' ? 'コンテンツ' : 'まとめ'}
                  </button>
                ))}
              </div>

              <div className="bg-white border-x border-b border-slate-200 rounded-b-xl p-6 min-h-[400px]">

                {/* Cover Tab */}
                {contentTab === 'cover' && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-bold text-slate-700 text-lg">投稿の表紙を作成</h3>
                      <span className="bg-slate-100 text-slate-500 text-xs px-2 py-1 rounded font-bold">1枚目</span>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-bold text-slate-400 block mb-1">サブタイトル（強調表示）<HelpTip text="表紙の上部に小さく表示されるキャッチコピーです。例：「初心者さんOK！」「保存版」。空欄でもOK。" /></label>
                        <input
                          type="text"
                          className="w-full text-sm font-bold p-2 border border-slate-200 rounded-lg focus:border-blue-400 outline-none"
                          value={coverSubtitle}
                          onChange={(e) => setCoverSubtitle(e.target.value)}
                          placeholder="例：初心者さんOK！"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-400 block mb-1">メインタイトル<HelpTip text="表紙の中央に大きく表示されるタイトルです。改行で複数行にできます。インパクトのある短い文が効果的。" /></label>
                        <textarea className="w-full text-lg font-bold p-3 border-2 border-slate-100 rounded-lg focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none resize-none" rows={3} value={coverTitle} onChange={(e) => { const raw = e.target.value; const chars = raw.replace(/\n/g, ''); const currentChars = coverTitle.replace(/\n/g, '').length; if (chars.length <= 25 || chars.length <= currentChars) setCoverTitle(raw); }} />
                        <span className={`text-[10px] ${coverTitle.replace(/\n/g, '').length > 25 ? 'text-red-400' : coverTitle.replace(/\n/g, '').length > 22 ? 'text-orange-400' : 'text-slate-400'}`}>{coverTitle.replace(/\n/g, '').length}/25文字</span>
                      </div>
                    </div>

                    {/* 表紙デザイン3層選択 */}
                    <div className="space-y-3">
                      {/* Layer 1: レイアウト */}
                      <div>
                        <label className="text-xs font-bold text-slate-500 block mb-1.5">🎨 レイアウト<HelpTip text="表紙のタイトルと背景の組み合わせ方です。シンプル＝テキスト直置き、帯＝帯状バナー、ダークオーバーレイ＝暗い半透明、ポップ枠＝装飾枠、カード型＝浮いたカード、対角線＝斜めレイアウト。" /></label>
                        <div className="grid grid-cols-2 gap-1.5">
                          {COVER_LAYOUTS.map((style) => {
                            const Icon = style.icon;
                            return (
                              <button
                                key={style.id}
                                onClick={() => setCoverLayout(style.id)}
                                className={`flex items-center gap-1.5 p-1.5 rounded-lg border text-xs font-bold transition-all ${
                                  coverLayout === style.id
                                    ? 'bg-blue-50 border-blue-500 text-blue-700'
                                    : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                                }`}
                              >
                                <Icon className="w-3.5 h-3.5" />
                                {style.name}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      {/* Layer 2: タイトルデザイン */}
                      <div>
                        <label className="text-xs font-bold text-slate-500 block mb-1.5">✏️ タイトルデザイン<HelpTip text="タイトル文字自体の装飾スタイルです。ドロップシャドウ＝影付き、枠文字＝縁取り、マーカー＝蛍光ペン風、グラデーション＝色変化、白フチ＝漫画風。" /></label>
                        <div className="grid grid-cols-2 gap-1.5">
                          {TITLE_DESIGNS.map((style) => {
                            const Icon = style.icon;
                            return (
                              <button
                                key={style.id}
                                onClick={() => setTitleDesign(style.id)}
                                className={`flex items-center gap-1.5 p-1.5 rounded-lg border text-xs font-bold transition-all ${
                                  titleDesign === style.id
                                    ? 'bg-blue-50 border-blue-500 text-blue-700'
                                    : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                                }`}
                              >
                                <Icon className="w-3.5 h-3.5" />
                                {style.name}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      {/* Layer 3: サブタイトル装飾 */}
                      <div>
                        <label className="text-xs font-bold text-slate-500 block mb-1.5">🏷️ サブタイトル装飾<HelpTip text="サブタイトルの装飾です。枠囲み＝ボーダー枠、ピル型＝丸いバッジ、タグ風＝値札風、マーカー＝ナナメ蛍光マーカーの上に文字。" /></label>
                        <div className="grid grid-cols-2 gap-1.5">
                          {SUBTITLE_DESIGNS.map((style) => {
                            const Icon = style.icon;
                            return (
                              <button
                                key={style.id}
                                onClick={() => setSubtitleDesign(style.id)}
                                className={`flex items-center gap-1.5 p-1.5 rounded-lg border text-xs font-bold transition-all ${
                                  subtitleDesign === style.id
                                    ? 'bg-blue-50 border-blue-500 text-blue-700'
                                    : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                                }`}
                              >
                                <Icon className="w-3.5 h-3.5" />
                                {style.name}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* 表紙追加デザインオプション */}
                    <div className="space-y-3 border-t border-slate-100 pt-3">
                      <p className="text-xs font-bold text-slate-500 flex items-center gap-1"><Star className="w-3 h-3" /> 追加デザインオプション</p>

                      {/* スワイプ誘導 */}
                      <div>
                        <label className="text-xs font-bold text-slate-500 block mb-1.5">👆 スワイプ誘導<HelpTip text="表紙にスワイプを促す要素を追加します。枚数バッジ＝「全10枚」表示、スワイプ矢印＝矢印アイコン、チラ見せ＝次スライドがチラッと見える演出。" /></label>
                        <div className="grid grid-cols-2 gap-1.5">
                          {SWIPE_GUIDES.map((item) => (
                            <button
                              key={item.id}
                              onClick={() => setSwipeGuide(item.id)}
                              className={`p-1.5 rounded-lg border text-xs font-bold transition-all ${
                                swipeGuide === item.id
                                  ? 'bg-blue-50 border-blue-500 text-blue-700'
                                  : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                              }`}
                            >
                              {item.name}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* アイキャッチバッジ */}
                      <div>
                        <label className="text-xs font-bold text-slate-500 block mb-1.5">🏅 アイキャッチバッジ<HelpTip text="表紙に目を引くバッジを配置します。数字強調＝「TOP5」等の大きい数字、ラベル＝「保存版」等のバッジ、リボン＝角のリボン装飾。" /></label>
                        <div className="grid grid-cols-2 gap-1.5">
                          {EYE_CATCH_BADGES.map((item) => (
                            <button
                              key={item.id}
                              onClick={() => setEyeCatchBadge(item.id)}
                              className={`p-1.5 rounded-lg border text-xs font-bold transition-all ${
                                eyeCatchBadge === item.id
                                  ? 'bg-blue-50 border-blue-500 text-blue-700'
                                  : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                              }`}
                            >
                              {item.name}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* タイトル文字サイズ強弱 */}
                      <div>
                        <label className="text-xs font-bold text-slate-500 block mb-1.5">🔤 タイトル強弱<HelpTip text="タイトル内の文字サイズにメリハリをつけます。均一＝全て同じサイズ、キーワード特大＝重要な語だけ大きく、1行目特大＝最初の行を大きく。" /></label>
                        <div className="grid grid-cols-3 gap-1.5">
                          {TITLE_EMPHASIS_OPTIONS.map((item) => (
                            <button
                              key={item.id}
                              onClick={() => setTitleEmphasis(item.id)}
                              className={`p-1.5 rounded-lg border text-xs font-bold transition-all ${
                                titleEmphasis === item.id
                                  ? 'bg-blue-50 border-blue-500 text-blue-700'
                                  : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                              }`}
                            >
                              {item.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {useCharacter && <SlideCharExpUI exp={coverCharExp} setExp={setCoverCharExp} bubble={coverBubble} setBubble={setCoverBubble} bubbleText={coverBubbleText} setBubbleText={setCoverBubbleText} />}
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <MiniImageUpload label="参考画像①" icon={ImageIcon} image={coverRefImage} setImage={setCoverRefImage} accentColor="blue" />
                        <MiniImageUpload label="参考画像②" icon={ImageIcon} image={coverRefImage2} setImage={setCoverRefImage2} accentColor="blue" />
                      </div>
                      <div className="flex gap-2 text-[10px] text-slate-500 bg-slate-50 p-2 rounded border border-slate-200">
                        <Info className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <div>表紙の参考画像はブラウザに保存されます。2枚まで設定でき、色味やレイアウトの参考にされます。</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Intro Tab */}
                {contentTab === 'intro' && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-bold text-slate-700 text-lg">導入（リード文）を作成</h3>
                      <span className="bg-slate-100 text-slate-500 text-xs px-2 py-1 rounded font-bold">2枚目</span>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-400 block mb-1">導入テキスト<HelpTip text="読者の共感を得るためのリード文です。「こんな悩みありませんか？」のような問いかけが効果的。表紙の次（2枚目）に表示されます。" /></label>
                      <textarea className="w-full text-sm p-3 border border-slate-200 rounded-lg focus:border-blue-400 outline-none resize-none" rows={4} value={introText} onChange={(e) => setIntroText(e.target.value)} />
                    </div>
                    {useCharacter && <SlideCharExpUI exp={introCharExp} setExp={setIntroCharExp} bubble={introBubble} setBubble={setIntroBubble} bubbleText={introBubbleText} setBubbleText={setIntroBubbleText} />}

                    {/* 導入キャラ個別設定 */}
                    {useCharacter && (
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                        <label className="text-xs font-bold text-slate-600 block">🎭 導入キャラクター（個別設定）<HelpTip text="導入スライド専用のキャラクターを設定できます。メインキャラとは別の人物（悩んでいる読者役など）を配置するのに便利です。ブラウザに保存されます。" /></label>
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 block mb-1">キャラの特徴</label>
                          <textarea
                            className="w-full text-sm p-2 border border-slate-200 rounded-lg focus:border-blue-400 outline-none resize-none"
                            rows={2}
                            value={introCharDesc}
                            onChange={(e) => setIntroCharDesc(e.target.value)}
                            placeholder="例：困っている表情の女性ちびキャラ、悩んでいるポーズ"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 block mb-1">キャラ参考画像（任意）</label>
                          <div
                            className="border-2 border-dashed border-slate-300 bg-white/50 rounded-lg p-3 text-center cursor-pointer hover:bg-white transition-colors relative overflow-hidden"
                            onClick={introCharImage ? undefined : (() => {
                              const input = document.createElement('input');
                              input.type = 'file'; input.accept = 'image/*';
                              input.onchange = (e) => { const file = e.target.files[0]; if (file) { const r = new FileReader(); r.onloadend = () => setIntroCharImage(r.result); r.readAsDataURL(file); } };
                              input.click();
                            })}
                          >
                            {introCharImage ? (
                              <div className="relative h-24 flex items-center justify-center">
                                <img src={introCharImage} alt="Intro Char" className="h-full object-contain rounded" />
                                <div className="absolute top-1 right-1 flex gap-1">
                                  <button onClick={(e) => { e.stopPropagation(); const input = document.createElement('input'); input.type = 'file'; input.accept = 'image/*'; input.onchange = (ev) => { const file = ev.target.files[0]; if (file) { const r = new FileReader(); r.onloadend = () => setIntroCharImage(r.result); r.readAsDataURL(file); } }; input.click(); }} className="bg-slate-600 text-white p-1 rounded-full shadow-md hover:bg-slate-700"><Upload className="w-3 h-3" /></button>
                                  <button onClick={(e) => { e.stopPropagation(); setIntroCharImage(null); }} className="bg-red-500 text-white p-1 rounded-full shadow-md hover:bg-red-600"><X className="w-3 h-3" /></button>
                                </div>
                              </div>
                            ) : (
                              <div className="py-2">
                                <Upload className="w-6 h-6 text-slate-400 mx-auto mb-1" />
                                <p className="text-[10px] text-slate-500 font-bold">導入用キャラ画像をアップロード</p>
                                <p className="text-[10px] text-slate-400">未設定の場合はメインキャラが使われます</p>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2 text-[10px] text-slate-500">
                          <Info className="w-4 h-4 text-slate-400 flex-shrink-0" />
                          <div>ブラウザに保存されます。メインキャラとは別の人物を導入に配置できます。</div>
                        </div>
                      </div>
                    )}

                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 mt-2">
                      <div className="flex items-center gap-2">
                        <button onClick={() => setIntroSwipe(!introSwipe)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${introSwipe ? 'bg-blue-50 text-blue-700 border border-blue-300' : 'bg-slate-100 text-slate-400 border border-slate-200'}`}>
                          <ArrowRight className={`w-3 h-3 ${introSwipe ? 'text-blue-500' : ''}`} />
                          スワイプ誘導 {introSwipe ? 'ON' : 'OFF'}
                        </button>
                        <span className="text-[10px] text-slate-400">右下に「スワイプして読む ▸▸」を表示</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <RefImageUpload refImage={introRefImage} setRefImage={setIntroRefImage} />
                      <div className="flex gap-2 text-[10px] text-slate-500 bg-slate-50 p-2 rounded border border-slate-200">
                        <Info className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <div>ブラウザに保存されます。一度アップすれば次回以降自動で読み込まれます。</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Main Tab */}
                {contentTab === 'main' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-slate-700 text-lg">メインコンテンツ</h3>
                      <button onClick={addMainSlide} disabled={mainSlides.length >= 7} className="text-xs bg-slate-700 text-white px-3 py-1.5 rounded-full font-bold hover:bg-slate-800 disabled:opacity-50 flex items-center gap-1"><Plus className="w-3 h-3" /> ページ追加</button>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                      <label className="text-xs font-bold text-slate-600 block">📌 コンテンツ共通デフォルト参考画像（2枚まで）<HelpTip text="2枚までアップでき、全コンテンツスライドのテイスト参考として使われます。個別スライドに参考画像がある場合はそちらが優先されます。ブラウザに保存されます。" /></label>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 block mb-1">参考画像 1</span>
                          <RefImageUpload refImage={contentDefaultRef} setRefImage={setContentDefaultRef} />
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 block mb-1">参考画像 2</span>
                          <RefImageUpload refImage={contentDefaultRef2} setRefImage={setContentDefaultRef2} />
                        </div>
                      </div>
                      <div className="flex gap-2 text-[10px] text-slate-500">
                        <Info className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <div>2枚で全コンテンツに適用。テイストの参考として画像生成に使用。ブラウザに保存され次回以降自動読込。</div>
                      </div>
                    </div>
                    <div className="space-y-8">
                      {mainSlides.map((slide, index) => (
                        <div key={index} className="bg-slate-50 rounded-xl border border-slate-200 p-4 relative transition-all group hover:border-blue-300">
                          <div className="absolute -left-2 -top-2 w-6 h-6 bg-slate-800 text-white rounded-full flex items-center justify-center font-bold text-xs shadow-sm z-10">{index + 3}</div>
                          <div className="space-y-3">
                            <div>
                              <label className="text-xs font-bold text-slate-400 block mb-1">ページタイトル<HelpTip text="見出し帯に表示されるタイトルです。短くわかりやすい見出しにしましょう。" /></label>
                              <input type="text" value={slide.title} onChange={(e) => updateMainSlide(index, 'title', e.target.value)} className="w-full font-bold text-slate-800 bg-white border border-slate-200 rounded px-2 py-1.5 focus:border-blue-400 outline-none" />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="text-xs font-bold text-slate-400 block mb-1">画像の説明<HelpTip text="AIが生成する中央画像の内容を説明します。「スマホの画面」「グラフ」など具体的に書くほど精度が上がります。" /></label>
                                <textarea rows={3} value={slide.imageDesc} onChange={(e) => updateMainSlide(index, 'imageDesc', e.target.value)} className="w-full text-sm bg-white border border-slate-200 rounded px-2 py-1.5 focus:border-blue-400 outline-none resize-none" />
                              </div>
                              <div>
                                <label className="text-xs font-bold text-slate-400 block mb-1">下部の説明文<HelpTip text="スライド下部に表示される解説テキストです。2〜3行程度で、ポイントを簡潔にまとめましょう。" /></label>
                                <textarea value={slide.text} onChange={(e) => updateMainSlide(index, 'text', e.target.value)} rows={4} className="w-full text-sm bg-white border border-slate-200 rounded px-2 py-1.5 focus:border-blue-400 outline-none resize-none" />
                              </div>
                            </div>
                            {useCharacter && (
                              <SlideCharExpUI
                                exp={slide.charExp} setExp={(v) => updateMainSlide(index, 'charExp', v)}
                              />
                            )}
                            <RefImageUpload refImage={slide.refImage} setRefImage={(v) => updateMainSlide(index, 'refImage', v)} />
                          </div>
                          {mainSlides.length > 1 && <button onClick={() => removeMainSlide(index)} className="absolute top-2 right-2 text-slate-300 p-1.5 rounded-full hover:text-red-500 hover:bg-red-50"><Trash2 className="w-4 h-4" /></button>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Summary Tab */}
                {contentTab === 'summary' && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-bold text-slate-700 text-lg">まとめページを作成</h3>
                      <span className="bg-slate-100 text-slate-500 text-xs px-2 py-1 rounded font-bold">10枚目</span>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-bold text-slate-400">箇条書きリスト<HelpTip text="コンテンツのタイトルから自動生成されます。自動同期をOFFにすると手動編集できます。各項目15文字以内。" /></label>
                        <button onClick={() => setSummaryAutoSync(!summaryAutoSync)} className={`text-[10px] font-bold px-2 py-1 rounded-md transition-colors ${summaryAutoSync ? 'bg-blue-50 text-blue-700 border border-blue-300' : 'bg-slate-100 text-slate-400 border border-slate-200'}`}>
                          自動同期 {summaryAutoSync ? 'ON' : 'OFF'}
                        </button>
                      </div>
                      {summaryAutoSync && <p className="text-[10px] text-blue-500 mb-2">コンテンツのタイトルから自動生成中（{summaryItems.length}項目）</p>}
                      <div className="space-y-2">
                        {summaryItems.map((item, index) => (
                          <div key={index} className="flex gap-2 items-center bg-white p-1 rounded border border-slate-100">
                            <span className="text-blue-500 font-bold px-2">•</span>
                            <input type="text" value={item} onChange={(e) => { if (e.target.value.length <= 15) { updateSummaryItem(index, e.target.value); if (summaryAutoSync) setSummaryAutoSync(false); } }} className="w-full border-none outline-none py-1 text-sm text-slate-700" placeholder="まとめのポイント" maxLength={15} readOnly={summaryAutoSync} />
                            <span className={`text-[9px] flex-shrink-0 ${item.length > 13 ? 'text-red-400' : 'text-slate-300'}`}>{item.length}/15</span>
                          </div>
                        ))}
                        {!summaryAutoSync && summaryItems.length < 7 && <button onClick={addSummaryItem} className="w-full py-2 text-xs text-slate-500 font-bold border border-dashed border-slate-300 rounded hover:bg-slate-50 flex items-center justify-center gap-1 mt-2"><Plus className="w-3 h-3" /> 項目を追加</button>}
                      </div>
                    </div>
                    {useCharacter && <SlideCharExpUI exp={summaryCharExp} setExp={setSummaryCharExp} bubble={summaryBubble} setBubble={setSummaryBubble} bubbleText={summaryBubbleText} setBubbleText={setSummaryBubbleText} />}
                    <div className="space-y-2">
                      <RefImageUpload refImage={summaryRefImage} setRefImage={setSummaryRefImage} />
                      <div className="flex gap-2 text-[10px] text-slate-500 bg-slate-50 p-2 rounded border border-slate-200">
                        <Info className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <div>ブラウザに保存されます。一度アップすれば次回以降自動で読み込まれます。</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* --- AI COMPOSITION MODE --- */}
        {activeTab === 'ai' && (
          <div className="max-w-4xl mx-auto space-y-6">

            {/* 入力セクション */}
            <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
                <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <Wand2 className="w-5 h-5 text-slate-600" />
                  AI自動構成
                </h2>
                <p className="text-xs text-slate-500 mt-1">ブログ記事や文字起こしなどの文章を入力すると、AIが10枚のインスタ投稿構成を自動で作成します</p>
              </div>
              <div className="p-6 space-y-4">
                {/* URL入力欄 */}
                <div>
                  <label className="text-sm font-bold text-slate-600 flex items-center gap-1.5 mb-2">
                    <Link className="w-3.5 h-3.5" /> URLから記事を読み込み
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={aiSourceUrl}
                      onChange={(e) => setAiSourceUrl(e.target.value)}
                      placeholder="https://example.com/article"
                      className="flex-1 text-sm px-4 py-2.5 border border-slate-200 rounded-lg focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none bg-slate-50/50"
                    />
                    <button
                      onClick={handleFetchUrl}
                      disabled={aiUrlFetching || !aiSourceUrl.trim()}
                      className="px-4 py-2.5 bg-slate-700 text-white rounded-lg font-bold text-xs hover:bg-slate-800 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                      {aiUrlFetching ? (
                        <><Loader2 className="w-3.5 h-3.5 animate-spin" /> 読み込み中...</>
                      ) : (
                        <><Link className="w-3.5 h-3.5" /> 読み込み</>
                      )}
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1.5">記事URLを入力して「読み込み」を押すと、記事内容が下のテキスト欄に自動入力されます</p>
                </div>

                {/* PDF/画像アップロード欄 */}
                <div>
                  <label className="text-sm font-bold text-slate-600 flex items-center gap-1.5 mb-2">
                    <Upload className="w-3.5 h-3.5" /> PDF・画像から読み込み
                  </label>
                  <div className="flex gap-2">
                    <label className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-all text-sm text-slate-500">
                      <Upload className="w-4 h-4" />
                      <span>PDF・スクリーンショットをアップロード</span>
                      <input
                        type="file"
                        accept=".pdf,image/png,image/jpeg,image/webp"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileExtract(file);
                          e.target.value = '';
                        }}
                        disabled={aiUrlFetching}
                      />
                    </label>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1.5">記事のPDFやスクリーンショットをアップロードすると、画像内のテキスト・図表も含めて記事内容を抽出します</p>
                </div>

                {/* エラー表示 */}
                {aiError && (aiError.includes('URL') || aiError.includes('ファイル')) && (
                  <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-200">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>{aiError}</span>
                  </div>
                )}

                <div className="border-t border-slate-200" />

                {/* テキスト入力欄 */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-bold text-slate-600">元になる文章<HelpTip text="ブログ記事、動画の文字起こし、メモなどを貼り付けてください。AIがこの文章を分析して、10枚のインスタ投稿構成（表紙・導入・コンテンツ・まとめ）を自動で作成します。" /></label>
                    <span className="text-xs text-slate-400">{aiSourceText.length.toLocaleString()} 文字</span>
                  </div>
                  <textarea
                    value={aiSourceText}
                    onChange={(e) => setAiSourceText(e.target.value)}
                    placeholder={"ここにブログ記事、動画の文字起こし、メモなどを貼り付けてください...\n\n例:\n・ブログ記事のコピペ\n・YouTubeの文字起こしデータ\n・箇条書きのメモ\n・企画のアイデアテキスト"}
                    className="w-full text-sm p-4 border border-slate-200 rounded-xl focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none resize-none bg-slate-50/50"
                    rows={12}
                  />
                </div>

                {aiError && (
                  <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-200">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>{aiError}</span>
                  </div>
                )}

                <button
                  onClick={handleAiGenerate}
                  disabled={aiGenerating || !aiSourceText.trim()}
                  className="w-full py-3.5 rounded-xl font-bold text-base transition-all flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-800 text-white disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-slate-200"
                >
                  {aiGenerating ? (
                    <><Loader2 className="w-5 h-5 animate-spin" /> AIが構成を考えています...</>
                  ) : (
                    <><Wand2 className="w-5 h-5" /> AIに構成を考えてもらう</>
                  )}
                </button>

                {!apiKey && (
                  <p className="text-xs text-slate-600 bg-slate-100 p-2 rounded-lg text-center">
                    右上の設定ボタンからAPIキーを設定してください
                  </p>
                )}
              </div>
            </section>

            {/* 生成結果 */}
            {aiResult && (
              <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="bg-blue-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                  <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                    <Check className="w-5 h-5 text-blue-600" />
                    構成案が完成しました
                  </h2>
                  <span className="text-xs text-slate-500 bg-white px-2 py-1 rounded-full border border-slate-200">
                    全{2 + (aiResult.mainSlides?.length || 0)}枚
                  </span>
                </div>
                <div className="p-6 space-y-3">

                  {/* 表紙カード */}
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="bg-slate-700 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">1</span>
                      <span className="text-xs font-bold text-slate-600">表紙</span>
                    </div>
                    <h3 className="text-lg font-black text-slate-800 leading-snug whitespace-pre-line">{aiResult.coverTitle}</h3>
                    {aiResult.coverSubtitle && (
                      <span className="inline-block mt-1.5 text-xs font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">{aiResult.coverSubtitle}</span>
                    )}
                  </div>

                  {/* 導入カード */}
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="bg-slate-700 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">2</span>
                      <span className="text-xs font-bold text-slate-600">導入</span>
                    </div>
                    <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{aiResult.introText}</p>
                  </div>

                  {/* メインスライドカード */}
                  {aiResult.mainSlides?.map((slide, i) => (
                    <div key={i} className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="bg-slate-700 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">{i + 3}</span>
                        <span className="text-xs font-bold text-slate-600">コンテンツ</span>
                      </div>
                      <h4 className="font-bold text-slate-800 text-sm mb-1">{slide.title}</h4>
                      <p className="text-xs text-slate-500 mb-1.5 italic">{slide.imageDesc}</p>
                      <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{slide.text}</p>
                    </div>
                  ))}

                  {/* まとめカード */}
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="bg-slate-700 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">{2 + (aiResult.mainSlides?.length || 0) + 1}</span>
                      <span className="text-xs font-bold text-slate-600">まとめ</span>
                    </div>
                    <ul className="space-y-1.5">
                      {aiResult.summaryItems?.map((item, i) => (
                        <li key={i} className="text-sm text-slate-700 flex items-start gap-2">
                          <span className="text-blue-500 font-bold mt-0.5">✔</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* アクションボタン */}
                  <div className="flex gap-3 pt-3">
                    <button
                      onClick={applyAiResult}
                      className="flex-1 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200"
                    >
                      <Check className="w-4 h-4" /> この構成を採用する
                    </button>
                    <button
                      onClick={handleAiGenerate}
                      disabled={aiGenerating}
                      className="px-6 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 bg-white border border-slate-300 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                    >
                      <RefreshCw className={`w-4 h-4 ${aiGenerating ? 'animate-spin' : ''}`} /> 再生成
                    </button>
                  </div>
                </div>
              </section>
            )}
          </div>
        )}

        {/* --- PREVIEW MODE --- */}
        {activeTab === 'preview' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

            {/* Left: Visual Preview List */}
            <div className="lg:col-span-4 h-[calc(100vh-140px)] overflow-y-auto pr-2 space-y-3">
              <h2 className="text-xs font-bold text-slate-500 uppercase sticky top-0 bg-slate-50 py-2 z-10">スライド一覧</h2>

              {/* Batch Generate Button */}
              <div className="sticky top-8 z-10 pb-2">
                {!batchGenerating ? (
                  <button
                    onClick={handleBatchGenerate}
                    className="w-full py-2.5 bg-slate-700 text-white rounded-lg font-bold text-xs hover:bg-slate-800 transition-all flex items-center justify-center gap-2 shadow-lg"
                  >
                    <Wand2 className="w-4 h-4" /> 全スライドを一括生成
                  </button>
                ) : (
                  <button
                    onClick={handleCancelBatch}
                    className="w-full py-2.5 bg-red-500 text-white rounded-lg font-bold text-xs hover:bg-red-600 transition-all flex items-center justify-center gap-2"
                  >
                    <X className="w-4 h-4" /> 生成を中止
                  </button>
                )}

                {/* Download All */}
                {Object.keys(generatedImages).length > 0 && (
                  <button
                    onClick={handleDownloadAll}
                    className="w-full mt-2 py-2 bg-slate-800 text-white rounded-lg font-bold text-xs hover:bg-slate-900 transition-all flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" /> 全画像をZIPダウンロード ({Object.keys(generatedImages).length}枚)
                  </button>
                )}
              </div>

              {allSlides.map((slide, idx) => {
                const thumbBg = getSlideBg();
                return (
                <div key={idx} onClick={() => setPreviewSlideIndex(idx)} className={`p-3 rounded-lg border-2 cursor-pointer transition-all flex gap-3 items-center ${previewSlideIndex === idx ? 'border-blue-500 bg-white shadow-md' : 'border-transparent bg-white hover:border-blue-200'}`}>
                  <div className="w-12 aspect-[4/5] rounded flex-shrink-0 flex items-center justify-center text-[10px] font-bold border border-slate-200 overflow-hidden relative"
                    style={{
                      background: thumbBg.type === 'solid' ? thumbBg.color
                        : (thumbBg.type === 'white' || thumbBg.type === 'frame') ? '#fff'
                        : thumbBg.type === 'image' && thumbBg.image ? `url(${thumbBg.image}) center/cover no-repeat`
                        : undefined
                    }}
                  >
                    {generatedImages[idx] ? (
                      <img src={generatedImages[idx]} alt="" className="absolute inset-0 w-full h-full object-cover" />
                    ) : (
                      <>
                        {thumbBg.type === 'theme' && (
                          <div
                            className={`absolute inset-0 ${!useCustomMainColor ? `bg-gradient-to-br ${currentTheme.colors.bg}` : ''}`}
                            style={effectiveColors.bgGradientStyle || undefined}
                          ></div>
                        )}
                        {thumbBg.type === 'frame' && (
                          <div className="absolute inset-0 border-2 rounded" style={{ borderColor: frameColor }}></div>
                        )}
                        {thumbBg.type === 'image' && !thumbBg.image && thumbBg.imageStyle && (
                          <div className="absolute inset-0 bg-slate-100 flex items-center justify-center">
                            <span className="text-[7px] text-slate-400 font-bold">{BG_IMAGE_STYLES.find(s => s.id === thumbBg.imageStyle)?.name}</span>
                          </div>
                        )}
                        <div
                          className={`absolute inset-x-0 ${slide.type === 'main' ? 'top-0 h-1/4' : 'hidden'} ${effectiveColors.band} opacity-50 z-10`}
                          style={effectiveColors.bandStyle || undefined}
                        ></div>
                      </>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-slate-700 truncate flex items-center gap-1.5">
                      {batchProgress[idx] === 'generating' && <Loader2 className="w-3 h-3 animate-spin text-blue-500 flex-shrink-0" />}
                      {batchProgress[idx] === 'done' && <Check className="w-3 h-3 text-blue-500 flex-shrink-0" />}
                      {batchProgress[idx] === 'error' && <AlertCircle className="w-3 h-3 text-red-500 flex-shrink-0" />}
                      {generatedImages[idx] && !batchGenerating && <Check className="w-3 h-3 text-blue-500 flex-shrink-0" />}
                      {slide.title}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">{typeof slide.content === 'string' ? slide.content : 'コンテンツ詳細'}</div>
                  </div>
                </div>
                );
              })}
            </div>

            {/* Right: Detail & Prompt */}
            <div className="lg:col-span-8 space-y-6">

              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col items-center">
                {/* Generated Image or Mock Preview */}
                {generatedImages[previewSlideIndex] ? (
                  <div className="w-full max-w-[320px] aspect-[4/5] relative rounded shadow-2xl overflow-hidden">
                    <img src={generatedImages[previewSlideIndex]} alt="Generated" className="w-full h-full object-cover" />
                    {/* Overlay buttons */}
                    <div className="absolute bottom-3 right-3 flex gap-2">
                      <button
                        onClick={() => handleDownloadSingle(previewSlideIndex, allSlides[previewSlideIndex].title)}
                        className="p-2 bg-white/90 rounded-lg shadow-md hover:bg-white transition-colors"
                        title="ダウンロード"
                      >
                        <Download className="w-4 h-4 text-slate-700" />
                      </button>
                      <button
                        onClick={() => handleGenerateSingle(previewSlideIndex)}
                        className="p-2 bg-white/90 rounded-lg shadow-md hover:bg-white transition-colors"
                        title="再生成"
                        disabled={generatingIndex === previewSlideIndex}
                      >
                        <RefreshCw className={`w-4 h-4 text-slate-700 ${generatingIndex === previewSlideIndex ? 'animate-spin' : ''}`} />
                      </button>
                    </div>
                  </div>
                ) : generatingIndex === previewSlideIndex ? (
                  <div className="w-full max-w-[320px] aspect-[4/5] relative rounded shadow-2xl overflow-hidden bg-slate-100 flex flex-col items-center justify-center gap-4">
                    <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
                    <div className="text-sm font-bold text-slate-500">画像を生成中...</div>
                    <div className="text-[10px] text-slate-400">30秒〜1分ほどかかります</div>
                  </div>
                ) : (() => {
                    const previewBg = getSlideBg();
                    return (
                  <div className="w-full max-w-[320px] aspect-[4/5] relative rounded shadow-2xl overflow-hidden text-center flex flex-col"
                    style={{
                      backgroundColor: previewBg.type === 'solid' ? previewBg.color
                        : (previewBg.type === 'white' || previewBg.type === 'frame') ? '#fff'
                        : undefined
                    }}
                  >
                    {previewBg.type === 'theme' && (
                      <div
                        className={`absolute inset-0 ${!useCustomMainColor ? `bg-gradient-to-br ${currentTheme.colors.bg}` : ''}`}
                        style={effectiveColors.bgGradientStyle || undefined}
                      ></div>
                    )}
                    {previewBg.type === 'frame' && (
                      <div className="absolute inset-0 pointer-events-none z-20" style={{ borderTop: `28px solid ${frameColor}`, borderBottom: `34px solid ${frameColor}`, borderLeft: `8px solid ${frameColor}`, borderRight: `8px solid ${frameColor}` }}></div>
                    )}
                    {previewBg.type === 'image' && previewBg.image && (
                      <div className="absolute inset-0" style={{ backgroundImage: `url(${previewBg.image})`, backgroundSize: 'cover', backgroundPosition: 'center' }}></div>
                    )}
                    {previewBg.type === 'image' && !previewBg.image && previewBg.imageStyle && (
                      <div className="absolute inset-0 bg-slate-100 flex items-center justify-center">
                        <span className="text-xs text-slate-400 font-bold">{BG_IMAGE_STYLES.find(s => s.id === previewBg.imageStyle)?.name} スタイル</span>
                      </div>
                    )}
                    {previewBg.type === 'image' && !previewBg.image && !previewBg.imageStyle && (
                      <div className="absolute inset-0 bg-slate-50 flex items-center justify-center">
                        <ImageIcon className="w-8 h-8 text-slate-200" />
                      </div>
                    )}

                    {useCharacter && (
                      <>
                        <div className={`absolute flex items-end justify-center z-0 transition-all duration-300
                          ${(() => {
                              let pos = globalCharPos;

                              let sizeClass = 'h-[60%] w-[50%]';
                              if (characterSize === 'small') sizeClass = 'h-[75%] w-[50%]';
                              if (characterSize === 'large') sizeClass = 'h-[45%] w-[60%]';
                              if (characterSize === 'chibi') sizeClass = 'h-[25%] w-[25%]';

                              let posClass = '';
                              if (pos === 'top_left') posClass = `top-0 left-[-5%] items-start pt-4`;
                              if (pos === 'top_right') posClass = `top-0 right-[-5%] items-start pt-4`;
                              if (pos === 'bottom_left') posClass = `bottom-0 left-[-5%] items-end pb-0`;
                              if (pos === 'bottom_right') posClass = `bottom-0 right-[-5%] items-end pb-0`;

                              if (characterSize === 'chibi') {
                                if (pos === 'top_left') posClass = `top-4 left-4 items-center`;
                                if (pos === 'top_right') posClass = `top-4 right-4 items-center`;
                                if (pos === 'bottom_left') posClass = `bottom-4 left-4 items-center`;
                                if (pos === 'bottom_right') posClass = `bottom-4 right-4 items-center`;
                              }

                              return `${sizeClass} ${posClass}`;
                          })()}
                        `}>
                          {characterSource === 'upload' && uploadedImage ? (
                            <img src={uploadedImage} alt="Char" className="h-full w-full object-contain drop-shadow-lg" />
                          ) : (
                            <div className={`w-full h-full bg-slate-800/10 rounded-t-full blur-sm flex items-end justify-center pb-4 ${characterSize === 'chibi' ? 'rounded-full' : ''}`}>
                              <span className="text-slate-500/50 text-[10px] font-bold">
                                {(() => {
                                  let exp = '';
                                  if (allSlides[previewSlideIndex].type === 'cover') exp = coverCharExp;
                                  else if (allSlides[previewSlideIndex].type === 'intro') exp = introCharExp;
                                  else if (allSlides[previewSlideIndex].type === 'summary') exp = summaryCharExp;
                                  else if (allSlides[previewSlideIndex].type === 'main') exp = allSlides[previewSlideIndex].content.charExp;
                                  return exp ? exp.split(',')[0] : 'Char';
                                })()}
                              </span>
                            </div>
                          )}
                        </div>

                        {(() => {
                            let bubble = false;
                            let pos = 'bottom_right';
                            let bubbleText = '';
                            const slide = allSlides[previewSlideIndex];

                            pos = globalCharPos;
                            if (slide.type === 'cover') { bubble = coverBubble; bubbleText = coverBubbleText; }
                            else if (slide.type === 'intro') { bubble = introBubble; bubbleText = introBubbleText; }
                            else if (slide.type === 'summary') { bubble = summaryBubble; bubbleText = summaryBubbleText; }

                            if (!bubble) return null;

                            let bubblePosClass = '';
                            if (pos === 'top_left') bubblePosClass = 'top-32 left-24 rounded-tl-none';
                            if (pos === 'top_right') bubblePosClass = 'top-32 right-24 rounded-tr-none';
                            if (pos === 'bottom_left') bubblePosClass = 'bottom-1/2 left-20 rounded-bl-none';
                            if (pos === 'bottom_right') bubblePosClass = 'bottom-1/2 right-20 rounded-br-none';

                            if (characterSize === 'chibi') {
                              if (pos === 'top_left') bubblePosClass = 'top-4 left-20 rounded-tl-none';
                              if (pos === 'top_right') bubblePosClass = 'top-4 right-20 rounded-tr-none';
                              if (pos === 'bottom_left') bubblePosClass = 'bottom-16 left-20 rounded-bl-none';
                              if (pos === 'bottom_right') bubblePosClass = 'bottom-16 right-20 rounded-br-none';
                            }

                            return (
                              <div className={`absolute bg-white rounded-2xl flex items-center justify-center shadow-lg z-10 opacity-95 border-2 border-slate-100 p-2 min-w-[70px] ${bubblePosClass}`}>
                                <div className="text-[10px] font-bold text-slate-700 leading-tight text-center whitespace-pre-wrap">
                                  {bubbleText || '...'}
                                </div>
                              </div>
                            );
                        })()}
                      </>
                    )}

                    <div className="relative z-10 w-full h-full flex flex-col pointer-events-none">
                      {allSlides[previewSlideIndex].type === 'intro' && (
                        <div className={`w-full py-4 px-2 ${effectiveColors.band} shadow-md`} style={effectiveColors.bandStyle || undefined}>
                          <h3 className={`text-sm font-bold truncate ${effectiveColors.text} text-center`} style={effectiveColors.textColor ? { color: effectiveColors.textColor } : undefined}>{coverTitle}</h3>
                        </div>
                      )}
                      {(allSlides[previewSlideIndex].type === 'main' || allSlides[previewSlideIndex].type === 'summary') && (
                        <div className={`w-full py-4 px-2 ${effectiveColors.band} shadow-md`} style={effectiveColors.bandStyle || undefined}>
                          <h3 className={`text-sm font-bold truncate ${effectiveColors.text}`} style={effectiveColors.textColor ? { color: effectiveColors.textColor } : undefined}>{allSlides[previewSlideIndex].type === 'main' ? allSlides[previewSlideIndex].content.title : 'まとめ'}</h3>
                        </div>
                      )}
                      <div className={`flex-1 flex flex-col justify-center p-10 ${globalTextAlign === 'left' ? 'items-start text-left' : 'items-center text-center'}`}>
                        {allSlides[previewSlideIndex].type === 'cover' && (() => {
                          const titleProps = getTitleH1Style();
                          const frameColor = useCustomMainColor ? validMainColor : '#64748b';

                          // デコ＋タイトル レイアウト（装飾背景＋縁取りタイトル）
                          if (coverLayout === 'frame_title') {
                            return (
                              <div className="w-full h-full relative flex flex-col items-center justify-between z-30" style={{ padding: '20px 16px 12px 16px' }}>
                                {/* 上部: サブタイトル枠 */}
                                <div className="flex flex-col items-center pt-2">
                                  {coverSubtitle && (
                                    <div className="px-4 py-1 text-xs font-bold inline-block rounded-full" style={{ border: `2px solid ${frameColor}`, color: frameColor }}>
                                      {coverSubtitle}
                                    </div>
                                  )}
                                </div>
                                {/* 中央: 縁取りタイトル */}
                                <div className="flex flex-col items-center flex-1 justify-center px-2">
                                  <h1 className="text-3xl font-black leading-tight text-center whitespace-pre-wrap" style={{ color: '#4988C4', WebkitTextStroke: '1.5px #0F2854', paintOrder: 'stroke fill' }}>{coverTitle}</h1>
                                </div>
                                {/* 下部: キャラ左 + Swipe右 */}
                                <div className="w-full flex items-end justify-between px-1">
                                  <div className="flex items-end gap-2">
                                    {characterSource === 'upload' && uploadedImage ? (
                                      <img src={uploadedImage} alt="Char" className="h-14 object-contain drop-shadow-lg" />
                                    ) : (
                                      <div className="w-10 h-14 bg-slate-100 rounded-lg flex items-center justify-center">
                                        <User className="w-5 h-5 text-slate-400" />
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex flex-col items-end gap-1">
                                    {eyeCatchBadge === 'label' && <div className="text-white text-[7px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: frameColor }}>保存版</div>}
                                    <span className="text-slate-400 text-[9px] font-bold flex items-center gap-0.5">Swipe <span className="text-[7px]">▸▸</span></span>
                                  </div>
                                </div>
                              </div>
                            );
                          }

                          // カード型レイアウト
                          if (coverLayout === 'card') {
                            return (
                              <div className="w-full h-full relative flex items-center justify-center p-10">
                                <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl p-8 max-w-[85%] flex flex-col items-center z-10 border border-white/50">
                                  {renderSubtitleBadge(coverSubtitle)}
                                  <h1 className={titleProps.className} style={titleProps.style}>{coverTitle}</h1>
                                </div>
                                {swipeGuide === 'swipe_arrow' && <div className="absolute bottom-3 right-3 text-white/80 text-[9px] font-bold flex items-center gap-1 z-20 bg-black/40 px-1.5 py-0.5 rounded">Swipe <span className="text-[7px] tracking-tight">▸▸</span></div>}
                                {eyeCatchBadge === 'label' && <div className="absolute top-2 left-2 bg-pink-500 text-white text-[8px] font-bold px-2 py-0.5 rounded-full z-20">保存版</div>}
                              </div>
                            );
                          }

                          // band / pop_frame レイアウト
                          return (
                            <div
                              className={`w-full relative flex flex-col justify-center items-center h-full
                                ${coverLayout === 'band' ? `${effectiveColors.band} py-12 -mx-10 px-10 shadow-lg` : ''}
                                ${coverLayout === 'pop_frame' ? 'p-2' : ''}
                              `}
                              style={coverLayout === 'band' && effectiveColors.bandStyle ? { ...effectiveColors.bandStyle, opacity: 0.9 } : undefined}
                            >
                              {coverLayout === 'pop_frame' && <div className="absolute inset-0 border-4 border-white rounded-lg pointer-events-none"></div>}
                              <div className="relative z-10 flex flex-col items-center">
                                {renderSubtitleBadge(coverSubtitle)}
                                <h1 className={titleProps.className} style={titleProps.style}>{coverTitle}</h1>
                              </div>
                              {swipeGuide === 'swipe_arrow' && <div className="absolute bottom-3 right-3 text-white/80 text-[9px] font-bold flex items-center gap-1 z-20 bg-black/40 px-1.5 py-0.5 rounded">Swipe <span className="text-[7px] tracking-tight">▸▸</span></div>}
                              {eyeCatchBadge === 'label' && <div className="absolute top-2 left-2 bg-pink-500 text-white text-[8px] font-bold px-2 py-0.5 rounded-full z-20">保存版</div>}
                            </div>
                          );
                        })()}
                        {allSlides[previewSlideIndex].type === 'intro' && (
                          <div className="w-full h-full flex flex-col justify-center">
                            <p className={`text-sm font-medium leading-loose w-full ${effectiveColors.text} bg-white/50 backdrop-blur-sm p-4 rounded-lg shadow-sm`} style={effectiveColors.textColor ? { color: effectiveColors.textColor } : undefined}>{introText}</p>
                          </div>
                        )}
                        {allSlides[previewSlideIndex].type === 'main' && (
                          <div className="w-full h-full flex flex-col gap-2 pt-2">
                            <div className="flex-1 bg-slate-900/10 rounded-lg flex items-center justify-center text-slate-400 text-xs"><ImageIcon className="w-8 h-8 opacity-50" /></div>
                            <div className={`p-3 bg-white/80 backdrop-blur-sm rounded-lg text-xs shadow-sm ${effectiveColors.accent} ${globalTextAlign === 'left' ? 'text-left' : 'text-center'}`} style={effectiveColors.accentColor ? { color: effectiveColors.accentColor } : undefined}>{allSlides[previewSlideIndex].content.text}</div>
                          </div>
                        )}
                        {allSlides[previewSlideIndex].type === 'summary' && (
                          <div className="w-full h-full bg-white/60 rounded-lg p-6 flex flex-col justify-center space-y-3">
                            {summaryItems.map((item, i) => item && <div key={i} className="flex gap-2 text-xs font-bold text-slate-700"><span className="text-blue-500">✔</span> {item}</div>)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                    );
                  })()}
                <p className="mt-4 text-xs text-slate-400">
                  {generatedImages[previewSlideIndex] ? '✨ AI生成画像' : '※プレビューはイメージです。実際の生成画像とは異なります。'}
                </p>
              </div>

              <div className="bg-slate-800 rounded-xl overflow-hidden shadow-lg">
                <div className="bg-slate-900 px-4 py-2 border-b border-slate-700 flex justify-between items-center">
                  <div className="text-xs font-bold text-white flex items-center gap-2"><Sparkles className="w-4 h-4 text-yellow-400" /> 生成プロンプト ({allSlides[previewSlideIndex].title})</div>
                </div>
                <div className="p-4 space-y-3">
                  <p className="text-xs font-mono text-slate-300 leading-relaxed break-words max-h-32 overflow-y-auto">{(() => { const slide = allSlides[previewSlideIndex]; return generatePrompt(slide.type, slide.content); })()}</p>

                  {/* Error Display */}
                  {genError && generatingIndex === null && (
                    <div className="flex items-start gap-2 text-xs text-red-400 bg-red-900/30 p-2 rounded">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <span>{genError}</span>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={() => { const slide = allSlides[previewSlideIndex]; copyToClipboard(generatePrompt(slide.type, slide.content), previewSlideIndex); }}
                      className={`flex-1 py-2 rounded font-bold text-sm transition-all flex items-center justify-center gap-2 ${copiedIndex === previewSlideIndex ? 'bg-blue-500 text-white' : 'bg-slate-600 hover:bg-slate-500 text-white'}`}
                    >
                      {copiedIndex === previewSlideIndex ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      {copiedIndex === previewSlideIndex ? 'コピー済' : 'コピー'}
                    </button>
                    <button
                      onClick={() => handleGenerateSingle(previewSlideIndex)}
                      disabled={generatingIndex !== null || batchGenerating}
                      className="flex-1 py-2 rounded font-bold text-sm transition-all flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {generatingIndex === previewSlideIndex ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> 生成中...</>
                      ) : (
                        <><Wand2 className="w-4 h-4" /> この画像を生成</>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'caption' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* LEFT: キャプション */}
            <div>
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                    <FileText className="w-4 h-4" /> キャプション生成
                  </h2>
                  <button
                    onClick={handleGenerateCaption}
                    disabled={captionGenerating}
                    className="px-4 py-2 bg-slate-700 text-white rounded-lg font-bold text-xs hover:bg-slate-800 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {captionGenerating ? (
                      <><Loader2 className="w-3.5 h-3.5 animate-spin" /> 生成中...</>
                    ) : (
                      <><Wand2 className="w-3.5 h-3.5" /> キャプションを生成</>
                    )}
                  </button>
                </div>

                <p className="text-xs text-slate-400 mb-4">
                  投稿の内容（タイトル・導入・スライド・まとめ）をもとに、約1000文字のキャプション文を自動生成します。
                </p>

                {captionText ? (
                  <div className="space-y-3">
                    <div className="relative">
                      <textarea
                        value={captionText}
                        onChange={(e) => setCaptionText(e.target.value)}
                        className="w-full h-[55vh] p-4 border border-slate-200 rounded-lg text-sm text-slate-700 leading-relaxed resize-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none"
                      />
                      <div className="absolute bottom-3 right-3 text-xs text-slate-400">
                        {captionText.length}文字
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleCopyCaption}
                        className={`flex-1 py-2.5 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 ${captionCopied ? 'bg-blue-50 text-blue-600 border border-blue-300' : 'bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200'}`}
                      >
                        {captionCopied ? <><Check className="w-4 h-4" /> コピーしました！</> : <><Copy className="w-4 h-4" /> キャプションをコピー</>}
                      </button>
                      <button
                        onClick={handleGenerateCaption}
                        disabled={captionGenerating}
                        className="px-4 py-2.5 rounded-lg font-bold text-sm bg-slate-700 text-white hover:bg-slate-800 transition-all flex items-center gap-2 disabled:opacity-50"
                      >
                        <RefreshCw className={`w-4 h-4 ${captionGenerating ? 'animate-spin' : ''}`} /> 再生成
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-[40vh] text-slate-300">
                    <FileText className="w-12 h-12 mb-3" />
                    <p className="text-sm font-bold">キャプションを生成してください</p>
                    <p className="text-xs mt-1">投稿内容をもとにAIが自動作成します</p>
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT: Threads投稿（ツリー） */}
            <div>
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                    <MessageCircle className="w-4 h-4" /> Threads投稿（ツリー）
                  </h2>
                  <button
                    onClick={handleGenerateThreads}
                    disabled={threadsGenerating}
                    className="px-4 py-2 bg-slate-700 text-white rounded-lg font-bold text-xs hover:bg-slate-800 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {threadsGenerating ? (
                      <><Loader2 className="w-3.5 h-3.5 animate-spin" /> 生成中...</>
                    ) : (
                      <><Wand2 className="w-3.5 h-3.5" /> ツリーを生成</>
                    )}
                  </button>
                </div>

                <p className="text-xs text-slate-400 mb-4">
                  投稿内容をもとに、4〜7投稿のThreadsツリーを自動生成します。AI初心者〜中級者向け・話し言葉スタイル。
                </p>

                {threadsPosts.length > 0 ? (
                  <div className="space-y-3">
                    {/* 投稿カードリスト */}
                    <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1">
                      {threadsPosts.map((post, index) => {
                        const charCount = post.length;
                        const isFirst = index === 0;
                        const isLast = index === threadsPosts.length - 1;
                        const maxChars = isFirst ? 160 : 500;
                        const warnChars = isFirst ? 130 : 400;
                        const isOverLimit = charCount > maxChars;
                        const isNearLimit = charCount > warnChars;

                        return (
                          <div key={index} className="bg-slate-50 rounded-lg border border-slate-200 p-3">
                            {/* カードヘッダー */}
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className="bg-slate-700 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                                  {index + 1}
                                </span>
                                <span className="text-[10px] font-bold text-slate-500">
                                  {isFirst ? 'フック投稿' : isLast ? '締め・CTA' : '解説投稿'}
                                </span>
                              </div>
                              <span className={`text-[10px] font-bold ${isOverLimit ? 'text-red-500' : isNearLimit ? 'text-amber-500' : 'text-slate-400'}`}>
                                {charCount}文字{isOverLimit ? ' ⚠ 超過' : ''}
                              </span>
                            </div>

                            {/* 編集可能テキストエリア */}
                            <textarea
                              value={post}
                              onChange={(e) => handleEditThreadsPost(index, e.target.value)}
                              className={`w-full p-2.5 border rounded-md text-xs text-slate-700 leading-relaxed resize-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none ${
                                isOverLimit ? 'border-red-300 bg-red-50/50' : 'border-slate-200 bg-white'
                              }`}
                              rows={isFirst ? 3 : 6}
                            />

                            {/* 個別アクションボタン */}
                            <div className="flex items-center gap-1.5 mt-2">
                              <button
                                onClick={() => handleCopyThreadsPost(index)}
                                className={`flex-1 py-1.5 rounded-md font-bold text-[10px] transition-all flex items-center justify-center gap-1 ${
                                  threadsCopiedIndex === index
                                    ? 'bg-blue-50 text-blue-600 border border-blue-300'
                                    : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-100'
                                }`}
                              >
                                {threadsCopiedIndex === index
                                  ? <><Check className="w-3 h-3" /> コピー済</>
                                  : <><Copy className="w-3 h-3" /> コピー</>
                                }
                              </button>
                              <button
                                onClick={() => handleRegenerateThreadsPost(index)}
                                disabled={threadsRegeneratingIndex !== null || threadsGenerating}
                                className="flex-1 py-1.5 rounded-md font-bold text-[10px] bg-white text-slate-500 border border-slate-200 hover:bg-slate-100 transition-all flex items-center justify-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <RefreshCw className={`w-3 h-3 ${threadsRegeneratingIndex === index ? 'animate-spin' : ''}`} />
                                {threadsRegeneratingIndex === index ? '再生成中...' : '再生成'}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* フッターアクションバー */}
                    <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
                      <button
                        onClick={handleCopyAllThreads}
                        className={`flex-1 py-2.5 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                          threadsCopiedIndex === -1
                            ? 'bg-blue-50 text-blue-600 border border-blue-300'
                            : 'bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200'
                        }`}
                      >
                        {threadsCopiedIndex === -1
                          ? <><Check className="w-4 h-4" /> 全てコピーしました！</>
                          : <><Copy className="w-4 h-4" /> 全投稿をコピー</>
                        }
                      </button>
                      <button
                        onClick={handleGenerateThreads}
                        disabled={threadsGenerating}
                        className="px-4 py-2.5 rounded-lg font-bold text-sm bg-slate-700 text-white hover:bg-slate-800 transition-all flex items-center gap-2 disabled:opacity-50"
                      >
                        <RefreshCw className={`w-4 h-4 ${threadsGenerating ? 'animate-spin' : ''}`} /> 全再生成
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-[40vh] text-slate-300">
                    <MessageCircle className="w-12 h-12 mb-3" />
                    <p className="text-sm font-bold">ツリー投稿を生成してください</p>
                    <p className="text-xs mt-1">投稿内容をもとにAIが自動作成します</p>
                  </div>
                )}
              </div>
            </div>

          </div>
        )}

        {activeTab === 'blog' && (
          <div className="space-y-6">

            {/* ヘッダーカード */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                  <BookOpenText className="w-4 h-4" /> ブログ記事生成
                </h2>
                <button
                  onClick={handleGenerateBlog}
                  disabled={blogGenerating || noteGenerating}
                  className="px-4 py-2 bg-slate-700 text-white rounded-lg font-bold text-xs hover:bg-slate-800 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {(blogGenerating || noteGenerating) ? (
                    <><Loader2 className="w-3.5 h-3.5 animate-spin" /> {blogGenerating ? 'X記事 生成中...' : 'note記事 生成中...'}</>
                  ) : (
                    <><Wand2 className="w-3.5 h-3.5" /> 記事を生成</>
                  )}
                </button>
              </div>
              <p className="text-xs text-slate-400">
                投稿内容をもとに、X記事（2000〜3000文字）とnote記事（3000〜4000文字）を同時に自動生成します。
              </p>
            </div>

            {/* 2カラムグリッド: 左=X記事、右=note記事 */}
            {(blogTitle || blogBody || noteTitle || noteBody) ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* === 左カラム: X記事 === */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-slate-500 flex items-center gap-1.5 px-1">
                    <BookOpenText className="w-3.5 h-3.5" /> X 記事（2000〜3000文字）
                  </h3>

                  {blogGenerating ? (
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                      <div className="flex flex-col items-center justify-center h-[30vh] text-slate-400">
                        <Loader2 className="w-8 h-8 animate-spin mb-3" />
                        <p className="text-sm font-bold">X記事を生成中...</p>
                      </div>
                    </div>
                  ) : (blogTitle || blogBody) ? (
                    <>
                      {/* タイトルカード */}
                      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                            <Type className="w-3 h-3" /> タイトル
                            <span className="ml-1 text-slate-300">{blogTitle.length}文字</span>
                          </span>
                          <button
                            onClick={handleCopyBlogTitle}
                            className={`px-2.5 py-0.5 rounded-md font-bold text-[10px] transition-all flex items-center gap-1 ${
                              blogCopiedTarget === 'title'
                                ? 'bg-blue-50 text-blue-600 border border-blue-300'
                                : 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200'
                            }`}
                          >
                            {blogCopiedTarget === 'title'
                              ? <><Check className="w-3 h-3" /> コピー済</>
                              : <><Copy className="w-3 h-3" /> コピー</>
                            }
                          </button>
                        </div>
                        <textarea
                          value={blogTitle}
                          onChange={(e) => setBlogTitle(e.target.value)}
                          className="w-full p-2.5 border border-slate-200 rounded-lg text-sm font-bold text-slate-800 leading-relaxed resize-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none"
                          rows={2}
                        />
                      </div>

                      {/* 本文カード */}
                      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                            <AlignLeft className="w-3 h-3" /> 本文
                            <span className={`ml-1 ${blogBody.length < 2000 ? 'text-amber-500' : blogBody.length > 3000 ? 'text-red-500' : 'text-slate-300'}`}>
                              {blogBody.length}文字{blogBody.length < 2000 ? ' (少)' : blogBody.length > 3000 ? ' ⚠' : ''}
                            </span>
                            <span className="ml-1 text-slate-300">h2: {(blogBody.match(/^## /gm) || []).length}</span>
                          </span>
                          <button
                            onClick={handleCopyBlogBody}
                            className={`px-2.5 py-0.5 rounded-md font-bold text-[10px] transition-all flex items-center gap-1 ${
                              blogCopiedTarget === 'body'
                                ? 'bg-blue-50 text-blue-600 border border-blue-300'
                                : 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200'
                            }`}
                          >
                            {blogCopiedTarget === 'body'
                              ? <><Check className="w-3 h-3" /> コピー済</>
                              : <><Copy className="w-3 h-3" /> コピー</>
                            }
                          </button>
                        </div>
                        <textarea
                          value={blogBody}
                          onChange={(e) => setBlogBody(e.target.value)}
                          className="w-full h-[50vh] p-3 border border-slate-200 rounded-lg text-sm text-slate-700 leading-relaxed resize-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none"
                        />
                      </div>

                      {/* フッター */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleCopyBlogAll}
                          className={`flex-1 py-2 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-1.5 ${
                            blogCopiedTarget === 'all'
                              ? 'bg-blue-50 text-blue-600 border border-blue-300'
                              : 'bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200'
                          }`}
                        >
                          {blogCopiedTarget === 'all'
                            ? <><Check className="w-3.5 h-3.5" /> コピー済！</>
                            : <><Copy className="w-3.5 h-3.5" /> 全コピー</>
                          }
                        </button>
                        <button
                          onClick={handleGenerateBlog}
                          disabled={blogGenerating || noteGenerating}
                          className="px-3 py-2 rounded-lg font-bold text-xs bg-slate-700 text-white hover:bg-slate-800 transition-all flex items-center gap-1.5 disabled:opacity-50"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${blogGenerating ? 'animate-spin' : ''}`} /> 再生成
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                      <div className="flex flex-col items-center justify-center h-[30vh] text-slate-300">
                        <BookOpenText className="w-10 h-10 mb-2" />
                        <p className="text-xs font-bold">X記事はまだ生成されていません</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* === 右カラム: note記事 === */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-slate-500 flex items-center gap-1.5 px-1">
                    <StickyNote className="w-3.5 h-3.5" /> note 記事（3000〜4000文字）
                  </h3>

                  {noteGenerating ? (
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                      <div className="flex flex-col items-center justify-center h-[30vh] text-slate-400">
                        <Loader2 className="w-8 h-8 animate-spin mb-3" />
                        <p className="text-sm font-bold">note記事を生成中...</p>
                      </div>
                    </div>
                  ) : (noteTitle || noteBody) ? (
                    <>
                      {/* タイトルカード */}
                      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                            <Type className="w-3 h-3" /> タイトル
                            <span className="ml-1 text-slate-300">{noteTitle.length}文字</span>
                          </span>
                          <button
                            onClick={handleCopyNoteTitle}
                            className={`px-2.5 py-0.5 rounded-md font-bold text-[10px] transition-all flex items-center gap-1 ${
                              noteCopiedTarget === 'title'
                                ? 'bg-blue-50 text-blue-600 border border-blue-300'
                                : 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200'
                            }`}
                          >
                            {noteCopiedTarget === 'title'
                              ? <><Check className="w-3 h-3" /> コピー済</>
                              : <><Copy className="w-3 h-3" /> コピー</>
                            }
                          </button>
                        </div>
                        <textarea
                          value={noteTitle}
                          onChange={(e) => setNoteTitle(e.target.value)}
                          className="w-full p-2.5 border border-slate-200 rounded-lg text-sm font-bold text-slate-800 leading-relaxed resize-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none"
                          rows={2}
                        />
                      </div>

                      {/* 本文カード */}
                      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                            <AlignLeft className="w-3 h-3" /> 本文
                            <span className={`ml-1 ${noteBody.length < 3000 ? 'text-amber-500' : noteBody.length > 4000 ? 'text-red-500' : 'text-slate-300'}`}>
                              {noteBody.length}文字{noteBody.length < 3000 ? ' (少)' : noteBody.length > 4000 ? ' ⚠' : ''}
                            </span>
                            <span className="ml-1 text-slate-300">h2: {(noteBody.match(/^## [^#]/gm) || []).length}</span>
                            <span className="ml-1 text-slate-300">h3: {(noteBody.match(/^### /gm) || []).length}</span>
                          </span>
                          <button
                            onClick={handleCopyNoteBody}
                            className={`px-2.5 py-0.5 rounded-md font-bold text-[10px] transition-all flex items-center gap-1 ${
                              noteCopiedTarget === 'body'
                                ? 'bg-blue-50 text-blue-600 border border-blue-300'
                                : 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200'
                            }`}
                          >
                            {noteCopiedTarget === 'body'
                              ? <><Check className="w-3 h-3" /> コピー済</>
                              : <><Copy className="w-3 h-3" /> コピー</>
                            }
                          </button>
                        </div>
                        <textarea
                          value={noteBody}
                          onChange={(e) => setNoteBody(e.target.value)}
                          className="w-full h-[50vh] p-3 border border-slate-200 rounded-lg text-sm text-slate-700 leading-relaxed resize-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none"
                        />
                      </div>

                      {/* フッター */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleCopyNoteAll}
                          className={`flex-1 py-2 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-1.5 ${
                            noteCopiedTarget === 'all'
                              ? 'bg-blue-50 text-blue-600 border border-blue-300'
                              : 'bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200'
                          }`}
                        >
                          {noteCopiedTarget === 'all'
                            ? <><Check className="w-3.5 h-3.5" /> コピー済！</>
                            : <><Copy className="w-3.5 h-3.5" /> 全コピー</>
                          }
                        </button>
                        <button
                          onClick={handleGenerateNote}
                          disabled={noteGenerating}
                          className="px-3 py-2 rounded-lg font-bold text-xs bg-slate-700 text-white hover:bg-slate-800 transition-all flex items-center gap-1.5 disabled:opacity-50"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${noteGenerating ? 'animate-spin' : ''}`} /> 再生成
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                      <div className="flex flex-col items-center justify-center h-[30vh] text-slate-300">
                        <StickyNote className="w-10 h-10 mb-2" />
                        <p className="text-xs font-bold">note記事はまだ生成されていません</p>
                      </div>
                    </div>
                  )}
                </div>

              </div>

            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="flex flex-col items-center justify-center h-[40vh] text-slate-300">
                  <BookOpenText className="w-12 h-12 mb-3" />
                  <p className="text-sm font-bold">ブログ記事を生成してください</p>
                  <p className="text-xs mt-1">「記事を生成」ボタンでX記事とnote記事を同時に自動作成します</p>
                </div>
              </div>
            )}

            {/* === ブログ画像生成セクション === */}
            {blogBody && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                    <ImageIcon className="w-4 h-4" /> アイキャッチ・図解 画像生成
                  </h3>
                  <button
                    onClick={handleGenerateBlogImages}
                    disabled={blogImagesGenerating}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold text-xs hover:bg-indigo-700 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {blogImagesGenerating ? (
                      <><Loader2 className="w-3.5 h-3.5 animate-spin" /> {blogImagesProgress || '生成中...'}</>
                    ) : (
                      <><Wand2 className="w-3.5 h-3.5" /> 画像を一括生成</>
                    )}
                  </button>
                </div>
                <p className="text-xs text-slate-400 mb-4">
                  X記事の内容をもとに、アイキャッチ画像1枚 + h2見出しごとの図解画像を自動生成します。
                </p>

                {/* 生成済み画像の表示（2列グリッド） */}
                {(blogImages.eyecatch || blogImages.h2Images.length > 0) && (
                  <div className="grid grid-cols-2 gap-3">
                    {/* アイキャッチ画像 */}
                    {blogImages.eyecatch && (
                      <div className="border border-slate-200 rounded-lg p-2">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] font-bold text-indigo-500 flex items-center gap-1">
                            <Star className="w-3 h-3" /> アイキャッチ
                          </span>
                          <div className="flex items-center gap-1">
                            <a
                              href={blogImages.eyecatch}
                              download="eyecatch.png"
                              className="px-1.5 py-0.5 rounded font-bold text-[9px] bg-slate-50 text-slate-400 border border-slate-200 hover:bg-slate-100 transition-all flex items-center gap-0.5"
                            >
                              <Download className="w-2.5 h-2.5" /> 保存
                            </a>
                            <button
                              onClick={handleRegenerateBlogEyecatch}
                              disabled={blogImagesGenerating}
                              className="px-1.5 py-0.5 rounded font-bold text-[9px] bg-slate-50 text-slate-400 border border-slate-200 hover:bg-slate-100 transition-all flex items-center gap-0.5 disabled:opacity-50"
                            >
                              <RefreshCw className={`w-2.5 h-2.5 ${blogImagesGenerating ? 'animate-spin' : ''}`} /> 再生成
                            </button>
                          </div>
                        </div>
                        <img
                          src={blogImages.eyecatch}
                          alt="アイキャッチ"
                          className="w-full rounded border border-slate-100"
                        />
                      </div>
                    )}

                    {/* h2見出し図解 */}
                    {blogImages.h2Images.map((h2, idx) => (
                      <div key={idx} className="border border-slate-200 rounded-lg p-2">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] font-bold text-slate-500 truncate flex-1">
                            {idx + 1}. {h2.heading}
                          </span>
                          <div className="flex items-center gap-1 flex-shrink-0 ml-1">
                            {h2.image && (
                              <a
                                href={h2.image}
                                download={`h2_${idx + 1}_${h2.heading.slice(0, 10)}.png`}
                                className="px-1.5 py-0.5 rounded font-bold text-[9px] bg-slate-50 text-slate-400 border border-slate-200 hover:bg-slate-100 transition-all flex items-center gap-0.5"
                              >
                                <Download className="w-2.5 h-2.5" /> 保存
                              </a>
                            )}
                            <button
                              onClick={() => handleRegenerateBlogH2Image(idx)}
                              disabled={blogImagesGenerating}
                              className="px-1.5 py-0.5 rounded font-bold text-[9px] bg-slate-50 text-slate-400 border border-slate-200 hover:bg-slate-100 transition-all flex items-center gap-0.5 disabled:opacity-50"
                            >
                              <RefreshCw className={`w-2.5 h-2.5 ${blogImagesGenerating ? 'animate-spin' : ''}`} /> 再生成
                            </button>
                          </div>
                        </div>
                        {h2.image ? (
                          <img
                            src={h2.image}
                            alt={h2.heading}
                            className="w-full rounded border border-slate-100"
                          />
                        ) : h2.error ? (
                          <div className="flex items-center gap-1.5 p-2 bg-red-50 rounded text-[10px] text-red-500">
                            <AlertCircle className="w-3 h-3 flex-shrink-0" />
                            <span>生成失敗</span>
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
}
