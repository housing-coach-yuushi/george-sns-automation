import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';
import { createWriteStream } from 'fs';
import { KeiAIGenerator } from '../generators/kei_ai';
import { TarotBrain } from '../planners/tarot_brain';
import { VideoAssembler } from '../utils/video_assembler';

async function main() {
    console.log("============================================");
    console.log("   HAILUO 2.3 TEST: STARTING");
    console.log("============================================");

    const generator = new KeiAIGenerator();
    const assembler = new VideoAssembler();

    // Output Directory
    const outputDir = path.resolve(__dirname, '../../generated/hailuo_test');
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    // 1. Plan Content
    console.log("\n[Phase 1] Consulting the Viral Oracle...");
    const brain = new TarotBrain();
    const plan = await brain.generatePlan();
    console.log(`> Card: ${plan.title}`);
    console.log(`> Style: ${plan.concept}`);
    console.log(`> Punchline: "${plan.narration}"`);

    // 2. Generate Base Image
    console.log("\n[Phase 2] Generating Base Image...");
    const baseScene = plan.scenes[0];
    console.log(`[Image] Prompt: ${baseScene.prompt_image}`);
    const imgTaskId = await generator.generateImage(baseScene.prompt_image, "9:16");
    if (!imgTaskId) return;

    const imageUrl = await generator.pollTask(imgTaskId);
    if (!imageUrl) return;
    console.log(`[Image] Ready: ${imageUrl}`);

    // Download Image
    const imgFilename = `${plan.title.replace(/\s+/g, '_')}_base.png`;
    await downloadFile(imageUrl, path.join(outputDir, imgFilename));

    // 3. Generate Videos for Each Scene
    console.log("\n[Phase 3] Generating Videos with Hailuo 2.3...");
    const modelId = "hailuo/2-3-image-to-video-standard";
    const resolution = "768P"; // Required for 10s

    const generatedVideoPaths: string[] = [];

    for (const scene of plan.scenes) {
        console.log(`\n--- Processing Scene ${scene.id} (${scene.duration}s) ---`);
        console.log(`[Video] Prompt: ${scene.prompt_video}`);

        const vidTaskId = await generator.generateVideo(imageUrl, scene.prompt_video!, scene.duration.toString(), modelId, resolution);

        if (vidTaskId) {
            const videoUrl = await generator.pollTask(vidTaskId);
            if (videoUrl) {
                console.log(`[Video] Ready: ${videoUrl}`);
                const vidFilename = `${plan.title.replace(/\s+/g, '_')}_scene${scene.id}.mp4`;
                const localPath = path.join(outputDir, vidFilename);
                await downloadFile(videoUrl, localPath);
                console.log(`Saved to: ${localPath}`);
                generatedVideoPaths.push(localPath);
            }
        }
    }

    // 4. Assemble Video
    if (generatedVideoPaths.length === 3) {
        console.log("\n[Phase 4] Assembling Final Viral Video...");
        const finalFilename = `${plan.title.replace(/\s+/g, '_')}_full.mp4`;
        const finalPath = path.join(outputDir, finalFilename);

        try {
            await assembler.concatVideos(generatedVideoPaths, finalPath);
            console.log(`\nSUCCESS! Final Video: ${finalPath}`);
        } catch (error) {
            console.error("Assembly failed:", error);
        }
    } else {
        console.warn("Skipping assembly: Not all scenes were generated.");
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
