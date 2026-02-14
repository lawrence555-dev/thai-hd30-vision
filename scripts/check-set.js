const YahooFinance = require('yahoo-finance2').default;
const yahooFinance = new YahooFinance();

async function checkSET() {
    try {
        console.log("Searching for 'SET Index'...");
        const searchRes = await yahooFinance.search('SET Index');
        console.log('Search Results:', JSON.stringify(searchRes, null, 2));

        const candidates = ['^SET.BK', '^SETI', 'SET.BK'];
        for (const symbol of candidates) {
            try {
                console.log(`\nTesting ${symbol}...`);
                const result = await yahooFinance.quoteSummary(symbol, { modules: ['price'] });
                console.log(`${symbol} Price:`, result.price?.regularMarketPrice);
                console.log(`${symbol} Name:`, result.price?.shortName);
            } catch (e) {
                console.log(`${symbol} failed: ${e.message}`);
            }
        }

    } catch (err) {
        console.error('Error:', err);
    }
}

checkSET();
