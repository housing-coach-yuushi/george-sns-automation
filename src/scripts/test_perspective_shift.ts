import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';
import { createWriteStream } from 'fs';
import { KeiAIGenerator } from '../generators/kei_ai';

async function main() {
    console.log("Starting Perspective Shift (Fact vs Interpretation) Generation...");
    const generator = new KeiAIGenerator();
    const outputDir = path.resolve(__dirname, '../../generated');
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    // === Concept 1: Distance (The Pointillism Reveal) ===
    // "事実は変えられないが（点の集合）、解釈は変えられる（名画）"
    console.log("\n=== Generating Concept 1: Distance (Pointillism) ===");
    // Image: Extreme close up of chaotic paint strokes
    const prompt1_img = "Extreme close-up of thick chaotic oil paint strokes, abstract colorful texture, impasto style, high detail, 8k";
    // Video: Zoom out to reveal it's a masterpiece
    const prompt1_vid = "Camera zooms out quickly to reveal the chaotic strokes form a beautiful portrait of a smiling woman, cinematic revelation, artistic transformation";
    await generateSample(generator, "Perspective 1 (Distance)", prompt1_img, prompt1_vid, outputDir, "perspective_distance.mp4");

    // === Concept 2: Rotation (The Upside Down Truth) ===
    // "90度/180度回転させると別物に見える"
    console.log("\n=== Generating Concept 2: Rotation (Reflection) ===");
    // Image: A landscape that works both ways, but looks different
    const prompt2_img = "A surreal landscape of a dark forest reflecting in a perfectly still lake, the reflection looks like a futuristic city, high contrast, 8k";
    // Video: Rotate camera to flip the world
    const prompt2_vid = "Camera rotates 180 degrees smoothly, the reflection becomes the top, turning the forest into a futuristic city, seamless transition, cinematic";
    await generateSample(generator, "Perspective 2 (Rotation)", prompt2_img, prompt2_vid, outputDir, "perspective_rotation.mp4");
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
