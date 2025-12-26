import { VeoGenerator } from '../generators/veo';
import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';
import { createWriteStream } from 'fs';

async function main() {
    console.log("============================================");
    console.log("   VEO 3.1 NEW TEST: STARTING");
    console.log("============================================");

    const generator = new VeoGenerator();
    const outputDir = path.resolve(__dirname, '../../generated/veo_test');
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    // Test Prompt
    const prompt = "A cinematic drone shot of a futuristic Tokyo at night, neon lights reflecting on wet pavement, cyberpunk aesthetic, high quality, 8k";

    // Generate
    const taskId = await generator.generateVideo(prompt, undefined, 'veo3');

    if (taskId) {
        const videoUrl = await generator.pollTask(taskId);
        if (videoUrl) {
            const filename = `veo_test_${Date.now()}.mp4`;
            const filepath = path.join(outputDir, filename);
            await downloadFile(videoUrl, filepath);
            console.log(`Saved to: ${filepath}`);
        }
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
