import fs from 'fs';
import path from 'path';

interface PostLog {
    id: string;
    timestamp: string;
    theme: string;
    card: string;
    content: {
        question: string;
        options: string[];
    };
    output: {
        tweetId?: string;
        noteUrl?: string;
        imagePath: string;
    };
    metrics?: {
        likes?: number;
        impressions?: number;
    }
}

async function main() {
    console.log("--- Logging to Obsidian ---");

    // 1. Read latest history
    const historyPath = path.resolve(__dirname, '../../data/post_history.json');
    if (!fs.existsSync(historyPath)) {
        console.error("No history file found.");
        process.exit(1);
    }

    const history: PostLog[] = JSON.parse(fs.readFileSync(historyPath, 'utf-8'));
    if (history.length === 0) {
        console.log("No history to log.");
        return;
    }

    const lastEntry = history[history.length - 1];

    // 2. Format Markdown
    const date = new Date(lastEntry.timestamp).toISOString().split('T')[0];
    const vaultPath = '/Users/yuushinakashima/Library/CloudStorage/GoogleDrive-yuushi226@gmail.com/マイドライブ/obsidian';
    const logDir = path.join(vaultPath, 'George_Logs');

    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
    }

    // Determine Strategy Info (Simple inference for now, or just generic)
    // In future, we can add a 'strategy' field to the history log itself

    let content = `# George Activity Log: ${date}\n\n`;
    content += `## 🃏 Daily Theme: ${lastEntry.theme}\n`;
    content += `- **Card**: ${lastEntry.card}\n`;
    content += `- **Question**: ${lastEntry.content.question.replace(/\n/g, ' ')}\n`;

    if (lastEntry.output.tweetId !== "DRY_RUN") {
        content += `- **X Post**: [Tweet Link](https://twitter.com/i/web/status/${lastEntry.output.tweetId})\n`;
    } else {
        content += `- **X Post**: Dry Run\n`;
    }

    if (lastEntry.output.noteUrl && lastEntry.output.noteUrl !== "DRY_RUN") {
        content += `- **Note Article**: [Note Link](${lastEntry.output.noteUrl})\n`;
    } else {
        content += `- **Note Article**: Dry Run (${lastEntry.output.noteUrl})\n`;
    }

    content += `\n## 📝 Generated Diagnostics\n`;
    lastEntry.content.options.forEach((opt, index) => {
        content += `- **Option ${String.fromCharCode(65 + index)}**: ${opt}\n`;
    });

    // Add Image if available
    // Obsidian can link to local files, but absolute paths might be tricky across devices. 
    // For now, we won't embed the image to avoid broken links, or just mention path.
    // content += `\n![Card Image](file://${lastEntry.output.imagePath})\n`;

    const fileName = `George_${date}.md`;
    const filePath = path.join(logDir, fileName);

    fs.writeFileSync(filePath, content);
    console.log(`[SUCCESS] Log saved to Obsidian: ${filePath}`);
}

main().catch(console.error);
