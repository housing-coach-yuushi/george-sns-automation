import puppeteer, { Browser, Page } from 'puppeteer';
import dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import Anthropic from '@anthropic-ai/sdk';

dotenv.config();

const COOKIES_PATH = path.resolve(__dirname, '../../note_cookies.json');
const HISTORY_PATH = path.resolve(__dirname, '../../data/engagement_history.json');
const DAILY_LIMIT = 20;

// Helper function to replace deprecated waitForTimeout
const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

// ジョージのペルソナ（褒め専用）
const GEORGE_COMMENT_PROMPT = `あなたは「毒舌バーのマスター・ジョージ」として、Noteの記事にコメントをします。

【スタイル】
- 普段は毒舌だが、実は優しい心を持つバーのマスター
- 本質を見抜いて、シニカルに褒める
- 上から目線だけど、愛情がある
- 短く、的確に

【ルール】
- 傷つける表現は絶対NG
- 批判や否定はしない
- 記事の良いところを見つけて褒める
- 50-100文字程度

【トーン例】
「…フン、なかなかやるじゃないか。こういう視点、嫌いじゃないよ」
「ほう、わかってるじゃないか。俺が言いたいことを先に言われた気分だ」
「…これ、書くのに勇気いっただろ。その勇気、買うよ」

記事のタイトルと概要を読んで、ジョージらしいコメントを1つだけ生成してください。`;

interface EngagementHistory {
    date: string;
    articles: {
        url: string;
        title: string;
        action: 'like' | 'comment' | 'both';
        comment?: string;
        timestamp: string;
    }[];
}

interface ArticleInfo {
    url: string;
    title: string;
    excerpt: string;
    author: string;
}

export class NoteEngagement {
    private browser: Browser | null = null;
    private page: Page | null = null;
    private anthropic: Anthropic;

    constructor() {
        this.anthropic = new Anthropic({
            apiKey: process.env.ANTHROPIC_API_KEY,
        });
    }

    async initialize(): Promise<void> {
        console.log('Launching browser...');
        this.browser = await puppeteer.launch({
            headless: false,
            defaultViewport: { width: 1280, height: 800 },
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
            protocolTimeout: 120000, // 2分のタイムアウト
        });
        this.page = await this.browser.newPage();
        // ページタイムアウトを延長
        this.page.setDefaultTimeout(60000);

        // クッキーをロード
        if (fs.existsSync(COOKIES_PATH)) {
            const cookies = JSON.parse(fs.readFileSync(COOKIES_PATH, 'utf-8'));
            await this.page.setCookie(...cookies);
            console.log('Cookies loaded.');
        }
    }

    async close(): Promise<void> {
        if (this.browser) {
            await this.browser.close();
        }
    }

    /**
     * 今日の実行回数を取得
     */
    getTodayCount(): number {
        const today = new Date().toISOString().split('T')[0];
        if (!fs.existsSync(HISTORY_PATH)) {
            return 0;
        }
        const history: EngagementHistory[] = JSON.parse(fs.readFileSync(HISTORY_PATH, 'utf-8'));
        const todayHistory = history.find(h => h.date === today);
        return todayHistory?.articles.length || 0;
    }

    /**
     * タグで記事を検索
     */
    async searchArticlesByTag(tag: string, limit: number = 10): Promise<ArticleInfo[]> {
        if (!this.page) throw new Error('Browser not initialized');

        console.log(`Searching articles with tag: ${tag}...`);
        const searchUrl = `https://note.com/search?q=${encodeURIComponent(tag)}&context=note&mode=search`;
        await this.page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });
        await sleep(2000);

        // 記事リストを取得
        const articles = await this.page.evaluate((maxLimit) => {
            const items: ArticleInfo[] = [];
            // Note の検索結果の記事リスト (2025年現在のセレクタ)
            const articleElements = document.querySelectorAll('.m-largeNoteWrapper');

            articleElements.forEach((el, index) => {
                if (index >= maxLimit) return;

                const linkEl = el.querySelector('a.m-largeNoteWrapper__link') as HTMLAnchorElement;
                const authorEl = el.querySelector('a.o-largeNoteSummary__user');

                if (linkEl) {
                    // タイトルはリンクのtitle属性またはaria-labelから取得
                    const title = linkEl.getAttribute('title') || linkEl.getAttribute('aria-label') || linkEl.textContent?.trim() || '';

                    items.push({
                        url: linkEl.href,
                        title: title,
                        excerpt: '', // 概要は記事ページで取得
                        author: authorEl?.textContent?.trim() || 'unknown',
                    });
                }
            });
            return items;
        }, limit);

        console.log(`Found ${articles.length} articles.`);
        return articles;
    }

    /**
     * 人気の記事をホームから取得
     */
    async getPopularArticles(limit: number = 10): Promise<ArticleInfo[]> {
        if (!this.page) throw new Error('Browser not initialized');

        console.log('Getting popular articles from home...');
        await this.page.goto('https://note.com/', { waitUntil: 'networkidle2', timeout: 30000 });
        await sleep(2000);

        // スクロールして記事をロード
        await this.page.evaluate(() => window.scrollBy(0, 1000));
        await sleep(1000);

        const articles = await this.page.evaluate((maxLimit) => {
            const items: ArticleInfo[] = [];
            const linkElements = document.querySelectorAll('a[href*="/n/n"]');
            const seen = new Set<string>();

            linkElements.forEach((el) => {
                if (items.length >= maxLimit) return;

                const url = (el as HTMLAnchorElement).href;
                if (seen.has(url) || !url.includes('/n/n')) return;
                seen.add(url);

                // 親要素から情報を取得
                const container = el.closest('article') || el.closest('[class*="card"]') || el.parentElement;
                const titleEl = container?.querySelector('h3, h2, [class*="title"]');
                const excerptEl = container?.querySelector('[class*="body"], p:not([class*="author"])');
                const authorEl = container?.querySelector('[class*="creator"], [class*="name"]');

                if (titleEl) {
                    items.push({
                        url: url,
                        title: titleEl.textContent?.trim() || '',
                        excerpt: excerptEl?.textContent?.trim().substring(0, 200) || '',
                        author: authorEl?.textContent?.trim() || 'unknown',
                    });
                }
            });
            return items;
        }, limit);

        console.log(`Found ${articles.length} popular articles.`);
        return articles;
    }

    /**
     * 記事にいいね
     */
    async likeArticle(articleUrl: string): Promise<boolean> {
        if (!this.page) throw new Error('Browser not initialized');

        console.log(`Liking article: ${articleUrl}`);
        try {
            await this.page.goto(articleUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
            await sleep(3000); // ページの動的コンテンツ読み込みを待つ

            // スキ（いいね）ボタンを探してクリック - 複数のセレクタを試す
            const likeSelectors = [
                'button[data-action="like"]',
                '[class*="LikeButton"]',
                'button[aria-label*="スキ"]',
                '[class*="like"] button',
            ];

            for (const selector of likeSelectors) {
                const likeButton = await this.page.$(selector);
                if (likeButton) {
                    await likeButton.click();
                    console.log('Liked!');
                    await sleep(1000);
                    return true;
                }
            }

            // JavaScriptで直接操作を試みる
            const clicked = await this.page.evaluate(() => {
                // スキボタンを様々な方法で探す
                const selectors = [
                    '[class*="Like"] button',
                    'button[class*="like"]',
                    '[data-testid*="like"]',
                ];

                for (const sel of selectors) {
                    const el = document.querySelector(sel);
                    if (el) {
                        (el as HTMLElement).click();
                        return true;
                    }
                }

                // テキストで探す
                const buttons = Array.from(document.querySelectorAll('button, [role="button"]'));
                const likeBtn = buttons.find(btn =>
                    btn.textContent?.includes('スキ') ||
                    btn.getAttribute('aria-label')?.includes('スキ')
                );
                if (likeBtn) {
                    (likeBtn as HTMLElement).click();
                    return true;
                }
                return false;
            });

            if (clicked) {
                console.log('Liked!');
                return true;
            }

            console.log('Like button not found.');
            return false;
        } catch (error) {
            console.error('Failed to like:', error);
            return false;
        }
    }

    /**
     * AIでコメントを生成
     */
    async generateComment(title: string, excerpt: string): Promise<string> {
        console.log('Generating George-style comment...');

        const response = await this.anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 200,
            messages: [
                {
                    role: 'user',
                    content: `${GEORGE_COMMENT_PROMPT}\n\n【記事タイトル】\n${title}\n\n【記事の概要】\n${excerpt || '（概要なし）'}`,
                },
            ],
        });

        const comment = (response.content[0] as { text: string }).text.trim();
        console.log(`Generated: ${comment}`);
        return comment;
    }

    /**
     * 記事にコメント
     */
    async postComment(articleUrl: string, comment: string): Promise<boolean> {
        if (!this.page) throw new Error('Browser not initialized');

        console.log(`Posting comment to: ${articleUrl}`);
        await this.page.goto(articleUrl, { waitUntil: 'networkidle2', timeout: 30000 });
        await sleep(2000);

        // ページ下部のコメント欄までスクロール
        await this.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await sleep(1500);

        try {
            // コメント入力欄を探す
            const commentInput = await this.page.$('textarea[placeholder*="コメント"], textarea[class*="comment"], [contenteditable="true"][class*="comment"]');

            if (commentInput) {
                await commentInput.click();
                await sleep(500);
                await commentInput.type(comment, { delay: 50 });
                await sleep(500);

                // 送信ボタンを探してクリック
                const submitButton = await this.page.$('button[type="submit"], button[class*="submit"], button[class*="send"]');
                if (submitButton) {
                    await submitButton.click();
                    console.log('Comment posted!');
                    await sleep(2000);
                    return true;
                }
            }

            // 別の方法を試す（コメントリンクをクリック）
            const commentLink = await this.page.evaluate(() => {
                const links = Array.from(document.querySelectorAll('a, button'));
                const commentBtn = links.find(el => el.textContent?.includes('コメント'));
                if (commentBtn) {
                    (commentBtn as HTMLElement).click();
                    return true;
                }
                return false;
            });

            if (commentLink) {
                await sleep(1500);
                // 再度入力欄を探す
                const input = await this.page.$('textarea, [contenteditable="true"]');
                if (input) {
                    await input.click();
                    await input.type(comment, { delay: 50 });

                    // キーボードでEnterを押して送信
                    await this.page.keyboard.down('Meta');
                    await this.page.keyboard.press('Enter');
                    await this.page.keyboard.up('Meta');

                    console.log('Comment posted!');
                    await sleep(2000);
                    return true;
                }
            }

            console.log('Comment input not found.');
            return false;
        } catch (error) {
            console.error('Failed to post comment:', error);
            return false;
        }
    }

    /**
     * 履歴を保存
     */
    saveToHistory(article: ArticleInfo, action: 'like' | 'comment' | 'both', comment?: string): void {
        const today = new Date().toISOString().split('T')[0];
        let history: EngagementHistory[] = [];

        if (fs.existsSync(HISTORY_PATH)) {
            history = JSON.parse(fs.readFileSync(HISTORY_PATH, 'utf-8'));
        }

        let todayHistory = history.find(h => h.date === today);
        if (!todayHistory) {
            todayHistory = { date: today, articles: [] };
            history.push(todayHistory);
        }

        todayHistory.articles.push({
            url: article.url,
            title: article.title,
            action,
            comment,
            timestamp: new Date().toISOString(),
        });

        // ディレクトリがなければ作成
        const historyDir = path.dirname(HISTORY_PATH);
        if (!fs.existsSync(historyDir)) {
            fs.mkdirSync(historyDir, { recursive: true });
        }

        fs.writeFileSync(HISTORY_PATH, JSON.stringify(history, null, 2));
        console.log('Saved to history.');
    }

    /**
     * 既に処理済みかチェック
     */
    isAlreadyProcessed(articleUrl: string): boolean {
        if (!fs.existsSync(HISTORY_PATH)) return false;
        const history: EngagementHistory[] = JSON.parse(fs.readFileSync(HISTORY_PATH, 'utf-8'));
        return history.some(h => h.articles.some(a => a.url === articleUrl));
    }

    /**
     * メイン実行: いいね + コメント周り
     */
    async runEngagement(options: {
        tags?: string[];
        limit?: number;
        dryRun?: boolean;
        likeOnly?: boolean;
    } = {}): Promise<void> {
        const {
            tags = ['心理学', '自己啓発', '占い', 'タロット', 'メンタルヘルス'],
            limit = 10,
            dryRun = false,
            likeOnly = false,
        } = options;

        const todayCount = this.getTodayCount();
        const remaining = DAILY_LIMIT - todayCount;

        if (remaining <= 0) {
            console.log(`Daily limit reached (${DAILY_LIMIT}). Try again tomorrow.`);
            return;
        }

        const maxToProcess = Math.min(limit, remaining);
        console.log(`\n=== Note Engagement Start ===`);
        console.log(`Today's count: ${todayCount}/${DAILY_LIMIT}`);
        console.log(`Will process up to: ${maxToProcess} articles`);
        console.log(`Dry run: ${dryRun}`);
        console.log(`Like only: ${likeOnly}`);
        console.log(`Tags: ${tags.join(', ')}\n`);

        await this.initialize();

        let processed = 0;

        try {
            // 各タグから記事を収集
            for (const tag of tags) {
                if (processed >= maxToProcess) break;

                const articles = await this.searchArticlesByTag(tag, 5);

                for (const article of articles) {
                    if (processed >= maxToProcess) break;
                    if (this.isAlreadyProcessed(article.url)) {
                        console.log(`Skipping (already processed): ${article.title}`);
                        continue;
                    }

                    console.log(`\n--- Processing: ${article.title} ---`);
                    console.log(`URL: ${article.url}`);
                    console.log(`Author: ${article.author}`);

                    if (dryRun) {
                        console.log('[DRY RUN] Would like and comment on this article.');
                        const sampleComment = await this.generateComment(article.title, article.excerpt);
                        console.log(`[DRY RUN] Generated comment: ${sampleComment}`);
                    } else {
                        // いいね
                        await this.likeArticle(article.url);

                        // コメント
                        if (!likeOnly) {
                            const comment = await this.generateComment(article.title, article.excerpt);
                            await this.postComment(article.url, comment);
                            this.saveToHistory(article, 'both', comment);
                        } else {
                            this.saveToHistory(article, 'like');
                        }

                        // 次の記事まで待機（30-60秒）
                        const waitTime = 30000 + Math.random() * 30000;
                        console.log(`Waiting ${Math.round(waitTime / 1000)}s before next...`);
                        await new Promise(resolve => setTimeout(resolve, waitTime));
                    }

                    processed++;
                }
            }

            console.log(`\n=== Engagement Complete ===`);
            console.log(`Processed: ${processed} articles`);
            console.log(`Total today: ${this.getTodayCount()}/${DAILY_LIMIT}`);

        } finally {
            await this.close();
        }
    }
}
