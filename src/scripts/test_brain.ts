import { IllusionBrain } from '../planners/illusion_brain';

async function main() {
    console.log("Testing Illusion Brain...");
    const brain = new IllusionBrain();

    // Generate 3 plans to see variety
    for (let i = 1; i <= 3; i++) {
        console.log(`\n--- Plan ${i} ---`);
        const plan = await brain.generatePlan();
        console.log(`Title: ${plan.title}`);
        console.log(`Concept: ${plan.concept}`);
        console.log(`Narration: "${plan.narration}"`);
        console.log(`Visual Prompt: ${plan.scenes[0].prompt_image}`);
        console.log(`Motion Prompt: ${plan.scenes[0].prompt_video}`);
    }
}

main().catch(console.error);
