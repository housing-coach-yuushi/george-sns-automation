import Anthropic from '@anthropic-ai/sdk';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';
import { AgentMemoryManager } from './agent_memory';

dotenv.config();

const HISTORY_PATH = path.resolve(__dirname, '../../data/engagement_history.json');
const POST_HISTORY_PATH = path.resolve(__dirname, '../../data/post_history.json');

/**
 * エージェントの分析エンジン
 * 結果を分析し、改善提案を生成
 */
export class AgentAnalyzer {
    private anthropic: Anthropic;
    private memoryManager: AgentMemoryManager;

    constructor(memoryManager: AgentMemoryManager) {
        this.anthropic = new Anthropic({
            apiKey: process.env.ANTHROPIC_API_KEY,
        });
        this.memoryManager = memoryManager;
    }

    /**
     * エンゲージメント履歴を読み込み
     */
    private loadEngagementHistory(): any[] {
        if (fs.existsSync(HISTORY_PATH)) {
            return JSON.parse(fs.readFileSync(HISTORY_PATH, 'utf-8'));
        }
        return [];
    }

    /**
     * 投稿履歴を読み込み
     */
    private loadPostHistory(): any[] {
        if (fs.existsSync(POST_HISTORY_PATH)) {
            return JSON.parse(fs.readFileSync(POST_HISTORY_PATH, 'utf-8'));
        }
        return [];
    }

    /**
     * 今日のエンゲージメント分析
     */
    async analyzeTodayEngagement(): Promise<{
        totalLikes: number;
        totalComments: number;
        successfulTags: string[];
        failedTags: string[];
    }> {
        const history = this.loadEngagementHistory();
        const today = new Date().toISOString().split('T')[0];
        const todayData = history.find((h: any) => h.date === today);

        if (!todayData) {
            return { totalLikes: 0, totalComments: 0, successfulTags: [], failedTags: [] };
        }

        const articles = todayData.articles || [];
        const tagCounts: { [tag: string]: { success: number; fail: number } } = {};

        articles.forEach((article: any) => {
            // URLからタグを推測（実際は記事のタグ情報が必要）
            const isSuccess = article.action === 'both' || article.action === 'comment';

            // タグの仮抽出（URLベース）
            const urlParts = article.url?.split('/') || [];
            const tag = urlParts.length > 3 ? urlParts[3] : 'unknown';

            if (!tagCounts[tag]) {
                tagCounts[tag] = { success: 0, fail: 0 };
            }
            if (isSuccess) {
                tagCounts[tag].success++;
            } else {
                tagCounts[tag].fail++;
            }
        });

        const successfulTags = Object.entries(tagCounts)
            .filter(([, data]) => data.success > data.fail)
            .map(([tag]) => tag);

        const failedTags = Object.entries(tagCounts)
            .filter(([, data]) => data.fail > data.success)
            .map(([tag]) => tag);

        return {
            totalLikes: articles.filter((a: any) => a.action !== 'comment').length,
            totalComments: articles.filter((a: any) => a.action === 'both' || a.action === 'comment').length,
            successfulTags,
            failedTags,
        };
    }

    /**
     * 投稿パフォーマンス分析
     */
    async analyzePostPerformance(): Promise<{
        bestTheme: string;
        worstTheme: string;
        avgImpressions: number;
        insights: string[];
    }> {
        const history = this.loadPostHistory();

        if (history.length === 0) {
            return {
                bestTheme: 'unknown',
                worstTheme: 'unknown',
                avgImpressions: 0,
                insights: ['投稿履歴がありません'],
            };
        }

        // テーマ別のパフォーマンス集計
        const themePerformance: { [theme: string]: { impressions: number; count: number } } = {};
        let totalImpressions = 0;

        history.forEach((post: any) => {
            const theme = post.theme || 'unknown';
            const impressions = post.impressions || 0;

            if (!themePerformance[theme]) {
                themePerformance[theme] = { impressions: 0, count: 0 };
            }
            themePerformance[theme].impressions += impressions;
            themePerformance[theme].count++;
            totalImpressions += impressions;
        });

        // ベスト/ワーストテーマを特定
        const themes = Object.entries(themePerformance)
            .map(([theme, data]) => ({
                theme,
                avgImpressions: data.impressions / data.count,
            }))
            .sort((a, b) => b.avgImpressions - a.avgImpressions);

        return {
            bestTheme: themes[0]?.theme || 'unknown',
            worstTheme: themes[themes.length - 1]?.theme || 'unknown',
            avgImpressions: totalImpressions / history.length,
            insights: [
                `ベストテーマ: ${themes[0]?.theme} (平均 ${themes[0]?.avgImpressions.toFixed(0)} imp)`,
                `改善が必要: ${themes[themes.length - 1]?.theme}`,
            ],
        };
    }

    /**
     * AIによる総合分析と改善提案
     */
    async generateImprovementSuggestions(): Promise<{
        analysis: string;
        suggestions: string[];
        priorityActions: string[];
    }> {
        const memory = this.memoryManager.getMemory();
        const engagementAnalysis = await this.analyzeTodayEngagement();
        const postAnalysis = await this.analyzePostPerformance();

        const prompt = `あなたはSNSマーケティングの専門家です。以下のデータを分析し、改善提案を行ってください。

## 現在の戦略
- 優先タグ: ${memory.currentStrategy.priorityTags.join(', ')}
- コメントトーン: ${memory.currentStrategy.commentTone}
- ターゲット: ${memory.currentStrategy.targetAudience}

## 今日のエンゲージメント
- いいね: ${engagementAnalysis.totalLikes}件
- コメント成功: ${engagementAnalysis.totalComments}件
- 成功タグ: ${engagementAnalysis.successfulTags.join(', ') || 'なし'}
- 失敗タグ: ${engagementAnalysis.failedTags.join(', ') || 'なし'}

## 投稿パフォーマンス
- ベストテーマ: ${postAnalysis.bestTheme}
- ワーストテーマ: ${postAnalysis.worstTheme}
- 平均インプレッション: ${postAnalysis.avgImpressions.toFixed(0)}

## 過去の最適化履歴
${memory.optimizationHistory.slice(-5).map(o => `- ${o.date}: ${o.change}`).join('\n') || 'なし'}

以下の形式で回答してください：

### 分析結果
（現状の問題点と成功要因を3行程度で）

### 改善提案
1. （具体的な改善案）
2. （具体的な改善案）
3. （具体的な改善案）

### 優先アクション
1. （今すぐ実行すべきこと）
2. （次に実行すべきこと）`;

        const response = await this.anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 1000,
            messages: [{ role: 'user', content: prompt }],
        });

        const text = (response.content[0] as { text: string }).text;

        // レスポンスをパース
        const analysisMatch = text.match(/### 分析結果\n([\s\S]*?)(?=### 改善提案|$)/);
        const suggestionsMatch = text.match(/### 改善提案\n([\s\S]*?)(?=### 優先アクション|$)/);
        const actionsMatch = text.match(/### 優先アクション\n([\s\S]*?)$/);

        const extractList = (text: string): string[] => {
            return text
                .split('\n')
                .filter(line => line.match(/^\d+\./))
                .map(line => line.replace(/^\d+\.\s*/, '').trim());
        };

        return {
            analysis: analysisMatch?.[1]?.trim() || '分析データが不足しています',
            suggestions: suggestionsMatch ? extractList(suggestionsMatch[1]) : [],
            priorityActions: actionsMatch ? extractList(actionsMatch[1]) : [],
        };
    }

    /**
     * 日次レポートを生成
     */
    async generateDailyReport(): Promise<string> {
        const engagement = await this.analyzeTodayEngagement();
        const post = await this.analyzePostPerformance();
        const suggestions = await this.generateImprovementSuggestions();
        const memorySummary = this.memoryManager.getSummary();

        return `
# 📊 GEORGE Daily Report - ${new Date().toISOString().split('T')[0]}

## 今日の成果

| 指標 | 結果 |
|-----|-----|
| いいね | ${engagement.totalLikes}件 |
| コメント | ${engagement.totalComments}件 |
| 平均インプレッション | ${post.avgImpressions.toFixed(0)} |

## 分析結果

${suggestions.analysis}

## 改善提案

${suggestions.suggestions.map((s, i) => `${i + 1}. ${s}`).join('\n')}

## 優先アクション

${suggestions.priorityActions.map((a, i) => `${i + 1}. ${a}`).join('\n')}

---

${memorySummary}
`;
    }
}
