import { execSync } from 'child_process';
import path from 'path';
import { notifySlack } from '../utils/slack_notifier';
import dotenv from 'dotenv';
dotenv.config();

// Helper to run ts-node scripts cross-platform
function runTsNode(scriptPath: string, args: string = '') {
    const projectRoot = path.resolve(__dirname, '../..');
    const tsNodeBin = path.join(projectRoot, 'node_modules', 'ts-node', 'dist', 'bin.js');
    const cmd = `node "${tsNodeBin}" "${scriptPath}" ${args}`;
    execSync(cmd, { stdio: 'inherit', cwd: projectRoot });
}

// Helper to run ts-node scripts with error catching (non-critical phases)
function runTsNodeSafe(scriptPath: string, phaseName: string, args: string = ''): boolean {
    try {
        runTsNode(scriptPath, args);
        return true;
    } catch (error) {
        console.warn(`[WARNING] ${phaseName} failed (non-critical):`, error);
        return false;
    }
}

async function main() {
    console.log("==========================================");
    console.log("   GEORGE: DAILY KAIZEN CYCLE STARTING    ");
    console.log("==========================================");

    const scriptsDir = __dirname;
    const shouldPost = process.argv.includes('--post');

    try {
        // 1. CHECK PHASE: Collect Metrics (NON-CRITICAL - can fail without stopping)
        console.log("\n[PHASE 1] Checking Metrics...");
        const metricsOk = runTsNodeSafe(path.join(scriptsDir, 'check_metrics.ts'), 'Metrics Check');
        if (!metricsOk) {
            console.log("[PHASE 1] Skipped due to error. Continuing to content generation...");
        }

        // 2. ANALYZE & ACT PHASE: Generate & Post Content (CRITICAL)
        console.log("\n[PHASE 2] Generating Content...");
        runTsNode(path.join(scriptsDir, 'run_psychology_test.ts'), shouldPost ? '--post' : '');

        // 3. LOGGING PHASE: Export to Obsidian (NON-CRITICAL)
        console.log("\n[PHASE 3] Logging to Obsidian...");
        runTsNodeSafe(path.join(scriptsDir, 'log_to_obsidian.ts'), 'Obsidian Logging');

        console.log("\n==========================================");
        console.log("   GEORGE: CYCLE COMPLETED SUCCESSFULLY   ");
        console.log("==========================================");

        // 4. NOTIFY: Send success to Slack
        await notifySlack(`Daily Cycle 完了 (${new Date().toLocaleString('ja-JP')})`);

    } catch (error) {
        console.error("\n[ERROR] Daily Cycle Failed:", error);
        await notifySlack(`Daily Cycle 失敗: ${error}`, true);
        process.exit(1);
    }
}

main().catch(console.error);
