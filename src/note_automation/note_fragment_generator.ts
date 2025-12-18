import Anthropic from '@anthropic-ai/sdk';
import { ImageSearcher } from '../x_image_post/image_searcher';
import dotenv from 'dotenv';
dotenv.config();

export interface NoteFragmentResult {
    title: string;
    body: string;
    imageUrl: string;
    imageTitle: string;
    imageSource: string;
    localImagePath?: string;
}

export class NoteFragmentGenerator {
    private anthropic: Anthropic;
    private searcher: ImageSearcher;
    private titleDictionary = [
        "記録", "空白", "途中", "夜", "距離", "断片", "沈黙", "余白"
    ];

    constructor() {
        if (!process.env.ANTHROPIC_API_KEY) {
            throw new Error("Missing ANTHROPIC_API_KEY in .env");
        }
        this.anthropic = new Anthropic({
            apiKey: process.env.ANTHROPIC_API_KEY,
        });
        this.searcher = new ImageSearcher();
    }

    async generateFragment(): Promise<NoteFragmentResult> {
        // 1. Generate Title (2 random words from dictionary)
        const title = this.generateTitle();

        // 2. Search Image (Keywords: ancient, historical, etc.)
        const searchKeywords = [
            "ancient manuscript", "stone inscription", "ruins", "astrology chart",
            "mysterious symbol", "old map", "archaeological find"
        ];
        const mainKeyword = searchKeywords[Math.floor(Math.random() * searchKeywords.length)];
        console.log(`Searching Note image for: ${mainKeyword}`);

        const images = await this.searcher.search([mainKeyword]);
        if (images.length === 0) {
            throw new Error("No images found for: " + mainKeyword);
        }
        const selectedImage = images[Math.floor(Math.random() * images.length)];

        // 3. Generate (Reduce) Text
        let body = await this.generateReducedText(selectedImage.title);

        // 4. Append Source Info
        // Clean up title for citation
        const cleanTitle = selectedImage.title.replace(/\.(jpg|jpeg|png)$/i, "").trim();
        const citation = `\n\nImage: ${cleanTitle} (${selectedImage.source})`;
        body += citation;

        return {
            title,
            body,
            imageUrl: selectedImage.url,
            imageTitle: selectedImage.title,
            imageSource: selectedImage.source
        };
    }

    private generateTitle(): string {
        // Pick 2 distinct words
        const shuffled = [...this.titleDictionary].sort(() => 0.5 - Math.random());
        return `${shuffled[0]} ${shuffled[1]}`;
    }

    private async generateReducedText(imageTitle: string): Promise<string> {
        const prompt = `
あなたは「Silent Curator」です。
目の前にある「画像（タイトル: ${imageTitle}）」について、
**Note記事としての等身大のテキスト**を生成してください。

ルール：
- **3つの短い段落（スタァンザ）で構成**
- 全体で8〜12行程度
- 説明禁止（読者に委ねる）
- 比喩を過剰にしない
- 感情語禁止
- 結論を作らない
- です・ます禁止（体言止め、独り言）
- **余白（改行）を効果的に使う**

例：
崩れた壁の向こうに、何もなかったことの証明。
風だけが通り抜けていく。

かつて誰かがここで祈り、
あるいは誰かを呪ったのかもしれない。
記録は石に吸い込まれ、沈黙している。

ただ、日付だけが刻まれている。
それ以上の意味は、もうここにはない。
        `;

        const message = await this.anthropic.messages.create({
            model: "claude-sonnet-4-5-20250929",
            max_tokens: 400,
            messages: [{ role: "user", content: prompt }]
        });

        const contentBlock = message.content[0];
        const text = contentBlock.type === 'text' ? contentBlock.text.trim() : "";
        return text;
    }
}
