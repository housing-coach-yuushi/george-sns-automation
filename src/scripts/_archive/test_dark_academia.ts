import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';
import { createWriteStream } from 'fs';
import { KeiAIGenerator } from '../generators/kei_ai';

async function main() {
    console.log("Starting Dark Academia Concept Generation...");
    const generator = new KeiAIGenerator();
    const outputDir = path.resolve(__dirname, '../../generated');
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    // === Scene 1: Establishing Shot (The Atmosphere) ===
    console.log("\n=== Generating Scene 1: Dark Academia Library ===");
    const prompt1_img = "Cinematic wide shot of a dark academia library, ancient books, dust motes dancing in a shaft of golden light, dark wood, leather chairs, mysterious atmosphere, 8k, photorealistic, moody lighting";
    const prompt1_vid = "Slow camera push in, dust floating, candle flame flickering, subtle movement, high quality";
    await generateSample(generator, "Scene 1 (Library)", prompt1_img, prompt1_vid, outputDir, "scene1_library.mp4");

    // === Scene 2: The Object (The Fool) ===
    console.log("\n=== Generating Scene 2: The Fool Card ===");
    const prompt2_img = "Close up of an ancient tarot card 'The Fool' lying on a wooden desk next to a quill and ink, the card illustration is realistic and moving, dark aesthetic, high detail, 8k";
    const prompt2_vid = "The figure in the card moves slightly (coming to life), ink in the bottle ripples, cinematic lighting change";
    await generateSample(generator, "Scene 2 (The Fool)", prompt2_img, prompt2_vid, outputDir, "scene2_fool.mp4");
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
