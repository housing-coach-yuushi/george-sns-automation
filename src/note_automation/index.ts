// import { generateNoteContent } from './note_generator';
import { postToNote } from './note_client';
// import { generateTarotContent } from '../x_automation/content_generator';

async function main() {
    const isDryRun = !process.argv.includes('--post');
    const isXInput = process.argv.includes('--from-x'); // Optional: read from X post file? For now just gen fresh.

    console.log(`Starting Note Automation (Dry Run: ${isDryRun})`);

    try {
        // 1. Read input from X automation
        const fs = require('fs');
        const path = require('path');
        const dataPath = path.resolve(__dirname, '../../generated/daily_data.json');

        let cardName = "The Moon (正位置)"; // Fallback
        let noteContentBody = ""; // Fallback content

        if (fs.existsSync(dataPath)) {
            const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
            // Check if data is from last 24h? For now, just trust it.
            console.log(`Loaded daily data from ${data.date}`);
            // cardName = data.cardName;
            // xContent = data.content; // No longer needed for generation
            noteContentBody = data.noteContent;
        } else {
            console.warn("WARNING: generated/daily_data.json not found. Using fallback/dummy data.");
            if (!isDryRun) {
                throw new Error("Cannot post to Production without X data source. Run X automation first.");
            }
        }

        if (!noteContentBody) {
            throw new Error("No noteContent found in daily_data.json");
        }

        const noteContent = {
            title: `【運勢】${new Date().toLocaleDateString('ja-JP')}のタロット`, // Simple title or could be generated
            body: noteContentBody
        };

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
