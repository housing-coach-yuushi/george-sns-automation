import { TwitterApi } from 'twitter-api-v2';
import dotenv from 'dotenv';
dotenv.config();

export class XClient {
    private client: TwitterApi;

    constructor() {
        if (!process.env.X_API_KEY || !process.env.X_API_SECRET || !process.env.X_ACCESS_TOKEN || !process.env.X_ACCESS_SECRET) {
            console.error("Missing X API Credentials. Please check .env file.");
            throw new Error("Missing X API Credentials");
        }

        this.client = new TwitterApi({
            appKey: process.env.X_API_KEY,
            appSecret: process.env.X_API_SECRET,
            accessToken: process.env.X_ACCESS_TOKEN,
            accessSecret: process.env.X_ACCESS_SECRET,
        });
    }

    async postTweet(text: string): Promise<void> {
        try {
            console.log("Posting to X...");
            const response = await this.client.v2.tweet(text);
            console.log("Successfully posted to X!");
            console.log("Tweet ID:", response.data.id);
            console.log("Text:", response.data.text);
        } catch (error) {
            console.error("Failed to post to X:", error);
            throw error;
        }
    }
}
