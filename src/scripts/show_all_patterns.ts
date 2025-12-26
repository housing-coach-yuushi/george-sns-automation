import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

async function showSamples() {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    // 6種類のツイートパターン
    const tweetPatterns = [
        { name: "質問形式", instruction: "最後に「？」で終わる質問形式。読者に考えさせる。" },
        { name: "具体的シーン+指摘", instruction: "日常の具体的シーンを描写してから、痛い指摘をする。" },
        { name: "数字を使った具体性", instruction: "具体的な数字（年数、回数）を使って現実を突きつける。" },
        { name: "対比・皮肉", instruction: "言っていることとやっていることの矛盾を皮肉る。" },
        { name: "共感→突き落とし", instruction: "最初は共感するふりをして、最後に突き落とす。" },
        { name: "断定→余韻", instruction: "強く断定した後、少しだけ余韻を残す。" }
    ];

    console.log("\n========================================");
    console.log("   6種類のツイート型サンプル");
    console.log("========================================\n");

    for (const pattern of tweetPatterns) {
        const response = await anthropic.messages.create({
            model: "claude-sonnet-4-5-20250929",
            max_tokens: 150,
            messages: [{
                role: "user",
                content: `30-40代女性向けの毒舌ツイートを1つ作成せよ。
型: ${pattern.name}
指示: ${pattern.instruction}
テーマ: 恋愛、キャリア、自己実現の悩み
ツイートテキストのみを出力。80-110文字以内。`
            }]
        });

        const tweet = response.content[0].type === 'text' ? response.content[0].text.trim() : '';
        console.log(`【${pattern.name}】`);
        console.log(`${tweet}`);
        console.log("");
    }
}

showSamples().catch(console.error);
