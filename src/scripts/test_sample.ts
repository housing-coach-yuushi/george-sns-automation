import { FragmentGenerator } from '../x_image_post/fragment_generator';

async function test() {
    const generator = new FragmentGenerator();

    console.log("\n========================================");
    console.log("   新プロンプトでサンプル3つ生成");
    console.log("========================================\n");

    for (let i = 1; i <= 3; i++) {
        console.log(`\n--- サンプル ${i} ---`);
        const result = await generator.generateFragment();
        console.log(`\n📝 テキスト:\n${result.text}`);
        console.log(`\n🖼️ 画像: ${result.imageTitle}`);
        console.log("-------------------");
    }
}

test().catch(console.error);
