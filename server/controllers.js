const storage = require('./storage');
const fetch = require('node-fetch');

const FMP_API_KEY = process.env.FMP_API_KEY || "ydVoHu8hsFyCf0vukGtKVgDuJzCfWkRc";
const FMP_API_BASE_URL = "https://financialmodelingprep.com/api/v3";

const colorPalette = [
    "#3498db", "#e74c3c", "#2ecc71", "#f1c40f", "#9b59b6",
    "#34495e", "#1abc9c", "#e67e22", "#7f8c8d", "#27ae60"
];
let colorIndex = 0;
const assignedColors = {};

function getStockColor(symbol) {
    if (!assignedColors[symbol]) {
        assignedColors[symbol] = colorPalette[colorIndex % colorPalette.length];
        colorIndex++;
    }
    return assignedColors[symbol];
}

async function fetchHistoricalData(symbol) {
    const url = `${FMP_API_BASE_URL}/historical-price-full/${symbol}?apikey=${FMP_API_KEY}`;
    console.log(`Fetching FMP data for ${symbol}...`);
    try {
        const response = await fetch(url);
        if (!response.ok) {
            let errorBody = null;
            try {
                errorBody = await response.json();
            } catch (e) { /* ignore json parsing error */ }

            const errorMessage = errorBody?.["Error Message"] || `HTTP error! status: ${response.status}`;

            if (response.status === 401) {
                throw new Error(`FMP API Error for ${symbol}: Invalid API Key. Please check your key.`);
            }
            if (response.status === 404 && errorMessage.includes("limit")) {
                throw new Error(`FMP API Error for ${symbol}: API limit likely reached or invalid symbol/request.`);
            }
            if (response.status === 404) {
                throw new Error(`FMP API Error for ${symbol}: Symbol not found or invalid API request.`);
            }

            throw new Error(`FMP API Error for ${symbol}: ${errorMessage}`);
        }
        const data = await response.json();
        if (!data || !data.historical || !Array.isArray(data.historical)) {
            console.warn(`Warning: Unexpected FMP API response structure for ${symbol}`, data);
            return [];
        }
        console.log(`Successfully fetched FMP data for ${symbol}. ${data.historical.length} records.`);
        return data.historical;
    } catch (error) {
        console.error(`Failed to fetch historical data for ${symbol}:`, error);
        throw error;
    }
}

async function getPortfolio(req, res, next) {
    const username = 'defaultUser';
    try {
        const data = await storage.readData();
        if (!data[username] || !data[username].holdings) {
            console.log(`No data found for user ${username}, returning empty holdings.`);
            return res.json([]);
        }
        res.json(data[username].holdings);
    } catch (error) {
        console.error("Error fetching portfolio:", error);
        next(error);
    }
}

async function buyStock(req, res, next) {
    const username = 'defaultUser';
    const { symbol, quantity, purchasePrice, purchaseDate } = req.body;

    if (!symbol || typeof symbol !== 'string' || symbol.trim() === "") {
        return res.status(400).json({ message: "Invalid or missing stock symbol." });
    }
    if (quantity === undefined || typeof quantity !== 'number' || quantity <= 0) {
        return res.status(400).json({ message: "Invalid or missing quantity. Must be a positive number." });
    }
    if (purchasePrice === undefined || typeof purchasePrice !== 'number' || purchasePrice < 0) {
        return res.status(400).json({ message: "Invalid or missing purchase price. Must be a non-negative number." });
    }
    if (!purchaseDate || !/^\d{4}-\d{2}-\d{2}$/.test(purchaseDate)) {
        return res.status(400).json({ message: "Invalid or missing purchase date. Required format: YYYY-MM-DD." });
    }

    const upperSymbol = symbol.toUpperCase();

    try {
        const data = await storage.readData();
        if (!data[username]) {
            data[username] = { holdings: [] };
        }
        if (!data[username].holdings) {
            data[username].holdings = [];
        }

        const holdings = data[username].holdings;
        const existingHoldingIndex = holdings.findIndex(h => h.symbol === upperSymbol);

        if (existingHoldingIndex > -1) {
            const existing = holdings[existingHoldingIndex];
            const currentTotalValue = existing.averagePurchasePrice * existing.quantity;
            const purchaseValue = purchasePrice * quantity;
            existing.quantity += quantity;
            existing.averagePurchasePrice = (currentTotalValue + purchaseValue) / existing.quantity;
            console.log(`Updated holding for ${upperSymbol}. New quantity: ${existing.quantity}, New Avg Price: ${existing.averagePurchasePrice}`);
        } else {
            holdings.push({
                symbol: upperSymbol,
                quantity: quantity,
                averagePurchasePrice: purchasePrice
            });
            console.log(`Added new holding for ${upperSymbol}. Quantity: ${quantity}, Avg Price: ${purchasePrice}`);
        }

        await storage.writeData(data);
        res.status(201).json({ message: `Successfully bought ${quantity} shares of ${upperSymbol}`, holdings: data[username].holdings });
    } catch (error) {
        console.error("Error buying stock:", error);
        next(error);
    }
}

async function sellStock(req, res, next) {
    const username = 'defaultUser';
    const { symbol, quantity } = req.body;

    if (!symbol || typeof symbol !== 'string' || symbol.trim() === "") {
        return res.status(400).json({ message: "Invalid or missing stock symbol." });
    }
    if (quantity === undefined || typeof quantity !== 'number' || quantity <= 0) {
        return res.status(400).json({ message: "Invalid or missing quantity. Must be a positive number." });
    }

    const upperSymbol = symbol.toUpperCase();

    try {
        const data = await storage.readData();
        if (!data[username] || !data[username].holdings) {
            return res.status(404).json({ message: `No portfolio found for user ${username}.` });
        }

        const holdings = data[username].holdings;
        const existingHoldingIndex = holdings.findIndex(h => h.symbol === upperSymbol);

        if (existingHoldingIndex > -1) {
            const existing = holdings[existingHoldingIndex];
            if (existing.quantity < quantity) {
                return res.status(400).json({ message: `Not enough shares to sell. You have ${existing.quantity} ${upperSymbol}, tried to sell ${quantity}.` });
            }

            existing.quantity -= quantity;
            console.log(`Sold ${quantity} shares of ${upperSymbol}. Remaining quantity: ${existing.quantity}`);

            if (existing.quantity < 0.000001) {
                holdings.splice(existingHoldingIndex, 1);
                console.log(`Removed holding for ${upperSymbol} as quantity reached zero.`);
            }

            await storage.writeData(data);
            res.status(200).json({ message: `Successfully sold ${quantity} shares of ${upperSymbol}`, holdings: data[username].holdings });

        } else {
            return res.status(404).json({ message: `Stock ${upperSymbol} not found in portfolio.` });
        }
    } catch (error) {
        console.error("Error selling stock:", error);
        next(error);
    }
}

async function getRealtimeGraphData(req, res, next) {
    const username = 'defaultUser';
    try {
        const data = await storage.readData();
        if (!data[username] || !data[username].holdings || data[username].holdings.length === 0) {
            console.log(`No holdings found for user ${username}, returning empty graph data.`);
            return res.json([]);
        }

        const currentHoldings = data[username].holdings;
        const symbols = currentHoldings.map(h => h.symbol);

        console.log(`Generating graph data for symbols: ${symbols.join(', ')}`);

        const apiResults = await Promise.allSettled(
            symbols.map(symbol => fetchHistoricalData(symbol))
        );

        const successfulFetches = {};
        let fetchErrors = [];
        apiResults.forEach((result, index) => {
            const symbol = symbols[index];
            if (result.status === 'fulfilled' && Array.isArray(result.value)) {
                successfulFetches[symbol] = result.value.sort((a, b) => new Date(a.date) - new Date(b.date));
            } else {
                console.error(`Failed to fetch or process data for ${symbol}:`, result.reason || 'Unknown error');
                fetchErrors.push(`Failed for ${symbol}: ${result.reason?.message || 'Unknown error'}`);
            }
        });

        if (fetchErrors.length > 0) {
            console.warn("Partial data generated due to fetch errors:", fetchErrors);
        }

        if (Object.keys(successfulFetches).length === 0) {
            console.log("No successful API fetches, returning empty graph data.");
            return res.json([]);
        }

        const firstSymbol = Object.keys(successfulFetches)[0];
        const allDates = successfulFetches[firstSymbol].map(h => h.date);

        if (!allDates || allDates.length === 0) {
            console.log("No historical dates found after fetching, returning empty graph data.");
            return res.json([]);
        }

        const priceMap = {};
        allDates.forEach(date => {
            priceMap[date] = {};
        });

        Object.entries(successfulFetches).forEach(([symbol, historicalData]) => {
            historicalData.forEach(dayData => {
                if (priceMap[dayData.date]) {
                    priceMap[dayData.date][symbol] = dayData.close;
                }
            });
        });

        const graphData = allDates.map(dateStr => {
            const stocksForDate = [];
            currentHoldings.forEach(holding => {
                const price = priceMap[dateStr]?.[holding.symbol];
                if (price !== undefined && holding.quantity > 0) {
                    stocksForDate.push({
                        symbol: holding.symbol,
                        price: price,
                        shares: holding.quantity,
                        color: getStockColor(holding.symbol)
                    });
                }
            });

            return {
                date: dateStr,
                stocks: stocksForDate
            };
        });

        console.log(`Generated graph data with ${graphData.length} date points.`);
        res.json(graphData);

    } catch (error) {
        console.error("Error generating realtime graph data:", error);
        next(error);
    }
}

module.exports = {
    getPortfolio,
    buyStock,
    sellStock,
    getRealtimeGraphData
};