import { NoteEngagement } from '../note_automation/note_engagement';

/**
 * Note コメント周り実行スクリプト
 * 
 * 使い方:
 *   npm run note:engage              # 通常実行（いいね + コメント）
 *   npm run note:engage -- --dry-run # ドライラン（アクションなし）
 *   npm run note:engage -- --like-only # いいねのみ
 *   npm run note:engage -- --limit 5 # 処理件数を指定
 */

async function main() {
    const args = process.argv.slice(2);

    const dryRun = args.includes('--dry-run');
    const likeOnly = args.includes('--like-only');

    // --limit オプション
    const limitIndex = args.indexOf('--limit');
    const limit = limitIndex !== -1 ? parseInt(args[limitIndex + 1], 10) : 10;

    // --tag オプション（複数指定可能）
    const tags: string[] = [];
    args.forEach((arg, i) => {
        if (arg === '--tag' && args[i + 1]) {
            tags.push(args[i + 1]);
        }
    });

    console.log('========================================');
    console.log('   GEORGE: Note Engagement Mode');
    console.log('========================================');
    console.log(`Dry run: ${dryRun}`);
    console.log(`Like only: ${likeOnly}`);
    console.log(`Limit: ${limit}`);
    if (tags.length > 0) {
        console.log(`Custom tags: ${tags.join(', ')}`);
    }
    console.log('');

    const engagement = new NoteEngagement();

    try {
        await engagement.runEngagement({
            tags: tags.length > 0 ? tags : undefined,
            limit,
            dryRun,
            likeOnly,
        });
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

main();
