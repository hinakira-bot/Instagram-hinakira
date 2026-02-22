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
「コイツ面白いな」「また読みたい」と思わせるキャラの立ったキャプションを書いてください。
普通の言い回し・テンプレ的な文章は禁止。読者の印象に残る、エンタメ性のある文章を最優先。

以下の投稿内容に基づいて、Instagramのキャプション文を作成してください。

【ターゲット（厳守）】
AI初心者〜中級者。コーディングは初心者レベル。発信者はエンジニアではなく「AI発信者」。
バイブコーディングやプログラミング系のネタでも、ターゲットはエンジニアではなく「AIを活用したい一般の人」。ただし生成する文章中に「非エンジニア」「非エンジニア目線」とは書かないこと（裏設定として意識するだけでOK）。
技術的な専門用語やコーディング用語は、必ずたとえ話や身近な例で噛み砕いて説明する。

【投稿内容】
タイトル: ${coverTitle}
サブタイトル: ${coverSubtitle || ''}
導入: ${introText || ''}
スライド内容:
${slideSummary}
まとめ: ${summaryText}

【キャプション構成ルール】
1. **1文目（超重要）**: 読者の手を止める強烈なフック。以下のいずれかを使う:
   - 常識破壊：「○○って思ってない？残念、逆なんよ」
   - 煽り・挑発：「まだ○○してる人、ヤバいよ？」
   - 自虐→学び：「正直、昔の自分に教えてあげたい…」
   - ぶっちゃけ系：「ぶっちゃけ、これ知らない人多すぎ」
   ※ 当たり障りのない1文目は絶対NG
2. **本文**: 投稿内容の解説・深堀り。ただし「教科書的な解説」ではなく、
   - 自分の感想・ツッコミ・驚きを混ぜる（「いや、これマジで震えたんだけど」「えぐくない？」）
   - 読者に語りかける（「ねぇ知ってた？」「これ聞いたらビビるよ」）
   - 例え話・身近な比喩を入れる（「要するに○○みたいなもん」）
   - 毒舌・本音も交えてOK（「正直、これ知らずに○○してた過去の自分、恥ずかしい」）
3. **締め**: フォロー誘導は自然に、キャラを維持して
   （例：「こういう"知ってるだけで差がつく系"の情報、これからもガンガン出してくから、フォローしといて損ないよ」）
4. **ハッシュタグ**: 関連するハッシュタグを5つ。必ず「#生成AI」「#AI活用」を含め、残り3つは投稿内容に関連するミドルレンジ（ボリューム1,000〜100,000程度）のタグを選ぶ

【文体ルール（厳守）】
- 一人称は「僕」。たまに「ワイ」も使ってOK
- ですます調は使わない。タメ口・断定調で書く（「〜だよ」「〜なんよ」「〜だわ」「〜してみ？」）
- 全体で約1000文字前後（800〜1200文字）
- 話し言葉で書く。堅い文章は絶対禁止
- 「コイツ面白いな」と思われる人格で書く。個性・キャラを出す
- 具体的な語尾例：「〜なんよ」「〜してみ？」「〜だったわ」「〜ヤバくない？」「〜なわけ」「〜でしょ」
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
// URL記事取得（Google Search Grounding経由）
export async function fetchArticleFromUrl(apiKey, url) {
  const ai = new GoogleGenAI({ apiKey });

  // Step1: CORSプロキシ経由でHTMLを取得
  let htmlText = '';
  const proxyUrls = [
    `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    `https://corsproxy.io/?${encodeURIComponent(url)}`,
  ];

  for (const proxyUrl of proxyUrls) {
    try {
      const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(15000) });
      if (res.ok) {
        htmlText = await res.text();
        break;
      }
    } catch (e) {
      console.warn("Proxy fetch failed:", proxyUrl, e.message);
    }
  }

  if (!htmlText) {
    throw new Error("URLの取得に失敗しました。URLを確認してもう一度お試しください。");
  }

  // Step2: HTMLからテキストを抽出（DOMParser使用）
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlText, 'text/html');

  // 不要な要素を削除
  const removeSelectors = ['script', 'style', 'nav', 'footer', 'header', 'aside', 'iframe', 'noscript', '.ad', '.ads', '.advertisement', '.sidebar', '.menu', '.navigation'];
  removeSelectors.forEach(sel => {
    doc.querySelectorAll(sel).forEach(el => el.remove());
  });

  // 記事本文を優先的に抽出
  const articleEl = doc.querySelector('article') || doc.querySelector('main') || doc.querySelector('.post-content') || doc.querySelector('.entry-content') || doc.querySelector('.article-body') || doc.body;
  const rawText = articleEl?.textContent || '';

  // 空白・改行を整理
  const cleanedText = rawText
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .join('\n');

  // Step3: Geminiで整形（テキスト抽出できた場合はそれを使い、できなかった場合は生HTMLを渡す）
  let geminiInput;
  if (cleanedText.length >= 50) {
    geminiInput = `以下はWebページから抽出したテキストです。このテキストから記事の本文を全文抽出してください。

【抽出したテキスト】
${cleanedText}`;
  } else {
    // DOM解析でテキストが取れなかった場合（SPA等）、生HTMLをGeminiに渡す
    geminiInput = `以下はWebページのHTMLソースコードです。このHTMLから記事の本文を全文抽出してください。

【HTML】
${htmlText.slice(0, 30000)}`;
  }

  const systemPrompt = `${geminiInput}

【ルール】
- 記事の全文をそのまま出力する（要約・省略・短縮は絶対にしない）
- 記事のタイトル、見出し（h2/h3相当）、本文の構造がわかるように整形する
- ナビゲーション、広告、関連記事リンク、著者プロフィール等は除外する
- 前置きや説明は不要。記事テキストのみを出力する`;

  try {
    const response = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents: systemPrompt,
      config: {
        thinkingConfig: {
          thinkingLevel: "low",
        },
      }
    });

    let text = response.text;

    if (!text) {
      const parts = response.candidates?.[0]?.content?.parts || [];
      for (const part of parts) {
        if (part.text && !part.thought) {
          text = part.text;
          break;
        }
      }
    }

    if (!text) {
      if (cleanedText.length >= 50) return cleanedText;
      throw new Error("記事の本文が取得できませんでした。URLを確認してください。");
    }
    return text.trim();
  } catch (e) {
    if (cleanedText.length >= 50) return cleanedText;
    console.error("fetchArticleFromUrl error:", e);
    throw new Error("URL記事取得エラー: " + (e.message || "不明なエラーが発生しました"));
  }
}

/**
 * PDF/画像ファイルから記事内容を全文抽出
 * @param {string} apiKey
 * @param {File} file - アップロードされたファイル
 * @returns {string} 抽出された記事テキスト
 */
export async function extractArticleFromFile(apiKey, file) {
  const ai = new GoogleGenAI({ apiKey });

  // ファイルをbase64に変換
  const base64Data = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const mimeType = file.type || 'application/octet-stream';
  const isPdf = mimeType === 'application/pdf';
  const isImage = mimeType.startsWith('image/');

  if (!isPdf && !isImage) {
    throw new Error("対応ファイル形式: PDF、画像（PNG/JPG/WEBP）");
  }

  const prompt = `以下の${isPdf ? 'PDFドキュメント' : '画像'}から、記事の内容を全文抽出してください。

【ルール】
- 記事の全文をそのまま出力する（要約・省略・短縮は絶対にしない）
- 記事のタイトル、見出し（h2/h3相当）、本文の構造がわかるように整形する
- 画像内のテキスト、図表の内容もテキストとして抽出する
- 画像や図表がある場合は、その内容を【画像: ○○の図解】のように説明を入れる
- ナビゲーション、広告、サイドバー等は除外する
- 前置きや説明は不要。記事テキストのみを出力する`;

  const response = await ai.models.generateContent({
    model: TEXT_MODEL,
    contents: [{
      parts: [
        { text: prompt },
        { inlineData: { mimeType, data: base64Data } }
      ]
    }],
    config: {
      thinkingConfig: {
        thinkingLevel: "low",
      },
    }
  });

  let text = response.text;

  if (!text) {
    const parts = response.candidates?.[0]?.content?.parts || [];
    for (const part of parts) {
      if (part.text && !part.thought) {
        text = part.text;
        break;
      }
    }
  }

  if (!text) {
    throw new Error("ファイルから記事を抽出できませんでした。別のファイルをお試しください。");
  }
  return text.trim();
}

export async function generatePostStructure(apiKey, sourceText) {
  const ai = new GoogleGenAI({ apiKey });

  const systemPrompt = `あなたはInstagramカルーセル投稿の構成を考えるプロのSNSマーケターです。
ユーザーから与えられた文章（ブログ記事、動画の文字起こし、メモなど）を分析し、
Instagram投稿用の10枚カルーセル構成を作成してください。

【最重要方針】SNSはエンタメ。「コイツ面白いな」「また見たい」と思わせることが最優先。
普通の言い回し・テンプレ的な表現は禁止。読者の印象に残る、個性的でキャラの立った文章を書くこと。

【ターゲット（厳守）】
AI初心者〜中級者。コーディングは初心者レベル。発信者はエンジニアではなく「AI発信者」。
バイブコーディングやプログラミング系のネタでも、ターゲットはエンジニアではなく「AIを活用したい一般の人」。ただし生成する文章中に「非エンジニア」「非エンジニア目線」とは書かないこと（裏設定として意識するだけでOK）。
技術的な専門用語やコーディング用語は、必ずたとえ話や身近な例で噛み砕いて説明する。

以下のJSON形式で**必ず**出力してください（JSONのみ、他のテキストは不要）:

{
  "coverTitle": "表紙タイトル（改行は\\nで表現。必ず2行以内・合計20文字以内に収める。短くパンチのある言葉で核心だけを凝縮する。補足情報はcoverSubtitleに逃がす。型: ①常識破壊型「○○はもう古い」 ②煽り型「まだ○○してるの？」 ③ギャップ型「○○で△△が変わる」 ④問いかけ型「○○って知ってた？」。長い説明的タイトルは絶対NG。ツール紹介系の場合はツール名をタイトルかサブタイトルのどちらかに必ず含める）",
  "coverSubtitle": "サブタイトル（短いキャッチコピー、8文字以内。ツール紹介系でcoverTitleにツール名がない場合はここにツール名を入れる）",
  "introText": "導入文（2パートで構成。前半＝悩む人がリアルに言いそうな生々しいセリフ1つだけ（「」で囲む。吹き出しに入るので1つのみ。「あー、もう無理…」「なんで自分だけ…」レベルのリアルな痛み）。後半＝読者の心をグッと掴む興味付け。「え、マジで？」と思わせるベネフィットや意外性を短文で畳みかける。一文ごとに必ず\\nで改行する。短い文を積み重ねる形式）",
  "mainSlides": [
    {
      "title": "ページタイトル（簡潔に）",
      "imageDesc": "このスライドにふさわしい画像の説明（英語で、AI画像生成プロンプト用。手順・ハウツー系ならスクショ風UI画像を指定、それ以外はイメージ画像）",
      "text": "説明テキスト（50〜60文字程度。一人称は「僕」たまに「ワイ」。ですます調禁止、タメ口で書く。「コイツ面白いな」と思わせるエンタメ感のある話し言葉で書く。ただの解説は禁止。自分のリアクション・ツッコミ・驚きを混ぜる。例: 「いやコレ、ガチでヤバい…」「え、待って。マジで？」「知らなかった自分殴りたいわ」「これ使わん人おる？？」。語尾例: ～ヤバくない？、～なんよマジで、～すぎて震える、～してみ？世界変わるから、～だったわ…。一文ごとに必ず\\nで改行する）"
    }
  ],
  "summaryItems": ["まとめ項目1（10文字以内）", "まとめ項目2（10文字以内）", "まとめ項目3（10文字以内）", "まとめ項目4（10文字以内）", "まとめ項目5（10文字以内）", "まとめ項目6（10文字以内）", "まとめ項目7（10文字以内）"]
}

ルール:
- introTextは2パート構成にする。前半は悩む人がリアルに口にしそうな生々しいセリフ1つだけ（「〜」形式。吹き出しに入るので必ず1つのみ。テンプレ的な悩みではなく、本当に口に出しそうなリアルな言葉）、後半は読者の心を掴む興味付け（意外性・ベネフィット・煽りを短文で畳みかける）。一文ごとに必ず\\nで改行する。前半と後半は\\n\\nで区切る
- mainSlidesは必ず7個（固定）。合計10枚構成=表紙1+導入1+メイン7+まとめ1
- coverTitleは日本語で、必ず2行以内・合計20文字以内（厳守）。短くパンチのある言葉だけで構成する。長い・説明的・文字数オーバーは絶対禁止。補足はcoverSubtitleに逃がす。常識破壊・煽り・ギャップ・問いかけで「スクロールを止める」パワーを出す
- ツール紹介・サービス紹介系の投稿では、ツール名・サービス名をcoverTitleかcoverSubtitleのどちらかに必ず含める（「何についての投稿か」が表紙で伝わるように）
- imageDescは英語で、具体的なビジュアルを描写（AI画像生成で使うため）。以下のルールで画像タイプを判断すること:
  【手順・ハウツー・操作方法・設定方法・使い方のスライドの場合】実際のアプリ/ツール/Webサイトの画面に限りなく近いリアルなスクリーンショット画像を指定する。imageDescは必ず "Screenshot-style UI image of ..." で始めること。例: "Screenshot-style UI image of ChatGPT interface showing the prompt input area and model selector dropdown, realistic dark sidebar with conversation list, main chat area with white background, red arrow annotations pointing to the settings gear icon" のように、実際の画面レイアウト・ボタン配置・色合いを具体的に記述する。ツール名・画面名・操作対象を明記すること。
  【手順・ハウツーでないスライドの場合】通常のイメージ画像（コンセプトイラスト、アイコン的表現など）を指定する。"Screenshot-style"は使わない。
- mainSlidesのtextは一人称「僕」（たまに「ワイ」）。ですます調は使わない、タメ口・断定調で書く。「コイツ面白い」と思わせるエンタメ性のある話し言葉で書く。ただの情報解説は禁止。自分のリアクション・ツッコミ・驚き・本音を必ず混ぜる（「いやこれマジで…」「ヤバすぎて震えた」「知らんかったわ…」）。語尾は感情が伝わるもの（～ヤバくない？、～なんよマジで、～すぎて震える、～してみ？世界変わるから）。堅い敬語・ですます調は絶対禁止。50〜60文字程度に収める。一文ごとに必ず\\nで改行する
- summaryItemsは必ず7個（mainSlidesと同数）。各項目は10文字以内（厳守）。画像に表示するため長いと見切れるので必ず短くする。ただし堅い・無個性な名詞句は禁止。「〜がヤバい」「〜は神」「〜で激変」「〜が最強」のように、短くてもエンタメ感・感情が伝わるキャッチーな表現にする
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

/**
 * Threads投稿（ツリー投稿）を自動生成
 * @returns {string[]} 投稿テキストの配列（4〜5投稿）
 */
export async function generateThreadsPosts(apiKey, { coverTitle, coverSubtitle, introText, mainSlides, summaryItems }) {
  const ai = new GoogleGenAI({ apiKey });

  const slideSummary = (mainSlides || []).map((s, i) => `${i + 1}. ${s.title}: ${s.text}`).join('\n');
  const summaryText = (summaryItems || []).join('、');

  const systemPrompt = `あなたは、Threadsで「続きを読まずにいられないツリー投稿」を作るプロです。
「1投稿目で強く惹きつけ、自然に2投稿目へ読み進めさせる構造」を最優先してください。

【重要・事前リサーチ】まず、投稿内容のテーマに関連する最新情報をGoogle検索でリサーチしてください（直近の情報を優先）。
特にツール紹介・サービス紹介系の場合は、以下を必ず調査すること:
- そのツールの最新機能・アップデート情報
- 競合ツールとの比較（何が優れているか、どこが違うか）
- なぜそのツールを使うべきかの具体的な理由
例: AntiGravityの紹介なら、Cursor・VS Codeと比べて何が良いかを調べて言及する。
読者が「このツールを使うべき理由」を理解できるよう、比較情報を自然に織り交ぜること。

以下の投稿内容に基づいて、Threadsのツリー投稿を作成してください。

【投稿内容】
タイトル: ${coverTitle}
サブタイトル: ${coverSubtitle || ''}
導入: ${introText || ''}
スライド内容:
${slideSummary}
まとめ: ${summaryText}

【ターゲット（厳守）】
AI初心者〜中級者。コーディングは初心者レベル。発信者の立ち位置は「AI発信者」であり、エンジニアではない。
バイブコーディングやプログラミング系のネタでも、ターゲットはエンジニアではなく「AIを活用したい一般の人」。ただし生成する文章中に「非エンジニア」「非エンジニア目線」とは書かないこと（裏設定として意識するだけでOK）。
技術的な専門用語やコーディング用語が出てきたら、必ずたとえ話や身近な例で噛み砕いて説明する。
「知らないと損」「これ知ってるだけで差がつく」という空気感を全体に漂わせる。

【文体ルール】
- 一人称は「僕」。たまに「ワイ」も使ってOK
- ですます調は使わない。タメ口・断定調で書く
- 話し言葉で書く。堅い文章は禁止。友達に教えるようなテンション
- イメージしやすく再現性のある表現を使う（「例えば〜」「要するに〜」「ざっくり言うと〜」）
- 「〜なんだよね」「〜なわけ」「〜してみて」「〜だったわ」のようなカジュアルな語尾
- 絵文字は控えめ（1投稿に1〜2個程度）

【出力形式（厳守）】
- 必ず ---POST--- 区切りで分割して出力する
- 前置き/注釈/ラベル/番号は禁止（本文のみ）
- 一行ずつ改行して、書出し＋一文→空白行→一文→空白行→一文という形に
（書出しは、そのあとの一文と結合させて書出しだけで改行しない）

【POST1（最重要・80〜160文字）】
- 1文目は最重要。反感を買うくらいの強い言葉で読者の手を止める。炎上スレスレの強い断言、挑発的な物言いでOK。とにかくスクロールを止めさせることが最優先。
- 以下5つの要素のうち、必ず3つ以上をPOST1に含めること:
  ①常識破壊（「それ間違いです」「逆です」など、読者の思い込みをぶち壊す）
  ②損失回避（「知らないと損」「やらないとヤバい」など、恐怖・焦りを煽る）
  ③ベネフィット（「これだけで変わる」「知るだけで差がつく」など、得られる未来を見せる）
  ④悩みの言語化（「〜で困ってない？」「〜がうまくいかない人」など、読者の痛みを代弁する）
  ⑤ターゲット指定（「AI初心者の人」「副業したい人」「時短したい人」など、誰に向けた投稿か明確にする）
- 投稿の具体的な対象（ツール名・サービス名・手法名・テーマなど）はPOST1内に必ず含めること。「何についての投稿か」が読者に伝わらないと興味を持てない。例：×「これ知らない人損してる」→○「○○（ツール名）知らない人マジで損してる」
- 構成：①強烈な一文（上記要素を組み合わせて最大インパクト） ②強い言葉で興味付け ③次へのつなぎ（タップ誘導の締め）
  以下の書出しリストから、投稿内容に最もマッチし反応が取れそうなものを選んで使うこと:
  【断言・主張系】「断言します」「ハッキリ言います」「これはガチです」「これだけは言わせてほしい」「何度でも言います」「あえて言います」「本音を言います」「先に言っておきます」「最初に結論を言います」「1つだけ言わせて」
  【常識破壊・逆張り系】「9割の人が知らないけど」「みんな気づいてないけど」「常識が変わりました」「それ、間違ってます」「逆です」「信じられないかもだけど」「嘘みたいな本当の話」「冗談抜きで」「笑えない話なんだけど」「これ聞いたら驚くと思う」
  【緊急・限定系】「今すぐ確認して」「これはマジな話」「ちょっと焦ってる」「悪いことは言わない」「知らないと損する話」「やばいこと知った」「これ知らない人多すぎ」「今さら聞けない話」「もっと早く知りたかった」「これ見逃さないで」
  【共感・寄り添い系】「正直に言うと」「同じ悩みの人いる？」「自分だけじゃないはず」「わかる人にはわかる」「これ見て安心した」「やっと言語化できた」「ずっと思ってたこと」「これが正解だった」「たどり着いた結論」「答え出ました」
  【ストーリー・体験系】「失敗から学んだ」「後悔してること」「あの時の自分に言いたい」「1年前は知らなかった」「最近気づいたこと」「きっかけは些細なことだった」「やってみたら変わった」「ターニングポイントだった」「まさか自分が」「あの一言で変わった」
  【数字・具体性系】「たった1つの違い」「3つだけ覚えて」「これだけで変わる」「5分で人生変わった」「1日10分だけ」「まだ間に合う」「週1でOK」「コスパ最強」「無料でできる」「今日からできる」
  【挑発・好奇心系】「知りたくない人はスルーして」「閲覧注意」「最後まで読める人だけ」「覚悟がある人だけ読んで」「この事実、受け止められる？」「信じるか信じないかはあなた次第」「まだそれやってるの？」「その常識、もう古いかも」「やめた方がいい」「こっちが正解」
  【問いかけ・対話系】「〜って知ってた？」「〜の違い、説明できる？」「なんで誰も教えてくれないの？」「気づいてた？」「ねぇ聞いて」「ちょっといい？」「これ見てどう思う？」「あなたはどっち派？」「本当にそれでいいの？」「考えたことある？」
  【実績・権威系】「プロが本気で選んだ」「100人に聞いた結果」「徹底的に調べた」「検証してわかった」「データが証明してる」「専門家も言ってる」「最新の研究によると」「AI時代の新常識」「トップ層はみんなやってる」「成功者の共通点」
- 最後は必ず次のいずれかで終える（内容に合うものを選ぶ）：
  1) 「〜があって、それが…」
  2) 「〜が、実は…」
  3) 「〜が、これです👇」
  4) 「〜詳しく解説します👇」
※「〜」には、その投稿の核となるキーワードを入れて具体化する

【POST2（解説の導入）】
- POST2の最初には、解説全体の結論や大枠をまず示す
  - 手順系の内容なら：箇条書きで全体のステップをザッと見せてから「詳しく解説していくね」と繋ぐ
  - ノウハウ系の内容なら：「ざっくり言うとこういうこと」と大枠を示してから詳細解説に移る
  - 比較・選択系なら：「結論から言うと〜」で先に答えを見せてから理由を解説
- その後、記事の内容をしっかり噛み砕いて解説する。まとめ・要約ではなく「読んで理解が深まる」内容
- 難しい概念は「ざっくり言うと〜」「たとえるなら〜」で平易に説明
- 1投稿あたり全角300〜450文字（絶対に300文字以上。500文字以内）

【POST3〜最後から2番目（詳細解説パート）】
- POST2で示した大枠・結論に対して、具体的に深掘りしていく
- 難しい概念は「ざっくり言うと〜」「たとえるなら〜」で平易に説明
- 具体例・数字・ビフォーアフターなど、イメージしやすい情報を入れる
- 1投稿あたり全角300〜450文字（絶対に300文字以上。500文字以内）

【最終POST（締め）】
- 最後の解説の流れを受けて自然に締める（箇条書きまとめは不要）
- フォロー誘導：「これからも最新情報や役立つ情報を分かりやすく解説していくので、AIを学びたい方はフォローしといてくださいね」という趣旨を自然な話し言葉で入れる
- 本文の最後（投稿の下にぶら下げる形）に以下のインスタ誘導をそのまま入れる:
  「インスタでもわかりやすく解説してるので見てね👇」
- 1投稿あたり全角300〜450文字（絶対に300文字以上。500文字以内）

【投稿数】
- 合計4〜9投稿。基本は7〜9投稿でしっかり解説する
- 内容的にそこまで深掘りが難しい場合のみ4〜6投稿に減らしてOK

ツリー投稿のみを出力してください（説明や前置きは不要）。`;

  let response;
  try {
    // まずGoogle検索付きで試行
    response = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents: systemPrompt,
      config: {
        tools: [{ googleSearch: {} }],
        thinkingConfig: {
          thinkingLevel: "low",
        },
      }
    });
  } catch (e) {
    // Google検索でエラーの場合、検索なしでフォールバック
    console.warn("Google Search付きThreads生成でエラー。検索なしで再試行します:", e.message || e);
    response = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents: systemPrompt,
      config: {
        thinkingConfig: {
          thinkingLevel: "low",
        },
      }
    });
  }

  const text = response.text || response.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error("Threads投稿の生成に失敗しました。もう一度お試しください。");
  }

  // ---POST--- 区切りで分割（表記揺れに対応）
  const posts = text.trim().split(/\s*---\s*POST\s*---\s*/).map(p => p.trim()).filter(Boolean);
  if (posts.length < 2) {
    throw new Error("投稿の分割に失敗しました。もう一度お試しください。");
  }
  return posts;
}

/**
 * Threads投稿の特定の1投稿のみを再生成
 * @returns {string} 再生成された投稿テキスト
 */
export async function regenerateThreadsPost(apiKey, { allPosts, postIndex, coverTitle }) {
  const ai = new GoogleGenAI({ apiKey });

  const isFirst = postIndex === 0;
  const isLast = postIndex === allPosts.length - 1;
  const totalPosts = allPosts.length;

  let roleDescription = '';
  if (isFirst) {
    roleDescription = `これはツリーの最初の投稿（POST1）です。
1文目は最重要。反感を買うくらいの強い言葉で読者の手を止める。炎上スレスレの強い断言・挑発的な物言いでOK。
以下5要素のうち必ず3つ以上をPOST1に含めること:
①常識破壊（思い込みをぶち壊す） ②損失回避（知らないと損・焦り） ③ベネフィット（得られる未来） ④悩みの言語化（読者の痛みを代弁） ⑤ターゲット指定（誰向けか明確に）
投稿の具体的な対象（ツール名・サービス名・手法名・テーマなど）はPOST1内に必ず含める。「何についての投稿か」が読者に伝わるように。
構成: ①強烈な一文（上記要素を組み合わせて最大インパクト） ②強い言葉での興味付け ③次の投稿への遷移（タップ誘導）
冒頭文は以下から投稿内容に最もマッチし反応が取れそうなものを選ぶ:
【断言系】「断言します」「ハッキリ言います」「これはガチです」「何度でも言います」「あえて言います」
【常識破壊系】「9割の人が知らないけど」「それ、間違ってます」「逆です」「信じられないかもだけど」「嘘みたいな本当の話」
【緊急系】「これはマジな話」「知らないと損する話」「やばいこと知った」「もっと早く知りたかった」「これ見逃さないで」
【挑発系】「まだそれやってるの？」「その常識、もう古いかも」「こっちが正解」
【問いかけ系】「〜って知ってた？」「なんで誰も教えてくれないの？」「ねぇ聞いて」
必ず以下のいずれかで終わること:
・「〜があって、それが…」
・「〜が、実は…」
・「〜が、これです👇」
・「〜詳しく解説します👇」
文字数: 80〜160文字
話し言葉で書く。`;
  } else if (isLast) {
    roleDescription = `これはツリーの最後の投稿です。
解説の流れを自然に締める（箇条書きまとめは不要）。
フォロー誘導：「これからも最新情報や役立つ情報を分かりやすく解説していくので、AIを学びたい方はフォローしといてくださいね」という趣旨を自然な話し言葉で入れる。
本文の最後（投稿の下にぶら下げる形）に以下のインスタ誘導をそのまま入れる: 「インスタでもわかりやすく解説してるので見てね👇」
話し言葉で書く。文字数: 全角300〜450文字（絶対300文字以上、500文字以内）`;
  } else {
    if (postIndex === 1) {
      roleDescription = `これはツリーのPOST2（解説の導入）です。
まず解説全体の結論や大枠を示す。
- 手順系なら：箇条書きで全体のステップをザッと見せて「詳しく解説していくね」と繋ぐ
- ノウハウ系なら：「ざっくり言うとこういうこと」と大枠を示してから詳細解説に移る
- 比較・選択系なら：「結論から言うと〜」で先に答えを見せてから理由を解説
その後、記事内容を噛み砕いて解説（まとめ・要約ではなく理解が深まる内容）。
難しい概念は「ざっくり言うと〜」「たとえるなら〜」で平易に説明。
話し言葉で書く。文字数: 全角300〜450文字（絶対300文字以上、500文字以内）`;
    } else {
      roleDescription = `これはツリーの中間投稿（POST${postIndex + 1}/${totalPosts}）です。
POST2で示した大枠・結論に対して、具体的に深掘りしていく。
難しい概念は「ざっくり言うと〜」「たとえるなら〜」で平易に説明。
具体例・数字・ビフォーアフターでイメージしやすく。
話し言葉で書く。文字数: 全角300〜450文字（絶対300文字以上、500文字以内）`;
    }
  }

  const contextPosts = allPosts.map((p, i) => `--- POST${i + 1} ${i === postIndex ? '(★これを再生成)' : ''} ---\n${p}`).join('\n\n');

  const systemPrompt = `あなたはThreadsのツリー投稿を書くプロのSNSマーケターです。
以下のツリー投稿の中で、POST${postIndex + 1}のみを書き直してください。

【元のツリー全体】
${contextPosts}

【元の投稿テーマ】
タイトル: ${coverTitle}

【再生成するPOST${postIndex + 1}のルール】
${roleDescription}

【出力ルール】
- 再生成するPOST${postIndex + 1}の本文のみを出力（ラベル・番号・区切り線は不要）
- 前後の投稿との自然なつながりを保つ
- 一行ずつ改行して、書出し＋一文→空白行→一文→空白行→一文という形に
- 絵文字は控えめ（1〜2個程度）`;

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
    throw new Error("投稿の再生成に失敗しました。もう一度お試しください。");
  }
  return text.trim();
}

// ブログ記事生成
export async function generateBlogArticle(apiKey, { coverTitle, coverSubtitle, introText, mainSlides, summaryItems }) {
  const ai = new GoogleGenAI({ apiKey });
  const slideSummary = (mainSlides || []).map((s, i) => `${i + 1}. ${s.title}: ${s.text}`).join('\n');
  const summaryText = (summaryItems || []).join('、');

  const systemPrompt = `あなたはSEOに強いブログ記事を書くプロのWebライターです。
以下のInstagram投稿内容に基づいて、X（旧Twitter）向けのブログ記事を作成してください。

【重要】まず、投稿内容のテーマに関連する最新情報や詳細情報をGoogle検索でリサーチしてください。
複数の記事・情報源を調べて、元の投稿内容以上の有益な情報を盛り込んだ記事にしてください。
検索で得た情報を自然に織り交ぜて、読者にとってより価値の高い記事にすること。

【ターゲット（厳守）】
AI初心者〜中級者。コーディングは初心者レベル。発信者はエンジニアではなく「AI発信者」。
バイブコーディングやプログラミング系のネタでも、読者はエンジニアではなく「AIを活用したい一般の人」。ただし記事中に「非エンジニア」「非エンジニア目線」とは書かないこと（裏設定として意識するだけでOK）。
技術的な専門用語やコーディング用語は、必ずわかりやすく言い換えるか、たとえ話で噛み砕いて説明する。

【投稿内容】
タイトル: ${coverTitle}
サブタイトル: ${coverSubtitle || ''}
導入: ${introText || ''}
スライド内容:
${slideSummary}
まとめ: ${summaryText}

【記事構成ルール】
1. タイトル: 投稿内容の核心を捉えた、SEOを意識した魅力的なタイトル（32〜40文字の全角文字数で厳守）
2. リード文: 読者の悩みや興味に寄り添う導入（2〜3文）
3. h2見出し + 本文: 3〜6個のh2見出しで構成。各見出しの下に本文を書く
4. まとめ段落: 記事全体を自然に締める段落

【h2見出しのルール（厳守）】
- 検索されそうなキーワードでのSEOに配慮した日本語の見出しを作成する
- 「メリット」と「デメリット」がある場合はそれぞれ個別のh2見出しにする
- h2見出しは見たい！と思われるような魅力的で自然、かつ簡潔にする
- 15〜25文字で簡潔に
- 3〜6個になるように構成する
- まず検索意図を満たすh2見出しを作成する
- 「はじめに」「〜とは？」のような見出しは作成しない
- 見出しにコロン（：）を使わない
- キーワードを使用して自然な文章にする

【文体ルール（厳守）】
- 一人称は「僕」。たまに「ワイ」も使ってOK
- ですます調は基本使わない。タメ口・断定調で書く
- 自然な話し言葉で、感情を乗せて、口語調で書く
- 自然に検索されそうなキーワードを使いつつ書く
- 読みやすいように、1文ごとに改段落する
- 指示語（これ、あれ、それ）は使わない。具体的な名詞で書く
- 親しみやすくフレンドリーな印象を出す
- 文末は以下のような表現を使う:
  「〜してね。」「〜なんだよね。」「〜だよね。」「〜だよ〜！」「〜してみて。」「〜なんよ。」
- 記事を話し言葉で書く。読者に親しみやすく、カジュアルな会話のように感じさせる文体を心がける
- 難しい専門用語は避けるか、わかりやすく言い換える

【文字数】
- 全体で2000〜3000文字（タイトル除く）
- 記事全体で2000文字以上になるような記事構成にする

【出力形式（厳守）】
以下の形式で出力してください:
---TITLE---
記事タイトル
---BODY---
リード文

## 見出し1
本文

## 見出し2
本文

## 見出し3
本文

まとめの段落

※前置き・説明・注釈は不要。記事のみを出力してください。`;

  const response = await ai.models.generateContent({
    model: TEXT_MODEL,
    contents: systemPrompt,
    config: {
      tools: [{ googleSearch: {} }],
      thinkingConfig: {
        thinkingLevel: "low",
      },
    }
  });

  const text = response.text || response.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error("ブログ記事の生成に失敗しました。もう一度お試しください。");
  }

  const titleMatch = text.match(/---TITLE---\s*([\s\S]*?)\s*---BODY---/);
  const bodyMatch = text.match(/---BODY---\s*([\s\S]*)/);

  return {
    title: titleMatch ? titleMatch[1].trim() : '',
    body: bodyMatch ? bodyMatch[1].trim() : text.trim()
  };
}

// note記事生成（h3見出し付き詳細版）
export async function generateNoteArticle(apiKey, { coverTitle, coverSubtitle, introText, mainSlides, summaryItems, xArticleBody }) {
  const ai = new GoogleGenAI({ apiKey });
  const slideSummary = (mainSlides || []).map((s, i) => `${i + 1}. ${s.title}: ${s.text}`).join('\n');
  const summaryText = (summaryItems || []).join('、');

  // X記事のh2見出しを抽出
  const h2Headings = (xArticleBody || '').match(/^## .+$/gm) || [];
  const h2List = h2Headings.map(h => h.replace(/^## /, '')).join('\n');

  const systemPrompt = `あなたはSEOに強いブログ記事を書くプロのWebライターです。
以下のInstagram投稿内容に基づいて、note向けの詳細なブログ記事を作成してください。

【重要】まず、投稿内容のテーマに関連する最新情報や詳細情報をGoogle検索でリサーチしてください。
複数の記事・情報源を調べて、元の投稿内容以上の有益な情報を盛り込んだ記事にしてください。

【ターゲット（厳守）】
AI初心者〜中級者。コーディングは初心者レベル。発信者はエンジニアではなく「AI発信者」。
バイブコーディングやプログラミング系のネタでも、読者はエンジニアではなく「AIを活用したい一般の人」。ただし記事中に「非エンジニア」「非エンジニア目線」とは書かないこと（裏設定として意識するだけでOK）。
技術的な専門用語やコーディング用語は、必ずわかりやすく言い換えるか、たとえ話で噛み砕いて説明する。

【投稿内容】
タイトル: ${coverTitle}
サブタイトル: ${coverSubtitle || ''}
導入: ${introText || ''}
スライド内容:
${slideSummary}
まとめ: ${summaryText}

${h2List ? `【X記事のh2見出し（これを必ずそのまま使用すること）】\n${h2List}` : ''}

【記事構成ルール】
1. タイトル: 投稿内容の核心を捉えた、SEOを意識した魅力的なタイトル（32〜40文字の全角文字数で厳守）
2. リード文: 読者の悩みや興味に寄り添う導入（3〜4文）
3. h2見出し + h3見出し + 本文: ${h2List ? '上記のX記事と同じh2見出しを使い' : '3〜6個のh2見出しで構成し'}、各h2の下にh3見出しを2〜5個作成して詳細に解説する
4. まとめ段落: 記事全体を自然に締める
5. 最後に以下のメルマガ誘導を必ず入れる:
---
AIについてもっと詳しく学びたい方は、メルマガに登録してみてくださいね。

登録特典として、GPTsの作成方法やプロンプト作成方法など、すぐに使える実践ガイドをプレゼントしています。

▶ メルマガ登録はこちら
https://hinakira.net/p/r/RwKLzKtX
---

【h2見出しのルール】
${h2List ? '- X記事で使ったh2見出しをそのまま使用すること（変更しない）' : '- 15〜25文字で簡潔に\n- 3〜6個になるように構成する'}
- 検索されそうなキーワードでのSEOに配慮する
- 「はじめに」「〜とは？」のような見出しは作成しない
- 見出しにコロン（：）を使わない

【h3見出しのルール】
- 各h2の下に2〜5個（内容によっては多くてもOK）
- h2の内容をさらに具体的に細分化する
- 読者が知りたいポイントを個別に深掘りする
- 15〜30文字で具体的に

【文体ルール（厳守）】
- 一人称は「僕」。たまに「ワイ」も使ってOK
- ですます調は基本使わない。タメ口・断定調で書く
- 自然な話し言葉で、感情を乗せて、口語調で書く
- 自然に検索されそうなキーワードを使いつつ書く
- 読みやすいように、1文ごとに改段落する
- 指示語（これ、あれ、それ）は使わない。具体的な名詞で書く
- 親しみやすくフレンドリーな印象を出す
- 文末は以下のような表現を使う:
  「〜してね。」「〜なんだよね。」「〜だよね。」「〜だよ〜！」「〜してみて。」「〜なんよ。」
- 難しい専門用語は避けるか、わかりやすく言い換える

【文字数】
- 全体で3000〜4000文字（タイトル除く）

【出力形式（厳守）】
以下の形式で出力してください:
---TITLE---
記事タイトル
---BODY---
リード文

## 見出し1

### 小見出し1-1
本文

### 小見出し1-2
本文

## 見出し2

### 小見出し2-1
本文

### 小見出し2-2
本文

まとめの段落

メルマガ誘導テキスト

※前置き・説明・注釈は不要。記事のみを出力してください。`;

  const response = await ai.models.generateContent({
    model: TEXT_MODEL,
    contents: systemPrompt,
    config: {
      tools: [{ googleSearch: {} }],
      thinkingConfig: {
        thinkingLevel: "low",
      },
    }
  });

  const text = response.text || response.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error("note記事の生成に失敗しました。もう一度お試しください。");
  }

  const titleMatch = text.match(/---TITLE---\s*([\s\S]*?)\s*---BODY---/);
  const bodyMatch = text.match(/---BODY---\s*([\s\S]*)/);

  return {
    title: titleMatch ? titleMatch[1].trim() : '',
    body: bodyMatch ? bodyMatch[1].trim() : text.trim()
  };
}

/**
 * ブログ記事のアイキャッチ＋h2見出し図解の画像プロンプトを設計
 * @returns {{ eyecatch: string, h2Images: { heading: string, prompt: string }[] }}
 */
export async function generateBlogImagePrompts(apiKey, { title, body }) {
  const ai = new GoogleGenAI({ apiKey });

  // 本文からh2見出しとその直下の内容を抽出
  const h2Sections = [];
  const h2Regex = /^## (.+)$/gm;
  let match;
  const matches = [];
  while ((match = h2Regex.exec(body)) !== null) {
    matches.push({ heading: match[1], index: match.index });
  }
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index;
    const end = i + 1 < matches.length ? matches[i + 1].index : body.length;
    const sectionContent = body.slice(start, end).trim();
    h2Sections.push({ heading: matches[i].heading, content: sectionContent.slice(0, 500) });
  }

  const h2List = h2Sections.map((s, i) => `h2_${i + 1}: 「${s.heading}」\n内容抜粋: ${s.content.slice(0, 300)}`).join('\n\n');

  const systemPrompt = `あなたはブログ記事用の画像プロンプトを設計するプロのデザイナーです。
以下のブログ記事のタイトルとh2見出し情報をもとに、画像生成AIに渡すプロンプトを設計してください。

【記事タイトル】
${title}

【h2見出し一覧と内容】
${h2List}

【アイキャッチ画像のルール】
- おしゃれなイラスト調の横長画像
- タイトルを短縮した端的なテキストを画像内に含める（日本語テキスト）
- タイトルや記事の内容を視覚的に表現する
- タイトル以外のテキストは表示しない（ごちゃごちゃ防止）
- テキストは読みやすく大きめに配置

【h2図解画像のルール】
- 各h2見出しの内容を簡潔に理解できる図解画像
- 横長サイズ
- 背景色は白か薄く淡いカラー
- テキストは少なめで簡潔に。日本語ベース
- 内容が手順やハウツーであればスクリーンショット風画像にする
- 見出しタイトルは表示しなくてOK
- 情報の関係性がわかるような図解（フローチャート、比較表、ステップ図、概念図など適切な形式を選ぶ）

以下のJSON形式で出力してください（JSONのみ、他テキスト不要）:
{
  "eyecatch": "アイキャッチ画像の英語プロンプト（Generate a stylish illustrated wide image... のように具体的に記述。画像内に表示する日本語テキストも指定する）",
  "h2Images": [
    {
      "heading": "h2見出しテキスト（そのまま）",
      "prompt": "図解画像の英語プロンプト（具体的な図解の内容・レイアウト・色使いを記述。画像内に表示する日本語テキストも指定する。手順系ならScreenshot-style UI imageと指定する）"
    }
  ]
}`;

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
    throw new Error("画像プロンプトの設計に失敗しました。");
  }

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("JSON parse error");
    return JSON.parse(jsonMatch[0]);
  } catch (e) {
    throw new Error("画像プロンプトのパースに失敗しました。もう一度お試しください。");
  }
}

/**
 * ブログ用の横長画像を1枚生成（16:9）
 * @returns {string} data:URL
 */
export async function generateBlogImage(apiKey, prompt) {
  const ai = new GoogleGenAI({ apiKey });

  const response = await ai.models.generateContent({
    model: IMAGE_MODEL,
    contents: [{ parts: [{ text: prompt }] }],
    config: {
      responseModalities: ["IMAGE"],
      imageGeneration: {
        aspectRatio: "16:9",
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
