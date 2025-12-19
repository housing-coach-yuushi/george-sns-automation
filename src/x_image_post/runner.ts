import { FragmentGenerator } from './fragment_generator';
import { XClient } from '../x_automation/x_client';
import axios from 'axios';

async function main() {
    console.log("Starting X Image Post Automation...");

    try {
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
        const response = await axios.get(fragment.imageUrl, { responseType: 'arraybuffer' });
        const buffer = Buffer.from(response.data, 'binary');

        // 3. Post to X (only if valid args or always? Let's assume this script is CALLED to post)
        // Check for --post flag to be safe, or just run if called. 
        // The workflow calls it, so we usually want it to run. 
        // But for safety during dev, let's require --post or just do it.
        // Given user instructions, let's look for --post flag for safety.

        if (process.argv.includes('--post')) {
            const client = new XClient();

            // Upload Media
            const mediaId = await client.uploadMedia(buffer, 'image/jpeg'); // Assuming JPEG or PNG, Twitter API usually handles it.

            // Post Tweet
            await client.postTweetWithMedia(fragment.text, [mediaId]);
            console.log("Successfully posted to X!");
        } else {
            console.log("Dry run complete. Use --post to actually post.");
        }

    } catch (error) {
        console.error("X Image Post Failed:", error);
        process.exit(1);
    }
}

main();
