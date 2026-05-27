const d = require('./slither-link/easy/easy-0001.json');
console.log('has answer:', !!d.answer, 'keys:', Object.keys(d).join(','));
if (d.answer) console.log('answer keys:', Object.keys(d.answer).join(','));
