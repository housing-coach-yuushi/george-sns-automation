import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';
import { createWriteStream } from 'fs';
import { TarotBrain } from '../planners/tarot_brain';
import { KeiAIGenerator } from '../generators/kei_ai';

async function main() {
    console.log("============================================");
    console.log("   CINEMATIC TAROT FACTORY: STARTING");
    console.log("============================================");

    const brain = new TarotBrain();
    const generator = new KeiAIGenerator();

    // Output Directory
    const outputDir = path.resolve(__dirname, '../../generated/cinematic_tarot');
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    // 1. Plan Content
    console.log("\n[Phase 1] Consulting the Oracle...");
    const plan = await brain.generatePlan();
    console.log(`> Card: ${plan.title}`);
    console.log(`> Meaning: ${plan.concept}`);
    console.log(`> Punchline: "${plan.narration}"`);

    // 2. Generate Assets
    console.log("\n[Phase 2] Manifesting Visuals...");

    // Generate Base Image (Reused for consistency, or generate per scene if needed)
    // For now, we generate one base image and use it for all scenes to maintain consistency
    const baseScene = plan.scenes[0];
    console.log(`[Image] Prompt: ${baseScene.prompt_image}`);
    const imgTaskId = await generator.generateImage(baseScene.prompt_image, "9:16");
    if (!imgTaskId) {
        console.error(`Failed to start image generation.`);
        return;
    }

    const imageUrl = await generator.pollTask(imgTaskId);
    if (!imageUrl) {
        console.error(`Failed to generate image.`);
        return;
    }
    console.log(`[Image] Ready: ${imageUrl}`);

    // Download Image
    const imgFilename = `${plan.title.replace(/\s+/g, '_')}_base.png`;
    await downloadFile(imageUrl, path.join(outputDir, imgFilename));

    // Generate Videos for Each Scene
    for (const scene of plan.scenes) {
        console.log(`\n--- Processing Scene ${scene.id} (${scene.duration}s) ---`);
        console.log(`[Video] Prompt: ${scene.prompt_video}`);

        // Pass duration as string "10"
        const vidTaskId = await generator.generateVideo(imageUrl, scene.prompt_video!, scene.duration.toString());

        if (vidTaskId) {
            const videoUrl = await generator.pollTask(vidTaskId);
            if (videoUrl) {
                console.log(`[Video] Ready: ${videoUrl}`);
                const vidFilename = `${plan.title.replace(/\s+/g, '_')}_scene${scene.id}.mp4`;
                const localPath = path.join(outputDir, vidFilename);
                await downloadFile(videoUrl, localPath);
                console.log(`Saved to: ${localPath}`);
            }
        }
    }

    console.log("\n============================================");
    console.log("   GENERATION COMPLETE");
    console.log("============================================");
}

async function downloadFile(url: string, filepath: string) {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to download ${url}`);
        await pipeline(response.body as any, createWriteStream(filepath));
    } catch (e) {
        console.error(`Download Error:`, e);
    }
}

main().catch(console.error);
