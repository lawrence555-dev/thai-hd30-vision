"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ExternalLink, Calendar, DollarSign, Activity, TrendingUp, TrendingDown } from "lucide-react";
import { StockChart } from './StockChart';
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { formatCurrency } from "@/lib/valuation";

interface StockDetailPanelProps {
    symbol: string | null;
    onClose: () => void;
}

interface StockDetails {
    symbol: string;
    name: string;
    sector: string;
    price: number;
    change: number;
    changePercent: number;
    yield: number;
    avgYield: number;
    pe: number;
    pb: number;
    payoutRatio: number;
    profitGrowth: number;
    dividends?: any[];
}

interface ChartPoint {
    time: number;
    price: number;
}

import { SECTOR_TRANSLATIONS, UI_LABELS } from "@/lib/constants";

export default function StockDetailPanel({ symbol, onClose }: StockDetailPanelProps) {
    const [details, setDetails] = useState<StockDetails | null>(null);
    const [chartData, setChartData] = useState<ChartPoint[]>([]);
    const [chartMarkers, setChartMarkers] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [ready, setReady] = useState(false); // Validated fix for chart sizing

    useEffect(() => {
        if (symbol) {
            fetchStockDetails(symbol);
            // Delay chart rendering to allow panel animation to finish and layout to stabilize
            const timer = setTimeout(() => setReady(true), 600);
            return () => clearTimeout(timer);
        } else {
            setReady(false);
        }
    }, [symbol]);

    const fetchStockDetails = async (sym: string) => {
        setLoading(true);
        try {
            // 1. Fetch Stock Info
            const { data: stockData, error: stockError } = await supabase
                .from('stocks')
                .select('*')
                .eq('symbol', sym)
                .single();

            if (stockError) throw stockError;

            // 2. Fetch Historical Intraday Data (via our new API)
            // This ensures we have a chart even if we just started tracking
            let historicalData: ChartPoint[] = [];
            try {
                const res = await fetch(`/api/chart-data?symbol=${sym}`);
                if (res.ok) {
                    const json = await res.json();
                    if (json.data && Array.isArray(json.data)) {
                        historicalData = json.data;
                    }
                }
            } catch (err) {
                console.error("Failed to fetch historical chart data:", err);
            }

            // 3. Fetch Real-Time Price Logs (Local DB)
            const { data: priceLogs, error: logsError } = await supabase
                .from('price_logs')
                .select('price, captured_at')
                .eq('stock_id', stockData.id)
                .order('captured_at', { ascending: true })
                .limit(500); // Increased limit

            if (logsError) throw logsError;

            // 4. Merge Data (Historical + RealTime)
            // Strategy: Use Historical as base, append RealTime if newer
            const mergedDataMap = new Map<number, number>();

            // Add historical first
            historicalData.forEach(pt => mergedDataMap.set(pt.time, pt.price));

            // Add real-time logs (overwrite or append)
            if (priceLogs) {
                priceLogs.forEach(log => {
                    const time = Math.floor(new Date(log.captured_at).getTime() / 1000);
                    const price = Number(log.price);
                    mergedDataMap.set(time, price);
                });
            }

            // Ensure the current "Head" price is on the chart if valid and newer
            if (stockData.price && stockData.updated_at) {
                const lastUpdateTime = Math.floor(new Date(stockData.updated_at).getTime() / 1000);
                const currentPrice = Number(stockData.price);
                // Always update/set the latest price from DB to ensure consistency with Header
                mergedDataMap.set(lastUpdateTime, currentPrice);
            }

            // Get today's date in Bangkok timezone for comparison
            const todayBangkok = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });

            const rawChartData: ChartPoint[] = Array.from(mergedDataMap.entries())
                .filter(([time, _]) => {
                    const date = new Date(time * 1000);

                    // First check: Must be today in Bangkok timezone
                    const dateBangkok = date.toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });
                    if (dateBangkok !== todayBangkok) {
                        return false;
                    }

                    // Second check: Must be within trading hours
                    const thaiTime = date.toLocaleTimeString('en-GB', {
                        timeZone: 'Asia/Bangkok',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false
                    });
                    const [hours, minutes] = thaiTime.split(':').map(Number);
                    const totalMinutes = hours * 60 + minutes;

                    // Morning: 09:55 (595) - 12:35 (755)
                    const isMorning = totalMinutes >= 595 && totalMinutes <= 755;
                    // Afternoon: 14:25 (865) - 16:45 (1005)
                    const isAfternoon = totalMinutes >= 865 && totalMinutes <= 1005;

                    return isMorning || isAfternoon;
                })
                .map(([time, price]) => ({ time, price }))
                .sort((a, b) => a.time - b.time);

            // Insert whitespace data for lunch break to force time axis to show the gap
            // Whitespace data = { time: timestamp, value: undefined }
            const finalChartData: ChartPoint[] = [];
            const markers: any[] = [];

            let lastMorningPoint: ChartPoint | null = null;
            let firstAfternoonPoint: ChartPoint | null = null;

            // Separate morning and afternoon data
            for (const point of rawChartData) {
                const date = new Date(point.time * 1000);
                const thaiTime = date.toLocaleTimeString('en-GB', {
                    timeZone: 'Asia/Bangkok',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false
                });
                const [hours, minutes] = thaiTime.split(':').map(Number);
                const totalMinutes = hours * 60 + minutes;

                if (totalMinutes <= 755) { // Morning session
                    finalChartData.push(point);
                    lastMorningPoint = point;
                } else { // Afternoon session
                    if (!firstAfternoonPoint) {
                        firstAfternoonPoint = point;
                    }
                }
            }

            // Insert whitespace data points for lunch break
            if (lastMorningPoint && firstAfternoonPoint) {
                // Generate whitespace points every 10 minutes during lunch
                // This forces the time axis to show the lunch period
                let currentTime = lastMorningPoint.time + 600; // Start 10 mins after last morning point

                while (currentTime < firstAfternoonPoint.time - 600) {
                    finalChartData.push({
                        time: currentTime,
                        value: undefined as any // Whitespace data - no value
                    });
                    currentTime += 600; // Every 10 minutes
                }

                // Add marker at end of morning session
                markers.push({
                    time: lastMorningPoint.time,
                    position: 'aboveBar',
                    color: '#94a3b8',
                    shape: 'arrowDown',
                    text: '午休時間'
                });
            }

            // Add afternoon data
            for (const point of rawChartData) {
                const date = new Date(point.time * 1000);
                const thaiTime = date.toLocaleTimeString('en-GB', {
                    timeZone: 'Asia/Bangkok',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false
                });
                const [hours, minutes] = thaiTime.split(':').map(Number);
                const totalMinutes = hours * 60 + minutes;

                if (totalMinutes >= 865) { // Afternoon session
                    finalChartData.push(point);
                }
            }

            setChartMarkers(markers);
            setChartData(finalChartData);

            // 5. Fetch Dividend History
            const { data: divHistory, error: divError } = await supabase
                .from('dividend_history')
                .select('*')
                .eq('stock_id', stockData.id)
                .order('ex_date', { ascending: false });

            if (divError) throw divError;

            // Explicitly set header details to match stockData exactly
            setDetails({
                symbol: stockData.symbol,
                name: stockData.name_en || stockData.symbol,
                sector: stockData.sector,
                price: Number(stockData.price), // Direct from DB
                change: Number(stockData.change),
                changePercent: Number(stockData.change_percent),
                yield: Number(stockData.current_yield),
                avgYield: Number(stockData.avg_yield_5y),
                pe: Number(stockData.pe_ratio),
                pb: Number(stockData.pb_ratio),
                payoutRatio: Number(stockData.payout_ratio),
                profitGrowth: Number(stockData.profit_growth_yoy),
                dividends: divHistory || []
            });

            setChartData(finalChartData);

        } catch (error) {
            console.error("Error fetching details:", error);
        } finally {
            setLoading(false);
        }
    };

    const isUp = details ? details.change >= 0 : true;

    return (
        <AnimatePresence>
            {symbol && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
                    />

                    {/* Panel */}
                    <motion.div
                        initial={{ x: "100%" }}
                        animate={{ x: 0 }}
                        exit={{ x: "100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        className="fixed right-0 top-0 bottom-0 w-full max-w-2xl bg-[#0a0a0a] border-l border-[var(--glass-border)] z-50 overflow-y-auto shadow-2xl"
                    >
                        {loading && !details ? (
                            <div className="h-full flex items-center justify-center">
                                <div className="animate-spin text-[var(--gold)]">
                                    <Activity size={32} />
                                </div>
                            </div>
                        ) : details ? (
                            <div className="p-6 space-y-8">
                                {/* Header */}
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="flex items-center gap-3 mb-2">
                                            <h2 className="text-4xl font-black tracking-tighter text-white">{details.symbol}</h2>
                                            <span className="px-2 py-1 bg-white/10 rounded text-xs font-bold text-slate-300">SETHD</span>
                                        </div>
                                        <p className="text-slate-400 font-medium">{details.name}</p>
                                    </div>
                                    <button
                                        onClick={onClose}
                                        className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-400 hover:text-white"
                                    >
                                        <X size={24} />
                                    </button>
                                </div>

                                {/* Main Chart */}
                                <div className="glass-card p-6 border-white/5">
                                    <div className="flex items-baseline gap-3 mb-1">
                                        <div className="text-5xl font-mono font-bold text-white tracking-tighter shadow-xl">
                                            {details.price ? details.price.toFixed(2) : "0.00"}
                                        </div>
                                        <div className={cn("text-lg font-bold flex items-center", isUp ? "text-rise" : "text-fall")}>
                                            {isUp ? <TrendingUp size={20} className="mr-1" /> : <TrendingDown size={20} className="mr-1" />}
                                            {details.change ? (details.change > 0 ? '+' : '') + details.change.toFixed(2) : "0.00"}
                                            <span className="ml-1 opacity-80">
                                                ({details.changePercent ? (details.changePercent > 0 ? '+' : '') + details.changePercent.toFixed(2) : "0.00"}%)
                                            </span>
                                        </div>
                                        <div className="text-xs text-slate-500 font-bold uppercase tracking-widest ml-auto">
                                            {UI_LABELS.REAL_TIME}
                                        </div>
                                    </div>

                                    {/* Chart Area */}
                                    <div className="h-[320px] w-full mb-6 relative group">
                                        {ready && chartData && chartData.length > 0 ? (
                                            (() => {
                                                // 1. Sort logs by time (chartData already has time in seconds)
                                                const sortedLogs = [...chartData].sort((a, b) => a.time - b.time);

                                                // 2. Filter for "Last Available Day" (Ensure we show data even if today is a holiday/weekend)
                                                const lastLogTime = sortedLogs[sortedLogs.length - 1].time * 1000;
                                                const lastDate = new Date(lastLogTime).toDateString();

                                                const todaysLogs = sortedLogs.filter(log =>
                                                    new Date(log.time * 1000).toDateString() === lastDate
                                                );

                                                // 3. Map to Chart Data
                                                const chartDataPoints = todaysLogs.map(log => ({
                                                    time: log.time,
                                                    price: log.price // FIXED: StockChart expects 'price', not 'value'
                                                }));

                                                // Calculate markers for dividends (if details loaded)
                                                const dividendMarkers = (details && details.dividends)
                                                    ? details.dividends
                                                        .filter((div: any) => {
                                                            const exDate = new Date(div.ex_date);
                                                            return exDate.toDateString() === lastDate;
                                                        })
                                                        .map((div: any) => ({
                                                            time: Math.floor(new Date(div.ex_date).getTime() / 1000),
                                                            position: 'aboveBar',
                                                            color: '#FFD700', // Gold color for dividend markers
                                                            shape: 'arrowUp',
                                                            text: `Div: ${div.amount}`
                                                        }))
                                                    : [];

                                                // Merge Lunch Markers (from state) + Dividend Markers
                                                const combinedMarkers = [...chartMarkers, ...dividendMarkers];

                                                return (
                                                    <StockChart
                                                        data={chartDataPoints}
                                                        markers={combinedMarkers}
                                                        color={isUp ? '#ff4d4d' : '#22c55e'}
                                                    />
                                                );
                                            })()
                                        ) : (
                                            <div className="flex items-center justify-center h-full text-slate-600">Waiting for Data...</div>
                                        )}
                                    </div>

                                    {/* Key Statistics Grid */}
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                                        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col items-center justify-center gap-1 hover:bg-white/10 transition-colors">
                                            <div className="text-slate-400 text-[10px] uppercase tracking-widest font-bold">{UI_LABELS.YIELD} <span className="text-[9px] opacity-70">Yield</span></div>
                                            <div className={cn("text-xl font-mono font-bold",
                                                details.yield >= 6 ? "text-[var(--gold)]" : "text-white"
                                            )}>
                                                {details.yield ? details.yield.toFixed(2) : "0.00"}%
                                            </div>
                                        </div>
                                        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col items-center justify-center gap-1 hover:bg-white/10 transition-colors">
                                            <div className="text-slate-400 text-[10px] uppercase tracking-widest font-bold">{UI_LABELS.PE} <span className="text-[9px] opacity-70">P/E</span></div>
                                            <div className="text-xl font-mono font-bold text-white">
                                                {details.pe ? details.pe.toFixed(2) : "N/A"}
                                            </div>
                                        </div>
                                        <div className="text-xl font-bold text-white col-span-2 md:col-span-2 flex items-center justify-center bg-white/5 rounded-2xl border border-white/10">
                                            {SECTOR_TRANSLATIONS[details.sector] || details.sector}
                                        </div>
                                    </div>
                                    <div className="glass-card p-5">
                                        <div className="flex items-center gap-2 text-slate-400 mb-2">
                                            <DollarSign size={16} />
                                            <span className="text-xs font-bold uppercase tracking-widest flex items-center gap-1">
                                                {UI_LABELS.YIELD} <span className="opacity-50">Yield</span>
                                            </span>
                                        </div>
                                        <div className="text-xl font-bold text-[var(--gold)]">{details.yield ? details.yield.toFixed(2) : "0.00"}%</div>
                                        <div className="text-sm text-slate-500 mt-1 flex items-center gap-1">
                                            {UI_LABELS.AVG_YIELD_5Y}: {details.avgYield}%
                                        </div>
                                    </div>
                                    <div className="glass-card p-5">
                                        <div className="flex items-center gap-2 text-slate-400 mb-2">
                                            <Activity size={16} />
                                            <span className="text-xs font-bold uppercase tracking-widest flex items-center gap-1">
                                                {UI_LABELS.PE} <span className="opacity-50">P/E</span>
                                            </span>
                                        </div>
                                        <div className="text-xl font-bold text-white">{details.pe > 0 ? details.pe.toFixed(1) : '-'}</div>
                                        <div className="text-sm text-slate-500 mt-1 flex items-center gap-1">
                                            {details.pe < 15 ? '低於平均' : '高於平均'}
                                        </div>
                                    </div>
                                    <div className="glass-card p-5">
                                        <div className="flex items-center gap-2 text-slate-400 mb-2">
                                            <Activity size={16} />
                                            <span className="text-xs font-bold uppercase tracking-widest flex items-center gap-1">
                                                股價淨值比 <span className="opacity-50">P/B</span>
                                            </span>
                                        </div>
                                        <div className="text-xl font-bold text-white">{details.pb > 0 ? details.pb.toFixed(1) : '-'}</div>
                                        <div className="text-sm text-slate-500 mt-1 flex items-center gap-1">
                                            {details.pb < 1.5 ? '低估' : '高估'}
                                        </div>
                                    </div>
                                    <div className="glass-card p-5">
                                        <div className="flex items-center gap-2 text-slate-400 mb-2">
                                            <Activity size={16} />
                                            <span className="text-xs font-bold uppercase tracking-widest flex items-center gap-1">
                                                淨利成長 <span className="opacity-50">Growth</span>
                                            </span>
                                        </div>
                                        <div className={cn("text-xl font-bold", details.profitGrowth >= 0 ? "text-rise" : "text-fall")}>
                                            {details.profitGrowth > 0 ? '+' : ''}{details.profitGrowth.toFixed(1)}%
                                        </div>
                                        <div className="text-sm text-slate-500 mt-1 flex items-center gap-1">
                                            {details.profitGrowth >= 5 ? '▲ 穩健成長' : details.profitGrowth < 0 ? '▼ 獲利衰退' : '持平'}
                                        </div>
                                    </div>
                                    <div className="glass-card p-5">
                                        <div className="flex items-center gap-2 text-slate-400 mb-2">
                                            <DollarSign size={16} />
                                            <span className="text-xs font-bold uppercase tracking-widest flex items-center gap-1">
                                                派息配發率 <span className="opacity-50">Payout</span>
                                            </span>
                                        </div>
                                        <div className={cn("text-xl font-bold", details.payoutRatio > 100 ? "text-fall" : "text-[var(--gold)]")}>
                                            {details.payoutRatio.toFixed(0)}%
                                        </div>
                                        <div className="text-sm text-slate-500 mt-1 flex items-center gap-1">
                                            {details.payoutRatio > 100 ? '▼ 配息過高' : '健康區間'}
                                        </div>
                                    </div>
                                </div>

                                {/* Dividend History List */}
                                <div className="glass-card p-6 border-white/5">
                                    <div className="flex items-center gap-2 mb-4">
                                        <DollarSign className="text-[var(--gold)]" size={20} />
                                        <div className="flex items-baseline gap-2">
                                            <h3 className="text-sm font-bold text-white uppercase tracking-widest">Dividend History (5Y)</h3>
                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">配息紀錄</span>
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        {details.dividends && details.dividends.length > 0 ? (
                                            details.dividends.map((div: any) => (
                                                <div key={div.id} className="flex justify-between items-center py-2 border-b border-white/5 last:border-0 hover:bg-white/5 px-2 rounded transition-colors">
                                                    <div>
                                                        <div className="text-sm font-bold text-slate-300">{div.ex_date}</div>
                                                        <div className="text-xs text-slate-500 flex items-center gap-1">
                                                            Ex-Date <span className="opacity-50">除息日</span>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-sm font-mono font-bold text-[var(--gold)]">฿{div.amount}</div>
                                                        <div className="text-xs text-slate-500">{div.type}</div>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="text-sm text-slate-500 text-center py-4">No dividend history found.</div>
                                        )}
                                    </div>
                                </div>

                                {/* AI Summary Placeholder */}
                                <div className="glass-card p-6 bg-gradient-to-br from-blue-900/20 to-purple-900/20 border-white/10">
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                                        <div className="flex items-baseline gap-2">
                                            <h3 className="text-sm font-bold text-blue-200 uppercase tracking-widest">Gemini AI Analysis</h3>
                                            <span className="text-[10px] font-bold text-blue-300/50 uppercase tracking-wider">智能分析</span>
                                        </div>
                                    </div>
                                    <p className="text-slate-300 leading-relaxed text-sm">
                                        {details.symbol} 目前顯示股息殖利率為 <span className="text-[var(--gold)] font-bold">{details.yield ? details.yield.toFixed(2) : "0.00"}%</span>，
                                        與其五年平均值 {details.avgYield ? details.avgYield.toFixed(2) : "0.00"}% 相比。
                                        {details.yield > details.avgYield
                                            ? "根據殖利率比較，該股票目前似乎被低估，具有投資潛力。"
                                            : "該股票目前的交易價格低於其歷史平均殖利率水平。"}
                                    </p>
                                </div>
                            </div>
                        ) : null}
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
