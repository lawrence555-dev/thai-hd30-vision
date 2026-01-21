// Mock data for SETHD 30 stocks
export const MOCK_STOCKS = [
    { id: '1', symbol: 'PTT', name: 'PTT Public Company', price: 34.50, change: 0.25, changePercent: 0.73, yield: 5.8, avgYield: 5.2, marketCap: 985000000000 },
    { id: '2', symbol: 'ADVANC', name: 'Advanced Info Service', price: 218.00, change: -1.00, changePercent: -0.46, yield: 3.9, avgYield: 3.5, marketCap: 648000000000 },
    { id: '3', symbol: 'SCB', name: 'SCB X', price: 104.50, change: 0.50, changePercent: 0.48, yield: 6.2, avgYield: 4.8, marketCap: 352000000000 },
    { id: '4', symbol: 'KBANK', name: 'Kasikornbank', price: 124.00, change: 0.00, changePercent: 0.00, yield: 4.5, avgYield: 3.8, marketCap: 294000000000 },
    { id: '5', symbol: 'SCC', name: 'Siam Cement', price: 284.00, change: -2.00, changePercent: -0.70, yield: 4.1, avgYield: 4.5, marketCap: 340000000000 },
    { id: '6', symbol: 'KTB', name: 'Krung Thai Bank', price: 16.40, change: 0.10, changePercent: 0.61, yield: 5.5, avgYield: 4.2, marketCap: 229000000000 },
    { id: '7', symbol: 'TISCO', name: 'Tisco Financial', price: 98.75, change: 0.25, changePercent: 0.25, yield: 7.8, avgYield: 7.2, marketCap: 79000000000 },
    { id: '8', symbol: 'LH', name: 'Land and Houses', price: 7.45, change: -0.05, changePercent: -0.67, yield: 6.5, avgYield: 6.0, marketCap: 89000000000 },
    { id: '9', symbol: 'TU', name: 'Thai Union Group', price: 14.80, change: 0.10, changePercent: 0.68, yield: 4.2, avgYield: 3.8, marketCap: 69000000000 },
    { id: '10', symbol: 'BBL', name: 'Bangkok Bank', price: 138.50, change: 1.50, changePercent: 1.09, yield: 3.8, avgYield: 3.5, marketCap: 264000000000 },
];

export function getMockIntradayData() {
    // Generate simple sine wave data for chart
    const data = [];
    const now = new Date();
    const start = new Date(now);
    start.setHours(9, 0, 0, 0); // Market open 10:00 technically, but let's say 9

    for (let i = 0; i < 100; i++) {
        const time = new Date(start.getTime() + i * 5 * 60000); // 5 min intervals
        const hours = time.getHours().toString().padStart(2, '0');
        const minutes = time.getMinutes().toString().padStart(2, '0');
        const value = 100 + Math.sin(i * 0.1) * 2 + Math.random();

        data.push({
            time: `${hours}:${minutes}`,
            value: Number(value.toFixed(2))
        });
    }
    return data;
}
