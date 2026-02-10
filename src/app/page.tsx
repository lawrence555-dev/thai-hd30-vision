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
  const [currency, setCurrency] = useState<'THB' | 'TWD'>('THB');
  const [stocks, setStocks] = useState<StockData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

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

  // Filter stocks based on search query
  const filteredStocks = stocks.filter(stock =>
    stock.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
    stock.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Filter top 2 undervalued stocks for the Valuation Cards
  const topPicks = stocks.map(stock => {
    const val = calculateValuation(stock.yield, stock.avgYield);
    return { ...stock, ...val };
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
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">SETHD Intelligence Terminal</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="glass h-10 px-4 flex items-center gap-2 rounded-lg text-slate-400 min-w-[200px]">
            <Search size={16} />
            <input
              type="text"
              placeholder="Search Quote..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
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
            <button
              onClick={() => setCurrency(prev => prev === 'THB' ? 'TWD' : 'THB')}
              className="glass h-10 px-4 rounded-lg font-bold text-xs text-[var(--gold)] border-[var(--gold)]/20 hover:bg-[var(--gold)]/10 transition-colors"
            >
              {currency}
            </button>
          </div>
        </div>
      </header>

      {/* Top Picks Row */}
      <section className="mb-10">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="text-rise" size={20} />
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Top Undervalued Picks</h2>
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
                metrics={{
                  yield: stock.yield,
                  pe: 0,
                  pb: 0,
                  growth: 0,
                  stability: 0
                }}
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
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest">SETHD Market Monitor</h2>
          </div>
          <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
            <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-[var(--rise)]"></div>Cheap</span>
            <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-slate-500"></div>Fair</span>
            <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-[var(--fall)]"></div>Expensive</span>
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
                    className="glass p-4 rounded-xl flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors group"
                  >
                    <div className="flex items-center gap-4">
                      <div className={cn("w-1 h-10 rounded-full",
                        valuation.status === 'EXTREME_CHEAP' ? 'bg-[var(--gold)]' :
                          valuation.status === 'UNDERVALUED' ? 'bg-[var(--rise)]' :
                            valuation.status === 'OVERVALUED' ? 'bg-[var(--fall)]' : 'bg-slate-600'
                      )} />
                      <div>
                        <div className="font-bold text-white group-hover:text-[var(--gold)] transition-colors">{stock.symbol}</div>
                        <div className="text-xs text-slate-500">{stock.sector}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 md:gap-8">
                      <div className="text-right">
                        <div className="text-[10px] text-slate-500 uppercase font-bold">Price</div>
                        <div className="font-mono text-slate-200 font-bold">{formatCurrency(stock.price, currency)}</div>
                      </div>
                      <div className="text-right w-16 md:w-20">
                        <div className="text-[10px] text-slate-500 uppercase font-bold">Change</div>
                        <div className={cn("font-mono text-sm font-bold", isUp ? "text-[var(--rise)]" : "text-[var(--fall)]")}>
                          {isUp ? "+" : ""}{stock.changePercent}%
                        </div>
                      </div>
                      <div className="text-right w-16 md:w-20">
                        <div className="text-[10px] text-slate-500 uppercase font-bold">Yield</div>
                        <div className={cn("font-mono text-sm font-bold", valuation.status === 'EXTREME_CHEAP' ? "text-[var(--gold)]" : "text-slate-400")}>
                          {stock.yield}%
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }

              // GRID VIEW ITEM
              return (
                <div
                  key={stock.id}
                  onClick={() => setSelectedStock(stock.symbol)}
                  className={cn(
                    "glass p-4 rounded-xl cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all group relative overflow-hidden",
                    getBorderColor(),
                    valuation.status === 'EXTREME_CHEAP' && "shadow-[0_0_15px_rgba(255,215,0,0.15)]"
                  )}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-black tracking-tight text-lg group-hover:text-[var(--gold)] transition-colors">{stock.symbol}</span>
                    <div className={cn(
                      "text-xs font-bold px-1.5 py-0.5 rounded",
                      isUp ? "bg-[#00ff88]/10 text-[#00ff88]" : "bg-[#ff4d4d]/10 text-[#ff4d4d]"
                    )}>
                      {isUp ? "+" : ""}{stock.changePercent}%
                    </div>
                  </div>

                  <div className="flex justify-between items-end">
                    <div className="text-2xl font-black text-slate-200 font-mono">
                      {formatCurrency(stock.price, currency)}
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-slate-500 uppercase font-bold">Yield</div>
                      <div className={cn(
                        "text-sm font-bold font-mono",
                        valuation.status === 'EXTREME_CHEAP' || valuation.status === 'UNDERVALUED' ? "text-[var(--rise)]" : "text-slate-400"
                      )}>
                        {stock.yield}%
                      </div>
                    </div>
                  </div>

                  {valuation.status === 'EXTREME_CHEAP' && (
                    <div className="absolute top-0 right-0 p-1">
                      <div className="w-2 h-2 rounded-full bg-[var(--gold)] animate-pulse shadow-[0_0_5px_var(--gold)]"></div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Empty State */}
      {!loading && filteredStocks.length === 0 && (
        <div className="py-20 text-center">
          <div className="inline-block p-4 rounded-full bg-white/5 mb-4 animate-spin">
            <RefreshCw className="text-slate-400" />
          </div>
          <p className="text-slate-500 font-bold">No data found. Is the database scraping running?</p>
        </div>
      )}

      {/* Detail Panel */}
      <StockDetailPanel
        symbol={selectedStock}
        onClose={() => setSelectedStock(null)}
      />
    </div>
  );
}
