import { PsychologyTestGenerator } from '../x_content/psychology_test_generator';
import { XClient } from '../x_automation/x_client';
import { postToNote } from '../note_automation/note_client';
import { TwitterApi } from 'twitter-api-v2';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';
import { createWriteStream } from 'fs';
import dotenv from 'dotenv';
dotenv.config();

// Ensure output dir
const outputDir = path.resolve(__dirname, '../../generated/psych_test');
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

async function downloadImage(url: string, filepath: string) {
    const response = await axios({
        url,
        method: 'GET',
        responseType: 'stream',
        headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36'
        }
    });
    await pipeline(response.data, createWriteStream(filepath));
    return filepath;
}

interface PostLog {
    id: string;
    timestamp: string;
    theme: string;
    card: string;
    content: {
        question: string;
        options: string[];
    };
    output: {
        tweetId?: string;
        noteUrl?: string;
        imagePath: string;
    };
    metrics?: {
        likes?: number;
        impressions?: number;
        clicks?: number;
    }
}

async function logPostExecution(data: PostLog) {
    const logDir = path.resolve(__dirname, '../../data');
    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
    }
    const logFile = path.join(logDir, 'post_history.json');

    let history: PostLog[] = [];
    if (fs.existsSync(logFile)) {
        try {
            const content = fs.readFileSync(logFile, 'utf-8');
            history = JSON.parse(content);
        } catch (e) {
            console.error("Failed to read history file, starting new.", e);
        }
    }

    history.push(data);
    fs.writeFileSync(logFile, JSON.stringify(history, null, 2));
    console.log(`\n[LOG] Execution logged to ${logFile}`);
}

function analyzeBestTheme(): string | undefined {
    const logPath = path.resolve(__dirname, '../../data/post_history.json');
    if (!fs.existsSync(logPath)) return undefined;

    try {
        const history: PostLog[] = JSON.parse(fs.readFileSync(logPath, 'utf-8'));
        const relevantPosts = history.filter(h => h.metrics && h.metrics.impressions !== undefined);

        if (relevantPosts.length === 0) return undefined;

        const themeStats: { [theme: string]: { totalImp: number, count: number } } = {};

        relevantPosts.forEach(p => {
            if (!themeStats[p.theme]) {
                themeStats[p.theme] = { totalImp: 0, count: 0 };
            }
            themeStats[p.theme].totalImp += (p.metrics?.impressions || 0);
            themeStats[p.theme].count += 1;
        });

        let bestTheme = "";
        let maxAvgImp = -1;

        for (const [theme, stats] of Object.entries(themeStats)) {
            const avg = stats.totalImp / stats.count;
            if (avg > maxAvgImp) {
                maxAvgImp = avg;
                bestTheme = theme;
            }
        }

        console.log(`[Analysis] Best Theme: ${bestTheme} (Avg Imp: ${maxAvgImp.toFixed(1)})`);
        return bestTheme;
    } catch (e) {
        console.error("Failed to analyze history:", e);
        return undefined;
    }
}

async function main() {
    console.log(`Starting Toxic Psychology Test [Mode: Tarot Only]...`);

    const bestTheme = analyzeBestTheme();
    const generator = new PsychologyTestGenerator();
    const result = await generator.generateTest(bestTheme);

    console.log("--- Content Generated ---");
    console.log(`Image: ${result.imageTitle}`);
    console.log(`Question: ${result.questionText}`);
    console.log("Options:", JSON.stringify(result.options, null, 2));
    console.log("Exposure Truth:", result.exposureTruth);

    // 1. Prepare Image
    const imagePath = path.join(outputDir, `psych_${Date.now()}.jpg`);
    await downloadImage(result.imageUrl, imagePath);
    console.log(`Image downloaded to ${imagePath}`);

    // 2. Post to Note (First to get URL)
    let noteUrl = "https://note.com/george_tarot"; // Fallback URL
    const shouldPost = process.argv.includes('--post');

    if (!shouldPost) {
        console.log("\n[DRY RUN] Skipping Note Post. Use --post to actuate.");
    } else {
        try {
            console.log("\n--- Posting to Note ---");

            // タイトル型をランダム選択（刺激的なものに変更）
            const titlePatterns = [
                `「這い上がれない人」の共通点、教えてやろうか`,
                `【全員に刺さる】この診断、どれを選んでも君の本質は同じだった`,
                `【閲覧注意】診断結果の"その先"に本当の答えがある`,
                `${result.imageTitle}を見た瞬間に、君の弱みは暴かれていた`,
                `【毒舌診断】A/B/C、どれを選んでも君が求めているのは同じだ`,
                `最後まで読める人だけ、本当の自分に気づける診断`
            ];
            const noteTitle = titlePatterns[Math.floor(Math.random() * titlePatterns.length)];
            console.log(`[Note Title]: ${noteTitle}`);

            // フック型をランダム選択（共感型に変更）
            const hookPatterns = [
                `この診断、最後まで読める人は少ない。\n途中で画面を閉じたくなったら、それが君の限界だ。`,
                `「私はどれだろう？」と考えた時点で、もう君の心理は半分バレている。\n最後まで読んで、答え合わせをしてくれ。`,
                `A、B、C。\n君はどれかを選ぶ。そして結果を見て、納得するだろう。\n「当たってる」と。\n\nだが、この診断の本当の狙いは、その先にある。`,
                `夜中にこれを読んでいる君へ。\n今日は少し、自分に正直になってみないか。`,
                `「自分のことは自分がわかってる」\nそう思っている人ほど、この診断で足元をすくわれる。`
            ];
            const hookText = hookPatterns[Math.floor(Math.random() * hookPatterns.length)];

            // ==== 日替わりテンプレート構造 ====
            // 3種類のテンプレートからランダム選択
            const templateType = Math.floor(Math.random() * 3);
            console.log(`[Template Type]: ${['スタンダード型', 'エッセイ型', '挑発型'][templateType]}`);

            let noteBody: string;

            if (templateType === 0) {
                // ====== テンプレートA: スタンダード型 (従来構造) ======
                noteBody = `
${hookText}


━━━━━━━━━━━━━━━━━━━━

深夜の毒舌バー「George's Bar」のマスター、ジョージだ。

今日は一枚の絵画から、君の心の奥底にある「見たくない本性」を暴く。


■ この絵のどこに目がいった？

${result.questionText}

A: ${result.options[0].feature}
B: ${result.options[1].feature}
C: ${result.options[2].feature}


━━━━━━━━━━━━━━━━━━━━


【毒舌診断結果】

▼ A: 「${result.options[0].feature}」→ ${result.options[0].diagnosis}
${result.options[0].detailed_diagnosis}

▼ B: 「${result.options[1].feature}」→ ${result.options[1].diagnosis}
${result.options[1].detailed_diagnosis}

▼ C: 「${result.options[2].feature}」→ ${result.options[2].diagnosis}
${result.options[2].detailed_diagnosis}


━━━━━━━━━━━━━━━━━━━━


【暴露】

${result.exposureTruth}


━━━━━━━━━━━━━━━━━━━━

共犯者を増やそう。♡スキ と シェア で、仲間を集めてくれ。

▶︎ LINEで続きを読む → https://georges-bar.netlify.app/

#心理テスト #深層心理 #毒舌診断 #30代
                `.trim();

            } else if (templateType === 1) {
                // ====== テンプレートB: エッセイ型 (物語調) ======
                noteBody = `
深夜2時。

また眠れない夜だろう？

スマホを開いて、誰かのSNSを見て、また閉じて。
「私だけ置いていかれてる気がする」——そんな夜だ。

大丈夫。今日の診断は、そんな君のためにある。


━━━━━━━━━━━━━━━━━━━━


${result.questionText}

この絵を見て、最初に目が行った場所を覚えておいてくれ。

A: ${result.options[0].feature}
B: ${result.options[1].feature}
C: ${result.options[2].feature}


━━━━━━━━━━━━━━━━━━━━


Aを選んだ君へ。

${result.options[0].diagnosis}

${result.options[0].detailed_diagnosis}


Bを選んだ君へ。

${result.options[1].diagnosis}

${result.options[1].detailed_diagnosis}


Cを選んだ君へ。

${result.options[2].diagnosis}

${result.options[2].detailed_diagnosis}


━━━━━━━━━━━━━━━━━━━━


でもな、ここで終わりじゃない。

${result.exposureTruth}


━━━━━━━━━━━━━━━━━━━━


これを読んでいる時点で、君はもう一歩踏み出している。

同じような夜を過ごしている誰かに、この診断を渡してくれ。

▶︎ LINEで深夜相談 → https://georges-bar.netlify.app/

#深夜の独り言 #心理テスト #眠れない夜に
                `.trim();

            } else {
                // ====== テンプレートC: 挑発型 (短く切れ味重視) ======
                noteBody = `
逃げるなよ。

最後まで読めたら、君の勝ちだ。


━━━━━━━━━━━━━━━━━━━━


${result.questionText}

A: ${result.options[0].feature}
B: ${result.options[1].feature}
C: ${result.options[2].feature}


━━━━━━━━━━━━━━━━━━━━


【A】${result.options[0].diagnosis}
${result.options[0].detailed_diagnosis}

【B】${result.options[1].diagnosis}
${result.options[1].detailed_diagnosis}

【C】${result.options[2].diagnosis}
${result.options[2].detailed_diagnosis}


━━━━━━━━━━━━━━━━━━━━


【最後の一撃】

${result.exposureTruth}


━━━━━━━━━━━━━━━━━━━━


読み終えた君へ。

逃げなかった。それだけで十分だ。

次は誰かにこの診断を押し付けてやれ。

▶︎ LINE → https://georges-bar.netlify.app/

#毒舌診断 #心理テスト #タロット
                `.trim();
            }

            // Note Posting Logic
            console.log("Logging into Note...");
            await postToNote({
                title: noteTitle,
                body: noteBody,
                headerImagePath: imagePath,
                bodyImagePath: imagePath
            });
            console.log("Note Posting Completed!");

        } catch (e) {
            console.error("Note Posting Failed:", e);
        }
    }

    // check if we really post to X
    if (!shouldPost) {
        console.log("DRY RUN: Skipping X post. Use --post to actuate.");
        await logPostExecution({
            id: Date.now().toString(),
            timestamp: new Date().toISOString(),
            theme: result.theme,
            card: result.imageTitle,
            content: {
                question: result.questionText,
                options: result.options.map(o => o.feature)
            },
            output: {
                tweetId: "DRY_RUN",
                noteUrl: "DRY_RUN",
                imagePath: imagePath
            }
        });
        return;
    }

    // 3. X Login
    if (!process.env.X_API_KEY || !process.env.X_API_SECRET || !process.env.X_ACCESS_TOKEN || !process.env.X_ACCESS_SECRET) {
        throw new Error("Missing X credentials");
    }
    const client = new TwitterApi({
        appKey: process.env.X_API_KEY,
        appSecret: process.env.X_API_SECRET,
        accessToken: process.env.X_ACCESS_TOKEN,
        accessSecret: process.env.X_ACCESS_SECRET,
    });

    try {
        console.log("Uploading media...");
        const mediaId = await client.v1.uploadMedia(imagePath);
        console.log(`Media uploaded. ID: ${mediaId}`);

        // 4. Compose Tweet 1 (Question) - タイトル型ランダム化
        const tweetTitlePatterns = [
            "【毒舌タロット診断】",
            "【閲覧注意】この絵のどこを見た？",
            "【30代女性の87%が当たった】",
            "【深層心理テスト】",
            "【図星注意】この絵を見て…"
        ];
        const titlePrefix = tweetTitlePatterns[Math.floor(Math.random() * tweetTitlePatterns.length)];

        const tweet1Text = `
${titlePrefix}

${result.questionText}

A: ${result.options[0].feature}
B: ${result.options[1].feature}
C: ${result.options[2].feature}

👇 結果はリプ欄！当たったらRT🔄
#心理テスト #タロット占い #深層心理 #毒舌診断 #30代
        `.trim();

        console.log("Posting Tweet 1...");
        const tweet1 = await client.v2.tweet(tweet1Text, { media: { media_ids: [mediaId] } });
        console.log(`Tweet 1 posted! ID: ${tweet1.data.id}`);

        // 5. Threaded Replies
        let lastTweetId = tweet1.data.id;

        const options = ['A', 'B', 'C'];
        for (let i = 0; i < 3; i++) {
            const opt = result.options[i];
            const replyText = `
【診断結果: ${options[i]}】
「${opt.feature}」を選んだあなた

→ ${opt.diagnosis}
            `.trim();

            console.log(`Posting Reply ${i + 1}/3...`);
            const reply = await client.v2.reply(replyText, lastTweetId);
            lastTweetId = reply.data.id;
            await new Promise(r => setTimeout(r, 1000));
        }

        const closingText = `
当たってましたか？

「なぜ、私はそこを見てしまったのか？」
「この絵が持つ本当の意味とは？」

この診断の心理学的根拠と、もっともらしい解説はこちら。
図星だった人はRTしてね。

▼ 解説（Note）
${noteUrl}

#George
        `.trim();
        await client.v2.reply(closingText, lastTweetId);
        console.log("Thread completed successfully.");

        await logPostExecution({
            id: Date.now().toString(),
            timestamp: new Date().toISOString(),
            theme: result.theme,
            card: result.imageTitle,
            content: {
                question: result.questionText,
                options: result.options.map(o => o.feature)
            },
            output: {
                tweetId: tweet1.data.id,
                noteUrl: noteUrl, // Might be default if Note post failed or not returned
                imagePath: imagePath
            }
        });

    } catch (e) {
        console.error("X Posting Failed:", e);
    }
}

main().catch(console.error);
