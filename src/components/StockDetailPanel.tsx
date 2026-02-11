"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ExternalLink, Calendar, DollarSign, Activity } from "lucide-react";
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
    time: string;
    price: number;
}

const SECTOR_TRANSLATIONS: Record<string, string> = {
    "Energy": "能源",
    "Banking": "銀行",
    "Information & Communication Technology": "資通訊",
    "Transportation & Logistics": "運輸物流",
    "Commerce": "商業",
    "Property Development": "地產開發",
    "Food & Beverage": "食品飲料",
    "Health Care Services": "醫療服務",
    "Construction Services": "營建服務",
    "Electronic Components": "電子零組件",
    "Resources": "資源",
    "Services": "服務",
    "Technology": "科技",
    "Financials": "金融",
    "Agro & Food Industry": "農工食品",
    "Industrials": "工業",
    "Consumer Products": "消費品",
    "Property & Construction": "地產營建",
    "Property": "地產",
    "Utilities": "公用事業",
};

export default function StockDetailPanel({ symbol, onClose }: StockDetailPanelProps) {
    const [details, setDetails] = useState<StockDetails | null>(null);
    const [chartData, setChartData] = useState<ChartPoint[]>([]);
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

            // 2. Fetch Price History (Last 50 points for chart)
            const { data: priceLogs, error: logsError } = await supabase
                .from('price_logs')
                .select('price, captured_at, change, change_percent')
                .eq('stock_id', stockData.id)
                .order('captured_at', { ascending: true }) // Chart needs chronological order
                .limit(50); // Limit to recent history for 'intraday' feel

            // 3. Fetch Dividend History
            const { data: divHistory, error: divError } = await supabase
                .from('dividend_history')
                .select('*')
                .eq('stock_id', stockData.id)
                .order('ex_date', { ascending: false });

            if (divError) throw divError;

            // Process Data
            const latestLog = priceLogs && priceLogs.length > 0
                ? priceLogs[priceLogs.length - 1]
                : { price: 0, change: 0, change_percent: 0 };

            setDetails({
                symbol: stockData.symbol,
                name: stockData.name_en || stockData.symbol,
                sector: stockData.sector || 'Unknown',
                price: Number(latestLog.price) || Number(stockData.market_cap) || 0, // Fallback to market_cap if price is 0 (hacky but prevents 0)
                change: Number(latestLog.change),
                changePercent: Number(latestLog.change_percent),
                yield: Number(stockData.current_yield) || 0,
                avgYield: Number(stockData.avg_yield_5y) || 0,
                pe: Number(stockData.pe) || 0,
                pb: Number(stockData.pb) || 0,
                payoutRatio: Number(stockData.payout_ratio) || 0,
                profitGrowth: Number(stockData.net_profit_growth_yoy) || 0,
                dividends: divHistory || []
            });

            // Format Chart Data from Real DB Logs
            let formattedChartData: ChartPoint[] = [];

            if (priceLogs && priceLogs.length > 0) {
                formattedChartData = priceLogs.map(log => {
                    const time = new Date(log.captured_at).getTime() / 1000;
                    return {
                        time: Math.floor(time),
                        price: Number(log.price)
                    };
                });
            } else {
                // Fallback if no logs: Show single point or empty to avoid crash
                // But better to show nothing/loading state in UI if empty.
                // For now, push current price as a single point line
                formattedChartData.push({
                    time: Math.floor(Date.now() / 1000),
                    price: Number(latestLog.price) || 0
                });
            }

            setChartData(formattedChartData);

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
                                    <div className="flex justify-between items-baseline mb-6">
                                        <div className="flex items-baseline gap-4">
                                            <span className="text-5xl font-black font-mono tracking-tight text-white">
                                                {formatCurrency(details.price)}
                                            </span>
                                            <span className={cn("text-xl font-bold font-mono", isUp ? "text-rise" : "text-fall")}>
                                                {isUp ? "+" : ""}{details.change} ({details.changePercent}%)
                                            </span>
                                        </div>
                                        <div className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1">
                                            Real-time <span className="opacity-50">即時</span>
                                        </div>
                                    </div>
                                    <div className="h-[350px] -mx-2">
                                        {ready && chartData.length > 0 ? (
                                            <StockChart data={chartData} isUp={isUp} height={350} />
                                        ) : (
                                            <div className="h-full flex items-center justify-center text-slate-500">
                                                {!ready ? "Loading Chart..." : "Insufficient data for chart"}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Dividend Stats */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="glass-card p-5">
                                        <div className="flex items-center gap-2 text-slate-400 mb-2">
                                            <Calendar size={16} />
                                            <span className="text-xs font-bold uppercase tracking-widest flex items-center gap-1">
                                                產業 <span className="opacity-50">Sector</span>
                                            </span>
                                        </div>
                                        <div className="text-xl font-bold text-white">
                                            {SECTOR_TRANSLATIONS[details.sector] || details.sector}
                                        </div>
                                    </div>
                                    <div className="glass-card p-5">
                                        <div className="flex items-center gap-2 text-slate-400 mb-2">
                                            <DollarSign size={16} />
                                            <span className="text-xs font-bold uppercase tracking-widest flex items-center gap-1">
                                                殖利率 <span className="opacity-50">Yield</span>
                                            </span>
                                        </div>
                                        <div className="text-xl font-bold text-[var(--gold)]">{details.yield}%</div>
                                        <div className="text-sm text-slate-500 mt-1 flex items-center gap-1">
                                            五年平均: {details.avgYield}%
                                        </div>
                                    </div>
                                    <div className="glass-card p-5">
                                        <div className="flex items-center gap-2 text-slate-400 mb-2">
                                            <Activity size={16} />
                                            <span className="text-xs font-bold uppercase tracking-widest flex items-center gap-1">
                                                本益比 <span className="opacity-50">P/E</span>
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
                                            {details.profitGrowth >= 5 ? '✅ 穩健成長' : details.profitGrowth < 0 ? '⚠️ 獲利衰退' : '持平'}
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
                                            {details.payoutRatio > 100 ? '⚠️ 配息過高' : '健康區間'}
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
                                        {details.symbol} 目前顯示股息殖利率為 <span className="text-[var(--gold)] font-bold">{details.yield}%</span>，
                                        與其五年平均值 {details.avgYield}% 相比。
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
