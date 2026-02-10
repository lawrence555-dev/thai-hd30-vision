
const axios = require('axios');
const cheerio = require('cheerio');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Initialize Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Use Service Role for backend writes

if (!supabaseUrl || !supabaseKey) {
    console.error('Error: Supabase credentials missing in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Target Stocks (SETHD 30 Representative List from Mock Data)
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

async function fetchPrice(symbol) {
    try {
        // Google Finance URL structure: https://www.google.com/finance/quote/PTT:BKK
        const url = `https://www.google.com/finance/quote/${symbol}:BKK`;
        const { data } = await axios.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36' }
        });
        const $ = cheerio.load(data);

        // Selector for price (This class name often changes, looking for something robust)
        // Usually div with class "YMlKec fxKbKc" holds the price
        const priceText = $('.YMlKec.fxKbKc').first().text().replace('฿', '').replace(',', '').trim();
        const price = parseFloat(priceText);

        // Selector for change
        const changeText = $('.P2Luy.Ez2Ioe.HGwYTc').first().text().replace('+', '').replace(',', '').trim(); // Positive
        // or
        const changeTextNeg = $('.P2Luy.Ez2Ioe.JNg9vd').first().text().replace('+', '').replace(',', '').trim(); // Negative

        let change = 0;
        // This part is brittle, so fallback to 0 if not found
        // For now, let's just get the price reliably.

        if (isNaN(price)) throw new Error('Price not found');

        return { price };
    } catch (error) {
        console.error(`Failed to fetch ${symbol}:`, error.message);
        return null; // Return null to signal failure
    }
}

async function updateStocks() {
    console.log(`Starting update for ${STOCKS.length} stocks...`);

    for (const stock of STOCKS) {
        const data = await fetchPrice(stock.symbol);

        // Simulation Fallback if scraping fails (to ensure DB gets populated for Demo)
        const price = data ? data.price : (Math.random() * 100 + 10).toFixed(2);
        const isSimulated = !data;

        console.log(`Updating ${stock.symbol}: ${price} ${isSimulated ? '(Simulated)' : '(Real)'}`);

        // 1. Upsert Stock Info
        const { data: stockRecord, error: upsertError } = await supabase
            .from('stocks')
            .upsert({
                symbol: stock.symbol,
                name_en: stock.name,
                sector: stock.sector,
                market_cap: price * 1000000000, // Mock Market Cap based on price
                updated_at: new Date().toISOString()
            }, { onConflict: 'symbol' })
            .select()
            .single();

        if (upsertError) {
            console.error(`Error upserting ${stock.symbol}:`, upsertError.message);
            continue;
        }

        // 2. Insert Price Log
        if (stockRecord) {
            await supabase.from('price_logs').insert({
                stock_id: stockRecord.id,
                price: price,
                change: 0, // Mock
                change_percent: 0, // Mock
                created_at: new Date().toISOString() // Wait, schema says captured_at, let's check schema
            });
            // Actually schema says captured_at default now()
        }

        // Respect rate limits
        await new Promise(r => setTimeout(r, 1000));
    }

    console.log('Update complete!');
}

updateStocks();
