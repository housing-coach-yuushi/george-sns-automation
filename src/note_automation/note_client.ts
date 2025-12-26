import puppeteer from 'puppeteer';
import dotenv from 'dotenv';
import { NoteContent } from './note_generator';
import * as fs from 'fs';
import * as path from 'path';

const COOKIES_PATH = path.resolve(__dirname, '../../note_cookies.json');

dotenv.config();

export const postToNote = async (content: { title: string; body: string; headerImagePath?: string; bodyImagePath?: string }) => {
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


        // Wait for loading spinner to disappear if present with Retry Logic
        const spinnerSelector = '.sc-e17b66d3-0'; // Full screen loading overlay
        const maxRetries = 3;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                // Check if spinner exists immediately
                const spinner = await page.$(spinnerSelector);
                if (spinner) {
                    console.log(`[Attempt ${attempt}/${maxRetries}] Spinner detected. Waiting for it to disappear...`);

                    // Wait 10s for it to go away
                    await page.waitForSelector(spinnerSelector, { hidden: true, timeout: 10000 });
                    console.log("Spinner disappeared!");
                    break; // Success
                } else {
                    // No spinner, good to go
                    break;
                }
            } catch (e) {
                console.warn(`[Attempt ${attempt}/${maxRetries}] Spinner timed out (still visible).`);

                if (attempt < maxRetries) {
                    console.log("Reloading page to recover...");
                    await page.reload({ waitUntil: 'domcontentloaded' });
                    // Give it a moment to settle/show spinner again
                    await new Promise(r => setTimeout(r, 2000));
                } else {
                    console.error("Max retries reached. Spinner persistent. Continuing explicitly but may fail...");
                }
            }
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

        // --- Header Image Upload ---
        if (content.headerImagePath) {
            console.log("Uploading Header Image...");
            if (!fs.existsSync(content.headerImagePath)) {
                console.error(`Header image not found at: ${content.headerImagePath}`);
            } else {
                try {
                    // Selector strategies:
                    // Added 'button[aria-label="画像を追加"]' based on debug HTML
                    const headerBtnSelector = 'button[aria-label="見出し画像を登録"], button[aria-label="画像を追加"], button.o-noteEditorHeader__image, div[role="button"][aria-label="見出し画像を登録"]';

                    // Wait heavily for editor readiness
                    await page.waitForSelector('textarea[placeholder="記事タイトル"]', { visible: true, timeout: 30000 });

                    let headerBtn = await page.$(headerBtnSelector);

                    // Removed incorrect fallback for '見出しを設定すると表示されます' as that targets Table of Contents
                    if (!headerBtn) {
                        console.log("Header Image button not found.");
                    }

                    if (headerBtn && (headerBtn as any).asElement()) {
                        console.log("Found Header Button. Trying to click and handle potential race condition...");

                        // We set up a promise for the file chooser BEFORE clicking
                        const fileChooserPromise = page.waitForFileChooser({ timeout: 3000 }).catch(() => null);

                        await (headerBtn as any).click();

                        // 1. Check if clicking the button DIRECTLY opened the file chooser
                        const fileChooser = await fileChooserPromise;

                        if (fileChooser) {
                            console.log("Direct click opened File Chooser!");
                            await fileChooser.accept([content.headerImagePath]);
                        } else {
                            // 2. If no file chooser, assume it opened a menu and look for "Upload" option
                            console.log("No direct file chooser. Looking for 'Upload' option in menu...");

                            // Look for "画像をアップロード"
                            // Wait a bit for menu animation
                            await new Promise(r => setTimeout(r, 1000));

                            // Use XPath via evaluateHandle (page.$x is deprecated/missing)
                            await new Promise(r => setTimeout(r, 1500));
                            const uploadOption = await page.evaluateHandle(() => {
                                const result = document.evaluate(
                                    '//button[contains(., "画像をアップロード")]',
                                    document,
                                    null,
                                    XPathResult.FIRST_ORDERED_NODE_TYPE,
                                    null
                                );
                                return result.singleNodeValue as Element;
                            });

                            if (uploadOption) {
                                console.log("Found 'Upload Image' button via XPath. Clicking via evaluate...");
                                const box = await (uploadOption as any).boundingBox();
                                if (box) {
                                    console.log(`Clicking menu item at ${box.x + box.width / 2}, ${box.y + box.height / 2}`);

                                    const [menuFileChooser] = await Promise.all([
                                        page.waitForFileChooser({ timeout: 5000 }).catch(() => null),
                                        page.mouse.click(box.x + box.width / 2, box.y + box.height / 2),
                                    ]);

                                    if (menuFileChooser) {
                                        console.log("File Chooser detected via Mouse Click!");
                                        await menuFileChooser.accept([content.headerImagePath]);

                                        console.log("File accepted. Waiting for potential Cropping/Save modal...");
                                        await new Promise(r => setTimeout(r, 3000));

                                        // Check for "保存" (Save) or "決定" (Confirm) button in a modal
                                        const confirmBtn = await page.evaluateHandle(() => {
                                            const buttons = Array.from(document.querySelectorAll('button'));
                                            // Look for buttons with text "保存" or "決定" that are visible/high z-index
                                            return buttons.find(b => {
                                                const text = b.textContent?.trim();
                                                return (text === '保存' || text === '決定' || text === '適用') && b.offsetParent !== null;
                                            });
                                        });

                                        if (confirmBtn.asElement()) {
                                            console.log("Found Confirm/Save button (Cropping modal?). Clicking...");
                                            await (confirmBtn as any).click();
                                            await new Promise(r => setTimeout(r, 2000));
                                        }

                                    } else {
                                        console.error("Mouse click failed to trigger chooser.");
                                        // Debug dump
                                        const menuHtml = await page.evaluate(() => document.body.innerHTML);
                                        fs.writeFileSync('note_menu_debug.html', menuHtml);

                                        // Last ditch: try finding file input again
                                        const fileInput = await page.$('input[type="file"]');
                                        if (fileInput) await fileInput.uploadFile(content.headerImagePath);
                                    }
                                } else {
                                    console.error("Menu item has no bounding box (invisible?)");
                                }
                            } else {
                                console.log("Could not find 'Upload Image' option in menu.");
                            }
                        }

                        console.log("File uploaded processing wait...");

                        // Verification: Wait for image to actually appear (Placeholder disappearance or Img tag appearance)
                        let imageVerified = false;
                        for (let i = 0; i < 10; i++) {
                            const hasPlaceholder = await page.evaluate(() => {
                                const divs = Array.from(document.querySelectorAll('div'));
                                return divs.some(d => d.textContent === '見出しを設定すると表示されます');
                            });

                            // Also check for any img tag in the header area
                            const hasImg = await page.evaluate(() => {
                                const headerArea = document.querySelector('.o-noteEditorHeader__image');
                                return headerArea ? headerArea.querySelector('img') !== null : false;
                            });

                            if (!hasPlaceholder || hasImg) {
                                console.log(`Image verification success! (Placeholder gone: ${!hasPlaceholder}, Img found: ${hasImg})`);
                                imageVerified = true;
                                break;
                            }
                            console.log("Waiting for image to settle...");
                            await new Promise(r => setTimeout(r, 1000));
                        }

                        if (!imageVerified) {
                            console.error("Warning: Header image might not have been applied (Placeholder still visible).");
                        }

                        await new Promise(r => setTimeout(r, 2000)); // Extra safety buffer
                    } else {
                        console.log("Could not find Header Image button after fallback search.");
                    }

                } catch (e) {
                    console.error("Failed to upload header image:", e);
                    // Continue without header image
                }
            }
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

        // --- Body Image Upload (New) ---
        if (content.bodyImagePath) {
            console.log("Uploading Body Image...");
            try {
                // Ensure body is focused
                await page.click('.editor-input, [contenteditable="true"]');
                await new Promise(r => setTimeout(r, 1000));

                // 1. Trigger the "Add" menu
                const addBtnSelector = 'button[aria-label="追加"], button[aria-label="メニューを開く"], button.o-editorBlockMenu__addButton, button[aria-label="ブロックを追加"]';
                let addBtn = null;
                try {
                    // Try to wait for it briefly
                    addBtn = await page.waitForSelector(addBtnSelector, { visible: true, timeout: 2000 });
                } catch (e) { }

                if (!addBtn) {
                    console.log("Add button not immediately visible. Typing a newline to trigger it...");
                    await page.keyboard.press('Enter');
                    await new Promise(r => setTimeout(r, 500));
                    await page.keyboard.press('ArrowUp');
                    await new Promise(r => setTimeout(r, 500));
                    try {
                        addBtn = await page.waitForSelector(addBtnSelector, { visible: true, timeout: 2000 });
                    } catch (e) { }
                }

                if (addBtn) {
                    console.log("Found Add Block button. Clicking...");
                    await addBtn.click();

                    console.log("Searching for 'Image' option in menu via XPath...");
                    await new Promise(r => setTimeout(r, 1000));

                    // 2. Select "Image" from the menu using XPath for text content "画像"
                    // Because aria-label might be missing
                    const imgBtnHandle = await page.evaluateHandle(() => {
                        const buttons = Array.from(document.querySelectorAll('button'));
                        // Find button containing text "画像"
                        return buttons.find(b => b.textContent?.includes('画像'));
                    });

                    if (imgBtnHandle.asElement()) {
                        console.log("Found Image option (via text content). Uploading...");
                        const [fileChooser] = await Promise.all([
                            page.waitForFileChooser(),
                            (imgBtnHandle as any).click(),
                        ]);

                        await fileChooser.accept([content.bodyImagePath]);
                        console.log("Body Image accepted. Waiting for upload...");
                        await new Promise(r => setTimeout(r, 5000));
                        await page.keyboard.press('ArrowDown');
                        await page.keyboard.press('Enter');
                    } else {
                        console.error("Could not find Image option via text content.");
                        // Fallback to aria-label
                        const fallbackSelector = 'button[aria-label="画像"], li[data-key="image"] button, button[data-id="image"]';
                        const fallbackBtn = await page.$(fallbackSelector);
                        if (fallbackBtn) {
                            const [fileChooser] = await Promise.all([
                                page.waitForFileChooser(),
                                fallbackBtn.click(),
                            ]);
                            await fileChooser.accept([content.bodyImagePath]);
                        } else {
                            const menuHtml = await page.evaluate(() => document.body.innerHTML);
                            fs.writeFileSync('note_add_menu_debug.html', menuHtml);
                        }
                    }

                } else {
                    console.error("Could not find Add Block (+) button.");
                    const html = await page.content();
                    fs.writeFileSync('note_body_debug.html', html);
                }

            } catch (e) {
                console.error("Failed to upload body image:", e);
                // Non-fatal, continue with text
            }
        }

        console.log("Writing Body Text...");
        // Body is strictly contenteditable.

        // Backup plan: use page.keyboard
        // Ensure we are at the end or on a new line
        await page.keyboard.press('ArrowDown');
        await new Promise(r => setTimeout(r, 200));

        // Using evaluate to insert text into the active element (which should be body)
        // We use evaluate to handle contenteditable directly if needed, or execCommand
        await page.evaluate((text) => {
            // Ensure we are focused on the body
            if (!document.activeElement || document.activeElement.tagName === 'BODY') {
                // Try to focus the editor div if not focused
                const editor = document.querySelector('.editor-input') || document.querySelector('[contenteditable="true"]');
                if (editor) (editor as HTMLElement).focus();
            }
            // Append text? execCommand 'insertText' inserts at cursor.
            document.execCommand('insertText', false, text);
        }, content.body);

        console.log("Drafting done. Publishing...");

        // 3. Publish
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

        // Note UI now uses "公開に進む" button (changed from "公開設定" or "公開")
        console.log("Searching for Publish Settings button...");
        const possibleTexts = ['公開に進む', '公開設定', '公開', 'Publish'];
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
            const selector = 'button[aria-label="公開設定"], button.o-noteEditorHeader__publish';
            const btn = await page.$(selector);
            if (btn) {
                await btn.click();
                clickedSettings = true;
                console.log("Clicked button by selector.");
            }
        }

        if (!clickedSettings) {
            console.log("Could not find '公開設定' or '公開' button. Skipping publish step.");
            // Take screenshot for debug
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            await page.screenshot({ path: `note_post_error_no_button_${timestamp}.png`, fullPage: true });

            // CRITICAL FIX: Throw error to ensure workflow fails RED if button is missing
            throw new Error("Could not find '公開設定' or '公開' button. Workflow marked as failed.");
        } else {
            // Wait for modal
            await new Promise(r => setTimeout(r, 2000));

            // Note UI now uses "投稿する" button (button may contain nested spans)
            // Try precise "投稿する" first, excluding "予約投稿"
            let finalClicked = await page.evaluate(() => {
                const buttons = Array.from(document.querySelectorAll('button'));
                // Find button that has "投稿する" exactly or contains "投稿" but not "予約"
                const target = buttons.find(b => {
                    const text = b.textContent?.trim() || '';
                    return (text === '投稿する' || text.includes('投稿する') ||
                        (text.includes('投稿') && !text.includes('予約')));
                });
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
                    // Try to find button by more specific selectors (Note UI may have changed)
                    console.log("Trying additional selectors for final publish button...");

                    const additionalSelectors = [
                        'button[data-testid="publish-button"]',
                        'button.o-modalFooter__primaryButton',
                        'button[type="submit"]',
                        'div[role="dialog"] button:last-child'
                    ];

                    for (const selector of additionalSelectors) {
                        const btn = await page.$(selector);
                        if (btn) {
                            await btn.click();
                            finalClicked = true;
                            console.log(`Clicked button via selector: ${selector}`);
                            break;
                        }
                    }

                    if (!finalClicked) {
                        // Take screenshot for debugging
                        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                        await page.screenshot({ path: `note_publish_modal_${timestamp}.png`, fullPage: true });

                        // CRITICAL: Throw error to mark workflow as failed
                        throw new Error("Could not find final '投稿' or '公開' button. Note was NOT published.");
                    }
                }
            }

            // Wait for success
            await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => console.log("Navigation timeout after post (might be okay)"));
            console.log("Post process finished.");
        }

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
