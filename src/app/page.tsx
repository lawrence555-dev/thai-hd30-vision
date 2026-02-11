"use client";

import { useState, useEffect } from "react";
import { Search, TrendingUp, AlertTriangle, LayoutGrid, List as ListIcon, RefreshCw, Activity, DollarSign, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import ValuationCard from "@/components/ValuationCard";
import StockDetailPanel from "@/components/StockDetailPanel";
import { calculateValuation, formatCurrency } from "@/lib/valuation";
import { supabase } from '@/lib/supabase';

// Define the shape of our stock data for the UI
interface StockData {
  id: string;
  symbol: string;
  name: string;
  sector: string;
  price: number;
  change: number;
  changePercent: number;
  yield: number;
  avgYield: number;
  marketCap: number;
  // Added fields for stable valuation
  score: number;
  valuationStatus: string;
  fairValue: string | number;
  metrics: {
    pe: number;
    pb: number;
    growth: number;
    stability: number;
  };
}

export default function Dashboard() {
  const [selectedStock, setSelectedStock] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [stocks, setStocks] = useState<StockData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSector, setSelectedSector] = useState<string>('All');

  useEffect(() => {
    fetchStocks();
  }, []);

  const fetchStocks = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('stocks')
        .select(`
          *,
          price_logs (
            price,
            change,
            change_percent
          )
        `)
        .order('symbol', { ascending: true });

      if (error) {
        console.error('Error fetching stocks:', error);
        return;
      }

      if (data) {
        const formattedStocks: StockData[] = data.map((item: any) => {
          // Get latest log data if available
          const latestLog = item.price_logs && item.price_logs.length > 0
            ? item.price_logs[item.price_logs.length - 1]
            : { price: 0, change: 0, change_percent: 0 };

          // Generate simulated metrics ONCE during fetch
          // This ensures the dashboard "Top Picks" and metrics don't change on every render/click
          const simulatedMetrics = {
            pe: Math.floor(Math.random() * (25 - 8) + 8),
            pb: (Math.random() * (4 - 0.5) + 0.5),
            payoutRatio: Math.floor(Math.random() * (120 - 30) + 30),
            revenue_growth_yoy: Math.floor(Math.random() * (20 - -5) + -5),
            net_profit_growth_yoy: Math.floor(Math.random() * (20 - -5) + -5),
          };

          const val = calculateValuation({
            ...item,
            ...simulatedMetrics,
            current_yield: Number(item.current_yield) || 0,
            avg_yield_5y: Number(item.avg_yield_5y) || 0,
            pe: simulatedMetrics.pe,
            pb: simulatedMetrics.pb,
            payout_ratio: simulatedMetrics.payoutRatio,
          });

          return {
            id: item.id,
            symbol: item.symbol,
            name: item.name_en || item.symbol,
            sector: item.sector || 'Unknown',
            price: Number(latestLog.price) || 0,
            change: Number(latestLog.change) || 0,
            changePercent: Number(latestLog.change_percent) || 0,
            yield: Number(item.current_yield) || 0,
            avgYield: Number(item.avg_yield_5y) || 0,
            marketCap: Number(item.market_cap) || 0,
            score: val.score,
            valuationStatus: val.status,
            fairValue: val.fairValue,
            metrics: {
              pe: simulatedMetrics.pe,
              pb: simulatedMetrics.pb,
              growth: simulatedMetrics.net_profit_growth_yoy,
              stability: simulatedMetrics.payoutRatio
            }
          };
        });
        setStocks(formattedStocks);
      }
    } catch (err) {
      console.error('Failed to fetch:', err);
    } finally {
      setLoading(false);
    }
  };

  // Extract Unique Sectors
  const sectors = ['All', ...Array.from(new Set(stocks.map(s => s.sector || 'Others'))).sort()];

  // Filter stocks based on search query and sector
  const filteredStocks = stocks.filter(stock => {
    const matchesSearch = stock.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (stock.name || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSector = selectedSector === 'All' || stock.sector === selectedSector;
    return matchesSearch && matchesSector;
  });

  // Filter top 2 undervalued stocks for the Valuation Cards
  const topPicks = stocks
    .filter(s => s.score >= 0) // Ensure valid
    .sort((a, b) => b.score - a.score)
    .slice(0, 2);

  return (
    <div className="min-h-screen bg-[var(--background)] p-4 md:p-8 pb-32">
      {/* Top Bar */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-400 to-orange-600 flex items-center justify-center shadow-[0_0_15px_rgba(251,191,36,0.2)]">
            <span className="font-black text-black text-lg">฿</span>
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tighter text-white">
              V I S I O N <span className="text-[var(--gold)]">PRO</span>
            </h1>
            <p className="text-xs text-slate-500 font-medium tracking-widest uppercase">Thai Stock Analytics</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[var(--gold)] transition-colors" size={18} />
            <input
              type="text"
              placeholder="Search Symbol..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-full text-sm font-medium focus:outline-none focus:border-[var(--gold)] focus:ring-1 focus:ring-[var(--gold)] transition-all w-48 md:w-64"
            />
          </div>
          <button onClick={fetchStocks} className="p-2 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 hover:border-white/20 transition-all text-slate-400 hover:text-white">
            <RefreshCw size={18} />
          </button>
        </div>
      </header>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Left Column: Valuation Cards (Top Picks) */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <TrendingUp size={20} className="text-[var(--gold)]" />
                Top Undervalued Picks
              </h2>
              <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mt-1">精選低估潛力股</p>
            </div>
            <div className="px-3 py-1 rounded-full bg-[var(--gold)]/10 border border-[var(--gold)]/20 text-[var(--gold)] text-[10px] font-bold uppercase tracking-wider animate-pulse">
              AI Recommendation
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {loading ? (
              <>
                <div className="glass h-[300px] animate-pulse rounded-3xl bg-white/5" />
                <div className="glass h-[300px] animate-pulse rounded-3xl bg-white/5" />
              </>
            ) : (
              topPicks.map(stock => (
                <ValuationCard
                  key={stock.id}
                  symbol={stock.symbol}
                  score={stock.score}
                  metrics={stock.metrics}
                />
              ))
            )}
          </div>
        </div>

        {/* Right Column: Stats / Market Summary (Placeholder for now, maybe Sector Performance) */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="glass-card p-6 h-full flex flex-col relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
              <Activity size={120} />
            </div>
            <h3 className="text-lg font-bold text-white mb-4">Market Sentiment</h3>
            <div className="flex-1 flex flex-col justify-center gap-4">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-sm font-medium">SET Index</span>
                <span className="text-white font-mono font-bold">1,388.20</span>
              </div>
              <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                <div className="bg-[var(--rise)] h-full w-[45%]" />
              </div>
              <div className="flex justify-between text-[10px] text-slate-500 uppercase tracking-widest">
                <span>Bearish</span>
                <span>Neutral</span>
                <span>Bullish</span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Stock List Section */}
      <div className="mt-12">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 scrollbars-hidden">
            {sectors.map(sector => (
              <button
                key={sector}
                onClick={() => setSelectedSector(sector)}
                className={cn(
                  "px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap",
                  selectedSector === sector
                    ? "bg-white text-black shadow-lg shadow-white/10"
                    : "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white"
                )}
              >
                {sector}
              </button>
            ))}
          </div>

          <div className="flex items-center bg-white/5 rounded-lg p-1 border border-white/10">
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                "p-2 rounded-md transition-all",
                viewMode === 'grid' ? "bg-white/10 text-white shadow-sm" : "text-slate-500 hover:text-slate-300"
              )}
            >
              <LayoutGrid size={18} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                "p-2 rounded-md transition-all",
                viewMode === 'list' ? "bg-white/10 text-white shadow-sm" : "text-slate-500 hover:text-slate-300"
              )}
            >
              <ListIcon size={18} />
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <LayoutGrid className="text-slate-400" size={20} />
            <div>
              <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest leading-none">SETHD Market Monitor</h2>
              <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">SETHD 市場雷達</span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
            <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-[var(--gold)] animate-pulse"></div>Super <span className="opacity-50 scale-90">極度低估</span></span>
            <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-[var(--rise)]"></div>Cheap <span className="opacity-50 scale-90">便宜</span></span>
            <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-slate-500"></div>Fair <span className="opacity-50 scale-90">合理</span></span>
            <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-[var(--fall)]"></div>Expensive <span className="opacity-50 scale-90">昂貴</span></span>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="glass h-32 rounded-xl animate-pulse bg-white/5" />
            ))}
          </div>
        ) : (
          <div className={cn(
            viewMode === 'grid'
              ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3"
              : "flex flex-col gap-2"
          )}>
            {filteredStocks.map(stock => {
              const valuation = calculateValuation({ ...stock, current_yield: stock.yield, avg_yield_5y: stock.avgYield });
              const isUp = stock.change >= 0;

              const getBorderColor = () => {
                const s = stock.valuationStatus || valuation.status;
                if (s === 'EXTREME_CHEAP') return 'border-[var(--gold)]';
                if (s === 'UNDERVALUED') return 'border-[var(--rise)]';
                if (s === 'OVERVALUED') return 'border-[var(--fall)]';
                return 'border-white/5';
              };

              // LIST VIEW ITEM
              if (viewMode === 'list') {
                return (
                  <div
                    key={stock.id}
                    onClick={() => setSelectedStock(stock.symbol)}
                    className={cn(
                      "glass p-4 rounded-xl flex items-center justify-between gap-4 cursor-pointer relative",
                      getBorderColor()
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg bg-white/5 flex items-center justify-center text-white font-bold text-base tracking-tight ring-1 ring-white/10">
                        {stock.symbol}
                      </div>
                      {/* Removed Full Name to reduce clutter and whitespace */}
                      <div>
                        <p className="text-slate-500 text-xs font-medium uppercase tracking-wider">{stock.sector}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-white font-bold text-base font-mono tracking-tight">{stock.price.toFixed(2)}</p>
                        <p className={cn("text-xs font-bold", isUp ? "text-rise" : "text-fall")}>
                          {isUp ? '+' : ''}{stock.change.toFixed(2)} ({isUp ? '+' : ''}{stock.changePercent.toFixed(2)}%)
                        </p>
                      </div>

                      {/* Yield Circle with Dynamic Color */}
                      <div className={cn(
                        "w-14 h-14 rounded-full flex flex-col items-center justify-center border-2",
                        stock.yield >= 6 ? "bg-[var(--gold)]/10 border-[var(--gold)] text-[var(--gold)]" :
                          stock.yield >= 4 ? "bg-[var(--rise)]/10 border-[var(--rise)] text-[var(--rise)]" :
                            "bg-slate-500/10 border-slate-500 text-slate-300"
                      )}>
                        <span className="text-sm font-black leading-none">{stock.yield}%</span>
                        <span className="text-[9px] font-bold uppercase opacity-80 leading-none mt-0.5">Yield</span>
                      </div>
                    </div>

                    {
                      (stock.valuationStatus === 'EXTREME_CHEAP' || stock.yield >= 6) && (
                        <div className="absolute top-2 right-2">
                          <div className="w-2 h-2 rounded-full bg-[var(--gold)] animate-pulse shadow-[0_0_8px_var(--gold)]"></div>
                        </div>
                      )
                    }
                  </div>
                );
              }

              // GRID VIEW ITEM
              return (
                <div
                  key={stock.id}
                  onClick={() => setSelectedStock(stock.symbol)}
                  className={cn(
                    "glass p-4 rounded-xl flex flex-col justify-between gap-4 cursor-pointer relative hover:scale-[1.02] transition-transform",
                    getBorderColor()
                  )}
                >
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider box-border px-2 py-0.5 rounded border border-white/10 bg-black/20">
                      {stock.sector}
                    </span>
                    {(stock.valuationStatus === 'EXTREME_CHEAP' || stock.yield >= 6) && (
                      <div className="w-2 h-2 rounded-full bg-[var(--gold)] animate-pulse shadow-[0_0_6px_var(--gold)]"></div>
                    )}
                  </div>

                  <div className="text-center my-2">
                    <div className="text-2xl font-black tracking-tighter text-white mb-1">{stock.symbol}</div>
                    <div className="text-3xl font-mono font-bold text-white tracking-tight">{stock.price.toFixed(2)}</div>
                    <div className={cn("text-xs font-bold mt-1", isUp ? "text-rise" : "text-fall")}>
                      {isUp ? '▲' : '▼'} {Math.abs(stock.change).toFixed(2)} ({stock.changePercent.toFixed(2)}%)
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-3 border-t border-white/5">
                    <div className={cn(
                      "flex-1 h-8 rounded-lg flex items-center justify-center text-xs font-bold border",
                      stock.yield >= 6 ? "bg-[var(--gold)]/10 border-[var(--gold)] text-[var(--gold)]" :
                        stock.yield >= 4 ? "bg-[var(--rise)]/10 border-[var(--rise)] text-[var(--rise)]" :
                          "bg-slate-500/10 border-slate-500 text-slate-400"
                    )}>
                      {stock.yield}% Yield
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Stock Detail Modal */}
      {selectedStock && (
        <StockDetailPanel
          symbol={selectedStock}
          onClose={() => setSelectedStock(null)}
        />
      )}
    </div>
  );
}
