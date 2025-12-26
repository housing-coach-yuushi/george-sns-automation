import { KeiAIGenerator } from '../generators/kei_ai';

async function main() {
    console.log("Starting KEI AI Test...");

    const generator = new KeiAIGenerator();

    // Test Data
    const imageUrl = "https://george-bar-app.vercel.app/assets/tarot/major_00_the_fool.png";
    const prompt = "A cinematic, mystical tarot card 'The Fool' coming to life, golden wreath spinning, blue sky background, 8k resolution, highly detailed, fantasy style, vertical reel format, 9:16 aspect ratio";

    const taskId = await generator.generateVideo(imageUrl, prompt);

    if (taskId) {
        console.log(`Task started successfully. ID: ${taskId}`);
        const videoUrl = await generator.pollTask(taskId);

        if (videoUrl) {
            console.log("\n============================================");
            console.log("GENERATION SUCCESSFUL!");
            console.log(`Video URL: ${videoUrl}`);
            console.log("============================================");
        } else {
            console.log("\nGeneration Failed during polling.");
        }
    } else {
        console.log("\nFailed to start generation task.");
    }
}

main().catch(console.error);
