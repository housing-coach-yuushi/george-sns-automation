import * as fs from 'fs';
import * as path from 'path';

const MEMORY_PATH = path.resolve(__dirname, '../../data/agent_memory.json');

/**
 * エージェントの学習データを管理
 */
export interface AgentMemory {
    // メタデータ
    lastUpdated: string;
    totalCycles: number;

    // 成功パターン
    successPatterns: {
        tags: { [tag: string]: { engagements: number; followers: number; score: number } };
        commentStyles: { style: string; successRate: number; examples: string[] }[];
        postingTimes: { hour: number; successRate: number }[];
        contentThemes: { theme: string; impressions: number; engagement: number }[];
    };

    // 失敗パターン（回避リスト）
    failurePatterns: {
        avoidTags: string[];
        avoidPhrases: string[];
        lowPerformanceThemes: string[];
    };

    // 現在の戦略
    currentStrategy: {
        priorityTags: string[];
        commentTone: string;
        targetAudience: string;
        postFrequency: number;
        engagementLimit: number;
    };

    // 最適化履歴
    optimizationHistory: {
        date: string;
        change: string;
        reason: string;
        result?: string;
    }[];

    // KPI追跡
    kpiTracking: {
        date: string;
        followers: number;
        impressions: number;
        engagements: number;
        posts: number;
        comments: number;
    }[];
}

export class AgentMemoryManager {
    private memory: AgentMemory;

    constructor() {
        this.memory = this.load();
    }

    /**
     * メモリをロード（なければ初期化）
     */
    private load(): AgentMemory {
        if (fs.existsSync(MEMORY_PATH)) {
            return JSON.parse(fs.readFileSync(MEMORY_PATH, 'utf-8'));
        }
        return this.createInitialMemory();
    }

    /**
     * 初期メモリを作成
     */
    private createInitialMemory(): AgentMemory {
        return {
            lastUpdated: new Date().toISOString(),
            totalCycles: 0,
            successPatterns: {
                tags: {},
                commentStyles: [
                    {
                        style: 'ツンデレ褒め',
                        successRate: 0.7,
                        examples: [
                            'フン、悪くないじゃないか',
                            'まあ、嫌いじゃないよ',
                        ],
                    },
                ],
                postingTimes: [],
                contentThemes: [
                    { theme: '承認欲求', impressions: 0, engagement: 0 },
                    { theme: '自己顕示', impressions: 0, engagement: 0 },
                    { theme: '成功への飢餓', impressions: 0, engagement: 0 },
                ],
            },
            failurePatterns: {
                avoidTags: [],
                avoidPhrases: [],
                lowPerformanceThemes: [],
            },
            currentStrategy: {
                priorityTags: ['心理学', '自己啓発', '占い', 'タロット', 'メンタルヘルス'],
                commentTone: 'ツンデレ褒め：毒舌だが愛情がある',
                targetAudience: '自己成長に興味がある20-40代',
                postFrequency: 1, // 1日1回
                engagementLimit: 20, // 1日20件まで
            },
            optimizationHistory: [],
            kpiTracking: [],
        };
    }

    /**
     * メモリを保存
     */
    save(): void {
        this.memory.lastUpdated = new Date().toISOString();
        const dir = path.dirname(MEMORY_PATH);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(MEMORY_PATH, JSON.stringify(this.memory, null, 2));
    }

    /**
     * タグの成功データを更新
     */
    updateTagSuccess(tag: string, engagements: number, followers: number): void {
        if (!this.memory.successPatterns.tags[tag]) {
            this.memory.successPatterns.tags[tag] = { engagements: 0, followers: 0, score: 0 };
        }
        const tagData = this.memory.successPatterns.tags[tag];
        tagData.engagements += engagements;
        tagData.followers += followers;
        tagData.score = tagData.engagements * 0.3 + tagData.followers * 0.7;
        this.save();
    }

    /**
     * KPIを記録
     */
    recordKPI(data: Omit<AgentMemory['kpiTracking'][0], 'date'>): void {
        this.memory.kpiTracking.push({
            date: new Date().toISOString().split('T')[0],
            ...data,
        });
        // 90日分のみ保持
        if (this.memory.kpiTracking.length > 90) {
            this.memory.kpiTracking = this.memory.kpiTracking.slice(-90);
        }
        this.save();
    }

    /**
     * 最適化を記録
     */
    recordOptimization(change: string, reason: string): void {
        this.memory.optimizationHistory.push({
            date: new Date().toISOString(),
            change,
            reason,
        });
        this.memory.totalCycles++;
        this.save();
    }

    /**
     * 現在の戦略を更新
     */
    updateStrategy(updates: Partial<AgentMemory['currentStrategy']>): void {
        this.memory.currentStrategy = { ...this.memory.currentStrategy, ...updates };
        this.save();
    }

    /**
     * 成功したコメント例を追加
     */
    addSuccessfulComment(style: string, comment: string): void {
        const styleData = this.memory.successPatterns.commentStyles.find(s => s.style === style);
        if (styleData) {
            if (!styleData.examples.includes(comment)) {
                styleData.examples.push(comment);
                // 最新20件のみ保持
                if (styleData.examples.length > 20) {
                    styleData.examples = styleData.examples.slice(-20);
                }
            }
        }
        this.save();
    }

    /**
     * 回避すべきタグを追加
     */
    addAvoidTag(tag: string): void {
        if (!this.memory.failurePatterns.avoidTags.includes(tag)) {
            this.memory.failurePatterns.avoidTags.push(tag);
            this.save();
        }
    }

    /**
     * 優先タグを取得（スコア順）
     */
    getPriorityTags(): string[] {
        const tags = this.memory.successPatterns.tags;
        const sorted = Object.entries(tags)
            .sort(([, a], [, b]) => b.score - a.score)
            .map(([tag]) => tag);

        // 学習データがあればそれを優先、なければデフォルト
        if (sorted.length >= 3) {
            return sorted.slice(0, 5);
        }
        return this.memory.currentStrategy.priorityTags;
    }

    /**
     * メモリ全体を取得
     */
    getMemory(): AgentMemory {
        return this.memory;
    }

    /**
     * サマリーを取得（レポート用）
     */
    getSummary(): string {
        const mem = this.memory;
        const recentKPI = mem.kpiTracking.slice(-7);
        const totalFollowers = recentKPI.reduce((sum, k) => sum + k.followers, 0);
        const totalEngagements = recentKPI.reduce((sum, k) => sum + k.engagements, 0);

        return `
## エージェントメモリサマリー

- **総サイクル数**: ${mem.totalCycles}
- **最終更新**: ${mem.lastUpdated}

### 過去7日のKPI
- フォロワー増加: ${totalFollowers}
- エンゲージメント: ${totalEngagements}

### 現在の戦略
- 優先タグ: ${mem.currentStrategy.priorityTags.join(', ')}
- コメントトーン: ${mem.currentStrategy.commentTone}

### トップ成功タグ
${Object.entries(mem.successPatterns.tags)
                .sort(([, a], [, b]) => b.score - a.score)
                .slice(0, 5)
                .map(([tag, data]) => `- ${tag}: スコア ${data.score.toFixed(1)}`)
                .join('\n')}
`;
    }
}
