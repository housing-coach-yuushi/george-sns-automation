import dotenv from 'dotenv';
import path from 'path';

// Load .env from the root of the sns_marketing_automation folder
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
    keiAiApiKey: process.env.KEI_AI_API_KEY || '',
};

if (!config.keiAiApiKey) {
    console.warn("WARNING: KEI_AI_API_KEY is not set in .env file.");
}
