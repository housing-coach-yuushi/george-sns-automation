import { FragmentGenerator } from '../x_image_post/fragment_generator';
import { XClient } from '../x_automation/x_client';
import { notifySlack } from '../utils/slack_notifier';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config();

async function main() {
    console.log("============================================");
    console.log("   GEORGE FRAGMENT POSTING");
    console.log("   New Workflow: Image-First Content");
    console.log("============================================");

    const isDryRun = !process.argv.includes('--post');
    const generator = new FragmentGenerator();
    const xClient = new XClient();

    try {
        // Run the new 4-step workflow
        const result = await generator.generateFragment();

        console.log("\n============================================");
        console.log("   FINAL RESULT");
        console.log("============================================");
        console.log(`[Tweet]:\n${result.text}`);
        console.log(`\n[Image Prompt]: ${result.imagePrompt}`);
        console.log(`[Image URL]: ${result.imageUrl}`);
        console.log("============================================");

        // Save final image
        const generatedDir = path.resolve(__dirname, '../../generated/fragments');
        if (!fs.existsSync(generatedDir)) {
            fs.mkdirSync(generatedDir, { recursive: true });
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `fragment_ai_${timestamp}.jpg`;
        const localPath = path.join(generatedDir, filename);

        // Copy from temp to final location
        if (result.localImagePath && fs.existsSync(result.localImagePath)) {
            fs.copyFileSync(result.localImagePath, localPath);
            console.log(`\nSaved final image to: ${localPath}`);
        }

        const finalText = result.text;

        if (isDryRun) {
            console.log("\n[Dry Run] Skipping post to X.");
            console.log("Use --post to actually post.");
        } else {
            console.log("\n[Posting to X...]");

            // Upload Media
            const mediaBuffer = fs.readFileSync(localPath);
            const mimeType = 'image/jpeg';
            const mediaId = await xClient.uploadMedia(mediaBuffer, mimeType);

            // Post Tweet
            await xClient.postTweetWithMedia(finalText, [mediaId]);
            console.log("\n>>> POST COMPLETE");
            await notifySlack(`Fragment投稿 完了 (${new Date().toLocaleString('ja-JP')})`);
        }

    } catch (error) {
        console.error("An error occurred:", error);
        await notifySlack(`Fragment投稿 失敗: ${error}`, true);
        process.exit(1);
    }
}

main().catch(console.error);
