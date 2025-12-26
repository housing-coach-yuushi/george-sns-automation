import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';
import { createWriteStream } from 'fs';

interface ImageResult {
    url: string;
    title: string;
    source: 'Wikimedia' | 'TheMet';
    license?: string;
    author?: string;
}

export class ImageSearcher {
    constructor() { }

    async search(keywords: string[]): Promise<ImageResult[]> {
        console.log(`Searching images for keywords: ${keywords.join(', ')}`);

        // Randomly choose between Met and Wikimedia to vary content
        const useMet = Math.random() > 0.4; // 60% chance for Met if applicable (often higher quality for "history")

        let results: ImageResult[] = [];

        try {
            if (useMet) {
                results = await this.searchTheMet(keywords);
                if (results.length === 0) {
                    console.log("No results from The Met, falling back to Wikimedia...");
                    results = await this.searchWikimedia(keywords);
                }
            } else {
                results = await this.searchWikimedia(keywords);
            }
        } catch (error) {
            console.error("Search error:", error);
            // Fallback attempt
            if (results.length === 0) {
                results = await this.searchWikimedia(keywords);
            }
        }

        return results;
    }

    private async searchWikimedia(keywords: string[]): Promise<ImageResult[]> {
        const query = keywords.join(' ');
        // Search for images (File: namespace) that are likely public domain or CC0
        // We use "incategory:PD-old OR incategory:CC-zero" as a heuristic
        // Also excluding "pdf", "svg" to get photos/paintings
        const searchUrl = 'https://commons.wikimedia.org/w/api.php';
        const params = {
            action: 'query',
            generator: 'search',
            gsrnamespace: 6, // File
            gsrsearch: `${query} filetype:bitmap -filetype:svg`, // Simple filter
            gsrlimit: 50, // Increased from 5 to 50 to get more variety
            prop: 'imageinfo',
            iiprop: 'url|extmetadata|size',
            format: 'json',
            origin: '*'
        };

        try {
            const response = await axios.get(searchUrl, {
                params,
                headers: { 'User-Agent': 'GeorgeAutomation/1.0 (yuushi226@gmail.com)' }
            });
            const pages = response.data?.query?.pages;

            if (!pages) return [];

            const results: ImageResult[] = [];
            for (const pageId in pages) {
                const page = pages[pageId];
                if (page.imageinfo && page.imageinfo[0]) {
                    const info = page.imageinfo[0];
                    // Basic filter for size
                    if (info.width < 800 || info.height < 600) continue;

                    let title = page.title.replace("File:", "");
                    // Clean up title: remove extension, remove specific ID patterns
                    title = title.replace(/\.(jpg|jpeg|png|gif)$/i, "")
                        .replace(/\(\d+\)$/, "") // Remove trailing (12345)
                        .trim();

                    // Filter out partial images / studies
                    const lowerTitle = title.toLowerCase();
                    const forbiddenTerms = ['detail', 'fragment', 'study', 'cropped', 'close-up', 'part of', 'sketch'];
                    if (forbiddenTerms.some(term => lowerTitle.includes(term))) {
                        continue;
                    }

                    // Truncate if too long (max 60 chars)
                    if (title.length > 60) {
                        title = title.substring(0, 57) + "...";
                    }

                    results.push({
                        url: info.url,
                        title: title,
                        source: 'Wikimedia',
                        license: info.extmetadata?.License?.value,
                        author: info.extmetadata?.Artist?.value
                    });
                }
            }
            return results;
        } catch (error) {
            console.error("Wikimedia search failed:", error);
            return [];
        }
    }

    private async searchTheMet(keywords: string[]): Promise<ImageResult[]> {
        // The Met API
        const query = keywords.join(' ');
        const searchUrl = 'https://collectionapi.metmuseum.org/public/collection/v1/search';

        try {
            const searchRes = await axios.get(searchUrl, {
                params: {
                    q: query,
                    hasImages: true
                    // isOnView: true // REMOVED to increase search pool
                }
            });

            if (!searchRes.data || !searchRes.data.objectIDs || searchRes.data.objectIDs.length === 0) {
                return [];
            }

            // Get random 3 objects from top 20
            const objectIDs = searchRes.data.objectIDs.slice(0, 20);
            const selectedIDs = objectIDs.sort(() => 0.5 - Math.random()).slice(0, 3);

            const results: ImageResult[] = [];

            for (const id of selectedIDs) {
                try {
                    const objUrl = `https://collectionapi.metmuseum.org/public/collection/v1/objects/${id}`;
                    const objRes = await axios.get(objUrl);
                    const obj = objRes.data;

                    if (obj.primaryImage && obj.isPublicDomain) {
                        results.push({
                            url: obj.primaryImage,
                            title: obj.title,
                            source: 'TheMet',
                            author: obj.artistDisplayName,
                            license: "Public Domain"
                        });
                    }
                } catch (e) {
                    continue;
                }
            }
            return results;
        } catch (error) {
            console.error("The Met search failed:", error);
            return [];
        }
    }

    async downloadImage(url: string, destPath: string): Promise<string> {
        console.log(`Downloading image from ${url}...`);
        try {
            const response = await axios.get(url, {
                responseType: 'stream',
                headers: { 'User-Agent': 'GeorgeAutomation/1.0 (yuushi226@gmail.com)' }
            });
            await pipeline(response.data, createWriteStream(destPath));
            console.log(`Downloaded to ${destPath}`);
            return destPath;
        } catch (error) {
            console.error(`Failed to download image:`, error);
            throw error;
        }
    }
}
