
import { XClient } from '../x_automation/x_client';
import dotenv from 'dotenv';
dotenv.config();

async function main() {
    try {
        console.log("Testing X Connection with simple text...");
        const client = new XClient();
        const timestamp = new Date().toISOString();
        await client.postTweet(`Connection Test: ${timestamp} \n\n(This is a test post, please delete)`);
        console.log("SUCCESS: Connection and Write permissions are valid.");
    } catch (error) {
        console.error("FAILURE: Could not post.", error);
    }
}

main();
