// Mock data for SETHD 30 stocks
// Mock data: Representative of SETHD 30 (Sample Snapshot)
// Real-world data would be fetched from API
export const MOCK_STOCKS = [
    // Energy & Utilities
    { id: '1', symbol: 'PTT', name: 'PTT Public Company', sector: 'Energy', price: 34.50, change: 0.25, changePercent: 0.73, yield: 5.8, avgYield: 5.2, marketCap: 985000000000 },
    { id: '2', symbol: 'PTTEP', name: 'PTT Exploration & Prod', sector: 'Energy', price: 154.50, change: 1.50, changePercent: 0.98, yield: 6.1, avgYield: 5.5, marketCap: 613000000000 },
    { id: '3', symbol: 'TOP', name: 'Thai Oil', sector: 'Energy', price: 54.25, change: -0.25, changePercent: -0.46, yield: 5.2, avgYield: 4.8, marketCap: 120000000000 },
    { id: '4', symbol: 'BCP', name: 'Bangchak Corp', sector: 'Energy', price: 42.00, change: 0.50, changePercent: 1.20, yield: 6.5, avgYield: 5.8, marketCap: 57000000000 },
    { id: '5', symbol: 'EGCO', name: 'Electricity Generating', sector: 'Energy', price: 112.00, change: -1.00, changePercent: -0.88, yield: 4.8, avgYield: 4.2, marketCap: 59000000000 },
    { id: '6', symbol: 'RATCH', name: 'Ratch Group', sector: 'Energy', price: 32.50, change: 0.25, changePercent: 0.78, yield: 5.5, avgYield: 5.0, marketCap: 70000000000 },
    { id: '30', symbol: 'BANPU', name: 'Banpu', sector: 'Energy', price: 6.45, change: -0.05, changePercent: -0.77, yield: 7.2, avgYield: 6.5, marketCap: 54000000000 },

    // Banking
    { id: '7', symbol: 'SCB', name: 'SCB X', sector: 'Banking', price: 104.50, change: 0.50, changePercent: 0.48, yield: 6.2, avgYield: 4.8, marketCap: 352000000000 },
    { id: '8', symbol: 'KBANK', name: 'Kasikornbank', sector: 'Banking', price: 124.00, change: 0.00, changePercent: 0.00, yield: 4.5, avgYield: 3.8, marketCap: 294000000000 },
    { id: '9', symbol: 'BBL', name: 'Bangkok Bank', sector: 'Banking', price: 138.50, change: 1.50, changePercent: 1.09, yield: 3.8, avgYield: 3.5, marketCap: 264000000000 },
    { id: '10', symbol: 'KTB', name: 'Krung Thai Bank', sector: 'Banking', price: 16.40, change: 0.10, changePercent: 0.61, yield: 5.5, avgYield: 4.2, marketCap: 229000000000 },
    { id: '11', symbol: 'TTB', name: 'TMBThanachart Bank', sector: 'Banking', price: 1.82, change: 0.02, changePercent: 1.11, yield: 5.9, avgYield: 5.1, marketCap: 176000000000 },
    { id: '12', symbol: 'TISCO', name: 'Tisco Financial', sector: 'Banking', price: 98.75, change: 0.25, changePercent: 0.25, yield: 7.8, avgYield: 7.2, marketCap: 79000000000 },
    { id: '13', symbol: 'KKP', name: 'Kiatnakin Phatra', sector: 'Banking', price: 49.50, change: -0.50, changePercent: -1.00, yield: 6.8, avgYield: 6.2, marketCap: 41000000000 },

    // ICT
    { id: '14', symbol: 'ADVANC', name: 'Advanced Info Service', sector: 'ICT', price: 218.00, change: -1.00, changePercent: -0.46, yield: 3.9, avgYield: 3.5, marketCap: 648000000000 },
    { id: '15', symbol: 'INTUCH', name: 'Intouch Holdings', sector: 'ICT', price: 74.25, change: 0.25, changePercent: 0.34, yield: 4.5, avgYield: 4.0, marketCap: 238000000000 },

    // Property Development
    { id: '16', symbol: 'LH', name: 'Land and Houses', sector: 'Property', price: 7.45, change: -0.05, changePercent: -0.67, yield: 6.5, avgYield: 6.0, marketCap: 89000000000 },
    { id: '17', symbol: 'SIRI', name: 'Sansiri', sector: 'Property', price: 1.74, change: 0.01, changePercent: 0.58, yield: 8.2, avgYield: 7.5, marketCap: 29000000000 },
    { id: '18', symbol: 'SPALI', name: 'Supalai', sector: 'Property', price: 19.80, change: 0.10, changePercent: 0.51, yield: 6.9, avgYield: 6.1, marketCap: 38000000000 },
    { id: '19', symbol: 'AP', name: 'AP (Thailand)', sector: 'Property', price: 10.90, change: -0.10, changePercent: -0.91, yield: 6.2, avgYield: 5.5, marketCap: 34000000000 },
    { id: '20', symbol: 'ORI', name: 'Origin Property', sector: 'Property', price: 6.85, change: 0.05, changePercent: 0.74, yield: 7.5, avgYield: 6.8, marketCap: 16000000000 },
    { id: '21', symbol: 'WHA', name: 'WHA Corp', sector: 'Property', price: 5.25, change: 0.05, changePercent: 0.96, yield: 3.5, avgYield: 3.0, marketCap: 78000000000 },

    // Construction Materials
    { id: '22', symbol: 'SCC', name: 'Siam Cement', sector: 'Construction', price: 284.00, change: -2.00, changePercent: -0.70, yield: 4.1, avgYield: 4.5, marketCap: 340000000000 },
    { id: '23', symbol: 'TASCO', name: 'Tipco Asphalt', sector: 'Construction', price: 16.20, change: 0.20, changePercent: 1.25, yield: 7.1, avgYield: 6.5, marketCap: 25000000000 },

    // Food & Beverage
    { id: '24', symbol: 'TU', name: 'Thai Union Group', sector: 'Food', price: 14.80, change: 0.10, changePercent: 0.68, yield: 4.2, avgYield: 3.8, marketCap: 69000000000 },
    { id: '25', symbol: 'TVO', name: 'Thai Vegetable Oil', sector: 'Food', price: 21.40, change: 0.10, changePercent: 0.47, yield: 6.8, avgYield: 6.0, marketCap: 17000000000 },

    // Commerce
    { id: '26', symbol: 'HMPRO', name: 'Home Product Center', sector: 'Commerce', price: 10.60, change: -0.10, changePercent: -0.93, yield: 3.8, avgYield: 3.2, marketCap: 139000000000 },
    { id: '27', symbol: 'COM7', name: 'Com7', sector: 'Commerce', price: 20.30, change: 0.30, changePercent: 1.50, yield: 3.5, avgYield: 2.8, marketCap: 48000000000 },

    // Health Care
    { id: '28', symbol: 'BDMS', name: 'Bangkok Dusit Med', sector: 'Health Test', price: 28.50, change: 0.25, changePercent: 0.88, yield: 2.5, avgYield: 2.1, marketCap: 453000000000 },

    // Transportation
    { id: '29', symbol: 'BEM', name: 'Bangkok Expressway', sector: 'Transport', price: 8.10, change: -0.05, changePercent: -0.61, yield: 2.1, avgYield: 1.8, marketCap: 123000000000 },
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
