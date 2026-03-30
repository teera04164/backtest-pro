// ── CONFIGURATION ─────────────────────────────────────────────────────────────
const CONFIG = {
  // Default data file
  defaultData: {
    symbol: 'SCB',
    timeframe: '1W',
    data: `time,open,high,low,close
1594087200,74.25,75,71.75,72.25
1594605600,73.5,74.75,71.25,74.25
1595210400,73.5,74.25,70.5,70.75
1595815200,70.5,71,66,67`
  },
  
  // Default settings
  defaultSettings: {
    capital: 100000,
    fee: 0.1,
    leverage: 1,
    stopLoss: 20000000,
    takeProfit: 40000000,
    amount: 10000,
    startBar: 60
  }
};
