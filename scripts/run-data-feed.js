const { spawn } = require('child_process');
const path = require('path');

const SCRAPER_SCRIPT = path.join(__dirname, 'scrape-full-data.js');
// Run every 2 minutes (120000ms) to ensure fresh data without overwhelming Yahoo
const INTERVAL = 120 * 1000;

function runScraper() {
    console.log(`[${new Date().toISOString()}] Starting Scraper Job...`);

    const scraper = spawn('node', [SCRAPER_SCRIPT]);

    scraper.stdout.on('data', (data) => {
        process.stdout.write(data);
    });

    scraper.stderr.on('data', (data) => {
        process.stderr.write(data);
    });

    scraper.on('close', (code) => {
        console.log(`[${new Date().toISOString()}] Scraper finished with code ${code}.`);
        console.log(`Waiting ${INTERVAL / 1000} seconds for next run...`);
        setTimeout(runScraper, INTERVAL);
    });
}

console.log('=== Thai HD30 Vision Data Feed ===');
console.log('Use Ctrl+C to stop.');
runScraper();
