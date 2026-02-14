const yahooFinance = require('yahoo-finance2').default;

async function test() {
    try {
        const symbol = 'TTB.BK';
        console.log(`Fetching ${symbol}...`);
        const result = await yahooFinance.chart(symbol, {
            period1: '1d',
            interval: '5m',
        });
        console.log('Success!');
        console.log('Quote count:', result.quotes.length);
        console.log('First quote:', result.quotes[0]);
    } catch (e) {
        console.error('Error:', e);
    }
}

test();
