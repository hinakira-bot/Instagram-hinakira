import { GoogleGenAI } from "@google/genai";

// Nano Banana Pro (Gemini 3 Pro Image) - Google最高品質の画像生成モデル
// 4K対応、高精度テキストレンダリング、スタジオ品質の出力
const IMAGE_MODEL = "gemini-3-pro-image-preview";

// テキスト生成用モデル（高速）
const TEXT_MODEL = "gemini-3-flash-preview";

/**
 * テキストプロンプトのみで画像を生成
 */
export async function generateImage(apiKey, prompt, options = {}) {
  const ai = new GoogleGenAI({ apiKey });

  const response = await ai.models.generateContent({
    model: IMAGE_MODEL,
    contents: [{ parts: [{ text: prompt }] }],
    config: {
      responseModalities: ["IMAGE"],
      imageGeneration: {
        aspectRatio: "4:5",
      }
    }
  });

  const part = response.candidates?.[0]?.content?.parts?.find(
    (p) => p.inlineData
  );
  if (!part) {
    throw new Error("画像が生成されませんでした。プロンプトを調整してください。");
  }
  return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
}

/**
 * 参照画像付きで画像を生成（キャラクターアップロード時）
 */
export async function generateImageWithReference(apiKey, prompt, refImageDataUrl, options = {}) {
  const ai = new GoogleGenAI({ apiKey });

  // data:image/png;base64,XXXX → base64部分のみ抽出
  const base64Data = refImageDataUrl.split(",")[1];
  const mimeMatch = refImageDataUrl.match(/data:([^;]+);/);
  const mimeType = mimeMatch ? mimeMatch[1] : "image/png";

  const response = await ai.models.generateContent({
    model: IMAGE_MODEL,
    contents: [{
      parts: [
        { text: prompt },
        { inlineData: { mimeType, data: base64Data } }
      ]
    }],
    config: {
      responseModalities: ["IMAGE"],
      imageGeneration: {
        aspectRatio: "4:5",
      }
    }
  });

  const part = response.candidates?.[0]?.content?.parts?.find(
    (p) => p.inlineData
  );
  if (!part) {
    throw new Error("画像が生成されませんでした。プロンプトを調整してください。");
  }
  return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
}

/**
 * 複数参照画像付きで画像を生成（キャラクター画像 + 参考画像など）
 * @param {string} apiKey
 * @param {string} prompt
 * @param {string[]} imageDataUrls - data:URL形式の画像配列
 */
export async function generateImageWithMultipleReferences(apiKey, prompt, imageDataUrls, options = {}) {
  const ai = new GoogleGenAI({ apiKey });

  const imageParts = imageDataUrls.filter(Boolean).map((dataUrl) => {
    const base64Data = dataUrl.split(",")[1];
    const mimeMatch = dataUrl.match(/data:([^;]+);/);
    const mimeType = mimeMatch ? mimeMatch[1] : "image/png";
    return { inlineData: { mimeType, data: base64Data } };
  });

  const response = await ai.models.generateContent({
    model: IMAGE_MODEL,
    contents: [{
      parts: [
        { text: prompt },
        ...imageParts
      ]
    }],
    config: {
      responseModalities: ["IMAGE"],
      imageGeneration: {
        aspectRatio: "4:5",
      }
    }
  });

  const part = response.candidates?.[0]?.content?.parts?.find(
    (p) => p.inlineData
  );
  if (!part) {
    throw new Error("画像が生成されませんでした。プロンプトを調整してください。");
  }
  return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
}

/**
 * 投稿キャプション文を自動生成
 */
export async function generateCaption(apiKey, { coverTitle, coverSubtitle, introText, mainSlides, summaryItems }) {
  const ai = new GoogleGenAI({ apiKey });

  const slideSummary = (mainSlides || []).map((s, i) => `${i + 1}. ${s.title}: ${s.text}`).join('\n');
  const summaryText = (summaryItems || []).join('、');

  const systemPrompt = `あなたはInstagram投稿のキャプション文を書くプロのSNSマーケターです。
以下の投稿内容に基づいて、Instagramのキャプション文を作成してください。

【投稿内容】
タイトル: ${coverTitle}
サブタイトル: ${coverSubtitle || ''}
導入: ${introText || ''}
スライド内容:
${slideSummary}
まとめ: ${summaryText}

【キャプション構成ルール】
1. **1文目**: 結論と興味付け（読者が続きを読みたくなるフック）
2. **本文**: 投稿内容の解説・深堀り（スライドの内容をより詳しく、読み応えのある文章で展開）
3. **締め**: 今後も役立つ投稿をしていくこと + フォローのお願い（押しつけがましくなく、自然に）
4. **ハッシュタグ**: 関連するハッシュタグを5つ（投稿ボリューム1,000〜100,000程度のミドルレンジを狙う。ニッチすぎず、大きすぎないタグ）

【文体ルール】
- 全体で約1000文字前後（800〜1200文字）
- 親しみやすく、読みやすい文体
- 適度に改行・空行を入れて読みやすくする
- 絵文字は控えめに使用（1段落に1つ程度）
- ハッシュタグは最後にまとめて改行して記載

キャプション文のみを出力してください（説明や前置きは不要）。`;

  const response = await ai.models.generateContent({
    model: TEXT_MODEL,
    contents: systemPrompt,
    config: {
      thinkingConfig: {
        thinkingLevel: "low",
      },
    }
  });

  const text = response.text || response.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error("キャプションの生成に失敗しました。もう一度お試しください。");
  }
  return text.trim();
}

/**
 * 文章からインスタ投稿構成を自動生成
 */
export async function generatePostStructure(apiKey, sourceText) {
  const ai = new GoogleGenAI({ apiKey });

  const systemPrompt = `あなたはInstagramカルーセル投稿の構成を考えるプロのSNSマーケターです。
ユーザーから与えられた文章（ブログ記事、動画の文字起こし、メモなど）を分析し、
Instagram投稿用の10枚カルーセル構成を作成してください。

以下のJSON形式で**必ず**出力してください（JSONのみ、他のテキストは不要）:

{
  "coverTitle": "表紙タイトル（改行は\\nで表現。2〜3行、インパクトのある短いフレーズ）",
  "coverSubtitle": "サブタイトル（短いキャッチコピー、8文字以内）",
  "introText": "導入文（2パートで構成。前半＝悩む人がリアルに言いそうなセリフ1つだけ（「」で囲む。吹き出しに入るので1つのみ）。後半＝投稿の概要・ベネフィット・興味付け。一文ごとに必ず\\nで改行する。短い文を積み重ねる形式）",
  "mainSlides": [
    {
      "title": "ページタイトル（簡潔に）",
      "imageDesc": "このスライドにふさわしい画像の説明（英語で、AI画像生成プロンプト用）",
      "text": "説明テキスト（50〜60文字程度。フレンドリーな話し言葉で書く。～だよ、～なんよね、～かもよ、～てね、～しようね のような親しみやすい文末表現を使う。読者に優しく教えてあげるトーン）"
    }
  ],
  "summaryItems": ["まとめ項目1", "まとめ項目2", "まとめ項目3", "まとめ項目4", "まとめ項目5"]
}

ルール:
- introTextは2パート構成にする。前半は悩む人がリアルに口にしそうなセリフ1つだけ（「〜」形式。吹き出しに入るので必ず1つのみ）、後半は投稿の概要・ベネフィット・興味付け。一文ごとに必ず\\nで改行する。前半と後半は\\n\\nで区切る
- mainSlidesは3〜7個（内容量に応じて調整。合計10枚=表紙1+導入1+メイン+まとめ1になるように）
- タイトルは日本語で、短く印象的に
- imageDescは英語で、具体的なビジュアルを描写（AI画像生成で使うため）
- mainSlidesのtextは必ずフレンドリーな話し言葉で書く（～だよ、～なんよね、～かもよ、～てね、～しようね）。堅い敬語は使わない。親しい友達が教えてくれるような温かいトーン。50〜60文字程度に収める
- summaryItemsは3〜6個。端的・シンプルな名詞句スタイル（話し言葉ではない）
- 全テキストは日本語
- Instagramで保存・シェアされやすい、価値ある情報に整理する
- 元の文章の核心を捉え、読みやすく構造化する`;

  const response = await ai.models.generateContent({
    model: TEXT_MODEL,
    contents: systemPrompt + "\n\n---\n\n以下の文章を分析して、Instagram投稿構成を作成してください:\n\n" + sourceText,
    config: {
      responseMimeType: "application/json",
      thinkingConfig: {
        thinkingLevel: "low",
      },
    }
  });

  const text = response.text || response.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error("構成の生成に失敗しました。もう一度お試しください。");
  }

  try {
    const result = JSON.parse(text);
    if (!result.coverTitle || !result.mainSlides || !Array.isArray(result.mainSlides)) {
      throw new Error("不正なレスポンス形式");
    }
    return result;
  } catch (e) {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (!parsed.coverTitle || !parsed.mainSlides || !Array.isArray(parsed.mainSlides)) {
        throw new Error("不正なレスポンス形式");
      }
      return parsed;
    }
    throw new Error("AIレスポンスの解析に失敗しました。もう一度お試しください。");
  }
}
