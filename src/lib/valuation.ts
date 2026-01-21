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

    let status: ValuationResult['status'] = 'FAIR';
    if (zScore > 2) status = 'EXTREME_CHEAP';
    else if (zScore > 0) status = 'UNDERVALUED';
    else status = 'OVERVALUED'; // or FAIR depending on strictness

    // Normalize score to 0-100
    // Higher yield (higher z-score) = Higher valuation score (better to buy)
    // Base 50, +10 per sigma
    const score = Math.min(100, Math.max(0, 50 + (zScore * 20)));

    return {
        status,
        score,
        deviation: zScore
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
