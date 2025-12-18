import { ContentGenerator } from './content_generator';
import { XClient } from './x_client';
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
    console.log("Starting Daily X Automation...");

    try {
        // 1. Generate Dual Content
        const generator = new ContentGenerator();
        const { xContent, noteContent, cardName } = await generator.generateDualContent();

        console.log("\n--- Generated X Content ---");
        console.log(xContent);
        console.log("---------------------------\n");

        // Save for Note automation
        const fs = require('fs');
        const path = require('path');
        const dataDir = path.resolve(__dirname, '../../generated');
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        fs.writeFileSync(path.join(dataDir, 'daily_data.json'), JSON.stringify({
            date: new Date().toISOString(),
            cardName,
            xContent,
            noteContent
        }, null, 2));
        console.log(`Saved daily data to ${path.join(dataDir, 'daily_data.json')}`);

        // 2. Post to X
        // Only post if args contains --post
        if (process.argv.includes('--post')) {
            const client = new XClient();
            await client.postTweet(xContent);
        } else {
            console.log("Dry run complete. Use --post to actually post to X.");
        }

    } catch (error) {
        console.error("Automation failed:", error);
        process.exit(1);
    }
}

main();
