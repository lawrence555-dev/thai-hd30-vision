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

        // @ts-ignore
        const result = await yf.chart(querySymbol, {
            period1: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
            interval: '5m', // 5m is good for intraday detail
        });

        // Map to lightweight-charts format (time: number [seconds], value: number)
        // Filter out null/undefined quotes
        const quotes = result.quotes
            .filter((q: any) => q.close !== null && q.close !== undefined)
            .map((q: any) => ({
                time: Math.floor(new Date(q.date).getTime() / 1000), // Unix timestamp in seconds
                price: q.close
            }));

        return NextResponse.json({
            symbol: querySymbol,
            data: quotes,
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
