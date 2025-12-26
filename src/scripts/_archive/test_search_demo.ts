import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';
import { createWriteStream } from 'fs';
import { KeiAIGenerator } from '../generators/kei_ai';

async function main() {
    console.log("Starting Search-to-Video Demo...");
    const generator = new KeiAIGenerator();
    const outputDir = path.resolve(__dirname, '../../generated');
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    // === Simulated Search Result ===
    // In a real system, this would come from a web search API
    const searchResult = {
        title: "Rubin's Vase",
        description: "A famous ambiguous figure which can be interpreted as a vase or as two faces looking at each other.",
        meaning: "Multistability of perception."
    };
    console.log(`\n[Search Result] Found Concept: ${searchResult.title}`);
    console.log(`[Description] ${searchResult.description}`);

    // === Generate Video based on Search Result ===
    console.log("\n=== Generating Video from Concept ===");

    // 1. Re-interpret the concept with "Dark Aesthetic"
    const prompt_img = "A dark cinematic artistic interpretation of Rubin's Vase, a golden ornate chalice in the center, the negative space on the sides forms two silhouettes of faces looking at each other, dark background, dramatic lighting, 8k, photorealistic";

    // 2. Animate the shift in focus
    const prompt_vid = "Lighting shifts to emphasize the faces in the negative space, then back to the vase, creating a psychological shift in perception, cinematic slow motion";

    await generateSample(generator, "Search Demo (Rubin's Vase)", prompt_img, prompt_vid, outputDir, "search_demo_rubin.mp4");
}

async function generateSample(generator: KeiAIGenerator, name: string, imgPrompt: string, vidPrompt: string, outputDir: string, filename: string) {
    console.log(`[${name}] Generating Image...`);
    const imgTaskId = await generator.generateImage(imgPrompt, "9:16");
    if (!imgTaskId) return;

    const imageUrl = await generator.pollTask(imgTaskId);
    if (!imageUrl) return;
    console.log(`[${name}] Image Ready: ${imageUrl}`);

    console.log(`[${name}] Generating Video...`);
    const vidTaskId = await generator.generateVideo(imageUrl, vidPrompt);
    if (!vidTaskId) return;

    const videoUrl = await generator.pollTask(vidTaskId);
    if (videoUrl) {
        console.log(`\n>>> ${name} COMPLETE: ${videoUrl}`);
        const filepath = path.join(outputDir, filename);
        await downloadFile(videoUrl, filepath);
    } else {
        console.log(`\n>>> ${name} FAILED\n`);
    }
}

async function downloadFile(url: string, filepath: string) {
    console.log(`Downloading to ${filepath}...`);
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to download ${url}: ${response.statusText}`);
        await pipeline(response.body as any, createWriteStream(filepath));
        console.log(`Saved successfully.`);
    } catch (e) {
        console.error(`Download Error:`, e);
    }
}

main().catch(console.error);
