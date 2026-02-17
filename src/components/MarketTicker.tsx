"use client";

import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown, AlertCircle, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TickerItem {
    id: string;
    type: 'price_surge' | 'price_drop' | 'volume_spike' | 'high_yield' | 'dividend' | 'news_flash' | 'earnings_report' | 'investor_conference' | 'insider_trading' | 'foreign_flow' | 'technical_signal';
    symbol: string;
    message: string;
    value?: number;
    changePercent?: number;
    timestamp: Date;
    severity: 'info' | 'warning' | 'critical';
}

interface MarketTickerProps {
    items: TickerItem[];
    onItemClick?: (symbol: string) => void;
    speed?: number; // pixels per second
    pauseOnHover?: boolean;
}

export default function MarketTicker({
    items,
    onItemClick,
    speed = 50,
    pauseOnHover = true
}: MarketTickerProps) {
    const [isPaused, setIsPaused] = useState(false);

    if (!items || items.length === 0) {
        return null;
    }

    // Duplicate items for seamless loop
    const displayItems = [...items, ...items];

    const getIcon = (type: TickerItem['type']) => {
        switch (type) {
            case 'price_surge':
                return <TrendingUp size={16} className="text-rise" />;
            case 'price_drop':
                return <TrendingDown size={16} className="text-fall" />;
            case 'volume_spike':
                return <Zap size={16} className="text-yellow-400" />;
            case 'high_yield':
                return <TrendingUp size={16} className="text-[var(--gold)]" />;
            case 'dividend':
                return <span className="text-[var(--gold)] font-bold text-lg">฿</span>;
            case 'news_flash':
                return <AlertCircle size={16} className="text-blue-400" />;
            default:
                return null;
        }
    };

    const getSeverityColor = (severity: TickerItem['severity']) => {
        switch (severity) {
            case 'critical':
                return 'bg-red-500/20 border-red-500/50 text-red-200';
            case 'warning':
                return 'bg-yellow-500/20 border-yellow-500/50 text-yellow-200';
            case 'info':
            default:
                return 'bg-blue-500/20 border-blue-500/50 text-blue-200';
        }
    };

    return (
        <div className="ticker-container bg-black/90 border-b border-white/10 overflow-hidden relative">
            {/* Gradient Overlays */}
            <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-black/90 to-transparent z-10 pointer-events-none" />
            <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-black/90 to-transparent z-10 pointer-events-none" />

            {/* Ticker Content */}
            <div
                className="ticker-content flex items-center gap-6 py-2"
                style={{
                    animation: `scroll ${items.length * 8}s linear infinite`,
                    animationPlayState: isPaused ? 'paused' : 'running'
                }}
                onMouseEnter={() => pauseOnHover && setIsPaused(true)}
                onMouseLeave={() => pauseOnHover && setIsPaused(false)}
            >
                {displayItems.map((item, index) => (
                    <div
                        key={`${item.id}-${index}`}
                        onClick={() => onItemClick?.(item.symbol)}
                        className={cn(
                            "ticker-item flex items-center gap-2 px-4 py-1.5 rounded-lg border cursor-pointer transition-all hover:scale-105 whitespace-nowrap",
                            getSeverityColor(item.severity)
                        )}
                    >
                        {getIcon(item.type)}
                        <span className="font-bold text-white">{item.symbol}</span>
                        <span className="text-sm opacity-90">{item.message}</span>
                        {item.changePercent !== undefined && (
                            <span className={cn(
                                "text-sm font-bold ml-1",
                                item.changePercent >= 0 ? "text-rise" : "text-fall"
                            )}>
                                {item.changePercent > 0 ? '+' : ''}{item.changePercent.toFixed(2)}%
                            </span>
                        )}
                    </div>
                ))}
            </div>

            <style jsx>{`
        @keyframes scroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
      `}</style>
        </div>
    );
}
