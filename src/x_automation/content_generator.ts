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
あなたは「George’s Bar」の語り手です。
X（旧Twitter）に投稿する短文を1本生成してください。

前提：
・広告、宣伝、自己啓発に見えないこと
・占いっぽさを出しすぎないこと
・行動を促さないこと
・答えや結論を示さないこと
・落ち着いた、大人向けのトーン

重要（Xのスパム回避ルール）：
以下の表現・構文は使わないでください。
・「あとで」「今すぐ」
・「読み返す」「保存」
・「気づく」「変わる」
・「答え」「真実」「覚醒」
・「〜することで」「〜はずだ」
・「〜するのは心地よい」
・「耳を傾ける」
・「内なる〜」
・未来を断定する言い回し
・自己啓発や占いテンプレに見える定型文

文章ルール：
・全体で4〜6行以内
・断定しない
・問いかけは入れない
・比喩は控えめ
・人間が書いたように少し素朴でよい
・「削る＝弱くする」を意識する（能動的なアクションより、静かな観察を優先）
・カードの絵柄を具体的に描写しない（「女性」「人物」等）。抽象的な「光」「空気」等の印象で語る。
・生き方や教訓を語らない。「〜なようだ」「〜にも見える」といった観察の体裁にとどめる。
・未来や道筋を示さない。余韻を残して終わる。

構成：
1行目：今日のカード：[カード名]
2行目：（空行）
3行目〜：今の状態を“観察”する文章（2〜3行程度、適宜改行を入れる）
（空行）
最後：
George's Bar
https://georges-bar.netlify.app/

※URLの前で改行し、署名とURLは別々の行にする。

理想的な文例：
今の状態を、ただ静かに眺めるようなトーンで。

（例）
静かな水面に、
やわらかな光が広がっています。

強さと穏やかさが、
同時にそこにあるようにも見えます。

文末は穏やかに終えること。

出力は日本語のみ。
絵文字、ハッシュタグ、記号装飾は使わない。
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
