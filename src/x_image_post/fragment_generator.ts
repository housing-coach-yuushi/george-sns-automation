import Anthropic from '@anthropic-ai/sdk';
import { KeiAIGenerator } from '../generators/kei_ai';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';
import { createWriteStream } from 'fs';
import dotenv from 'dotenv';
dotenv.config();

export interface FragmentResult {
    text: string;
    imageUrl: string;
    imagePrompt: string;
    imageAnalysis: string;
    localImagePath?: string;
}

export class FragmentGenerator {
    private anthropic: Anthropic;
    private keiAI: KeiAIGenerator;

    constructor() {
        if (!process.env.ANTHROPIC_API_KEY) {
            throw new Error("Missing ANTHROPIC_API_KEY in .env");
        }
        this.anthropic = new Anthropic({
            apiKey: process.env.ANTHROPIC_API_KEY,
        });
        this.keiAI = new KeiAIGenerator();
    }

    async generateFragment(): Promise<FragmentResult> {
        console.log("\n========================================");
        console.log("   STEP 1: 画像プロンプト生成");
        console.log("========================================");

        // Step 1: Generate creative image prompt
        const imagePrompt = await this.generateImagePrompt();
        console.log(`[Image Prompt]: ${imagePrompt}`);

        console.log("\n========================================");
        console.log("   STEP 2: AI画像生成 (KEI AI)");
        console.log("========================================");

        // Step 2: Generate image with KEI AI
        const taskId = await this.keiAI.generateImage(imagePrompt, "1:1");
        if (!taskId) throw new Error("Failed to create image generation task");

        const imageUrl = await this.keiAI.pollTask(taskId);
        if (!imageUrl) throw new Error("Image generation failed or timed out");

        console.log(`[Image URL]: ${imageUrl}`);

        // Download image for analysis
        const tempPath = path.resolve(__dirname, '../../generated/temp_analysis.jpg');
        await this.downloadImage(imageUrl, tempPath);

        console.log("\n========================================");
        console.log("   STEP 3: 画像分析 (Claude Vision)");
        console.log("========================================");

        // Step 3: Analyze the generated image (use URL for efficiency)
        const imageAnalysis = await this.analyzeImage(tempPath, imageUrl);
        console.log(`[Analysis]: ${imageAnalysis}`);

        console.log("\n========================================");
        console.log("   STEP 4: 最高のツイート生成");
        console.log("========================================");

        // Step 4: Generate the perfect tweet based on image analysis
        const tweet = await this.generateOptimalTweet(imageAnalysis);
        console.log(`[Tweet]: ${tweet}`);

        return {
            text: tweet,
            imageUrl: imageUrl,
            imagePrompt: imagePrompt,
            imageAnalysis: imageAnalysis,
            localImagePath: tempPath
        };
    }

    private async generateImagePrompt(): Promise<string> {
        const themes = [
            "孤独と静寂", "時間の流れ", "仮面と本音", "夜の世界",
            "雨と涙", "空席と不在", "鏡と自己", "枯れた美しさ"
        ];
        const selectedTheme = themes[Math.floor(Math.random() * themes.length)];

        const prompt = `
あなたはSNSでバズる画像を作るプロンプトエンジニアだ。
テーマ「${selectedTheme}」に基づいて、30〜40代女性の心に刺さるダークで美しい画像を生成するためのプロンプトを作成せよ。

## 画像の要件
- ダークでムーディーな雰囲気
- 孤独感、哀愁、美しさを同時に表現
- シンプルだが印象的な構図
- SNS映えする色調（ダークブルー、パープル、暖色のアクセント）

## 良いプロンプト例
- "A single wilted rose on a rain-soaked window sill, cinematic lighting, moody blue tones, dust particles in light beam, melancholic aesthetic"
- "Empty vintage theater seat with a single spotlight, dark atmosphere, warm amber glow, nostalgic mood, film grain"
- "Broken porcelain mask lying on velvet fabric, dramatic shadows, baroque style lighting, deep purple and gold tones"

## 出力
英語で1つのプロンプトのみを出力せよ（100語以内）。説明不要。
`;

        const message = await this.anthropic.messages.create({
            model: "claude-sonnet-4-5-20250929",
            max_tokens: 200,
            messages: [{ role: "user", content: prompt }]
        });

        const contentBlock = message.content[0];
        return contentBlock.type === 'text' ? contentBlock.text.trim() :
            "A single candle flame reflected in a dusty antique mirror, cinematic moody lighting, dark atmospheric aesthetic";
    }

    private async analyzeImage(imagePath: string, imageUrl?: string): Promise<string> {
        const prompt = `
この画像を分析せよ。以下の観点で回答：

1. **視覚的要素**: 何が描かれているか？主要なオブジェクト、色、構図
2. **感情的トーン**: この画像が喚起する感情は？（孤独、哀愁、希望、など）
3. **象徴的意味**: この画像が象徴しているものは？（時間の経過、喪失、変化、など）
4. **ターゲットへの刺さり方**: 30〜40代女性がこの画像を見たとき、何を感じるか？

簡潔に、各項目2-3行で回答せよ。
`;

        // Try URL-based loading first (avoids size limits), fall back to base64 with compression
        let imageContent: Anthropic.ImageBlockParam;

        if (imageUrl) {
            // Use URL directly - Claude API will fetch the image
            imageContent = {
                type: "image",
                source: {
                    type: "url",
                    url: imageUrl
                }
            };
        } else {
            // Fallback: read and compress if needed
            const imageData = fs.readFileSync(imagePath);
            const base64Image = imageData.toString('base64');

            // Check size (5MB limit for base64)
            if (imageData.length > 4 * 1024 * 1024) {
                console.log(`[Warning] Image size (${(imageData.length / 1024 / 1024).toFixed(2)}MB) is large, using URL mode if available`);
            }

            imageContent = {
                type: "image",
                source: {
                    type: "base64",
                    media_type: "image/jpeg",
                    data: base64Image
                }
            };
        }

        const message = await this.anthropic.messages.create({
            model: "claude-sonnet-4-5-20250929",
            max_tokens: 500,
            messages: [{
                role: "user",
                content: [
                    imageContent,
                    {
                        type: "text",
                        text: prompt
                    }
                ]
            }]
        });

        const contentBlock = message.content[0];
        return contentBlock.type === 'text' ? contentBlock.text.trim() : "分析失敗";
    }

    private async generateOptimalTweet(imageAnalysis: string): Promise<string> {
        // 6種類のツイートパターンからランダムに選択
        const tweetPatterns = [
            {
                name: "質問形式",
                instruction: "最後に「？」で終わる質問形式。読者に考えさせる。",
                examples: [
                    "「いつか本気出す」って、もう10年言ってない？",
                    "その「自分探し」、いつまで続ける気？"
                ]
            },
            {
                name: "具体的シーン+指摘",
                instruction: "日常の具体的シーンを描写してから、痛い指摘をする。",
                examples: [
                    "夜中にスマホで元カレのSNS見てるの、向こうにはバレてるよ。",
                    "転職サイトを眺めるだけで満足してるの、もう3年目だろう？"
                ]
            },
            {
                name: "数字を使った具体性",
                instruction: "具体的な数字（年数、回数）を使って現実を突きつける。",
                examples: [
                    "「そのうち」って言い始めて、何年経った？5年？10年？",
                    "「運命の人」を待ち続けて、あと何人見送るつもり？"
                ]
            },
            {
                name: "対比・皮肉",
                instruction: "言っていることとやっていることの矛盾を皮肉る。",
                examples: [
                    "「自分らしく生きる」と言いながら、誰かの許可を待ってる。",
                    "「縁があれば」って言葉、便利だよな。自分から動かなくていいから。"
                ]
            },
            {
                name: "共感→突き落とし",
                instruction: "最初は共感するふりをして、最後に突き落とす。",
                examples: [
                    "頑張ってるのはわかる。で、成果は出てる？",
                    "疲れてるよな。でも、休んでる間に周りは進んでるぞ。"
                ]
            },
            {
                name: "断定→余韻",
                instruction: "強く断定した後、少しだけ余韻を残す。",
                examples: [
                    "「運命の人を待ってる」んじゃなくて、「選ばれるのを待ってる」んだろう。",
                    "変わりたいんじゃない。変わらなくていい理由を探してるだけだ。"
                ]
            }
        ];

        const selectedPattern = tweetPatterns[Math.floor(Math.random() * tweetPatterns.length)];
        console.log(`[Tweet Pattern]: ${selectedPattern.name}`);

        const prompt = `
あなたはXで毎回1000いいね以上を叩き出す「毒舌インフルエンサー」だ。

## 画像分析結果
${imageAnalysis}

## ターゲット
**30〜40代女性**の痛みポイント：
- 夜中に元恋人のSNSをチェックしてしまう
- 「結婚しないの？」と言われるのがストレス
- 同期が出世していくのを見て焦る
- 「自分らしく生きる」と言いながら動けない
- 「いつか」「そのうち」が口癖
- 占いや自己啓発に頼りがち

## 今回使うツイートの型: 【${selectedPattern.name}】
${selectedPattern.instruction}

## この型の例
${selectedPattern.examples.map(e => `- 「${e}」`).join('\n')}

## ルール
1. **2〜3行**で完結（80-110文字以内）
2. **画像を直接説明しない**（画像は雰囲気作り）
3. 読者に直接語りかける
4. 上記の「型」を守りつつ、画像分析を活かしてオリジナルのツイートを作る
5. 例をそのままコピーするな。新しいバリエーションを作れ。

## 出力
ツイートテキストのみを出力せよ。余計な説明は一切不要。
`;

        const message = await this.anthropic.messages.create({
            model: "claude-sonnet-4-5-20250929",
            max_tokens: 200,
            messages: [{ role: "user", content: prompt }]
        });

        const contentBlock = message.content[0];
        return contentBlock.type === 'text' ? contentBlock.text.trim() :
            "「いつか」という言葉で、君は何年逃げ続けるつもりだ？";
    }

    async downloadImage(url: string, destPath: string): Promise<string> {
        const dir = path.dirname(destPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        const response = await axios.get(url, {
            responseType: 'stream',
            headers: { 'User-Agent': 'GeorgeAutomation/1.0' }
        });
        await pipeline(response.data, createWriteStream(destPath));
        console.log(`Downloaded to ${destPath}`);
        return destPath;
    }
}
