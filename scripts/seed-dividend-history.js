
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

async function seedDividendHistory() {
    console.log('Starting dividend history seed (5 Years)...');

    // 1. Get all stocks
    const { data: stocks, error: stockError } = await supabase
        .from('stocks')
        .select('id, symbol, current_yield, market_cap');
    // We use market_cap / yield to guess price if needed, or just random logical values

    if (stockError || !stocks) {
        console.error('Error fetching stocks:', stockError?.message);
        return;
    }

    console.log(`Found ${stocks.length} stocks. Generating history...`);

    const historyRecords = [];
    const currentYear = new Date().getFullYear(); // 2026? User says 2025/2026 in dates usually
    // Let's assume current year is 2026 based on previous logs/context, or just use system time.
    // System time in prompt is 2026-02-10. So we go back 2021-2025.

    for (const stock of stocks) {
        // Generate 2 payouts per year for 5 years
        for (let year = currentYear - 1; year >= currentYear - 5; year--) {

            // Interim Dividend (approx Aug/Sep)
            const interimAmount = (Math.random() * 1.5 + 0.5).toFixed(2); // 0.5 - 2.0 THB
            historyRecords.push({
                stock_id: stock.id,
                ex_date: `${year}-08-${Math.floor(Math.random() * 20) + 10}`,
                payment_date: `${year}-09-${Math.floor(Math.random() * 20) + 10}`,
                amount: interimAmount,
                type: 'Interim',
                created_at: new Date().toISOString()
            });

            // Final Dividend (approx Apr/May next year, but let's stick to calendar year logic for simplicity or financial year)
            // Usually Final is paid in April/May of Year+1 for Year performance. 
            // Let's just create records with Ex-Dates in dates.

            const finalAmount = (Math.random() * 2.0 + 1.0).toFixed(2); // 1.0 - 3.0 THB
            historyRecords.push({
                stock_id: stock.id,
                ex_date: `${year}-04-${Math.floor(Math.random() * 20) + 10}`,
                payment_date: `${year}-05-${Math.floor(Math.random() * 20) + 10}`,
                amount: finalAmount,
                type: 'Final',
                created_at: new Date().toISOString()
            });
        }
    }

    // Batch insert
    // Supabase might limit batch size, let's do chunks of 100
    const chunkSize = 100;
    for (let i = 0; i < historyRecords.length; i += chunkSize) {
        const chunk = historyRecords.slice(i, i + chunkSize);
        const { error } = await supabase.from('dividend_history').insert(chunk);

        if (error) {
            console.error('Error inserting chunk:', error.message);
        } else {
            console.log(`Inserted chunk ${i / chunkSize + 1}`);
        }
    }

    console.log(`Successfully seeded ${historyRecords.length} dividend records!`);
}

seedDividendHistory();
