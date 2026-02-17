"use client";

import { useState, useEffect } from "react";
import { Bell, X, TrendingUp, TrendingDown, Zap, AlertCircle, FileText, Presentation, Users, Globe, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import { TickerItem } from "./MarketTicker";
import { fetchRecentAlerts } from "@/lib/ticker-utils";

interface AlertHistoryProps {
    onAlertClick?: (symbol: string) => void;
}

export default function AlertHistory({ onAlertClick }: AlertHistoryProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [alerts, setAlerts] = useState<TickerItem[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            loadAlerts();
        }
    }, [isOpen]);

    const loadAlerts = async () => {
        setLoading(true);
        try {
            const recentAlerts = await fetchRecentAlerts(10);
            setAlerts(recentAlerts);
        } catch (error) {
            console.error('Failed to load alerts:', error);
        } finally {
            setLoading(false);
        }
    };

    const getIcon = (type: TickerItem['type']) => {
        switch (type) {
            case 'price_surge':
                return <TrendingUp size={14} className="text-rise" />;
            case 'price_drop':
                return <TrendingDown size={14} className="text-fall" />;
            case 'volume_spike':
                return <Zap size={14} className="text-yellow-400" />;
            case 'high_yield':
                return <TrendingUp size={14} className="text-[var(--gold)]" />;
            case 'dividend':
                return <span className="text-[var(--gold)] font-bold">฿</span>;
            case 'news_flash':
                return <AlertCircle size={14} className="text-blue-400" />;
            case 'earnings_report':
                return <FileText size={14} className="text-green-400" />;
            case 'investor_conference':
                return <Presentation size={14} className="text-purple-400" />;
            case 'insider_trading':
                return <Users size={14} className="text-orange-400" />;
            case 'foreign_flow':
                return <Globe size={14} className="text-cyan-400" />;
            case 'technical_signal':
                return <Activity size={14} className="text-pink-400" />;
            default:
                return null;
        }
    };

    const getTimeAgo = (timestamp: Date) => {
        const now = new Date();
        const diff = now.getTime() - new Date(timestamp).getTime();
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return '剛剛';
        if (minutes < 60) return `${minutes}分鐘前`;
        if (hours < 24) return `${hours}小時前`;
        return `${days}天前`;
    };

    return (
        <>
            {/* Bell Icon Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 hover:border-white/20 transition-all text-slate-400 hover:text-white"
            >
                <Bell size={18} />
                {alerts.length > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-[var(--gold)] rounded-full text-[10px] font-bold text-black flex items-center justify-center">
                        {alerts.length > 9 ? '9+' : alerts.length}
                    </span>
                )}
            </button>

            {/* Alert Panel */}
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 bg-black/20 z-40"
                        onClick={() => setIsOpen(false)}
                    />

                    {/* Panel */}
                    <div className="fixed top-16 right-4 w-96 max-h-[600px] bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden">
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-white/10">
                            <div className="flex items-center gap-2">
                                <Bell size={18} className="text-[var(--gold)]" />
                                <h3 className="font-bold text-white">警報記錄</h3>
                                <span className="text-xs text-slate-500">最近 10 筆</span>
                            </div>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-1 hover:bg-white/10 rounded-full transition-colors text-slate-400 hover:text-white"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Alert List */}
                        <div className="overflow-y-auto max-h-[520px]">
                            {loading ? (
                                <div className="flex items-center justify-center py-12">
                                    <div className="animate-spin text-[var(--gold)]">
                                        <Bell size={24} />
                                    </div>
                                </div>
                            ) : alerts.length === 0 ? (
                                <div className="text-center py-12 text-slate-500">
                                    <Bell size={32} className="mx-auto mb-2 opacity-30" />
                                    <p className="text-sm">暫無警報記錄</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-white/5">
                                    {alerts.map((alert) => (
                                        <div
                                            key={alert.id}
                                            onClick={() => {
                                                onAlertClick?.(alert.symbol);
                                                setIsOpen(false);
                                            }}
                                            className="p-4 hover:bg-white/5 cursor-pointer transition-colors"
                                        >
                                            <div className="flex items-start gap-3">
                                                <div className="mt-0.5">{getIcon(alert.type)}</div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="font-bold text-white text-sm">{alert.symbol}</span>
                                                        <span className="text-xs text-slate-500">{getTimeAgo(alert.timestamp)}</span>
                                                    </div>
                                                    <p className="text-sm text-slate-300 line-clamp-2">{alert.message}</p>
                                                    {alert.changePercent !== undefined && alert.changePercent !== null && (
                                                        <span className={cn(
                                                            "text-xs font-bold mt-1 inline-block",
                                                            alert.changePercent >= 0 ? "text-rise" : "text-fall"
                                                        )}>
                                                            {alert.changePercent > 0 ? '+' : ''}{alert.changePercent.toFixed(2)}%
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}
        </>
    );
}
