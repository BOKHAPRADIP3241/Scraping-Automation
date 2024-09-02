const puppeteer = require('puppeteer');
const XLSX = require('xlsx');

async function autoScroll(page) {
    await page.evaluate(async () => {
        await new Promise((resolve) => {
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
        await page.waitForNavigation({ waitUntil: 'networkidle2' });
        console.log('Logged in to LinkedIn');
    }

    // Perform login first
    await loginToLinkedIn();

    // Prepare an array to store user data
    const userData = [];

    for (const user of gsocContributors) {
        try {
            // Refined search query for LinkedIn
            const linkedinSearchQuery = `${user} GSOC LinkedIn profile`;
            const linkedinSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(linkedinSearchQuery)}`;

            await page.goto(linkedinSearchUrl);
            await page.waitForSelector('h3'); // Wait for the search results to load

            // Extract LinkedIn profile links from the search results
            const linkedinProfileLinks = await page.evaluate(() => {
                const linkElements = Array.from(document.querySelectorAll('a')).filter(a => a.href.includes('linkedin.com/in/'));
                return linkElements.map(link => link.href);
            });

            // Refined search query for GitHub
            const githubSearchQuery = `${user} GSOC GitHub profile`;
            const githubSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(githubSearchQuery)}`;

            await page.goto(githubSearchUrl);
            await page.waitForSelector('h3'); // Wait for the search results to load

            // Extract GitHub profile links from the search results
            const githubProfileLinks = await page.evaluate(() => {
                const linkElements = Array.from(document.querySelectorAll('a')).filter(a => a.href.includes('github.com/'));
                return linkElements.map(link => link.href);
            });

            // Add the first LinkedIn and GitHub profile links to the user data
            const firstLinkedInProfileLink = linkedinProfileLinks.length > 0 ? linkedinProfileLinks[0] : 'Not Found';
            const firstGitHubProfileLink = githubProfileLinks.length > 0 ? githubProfileLinks[0] : 'Not Found';

            console.log(`Profile links found for ${user}: LinkedIn: ${firstLinkedInProfileLink}, GitHub: ${firstGitHubProfileLink}`);

            // Add the user data to the array
            userData.push({
                Username: user,
                LinkedInProfileLink: firstLinkedInProfileLink,
                GitHubProfileLink: firstGitHubProfileLink
            });

            if (firstLinkedInProfileLink !== 'Not Found') {
                await page.goto(firstLinkedInProfileLink);

                // Check if login is required again (in case session expires or for another reason)
                if (await page.$('#username')) {
                    console.log('Login required again, logging in...');
                    await loginToLinkedIn();
                    await page.goto(firstLinkedInProfileLink); // Retry accessing the profile after login
                }

                try {
                    await page.waitForSelector('.pv-text-details__left-panel', { timeout: 30000 });

                    const contactInfo = await page.evaluate(() => {
                        const name = document.querySelector('.pv-text-details__left-panel h1')?.innerText || '';
                        const title = document.querySelector('.pv-text-details__left-panel .text-body-medium')?.innerText || '';
                        const location = document.querySelector('.pv-text-details__left-panel .text-body-small')?.innerText || '';
                        return { name, title, location };
                    });

                    console.log(`Contact info for ${user} at ${firstLinkedInProfileLink}:`, contactInfo);
                } catch (error) {
                    console.error(`Error waiting for selector at ${firstLinkedInProfileLink}: ${error.message}`);
                    await page.screenshot({ path: 'error_screenshot.png' }); // Take a screenshot for debugging
                }
            }
        } catch (error) {
            console.log(`Error processing user ${user}:`, error);
        }
    }

    // Create a workbook and a worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(userData);

    // Add the worksheet to the workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Profiles');

    // Write the workbook to a file
    XLSX.writeFile(wb, 'profiles.xlsx');

    console.log('Excel file created: profiles.xlsx');

    await browser.close();
})();
