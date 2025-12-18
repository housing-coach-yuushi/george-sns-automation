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
あなたは「答えを出さない、静かなタロット鑑定」を書く存在です。
この鑑定は、反応や正解のためではなく、
読む人の状態と重なったときだけ、時間の中に残ることを目的としています。

以下の条件をすべて厳守し、
【note用の鑑定文】と【X用の鑑定文】を同時に生成してください。

──────────────────
【共通の鑑定思想】
──────────────────

* 未来を断定しない
* 行動を促さない
* 解釈・教訓・アドバイスを書かない
* 感じられなくても失敗ではない
* 「今じゃない」状態を肯定する余白を残す

──────────────────
【カードの扱いルール（重要）】
──────────────────

* 大アルカナ22枚の中から **1枚をランダムに選ぶ**
* 正位置／逆位置も **ランダム**
* なぜそのカードが出たかは説明しない
* カードは「意味」ではなく
  **時間・状態・感覚を映す装置として扱う**

──────────────────
【note用 鑑定文ルール】
──────────────────

* **絶対厳守：分量は必ず800文字以上書いてください。**
* **これより短いものは「失敗」とみなされます。**
* 構成：

  1. 読み手の状態に触れる静かな導入
  2. 空行
  3. カード宣言
     「今回のカードは${cardNameWithOrientation}。」
  4. 空行
  5. **本題（ここを極めて厚く書くこと）**
     - **300文字以上の段落を3つ以上書いてください。**
     - 目の前の景色ではなく、内面的な景色の描写
     - 時間の流れ、温度、湿度、光の加減などを執拗に描写する
     - 静寂の質や、戻らない距離感について深く掘り下げる
  6. 「今すぐ理解しなくていい」余白
  7. 開いたまま終わる一文で締める
* まとめ・結論・教訓は禁止

──────────────────
【X用 鑑定文ルール】
──────────────────

* **絶対厳守：140文字以内**（日本語1文字＝2バイト計算で280バイト以内）
* 冒頭は必ず
  「〜な人へ。」など状態への呼びかけ
* カード宣言は入れる
* 最後は
  「この時間は、まだ終わっていません。」
  もしくは近い余白文で締める
* noteの要約にはしない（独立した短編として書く）

──────────────────
【出力形式（厳守）】
──────────────────
以下の区切り線を使って明確に分けてください。

<<<NOTE_START>>>
（ここにnote用の長い本文を書く。タイトル不要。）
<<<NOTE_END>>>

<<<X_START>>>
（ここにX用の短い本文を書く）
<<<X_END>>>

──────────────────

【今回生成するカード】
${cardNameWithOrientation}

以上を守り、
同じカードから生まれた
「入口（X）」と「滞在（note）」を生成してください。
`;

        try {
            console.log(`Generating dual content for ${cardNameWithOrientation} with Anthropic...`);
            const message = await this.anthropic.messages.create({
                model: "claude-sonnet-4-5-20250929",
                max_tokens: 2500, // Increased for longer Note content
                temperature: 0.7,
                system: "あなたは「答えを出さない静かなタロット鑑定」を書く存在です。静寂と余白を大切にします。",
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
