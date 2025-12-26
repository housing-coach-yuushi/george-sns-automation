
import { TwitterApi } from 'twitter-api-v2';
import puppeteer from 'puppeteer';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

async function checkX() {
    console.log("--- Checking X (Twitter) ---");
    if (!process.env.X_API_KEY || !process.env.X_ACCESS_TOKEN) {
        console.log("Skipping X: Missing credentials.");
        return;
    }

    try {
        const client = new TwitterApi({
            appKey: process.env.X_API_KEY,
            appSecret: process.env.X_API_SECRET,
            accessToken: process.env.X_ACCESS_TOKEN,
            accessSecret: process.env.X_ACCESS_SECRET,
        } as any);

        const me = await client.v2.me();
        console.log(`Authenticated as: @${me.data.username}`);

        const timeline = await client.v2.userTimeline(me.data.id, {
            max_results: 5,
            "tweet.fields": ["created_at", "text"]
        });

        if (!timeline.data.data || timeline.data.data.length === 0) {
            console.log("No tweets found.");
        } else {
            console.log("Latest Tweets:");
            for (const tweet of timeline.data.data) {
                const dateStr = tweet.created_at;
                const date = dateStr ? new Date(dateStr) : new Date();
                // Convert to JST
                const jstDate = date.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
                console.log(`[${jstDate}] ${tweet.text.replace(/\n/g, ' ').substring(0, 50)}...`);
            }
        }

    } catch (e) {
        console.error("Error checking X:", e);
    }
}

async function checkNote() {
    console.log("\n--- Checking Note ---");
    const COOKIES_PATH = path.resolve(__dirname, '../../note_cookies.json');

    // Check login credentials
    if (!process.env.NOTE_EMAIL || !process.env.NOTE_PASSWORD) {
        console.log("Skipping Note: Missing credentials.");
        return;
    }

    const browser = await puppeteer.launch({
        headless: true, // Headless for speed
        args: ['--no-sandbox']
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    try {
        if (fs.existsSync(COOKIES_PATH)) {
            const cookies = JSON.parse(fs.readFileSync(COOKIES_PATH, 'utf8'));
            // Cast to any to avoid strict type error
            await page.setCookie(...(cookies as any[]));
        }

        console.log("Navigating to Note Dashboard...");
        // 'https://note.com/notes' lists the articles (Managed articles)
        await page.goto('https://note.com/notes', { waitUntil: 'domcontentloaded' });

        // Check if redirected to login
        if (page.url().includes('login')) {
            console.log("Session expired. Logging in...");
            await page.type('input[name="login"], #email', process.env.NOTE_EMAIL);
            await page.type('input[name="password"], #password', process.env.NOTE_PASSWORD);

            const loginButtonHandle = await page.evaluateHandle(() => {
                const buttons = Array.from(document.querySelectorAll('button'));
                return buttons.find(b => b.textContent?.includes('ログイン')) || document.querySelector('button[data-type="primaryNext"]');
            });
            const buttonElement = loginButtonHandle.asElement();
            if (buttonElement) {
                await Promise.all([
                    page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
                    (buttonElement as any).click()
                ]);
            } else {
                await Promise.all([
                    page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
                    page.click('button[data-type="primaryNext"]')
                ]);
            }
            // Wait a bit
            await new Promise(r => setTimeout(r, 5000));
        }

        // Now we should be at /notes or dashboard
        // Let's scrape the list of notes
        // Selector for note item in the list
        // Usually .m-noteItem or similar.

        console.log("Scraping latest notes...");
        // Wait for list
        try {
            await page.waitForSelector('.o-noteList', { timeout: 10000 });
        } catch (e) {
            console.log("Could not find .o-noteList (maybe layout changed or empty). Dumping body text preview...");
            const text = await page.evaluate(() => document.body.innerText.substring(0, 500));
            console.log(text);
        }

        const notes = await page.evaluate(() => {
            // Need to inspect the DOM structure for note management list
            // Assuming generic structure search
            // Try to find ANY list item
            const items = Array.from(document.querySelectorAll('.o-noteList li, .m-noteItem, .o-card'));
            return items.map(item => {
                // Try multiple selectors
                const titleEl = item.querySelector('.o-noteList__title, .m-noteItem__title, .o-card__title, h3');
                const statusEl = item.querySelector('.o-noteList__status, .status-label, .o-noteList__publishStatus');
                const dateEl = item.querySelector('time, .o-noteList__date, .o-card__date');

                return {
                    title: titleEl?.textContent?.trim() || "No Title",
                    status: statusEl?.textContent?.trim() || "Unknown",
                    date: dateEl?.textContent?.trim() || "No Date"
                };
            }).slice(0, 5);
        });

        if (!notes || notes.length === 0) {
            console.log("No notes found in list.");
        } else {
            console.log("Latest Notes:");
            notes.forEach((n: any) => {
                console.log(`[${n.date}] [${n.status}] ${n.title}`);
            });
        }

    } catch (e) {
        console.error("Error checking Note:", e);
        const html = await page.content();
        fs.writeFileSync('note_check_error.html', html);
    } finally {
        await browser.close();
    }
}


async function main() {
    await checkX();
    await checkNote();
}

main();
