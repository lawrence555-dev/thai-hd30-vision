const YahooFinance = require('yahoo-finance2').default;
const yahooFinance = new YahooFinance();
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function updateSET() {
    console.log('Fetching SET Index (^SET.BK)...');
    try {
        const setResult = await yahooFinance.quoteSummary('^SET.BK', { modules: ['price', 'summaryDetail'] });
        const setPrice = setResult.price?.regularMarketPrice;
        const setChange = setResult.price?.regularMarketChange;
        const setChangePercent = (setResult.price?.regularMarketChangePercent || 0) * 100;
        const setHigh = setResult.summaryDetail?.fiftyTwoWeekHigh || 0;
        const setLow = setResult.summaryDetail?.fiftyTwoWeekLow || 0;

        console.log(`SET Index: ${setPrice} (${setChange > 0 ? '+' : ''}${setChange}), Range: ${setLow}-${setHigh}`);

        if (setPrice) {
            const { error } = await supabase.from('market_summary').upsert([
                { key: 'set_index', value: setPrice, description: 'SET Index Value' },
                { key: 'set_change', value: setChange, description: 'SET Index Change' },
                { key: 'set_change_percent', value: setChangePercent, description: 'SET Index Change Percent' },
                { key: 'set_year_high', value: setHigh, description: 'SET 52-Week High' },
                { key: 'set_year_low', value: setLow, description: 'SET 52-Week Low' }
            ]);
            if (error) console.error('Supabase Error:', error.message);
            else console.log('Market Summary Updated.');
        }
    } catch (err) {
        console.error('Failed to update SET Index:', err.message);
    }
}

updateSET();
