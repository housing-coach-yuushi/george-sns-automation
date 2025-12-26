import { NoteFragmentGenerator } from '../note_automation/note_fragment_generator';
import { ImageSearcher } from '../x_image_post/image_searcher';
import { postToNote } from '../note_automation/note_client';
import fs from 'fs';
import path from 'path';

async function main() {
    console.log("============================================");
    console.log("   GEORGE NOTE FRAGMENT SYSTEM (Silent Curator) ");
    console.log("============================================");

    const isDryRun = !process.argv.includes('--post');
    const generator = new NoteFragmentGenerator();
    const searcher = new ImageSearcher();

    try {
        console.log("\n[Phase 1] Curating Fragment...");
        const result = await generator.generateFragment();

        console.log("\n============================================");
        console.log("   GENERATED FRAGMENT");
        console.log("============================================");
        console.log(`[Title]: ${result.title}`);
        console.log("--------------------------------------------");
        console.log(`[Body]:\n${result.body}`);
        console.log("--------------------------------------------");
        console.log(`[Image]: ${result.imageTitle} (${result.imageSource})`);
        console.log(`[URL]: ${result.imageUrl}`);
        console.log("============================================");

        // Download image for preview/future usage
        const generatedDir = path.resolve(__dirname, '../../generated/note_fragments');
        if (!fs.existsSync(generatedDir)) {
            fs.mkdirSync(generatedDir, { recursive: true });
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `note_fragment_${timestamp}.jpg`;
        const localPath = path.join(generatedDir, filename);

        await searcher.downloadImage(result.imageUrl, localPath);
        console.log(`\nSaved image to: ${localPath}`);

        if (isDryRun) {
            console.log("\n[Dry Run] Skipping post to Note.");
            console.log("Use --post to actually post.");
        } else {
            console.log("\n[Phase 2] Posting to Note...");
            await postToNote({
                title: result.title,
                body: result.body,
                headerImagePath: localPath
            });
            console.log("\n>>> POST COMPLETE");
        }

    } catch (error) {
        console.error("An error occurred:", error);
        process.exit(1);
    }
}

main().catch(console.error);
