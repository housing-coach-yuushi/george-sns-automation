import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';
import { createWriteStream } from 'fs';
import { KeiAIGenerator } from '../generators/kei_ai';

async function main() {
    console.log("Starting Trompe-l'œil (Damashi-e) Generation...");
    const generator = new KeiAIGenerator();
    const outputDir = path.resolve(__dirname, '../../generated');
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    // === Concept 1: Infinite Loops (Escher Style) ===
    // "思考のループ" (Getting stuck in your head)
    console.log("\n=== Generating Concept 1: Infinite Stairs (Escher) ===");
    const prompt1_img = "A dark, atmospheric stone staircase that forms a Penrose infinite loop, M.C. Escher style but photorealistic, cinematic lighting, fog, surreal architecture, 8k";
    const prompt1_vid = "Camera moves forward along the stairs continuously but never reaches a higher level, creating a dizzying infinite loop effect, cinematic";
    await generateSample(generator, "Trompe 1 (Escher)", prompt1_img, prompt1_vid, outputDir, "trompe_escher.mp4");

    // === Concept 2: 3D Sketch Reality (Manifestation) ===
    // "描いた未来が現実になる" (Manifestation)
    console.log("\n=== Generating Concept 2: Sketch to Reality ===");
    const prompt2_img = "A pencil sketch of an ornate vintage key lying on a wooden desk, but the handle of the key looks 3D and metallic as if popping out of the paper, trompe-l'œil art, high detail";
    const prompt2_vid = "The sketched key fully transforms into a solid real metal key, light glints off the metal, magical realization, cinematic";
    await generateSample(generator, "Trompe 2 (Sketch)", prompt2_img, prompt2_vid, outputDir, "trompe_sketch.mp4");
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
