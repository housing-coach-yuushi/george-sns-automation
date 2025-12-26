import { KeiAIGenerator } from '../generators/kei_ai';

async function main() {
    console.log("Starting Cinematic Content Test...");

    const generator = new KeiAIGenerator();

    // 1. Generate Image (Text-to-Image)
    console.log("\n=== Phase 1: Image Generation ===");
    const imagePrompt = "A cinematic, dark fantasy landscape representing 'The Fool' tarot card. A cliff edge at dawn, mystical fog, golden light breaking through dark clouds, a small white dog looking at the horizon, no humans, atmospheric, highly detailed, 8k resolution, photorealistic, dark aesthetic, vertical 9:16 aspect ratio";

    const imgTaskId = await generator.generateImage(imagePrompt, "9:16");

    if (!imgTaskId) {
        console.error("Failed to start image generation.");
        return;
    }

    const imageUrl = await generator.pollTask(imgTaskId);
    if (!imageUrl) {
        console.error("Failed to generate image.");
        return;
    }
    console.log(`Image Generated: ${imageUrl}`);

    // 2. Generate Video (Image-to-Video)
    console.log("\n=== Phase 2: Video Generation ===");
    const videoPrompt = "Slow camera pan forward towards the horizon, fog moving, golden light shimmering, cinematic movement, high quality, 8k";

    const vidTaskId = await generator.generateVideo(imageUrl, videoPrompt);

    if (!vidTaskId) {
        console.error("Failed to start video generation.");
        return;
    }

    const videoUrl = await generator.pollTask(vidTaskId);

    if (videoUrl) {
        console.log("\n============================================");
        console.log("CINEMATIC GENERATION SUCCESSFUL!");
        console.log(`Final Video URL: ${videoUrl}`);
        console.log("============================================");
    } else {
        console.log("\nVideo Generation Failed.");
    }
}

main().catch(console.error);
