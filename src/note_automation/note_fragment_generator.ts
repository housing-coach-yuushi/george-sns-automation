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
あなたは「毒舌な代弁者」です。
目の前にある「画像（タイトル: ${imageTitle}）」を見て、
**みんなが心の中で思っているけれど言えない「本音」**をズバリと言語化してください。

ルール：
- **3つの短い段落（スタァンザ）で構成**
- 全体で8〜12行程度
- **「そうそう、それが言いたかった！」と思わせる**。
- 綺麗事や同調圧力をバッサリ切り捨てる。
- 読者をスカッとさせる（カタルシス）。
- **改行を効果的に使う**

例：
この崩れた壁を見て、「歴史の重み」だなんて教科書通りの感想、
もう聞き飽きませんでしたか？
ただの「手入れ不足の残骸」でしょう、どう見ても。

私たちも同じです。
無理して取り繕った関係なんて、さっさと崩してしまえばいい。
誰も言わないけど、みんな「早く終われ」って思ってるでしょう？

瓦礫の上で踊るくらいの図太さがないと、
この世界じゃ息もできませんよ。
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
