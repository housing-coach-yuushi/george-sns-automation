import puppeteer from 'puppeteer';
import dotenv from 'dotenv';
import { NoteContent } from './note_generator';
import * as fs from 'fs';
import * as path from 'path';

const COOKIES_PATH = path.resolve(__dirname, '../../note_cookies.json');

dotenv.config();

export const postToNote = async (content: { title: string; body: string }) => {
    console.log("Starting Note Posting Process...");

    // Check if we want to run in headful mode for debugging (if env var is set)
    const headlessMode = process.env.HEADLESS !== 'false'; // Default to true unless HEADLESS=false

    const browser = await puppeteer.launch({
        headless: headlessMode,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    // Set a decent viewport
    await page.setViewport({ width: 1280, height: 800 });
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    try {
        // 0. Load cookies from Env (for CI/CD) if file doesn't exist
        if (!fs.existsSync(COOKIES_PATH) && process.env.NOTE_COOKIES_JSON) {
            console.log("Loading cookies from environment variable...");
            fs.writeFileSync(COOKIES_PATH, process.env.NOTE_COOKIES_JSON);
        }

        // 1. Try to load cookies
        if (fs.existsSync(COOKIES_PATH)) {
            console.log("Loading saved cookies...");
            const cookiesString = fs.readFileSync(COOKIES_PATH, 'utf8');
            const cookies = JSON.parse(cookiesString);
            await page.setCookie(...cookies);
        }

        console.log("Navigating to Note...");
        // Navigate to a page that checks login status
        await page.goto('https://note.com/notes/new', { waitUntil: 'domcontentloaded' });

        // Check if we are redirected to login
        if (page.url().includes('login')) {
            console.log("Cookies expired or invalid. Logging in...");

            if (!process.env.NOTE_EMAIL || !process.env.NOTE_PASSWORD) {
                throw new Error("NOTE_EMAIL or NOTE_PASSWORD not set.");
            }

            // Wait for email input to be sure we are on login page
            await page.waitForSelector('input[name="login"], #email', { visible: true });

            console.log("Typing Email...");
            await page.type('input[name="login"], #email', process.env.NOTE_EMAIL!);

            console.log("Typing Password...");
            await page.type('input[name="password"], #password', process.env.NOTE_PASSWORD!);

            console.log("Clicking Login Button...");

            // Find the login button handle reliably
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
                console.log("Could not find login button by text, trying fallback selector...");
                await Promise.all([
                    page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
                    page.click('button[data-type="primaryNext"]')
                ]);
            }

            // After login attempt, check for Recaptcha or success
            // If headless is false (manual mode), give user TIME to solve captcha.
            const waitTimeout = headlessMode ? 20000 : 180000; // 3 minutes for manual interaction

            console.log(`Waiting for dashboard (Timeout: ${waitTimeout / 1000}s)...`);
            if (!headlessMode) {
                console.log("👉 PLEASE MANUALLY SOLVE CAPTCHA IF PRESENT NOW 👈");
            }

            try {
                // Wait for dashboard or editor
                // Updated selectors:
                // .o-globalHeader: Dashboard header
                // .editor-content: Old editor class
                // p[aria-live="assertive"]: often contains "記事編集 | note"
                // button: specific editor buttons
                console.log("Waiting for login success (Dashboard or Editor)...");
                await page.waitForFunction(() => {
                    const url = window.location.href;
                    if (url.includes('/notes/new') || url.includes('/edit')) return true;
                    if (document.querySelector('.o-globalHeader')) return true;
                    // Check for editor specific texts
                    if (document.body.innerText.includes('記事タイトル') || document.body.innerText.includes('記事編集')) return true;
                    return false;
                }, { timeout: waitTimeout });

                console.log("Login successful. Saving cookies...");
                const cookies = await page.cookies();
                fs.writeFileSync(COOKIES_PATH, JSON.stringify(cookies, null, 2));
            } catch (e) {
                console.error("Login verification failed. Possible CAPTCHA? dumping html...");
                const html = await page.content();
                fs.writeFileSync('note_post_error.html', html);
                throw new Error("Login failed (Timeout waiting for dashboard). Check note_post_error.html");
            }
        } else {
            console.log("Already logged in via cookies.");
        }

        console.log("Navigating to Note Home...");
        await page.goto('https://note.com/', { waitUntil: 'domcontentloaded' });

        console.log("Clicking 'Post' (投稿) button from header...");
        // Try to find the "投稿" button in the header
        const postButtonSelector = 'a[href^="/new"], button[class*="Button"]';

        const postBtn = await page.evaluateHandle(() => {
            const elements = Array.from(document.querySelectorAll('a, button'));
            return elements.find(el => el.textContent?.includes('投稿') || el.getAttribute('href') === '/new' || el.getAttribute('href') === 'https://note.com/new');
        });

        if (postBtn.asElement()) {
            await Promise.all([
                page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
                (postBtn as any).click()
            ]);
        } else {
            console.log("Could not find 'Post' button on home. Trying direct navigation...");
            await page.goto('https://note.com/notes/new', { waitUntil: 'domcontentloaded' });
        }


        // Wait for loading spinner to disappear if present
        try {
            // indicated by the class in the error snapshot
            const spinnerSelector = '.sc-e17b66d3-0';
            if (await page.$(spinnerSelector)) {
                console.log("Waiting for loading spinner to disappear...");
                await page.waitForSelector(spinnerSelector, { hidden: true, timeout: 30000 });
            }
        } catch (e) {
            console.log("Spinner wait error (timed out? continuing anyway):", e);
        }

        // Wait for potential hydration or redirect
        try {
            await page.waitForNetworkIdle({ idleTime: 1000, timeout: 10000 });
        } catch (e) {
            console.log("Network idle timeout, proceeding...");
        }

        // Check if we need to select "Text" (テキスト)
        // Retry loop for the text button as it might appear late
        let textButtonFound = false;
        for (let i = 0; i < 5; i++) {
            // Look for a button or link with "テキスト"
            const found = await page.evaluate(() => {
                const elements = Array.from(document.querySelectorAll('button, a, div[role="button"]'));
                const textEl = elements.find(el => el.textContent?.includes('テキスト') && el.textContent.length < 10);
                if (textEl) {
                    (textEl as HTMLElement).click();
                    return true;
                }
                return false;
            });

            if (found) {
                console.log("Selected 'Text' post type...");
                textButtonFound = true;
                break;
            }
            await new Promise(r => setTimeout(r, 1000));
        }

        if (textButtonFound) {
            try {
                await page.waitForNetworkIdle({ idleTime: 1000, timeout: 5000 });
            } catch (e) { }
        }

        console.log("Writing Title...");
        // Wait specifically for the placeholders which indicate editor is ready
        try {
            // Extended timeout and polling
            await page.waitForSelector('textarea[placeholder="記事タイトル"]', { visible: true, timeout: 30000 });
        } catch (e) {
            // If failed, try to see if we are still on the selection screen or dashboard
            console.log("Standard title selector failed. Dumping structure...");
            // Check if we can find the "Make a note" button again or something
            throw e;
        }

        // Sometimes title is a textarea with class 'editor-title' or similar. 
        // Let's try to focus and type.
        const titleSelector = 'textarea[placeholder="記事タイトル"]';
        await page.type(titleSelector, content.title);

        console.log("Writing Body...");
        // Body is strictly contenteditable.
        // We might need to click into the body area first.
        const bodySelector = '.editor-input'; // A guessing selector, might be wrong
        // Actual selector often: .sku-editor-content or .note-editor
        // Let's try finding the main editor div.

        // Reliable method: Focus title, press Tab to go to body? 
        // Or find the div that accepts text.

        // Let's look for the main editor container
        // Note editor usually: <div class="editor-input" contenteditable="true">

        // Backup plan: use page.keyboard
        await page.keyboard.press('Tab'); // Move from title to body
        await new Promise(r => setTimeout(r, 500));

        // Paste content (typing is slow and brittle for long text)
        // Since paste permission might be tricky in headless, we type or use evaluate.
        // For large text, evaluate is safer.

        // Using evaluate to insert text into the active element (which should be body)
        // We use evaluate to handle contenteditable directly if needed, or execCommand
        await page.evaluate((text) => {
            // Ensure we are focused on the body
            if (!document.activeElement || document.activeElement.tagName === 'BODY') {
                // Try to focus the editor div if not focused
                const editor = document.querySelector('.editor-input') || document.querySelector('[contenteditable="true"]');
                if (editor) (editor as HTMLElement).focus();
            }
            document.execCommand('insertText', false, text);
        }, content.body);

        console.log("Drafting done. Publishing...");

        // 3. Publish
        // "Pubish" button is usually "公開設定" (Open Settings) -> Then "投稿" (Post)
        // Selector for "公開設定" button. usually 'button' with text "公開設定"

        // Helper function to find and click button by text
        const clickButtonByText = async (text: string) => {
            const result = await page.evaluate((searchText) => {
                const buttons = Array.from(document.querySelectorAll('button'));
                const target = buttons.find(b => b.textContent?.includes(searchText));
                if (target) {
                    target.click();
                    return true;
                }
                return false;
            }, text);
            return result;
        };

        // "公開設定" button often just says "公開" or acts differently based on screen size?
        // Let's try multiple variations.
        console.log("Searching for Publish Settings button...");
        const possibleTexts = ['公開設定', '公開', 'Publish'];
        let clickedSettings = false;

        for (const text of possibleTexts) {
            clickedSettings = await clickButtonByText(text);
            if (clickedSettings) {
                console.log(`Clicked button with text: ${text}`);
                break;
            }
        }

        if (!clickedSettings) {
            console.log("Could not find button by text. Trying specific selectors...");
            // Try specific classes if text fails
            // e.g., button.o-noteEditorHeader__publish
            const selector = 'button[aria-label="公開設定"], button.o-noteEditorHeader__publish';
            const btn = await page.$(selector);
            if (btn) {
                await btn.click();
                clickedSettings = true;
                console.log("Clicked button by selector.");
            }
        }

        if (!clickedSettings) {
            // One last ditch: dump html to debug
            const html = await page.content();
            fs.writeFileSync('note_publish_error.html', html);
            throw new Error("Could not find '公開設定' or '公開' button. HTML dumped to note_publish_error.html");
        }

        // Wait for modal
        await new Promise(r => setTimeout(r, 2000));

        // "投稿" button (or "公開")
        // Try precise "投稿" first, excluding "予約"
        let finalClicked = await page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button'));
            // Find button that has "投稿" but not "予約" (Reservation)
            const target = buttons.find(b =>
                b.textContent?.includes('投稿') && !b.textContent?.includes('予約')
            );
            if (target) {
                target.click();
                return true;
            }
            return false;
        });

        if (finalClicked) {
            console.log("Clicked Final Post Button!");
        } else {
            // Fallback for "公開"
            finalClicked = await clickButtonByText('公開');
            if (finalClicked) {
                console.log("Clicked Final Publish Button!");
            } else {
                throw new Error("Could not find final '投稿' or '公開' button.");
            }
        }

        // Wait for success
        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => console.log("Navigation timeout after post (might be okay)"));
        console.log("Post process finished.");

    } catch (e) {
        console.error("Posting failed:", e);
        const html = await page.content();
        const fs = require('fs');
        fs.writeFileSync('note_post_error.html', html);
        throw e;
    } finally {
        await browser.close();
    }
}
