import { FragmentGenerator } from '../x_image_post/fragment_generator';
import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

async function showSample() {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    // Use the latest generated image
    const imagePath = 'generated/fragments/fragment_ai_2025-12-25T07-12-37-246Z.jpg';
    const imageData = fs.readFileSync(imagePath);
    const base64Image = imageData.toString('base64');

    console.log("\n========================================");
    console.log("   画像を分析中...");
    console.log("========================================\n");

    // Analyze the image
    const analysisResponse = await anthropic.messages.create({
        model: "claude-sonnet-4-5-20250929",
        max_tokens: 500,
        messages: [{
            role: "user",
            content: [
                { type: "image", source: { type: "base64", media_type: "image/jpeg", data: base64Image } },
                { type: "text", text: "この画像を簡潔に説明せよ（3行以内）。" }
            ]
        }]
    });

    const imageDescription = analysisResponse.content[0].type === 'text' ? analysisResponse.content[0].text : '';
    console.log("【画像の説明】");
    console.log(imageDescription);

    console.log("\n========================================");
    console.log("   最適ツイートを生成中...");
    console.log("========================================\n");

    // Generate optimal tweet
    const tweetResponse = await anthropic.messages.create({
        model: "claude-sonnet-4-5-20250929",
        max_tokens: 200,
        messages: [{
            role: "user",
            content: [
                { type: "image", source: { type: "base64", media_type: "image/jpeg", data: base64Image } },
                {
                    type: "text", text: `
この画像と一緒に投稿するツイートを作成せよ。

ターゲット: 30〜40代女性
- 夜中に元恋人のSNSをチェックしてしまう
- 「いつか」「そのうち」が口癖
- 「自分らしく生きる」と言いながら動けない

ルール:
- 2〜3行で完結
- 画像を直接説明しない
- 読者の痛いところを突く
- 語尾は「〜だ」「〜だろう」

例: 「"いつか本気出す"って、もう10年言ってない？」

ツイートテキストのみを出力せよ。
` }
            ]
        }]
    });

    const tweet = tweetResponse.content[0].type === 'text' ? tweetResponse.content[0].text : '';

    console.log("【生成されたツイート】");
    console.log("─────────────────────────────");
    console.log(tweet);
    console.log("─────────────────────────────");
}

showSample().catch(console.error);
