// using built-in fetch

async function testChartApi() {
    const symbol = 'KBANK';
    console.log(`Fetching ${symbol}...`);
    try {
        // Fetch from local dev server
        const res = await fetch(`http://localhost:3000/api/chart-data?symbol=${symbol}`);
        const json = await res.json();

        if (json.data && json.data.length > 0) {
            console.log(`Got ${json.data.length} data points.`);
            console.log('First 5:', json.data.slice(0, 5).map(d => ({ ...d, timeStr: new Date(d.time * 1000).toLocaleString('th-TH') })));
            console.log('Last 5:', json.data.slice(-5).map(d => ({ ...d, timeStr: new Date(d.time * 1000).toLocaleString('th-TH') })));

            if (process.env.SAVE_OUTPUT) {
                const fs = require('fs');
                fs.writeFileSync('debug_chart_output.json', JSON.stringify(json, null, 2));
                console.log('Saved output to debug_chart_output.json');
            }

            // Check for lunch break data (between 12:30 and 14:30)
            const lunchData = json.data.filter(d => {
                const date = new Date(d.time * 1000);
                const h = date.getHours();
                const m = date.getMinutes();
                const t = h * 60 + m;
                // 12:30 = 750, 14:30 = 870
                return t >= 750 && t < 870;
            });
            console.log(`Points during lunch break (12:30-14:30): ${lunchData.length}`);
            if (lunchData.length > 0) {
                console.log('Sample lunch data:', lunchData[0]);
            }

        } else {
            console.log('No data returned.');
            console.log(json);
        }
    } catch (e) {
        console.error(e);
    }
}

testChartApi();
