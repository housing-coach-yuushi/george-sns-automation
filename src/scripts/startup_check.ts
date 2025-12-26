import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { notifySlack } from '../utils/slack_notifier';
import dotenv from 'dotenv';
dotenv.config();

interface PostLog {
    id: string;
    timestamp: string;
    theme: string;
    output: {
        tweetId?: string;
    };
}

async function main() {
    console.log("==========================================");
    console.log("   GEORGE: STARTUP CHECK                  ");
    console.log("==========================================");

    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const historyPath = path.resolve(__dirname, '../../data/post_history.json');

    // Check if we already posted today
    let alreadyPostedToday = false;

    if (fs.existsSync(historyPath)) {
        try {
            const history: PostLog[] = JSON.parse(fs.readFileSync(historyPath, 'utf-8'));
            alreadyPostedToday = history.some(entry => {
                const entryDate = entry.timestamp.split('T')[0];
                const isToday = entryDate === today;
                const isActualPost = entry.output.tweetId && entry.output.tweetId !== "DRY_RUN";
                return isToday && isActualPost;
            });
        } catch (e) {
            console.error("Failed to read history:", e);
        }
    }

    if (alreadyPostedToday) {
        console.log(`[✓] Today (${today}) already has a post. Skipping.`);
        return;
    }

    console.log(`[!] No post found for today (${today}). Starting Daily Cycle...`);
    await notifySlack(`起動時チェック: 本日未投稿のため、Daily Cycleを開始します。`);

    try {
        const scriptsDir = __dirname;
        execSync(`npx ts-node ${path.join(scriptsDir, 'daily_cycle.ts')} --post`, { stdio: 'inherit' });
    } catch (error) {
        console.error("Daily Cycle failed:", error);
        await notifySlack(`起動時チェック: Daily Cycle失敗 - ${error}`, true);
    }
}

main().catch(console.error);
