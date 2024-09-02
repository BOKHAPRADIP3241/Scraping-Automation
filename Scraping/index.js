const puppeteer = require('puppeteer');

const firefoxOptions = {
    product: 'firefox',
    extraPrefsFirefox: {
        // Enable additional Firefox logging from its protocol implementation
        // 'remote.log.level': 'Trace',
    },
    // Make browser logs visible
    dumpio: true,
};

async function autoScroll(page) {
    await page.evaluate(async () => {
        await new Promise((resolve, reject) => {
            let totalHeight = 0;
            const distance = 10000;
            const timer = setInterval(() => {
                const scrollHeight = document.body.scrollHeight;
                window.scrollBy(0, distance);
                totalHeight += distance;

                if (totalHeight >= scrollHeight) {
                    clearInterval(timer);
                    resolve();
                }
            }, 5000);
        });
    });
}

(async () => {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();

    console.log("Started");

    // Navigate to the Google Summer of Code 2024 projects page
    await page.goto('https://summerofcode.withgoogle.com/programs/2024/projects');

    await autoScroll(page);

    // Wait for the page content to load
    await page.waitForSelector('.contributor__content'); // Adjust the selector based on actual page structure

    // Extract project details
    const gsocContributors = await page.evaluate(() => {
        const projectElements = document.querySelectorAll('.contributor__content');
        return Array.from(projectElements).map(element => element.innerText);
    });

    console.log("GSoC Contributors:", gsocContributors);

    // LinkedIn login credentials
    const linkedinUsername = 'pradipbokha1233@gmail.com';
    const linkedinPassword = 'pradip3241@';

    // Function to log in to LinkedIn
    async function loginToLinkedIn() {
        await page.goto('https://www.linkedin.com/login');
        await page.type('#username', linkedinUsername);
        await page.type('#password', linkedinPassword);
        await page.click('button[type="submit"]');
        await page.waitForNavigation();
        console.log('Logged in to LinkedIn');
    }

    // Perform login first
    await loginToLinkedIn();

    for (const user of gsocContributors) {
        try {
            // Refined search query with additional relevant terms
            const searchQuery = `${user} GSOC LinkedIn profile`;
            const googleSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`;

            await page.goto(googleSearchUrl);
            await page.waitForSelector('h3'); // Wait for the search results to load

            // Extract all LinkedIn profile links from the search results
            const profileLinks = await page.evaluate(() => {
                const linkElements = Array.from(document.querySelectorAll('a')).filter(a => a.href.includes('linkedin.com/in/'));
                return linkElements.map(link => link.href);
            });

            if (profileLinks.length > 0) {
                // Take the first profile link
                const firstProfileLink = profileLinks[0];
                console.log(`Profile link found for ${user}: ${firstProfileLink}`);

                await page.goto(firstProfileLink);

                // Check if login is required again (in case session expires or for another reason)
                if (await page.$('#username')) {
                    console.log('Login required again, logging in...');
                    await loginToLinkedIn();
                    await page.goto(firstProfileLink); // Retry accessing the profile after login
                }

                try {
                    await page.waitForSelector('.pv-text-details__left-panel', { timeout: 20000 }); // Increased timeout

                    const contactInfo = await page.evaluate(() => {
                        const name = document.querySelector('.pv-text-details__left-panel h1')?.innerText || '';
                        const title = document.querySelector('.pv-text-details__left-panel .text-body-medium')?.innerText || '';
                        const location = document.querySelector('.pv-text-details__left-panel .text-body-small')?.innerText || '';
                        return { name, title, location };
                    });

                    console.log(`Contact info for ${user} at ${firstProfileLink}:`, contactInfo);
                } catch (error) {
                    console.error(`Error waiting for selector at ${firstProfileLink}: ${error.message}`);
                    await page.screenshot({ path: 'error_screenshot.png' }); // Take a screenshot for debugging
                }
            } else {
                console.log(`Profile links not found for user: ${user}`);
            }
        } catch (error) {
            console.log(`Error processing user ${user}:`, error);
        }
    }

    await browser.close();
})();
