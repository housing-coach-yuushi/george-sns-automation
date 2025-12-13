import axios from 'axios';
import { config } from '../config/env';

const BASE_URL = 'https://api.kie.ai/api/v1/jobs';

export class KeiAIGenerator {
    private apiKey: string;

    constructor() {
        this.apiKey = config.keiAiApiKey;
        if (!this.apiKey) {
            throw new Error("KEI_AI_API_KEY is missing");
        }
    }

    /**
     * Generates a video from an image using the specified model
     * @param imageUrl URL of the source image
     * @param prompt Text prompt for the video generation
     * @param duration Duration in seconds (default 5)
     * @param model Model ID (default "kling-2.6/image-to-video")
     * @param resolution Resolution (default "1080P")
     */
    async generateVideo(imageUrl: string, prompt: string, duration: string = "5", model: string = "kling-2.6/image-to-video", resolution: string = "1080P"): Promise<string | null> {
        console.log(`[KeiAI] Starting video generation...`);
        console.log(`[KeiAI] Model: ${model}`);
        console.log(`[KeiAI] Image: ${imageUrl}`);
        console.log(`[KeiAI] Prompt: ${prompt}`);
        console.log(`[KeiAI] Duration: ${duration}s, Resolution: ${resolution}`);

        try {
            const inputPayload: any = {
                prompt: prompt,
                sound: false,
                duration: duration
            };

            // Model-specific parameter handling
            if (model.includes('hailuo')) {
                inputPayload.image_url = imageUrl; // Hailuo expects singular string
                inputPayload.resolution = resolution;
            } else {
                inputPayload.image_urls = [imageUrl]; // Kling expects array
                // Kling doesn't use resolution param in this specific way usually, but we can leave it out or check docs.
                // For now, only add resolution if it's Hailuo or if we confirm others need it.
                // But to be safe and avoid breaking Kling, let's NOT add resolution to Kling unless we know.
                // The previous code didn't send resolution to Kling, so let's keep it that way for Kling.
            }

            const response = await axios.post(`${BASE_URL}/createTask`, {
                model: model,
                input: inputPayload
            }, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.data.code !== 200) {
                console.error(`[KeiAI] API Error: ${response.data.message}`);
                return null;
            }

            const taskId = response.data.data.taskId;
            console.log(`[KeiAI] Task Created: ${taskId}`);
            return taskId;

        } catch (error: any) {
            console.error(`[KeiAI] Request Failed: ${error.message}`);
            if (error.response) {
                console.error(`[KeiAI] Response: ${JSON.stringify(error.response.data)}`);
            }
            return null;
        }
    }

    /**
     * Polls the task status until completion or timeout
     * @param taskId Task ID to poll
     */
    async pollTask(taskId: string): Promise<string | null> {
        let attempts = 0;
        const maxAttempts = 120; // 10 minutes (5s interval)

        console.log(`[KeiAI] Polling task ${taskId}...`);

        while (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 5000));
            attempts++;

            try {
                const response = await axios.get(`${BASE_URL}/recordInfo?taskId=${taskId}`, {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`
                    }
                });

                if (response.data.code === 200) {
                    const state = response.data.data?.state;

                    if (state === 'success') {
                        const resultJson = JSON.parse(response.data.data.resultJson);
                        const videoUrl = resultJson.resultUrls[0];
                        console.log(`[KeiAI] Success! Video URL: ${videoUrl}`);
                        return videoUrl;
                    } else if (state === 'fail') {
                        console.error(`[KeiAI] Task Failed: ${response.data.data.failMsg}`);
                        return null;
                    } else {
                        // processing or queueing
                        if (attempts % 6 === 0) process.stdout.write('.');
                    }
                }
            } catch (error) {
                console.error(`[KeiAI] Polling Error: ${error}`);
            }
        }

        console.error(`[KeiAI] Timeout waiting for task ${taskId}`);
        return null;
    }

    /**
     * Generates an image from text using Seedream 4.5
     * @param prompt Text prompt for the image
     * @param aspectRatio Aspect ratio (default "2:3")
     */
    async generateImage(prompt: string, aspectRatio: string = "9:16"): Promise<string | null> {
        console.log(`[KeiAI] Starting image generation...`);
        console.log(`[KeiAI] Prompt: ${prompt}`);

        try {
            const response = await axios.post(`${BASE_URL}/createTask`, {
                model: "seedream/4.5-text-to-image",
                input: {
                    prompt: prompt,
                    aspect_ratio: aspectRatio,
                    quality: "high"
                }
            }, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.data.code !== 200) {
                console.error(`[KeiAI] API Error: ${response.data.message}`);
                return null;
            }

            const taskId = response.data.data.taskId;
            console.log(`[KeiAI] Task Created: ${taskId}`);
            return taskId;

        } catch (error: any) {
            console.error(`[KeiAI] Request Failed: ${error.message}`);
            return null;
        }
    }
}
