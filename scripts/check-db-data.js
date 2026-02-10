const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
    const { data: stocks } = await supabase.from('stocks').select('symbol, id').limit(3);
    console.log('Stocks:', stocks);

    if (stocks && stocks.length > 0) {
        const { data: logs } = await supabase.from('price_logs').select('*').eq('stock_id', stocks[0].id).limit(10);
        console.log(`Price Logs for ${stocks[0].symbol}:`, logs);

        const { count } = await supabase.from('price_logs').select('*', { count: 'exact', head: true }).eq('stock_id', stocks[0].id);
        console.log(`Total logs for ${stocks[0].symbol}:`, count);
    }
}

checkData();
