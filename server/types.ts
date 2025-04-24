// Just for reference -___-
// Boy do I love vanilla javascript express backend

type stockEntry = {
    symbol: string;
    amount: number;
    purchaseDate: Date;
    purchasePrice: number; // could be inferred from the date but to add it here would be simpler for calculations
}


// https://financialmodelingprep.com/api/v3/historical-price-full/AAPL?apikey=ydVoHu8hsFyCf0vukGtKVgDuJzCfWkRc
// ...
/*
{
  "symbol": "AAPL",
  "historical": [
    {
      "date": "2025-04-24",
      "open": 204.89,
      "high": 206.87,
      "low": 202.94,
      "close": 206.54,
      "adjClose": 206.54,
      "volume": 18728570,
      "unadjustedVolume": 18728570,
      "change": 1.65,
      "changePercent": 0.80531017,
      "vwap": 205.45,
      "label": "April 24, 25",
      "changeOverTime": 0.0080531017
    },
    {
      "date": "2025-04-23",
      "open": 206,
      "high": 208,
      "low": 202.8,
      "close": 204.6,
      "adjClose": 204.22,
      "volume": 51988230,
      "unadjustedVolume": 51988230,
      "change": -1.4,
      "changePercent": -0.67961,
      "vwap": 205.255,
      "label": "April 23, 25",
      "changeOverTime": -0.0067961
    },
    {
      "date": "2025-04-22",
      "open": 196.12,
      "high": 201.59,
      "low": 195.97,
      "close": 199.74,
      "adjClose": 199.74,
      "volume": 52976400,
      "unadjustedVolume": 52976400,
      "change": 3.62,
      "changePercent": 1.85,
      "vwap": 198.355,
      "label": "April 22, 25",
      "changeOverTime": 0.0185
    },
    {
      "date": "2025-04-21",
      "open": 193.27,
      "high": 193.8,
      "low": 189.81,
      "close": 193.16,
      "adjClose": 193.16,
      "volume": 46742537,
      "unadjustedVolume": 46742537,
      "change": -0.105,
      "changePercent": -0.0569152,
      "vwap": 192.51,
      "label": "April 21, 25",
      "changeOverTime": -0.000569152
    },

*/