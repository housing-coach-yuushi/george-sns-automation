import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';
import { createWriteStream } from 'fs';
import { KeiAIGenerator } from '../generators/kei_ai';

async function main() {
    console.log("============================================");
    console.log("   VEO 3.1 TEST: STARTING");
    console.log("============================================");

    const generator = new KeiAIGenerator();

    // Output Directory
    const outputDir = path.resolve(__dirname, '../../generated/veo_test');
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    // 1. Generate Image (using Seedream as usual)
    console.log("\n[Phase 1] Generating Base Image...");
    const prompt_img = "A futuristic cityscape at sunset, cyberpunk style, neon lights, flying cars, high detail, 8k";
    const imgTaskId = await generator.generateImage(prompt_img, "16:9"); // Veo often prefers 16:9
    if (!imgTaskId) return;

    const imageUrl = await generator.pollTask(imgTaskId);
    if (!imageUrl) return;
    console.log(`[Image] Ready: ${imageUrl}`);

    // 2. Generate Video using Veo 3.1
    console.log("\n[Phase 2] Generating Video with Veo 3.1...");
    const prompt_vid = "Camera pans across the city, flying cars zoom past, cinematic lighting, high quality";

    // Try 'veo3' as model ID based on research
    // If this fails, we might need to try 'google/veo-3.1' or similar
    const modelId = "google/veo-3";

    const vidTaskId = await generator.generateVideo(imageUrl, prompt_vid, "5", modelId);
    if (vidTaskId) {
        const videoUrl = await generator.pollTask(vidTaskId);
        if (videoUrl) {
            console.log(`[Video] Ready: ${videoUrl}`);
            const vidFilename = `veo_test_video.mp4`;
            const localPath = path.join(outputDir, vidFilename);
            await downloadFile(videoUrl, localPath);
            console.log(`Saved to: ${localPath}`);
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
