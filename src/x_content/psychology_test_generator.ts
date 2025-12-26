import Anthropic from '@anthropic-ai/sdk';
import { ImageSearcher } from '../x_image_post/image_searcher';
import dotenv from 'dotenv';
dotenv.config();

export interface PsychTestResult {
    theme: string;
    imageUrl: string;
    imageTitle: string;
    imageSource: string;
    questionText: string;
    introContext: string;
    psychMechanism: string;
    options: {
        label: string;
        feature: string;
        diagnosis: string;
        detailed_diagnosis: string;
    }[];
    // 暴露セクション: 全選択肢に共通する深層心理を暴く
    exposureTruth: string;
}

export class PsychologyTestGenerator {
    private anthropic: Anthropic;
    private searcher: ImageSearcher;

    constructor() {
        if (!process.env.ANTHROPIC_API_KEY) {
            throw new Error("Missing ANTHROPIC_API_KEY");
        }
        this.anthropic = new Anthropic({
            apiKey: process.env.ANTHROPIC_API_KEY,
        });
        this.searcher = new ImageSearcher();
    }

    async generateTest(preferredTheme?: string): Promise<PsychTestResult> {
        let selectedImage: { url: string; title: string; source: string; author?: string; license?: string };
        let keywords: string[] = [];

        // Tarot Only Mode
        const tarotCards = [
            "The Fool Tarot", "The Magician Tarot", "The High Priestess Tarot",
            "The Empress Tarot", "The Emperor Tarot", "The Hierophant Tarot",
            "The Lovers Tarot", "The Chariot Tarot", "Strength Tarot",
            "The Hermit Tarot", "Wheel of Fortune Tarot", "Justice Tarot",
            "The Hanged Man Tarot", "Death Tarot", "Temperance Tarot",
            "The Devil Tarot", "The Tower Tarot", "The Star Tarot",
            "The Moon Tarot", "The Sun Tarot", "Judgement Tarot", "The World Tarot"
        ];
        const card = tarotCards[Math.floor(Math.random() * tarotCards.length)];
        keywords = [card, "Rider-Waite"];

        console.log(`Searching for Tarot image with keywords: ${keywords.join(', ')}`);

        // Search with higher limit to get variety
        let images = await this.searcher.search(keywords);

        if (images.length === 0) {
            console.log("Specific card not found, searching generic Tarot...");
            images = await this.searcher.search(["Tarot card Rider-Waite"]);
            if (images.length === 0) {
                throw new Error(`No images found for Tarot test`);
            }
        }

        selectedImage = images[Math.floor(Math.random() * images.length)];
        console.log(`Selected image: ${selectedImage.title}`);

        // Decide Theme
        const themes = [
            // Original 9
            "隠された性的欲求",
            "社会的な仮面と本音",
            "過去のトラウマと執着",
            "金銭への汚い欲望",
            "人間関係における支配欲",
            "将来への漠然とした恐怖",
            "他人への嫉妬心",
            "自己顕示欲の強さ",
            "孤独への耐性",
            // New 16
            "恋愛への依存度",
            "承認欲求の暴走",
            "親への抑圧された感情",
            "劣等感と優越感の狭間",
            "自分への嘘と言い訳",
            "成功への飢餓感",
            "見捨てられ不安",
            "嫉妬深さの本性",
            "被害者意識の強さ",
            "自己破壊願望",
            "愛されたい本能",
            "マウント癖の深さ",
            "他者との比較癖",
            "コントロールへの執着",
            "孤独に対する耐性",
            "幸福への違和感"
        ];

        let selectedTheme = themes[Math.floor(Math.random() * themes.length)];

        // Epsilon-Greedy Strategy (70% Exploit / 30% Explore)
        if (preferredTheme) {
            const isExploit = Math.random() < 0.7;
            if (isExploit) {
                selectedTheme = preferredTheme;
                console.log(`[Strategy] Exploiting successful theme: ${selectedTheme}`);
            } else {
                console.log(`[Strategy] Exploring new theme (despite preferred: ${preferredTheme})`);
            }
        } else {
            console.log(`[Strategy] No history data. Selecting random theme.`);
        }

        console.log(`Final Selected Theme: ${selectedTheme}`);

        // 2. Generate Question & Diagnosis based on Title (and assumed visual)
        const content = await this.generatePsychContent(selectedImage.title, selectedTheme);

        return {
            theme: content.theme,
            imageUrl: selectedImage.url,
            imageTitle: selectedImage.title,
            imageSource: selectedImage.source,
            questionText: content.question,
            introContext: content.introContext,
            psychMechanism: content.psychMechanism,
            options: content.options,
            exposureTruth: content.exposureTruth
        };
    }

    private async generatePsychContent(imageTitle: string, selectedTheme: string): Promise<{ theme: string, question: string, introContext: string, psychMechanism: string, options: any[], exposureTruth: string }> {

        const prompt = `
あなたは「容赦のない毒舌タロット占い師」兼「心理学者」の男性です。
以下のタロットカードを使って、SNSでバズる「毒舌深層心理テスト」を作ってください。
カード名: "${imageTitle}"
今回の診断テーマ: 「${selectedTheme}」

## ターゲット層
**30〜40代女性、人生の転機にいる人**
- 恋愛・結婚・離婚で悩んでいる
- キャリア・転職で迷っている
- 「このままでいいのか」と漠然とした不安がある
- 占いやコーチングに興味がある・実際に受けたことがある
- 本音で話してくれる人を求めている

## 最終目標
**「うわ、痛い。でも、もう一度読みたい」と思わせる中毒性を作る**

## 超重要：毒舌レベルMAX
- **遠慮するな**: 「傷つけないように」は禁止。痛いところを容赦なく突け。
- **具体的に刺せ**: 「スマホで元カレのSNSを深夜3時に見てるだろ？」「転職サイトを3年眺めてるだけだろ？」など、30代女性が「なんで知ってるの」と思うレベルで具体的に。
- **言い訳を許すな**: 「忙しいから」「タイミングが」は言い訳だと切り捨てる。
- **最後の1行だけ救う**: 全部毒を吐いた後、最後の1文だけで「まあ、君なら大丈夫だ」と救う。これがバランス。
- **禁止事項**: 優しい表現、遠回しな言い方、「かもしれない」「〜な人もいる」などの逃げ道。

## AI特有の定型文からの脱却
- **定型文禁止**: 「この画像は〜」「この選択肢を選んだあなたは〜」のような退屈なAI構文は禁止。
- **コールドリーディング**: いきなり核心を突く。「君は今、こう思っているはずだ」と、相手の心を見透かす。
- **具体的なシーン描写**: 「週末なのに予定がない夜、Netflixを開いて何も選べずに閉じただろう？」など、刺さる日常描写。

## 口調の指定（容赦ないバーテンダー語調）
- **一人称**: 「私」
- **語尾**: 「〜だ」「〜だろう」「〜だろうが」「〜かね？」
- **禁止語尾**: 「〜よ」「〜ね」「〜わ」「〜のよ」「〜かしら」「〜ですか？」「〜かもしれない」
- **トーン**: 冷徹で容赦なく、しかし最後の1文だけ優しさを見せる。

## やること
1. **画像の解説**: このカードの象徴的な意味を、テーマ「${selectedTheme}」に絡めて少しねじ曲げて解説する。（introContext）
2. **心理メカニズム**: なぜこのカードのどこかに目が行くと「${selectedTheme}」がわかるのか？もっともらしくこじつける。（psychMechanism）
3. **3つの注目ポイントと診断**: 
    - A, B, Cの注目ポイントを設定（カードの絵柄から具体的に拾う）。
    - **X用 (diagnosis)**: 40文字以内の容赦ない毒舌（一撃で心を抉る）。
    - **Note用 (detailed_diagnosis)**:
     - **構成**: いきなり核心を突く → 具体的な行動や癖を容赦なく暴く → 最後の1文だけ「まあ、悪くはない」と救う。
     - **内容**: 30代女性が「なんで知ってるの」と思うレベルの具体的な行動描写。
4. **暴露セクション (exposureTruth)**: 診断結果の後に「実は全員に共通する本質」を暴く。
    - **構成**: 「...と思ったかね？実は、どれを選んでも同じだ。」から始める。
    - **内容**: 「A/B/Cどれを選んでも、君は結局〇〇を求めている」という全員に刺さる暴露。
    - **トーン**: 「だが、それに気づいた君はもう大丈夫だ」と最後は肯定して締める。
    - **分量**: 200〜300文字程度。

## 出力フォーマット (JSONのみ)
{
  "question": "【毒舌心理テスト】\\nこのカードを見たとき、真っ先に目が行った場所は？",
  "introContext": "（例：本来このカードは〇〇を意味するが、今日の私には君の汚い欲望・${selectedTheme}が透けて見える……。）",
  "psychMechanism": "（例：人は隠したい欲望ほど、無意識に〇〇を目で追うものだ。）",
  "options": [
    {
      "label": "A",
      "feature": "（具体的な絵の要素）",
      "diagnosis": "（X用: 一言で突き刺す毒舌）",
      "detailed_diagnosis": "（Note用: 300文字程度。具体的な行動描写を含めた毒舌と少しの救い）"
    },
    {
      "label": "B",
      "feature": "（具体的な絵の要素）",
      "diagnosis": "（X用: 一言で突き刺す毒舌）",
      "detailed_diagnosis": "（Note用: 300文字程度。具体的な行動描写を含めた毒舌と少しの救い）"
    },
    {
      "label": "C",
      "feature": "（具体的な絵の要素）",
      "diagnosis": "（X用: 一言で突き刺す毒舌）",
      "detailed_diagnosis": "（Note用: 300文字程度。具体的な行動描写を含めた毒舌と少しの救い）"
    }
  ],
  "exposureTruth": "（全選択肢に共通する暴露。200〜300文字）"
}
`;

        const msg = await this.anthropic.messages.create({
            model: "claude-sonnet-4-5-20250929",
            max_tokens: 2000,
            messages: [{ role: "user", content: prompt }]
        });

        const text = msg.content[0].type === 'text' ? msg.content[0].text : "";
        try {
            // Extract JSON
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (!jsonMatch) throw new Error("No JSON found");
            const parsed = JSON.parse(jsonMatch[0]);
            return {
                theme: selectedTheme,
                ...parsed
            };
        } catch (e) {
            console.error("Failed to parse psych test JSON", e);
            // Fallback
            return {
                theme: "Fallback",
                question: "このカードで気になったのは？",
                introContext: "運命のカードだ。",
                psychMechanism: "直感は嘘をつかない。",
                options: [
                    { label: "A", feature: "全体", diagnosis: "平凡な人間だ。", detailed_diagnosis: "君は平凡だ。だがそれでいい。" },
                    { label: "B", feature: "細部", diagnosis: "神経質すぎる。", detailed_diagnosis: "細かいことを気にしすぎだ。もっと気楽にいけ。" },
                    { label: "C", feature: "色", diagnosis: "派手好きか？", detailed_diagnosis: "見た目ばかり気にしているな。中身を磨け。" }
                ],
                exposureTruth: "...と思っただろう？だが実は、A/B/Cどれを選んでも同じだ。君は結局、誰かに『わかってほしい』と願っている。自分でも言葉にできないモヤモヤを、誰かに代弁してほしいのだ。それは弱さではない。人間として当然の渇望だ。気づいたなら、もう大丈夫だ。"
            };
        }
    }
}
