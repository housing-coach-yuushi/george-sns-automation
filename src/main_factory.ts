import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';
import { createWriteStream } from 'fs';
import { IllusionBrain, VideoPlan } from './planners/illusion_brain';
import { KeiAIGenerator } from './generators/kei_ai';

async function main() {
    console.log("============================================");
    console.log("   SNS AUTOMATION FACTORY: STARTING");
    console.log("============================================");

    const brain = new IllusionBrain();
    const generator = new KeiAIGenerator();

    // Output Directory
    const dateStr = new Date().toISOString().split('T')[0];
    const outputDir = path.resolve(__dirname, `../generated/${dateStr}`);
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    // 1. Plan Content
    console.log("\n[Phase 1] Brainstorming Concept...");
    const plan = await brain.generatePlan();
    console.log(`> Title: ${plan.title}`);
    console.log(`> Concept: ${plan.concept}`);
    console.log(`> Narration: "${plan.narration}"`);

    // Save Plan Metadata
    fs.writeFileSync(
        path.join(outputDir, 'plan.json'),
        JSON.stringify(plan, null, 2)
    );

    // 2. Generate Assets
    console.log("\n[Phase 2] Generating Assets...");
    const results: any[] = [];

    for (const scene of plan.scenes) {
        console.log(`\n--- Processing Scene ${scene.id} ---`);

        // A. Generate Image
        console.log(`[Image] Prompt: ${scene.prompt_image}`);
        const imgTaskId = await generator.generateImage(scene.prompt_image, "9:16");
        if (!imgTaskId) {
            console.error(`Failed to start image generation for Scene ${scene.id}`);
            continue;
        }

        const imageUrl = await generator.pollTask(imgTaskId);
        if (!imageUrl) {
            console.error(`Failed to generate image for Scene ${scene.id}`);
            continue;
        }
        console.log(`[Image] Ready: ${imageUrl}`);

        // Download Image
        const imgFilename = `scene${scene.id}_image.png`;
        await downloadFile(imageUrl, path.join(outputDir, imgFilename));

        // B. Generate Video (if prompt exists)
        let videoLocalPath = null;
        if (scene.prompt_video) {
            console.log(`[Video] Prompt: ${scene.prompt_video}`);
            const vidTaskId = await generator.generateVideo(imageUrl, scene.prompt_video);
            if (vidTaskId) {
                const videoUrl = await generator.pollTask(vidTaskId);
                if (videoUrl) {
                    console.log(`[Video] Ready: ${videoUrl}`);
                    const vidFilename = `scene${scene.id}_video.mp4`;
                    videoLocalPath = path.join(outputDir, vidFilename);
                    await downloadFile(videoUrl, videoLocalPath);
                }
            }
        }

        results.push({
            sceneId: scene.id,
            imagePath: path.join(outputDir, imgFilename),
            videoPath: videoLocalPath
        });
    }

    // 3. Summary
    console.log("\n============================================");
    console.log("   FACTORY PROCESS COMPLETED");
    console.log("============================================");
    console.log(`Output Directory: ${outputDir}`);
    results.forEach(r => {
        console.log(`Scene ${r.sceneId}: ${r.videoPath ? 'VIDEO OK' : 'VIDEO FAILED'}`);
    });
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
