import { TickerItem } from "@/components/MarketTicker";
import { supabase } from "./supabase";

interface StockData {
    id: string;
    symbol: string;
    price: number;
    change: number;
    changePercent: number;
    yield: number;
    volume?: number;
    avgVolume?: number;
}

/**
 * Generate ticker items from stock data based on various criteria
 */
export function generateTickerItems(stocks: StockData[]): TickerItem[] {
    const items: TickerItem[] = [];
    const now = new Date();

    stocks.forEach(stock => {
        // 1. Significant Price Surge (>5%)
        if (stock.changePercent >= 5) {
            items.push({
                id: `surge-${stock.id}`,
                type: 'price_surge',
                symbol: stock.symbol,
                message: `大漲 ${stock.changePercent.toFixed(2)}%`,
                value: stock.price,
                changePercent: stock.changePercent,
                timestamp: now,
                severity: stock.changePercent >= 10 ? 'critical' : 'warning'
            });
        }

        // 2. Significant Price Drop (<-5%)
        if (stock.changePercent <= -5) {
            items.push({
                id: `drop-${stock.id}`,
                type: 'price_drop',
                symbol: stock.symbol,
                message: `大跌 ${Math.abs(stock.changePercent).toFixed(2)}%`,
                value: stock.price,
                changePercent: stock.changePercent,
                timestamp: now,
                severity: stock.changePercent <= -10 ? 'critical' : 'warning'
            });
        }

        // 3. High Dividend Yield (>6%)
        if (stock.yield >= 6) {
            items.push({
                id: `yield-${stock.id}`,
                type: 'high_yield',
                symbol: stock.symbol,
                message: `高殖利率 ${stock.yield.toFixed(2)}%`,
                value: stock.yield,
                timestamp: now,
                severity: 'info'
            });
        }

        // 4. Volume Spike (if volume data available)
        if (stock.volume && stock.avgVolume && stock.volume > stock.avgVolume * 3) {
            items.push({
                id: `volume-${stock.id}`,
                type: 'volume_spike',
                symbol: stock.symbol,
                message: `成交量爆增 ${((stock.volume / stock.avgVolume) * 100).toFixed(0)}%`,
                timestamp: now,
                severity: 'warning'
            });
        }
    });

    // Sort by severity and change magnitude
    return items.sort((a, b) => {
        const severityOrder = { critical: 3, warning: 2, info: 1 };
        const severityDiff = severityOrder[b.severity] - severityOrder[a.severity];
        if (severityDiff !== 0) return severityDiff;

        // Then by absolute change percent
        const aChange = Math.abs(a.changePercent || 0);
        const bChange = Math.abs(b.changePercent || 0);
        return bChange - aChange;
    });
}

/**
 * Fetch recent ticker alerts from database (last 10)
 */
export async function fetchRecentAlerts(limit: number = 10): Promise<TickerItem[]> {
    try {
        const { data, error } = await supabase
            .from('ticker_alerts')
            .select(`
        *,
        stocks (symbol)
      `)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) throw error;

        return (data || []).map((alert: any) => ({
            id: alert.id,
            type: alert.alert_type,
            symbol: alert.stocks?.symbol || 'N/A',
            message: alert.message,
            value: alert.value,
            changePercent: alert.change_percent,
            timestamp: new Date(alert.created_at),
            severity: alert.severity
        }));
    } catch (error) {
        console.error('Failed to fetch recent alerts:', error);
        return [];
    }
}

/**
 * Fetch recent news items and convert to ticker format
 */
export async function fetchNewsAlerts(limit: number = 5): Promise<TickerItem[]> {
    try {
        const { data, error } = await supabase
            .from('market_news')
            .select(`
        *,
        stocks (symbol)
      `)
            .order('published_at', { ascending: false })
            .limit(limit);

        if (error) throw error;

        return (data || []).map((news: any) => ({
            id: `news-${news.id}`,
            type: 'news_flash' as const,
            symbol: news.stocks?.symbol || '市場',
            message: news.title_zh || news.title_original,
            timestamp: new Date(news.published_at),
            severity: news.news_type === 'regulatory' ? 'warning' : 'info'
        }));
    } catch (error) {
        console.error('Failed to fetch news alerts:', error);
        return [];
    }
}

/**
 * Fetch dividend announcements and convert to ticker format
 */
export async function fetchDividendAlerts(daysAgo: number = 7): Promise<TickerItem[]> {
    try {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysAgo);

        const { data, error } = await supabase
            .from('dividend_history')
            .select(`
        *,
        stocks (symbol)
      `)
            .gte('ex_date', cutoffDate.toISOString().split('T')[0])
            .order('ex_date', { ascending: false })
            .limit(10);

        if (error) throw error;

        return (data || []).map((div: any) => ({
            id: `div-${div.id}`,
            type: 'dividend' as const,
            symbol: div.stocks?.symbol || 'N/A',
            message: `配息 ฿${div.amount} (除息日 ${div.ex_date})`,
            value: div.amount,
            timestamp: new Date(div.ex_date),
            severity: 'info'
        }));
    } catch (error) {
        console.error('Failed to fetch dividend alerts:', error);
        return [];
    }
}

/**
 * Save alert to database for history
 */
export async function saveAlert(alert: Omit<TickerItem, 'id' | 'timestamp'> & { stock_id: string }) {
    try {
        const { error } = await supabase
            .from('ticker_alerts')
            .insert({
                stock_id: alert.stock_id,
                alert_type: alert.type,
                message: alert.message,
                value: alert.value,
                change_percent: alert.changePercent,
                severity: alert.severity
            });

        if (error) throw error;
    } catch (error) {
        console.error('Failed to save alert:', error);
    }
}

/**
 * Filter ticker items to show only the most important ones
 */
export function filterTopTickerItems(items: TickerItem[], maxItems: number = 10): TickerItem[] {
    return items.slice(0, maxItems);
}

/**
 * Combine all ticker sources (live data + news + dividends)
 */
export async function generateCombinedTickerItems(stocks: StockData[]): Promise<TickerItem[]> {
    // Generate live alerts from stock data
    const liveAlerts = generateTickerItems(stocks);

    // Fetch news and dividend alerts
    const [newsAlerts, dividendAlerts] = await Promise.all([
        fetchNewsAlerts(3),
        fetchDividendAlerts(7)
    ]);

    // Combine and sort by timestamp (newest first)
    const combined = [...liveAlerts, ...newsAlerts, ...dividendAlerts];
    return combined.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}
