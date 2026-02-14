"use client";

import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";

interface ValuationCardProps {
    symbol: string;
    score: number; // 0-100
    metrics: {
        yield: number; // 0-100 normalized
        pe: number;
        pb: number;
        growth: number;
        stability: number;
    };
}

export default function ValuationCard({ symbol, score, metrics }: ValuationCardProps) {
    const data = [
        { subject: 'Yield', A: metrics.yield, fullMark: 100 },
        { subject: 'P/E', A: metrics.pe, fullMark: 100 },
        { subject: 'P/B', A: metrics.pb, fullMark: 100 },
        { subject: 'Growth', A: metrics.growth, fullMark: 100 },
        { subject: 'Stability', A: metrics.stability, fullMark: 100 },
    ];

    const getScoreColor = (s: number) => {
        if (s >= 80) return "text-gold";
        if (s >= 60) return "text-rise";
        return "text-slate-400";
    };

    return (
        <div className="glass-card p-6 border-l-4 border-l-transparent hover:border-l-[var(--gold)] transition-all">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h3 className="text-2xl font-black tracking-tighter">{symbol}</h3>
                    <p className="text-xs text-slate-500 uppercase tracking-widest font-bold">估值模型 (Valuation)</p>
                </div>
                <div className="text-right">
                    <div className={cn("text-4xl font-black font-mono", getScoreColor(score))}>
                        {score} <span className="text-sm text-slate-500 font-normal">/ 100</span>
                    </div>
                    <div className="text-[10px] text-slate-400 uppercase tracking-widest">綜合評分 (Total Score)</div>
                </div>
            </div>

            <div className="h-[200px] w-full -ml-4">
                <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
                        <PolarGrid stroke="rgba(255,255,255,0.1)" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#a3a3a3', fontSize: 10, fontWeight: 'bold' }} />
                        <Radar
                            name={symbol}
                            dataKey="A"
                            stroke="#ffd700"
                            strokeWidth={2}
                            fill="#ffd700"
                            fillOpacity={0.2}
                        />
                    </RadarChart>
                </ResponsiveContainer>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="bg-white/5 p-2 rounded text-center">
                    <span className="block text-[10px] text-slate-400 uppercase">Dividend Yield</span>
                    <span className="block text-lg font-bold text-rise font-mono">{(metrics.yield).toFixed(2)}%</span>
                </div>
                <div className="bg-white/5 p-2 rounded text-center">
                    <span className="block text-[10px] text-slate-400 uppercase">Payout Ratio</span>
                    <span className="block text-lg font-bold text-slate-200 font-mono">{(metrics.stability).toFixed(0)}%</span>
                </div>
            </div>
        </div>
    );
}
