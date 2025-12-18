import { FragmentGenerator } from '../x_image_post/fragment_generator';
import { XClient } from '../x_automation/x_client';
import { ImageSearcher } from '../x_image_post/image_searcher';
import fs from 'fs';
import path from 'path';

async function main() {
    console.log("============================================");
    console.log("   GEORGE FRAGMENT POSTING (Silent Editor)  ");
    console.log("============================================");

    const isDryRun = !process.argv.includes('--post');
    const generator = new FragmentGenerator();
    const searcher = new ImageSearcher();
    const xClient = new XClient();

    try {
        console.log("\n[Phase 1] Seeking Fragments...");
        // Generate content
        const result = await generator.generateFragment();

        console.log("\n============================================");
        console.log("   GENERATED CONTENT");
        console.log("============================================");
        console.log(`[Text]:\n${result.text}`);
        console.log(`\n[Image]: ${result.imageTitle} (${result.imageSource})`);
        console.log(`[URL]: ${result.imageUrl}`);
        console.log("============================================");

        // Download image
        const generatedDir = path.resolve(__dirname, '../../generated/fragments');
        if (!fs.existsSync(generatedDir)) {
            fs.mkdirSync(generatedDir, { recursive: true });
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `fragment_${timestamp}.jpg`;
        const localPath = path.join(generatedDir, filename);

        await searcher.downloadImage(result.imageUrl, localPath);
        console.log(`\nSaved image to: ${localPath}`);

        // Construct Text with Credit
        const credit = `\n\n(${result.imageTitle}, ${result.imageSource})`;
        let finalText = result.text + credit;

        // Simple check to ensure we don't exceed Twitter limit (approx check for now)
        if (finalText.length > 140) {
            console.warn("Warning: Text length might exceed limit.");
        }

        console.log(`\n[Final Text to Post]:\n${finalText}`);

        if (isDryRun) {
            console.log("\n[Dry Run] Skipping post to X.");
            console.log("Use --post to actually post.");
        } else {
            console.log("\n[Phase 2] Posting to X...");

            // Upload Media
            const fs = require('fs');
            const mediaBuffer = fs.readFileSync(localPath);
            // Simple mime detection
            const mimeType = localPath.endsWith('.png') ? 'image/png' : 'image/jpeg';
            const mediaId = await xClient.uploadMedia(mediaBuffer, mimeType);

            // Post Tweet
            await xClient.postTweetWithMedia(finalText, [mediaId]);
            console.log("\n>>> POST COMPLETE");
        }

    } catch (error) {
        console.error("An error occurred:", error);
        process.exit(1);
    }
}

main().catch(console.error);
