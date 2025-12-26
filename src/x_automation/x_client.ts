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

    async uploadMedia(buffer: Buffer, mimeType: string): Promise<string> {
        try {
            console.log("Uploading media to X...");
            const mediaId = await this.client.v1.uploadMedia(buffer, { mimeType });
            console.log("Media uploaded successfully! Media ID:", mediaId);
            return mediaId;
        } catch (error) {
            console.error("Failed to upload media to X:", error);
            throw error;
        }
    }

    async postTweetWithMedia(text: string, mediaIds: string[]): Promise<void> {
        try {
            console.log("Posting tweet with media to X...");
            const response = await this.client.v2.tweet({
                text: text,
                media: { media_ids: mediaIds as any }
            });
            console.log("Successfully posted to X with media!");
            console.log("Tweet ID:", response.data.id);
            console.log("Text:", response.data.text);
        } catch (error) {
            console.error("Failed to post to X with media:", error);
            throw error;
        }
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
    async getTweetMetrics(tweetIds: string[]): Promise<any[]> {
        try {
            if (tweetIds.length === 0) return [];

            // v2.tweets allows fetching multiple tweets by ID
            const response = await this.client.v2.tweets(tweetIds, {
                "tweet.fields": ["public_metrics", "created_at"]
            });

            // response.data is an array of TweetV2
            return response.data;
        } catch (error) {
            console.error("Failed to fetch tweet metrics:", error);
            return [];
        }
    }
}
