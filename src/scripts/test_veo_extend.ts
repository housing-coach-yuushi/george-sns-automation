import { VeoGenerator } from '../generators/veo';
import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';
import { createWriteStream } from 'fs';

async function main() {
    console.log("============================================");
    console.log("   VEO 3.1 EXTEND TEST: STARTING");
    console.log("============================================");

    const generator = new VeoGenerator();
    const outputDir = path.resolve(__dirname, '../../generated/veo_extend_test');
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    // 1. Generate Base Video
    console.log("\n[Phase 1] Generating Base Video...");
    const promptBase = "A cinematic drone shot of a futuristic Tokyo at night, neon lights reflecting on wet pavement, cyberpunk aesthetic, high quality, 8k";
    const baseTaskId = await generator.generateVideo(promptBase, undefined, 'veo3');

    if (!baseTaskId) return;

    const baseVideoUrl = await generator.pollTask(baseTaskId);
    if (!baseVideoUrl) return;

    const baseFilename = `veo_base_${Date.now()}.mp4`;
    const basePath = path.join(outputDir, baseFilename);
    await downloadFile(baseVideoUrl, basePath);
    console.log(`[Base] Saved to: ${basePath}`);

    // 2. Extend Video
    console.log("\n[Phase 2] Extending Video...");
    const promptExtend = "The camera flies forward through the neon streets, passing flying cars, dynamic motion, speed up";
    const extendTaskId = await generator.extendVideo(baseTaskId, promptExtend, 'veo3');

    if (!extendTaskId) {
        console.error("Failed to create extension task. Endpoint might be wrong.");
        return;
    }

    const extendVideoUrl = await generator.pollTask(extendTaskId);
    if (extendVideoUrl) {
        const extendFilename = `veo_extended_${Date.now()}.mp4`;
        const extendPath = path.join(outputDir, extendFilename);
        await downloadFile(extendVideoUrl, extendPath);
        console.log(`[Extended] Saved to: ${extendPath}`);
    }
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
