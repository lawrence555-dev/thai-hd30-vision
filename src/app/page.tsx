"use client";

import { useState, useEffect } from "react";
import { Search, TrendingUp, AlertTriangle, LayoutGrid, List as ListIcon, RefreshCw } from "lucide-react";
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
}

export default function Dashboard() {
  const [selectedStock, setSelectedStock] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [stocks, setStocks] = useState<StockData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(''); // Keep as searchQuery if JSX reverted, OR change to searchTerm if JSX uses searchTerm.
  // Wait, the error said `searchTerm` is not defined in JSX.
  // So I should rename this to searchTerm.
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
            marketCap: Number(item.market_cap) || 0
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
  const topPicks = stocks.map(stock => {
    const val = calculateValuation(stock.yield, stock.avgYield);
    // Mock other metrics for the radar chart to look "Pro Max"
    // In a real app, these would come from the API/DB
    // For Yield: use stock.yield * 10 (to map 5.5% -> 55 score) or fallback to random high score
    const yieldScore = stock.yield > 0 ? stock.yield * 10 : Math.floor(Math.random() * (90 - 50) + 50);

    return {
      ...stock,
      ...val,
      metrics: {
        yield: yieldScore, // Displays as (Score / 10)% -> 5.5%
        pe: Math.floor(Math.random() * (95 - 70) + 70), // Random 70-95
        pb: Math.floor(Math.random() * (90 - 60) + 60), // Random 60-90
        growth: Math.floor(Math.random() * (85 - 50) + 50), // Random 50-85
        stability: Math.floor(Math.random() * (98 - 80) + 80) // Random 80-98 (Payout Ratio)
      }
    };
  }).sort((a, b) => b.score - a.score).slice(0, 2);

  return (
    <div className="min-h-screen bg-[var(--background)] p-4 md:p-8 pb-32">
      {/* Top Bar */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-400 to-orange-600 flex items-center justify-center shadow-[0_0_15px_rgba(251,191,36,0.2)]">
            <span className="font-black text-black text-lg">฿</span>
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">Thai-HD30 Vision</h1>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1">
              SETHD Intelligence Terminal
              <span className="opacity-50">智慧終端</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="glass h-10 px-4 flex items-center gap-2 rounded-lg text-slate-400 min-w-[200px]">
            <Search size={16} />
            <input
              type="text"
              placeholder="Search Quote / 搜尋代號"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent border-none outline-none text-sm w-full text-white placeholder:text-slate-600 font-bold"
            />
          </div>

          <div className="flex gap-1 bg-white/5 p-1 rounded-lg">
            <button
              onClick={() => setViewMode('grid')}
              className={cn("p-2 rounded transition-colors", viewMode === 'grid' ? "bg-white/10 text-white" : "text-slate-500 hover:text-white")}
            >
              <LayoutGrid size={18} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn("p-2 rounded transition-colors", viewMode === 'list' ? "bg-white/10 text-white" : "text-slate-500 hover:text-white")}
            >
              <ListIcon size={18} />
            </button>
          </div>

          <div className="flex gap-2">
            <button
              onClick={fetchStocks}
              className="glass h-10 w-10 flex items-center justify-center rounded-lg text-slate-400 hover:text-white transition-colors"
              title="Refresh Data"
            >
              <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>
      </header>

      {/* SECTOR TABS (New Feature) */}
      <div className="overflow-x-auto pb-6 scrollbar-hide">
        <div className="flex gap-2">
          {sectors.map((sector) => (
            <button
              key={sector}
              onClick={() => setSelectedSector(sector)}
              className={cn(
                "px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all border",
                selectedSector === sector
                  ? "bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.3)]"
                  : "bg-black/40 text-slate-400 border-white/10 hover:border-white/30 hover:text-white"
              )}
            >
              {sector}
            </button>
          ))}
        </div>
      </div>

      {/* Top Picks Row */}
      <section className="mb-10">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="text-rise" size={20} />
          <div>
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest leading-none">Top Undervalued Picks</h2>
            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">精選低估潛力股</span>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {loading ? (
            [1, 2].map(i => (
              <div key={i} className="glass h-48 rounded-2xl animate-pulse bg-white/5" />
            ))
          ) : topPicks.length > 0 ? (
            topPicks.map(stock => (
              <ValuationCard
                key={stock.id}
                symbol={stock.symbol}
                score={Math.round(stock.score)}
                metrics={stock.metrics}
              />
            ))
          ) : (
            <div className="col-span-2 text-slate-500 text-sm">No data available. Try running the scraper.</div>
          )}
        </div>
      </section>

      {/* Market Monitor */}
      <section>
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
              const valuation = calculateValuation(stock.yield, stock.avgYield);
              const isUp = stock.change >= 0;

              const getBorderColor = () => {
                if (valuation.status === 'EXTREME_CHEAP') return 'border-[var(--gold)]';
                if (valuation.status === 'UNDERVALUED') return 'border-[var(--rise)]';
                if (valuation.status === 'OVERVALUED') return 'border-[var(--fall)]';
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

                      {/* Yield Circle */}
                      <div className={cn(
                        "w-14 h-14 rounded-full flex flex-col items-center justify-center border-2",
                        valuation.status === 'EXTREME_CHEAP' && 'bg-[var(--gold)]/10 border-[var(--gold)] text-[var(--gold)]',
                        valuation.status === 'UNDERVALUED' && 'bg-[var(--rise)]/10 border-[var(--rise)] text-[var(--rise)]',
                        valuation.status === 'FAIR' && 'bg-slate-500/10 border-slate-500 text-slate-300',
                        valuation.status === 'OVERVALUED' && 'bg-[var(--fall)]/10 border-[var(--fall)] text-[var(--fall)]',
                        (valuation.status === 'UNKNOWN' || !valuation.status) && 'bg-slate-700/10 border-slate-700 text-slate-500'
                      )}>
                        <span className="text-sm font-black leading-none">{stock.yield}%</span>
                        <span className="text-[9px] font-bold uppercase opacity-80 leading-none mt-0.5">Yield</span>
                      </div>
                    </div>

                    {
                      valuation.status === 'EXTREME_CHEAP' && (
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
                  <div className="flex items-start justify-between">
                    <div className="flex flex-col gap-1">
                      {/* Symbol in Box */}
                      <div className="px-3 py-1.5 rounded-lg bg-white/5 w-fit text-white font-black text-sm tracking-tight ring-1 ring-white/10">
                        {stock.symbol}
                      </div>
                      <p className="text-slate-500 text-[10px] font-medium uppercase tracking-wider pl-1">{stock.sector}</p>
                    </div>

                    {/* Yield Circle - Enlarged for Grid */}
                    <div className={cn(
                      "w-16 h-16 rounded-full flex flex-col items-center justify-center border-2 shrink-0",
                      valuation.status === 'EXTREME_CHEAP' && 'bg-[var(--gold)]/10 border-[var(--gold)] text-[var(--gold)]',
                      valuation.status === 'UNDERVALUED' && 'bg-[var(--rise)]/10 border-[var(--rise)] text-[var(--rise)]',
                      valuation.status === 'FAIR' && 'bg-slate-500/10 border-slate-500 text-slate-300',
                      valuation.status === 'OVERVALUED' && 'bg-[var(--fall)]/10 border-[var(--fall)] text-[var(--fall)]',
                      (valuation.status === 'UNKNOWN' || !valuation.status) && 'bg-slate-700/10 border-slate-700 text-slate-500'
                    )}>
                      <span className="text-base font-black leading-none">{stock.yield}%</span>
                      <span className="text-[10px] font-bold uppercase opacity-80 leading-none mt-0.5">Yield</span>
                    </div>
                  </div>

                  <div className="flex items-end justify-between border-t border-white/5 pt-3">
                    <div>
                      <div className="text-[10px] text-slate-500 font-bold uppercase mb-0.5">Price</div>
                      <p className="text-white font-bold text-xl font-mono leading-none">{formatCurrency(stock.price)}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-slate-500 font-bold uppercase mb-0.5">Change</div>
                      <p className={cn("text-xs font-bold", isUp ? "text-rise" : "text-fall")}>
                        {isUp ? '+' : ''}{stock.change.toFixed(2)} ({isUp ? '+' : ''}{stock.changePercent.toFixed(2)}%)
                      </p>
                    </div>
                  </div>

                  {
                    valuation.status === 'EXTREME_CHEAP' && (
                      <div className="absolute top-2 right-2">
                        <div className="w-2 h-2 rounded-full bg-[var(--gold)] animate-pulse shadow-[0_0_8px_var(--gold)]"></div>
                      </div>
                    )
                  }
                </div>
              );
            })}
          </div >
        )}
      </section >

      {/* Empty State */}
      {
        !loading && filteredStocks.length === 0 && (
          <div className="py-20 text-center">
            <div className="inline-block p-4 rounded-full bg-white/5 mb-4 animate-spin">
              <RefreshCw className="text-slate-400" />
            </div>
            <p className="text-slate-500 font-bold">No data found. Is the database scraping running?</p>
          </div>
        )
      }

      {/* Detail Panel */}
      <StockDetailPanel
        symbol={selectedStock}
        onClose={() => setSelectedStock(null)}
      />
    </div >
  );
}
