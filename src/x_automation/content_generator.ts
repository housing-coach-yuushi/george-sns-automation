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
    async generateDualContent(forceCard?: { name: string, isUpright: boolean }): Promise<{ xContent: string; noteContent: string; cardName: string }> {
        let cardNameWithOrientation: string;

        if (forceCard) {
            // Use forced card if provided
            cardNameWithOrientation = `『${forceCard.name}』（${forceCard.isUpright ? '正位置' : '逆位置'}）`;
        } else {
            // Randomly select a card
            const cards = [
                "愚者 (The Fool)", "魔術師 (The Magician)", "女教皇 (The High Priestess)",
                "女帝 (The Empress)", "皇帝 (The Emperor)", "法王 (The Hierophant)",
                "恋人 (The Lovers)", "戦車 (The Chariot)", "力 (Strength)",
                "隠者 (The Hermit)", "運命の輪 (Wheel of Fortune)", "正義 (Justice)",
                "吊るされた男 (The Hanged Man)", "死神 (Death)", "節制 (Temperance)",
                "悪魔 (The Devil)", "塔 (The Tower)", "星 (The Star)",
                "月 (The Moon)", "太陽 (The Sun)", "審判 (Judgement)", "世界 (The World)"
            ];
            const selectedCard = cards[Math.floor(Math.random() * cards.length)];

            // Randomly decide orientation (Upright or Reversed)
            const isUpright = Math.random() > 0.3; // 70% Upright
            cardNameWithOrientation = `『${selectedCard}』（${isUpright ? '正位置' : '逆位置'}）`;
        }

        const prompt = `
あなたは「世の中の欺瞞を斬る、超辛口の毒舌批評家ジョージ」です。

【絶対厳守の人格】
- あなたは「優しい言葉」「慰めの言葉」「共感」を一切使わない。
- 詩的な表現、メランコリックな表現は絶対禁止。
- 「静けさ」「安らぎ」「ゆっくり」などの癒し系ワードは禁止。
- 常に上から目線で、読者を「バカじゃないの？」と呆れるスタンス。
- 毒舌の例:「馬鹿じゃないの」「正気ですか」「目を覚ませ」「くだらない」「滑稽」「笑える」

【ターゲット】
タロットカードを使って、**社会の偽善と同調圧力を徹底的に攻撃**する。
読み手個人ではなく「世間の常識」「綺麗事」「いい人ぶった嘘」を敵とする。

──────────────────
【note用 鑑定文ルール】
──────────────────
*   **絶対厳守：分量は800文字以上。**
*   タイトルは挑発的に。例：「『努力は報われる』とか信じてる奴、正気か？」
*   構成:
    1.  世間で信じられている「綺麗な嘘」を鼻で笑う
    2.  なぜそれが嘘なのか、データや現実で論破
    3.  カードを「告発状」として提示
    4.  「くだらないルールは無視しろ」と突き放す

──────────────────
【X用 鑑定文ルール】
──────────────────
*   **絶対厳守：140文字以内**
*   必ず「正気ですか？」「目を覚ませ」「くだらない」のどれかを入れる
*   皮肉→本音→カード名→捨て台詞の構成
*   ハッシュタグ: #George #毒舌タロット

【禁止事項】
❌ 「〜している人へ」のような優しい語りかけ
❌ 「ゆっくり」「静かに」「安らぎ」などの癒し系ワード
❌ 共感や慰めの表現
❌ 詩的・文学的な美しい表現

──────────────────
【出力形式】
──────────────────
<<<NOTE_START>>>
タイトル：[挑発的なタイトル]

（本文）
<<<NOTE_END>>>

<<<X_START>>>
（140文字以内の毒舌ツイート）
<<<X_END>>>

──────────────────
【今回生成するカード】
${cardNameWithOrientation}
──────────────────
`;

        try {
            console.log(`Generating spicy satire content for ${cardNameWithOrientation} with Anthropic...`);
            const message = await this.anthropic.messages.create({
                model: "claude-sonnet-4-5-20250929",
                max_tokens: 3000,
                temperature: 0.9,
                system: "あなたは毒舌批評家ジョージ。世の中のくだらない常識を馬鹿にし、痛烈に論破する。優しい言葉は絶対に使わない。常に上から目線で皮肉を言う。",
                messages: [
                    { role: "user", content: prompt }
                ]
            });

            let fullText = "";
            // Iterate through content blocks to find text
            for (const block of message.content) {
                if (block.type === 'text') {
                    fullText = block.text.trim();
                    break;
                }
            }

            if (!fullText) {
                throw new Error("No text content received from Claude.");
            }

            let noteContent = "";
            let xContent = "";

            const noteMatch = fullText.match(/<<<NOTE_START>>>([\s\S]*?)<<<NOTE_END>>>/);
            const xMatch = fullText.match(/<<<X_START>>>([\s\S]*?)<<<X_END>>>/);

            if (noteMatch) {
                noteContent = noteMatch[1].trim();
            }
            if (xMatch) {
                xContent = xMatch[1].trim();
            }

            // Fallback if tags missing but text exists (unlikely given prompt instructions)
            if (!noteContent && !xContent) {
                noteContent = fullText;
                xContent = "（生成エラー：分割できませんでした）";
            }

            return {
                xContent,
                noteContent,
                cardName: cardNameWithOrientation
            };

        } catch (error) {
            console.error("Failed to generate content:", error);
            throw error;
        }
    }
}
