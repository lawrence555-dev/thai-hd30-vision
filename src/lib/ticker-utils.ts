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
 * Fetch earnings report alerts
 */
export async function fetchEarningsAlerts(daysAgo: number = 30): Promise<TickerItem[]> {
    try {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysAgo);

        const { data, error } = await supabase
            .from('earnings_reports')
            .select(`
        *,
        stocks (symbol)
      `)
            .gte('report_date', cutoffDate.toISOString().split('T')[0])
            .order('report_date', { ascending: false })
            .limit(5);

        if (error) throw error;

        return (data || []).map((earnings: any) => {
            const surprise = earnings.eps_surprise || 0;
            const isPositive = surprise > 0;

            return {
                id: `earnings-${earnings.id}`,
                type: 'earnings_report' as const,
                symbol: earnings.stocks?.symbol || 'N/A',
                message: `財報${isPositive ? '優於' : '低於'}預期 EPS ${earnings.eps} (預估 ${earnings.eps_estimate})`,
                value: earnings.eps,
                changePercent: surprise,
                timestamp: new Date(earnings.report_date),
                severity: Math.abs(surprise) > 20 ? 'warning' : 'info'
            };
        });
    } catch (error) {
        console.error('Failed to fetch earnings alerts:', error);
        return [];
    }
}

/**
 * Fetch investor conference alerts
 */
export async function fetchConferenceAlerts(daysAhead: number = 14): Promise<TickerItem[]> {
    try {
        const now = new Date();
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + daysAhead);

        const { data, error } = await supabase
            .from('investor_conferences')
            .select(`
        *,
        stocks (symbol)
      `)
            .gte('conference_date', now.toISOString())
            .lte('conference_date', futureDate.toISOString())
            .order('conference_date', { ascending: true })
            .limit(5);

        if (error) throw error;

        return (data || []).map((conf: any) => ({
            id: `conf-${conf.id}`,
            type: 'investor_conference' as const,
            symbol: conf.stocks?.symbol || 'N/A',
            message: `法說會: ${conf.title}`,
            timestamp: new Date(conf.conference_date),
            severity: 'info'
        }));
    } catch (error) {
        console.error('Failed to fetch conference alerts:', error);
        return [];
    }
}

/**
 * Fetch insider trading alerts
 */
export async function fetchInsiderTradingAlerts(daysAgo: number = 7): Promise<TickerItem[]> {
    try {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysAgo);

        const { data, error } = await supabase
            .from('insider_trading')
            .select(`
        *,
        stocks (symbol)
      `)
            .gte('transaction_date', cutoffDate.toISOString().split('T')[0])
            .order('transaction_date', { ascending: false })
            .limit(5);

        if (error) throw error;

        return (data || []).map((trade: any) => {
            const isBuy = trade.transaction_type === 'buy';
            return {
                id: `insider-${trade.id}`,
                type: 'insider_trading' as const,
                symbol: trade.stocks?.symbol || 'N/A',
                message: `${trade.insider_position} ${isBuy ? '買進' : '賣出'} ${(trade.shares / 1000000).toFixed(1)}M 股`,
                value: trade.total_value,
                timestamp: new Date(trade.transaction_date),
                severity: isBuy ? 'info' : 'warning'
            };
        });
    } catch (error) {
        console.error('Failed to fetch insider trading alerts:', error);
        return [];
    }
}

/**
 * Fetch foreign investor flow alerts
 */
export async function fetchForeignFlowAlerts(daysAgo: number = 5): Promise<TickerItem[]> {
    try {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysAgo);

        const { data, error } = await supabase
            .from('foreign_flow')
            .select(`
        *,
        stocks (symbol)
      `)
            .gte('trade_date', cutoffDate.toISOString().split('T')[0])
            .order('net_volume', { ascending: false })
            .limit(10);

        if (error) throw error;

        // Filter for significant flows (> 1M shares net)
        const significantFlows = (data || []).filter((flow: any) =>
            Math.abs(flow.net_volume) > 1000000
        );

        return significantFlows.slice(0, 5).map((flow: any) => {
            const isBuying = flow.net_volume > 0;
            return {
                id: `foreign-${flow.id}`,
                type: 'foreign_flow' as const,
                symbol: flow.stocks?.symbol || 'N/A',
                message: `外資${isBuying ? '買超' : '賣超'} ${(Math.abs(flow.net_volume) / 1000000).toFixed(1)}M 股`,
                value: flow.net_value,
                changePercent: flow.ownership_percent,
                timestamp: new Date(flow.trade_date),
                severity: isBuying ? 'info' : 'warning'
            };
        });
    } catch (error) {
        console.error('Failed to fetch foreign flow alerts:', error);
        return [];
    }
}

/**
 * Fetch technical indicator signals
 */
export async function fetchTechnicalSignalAlerts(daysAgo: number = 3): Promise<TickerItem[]> {
    try {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysAgo);

        const { data, error } = await supabase
            .from('technical_indicators')
            .select(`
        *,
        stocks (symbol)
      `)
            .gte('indicator_date', cutoffDate.toISOString().split('T')[0])
            .order('indicator_date', { ascending: false });

        if (error) throw error;

        const signals: TickerItem[] = [];

        (data || []).forEach((indicator: any) => {
            const symbol = indicator.stocks?.symbol || 'N/A';
            const timestamp = new Date(indicator.indicator_date);

            // RSI Overbought (>70)
            if (indicator.rsi_14 > 70) {
                signals.push({
                    id: `tech-rsi-ob-${indicator.id}`,
                    type: 'technical_signal' as const,
                    symbol,
                    message: `RSI 超買 ${indicator.rsi_14.toFixed(1)}`,
                    value: indicator.rsi_14,
                    timestamp,
                    severity: 'warning'
                });
            }

            // RSI Oversold (<30)
            if (indicator.rsi_14 < 30) {
                signals.push({
                    id: `tech-rsi-os-${indicator.id}`,
                    type: 'technical_signal' as const,
                    symbol,
                    message: `RSI 超賣 ${indicator.rsi_14.toFixed(1)}`,
                    value: indicator.rsi_14,
                    timestamp,
                    severity: 'info'
                });
            }

            // MACD Golden Cross (histogram > 0 and increasing)
            if (indicator.macd_histogram > 0 && indicator.macd > indicator.macd_signal) {
                signals.push({
                    id: `tech-macd-gc-${indicator.id}`,
                    type: 'technical_signal' as const,
                    symbol,
                    message: `MACD 金叉`,
                    timestamp,
                    severity: 'info'
                });
            }

            // MACD Death Cross (histogram < 0 and decreasing)
            if (indicator.macd_histogram < 0 && indicator.macd < indicator.macd_signal) {
                signals.push({
                    id: `tech-macd-dc-${indicator.id}`,
                    type: 'technical_signal' as const,
                    symbol,
                    message: `MACD 死叉`,
                    timestamp,
                    severity: 'warning'
                });
            }
        });

        return signals.slice(0, 5);
    } catch (error) {
        console.error('Failed to fetch technical signals:', error);
        return [];
    }
}

/**
 * Combine all ticker sources (live data + news + dividends + advanced alerts)
 */
export async function generateCombinedTickerItems(stocks: StockData[]): Promise<TickerItem[]> {
    // Generate live alerts from stock data
    const liveAlerts = generateTickerItems(stocks);

    // Fetch all alert types in parallel
    const [
        newsAlerts,
        dividendAlerts,
        earningsAlerts,
        conferenceAlerts,
        insiderAlerts,
        foreignAlerts,
        technicalAlerts
    ] = await Promise.all([
        fetchNewsAlerts(3),
        fetchDividendAlerts(7),
        fetchEarningsAlerts(30),
        fetchConferenceAlerts(14),
        fetchInsiderTradingAlerts(7),
        fetchForeignFlowAlerts(5),
        fetchTechnicalSignalAlerts(3)
    ]);

    // Combine and sort by timestamp (newest first)
    const combined = [
        ...liveAlerts,
        ...newsAlerts,
        ...dividendAlerts,
        ...earningsAlerts,
        ...conferenceAlerts,
        ...insiderAlerts,
        ...foreignAlerts,
        ...technicalAlerts
    ];

    return combined.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}

