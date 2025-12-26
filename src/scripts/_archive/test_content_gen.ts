
import { ContentGenerator } from '../x_automation/content_generator';

async function main() {
    console.log("Testing ContentGenerator with updated prompt...");
    try {
        const generator = new ContentGenerator();
        const post = await generator.generateDailyPost();
        console.log("\n--- Generated Post ---\n");
        console.log(post);
        console.log("\n----------------------\n");
    } catch (error) {
        console.error("Error generating post:", error);
    }
}

main();
