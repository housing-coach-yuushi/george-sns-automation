import axios from 'axios';
import readline from 'readline';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const question = (query: string): Promise<string> => {
    return new Promise(resolve => rl.question(query, resolve));
};

async function main() {
    console.log("============================================");
    console.log("   THREADS TOKEN SETUP (Long-Lived) ");
    console.log("============================================");

    // 1. Get Credentials
    let appId = process.env.THREADS_APP_ID;
    let appSecret = process.env.THREADS_APP_SECRET;

    if (!appId) {
        appId = await question("Enter THREADS_APP_ID: ");
    }
    if (!appSecret) {
        appSecret = await question("Enter THREADS_APP_SECRET: ");
    }

    if (!appId || !appSecret) {
        console.error("App ID and Secret are required.");
        process.exit(1);
    }

    // 2. Generate Auth URL
    const redirectUri = "https://github.com/yuushi/george-bar-app"; // Or whatever is set in your app settings
    const scopes = "threads_basic,threads_content_publish";
    const authUrl = `https://threads.net/oauth/authorize?client_id=${appId}&redirect_uri=${redirectUri}&scope=${scopes}&response_type=code`;

    console.log("\n[Step 1] Open this URL in your browser:");
    console.log(authUrl);
    console.log("\n(Make sure to accept the invite via the Threads App >> Settings >> Account >> Website Permissions first!)");

    // 3. Get Code
    console.log("\n[Step 2] After authorizing, you will be redirected.");
    console.log("Copy the 'code' parameter from the URL (everything after ?code=... and before #_ or similar).");
    const code = await question("Enter the Code: ");

    // Clean code (remove #_ if present)
    const cleanCode = code.replace(/#_$/, "");

    try {
        // 4. Exchange for Short-Lived Token
        console.log("\n[Step 3] Exchanging code for Short-Lived Token...");
        const tokenUrl = "https://graph.threads.net/oauth/access_token";

        const tokenResponse = await axios.post(tokenUrl, new URLSearchParams({
            client_id: appId,
            client_secret: appSecret,
            grant_type: 'authorization_code',
            redirect_uri: redirectUri,
            code: cleanCode
        }));

        const shortLivedToken = tokenResponse.data.access_token;
        const userId = tokenResponse.data.user_id; // Threads API often returns user_id here too
        console.log("Extracted User ID:", userId);

        // 5. Exchange for Long-Lived Token (60 days)
        console.log("\n[Step 4] Exchanging for Long-Lived Token...");
        const longTokenUrl = `https://graph.threads.net/access_token`;
        const longTokenResponse = await axios.get(longTokenUrl, {
            params: {
                grant_type: 'th_exchange_token',
                client_secret: appSecret,
                access_token: shortLivedToken
            }
        });

        const longLivedToken = longTokenResponse.data.access_token;

        console.log("\n✅ SUCCESS! Here are your credentials:");
        console.log(`THREADS_USER_ID=${userId}`);
        console.log(`THREADS_ACCESS_TOKEN=${longLivedToken}`);
        console.log(`THREADS_APP_ID=${appId}`);
        console.log(`THREADS_APP_SECRET=${appSecret}`);

        console.log("\nPaste these into your .env file.");

    } catch (error: any) {
        console.error("\n❌ Error during setup:");
        console.error(error.response?.data || error.message);
    } finally {
        rl.close();
    }
}

main();
