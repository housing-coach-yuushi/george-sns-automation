import { generateNoteContent } from './note_generator';
import { postToNote } from './note_client';
// import { generateTarotContent } from '../x_automation/content_generator';

async function main() {
    const isDryRun = !process.argv.includes('--post');
    const isXInput = process.argv.includes('--from-x'); // Optional: read from X post file? For now just gen fresh.

    console.log(`Starting Note Automation (Dry Run: ${isDryRun})`);

    try {
        // 1. Generate Tarot Reading (or reuse same logic as X)
        // We reuse the X content generator to get the "base" content.
        // Ideally we pass the SAME card/reading as X, but for now we generate a fresh one or we need a way to pass it.
        // For simplicity, let's generate a fresh reading here, or ask user if they want to link it.
        // Since the prompt says "Based on the X post", we simulate it by generating a short X-like reading first.

        // Simulating X content for input
        // Real implementation should probably read from a shared "daily_seed.json" or similar if we want them to match exactly.
        // For now, we will just generate 'a' reading.

        // However, `generateTarotContent` returns the full formatted text.
        // We might want just the card name and reading text.

        // Let's modify `generateTarotContent` or just parse its output?
        // Actually, `generateTarotContent` calls Claude.

        // Let's just call `generateNoteContent` with a "simulated" previous reading for this v1.

        const dummyCard = "The Moon (正位置)";
        const dummyReading = "足元が揺らぐような不安は、新しい感性が芽生えている証拠かもしれません。";

        const noteContent = await generateNoteContent(dummyCard, dummyReading);

        console.log("\n--- Generated Note Content ---");
        console.log(`Title: ${noteContent.title}`);
        console.log(`Body: ${noteContent.body.substring(0, 50)}...`);
        console.log("------------------------------\n");

        if (!isDryRun) {
            await postToNote(noteContent);
            console.log("Successfully posted to Note!");
        } else {
            console.log("Dry run complete. Use --post to actually publish.");
        }

    } catch (error) {
        console.error("Error in Note Automation:", error);
        process.exit(1);
    }
}

main();
