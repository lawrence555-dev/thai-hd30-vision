export interface ValuationResult {
    status: 'UNDERVALUED' | 'FAIR' | 'OVERVALUED' | 'EXTREME_CHEAP';
    score: number; // 0-100 score
    deviation: number; // Standard deviation from mean
}

export function calculateValuation(currentYield: number, avgYield5Y: number, stdDev: number = 0.5): ValuationResult {
    const diffusion = currentYield - avgYield5Y;
    const zScore = diffusion / stdDev;

    // Logic:
    // If Yield > Avg + 2*StdDev => Extreme Cheap (Gold)
    // If Yield > Avg => Cheap (Green)
    // If Yield < Avg => Expensive/Wait (Red/Grey)
    export function calculateValuation(stock: any) {
        if (!stock) return { score: 0, status: 'Unknown', fairValue: 0 };

        // 1. Yield Score (30%)
        // Target yield 5% = 100 pts. Cap at 100.
        const yieldScore = Math.min(100, (stock.current_yield / 5) * 100);

        // 2. Valuation Score (20%)
        // P/E: 10 is ideal (100pts). >20 is bad. <5 is supsicious but good for value.
        const peScore = stock.pe > 0 ? Math.min(100, Math.max(0, 100 - (stock.pe - 10) * 5)) : 50;
        // P/B: 1.0 is ideal (100pts). >3 is expensive.
        const pbScore = stock.pb > 0 ? Math.min(100, Math.max(0, 100 - (stock.pb - 1) * 20)) : 50;
        const valuationScore = (peScore + pbScore) / 2;

        // 3. Growth Score (30%)
        // Revenue/Profit Growth. Target 10% = 100pts.
        const growth = (stock.revenue_growth_yoy || 0) + (stock.net_profit_growth_yoy || 0);
        const growthScore = Math.min(100, Math.max(0, (growth / 10) * 100));

        // 4. Stability/Payout Score (20%)
        // Payout Ratio: Ideal 40-70%. 
        // <40: Stingy (60pts). 40-70: Perfect (100pts). >80: Risky (40pts). >100: Danger (0pts).
        let payoutScore = 50;
        const payout = stock.payout_ratio || 0;
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
        if (stock.net_profit_growth_yoy < 0) rawScore -= 10; // Earnings decline
        if (payout > 100) rawScore -= 15; // Unsubstainable payout
        if (stock.current_yield < stock.avg_yield_5y) rawScore -= 5; // Declining yield trend

        const score = Math.min(100, Math.max(0, Math.round(rawScore)));

        let status = 'Fair';
        if (score >= 80) status = 'Undervalued'; // High score = Good Value
        else if (score <= 40) status = 'Overvalued'; // Low score = Bad Value

        // Simple Fair Value Estimation (Graham Number-ish approximation)
        // EPS * (8.5 + 2g) ... simplistic check
        const eps = stock.price / (stock.pe || 15);
        const fairValue = (eps * 15).toFixed(2); // Assume P/E 15 is standard

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
