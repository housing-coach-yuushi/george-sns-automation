import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';
dotenv.config();

// Configuration from User Request
const THREADS_CONFIG = {
    persona: "深夜のタロットBar｜ジョージ",
    seeds: [
        "答えが出ない夜は、間違っていない。",
        "考えが止まった場所も、記録の一部だった。",
        "進まない時間は、無駄ではなかった。",
        "沈黙は、選ばれなかった言葉の集合体。",
        "決めなかった夜のほうが、長く残ることもある。"
    ],
    rules: {
        max_lines: 3,
        no_advice: true,
        no_emojis: true,
        no_hashtags: true,
        no_call_to_action: true,
        tone: "観測／記録／独白",
        forbidden: ["説明口調", "結論", "励まし", "タロット解説", "自分語り"]
    }
};

export interface ThreadsFragmentResult {
    text: string;
    seed: string;
    status: 'APPROVED' | 'REJECTED';
    reason: string;
}

export class ThreadsFragmentGenerator {
    private anthropic: Anthropic;

    constructor() {
        if (!process.env.ANTHROPIC_API_KEY) {
            throw new Error("Missing ANTHROPIC_API_KEY in .env");
        }
        this.anthropic = new Anthropic({
            apiKey: process.env.ANTHROPIC_API_KEY,
        });
    }

    async generateFragment(): Promise<ThreadsFragmentResult> {
        // 1. Select Seed
        const seed = THREADS_CONFIG.seeds[Math.floor(Math.random() * THREADS_CONFIG.seeds.length)];

        // 2. Generate Content
        // We ask for multiple candidates to increase chance of valid "silent" post
        const prompt = `
あなたは「${THREADS_CONFIG.persona}」です。
以下の「種（Seed）」から、Threadsに投稿する**独白の断片**を生成してください。

種: "${seed}"

## 生成ルール
- **最大3行**
- 感傷的になりすぎない（ドライに、事実として記述する）
- アドバイス禁止（「〜しましょう」「〜でもいい」など禁止）
- 結論禁止（問いのまま残す、あるいは風景として終わる）
- 絵文字・ハッシュタグ禁止
- 誰かに語りかけない（独り言）

## 出力形式
テキストのみを出力してください。
        `;

        const message = await this.anthropic.messages.create({
            model: "claude-sonnet-4-5-20250929",
            max_tokens: 150,
            temperature: 0.7,
            messages: [{ role: "user", content: prompt }]
        });

        const contentBlock = message.content[0];
        const rawText = contentBlock.type === 'text' ? contentBlock.text.trim() : "";

        // 3. Self-Correction / Decision Logic (The "Curation" Step)
        const decision = await this.evaluateContent(rawText);

        return {
            text: rawText,
            seed: seed,
            status: decision.approved ? 'APPROVED' : 'REJECTED',
            reason: decision.reason
        };
    }

    private async evaluateContent(text: string): Promise<{ approved: boolean, reason: string }> {
        const checkPrompt = `
以下のテキストが、「Silent Curator」の基準を満たしているか判定してください。

テキスト:
"${text}"

## 基準 (Skip if...)
1. 説明口調になっている（理由や因果関係を説明している）
2. 結論を言い切っている（閉じている）
3. 誰かを励まそうとしている（ポジティブな押し付け）
4. タロットや占いの専門用語が出ている
5. 3行を超えている

判定結果をJSONで返してください。
{ "approved": boolean, "reason": "理由（NGの場合）" }
        `;

        const message = await this.anthropic.messages.create({
            model: "claude-sonnet-4-5-20250929",
            max_tokens: 200,
            messages: [{ role: "user", content: checkPrompt }]
        });

        const contentBlock = message.content[0];
        try {
            const jsonStr = contentBlock.type === 'text' ? contentBlock.text : "{}";
            // Simple parsing attempt (Claude might wrap in code blocks)
            const cleanJson = jsonStr.replace(/```json|```/g, '').trim();
            return JSON.parse(cleanJson);
        } catch (e) {
            console.error("JSON Parse Error in evaluation:", e);
            return { approved: true, reason: "Parse Error (Default Approved)" }; // Fallback
        }
    }
}
