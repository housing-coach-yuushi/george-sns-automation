import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const BASE_URL = 'https://api.kie.ai/api/v1/veo';

export class VeoGenerator {
    private apiKey: string;

    constructor() {
        this.apiKey = process.env.KEI_AI_API_KEY || '';
        if (!this.apiKey) {
            console.warn("Warning: KEI_AI_API_KEY is not set in environment variables.");
        }
    }

    async generateVideo(prompt: string, imageUrl?: string, model: string = 'veo3'): Promise<string | null> {
        console.log(`[Veo] Starting generation...`);
        console.log(`[Veo] Model: ${model}`);

        const payload: any = {
            prompt: prompt,
            model: model,
            aspectRatio: "16:9"
        };

        if (imageUrl) {
            payload.imageUrls = [imageUrl];
            console.log(`[Veo] Image-to-Video mode: ${imageUrl}`);
        } else {
            console.log(`[Veo] Text-to-Video mode`);
        }

        try {
            const response = await axios.post(`${BASE_URL}/generate`, payload, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.data.code === 200) {
                const taskId = response.data.data.taskId;
                console.log(`[Veo] Task Created: ${taskId}`);
                return taskId;
            } else {
                console.error(`[Veo] API Error: ${response.data.msg}`);
                return null;
            }
        } catch (error: any) {
            console.error(`[Veo] Request Failed:`, error.message);
            if (error.response) {
                console.error(`[Veo] Response Data:`, error.response.data);
            }
            return null;
        }
    }

    async extendVideo(originTaskId: string, prompt: string, model: string = 'veo3'): Promise<string | null> {
        console.log(`[Veo] Starting extension...`);
        console.log(`[Veo] Origin Task: ${originTaskId}`);

        const payload = {
            prompt: prompt,
            model: model,
            originTaskId: originTaskId
        };

        try {
            // Try /generate endpoint with originTaskId
            const response = await axios.post(`${BASE_URL}/generate`, payload, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.data.code === 200) {
                const taskId = response.data.data.taskId;
                console.log(`[Veo] Extension Task Created: ${taskId}`);
                return taskId;
            } else {
                console.error(`[Veo] API Error: ${response.data.msg}`);
                return null;
            }
        } catch (error: any) {
            console.error(`[Veo] Extension Request Failed:`, error.message);
            if (error.response) {
                console.error(`[Veo] Response Data:`, error.response.data);
            }
            return null;
        }
    }

    async pollTask(taskId: string, maxAttempts: number = 60): Promise<string | null> {
        console.log(`[Veo] Polling task ${taskId}...`);
        let attempts = 0;

        while (attempts < maxAttempts) {
            try {
                const response = await axios.get(`${BASE_URL}/record-info?taskId=${taskId}`, {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`
                    }
                });

                const data = response.data;
                if (data.code === 200) {
                    const status = data.data.successFlag; // 0: Generating, 1: Success, 2/3: Failed
                    console.log(`[Veo] Status: ${status}, Msg: ${data.msg}`); // Debug

                    if (status === 1) {
                        console.log(`[Veo] Raw Data:`, JSON.stringify(data.data, null, 2)); // Debug log

                        let resultUrls;
                        // Check if resultUrls is directly in data or in info or in response
                        if (data.data.resultUrls) {
                            resultUrls = data.data.resultUrls;
                        } else if (data.data.info && data.data.info.resultUrls) {
                            resultUrls = data.data.info.resultUrls;
                        } else if (data.data.response && data.data.response.resultUrls) {
                            resultUrls = data.data.response.resultUrls;
                        }

                        if (typeof resultUrls === 'string') {
                            resultUrls = JSON.parse(resultUrls);
                        }

                        if (resultUrls && resultUrls.length > 0) {
                            console.log(`[Veo] Success! Video URL: ${resultUrls[0]}`);
                            return resultUrls[0];
                        } else {
                            console.error("[Veo] Error: Could not find resultUrls in response");
                            return null;
                        }
                    } else if (status === 2 || status === 3) {
                        console.error(`[Veo] Task Failed: ${data.msg}`);
                        return null;
                    } else {
                        process.stdout.write('.');
                    }
                }
            } catch (error) {
                console.error(`[Veo] Poll Error:`, error);
            }

            await new Promise(resolve => setTimeout(resolve, 10000)); // Poll every 10s
            attempts++;
        }

        console.error(`[Veo] Timeout waiting for task ${taskId}`);
        return null;
    }
}
