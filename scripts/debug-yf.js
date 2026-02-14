const pkg = require('yahoo-finance2');
console.log('Keys:', Object.keys(pkg));
console.log('Default keys:', pkg.default ? Object.keys(pkg.default) : 'No default');
console.log('Type of default:', typeof pkg.default);
if (pkg.YahooFinance) console.log('YahooFinance is:', typeof pkg.YahooFinance);
