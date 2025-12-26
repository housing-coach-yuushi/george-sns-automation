import puppeteer from 'puppeteer';
import dotenv from 'dotenv';
dotenv.config();

async function testLogin() {
    console.log("Starting Note Login Test...");

    if (!process.env.NOTE_EMAIL || !process.env.NOTE_PASSWORD) {
        console.error("Error: NOTE_EMAIL or NOTE_PASSWORD not found in .env");
        return;
    }

    const browser = await puppeteer.launch({
        headless: false, // Show browser to see what's happening
        defaultViewport: null,
        args: ['--start-maximized'] // Start maximized
    });

    const page = await browser.newPage();

    try {
        console.log("Navigating to Login Page...");
        await page.goto('https://note.com/login', { waitUntil: 'networkidle2' });

        console.log("Typing ID/Email...");
        // Wait for email input
        await page.waitForSelector('#email', { visible: true });
        await page.type('#email', process.env.NOTE_EMAIL);

        console.log("Typing Password...");
        await page.type('#password', process.env.NOTE_PASSWORD);

        console.log("Clicking Login Button...");
        // Click login button
        await page.click('button[data-type="primaryNext"]');

        // Wait for navigation or success indicator
        console.log("Waiting for login to complete...");
        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }).catch(() => console.log("Navigation timeout (might be okay if SPA)"));

        // Check if we are logged in by looking for user icon or specific element
        // Note: This selector might need adjustment based on actual Note DOM
        const isLoggedIn = await page.evaluate(() => {
            return document.querySelector('.o-usermenu') !== null || window.location.href === 'https://note.com/';
        });

        if (isLoggedIn || page.url() === 'https://note.com/') {
            console.log("\n✅ Login Successful! (Redirected to home)");

            // Save cookies
            const cookies = await page.cookies();
            const fs = require('fs');
            const path = require('path');
            const cookiePath = path.resolve(__dirname, '../../note_cookies.json');
            fs.writeFileSync(cookiePath, JSON.stringify(cookies, null, 2));
            console.log(`\n🍪 Cookies saved to: ${cookiePath}`);
            console.log("👉 Please copy the content of this file to your GitHub Secret (NOTE_COOKIES_JSON)");
        } else {
            console.log("\n⚠️ Login status unclear. Please check the browser window.");
        }

        // Keep browser open for a few seconds to let user see
        await new Promise(r => setTimeout(r, 5000));

    } catch (error) {
        console.error("Login Task Failed:", error);
        // Save HTML to check selectors
        const fs = require('fs');
        const html = await page.content();
        fs.writeFileSync('note_login_debug.html', html);
        console.log("Saved page HTML to note_login_debug.html for debugging.");
    } finally {
        await browser.close();
    }
}

testLogin();
