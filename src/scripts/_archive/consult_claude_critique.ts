import { Anthropic } from '@anthropic-ai/sdk';
import dotenv from 'dotenv';
dotenv.config();

async function consultClaudeCritique() {
    const anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const sampleContent = `
あなたが「正しさ」を振りかざすのは、自分の弱さを隠すためですね。他人を裁いている間は、自分の矛盾と向き合わなくて済む。でもその天秤は、いずれあなた自身にも向けられます。
『正義』（正位置）
図星でしたか？
`;

    const prompt = `
あなたはSNSマーケティングのプロであり、この「鋭利なナイフ」戦略の立案者です。

【状況】
あなたが生成した上記のツイート案（ターゲット：『正義』のカード）に対し、
クライアント（ユーザー）から**「強すぎない？（Too strong/aggressive）」**という懸念が出ました。

【依頼】
以下の2点について、あなたの意見を述べてください。

1. **弁明（Defense）**: なぜこのぐらい強くないとダメなのか？（または、確かにやりすぎだったか？）
2. **調整案（Calibration）**: 「図星を突く」というコアを守りつつ、もし少しマイルドにするならどう書き換えるか？（具体的な修正案を提示）

あなたのプロとしての意見を聞かせてください。
`;

    console.log("Consulting Claude for Critique...");
    const msg = await anthropic.messages.create({
        model: "claude-sonnet-4-5-20250929", // Project specific model ID
        max_tokens: 1000,
        temperature: 0.7,
        messages: [{ role: "user", content: prompt }]
    });

    console.log("\n--- Claude's Critique ---\n");
    const textContent = msg.content.filter(b => b.type === 'text').map(b => b.text).join('\n');
    console.log(textContent);
}

consultClaudeCritique();
