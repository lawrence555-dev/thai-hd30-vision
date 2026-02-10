"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ExternalLink, Calendar, DollarSign, Activity } from "lucide-react";
import StockChart from "./StockChart";
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
}

interface ChartPoint {
    time: string;
    price: number;
}

export default function StockDetailPanel({ symbol, onClose }: StockDetailPanelProps) {
    const [details, setDetails] = useState<StockDetails | null>(null);
    const [chartData, setChartData] = useState<ChartPoint[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (symbol) {
            fetchStockDetails(symbol);
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

            if (logsError) throw logsError;

            // Process Data
            const latestLog = priceLogs && priceLogs.length > 0
                ? priceLogs[priceLogs.length - 1]
                : { price: 0, change: 0, change_percent: 0 };

            setDetails({
                symbol: stockData.symbol,
                name: stockData.name_en || stockData.symbol,
                sector: stockData.sector || 'Unknown',
                price: Number(latestLog.price),
                change: Number(latestLog.change),
                changePercent: Number(latestLog.change_percent),
                yield: Number(stockData.current_yield) || 0,
                avgYield: Number(stockData.avg_yield_5y) || 0
            });

            // Format Chart Data
            // If we have less than 2 points, maybe mock a straight line or wait for more data
            const formattedChartData = priceLogs.map((log: any) => ({
                time: new Date(log.captured_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                price: Number(log.price)
            }));

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
                                        <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">Real-time</div>
                                    </div>
                                    <div className="h-[350px] -mx-2">
                                        {chartData.length > 0 ? (
                                            <StockChart data={chartData} isUp={isUp} height={350} />
                                        ) : (
                                            <div className="h-full flex items-center justify-center text-slate-500">
                                                Insufficient data for chart
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Dividend Stats */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="glass-card p-5">
                                        <div className="flex items-center gap-2 text-slate-400 mb-2">
                                            <Calendar size={16} />
                                            <span className="text-xs font-bold uppercase tracking-widest">Sector</span>
                                        </div>
                                        <div className="text-xl font-bold text-white">{details.sector}</div>
                                    </div>
                                    <div className="glass-card p-5">
                                        <div className="flex items-center gap-2 text-slate-400 mb-2">
                                            <DollarSign size={16} />
                                            <span className="text-xs font-bold uppercase tracking-widest">Dividend Yield</span>
                                        </div>
                                        <div className="text-xl font-bold text-[var(--gold)]">{details.yield}%</div>
                                        <div className="text-sm text-slate-500 mt-1">5Y Avg: {details.avgYield}%</div>
                                    </div>
                                </div>

                                {/* AI Summary Placeholder */}
                                <div className="glass-card p-6 bg-gradient-to-br from-blue-900/20 to-purple-900/20 border-white/10">
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                                        <h3 className="text-sm font-bold text-blue-200 uppercase tracking-widest">Gemini AI Analysis</h3>
                                    </div>
                                    <p className="text-slate-300 leading-relaxed text-sm">
                                        {details.symbol} currently shows a dividend yield of <span className="text-[var(--gold)] font-bold">{details.yield}%</span>,
                                        compared to its 5-year average of {details.avgYield}%.
                                        {details.yield > details.avgYield
                                            ? "The stock appears to be potentially undervalued based on yield comparison."
                                            : "The stock is trading below its historical yield average."}
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
