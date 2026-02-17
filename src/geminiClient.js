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
  "introText": "導入文（読者の悩みや共感を引き出す文章。3〜4行、改行は\\nで表現）",
  "mainSlides": [
    {
      "title": "ページタイトル（簡潔に）",
      "imageDesc": "このスライドにふさわしい画像の説明（英語で、AI画像生成プロンプト用）",
      "text": "説明テキスト（3〜4行、改行は\\nで表現）"
    }
  ],
  "summaryItems": ["まとめ項目1", "まとめ項目2", "まとめ項目3", "まとめ項目4", "まとめ項目5"]
}

ルール:
- mainSlidesは3〜7個（内容量に応じて調整。合計10枚=表紙1+導入1+メイン+まとめ1になるように）
- タイトルは日本語で、短く印象的に
- imageDescは英語で、具体的なビジュアルを描写（AI画像生成で使うため）
- summaryItemsは3〜6個
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
