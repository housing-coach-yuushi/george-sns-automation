import { XClient } from '../x_automation/x_client';
import dotenv from 'dotenv';
dotenv.config();

async function debug() {
    console.log("Debugging X API Credentials...");
    try {
        const client = new XClient();
        console.log("Client initialized.");

        // Access private client to check "me"
        const x = (client as any).client;

        console.log("Checking User Context (v2.me)...");
        const me = await x.v2.me();
        console.log("Successfully fetched user:", me.data);

        console.log("Checking Write Permission (Test Post)...");
        // Use a timestamp to avoid duplicate content errors
        const text = `Debug Test Post ${new Date().toISOString()}`;
        await client.postTweet(text);
        console.log("Write Permission OK.");

    } catch (e: any) {
        console.error("Debug Failed:", e);
        if (e.data) {
            console.error("Error Data:", JSON.stringify(e.data, null, 2));
        }
    }
}

debug();
