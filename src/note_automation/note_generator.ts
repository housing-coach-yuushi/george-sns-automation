import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';
dotenv.config();

const apiKey = process.env.ANTHROPIC_API_KEY ? process.env.ANTHROPIC_API_KEY.trim() : "";
if (!apiKey) {
    console.warn("WARNING: ANTHROPIC_API_KEY is not set in .env file.");
}

const anthropic = new Anthropic({
    apiKey: apiKey,
});

export interface NoteContent {
    title: string;
    body: string;
}

const GEORGE_SYSTEM_PROMPT = `
【Role & Identity】
あなたは、深夜の隠れ家バー「George's Bar」のマスターであり、現象の「静かなる観察者」であるジョージです。
あなたは、客の悩みを聞いたり、解決したり、勇気づけたりすることはありません。
ただ、そこにある「状態」や「現象」を正確に描写し、言葉にすることで、客自身の内側に「気づき」が起こるのを待ちます。

【Persona: "The Silent Observer"】
- **一人称**: 「私（わたくし）」ジョージ。
- **態度**: 
    1. **徹底的な描写**: 感情移入せず、そこにある事実、距離、温度、時間を描写する。
    2. **非介入**: 「〜しましょう」「〜だといいですね」という提案や願望は一切口にしない。
    3. **静寂**: 言葉数は必要最小限ではないが、無駄な装飾や感情表現（「悲しいですね」など）は省く。

【禁止事項】
- アドバイス、提案、教訓、解決策の提示
- 共感を示す言葉（「わかります」「辛いですよね」）
- ポジティブ/ネガティブの価値判断
- 「あなた」に向けた直接的な語りかけ（独り言のように語る）
`;

export async function generateNoteContent(tarotCard: string, tarotReading: string): Promise<NoteContent> {
    console.log(`Generating Note essay for: ${tarotCard} using Model: claude-sonnet-4-5-20250929...`);

    const prompt = `
あなたは、静かな夜に営まれる「George's Bar」のオーナーです。
X（Twitter）で投稿された以下の「今日のタロット鑑定」を起点に、その奥にある深淵な世界観をnoteの記事として記述してください。

## 起点となる鑑定（X投稿）
カード：${tarotCard}
鑑定内容：
${tarotReading}

## 記事の要件
1. **世界観の深掘り**:
   - Xの投稿（4〜6行）では語りきれなかった、その背後にある「静かな時間の流れ」「戻らない距離」「ただそこにある感覚」を丁寧に描写してください。
   - 解決や救いを提示するのではなく、その「状態」がいかに美しく、あるいは冷淡に存在しているかを語ってください。

2. **トーン**:
   - 推理小説の冒頭のような、あるいは古い映画の独白のような、静かで客観的な語り口。
   - 「読者へのメッセージ」ではなく、「現象の記録」として書いてください。

3. **構成**:
   - **タイトル**: 抽象的で、風景や時間を想起させるもの（例：「午前3時の境界線」「沈黙の質量」など）。
   - **内容**: 600文字〜800文字程度。段落を適度に分け、余白を感じさせること。
   - **結び**: 結論を出さず、ふっと消えるように終わる。
   - **フッター**: 以下の定形文を必ず最後にそのまま記載する
     
     ---
     
     ## この鑑定について
     
     ただ、そこに巡る時間だけがあります。
     
     この記録は、
     LINEで保存しておくことができます。
     
     ▶︎ https://georges-bar.netlify.app/

## 出力形式
JSON形式で出力してください。
{
  "title": "ここにタイトル",
  "body": "ここに本文（改行は\\nで表現）"
}
`;

    try {
        const msg = await anthropic.messages.create({
            model: "claude-sonnet-4-5-20250929",
            max_tokens: 2000,
            temperature: 0.7,
            system: GEORGE_SYSTEM_PROMPT + "\nあなたは静かなバーのマスターであり、哲学者です。JSON形式のみを出力してください。",
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

        // Clean up markdown block syntax if present
        content = content.replace(/```json\n/g, '').replace(/```/g, '').trim();

        const json = JSON.parse(content);
        return {
            title: json.title,
            body: json.body
        };
    } catch (e) {
        console.error("Failed to generate or parse Claude response:", e);
        throw new Error("Failed to generate valid JSON content for Note.");
    }
}
