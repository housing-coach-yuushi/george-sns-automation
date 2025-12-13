import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from 'ffmpeg-static';
// @ts-ignore
import { path as ffprobePath } from 'ffprobe-static';
import path from 'path';

// Set the ffmpeg and ffprobe paths
if (ffmpegPath) {
    ffmpeg.setFfmpegPath(ffmpegPath);
} else {
    console.warn("FFmpeg static binary not found!");
}

if (ffprobePath) {
    ffmpeg.setFfprobePath(ffprobePath);
} else {
    console.warn("FFprobe static binary not found!");
}

export class VideoAssembler {
    constructor() { }

    /**
     * Concatenates multiple video files into a single file.
     * @param inputPaths Array of absolute paths to input video files.
     * @param outputPath Absolute path to the output video file.
     */
    async concatVideos(inputPaths: string[], outputPath: string): Promise<void> {
        return new Promise((resolve, reject) => {
            console.log(`[Assembler] Stitching ${inputPaths.length} videos...`);

            const command = ffmpeg();

            // Add inputs
            inputPaths.forEach(p => {
                command.input(p);
            });

            command
                .on('error', (err) => {
                    console.error('[Assembler] Error:', err.message);
                    reject(err);
                })
                .on('end', () => {
                    console.log('[Assembler] Processing finished!');
                    resolve();
                })
                .mergeToFile(outputPath, path.dirname(outputPath)); // mergeToFile handles complex filters for concat automatically usually, or uses concat protocol
        });
    }
}
