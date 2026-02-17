/**
 * Real-time updates using Supabase Realtime
 * Listens for new price updates, news, and alerts
 */

import { supabase } from './supabase';
import { TickerItem } from '@/components/MarketTicker';

export type RealtimeCallback = (alert: TickerItem) => void;

/**
 * Subscribe to real-time price updates
 */
export function subscribeToPriceUpdates(callback: RealtimeCallback) {
    const channel = supabase
        .channel('price-updates')
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'price_logs'
            },
            async (payload) => {
                const newLog = payload.new as any;

                // Fetch stock info
                const { data: stock } = await supabase
                    .from('stocks')
                    .select('symbol')
                    .eq('id', newLog.stock_id)
                    .single();

                if (!stock) return;

                // Check if significant change
                const changePercent = newLog.change_percent || 0;
                if (Math.abs(changePercent) >= 5) {
                    const alert: TickerItem = {
                        id: `realtime-${newLog.id}`,
                        type: changePercent > 0 ? 'price_surge' : 'price_drop',
                        symbol: stock.symbol,
                        message: changePercent > 0
                            ? `大漲 ${changePercent.toFixed(2)}%`
                            : `大跌 ${Math.abs(changePercent).toFixed(2)}%`,
                        changePercent,
                        timestamp: new Date(),
                        severity: Math.abs(changePercent) >= 10 ? 'critical' : 'warning'
                    };
                    callback(alert);
                }
            }
        )
        .subscribe();

    return channel;
}

/**
 * Subscribe to real-time news updates
 */
export function subscribeToNews(callback: RealtimeCallback) {
    const channel = supabase
        .channel('news-updates')
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'market_news'
            },
            async (payload) => {
                const news = payload.new as any;

                // Fetch stock info if stock_id exists
                let symbol = '市場';
                if (news.stock_id) {
                    const { data: stock } = await supabase
                        .from('stocks')
                        .select('symbol')
                        .eq('id', news.stock_id)
                        .single();
                    if (stock) symbol = stock.symbol;
                }

                const alert: TickerItem = {
                    id: `news-${news.id}`,
                    type: 'news_flash',
                    symbol,
                    message: news.title_zh || news.title_original,
                    timestamp: new Date(news.published_at),
                    severity: news.news_type === 'regulatory' ? 'warning' : 'info'
                };
                callback(alert);
            }
        )
        .subscribe();

    return channel;
}

/**
 * Subscribe to real-time dividend announcements
 */
export function subscribeToDividends(callback: RealtimeCallback) {
    const channel = supabase
        .channel('dividend-updates')
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'dividend_history'
            },
            async (payload) => {
                const dividend = payload.new as any;

                // Fetch stock info
                const { data: stock } = await supabase
                    .from('stocks')
                    .select('symbol')
                    .eq('id', dividend.stock_id)
                    .single();

                if (!stock) return;

                const alert: TickerItem = {
                    id: `div-${dividend.id}`,
                    type: 'dividend',
                    symbol: stock.symbol,
                    message: `配息 ฿${dividend.amount} (除息日 ${dividend.ex_date})`,
                    value: dividend.amount,
                    timestamp: new Date(dividend.ex_date),
                    severity: 'info'
                };
                callback(alert);
            }
        )
        .subscribe();

    return channel;
}

/**
 * Subscribe to all real-time updates
 */
export function subscribeToAllUpdates(callback: RealtimeCallback) {
    const channels = [
        subscribeToPriceUpdates(callback),
        subscribeToNews(callback),
        subscribeToDividends(callback)
    ];

    // Return unsubscribe function
    return () => {
        channels.forEach(channel => {
            supabase.removeChannel(channel);
        });
    };
}
