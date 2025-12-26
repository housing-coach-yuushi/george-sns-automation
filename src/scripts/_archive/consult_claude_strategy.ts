import { Anthropic } from '@anthropic-ai/sdk';
import dotenv from 'dotenv';
dotenv.config();

async function consultClaude() {
    const anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const prompt = `
あなたはSNSマーケティングとクリエイティブディレクションのプロフェッショナルです。
現在、あるAIキャラクターアカウント（George）の運用に行き詰まっています。

【現状】
- コンセプト: 「静かなバーのマスター」「答えを出さないタロット占い」
- 問題点: インプレッションが1桁。完全に「空気」扱いされている。
- 原因仮説: 「静か」「優しすぎる」「当事者意識を持たせない」ため、タイムラインで埋もれている。

【打開策として提案されている3つのピボット案】

1. **Option A:「鋭利なナイフ（Sharp Knife）」**
   - 戦略: コールドリーディングを駆使し、「あなたは今こうでしょう？」と図星を突く。
   - 狙い: 「なんでわかるの？」という驚きと、悔しさからの拡散。
   - 文体: 冷徹、分析的、ドS。

2. **Option B:「シュールな悪夢（Surreal Horror）」**
   - 戦略: 意味不明な不気味な詩的表現。「溶けた時計の味」など。
   - 狙い: 認知的不協和による足止め。「変なアカウントがある」という認知。
   - 文体: 夢現、デカダン。

3. **Option C:「極超短編（Micro-Fiction）」**
   - 戦略: 占いをやめ、カードを題材にした140文字小説を書く。
   - 狙い: 純粋なコンテンツとしての面白さ勝負。
   - 文体: 物語調。

【依頼】
あなたがこのアカウントのディレクターなら、**どのオプションを採用しますか？**
理由とともに、1つ選んでください。
また、その選んだオプションで、**『愚者（The Fool）』のカードをテーマにしたツイートの具体例（140文字以内）**を作成してください。

※忖度なしで、最も数字（エンゲージメント）が取れると思うものを選んでください。
`;

    console.log("Consulting Claude...");
    const msg = await anthropic.messages.create({
        model: "claude-sonnet-4-5-20250929", // Project-specific model ID
        max_tokens: 1000,
        temperature: 0.7,
        messages: [{ role: "user", content: prompt }]
    });

    console.log("\n--- Claude's Recommendation ---\n");
    // Handle text blocks correctly
    const textContent = msg.content.filter(b => b.type === 'text').map(b => b.text).join('\n');
    console.log(textContent);
}

consultClaude();
