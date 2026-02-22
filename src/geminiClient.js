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
4. **ハッシュタグ**: 関連するハッシュタグを5つ。必ず「#生成AI」「#AI活用」を含め、残り3つは投稿内容に関連するミドルレンジ（ボリューム1,000〜100,000程度）のタグを選ぶ

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
      "text": "説明テキスト（50〜60文字程度。感情たっぷりのフレンドリーな話し言葉で書く。～だよー！、～なんよね、～スゴすぎぃ！！、～かもよ、～てね！、～しようね のような感情が伝わる文末表現を使う。読んでて楽しくなるテンション。一文ごとに必ず\\nで改行する）"
    }
  ],
  "summaryItems": ["まとめ項目1", "まとめ項目2", "まとめ項目3", "まとめ項目4", "まとめ項目5", "まとめ項目6", "まとめ項目7"]
}

ルール:
- introTextは2パート構成にする。前半は悩む人がリアルに口にしそうなセリフ1つだけ（「〜」形式。吹き出しに入るので必ず1つのみ）、後半は投稿の概要・ベネフィット・興味付け。一文ごとに必ず\\nで改行する。前半と後半は\\n\\nで区切る
- mainSlidesは必ず7個（固定）。合計10枚構成=表紙1+導入1+メイン7+まとめ1
- タイトルは日本語で、短く印象的に
- imageDescは英語で、具体的なビジュアルを描写（AI画像生成で使うため）
- mainSlidesのtextは感情たっぷりのフレンドリーな話し言葉で書く（～だよー！、～なんよね、～スゴすぎぃ！！、～かもよ、～てね！、～しようね）。堅い敬語は使わない。読んでいて楽しくなる、テンション高めのトーン。驚き・感動・共感が伝わるように。50〜60文字程度に収める。一文ごとに必ず\\nで改行する
- summaryItemsは必ず7個（mainSlidesと同数）。端的・シンプルな名詞句スタイル（話し言葉ではない）
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

以下の投稿内容に基づいて、Threadsのツリー投稿を作成してください。

【投稿内容】
タイトル: ${coverTitle}
サブタイトル: ${coverSubtitle || ''}
導入: ${introText || ''}
スライド内容:
${slideSummary}
まとめ: ${summaryText}

【ターゲット】
AI初心者〜中級者。難しい専門用語や概念が出てきたら、たとえ話や身近な例で軽く解説を挟む。
「知らないと損」「これ知ってるだけで差がつく」という空気感を全体に漂わせる。

【文体ルール】
- 話し言葉で書く。堅い文章は禁止。友達に教えるようなテンション
- イメージしやすく再現性のある表現を使う（「例えば〜」「要するに〜」「ざっくり言うと〜」）
- 「〜なんだよね」「〜なわけ」「〜してみて」のようなカジュアルな語尾
- 絵文字は控えめ（1投稿に1〜2個程度）

【出力形式（厳守）】
- 必ず ---POST--- 区切りで分割して出力する
- 前置き/注釈/ラベル/番号は禁止（本文のみ）
- 一行ずつ改行して、書出し＋一文→空白行→一文→空白行→一文という形に
（書出しは、そのあとの一文と結合させて書出しだけで改行しない）

【POST1（最重要・80〜160文字）】
- 構成：①強烈な一文（常識破壊・断言） ②強い言葉で興味付け（見ないと損、知らないとヤバい感） ③次へのつなぎ（タップ誘導の締め）
- 書出しの1文目が超重要。常識を壊すような強い断言で読者の手を止める。
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
- 1投稿あたり全角400文字前後（350〜450文字。絶対に500文字以内）

【POST3〜最後から2番目（詳細解説パート）】
- POST2で示した大枠・結論に対して、具体的に深掘りしていく
- 難しい概念は「ざっくり言うと〜」「たとえるなら〜」で平易に説明
- 具体例・数字・ビフォーアフターなど、イメージしやすい情報を入れる
- 1投稿あたり全角400文字前後（350〜450文字。絶対に500文字以内）

【最終POST（締め）】
- 最後の解説の流れを受けて自然に締める（箇条書きまとめは不要）
- フォロー誘導：「これからも最新情報や役立つ情報を分かりやすく解説していくので、AIを学びたい方はフォローしといてくださいね」という趣旨を自然な話し言葉で入れる
- 本文の最後（投稿の下にぶら下げる形）にインスタ誘導を入れる。例:
  「インスタ投稿でも解説してるから見てみてね👇」
  「インスタでもっと詳しくまとめてるよ✨」
  「インスタの投稿も見てね📸」
  など、絵文字を使ってカジュアルに誘導する
- 1投稿あたり全角400文字前後（350〜450文字。絶対に500文字以内）

【投稿数】
- 合計4〜7投稿。元の記事のボリュームに応じて判断する
- 内容が薄い場合は4投稿、しっかりした記事なら6〜7投稿

ツリー投稿のみを出力してください（説明や前置きは不要）。`;

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
構成: ①常識破壊的な強い断言の冒頭文 ②強い言葉での興味付け（見ないと損・知らないとヤバい感） ③次の投稿への遷移（タップ誘導）
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
本文の最後（投稿の下にぶら下げる形）にインスタ誘導を入れる。「インスタ投稿でも解説してるから見てみてね👇」「インスタでもっと詳しくまとめてるよ✨」など絵文字を使ってカジュアルに。
話し言葉で書く。文字数: 全角400文字前後（350〜450文字、絶対500文字以内）`;
  } else {
    if (postIndex === 1) {
      roleDescription = `これはツリーのPOST2（解説の導入）です。
まず解説全体の結論や大枠を示す。
- 手順系なら：箇条書きで全体のステップをザッと見せて「詳しく解説していくね」と繋ぐ
- ノウハウ系なら：「ざっくり言うとこういうこと」と大枠を示してから詳細解説に移る
- 比較・選択系なら：「結論から言うと〜」で先に答えを見せてから理由を解説
その後、記事内容を噛み砕いて解説（まとめ・要約ではなく理解が深まる内容）。
難しい概念は「ざっくり言うと〜」「たとえるなら〜」で平易に説明。
話し言葉で書く。文字数: 全角400文字前後（350〜450文字、絶対500文字以内）`;
    } else {
      roleDescription = `これはツリーの中間投稿（POST${postIndex + 1}/${totalPosts}）です。
POST2で示した大枠・結論に対して、具体的に深掘りしていく。
難しい概念は「ざっくり言うと〜」「たとえるなら〜」で平易に説明。
具体例・数字・ビフォーアフターでイメージしやすく。
話し言葉で書く。文字数: 全角400文字前後（350〜450文字、絶対500文字以内）`;
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
