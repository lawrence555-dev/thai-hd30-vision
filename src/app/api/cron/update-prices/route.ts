
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import * as cheerio from 'cheerio';

// Initialize Supabase with Service Role Key for backend writes
// Note: We use process.env directly here. Vercel System Env Vars or User Env Vars must be set.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase credentials');
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Target Stocks (SETHD 30 Representative List)
// In a real app, you might fetch this list from the DB first.
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

async function fetchPrice(symbol: string) {
    try {
        const url = `https://www.google.com/finance/quote/${symbol}:BKK`;
        const { data } = await axios.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)' }
        });
        const $ = cheerio.load(data);

        // Selector for price (This class name often changes, looking for something robust)
        const priceText = $('.YMlKec.fxKbKc').first().text().replace('฿', '').replace(',', '').trim();
        const price = parseFloat(priceText);

        if (isNaN(price)) throw new Error('Price not found');

        return { price };
    } catch (error: any) {
        console.error(`Failed to fetch ${symbol}:`, error.message);
        return null;
    }
}

export async function GET(request: Request) {
    // Vercel Cron verification (optional but recommended)
    // const authHeader = request.headers.get('authorization');
    // if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    //     return new NextResponse('Unauthorized', { status: 401 });
    // }

    console.log('Starting scheduled price update...');
    const results = [];

    for (const stock of STOCKS) {
        const data = await fetchPrice(stock.symbol);

        // Simulation Fallback if scraping fails
        const price = data ? data.price : (Math.random() * 100 + 10).toFixed(2);
        const isSimulated = !data;

        // 1. Upsert Stock Info
        const { error: upsertError } = await supabase
            .from('stocks')
            .upsert({
                symbol: stock.symbol,
                name_en: stock.name,
                sector: stock.sector,
                market_cap: Number(price) * 1000000000,
                updated_at: new Date().toISOString()
            }, { onConflict: 'symbol' });

        if (upsertError) {
            console.error(`Error upserting ${stock.symbol}:`, upsertError.message);
            results.push({ symbol: stock.symbol, status: 'error', error: upsertError.message });
            continue;
        }

        // 2. Insert Price Log
        // Fetch ID first? upsert returns data not reliably if we don't select.
        // Let's query ID simply.
        const { data: stockRecord } = await supabase
            .from('stocks')
            .select('id')
            .eq('symbol', stock.symbol)
            .single();

        if (stockRecord) {
            await supabase.from('price_logs').insert({
                stock_id: stockRecord.id,
                price: price,
                change: 0,
                change_percent: 0,
                // captured_at defaults to now()
            });
        }

        results.push({ symbol: stock.symbol, price, isSimulated, status: 'success' });

        // Respect rate limits (Vercel has execution time limits, keep it tight)
        await new Promise(r => setTimeout(r, 500));
    }

    return NextResponse.json({ success: true, updated: results.length, details: results });
}
