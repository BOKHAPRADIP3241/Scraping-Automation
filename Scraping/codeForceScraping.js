const puppeteer = require('puppeteer');
const xlsx = require('xlsx');

(async () => {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();

    
    let allData = [];

    try {
        for (let i = 1; i <= 100; i++) {
            const url = `https://codeforces.com/ratings/country/India/page/${i}`;
            await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

            // Wait for the ratings table to load
            await page.waitForSelector('.ratingsDatatable', { timeout: 60000 });

            // Extract the data
            const data = await page.evaluate(() => {
                const rows = Array.from(document.querySelectorAll('.ratingsDatatable tbody tr'));
                return rows.map(row => {
                    const cells = Array.from(row.querySelectorAll('td'));
                    const rank = cells[0]?.innerText.trim();
                    const name = cells[1]?.querySelector('a')?.innerText.trim();
                    const profileLink = cells[1]?.querySelector('a')?.href;
                    return {
                        rank: rank || 'N/A',
                        name: name || 'N/A',
                        profileLink: profileLink || 'N/A',
                    };
                });
            });

            allData = allData.concat(data);
            // console.log(`Page ${i} data fetched, total records: ${allData.length}`);
        }
    } catch (error) {
        console.error('Error during data collection:', error);
    } finally {
        try {
            // Check if data is not empty
            if (allData.length === 0) {
                throw new Error('No data collected.');
            }

            // Create a new workbook and a worksheet
            const workbook = xlsx.utils.book_new();
            const worksheet = xlsx.utils.json_to_sheet(allData);

            // Append the worksheet to the workbook
            xlsx.utils.book_append_sheet(workbook, worksheet, 'Codeforces Ratings');

            // Write the workbook to a file
            const fileName = 'codeforces_india.xlsx';
            xlsx.writeFile(workbook, fileName);
            console.log(`Excel file generated: ${fileName}`);
        } catch (fileError) {
            console.error('Error during Excel file generation:', fileError);
        }

        await browser.close();
    }
})();
