import { KeiAIGenerator } from '../generators/kei_ai';

async function main() {
    console.log("Starting Sensory Viral Samples Generation...");
    const generator = new KeiAIGenerator();

    // === Sample 1: ASMR / Texture (Burning Card) ===
    console.log("\n=== Generating Sample 1: ASMR/Texture (Burning) ===");
    const prompt1_img = "Extreme close-up macro shot of a tarot card edge burning, embers glowing orange, black ash texture, dark background, high detail, 8k, photorealistic";
    const prompt1_vid = "Fire spreading slowly, paper curling, embers flying, smoke rising, slow motion, satisfying texture";
    await generateSample(generator, "Sample 1 (ASMR)", prompt1_img, prompt1_vid);

    // === Sample 2: Glitch / Psychological (Distorted Reality) ===
    console.log("\n=== Generating Sample 2: Glitch/Psychological ===");
    const prompt2_img = "A mysterious antique mirror in a dark room, reflection showing a distorted silhouette, glitch art style, chromatic aberration, dark aesthetic, horror vibe";
    const prompt2_vid = "Mirror reflection glitching, static noise interference, reality distorting, fast cuts, psychological horror vibe";
    await generateSample(generator, "Sample 2 (Glitch)", prompt2_img, prompt2_vid);

    // === Sample 3: POV / Immersion (Dark Forest) ===
    console.log("\n=== Generating Sample 3: POV (Dark Forest) ===");
    const prompt3_img = "First person view of holding a glowing tarot card in a dark foggy forest at night, trees silhouetted, mysterious blue light, cinematic, 8k";
    const prompt3_vid = "Walking forward through the fog, hand holding the card shaking slightly (handheld camera feel), trees passing by, immersive POV";
    await generateSample(generator, "Sample 3 (POV)", prompt3_img, prompt3_vid);
}

async function generateSample(generator: KeiAIGenerator, name: string, imgPrompt: string, vidPrompt: string) {
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
        console.log(`\n>>> ${name} COMPLETE: ${videoUrl}\n`);
    } else {
        console.log(`\n>>> ${name} FAILED\n`);
    }
}

main().catch(console.error);
