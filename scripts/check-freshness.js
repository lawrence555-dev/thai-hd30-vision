const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkDataFreshness() {
    console.log("--- Checking Market Summary ---");
    const { data: market, error: marketError } = await supabase
        .from('market_summary')
        .select('*')
        .limit(1);

    if (market && market.length > 0) {
        console.log("Market Index:", market[0].index_value);
        console.log("Last Updated:", market[0].updated_at);
    } else {
        console.log("No market summary found.");
    }

    console.log("\n--- Checking Stocks (BBL) ---");
    const { data: stock, error: stockError } = await supabase
        .from('stocks')
        .select('symbol, price, change, updated_at')
        .eq('symbol', 'BBL')
        .single();

    if (stock) {
        console.log("Symbol:", stock.symbol);
        console.log("Price:", stock.price);
        console.log("Change:", stock.change);
        console.log("Last Updated:", stock.updated_at);
    } else {
        console.log("Stock BBL not found.");
    }
}

checkDataFreshness();
