# Nano Banana Pro (Gemini 3 Pro Image) API連携 実装計画

## 調査結果サマリー

### Nano Banana Pro とは
- Google公式の画像生成モデル（Gemini 3 Pro Image）
- モデルID: `gemini-3-pro-image-preview`
- Google AI Studio発行のAPIキーで利用可能
- 公式SDK: `@google/genai` (npm)

### 実装可否: ✅ 実装可能

**根拠:**
1. 公式JS SDK (`@google/genai`) がブラウザ対応しておりフロントエンドから直接呼べる
2. 既存の `generatePrompt()` がそのままAPIのテキスト入力に流用できる
3. レスポンスはbase64画像で返却 → `<img src="data:image/png;base64,...">` で即表示可能
4. アップロード画像の参照送信もSDKの `inlineData` で対応可能

### 料金目安
| 解像度 | 1枚あたり |
|--------|----------|
| 1K~2K  | 約$0.134 |
| 4K     | 約$0.24  |
| 無料枠 | 1日2枚（1MP・透かし付き） |

全スライド生成（10枚）≒ 約$1.34〜$2.40

---

## アーキテクチャ設計

```
[既存] InstaFeedMaker.jsx
  ├── 編集タブ（変更なし）
  ├── 出力タブ
  │     ├── [既存] プロンプト表示・コピー
  │     ├── [新規] 🎯「この画像を生成」ボタン（1枚ずつ）
  │     ├── [新規] 🎯「全スライド一括生成」ボタン
  │     └── [新規] 🎯 生成結果の表示・ダウンロードエリア
  └── [新規] ⚙️ API設定パネル（ヘッダーにギアアイコン）

[新規] src/geminiClient.js  ← API呼び出しロジック
```

---

## 実装ステップ（全5ステップ）

### Step 1: SDK導入 & API設定UI
**作業内容:**
- `npm install @google/genai` を実行
- ヘッダーに⚙️設定ボタンを追加
- モーダルでAPIキー入力フォームを表示
- APIキーは `localStorage` に保存（フロントエンドのみのため）
- 解像度選択（1K / 2K）オプション追加

**新規State:**
```js
const [apiKey, setApiKey] = useState(localStorage.getItem('gemini_api_key') || '');
const [showSettings, setShowSettings] = useState(false);
const [imageResolution, setImageResolution] = useState('2K'); // '1K' | '2K'
```

### Step 2: Gemini APIクライアント作成
**新規ファイル: `src/geminiClient.js`**

```js
import { GoogleGenAI } from "@google/genai";

export async function generateImage(apiKey, prompt, options = {}) {
  const ai = new GoogleGenAI({ apiKey });

  const response = await ai.models.generateContent({
    model: "gemini-3-pro-image-preview",
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      responseModalities: ["IMAGE"],
      imageConfig: {
        aspectRatio: "4:5",   // Instagramフィード比率
        imageSize: options.resolution || "2K",
      }
    }
  });

  // レスポンスからbase64画像を抽出
  const part = response.candidates[0].content.parts.find(
    p => p.inlineData
  );
  if (!part) throw new Error("画像が生成されませんでした");
  return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
}

// アップロード画像付き生成
export async function generateImageWithReference(apiKey, prompt, refImageBase64, options = {}) {
  const ai = new GoogleGenAI({ apiKey });

  const response = await ai.models.generateContent({
    model: "gemini-3-pro-image-preview",
    contents: [{
      parts: [
        { text: prompt },
        { inlineData: { mimeType: "image/png", data: refImageBase64 } }
      ]
    }],
    generationConfig: {
      responseModalities: ["IMAGE"],
      imageConfig: {
        aspectRatio: "4:5",
        imageSize: options.resolution || "2K",
      }
    }
  });

  const part = response.candidates[0].content.parts.find(p => p.inlineData);
  if (!part) throw new Error("画像が生成されませんでした");
  return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
}
```

### Step 3: 出力タブに「1枚生成」ボタン追加
**変更箇所:** `InstaFeedMaker.jsx` の出力タブ（プロンプト表示の下）

**新規State:**
```js
const [generatedImages, setGeneratedImages] = useState({});  // { 0: "data:image/...", 1: "data:image/...", ... }
const [generating, setGenerating] = useState(null);  // 生成中のスライドindex or null
const [genError, setGenError] = useState(null);
```

**UI追加内容:**
- プロンプト表示エリアの下に「🎨 この画像を生成」ボタン
- 生成中はローディングスピナー + プログレスメッセージ表示
- 生成完了後、プレビュー領域にAI生成画像を表示（既存モックを置換）
- エラー時はエラーメッセージ + リトライボタン

### Step 4: 全スライド一括生成
**UI追加内容:**
- スライド一覧の上部に「🚀 全スライドを一括生成」ボタン
- 順次生成（APIレート制限対策で1枚ずつ逐次実行）
- 各スライドの生成状態を表示（⏳待機中 / 🔄生成中 / ✅完了 / ❌エラー）
- 全完了後、一括ダウンロードボタンを表示

**新規State:**
```js
const [batchGenerating, setBatchGenerating] = useState(false);
const [batchProgress, setBatchProgress] = useState({}); // { 0: 'done', 1: 'generating', 2: 'pending' }
```

### Step 5: 画像ダウンロード機能
**機能:**
- 個別ダウンロード: 各生成画像に💾ダウンロードボタン
- 一括ダウンロード: 全スライドをZIPでまとめてダウンロード（`jszip` ライブラリ使用）
- ファイル名自動命名: `slide_01_cover.png`, `slide_02_intro.png` 等

**追加パッケージ:**
- `jszip` - ZIP生成
- `file-saver` - ブラウザダウンロード補助

---

## UI変更の全体像

### ヘッダー変更
```
[Insta Feed Generator]              [編集] [出力]  ⚙️
                                               ↑ 新規追加
```

### 出力タブ変更（右パネル）
```
┌─────────────────────────────────────┐
│  🚀 全スライドを一括生成            │  ← 新規
├─────────────────────────────────────┤
│                                     │
│   [生成画像 or モックプレビュー]      │  ← 生成後は実画像表示
│          4:5 preview                │
│                  💾 ダウンロード      │  ← 新規
│                                     │
├─────────────────────────────────────┤
│ ✨ 生成プロンプト (1. 表紙)         │
│ Instagram feed post design...       │
│                                     │
│ [📋 コピー] [🎨 この画像を生成]     │  ← 生成ボタン新規追加
├─────────────────────────────────────┤
│ 💡 アップロード画像の反映について... │
└─────────────────────────────────────┘
```

### 設定モーダル
```
┌───────────── API設定 ──────────────┐
│                                     │
│ APIキー: [••••••••••••••••]  👁️     │
│ ※ Google AI Studioで取得           │
│                                     │
│ 解像度:  ○ 1K (高速)  ● 2K (推奨)  │
│                                     │
│            [保存]                    │
└─────────────────────────────────────┘
```

---

## 技術的考慮事項

### CORS対応
- `@google/genai` SDKはブラウザ対応済み → CORSの問題なし

### APIキーのセキュリティ
- フロントエンドのみ構成のため、APIキーはlocalStorageに保存
- 個人利用ツール前提。公開デプロイする場合はバックエンド経由を推奨
- 設定UIに「⚠️ APIキーはこのブラウザにのみ保存されます」注記を表示

### エラーハンドリング
- APIキー未設定 → 設定モーダルを自動表示
- レート制限 → リトライ案内
- 安全性フィルター → プロンプト修正の提案
- ネットワークエラー → 再試行ボタン

### アップロード画像連携
- `characterSource === 'upload'` かつ `uploadedImage` がある場合
- base64データを `inlineData` としてAPI送信（手動再アップ不要になる！）
- これにより既存の「手動でアップロードしてください」注意書きが不要に

---

## 追加パッケージ一覧
```bash
npm install @google/genai jszip file-saver
```
