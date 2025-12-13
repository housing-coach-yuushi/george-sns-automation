import { TarotBrain } from '../planners/tarot_brain';

async function main() {
    console.log("Testing Tarot Brain...");
    const brain = new TarotBrain();

    // Generate 3 plans to see variety
    for (let i = 1; i <= 3; i++) {
        console.log(`\n--- Plan ${i} ---`);
        const plan = await brain.generatePlan();
        console.log(`Title: ${plan.title}`);
        console.log(`Concept: ${plan.concept}`);
        console.log(`Punchline: "${plan.narration}"`);
        console.log(`Visual Prompt: ${plan.scenes[0].prompt_image}`);
        console.log(`Motion Prompt: ${plan.scenes[0].prompt_video}`);
    }
}

main().catch(console.error);
