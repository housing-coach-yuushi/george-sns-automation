import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';
import { AgentMemoryManager, AgentMemory } from './agent_memory';
import { AgentAnalyzer } from './agent_analyzer';

dotenv.config();

/**
 * エージェントの自動最適化エンジン
 * 分析結果に基づいて戦略を自動調整
 */
export class AgentOptimizer {
    private anthropic: Anthropic;
    private memoryManager: AgentMemoryManager;
    private analyzer: AgentAnalyzer;

    constructor(memoryManager: AgentMemoryManager) {
        this.anthropic = new Anthropic({
            apiKey: process.env.ANTHROPIC_API_KEY,
        });
        this.memoryManager = memoryManager;
        this.analyzer = new AgentAnalyzer(memoryManager);
    }

    /**
     * タグ優先度を最適化
     */
    async optimizeTags(): Promise<{ oldTags: string[]; newTags: string[]; reason: string }> {
        const memory = this.memoryManager.getMemory();
        const tags = memory.successPatterns.tags;
        const currentTags = memory.currentStrategy.priorityTags;

        // スコアが高いタグを優先
        const sortedTags = Object.entries(tags)
            .sort(([, a], [, b]) => b.score - a.score)
            .map(([tag]) => tag);

        // 新しいタグがあれば追加、低スコアは除外
        const newTags = [...new Set([...sortedTags.slice(0, 3), ...currentTags])].slice(0, 5);

        if (JSON.stringify(newTags) !== JSON.stringify(currentTags)) {
            this.memoryManager.updateStrategy({ priorityTags: newTags });
            this.memoryManager.recordOptimization(
                `タグ優先度更新: ${newTags.join(', ')}`,
                '過去のエンゲージメントデータに基づく最適化'
            );
            return { oldTags: currentTags, newTags, reason: 'スコアベースの再優先順位付け' };
        }

        return { oldTags: currentTags, newTags: currentTags, reason: '変更なし' };
    }

    /**
     * コメントトーンを最適化
     */
    async optimizeCommentTone(): Promise<{ suggestion: string; applied: boolean }> {
        const memory = this.memoryManager.getMemory();
        const successStyles = memory.successPatterns.commentStyles
            .filter(s => s.successRate > 0.5)
            .sort((a, b) => b.successRate - a.successRate);

        if (successStyles.length === 0) {
            return { suggestion: '十分なデータがありません', applied: false };
        }

        const bestStyle = successStyles[0];
        const currentTone = memory.currentStrategy.commentTone;

        if (!currentTone.includes(bestStyle.style)) {
            const newTone = `${bestStyle.style}：成功率${(bestStyle.successRate * 100).toFixed(0)}%`;
            this.memoryManager.updateStrategy({ commentTone: newTone });
            this.memoryManager.recordOptimization(
                `コメントトーン更新: ${newTone}`,
                `成功率${(bestStyle.successRate * 100).toFixed(0)}%のスタイルを採用`
            );
            return { suggestion: newTone, applied: true };
        }

        return { suggestion: currentTone, applied: false };
    }

    /**
     * アカウント戦略を最適化（AI推論ベース）
     */
    async optimizeAccountStrategy(): Promise<{
        currentStrategy: AgentMemory['currentStrategy'];
        suggestedChanges: string[];
        aiReasoning: string;
    }> {
        const memory = this.memoryManager.getMemory();
        const suggestions = await this.analyzer.generateImprovementSuggestions();

        const prompt = `あなたはSNSマーケティング最適化AIです。
以下の分析結果と現在の戦略を見て、具体的な戦略変更を提案してください。

## 現在の戦略
${JSON.stringify(memory.currentStrategy, null, 2)}

## 分析結果
${suggestions.analysis}

## 改善提案
${suggestions.suggestions.join('\n')}

## 直近の最適化履歴
${memory.optimizationHistory.slice(-3).map(o => `- ${o.change}`).join('\n') || 'なし'}

以下をJSON形式で回答してください（他の説明不要、JSONのみ）:
{
  "targetAudience": "更新後のターゲット説明（変更不要なら現在値）",
  "postFrequency": 投稿頻度（1日あたり、数値）,
  "engagementLimit": エンゲージメント上限（1日あたり、数値）,
  "reasoning": "変更理由の説明"
}`;

        const response = await this.anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 500,
            messages: [{ role: 'user', content: prompt }],
        });

        const text = (response.content[0] as { text: string }).text;

        try {
            // JSONを抽出
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                const changes: string[] = [];

                // 変更を適用
                if (parsed.targetAudience && parsed.targetAudience !== memory.currentStrategy.targetAudience) {
                    changes.push(`ターゲット: ${parsed.targetAudience}`);
                }
                if (parsed.postFrequency && parsed.postFrequency !== memory.currentStrategy.postFrequency) {
                    changes.push(`投稿頻度: ${parsed.postFrequency}回/日`);
                }
                if (parsed.engagementLimit && parsed.engagementLimit !== memory.currentStrategy.engagementLimit) {
                    changes.push(`エンゲージメント上限: ${parsed.engagementLimit}件/日`);
                }

                if (changes.length > 0) {
                    this.memoryManager.updateStrategy({
                        targetAudience: parsed.targetAudience,
                        postFrequency: parsed.postFrequency,
                        engagementLimit: parsed.engagementLimit,
                    });
                    this.memoryManager.recordOptimization(
                        changes.join(', '),
                        parsed.reasoning || 'AI推論による最適化'
                    );
                }

                return {
                    currentStrategy: this.memoryManager.getMemory().currentStrategy,
                    suggestedChanges: changes,
                    aiReasoning: parsed.reasoning || '',
                };
            }
        } catch (e) {
            console.error('Failed to parse AI response:', e);
        }

        return {
            currentStrategy: memory.currentStrategy,
            suggestedChanges: [],
            aiReasoning: 'パース失敗',
        };
    }

    /**
     * 投稿コンテンツ戦略を最適化
     */
    async optimizeContentStrategy(): Promise<{
        recommendedThemes: string[];
        avoidThemes: string[];
        contentTips: string[];
    }> {
        const postAnalysis = await this.analyzer.analyzePostPerformance();
        const memory = this.memoryManager.getMemory();

        // ベストテーマを推奨、ワーストを回避
        const recommendedThemes = postAnalysis.bestTheme !== 'unknown'
            ? [postAnalysis.bestTheme]
            : memory.successPatterns.contentThemes.slice(0, 3).map(t => t.theme);

        const avoidThemes = [
            postAnalysis.worstTheme,
            ...memory.failurePatterns.lowPerformanceThemes,
        ].filter(t => t && t !== 'unknown');

        // AIからコンテンツのコツを取得
        const prompt = `SNS投稿のコンテンツ最適化について、以下のデータに基づいて3つの具体的なアドバイスを簡潔に（各20文字以内で）回答してください。

- ベストテーマ: ${postAnalysis.bestTheme}
- 平均インプレッション: ${postAnalysis.avgImpressions.toFixed(0)}
- 成功したテーマ: ${recommendedThemes.join(', ')}

回答は箇条書きで3行のみ:`;

        const response = await this.anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 200,
            messages: [{ role: 'user', content: prompt }],
        });

        const text = (response.content[0] as { text: string }).text;
        const tips = text.split('\n')
            .filter(line => line.trim().length > 0)
            .slice(0, 3)
            .map(line => line.replace(/^[-•*]\s*/, '').trim());

        return {
            recommendedThemes,
            avoidThemes,
            contentTips: tips,
        };
    }

    /**
     * 全体最適化を実行
     */
    async runFullOptimization(): Promise<{
        tagsOptimized: boolean;
        toneOptimized: boolean;
        strategyOptimized: boolean;
        contentOptimized: boolean;
        summary: string;
    }> {
        console.log('🔧 Running full optimization...');

        const tagResult = await this.optimizeTags();
        const toneResult = await this.optimizeCommentTone();
        const strategyResult = await this.optimizeAccountStrategy();
        const contentResult = await this.optimizeContentStrategy();

        const summary = `
## 最適化完了

### タグ最適化
${tagResult.reason}
${tagResult.newTags.join(', ')}

### トーン最適化
${toneResult.applied ? toneResult.suggestion : '変更なし'}

### 戦略最適化
${strategyResult.suggestedChanges.length > 0 ? strategyResult.suggestedChanges.join('\n') : '変更なし'}
理由: ${strategyResult.aiReasoning}

### コンテンツ最適化
推奨テーマ: ${contentResult.recommendedThemes.join(', ')}
回避テーマ: ${contentResult.avoidThemes.join(', ') || 'なし'}
コツ: ${contentResult.contentTips.join(' / ')}
`;

        console.log(summary);

        return {
            tagsOptimized: tagResult.newTags !== tagResult.oldTags,
            toneOptimized: toneResult.applied,
            strategyOptimized: strategyResult.suggestedChanges.length > 0,
            contentOptimized: contentResult.recommendedThemes.length > 0,
            summary,
        };
    }
}
