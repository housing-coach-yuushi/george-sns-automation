import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

export class ThreadsClient {
    private userId: string;
    private accessToken: string;
    private baseUrl = 'https://graph.threads.net/v1.0';

    constructor() {
        this.userId = process.env.THREADS_USER_ID || '';
        this.accessToken = process.env.THREADS_ACCESS_TOKEN || '';

        if (!this.userId || !this.accessToken) {
            console.warn("⚠️ THREADS_USER_ID or THREADS_ACCESS_TOKEN not set in .env");
        }
    }

    async postThread(text: string, imageUrl?: string): Promise<string> {
        if (!this.userId || !this.accessToken) {
            throw new Error("Missing Threads credentials.");
        }

        try {
            console.log(`Posting to Threads: "${text.substring(0, 20)}..."`);

            // 1. Create Media Container
            let containerId: string;

            if (imageUrl) {
                // Image Post
                const mediaUrl = `${this.baseUrl}/${this.userId}/threads`;
                const params = new URLSearchParams({
                    media_type: 'IMAGE',
                    image_url: imageUrl,
                    text: text,
                    access_token: this.accessToken
                });

                const response = await axios.post(`${mediaUrl}?${params.toString()}`);
                containerId = response.data.id;
            } else {
                // Text Post
                const mediaUrl = `${this.baseUrl}/${this.userId}/threads`;
                const params = new URLSearchParams({
                    media_type: 'TEXT',
                    text: text,
                    access_token: this.accessToken
                });

                const response = await axios.post(`${mediaUrl}?${params.toString()}`);
                containerId = response.data.id;
            }

            console.log(`Created Container ID: ${containerId}`);

            // 2. Publish Container
            const publishUrl = `${this.baseUrl}/${this.userId}/threads_publish`;
            const publishParams = new URLSearchParams({
                creation_id: containerId,
                access_token: this.accessToken
            });

            const publishResponse = await axios.post(`${publishUrl}?${publishParams.toString()}`);
            console.log("Published Thread ID:", publishResponse.data.id);

            return publishResponse.data.id;

        } catch (error: any) {
            console.error("Threads Post Error:", error.response?.data || error.message);
            throw error;
        }
    }
}
