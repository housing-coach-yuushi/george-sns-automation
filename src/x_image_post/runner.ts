import { FragmentGenerator } from './fragment_generator';
import { XClient } from '../x_automation/x_client';
import axios from 'axios';

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 60 * 1000; // 1 minute

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function runWithRetry() {
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            console.log(`\n=== Attempt ${attempt}/${MAX_RETRIES} ===`);

            // 1. Generate Content (Image URL + Text)
            const generator = new FragmentGenerator();
            console.log("Generating fragment...");
            const fragment = await generator.generateFragment();

            console.log("\n--- Generated Content ---");
            console.log(`Image: ${fragment.imageTitle}`);
            console.log(`URL: ${fragment.imageUrl}`);
            console.log(`Text: ${fragment.text}`);
            console.log("-------------------------\n");

            // 2. Download Image
            console.log("Downloading image...");
            const response = await axios.get(fragment.imageUrl, {
                responseType: 'arraybuffer',
                headers: {
                    'User-Agent': 'SNSAutomationBot/1.0 (mailto:your-email@example.com)' // Wikimedia requires a User-Agent
                }
            });
            const buffer = Buffer.from(response.data, 'binary');

            // 3. Post to X
            if (process.argv.includes('--post')) {
                const client = new XClient();

                // Upload Media
                const mediaId = await client.uploadMedia(buffer, 'image/jpeg');

                // Post Tweet
                await client.postTweetWithMedia(fragment.text, [mediaId]);
                console.log("Successfully posted to X!");
            } else {
                console.log("Dry run complete. Use --post to actually post.");
            }

            // Success, break the loop
            return;

        } catch (error) {
            console.error(`Attempt ${attempt} failed:`, error);
            if (attempt < MAX_RETRIES) {
                console.log(`Waiting ${RETRY_DELAY_MS / 1000} seconds before retrying...`);
                await sleep(RETRY_DELAY_MS);
            } else {
                console.error("All retry attempts failed.");
                throw error; // Re-throw only after all retries fail
            }
        }
    }
}

async function main() {
    console.log("Starting X Image Post Automation...");

    try {
        await runWithRetry();
    } catch (error) {
        console.error("X Image Post Failed Final:", error);
        process.exit(1);
    }
}

main();
