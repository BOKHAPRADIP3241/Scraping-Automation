const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    let indianProfileLinks = [];

    const loadPageWithRetry = async (url, retries = 3) => {
        for (let i = 0; i < retries; i++) {
            try {
                await page.goto(url, { waitUntil: 'networkidle2', timeout: 120000 });
                return true; // Successfully loaded the page
            } catch (error) {
                if (i === retries - 1) {
                    throw error; // Rethrow error after final attempt
                }
                console.log(`Retrying... (${i + 1}/${retries})`);
            }
        }
    };

    try {
        await loadPageWithRetry('https://leetcode.com/contest/globalranking');

        for (let i = 0; i < 10; i++) { // Adjust the number of pages to load if needed
            // Wait for the ranking table to load
            await page.waitForSelector('.ranking-table-container', { timeout: 60000 });

            // Extract and click the profile links of Indian users
            const profiles = await page.evaluate(() => {
                const rows = Array.from(document.querySelectorAll('.ranking-table-container tbody tr'));
                return rows.map(row => {
                    const country = row.querySelector('td:nth-child(2) .ranking-country')?.title;
                    const profileLink = row.querySelector('td:nth-child(2) a')?.href;
                    return { country, profileLink };
                }).filter(row => row.country === 'India');
            });

            for (const profile of profiles) {
                if (profile.profileLink) {
                    // Navigate to the user's profile page
                    await loadPageWithRetry(profile.profileLink);
                    indianProfileLinks.push(profile.profileLink);
                }
            }

            // Click the next page button
            const nextButton = await page.$('.pagination-next');
            if (nextButton) {
                await Promise.all([
                    page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 }),
                    nextButton.click(),
                ]);
            } else {
                break; // No more pages
            }
        }

        console.log('Indian User Profile Links:', indianProfileLinks);

    } catch (error) {
        console.error('Error:', error);
    }

    await browser.close();
})();
