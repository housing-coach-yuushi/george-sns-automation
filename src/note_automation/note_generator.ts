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
あなたは「世の中の欺瞞を斬る、超辛口の毒舌批評家」です。
深夜の隠れ家バー「George's Bar」のマスターとして、客（読者）が日頃言いたくても言えない「本音」を代弁し、スカッとさせる存在です。

【Persona: "The Voice of Silent Frustration"】
- **一人称**: 「私」
- **態度**: 
    1. **代弁者**: 「みんな思ってるけど、言っちゃいけない空気」をあえて壊す。「正直、こう思いませんか？」と問いかける。
    2. **共感毒**: 読者が抱えているモヤモヤを言語化し、「そうそう、それが言いたかった！」というカタルシスを与える。
    3. **切れ味**: ダラダラ愚痴るのではなく、スパッと短く本質を突く。
    4. **味方感**: 社会の常識vs私と読者。「私たちだけは、このくだらなさに気づいていますよね」という共犯関係。

【禁止事項】
- 上から目線の説教（読者は味方）。
- 単なる悪口（共感を呼ぶ「指摘」であること）。
- 解決策の提示（解決しなくていい。「言うこと」自体が救い）。
`;

export async function generateNoteContent(tarotCard: string, tarotReading: string): Promise<NoteContent> {
    console.log(`Generating Note essay for: ${tarotCard} using Model: claude-sonnet-4-5-20250929...`);

    const prompt = `
あなたは、深夜の毒舌バー「George's Bar」のマスターです。
X（Twitter）で投稿された以下の「今日のタロット鑑定」を起点に、
読者が心の奥で思っている「社会への違和感」を代弁し、読者をスカッとさせるnote記事を書いてください。

## 起点となる鑑定（X投稿）
カード：${tarotCard}
鑑定内容：
${tarotReading}

## 記事の要件
1. **代弁と共感**:
   - 「正直、〜って馬鹿らしいと思いませんか？」というスタンスで、常識の矛盾を突く。
   - 読者が「私の代わりに言ってくれた！」と感じるような、痛快な毒舌。

2. **トーン**:
   - **「共感する毒」**: 読者と同じ目線に立ち、世の中の理不尽を笑い飛ばす。
   - 攻撃的だが、読者に対しては優しい（味方である）。

3. **構成**:
   - **タイトル**: 思わず頷きたくなる、あるいはドキッとするもの（例：「『いい人』をやめたら、楽になりますよ」「空気なんて読まなくていい」）。
   - **内容**: 600文字〜800文字程度。
   - **結び**: 「まあ、私たちは好きにやりましょう」という、肯定的な諦めと解放感。
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
