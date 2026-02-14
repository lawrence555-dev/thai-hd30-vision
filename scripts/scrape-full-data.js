const YahooFinance = require('yahoo-finance2').default;
const yahooFinance = new YahooFinance();
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Initialize Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Error: Supabase credentials missing in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Stocks List (SETHD 30)
const STOCKS = [
    { symbol: 'PTT', name: 'PTT Public Company', sector: 'Energy' },
    { symbol: 'PTTEP', name: 'PTT Exploration & Prod', sector: 'Energy' },
    { symbol: 'TOP', name: 'Thai Oil', sector: 'Energy' },
    { symbol: 'BCP', name: 'Bangchak Corp', sector: 'Energy' },
    { symbol: 'EGCO', name: 'Electricity Generating', sector: 'Energy' },
    { symbol: 'RATCH', name: 'Ratch Group', sector: 'Energy' },
    { symbol: 'BANPU', name: 'Banpu', sector: 'Energy' },
    { symbol: 'SCB', name: 'SCB X', sector: 'Banking' },
    { symbol: 'KBANK', name: 'Kasikornbank', sector: 'Banking' },
    { symbol: 'BBL', name: 'Bangkok Bank', sector: 'Banking' },
    { symbol: 'KTB', name: 'Krung Thai Bank', sector: 'Banking' },
    { symbol: 'TTB', name: 'TMBThanachart Bank', sector: 'Banking' },
    { symbol: 'TISCO', name: 'Tisco Financial', sector: 'Banking' },
    { symbol: 'KKP', name: 'Kiatnakin Phatra', sector: 'Banking' },
    { symbol: 'ADVANC', name: 'Advanced Info Service', sector: 'ICT' },
    { symbol: 'INTUCH', name: 'Intouch Holdings', sector: 'ICT' },
    { symbol: 'LH', name: 'Land and Houses', sector: 'Property' },
    { symbol: 'SIRI', name: 'Sansiri', sector: 'Property' },
    { symbol: 'SPALI', name: 'Supalai', sector: 'Property' },
    { symbol: 'AP', name: 'AP (Thailand)', sector: 'Property' },
    { symbol: 'ORI', name: 'Origin Property', sector: 'Property' },
    { symbol: 'WHA', name: 'WHA Corp', sector: 'Property' },
    { symbol: 'SCC', name: 'Siam Cement', sector: 'Construction' },
    { symbol: 'TASCO', name: 'Tipco Asphalt', sector: 'Construction' },
    { symbol: 'TU', name: 'Thai Union Group', sector: 'Food' },
    { symbol: 'TVO', name: 'Thai Vegetable Oil', sector: 'Food' },
    { symbol: 'HMPRO', name: 'Home Product Center', sector: 'Commerce' },
    { symbol: 'COM7', name: 'Com7', sector: 'Commerce' },
    { symbol: 'BDMS', name: 'Bangkok Dusit Med', sector: 'Health Care' },
    { symbol: 'BEM', name: 'Bangkok Expressway', sector: 'Transport' },
];

function toYahooTicker(symbol) {
    if (symbol === 'LH') return 'LH.BK';
    return `${symbol}.BK`;
}

async function scrapeFullData() {
    console.log('Starting full data scrape...');

    // 1. Ensure all stocks exist in DB
    console.log('Verifying stock list in DB...');
    for (const stock of STOCKS) {
        const { error } = await supabase
            .from('stocks')
            .upsert({
                symbol: stock.symbol,
                name_en: stock.name,
                sector: stock.sector
            }, { onConflict: 'symbol' });

        if (error) console.error(`Failed to upsert ${stock.symbol}:`, error.message);
    }

    // 2. Fetch Data
    const { data: dbStocks, error: fetchError } = await supabase.from('stocks').select('symbol, id');
    if (fetchError) throw new Error(fetchError.message);

    console.log(`Processing ${dbStocks.length} stocks...`);

    for (const stock of dbStocks) {
        const ticker = toYahooTicker(stock.symbol);
        process.stdout.write(`Fetching ${stock.symbol} (${ticker})... `);

        try {
            // Suppress "notice" logger if possible, but just run it
            const result = await yahooFinance.quoteSummary(ticker, { modules: ['price', 'summaryDetail', 'defaultKeyStatistics', 'financialData'] });

            const price = result.price?.regularMarketPrice || result.financialData?.currentPrice;
            const peRatio = result.summaryDetail?.trailingPE || 0;
            const pbRatio = result.defaultKeyStatistics?.priceToBook || 0;
            const dividendYield = (result.summaryDetail?.dividendYield || 0) * 100;
            const payoutRatio = (result.summaryDetail?.payoutRatio || 0) * 100;
            const revenueGrowth = (result.financialData?.revenueGrowth || 0) * 100;
            const profitGrowth = (result.financialData?.earningsGrowth || 0) * 100;

            // New: 52-Week Range
            const yearHigh = result.summaryDetail?.fiftyTwoWeekHigh || 0;
            const yearLow = result.summaryDetail?.fiftyTwoWeekLow || 0;

            const change = result.price?.regularMarketChange || 0;
            const changePercent = (result.price?.regularMarketChangePercent || 0) * 100;

            console.log(`Done. Price: ${price}, Yield: ${dividendYield.toFixed(2)}%, High/Low: ${yearHigh}/${yearLow}`);

            // Update DB
            const { error: updateError } = await supabase
                .from('stocks')
                .update({
                    price: price,
                    change: change,
                    change_percent: changePercent,
                    pe_ratio: peRatio,
                    pb_ratio: pbRatio,
                    payout_ratio: payoutRatio,
                    revenue_growth_yoy: revenueGrowth,
                    profit_growth_yoy: profitGrowth,
                    current_yield: dividendYield,
                    year_high: yearHigh,
                    year_low: yearLow,
                    updated_at: new Date().toISOString()
                })
                .eq('id', stock.id);

            if (updateError) console.error(`\n  x DB Update Error: ${updateError.message}`);

            // Insert Log (Only if market is open/active or price is valid)
            if (price) {
                const { error: logError } = await supabase.from('price_logs').insert({
                    stock_id: stock.id,
                    price: price,
                    change: change,
                    change_percent: changePercent,
                    captured_at: new Date().toISOString()
                });
                if (logError) console.error(`\n  x Log Error: ${logError.message}`);
            }

        } catch (err) {
            console.error(`\n  x Yahoo Error: ${err.message}`);
        }

        // Rate limit
        await new Promise(r => setTimeout(r, 1500));
    }

    // --- Scrape market_summary (^SET.BK) ---
    console.log('\nFetching SET Index (^SET.BK)...');
    try {
        const setResult = await yahooFinance.quoteSummary('^SET.BK', { modules: ['price'] });
        const setPrice = setResult.price?.regularMarketPrice;
        const setChange = setResult.price?.regularMarketChange;
        const setChangePercent = (setResult.price?.regularMarketChangePercent || 0) * 100;

        console.log(`SET Index: ${setPrice} (${setChange > 0 ? '+' : ''}${setChange})`);

        if (setPrice) {
            await supabase.from('market_summary').upsert([
                { key: 'set_index', value: setPrice, description: 'SET Index Value' },
                { key: 'set_change', value: setChange, description: 'SET Index Change' },
                { key: 'set_change_percent', value: setChangePercent, description: 'SET Index Change Percent' }
            ]);
        }
    } catch (err) {
        console.error('Failed to fetch SET Index:', err.message);
    }

    console.log('Scrape complete.');
}

scrapeFullData();
