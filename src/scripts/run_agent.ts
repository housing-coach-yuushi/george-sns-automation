import { AutonomousAgent } from '../agent/autonomous_agent';

/**
 * GEORGE 自律PDCAエージェント実行スクリプト
 * 
 * 使い方:
 *   npm run agent              # PDCAサイクルを1回実行
 *   npm run agent -- --analyze # 分析のみ
 *   npm run agent -- --optimize # 最適化のみ
 *   npm run agent -- --memory  # メモリサマリー表示
 */

async function main() {
    const args = process.argv.slice(2);
    const agent = new AutonomousAgent();

    console.log('========================================');
    console.log('   GEORGE AUTONOMOUS AGENT');
    console.log('========================================\n');

    if (args.includes('--analyze')) {
        // 分析モード
        await agent.analyzeOnly();
    } else if (args.includes('--optimize')) {
        // 最適化モード
        const summary = await agent.optimizeOnly();
        console.log(summary);
    } else if (args.includes('--memory')) {
        // メモリ表示モード
        console.log(agent.getMemorySummary());
    } else {
        // フルPDCAサイクル
        const result = await agent.runCycle();

        if (result.success) {
            console.log('\n✅ PDCAサイクル完了');
            if (result.optimizations.length > 0) {
                console.log(`📈 最適化: ${result.optimizations.join(', ')}`);
            }
        } else {
            console.log('\n❌ PDCAサイクル失敗');
        }
    }

    console.log('\n🎉 エージェント完了');
}

main().catch(error => {
    console.error('❌ エージェントエラー:', error);
    process.exit(1);
});
