"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, ExternalLink, Calendar, DollarSign } from "lucide-react";
import StockChart from "./StockChart";
import { getMockIntradayData } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

interface StockDetailPanelProps {
    symbol: string | null;
    onClose: () => void;
}

export default function StockDetailPanel({ symbol, onClose }: StockDetailPanelProps) {
    // In real app, fetch data based on symbol here
    const chartData = getMockIntradayData();
    const isUp = Math.random() > 0.5;

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
                        <div className="p-6 space-y-8">
                            {/* Header */}
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="flex items-center gap-3 mb-2">
                                        <h2 className="text-4xl font-black tracking-tighter text-white">{symbol}</h2>
                                        <span className="px-2 py-1 bg-white/10 rounded text-xs font-bold text-slate-300">SETHD</span>
                                    </div>
                                    <p className="text-slate-400 font-medium">PTT Public Company Limited</p>
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
                                        <span className="text-5xl font-black font-mono tracking-tight text-white">34.50</span>
                                        <span className={cn("text-xl font-bold font-mono", isUp ? "text-rise" : "text-fall")}>
                                            {isUp ? "+" : "-"}0.75 (2.1%)
                                        </span>
                                    </div>
                                    <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">Intraday 5M</div>
                                </div>
                                <div className="h-[350px] -mx-2">
                                    <StockChart data={chartData} isUp={isUp} height={350} />
                                </div>
                            </div>

                            {/* Dividend Stats */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="glass-card p-5">
                                    <div className="flex items-center gap-2 text-slate-400 mb-2">
                                        <Calendar size={16} />
                                        <span className="text-xs font-bold uppercase tracking-widest">Next Payout</span>
                                    </div>
                                    <div className="text-xl font-bold text-white">Apr 24, 2026</div>
                                    <div className="text-sm text-slate-500 mt-1">Ex-Date: Mar 05, 2026</div>
                                </div>
                                <div className="glass-card p-5">
                                    <div className="flex items-center gap-2 text-slate-400 mb-2">
                                        <DollarSign size={16} />
                                        <span className="text-xs font-bold uppercase tracking-widest">Dividend Yield</span>
                                    </div>
                                    <div className="text-xl font-bold text-[var(--gold)]">5.82%</div>
                                    <div className="text-sm text-slate-500 mt-1">5Y Avg: 5.2%</div>
                                </div>
                            </div>

                            {/* AI Summary Placeholder */}
                            <div className="glass-card p-6 bg-gradient-to-br from-blue-900/20 to-purple-900/20 border-white/10">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                                    <h3 className="text-sm font-bold text-blue-200 uppercase tracking-widest">Gemini AI Analysis</h3>
                                </div>
                                <p className="text-slate-300 leading-relaxed text-sm">
                                    PTT maintains a strong balance sheet with a <span className="text-white font-bold">Net Debt/EBITDA of 1.2x</span>.
                                    Despite global oil price volatility, the company's diversified portfolio across gas and retail stabilizes cash flow.
                                    Analysts project a <span className="text-[var(--gold)] font-bold">stable dividend payout</span> for FY2026 based on current free cash flow projections.
                                </p>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
