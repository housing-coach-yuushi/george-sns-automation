import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';
dotenv.config();

export class ContentGenerator {
    private anthropic: Anthropic;

    constructor() {
        if (!process.env.ANTHROPIC_API_KEY) {
            throw new Error("Missing ANTHROPIC_API_KEY in .env");
        }
        this.anthropic = new Anthropic({
            apiKey: process.env.ANTHROPIC_API_KEY,
        });
    }

    async generateDailyPost(): Promise<string> {
        const prompt = `
あなたは「未来を変えるタロット占い師」ジョージです。
X（旧Twitter）に毎日1回投稿する、内省的で心に響くタロット鑑定文を作成してください。

## 条件
- テキストのみ（画像なし）
- 文字数：120〜140文字程度（フッター除きで）
- 1投稿で完結させる
- 誰にでも当てはまるが、深く刺さる内容にする
- 静かで内省的なトーン
- 押し売り・煽りは禁止
- 「保存したくなる感情」を刺激する
- **絶対に「LINE」という単語は使わない**

## フォーマット（厳守）

今日のカード：[カード名]

[鑑定文 3〜4行]

この鑑定は、
あとで見返したくなる人が多い。

▶︎ George’s Bar
https://georges-bar.netlify.app/
`;

        try {
            console.log("Generating content with Anthropic...");
            const message = await this.anthropic.messages.create({
                model: "claude-3-haiku-20240307",
                max_tokens: 300,
                temperature: 0.7,
                system: "あなたはプロのタロット占い師です。静かで知的な語り口が特徴です。",
                messages: [
                    { role: "user", content: prompt }
                ]
            });

            // Iterate through content blocks to find text
            for (const block of message.content) {
                if (block.type === 'text') {
                    return block.text.trim();
                }
            }

            throw new Error("No text content received from Claude.");

        } catch (error) {
            console.error("Failed to generate content:", error);
            throw error;
        }
    }
}
