import { ContentGenerator } from './content_generator';
import { XClient } from './x_client';
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
    console.log("Starting Daily X Automation...");

    try {
        // 1. Generate Content
        const generator = new ContentGenerator();
        const content = await generator.generateDailyPost();

        console.log("\n--- Generated Content ---");
        console.log(content);
        console.log("-------------------------\n");

        // 2. Post to X
        // Only post if args contains --post
        if (process.argv.includes('--post')) {
            const client = new XClient();
            await client.postTweet(content);
        } else {
            console.log("Dry run complete. Use --post to actually post to X.");
        }

    } catch (error) {
        console.error("Automation failed:", error);
        process.exit(1);
    }
}

main();
