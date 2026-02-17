import { NextResponse } from 'next/server';
import yahooFinance from 'yahoo-finance2';

// Force dynamic to prevent static generation issues with external API
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');

    if (!symbol) {
        return NextResponse.json({ error: 'Symbol is required' }, { status: 400 });
    }

    try {
        console.log(`[API] Fetching chart for ${symbol}`);

        let yf = yahooFinance;
        // In some environments, the default export is the class constructor, not an instance.
        // We detect this and instantiate if needed.
        // @ts-ignore
        if (typeof yf === 'function') {
            console.log('[API] yahooFinance is a constructor, instantiating...');
            // @ts-ignore
            yf = new yf();
        }

        // Fetch 1 day of data with 5 minute intervals to get a good intraday trend
        // We append '.BK' if not present, assuming Thai stocks
        const querySymbol = symbol.endsWith('.BK') ? symbol : `${symbol}.BK`;

        // Fetch 7 days of data to ensure we find the last trading session (handling weekends/holidays)
        // @ts-ignore
        const result = await yf.chart(querySymbol, {
            period1: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
            interval: '5m',
        });

        // 1. Filter valid quotes
        const validQuotes = result.quotes.filter((q: any) => q.close !== null && q.close !== undefined);

        if (validQuotes.length === 0) {
            return NextResponse.json({ symbol: querySymbol, data: [], meta: result.meta });
        }

        // 2. Find the last available trading date
        const lastQuote = validQuotes[validQuotes.length - 1];
        const lastQuoteDate = new Date(lastQuote.date);

        // Use UTC date matching to avoid timezone issues
        const lastDayStr = lastQuoteDate.toISOString().split('T')[0]; // "YYYY-MM-DD"

        // 3. Filter for only that day's data (compare YYYY-MM-DD part)
        let todaysQuotes = validQuotes.filter((q: any) => new Date(q.date).toISOString().split('T')[0] === lastDayStr);

        // 4. Strict Market Hour Filtering (Thai Session in UTC)
        // Bangkok is UTC+7
        // Morning: 10:00 - 12:30 BKK => 03:00 - 05:30 UTC
        // Afternoon: 14:30 - 16:30 BKK => 07:30 - 09:30 UTC
        // We add buffers:
        // Morning Buffer: 02:55 (175m) - 05:45 (345m) UTC
        // Afternoon Buffer: 07:25 (445m) - 10:00 (600m) UTC
        todaysQuotes = todaysQuotes.filter((q: any) => {
            const date = new Date(q.date);
            const h = date.getUTCHours();
            const m = date.getUTCMinutes();
            const t = h * 60 + m;

            const isMorning = t >= 175 && t <= 345;
            const isAfternoon = t >= 445 && t <= 600;

            return isMorning || isAfternoon;
        });

        // Map to lightweight-charts format
        const data = todaysQuotes.map((q: any) => ({
            time: Math.floor(new Date(q.date).getTime() / 1000),
            price: q.close
        }));

        return NextResponse.json({
            symbol: querySymbol,
            data: data,
            meta: result.meta
        });

    } catch (error: any) {
        console.error('Error fetching chart data:', error);
        return NextResponse.json({
            error: 'Failed to fetch chart data',
            details: error.message || String(error)
        }, { status: 500 });
    }
}
