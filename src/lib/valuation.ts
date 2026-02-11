export interface ValuationResult {
    status: 'UNDERVALUED' | 'FAIR' | 'OVERVALUED' | 'EXTREME_CHEAP' | 'Unknown';
    score: number; // 0-100 score
    fairValue: string | number;
    deviation?: number;
}

export function calculateValuation(stock: any): ValuationResult {
    if (!stock) return { score: 0, status: 'Unknown', fairValue: 0 };

    // 1. Yield Score (30%)
    // Target yield 5% = 100 pts. Cap at 100.
    const currentYield = Number(stock.yield || stock.current_yield || 0);
    const avgYield = Number(stock.avgYield || stock.avg_yield_5y || 0);
    const yieldScore = Math.min(100, (currentYield / 5) * 100);

    // 2. Valuation Score (20%)
    // P/E: 10 is ideal (100pts). >20 is bad.
    const pe = Number(stock.pe || 0);
    const pb = Number(stock.pb || 0);
    const peScore = pe > 0 ? Math.min(100, Math.max(0, 100 - (pe - 10) * 5)) : 50;
    const pbScore = pb > 0 ? Math.min(100, Math.max(0, 100 - (pb - 1) * 20)) : 50;
    const valuationScore = (peScore + pbScore) / 2;

    // 3. Growth Score (30%)
    // Revenue/Profit Growth. Target 10% = 100pts.
    const growth = (Number(stock.revenue_growth_yoy || 0) + Number(stock.net_profit_growth_yoy || stock.profitGrowth || 0));
    const growthScore = Math.min(100, Math.max(0, (growth / 10) * 100));

    // 4. Stability/Payout Score (20%)
    let payoutScore = 50;
    const payout = Number(stock.payout_ratio || stock.payoutRatio || 0);
    if (payout > 0 && payout <= 40) payoutScore = 60;
    else if (payout > 40 && payout <= 70) payoutScore = 100;
    else if (payout > 70 && payout <= 90) payoutScore = 60;
    else if (payout > 90) payoutScore = 20;

    // Weighted Total
    let rawScore = (
        (yieldScore * 0.3) +
        (valuationScore * 0.2) +
        (growthScore * 0.3) +
        (payoutScore * 0.2)
    );

    // Penalties
    if (growth < 0) rawScore -= 10; // Earnings decline
    if (payout > 100) rawScore -= 15; // Unsubstainable payout
    if (currentYield < avgYield) rawScore -= 5; // Declining yield trend

    const score = Math.min(100, Math.max(0, Math.round(rawScore)));

    let status: ValuationResult['status'] = 'FAIR';
    if (score >= 80) status = 'UNDERVALUED'; // High score = Good Value
    else if (score >= 90) status = 'EXTREME_CHEAP';
    else if (score <= 40) status = 'OVERVALUED'; // Low score = Bad Value

    // Simple Fair Value Estimation (Graham Number-ish approximation)
    const eps = (Number(stock.price) || 0) / (pe || 15);
    const fairValue = (eps * 15).toFixed(2);

    return {
        score,
        status,
        fairValue
    };
}

export function formatCurrency(value: number, currency: 'THB' | 'TWD' = 'THB', exchangeRate: number = 0.9): string {
    const finalValue = currency === 'THB' ? value : value * exchangeRate;
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2
    }).format(finalValue);
}
