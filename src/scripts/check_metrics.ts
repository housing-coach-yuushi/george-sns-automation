import fs from 'fs';
import path from 'path';
import { XClient } from '../x_automation/x_client';

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
        retweets?: number;
        impressions?: number;
        checkedAt?: string;
    }
}

async function main() {
    console.log("============================================");
    console.log("   GEORGE METRICS ANALYZER (Check Phase)    ");
    console.log("============================================");

    const logPath = path.resolve(__dirname, '../../data/post_history.json');
    if (!fs.existsSync(logPath)) {
        console.error("No history file found at:", logPath);
        return;
    }

    const history: PostLog[] = JSON.parse(fs.readFileSync(logPath, 'utf-8'));
    console.log(`Loaded ${history.length} entries from history.`);

    // Filter relevant tweets
    // Exclude DRY_RUN and maybe very old tweets if needed (omitted for now)
    const targetEntries = history.filter(h =>
        h.output.tweetId && h.output.tweetId !== "DRY_RUN"
    );

    if (targetEntries.length === 0) {
        console.log("No valid tweets found to check (mostly DRY_RUN?).");
        return;
    }

    console.log(`Checking metrics for ${targetEntries.length} tweets...`);

    const client = new XClient();
    const tweetIds = targetEntries.map(h => h.output.tweetId!);

    // Chunk requests if needed (API limit usually 100 per request)
    // For now simple implementation assuming < 100
    const metricsData = await client.getTweetMetrics(tweetIds);
    console.log(`Retrieved metrics for ${metricsData.length} tweets.`);

    let updatedCount = 0;

    for (const data of metricsData) {
        // data matches a tweet
        const entry = history.find(h => h.output.tweetId === data.id);
        if (entry) {
            const m = data.public_metrics;
            entry.metrics = {
                likes: m.like_count || 0,
                retweets: m.retweet_count || 0,
                impressions: m.impression_count || 0,
                checkedAt: new Date().toISOString()
            };
            updatedCount++;
            console.log(`[${entry.theme}] Likes: ${m.like_count}, RT: ${m.retweet_count}, Imp: ${m.impression_count}`);
        }
    }

    // Save back to file
    fs.writeFileSync(logPath, JSON.stringify(history, null, 2));
    console.log(`\nUpdated metrics for ${updatedCount} entries.`);
    console.log("Saved to post_history.json");
}

main().catch(console.error);
