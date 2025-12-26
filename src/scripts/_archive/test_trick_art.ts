import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';
import { createWriteStream } from 'fs';
import { KeiAIGenerator } from '../generators/kei_ai';

async function main() {
    console.log("Starting Trick Art / Perspective Shift Test...");
    const generator = new KeiAIGenerator();
    const outputDir = path.resolve(__dirname, '../../generated');
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    // === Concept 1: Chaos to Order (Morph/Reveal) ===
    // "一見ゴミの山に見えるが、視点が変わると王冠に見える"
    console.log("\n=== Generating Concept 1: Chaos to Order (Morph) ===");
    const prompt1_img = "A chaotic pile of twisted rusty metal and thorns, dark background, high detail, 8k, photorealistic";
    // Video prompt instructions the AI to morph/transform the object
    const prompt1_vid = "The metal and thorns twist and morph smoothly into a beautiful golden crown, glowing light, magical transformation, cinematic";
    await generateSample(generator, "Trick 1 (Morph)", prompt1_img, prompt1_vid, outputDir, "trick1_morph.mp4");

    // === Concept 2: Double Exposure (Hidden Meaning) ===
    // "風景だと思ったら、人の顔だった" (Pareidolia)
    console.log("\n=== Generating Concept 2: Double Exposure (Hidden Face) ===");
    // Image prompt tries to create the optical illusion base
    const prompt2_img = "A mysterious landscape with two trees bending towards each other, a moon in the center, forming the silhouette of a human skull, optical illusion, double exposure, surrealism, 8k";
    // Video prompt emphasizes the shift in focus
    const prompt2_vid = "Camera slowly zooms out, the landscape elements align to clearly reveal the skull shape, eerie atmosphere, cinematic movement";
    await generateSample(generator, "Trick 2 (Illusion)", prompt2_img, prompt2_vid, outputDir, "trick2_illusion.mp4");
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
