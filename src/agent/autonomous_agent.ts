import dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { AgentMemoryManager } from './agent_memory';
import { AgentAnalyzer } from './agent_analyzer';
import { AgentOptimizer } from './agent_optimizer';
import { NoteEngagement } from '../note_automation/note_engagement';

dotenv.config();

const REPORT_DIR = path.resolve(__dirname, '../../generated/reports');

/**
 * GEORGE 自律PDCAエージェント
 * 
 * PDCAサイクルを自動実行：
 * - Plan: 戦略を決定
 * - Do: 投稿とエンゲージメント
 * - Check: 結果を分析
 * - Act: 戦略を改善
 */
export class AutonomousAgent {
    private memoryManager: AgentMemoryManager;
    private analyzer: AgentAnalyzer;
    private optimizer: AgentOptimizer;
    private engagement: NoteEngagement;

    constructor() {
        this.memoryManager = new AgentMemoryManager();
        this.analyzer = new AgentAnalyzer(this.memoryManager);
        this.optimizer = new AgentOptimizer(this.memoryManager);
        this.engagement = new NoteEngagement();
    }

    /**
     * PLAN: 今日の戦略を決定
     */
    async plan(): Promise<{
        tags: string[];
        engagementLimit: number;
        strategy: string;
    }> {
        console.log('\n🎯 [PLAN] 戦略を決定中...');

        const memory = this.memoryManager.getMemory();
        const priorityTags = this.memoryManager.getPriorityTags();

        console.log(`  優先タグ: ${priorityTags.join(', ')}`);
        console.log(`  エンゲージメント上限: ${memory.currentStrategy.engagementLimit}`);
        console.log(`  トーン: ${memory.currentStrategy.commentTone}`);

        return {
            tags: priorityTags,
            engagementLimit: memory.currentStrategy.engagementLimit,
            strategy: memory.currentStrategy.commentTone,
        };
    }

    /**
     * DO: エンゲージメントを実行
     */
    async execute(plan: { tags: string[]; engagementLimit: number }): Promise<{
        processed: number;
        success: boolean;
    }> {
        console.log('\n🚀 [DO] エンゲージメント実行中...');

        try {
            await this.engagement.runEngagement({
                tags: plan.tags,
                limit: Math.min(plan.engagementLimit, 10), // 1回の実行は最大10件
                dryRun: false,
            });

            const todayCount = this.engagement.getTodayCount();
            console.log(`  処理完了: ${todayCount}件`);

            return { processed: todayCount, success: true };
        } catch (error) {
            console.error('  実行エラー:', error);
            return { processed: 0, success: false };
        }
    }

    /**
     * CHECK: 結果を分析
     */
    async check(): Promise<{
        report: string;
        metrics: {
            likes: number;
            comments: number;
            successRate: number;
        };
    }> {
        console.log('\n📊 [CHECK] 結果を分析中...');

        const engagement = await this.analyzer.analyzeTodayEngagement();
        const report = await this.analyzer.generateDailyReport();

        const total = engagement.totalLikes + engagement.totalComments;
        const successRate = total > 0
            ? engagement.totalComments / total
            : 0;

        console.log(`  いいね: ${engagement.totalLikes}`);
        console.log(`  コメント成功: ${engagement.totalComments}`);
        console.log(`  成功率: ${(successRate * 100).toFixed(1)}%`);

        // KPIを記録
        this.memoryManager.recordKPI({
            followers: 0, // 実際はAPIで取得
            impressions: 0,
            engagements: engagement.totalLikes + engagement.totalComments,
            posts: 1,
            comments: engagement.totalComments,
        });

        return {
            report,
            metrics: {
                likes: engagement.totalLikes,
                comments: engagement.totalComments,
                successRate,
            },
        };
    }

    /**
     * ACT: 戦略を改善
     */
    async act(): Promise<{
        optimized: boolean;
        changes: string[];
    }> {
        console.log('\n🔧 [ACT] 戦略を改善中...');

        const result = await this.optimizer.runFullOptimization();

        const changes: string[] = [];
        if (result.tagsOptimized) changes.push('タグ優先度更新');
        if (result.toneOptimized) changes.push('コメントトーン更新');
        if (result.strategyOptimized) changes.push('アカウント戦略更新');
        if (result.contentOptimized) changes.push('コンテンツ戦略更新');

        console.log(`  変更: ${changes.length > 0 ? changes.join(', ') : 'なし'}`);

        return {
            optimized: changes.length > 0,
            changes,
        };
    }

    /**
     * PDCAサイクルを1回実行
     */
    async runCycle(): Promise<{
        success: boolean;
        report: string;
        optimizations: string[];
    }> {
        console.log('\n========================================');
        console.log('   GEORGE: PDCA CYCLE STARTING');
        console.log('========================================');

        try {
            // PLAN
            const plan = await this.plan();

            // DO
            const execution = await this.execute(plan);

            // CHECK
            const analysis = await this.check();

            // ACT
            const improvement = await this.act();

            // レポートを保存
            await this.saveReport(analysis.report);

            console.log('\n========================================');
            console.log('   GEORGE: PDCA CYCLE COMPLETE');
            console.log('========================================');

            return {
                success: execution.success,
                report: analysis.report,
                optimizations: improvement.changes,
            };
        } catch (error) {
            console.error('PDCAサイクルエラー:', error);
            return {
                success: false,
                report: `エラー: ${error}`,
                optimizations: [],
            };
        }
    }

    /**
     * レポートを保存
     */
    private async saveReport(report: string): Promise<void> {
        if (!fs.existsSync(REPORT_DIR)) {
            fs.mkdirSync(REPORT_DIR, { recursive: true });
        }

        const today = new Date().toISOString().split('T')[0];
        const reportPath = path.join(REPORT_DIR, `report_${today}.md`);
        fs.writeFileSync(reportPath, report);
        console.log(`\n📁 レポート保存: ${reportPath}`);
    }

    /**
     * 分析のみ実行（最適化の確認用）
     */
    async analyzeOnly(): Promise<string> {
        console.log('\n📊 分析モード実行中...');
        const report = await this.analyzer.generateDailyReport();
        console.log(report);
        return report;
    }

    /**
     * 最適化のみ実行
     */
    async optimizeOnly(): Promise<string> {
        console.log('\n🔧 最適化モード実行中...');
        const result = await this.optimizer.runFullOptimization();
        return result.summary;
    }

    /**
     * メモリサマリーを取得
     */
    getMemorySummary(): string {
        return this.memoryManager.getSummary();
    }
}
