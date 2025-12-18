import Anthropic from '@anthropic-ai/sdk';
import { ImageSearcher } from './image_searcher';
import dotenv from 'dotenv';
dotenv.config();

export interface FragmentParams {
    keywords?: string[]; // Optional override
}

export interface FragmentResult {
    text: string;
    imageUrl: string;
    imageTitle: string;
    imageSource: string;
    imageAuthor?: string;
    imageLicense?: string;
    localImagePath?: string;
}

export class FragmentGenerator {
    private anthropic: Anthropic;
    private searcher: ImageSearcher;

    constructor() {
        if (!process.env.ANTHROPIC_API_KEY) {
            throw new Error("Missing ANTHROPIC_API_KEY in .env");
        }
        this.anthropic = new Anthropic({
            apiKey: process.env.ANTHROPIC_API_KEY,
        });
        this.searcher = new ImageSearcher();
    }

    async generateFragment(params: FragmentParams = {}): Promise<FragmentResult> {
        // 1. Generate Keywords (if not provided)
        let keywords = params.keywords;
        if (!keywords || keywords.length === 0) {
            keywords = await this.generateKeywords();
        }
        console.log(`Using keywords: ${keywords.join(', ')}`);

        // 2. Search and Select Image
        // Pick one random keyword to search to avoid over-constraint
        const mainKeyword = keywords[Math.floor(Math.random() * keywords.length)];
        console.log(`Searching with main keyword: "${mainKeyword}"`);

        const images = await this.searcher.search([mainKeyword]);
        if (images.length === 0) {
            throw new Error("No images found for keywords: " + keywords.join(', '));
        }

        // Simple selection: Random one from the results
        const selectedImage = images[Math.floor(Math.random() * images.length)];
        console.log(`Selected image: ${selectedImage.title} (${selectedImage.source})`);

        // 3. Generate Text based on Image
        const text = await this.generateText(selectedImage.title, keywords);

        return {
            text,
            imageUrl: selectedImage.url,
            imageTitle: selectedImage.title,
            imageSource: selectedImage.source,
            imageAuthor: selectedImage.author,
            imageLicense: selectedImage.license
        };
    }

    private async generateKeywords(): Promise<string[]> {
        const prompt = `
あなたは「ジョージ」というバーの「サイレントエディター」です。
世界観：静寂、古代、歴史、未解読、時間、記録、星、夜。
目的：パブリックドメインの画像を検索するための「英語の検索キーワード」を5つ生成してください。

条件：
- 具体的すぎる情景は避ける（人物のアップなど）
- 「静けさ」や「時間」を感じさせるもの、人工物と自然の境界、遺跡、図版など
- JSON配列形式で出力してください ["keyword1", "keyword2", ...]
- 余計な説明は一切不要です。
        `;

        const message = await this.anthropic.messages.create({
            model: "claude-sonnet-4-5-20250929",
            max_tokens: 100,
            messages: [{ role: "user", content: prompt }]
        });

        // Extract text safely
        const contentBlock = message.content[0];
        const responseText = contentBlock.type === 'text' ? contentBlock.text : "";

        try {
            const matches = responseText.match(/\[.*\]/s);
            if (matches) {
                return JSON.parse(matches[0]);
            }
            return ["ancient ruins", "star map", "old manuscript", "stone texture", "night sky"];
        } catch (e) {
            console.error("Failed to parse keywords:", e);
            return ["ancient", "silence", "time", "ruins"];
        }
    }

    private async generateText(imageTitle: string, keywords: string[]): Promise<string> {
        const prompt = `
あなたは「ジョージ」というバーの「サイレントエディター」です。
目の前にある「1枚の画像（${imageTitle}, キーワード: ${keywords.join(', ')}）」に添える、
【極めて短く、静かな日本語のテキスト】を生成してください。

ルール：
- **最大2行**
- 誰かへのアドバイスやメッセージ禁止
- 感情を煽らない
- 意味を完結させない（余白を残す）
- ハッシュタグ禁止
- 「です・ます」禁止。体言止めや独り言のような口調。
- 例：「神託が与えられなかった日も、記録には残されている。」「星は未来を語らない。夜の長さだけを、正確に測っていた。」

出力のみを行ってください。
        `;

        const message = await this.anthropic.messages.create({
            model: "claude-sonnet-4-5-20250929",
            max_tokens: 150,
            messages: [{ role: "user", content: prompt }]
        });

        const contentBlock = message.content[0];
        return contentBlock.type === 'text' ? contentBlock.text.trim() : "";
    }
}
