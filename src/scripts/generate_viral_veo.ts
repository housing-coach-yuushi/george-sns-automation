import { TarotBrain } from '../planners/tarot_brain';
import { KeiAIGenerator } from '../generators/kei_ai';
import { VeoGenerator } from '../generators/veo';
import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';
import { createWriteStream } from 'fs';

async function main() {
    console.log("============================================");
    console.log("   VEO 3.1 VIRAL FACTORY: STARTING");
    console.log("============================================");

    const brain = new TarotBrain();
    const keiAI = new KeiAIGenerator();
    const veo = new VeoGenerator();

    const outputDir = path.resolve(__dirname, '../../generated/viral_veo');
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    // 1. Plan
    console.log("\n[Phase 1] Planning Content...");
    const plan = await brain.generatePlan();
    console.log(`Title: ${plan.title}`);
    console.log(`Concept: ${plan.concept}`);

    // 2. Generate Base Image
    console.log("\n[Phase 2] Generating Base Image...");
    const baseScene = plan.scenes.find(s => s.id === 1);
    if (!baseScene || !baseScene.prompt_image) {
        console.error("Invalid plan: Missing base scene or prompt.");
        return;
    }

    const imageTaskId = await keiAI.generateImage(baseScene.prompt_image);
    if (!imageTaskId) {
        console.error("Failed to create image generation task.");
        return;
    }

    let imageUrl = await keiAI.pollTask(imageTaskId);
    if (!imageUrl) {
        console.error("Failed to generate base image (polling failed). Using fallback.");
        imageUrl = "https://tempfile.aiquickdraw.com/h/68f41d0078ca8d22d66e7fc1ee8d6fd2_1765383563.png"; // Fallback: THE SUN base
    }
    console.log(`Base Image: ${imageUrl}`);

    // Save Base Image
    const baseImageFilename = `${plan.title.replace(/\s+/g, '_')}_base.png`;
    await downloadFile(imageUrl, path.join(outputDir, baseImageFilename));

    // 3. Generate Base Video (Image-to-Video)
    console.log("\n[Phase 3] Generating Base Video (Veo 3.1)...");
    // Note: Veo Image-to-Video uses 'imageUrls' param. VeoGenerator handles this if 2nd arg is provided.
    const baseTaskId = await veo.generateVideo(
        baseScene.prompt_video || baseScene.prompt_image,
        imageUrl,
        'veo3'
    );

    if (!baseTaskId) return;

    const baseVideoUrl = await veo.pollTask(baseTaskId);
    if (!baseVideoUrl) return;

    const baseVideoFilename = `${plan.title.replace(/\s+/g, '_')}_scene1.mp4`;
    await downloadFile(baseVideoUrl, path.join(outputDir, baseVideoFilename));

    // 4. Extend Video (Loop through extensions)
    let currentTaskId = baseTaskId;
    let currentVideoUrl = baseVideoUrl;
    let extensionCount = 0;

    for (const scene of plan.scenes) {
        if (scene.type === 'extension') {
            extensionCount++;
            console.log(`\n[Phase 4-${extensionCount}] Extending Video (Scene ${scene.id})...`);
            console.log(`Prompt: ${scene.prompt_video}`);

            // Use the previous task ID to extend
            const extendTaskId = await veo.extendVideo(currentTaskId, scene.prompt_video || "", 'veo3');

            if (extendTaskId) {
                const extendUrl = await veo.pollTask(extendTaskId);
                if (extendUrl) {
                    currentTaskId = extendTaskId; // Update for next extension
                    currentVideoUrl = extendUrl;

                    const extendFilename = `${plan.title.replace(/\s+/g, '_')}_extend${extensionCount}.mp4`;
                    await downloadFile(extendUrl, path.join(outputDir, extendFilename));
                } else {
                    console.error("Extension generation failed.");
                    break;
                }
            } else {
                console.error("Extension task creation failed.");
                break;
            }
        }
    }

    console.log("\n============================================");
    console.log("   VIRAL VIDEO COMPLETE");
    console.log("============================================");
    console.log(`Final Video: ${currentVideoUrl}`);
}

async function downloadFile(url: string, filepath: string) {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to download ${url}`);
        await pipeline(response.body as any, createWriteStream(filepath));
        console.log(`Saved to: ${filepath}`);
    } catch (e) {
        console.error(`Download Error:`, e);
    }
}

main().catch(console.error);
