import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';
dotenv.config();

const apiKey = process.env.ANTHROPIC_API_KEY ? process.env.ANTHROPIC_API_KEY.trim() : "";
const anthropic = new Anthropic({
    apiKey: apiKey,
});

export interface NoteContent {
    title: string;
    body: string;
}

export async function generateNoteContent(tarotCard: string, tarotReading: string): Promise<NoteContent> {
    console.log(`Generating Note essay for: ${tarotCard}...`);

    const prompt = `
あなたは、静かな夜に営まれる「George's Bar」のオーナー兼タロット占い師です。
X（Twitter）で投稿された以下の「今日のタロット鑑定」をベースに、noteに掲載するエッセイ記事を書いてください。

## 元の鑑定（X投稿）
カード：${tarotCard}
鑑定内容：
${tarotReading}

## 記事の要件
1. **文字数**: 600〜800文字（これより短すぎず、長すぎないこと）
2. **トーン**:
   - 深夜ラジオのような、落ち着いた静かな語り口
   - 読者に「問い」を投げかけるが、決して「答え」は押し付けない（断定禁止）
   - 「〜すべき」「〜絶対」などの強い言葉は使わない
   - 読後に静寂と余韻が残るように
3. **構成**:
   - **タイトル**: 抽象的だが惹きつけられるもの（例：「夜明け前の静けさの中で」「迷いこそが地図になる」など。カード名は入れなくてよい）
   - **導入**: 2〜3行の詩的な書き出し
   - **本文**: 元の鑑定を深掘りし、日常の風景や感情に結びつけて語る
   - **結び**: 静かにフェードアウトするように終わる
   - **フッター**: 以下の定形文を必ず最後にそのまま記載する
     
     ---
     
     ## この鑑定について
     
     この鑑定は、
     LINEで保存しておくことができます。
     
     あとで見返したいと感じたら、
     下のリンクからどうぞ。
     
     ▶︎ https://georges-bar.netlify.app/

## 出力形式
JSON形式で出力してください。
{
  "title": "ここにタイトル",
  "body": "ここに本文（改行は\\nで表現）"
}
`;

    const msg = await anthropic.messages.create({
        model: "claude-3-5-haiku-latest",
        max_tokens: 1500,
        temperature: 0.7,
        system: "あなたは静かなバーのマスターであり、哲学者です。JSON形式のみを出力してください。",
        messages: [
            { role: "user", content: prompt }
        ]
    });

    let content = "";
    for (const block of msg.content) {
        if (block.type === 'text') {
            content = block.text;
            break;
        }
    }

    if (!content) {
        throw new Error("No text content received from Claude.");
    }

    try {
        const json = JSON.parse(content);
        return {
            title: json.title,
            body: json.body
        };
    } catch (e) {
        console.error("Failed to parse Claude response:", content);
        throw new Error("Failed to generate valid JSON content for Note.");
    }
}
