import path from 'path';
import { VideoAssembler } from '../utils/video_assembler';

async function main() {
    console.log("Testing Video Assembly...");
    const assembler = new VideoAssembler();

    const outputDir = path.resolve(__dirname, '../../generated/hailuo_test');

    // Hardcoded paths from previous run
    const inputPaths = [
        path.join(outputDir, 'THE_FOOL_scene1.mp4'),
        path.join(outputDir, 'THE_FOOL_scene2.mp4'),
        path.join(outputDir, 'THE_FOOL_scene3.mp4')
    ];

    const outputPath = path.join(outputDir, 'THE_FOOL_full.mp4');

    try {
        await assembler.concatVideos(inputPaths, outputPath);
        console.log(`SUCCESS! Video assembled at: ${outputPath}`);
    } catch (error) {
        console.error("Assembly failed:", error);
    }
}

main().catch(console.error);
