// Just for reference -___-
// Boy do I love vanilla javascript express backend

type stockEntry = {
    symbol: string;
    amount: number;
    purchaseDate: Date;
    sellDate: Date | null;
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
*/