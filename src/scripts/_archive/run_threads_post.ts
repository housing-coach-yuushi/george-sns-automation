import { ThreadsClient } from '../threads_automation/threads_client';
import { ThreadsFragmentGenerator } from '../threads_automation/threads_generator';
import fs from 'fs';
import path from 'path';

async function main() {
    console.log("============================================");
    console.log("   GEORGE THREADS FRAGMENT SYSTEM (Midnight)");
    console.log("============================================");

    const client = new ThreadsClient();
    const generator = new ThreadsFragmentGenerator();
    const isDryRun = !process.argv.includes('--post');
    const LOG_FILE = path.resolve(__dirname, '../../threads_log.json');

    try {
        let attempts = 0;
        const maxAttempts = 3;
        let finalResult = null;

        // Retina Retry Loop
        while (attempts < maxAttempts) {
            attempts++;
            console.log(`\n[Attempt ${attempts}/${maxAttempts}] Generating fragment...`);

            const result = await generator.generateFragment();
            console.log(`> Text: "${result.text.replace(/\n/g, '\\n')}"`);
            console.log(`> Status: ${result.status} (${result.reason || 'OK'})`);

            if (result.status === 'APPROVED') {
                finalResult = result;
                break;
            }
        }

        if (!finalResult) {
            console.error("\n❌ Failed to generate approved content after multiple attempts.");
            process.exit(1);
        }

        console.log("\n============================================");
        console.log("   FINAL POST CANDIDATE");
        console.log("============================================");
        console.log(finalResult.text);
        console.log("--------------------------------------------");

        // Logging
        const logEntry = {
            timestamp: new Date().toISOString(),
            seed_fragment: finalResult.seed,
            final_text: finalResult.text,
            posted: !isDryRun,
            reason: finalResult.reason
        };

        // Append to Log File
        let logs = [];
        if (fs.existsSync(LOG_FILE)) {
            logs = JSON.parse(fs.readFileSync(LOG_FILE, 'utf8'));
        }
        logs.push(logEntry);
        fs.writeFileSync(LOG_FILE, JSON.stringify(logs, null, 2));


        if (isDryRun) {
            console.log("\n[Dry Run] Validated and logged. Use --post to publish.");
        } else {
            console.log("\n[Phase 2] Posting to Threads...");
            const threadId = await client.postThread(finalResult.text);
            console.log(`\n>>> POST COMPLETE. Thread ID: ${threadId}`);
        }

    } catch (e) {
        console.error("An error occurred:", e);
        process.exit(1);
    }
}

main().catch(console.error);
