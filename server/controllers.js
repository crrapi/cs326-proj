const storage = require('./storage');
const fetch = require('node-fetch');
const { v4: uuidv4 } = require('uuid');

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
            } catch (e) { }

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
        return data.historical.sort((a, b) => new Date(a.date) - new Date(b.date));
    } catch (error) {
        console.error(`Failed to fetch historical data for ${symbol}:`, error);
        throw error;
    }
}

async function getPortfolio(req, res, next) {
    const username = 'defaultUser';
    try {
        const data = await storage.readData();
        if (!data[username]) {
            console.log(`User ${username} not found, returning default structure.`);
             res.json({ holdings: [], cashWithdrawnFromSales: 0 });
        } else {
            res.json({
                holdings: data[username].holdings || [],
                cashWithdrawnFromSales: data[username].cashWithdrawnFromSales || 0
            });
        }
    } catch (error) {
        console.error("Error fetching portfolio:", error);
        next(error);
    }
}


async function getRealtimeGraphData(req, res, next) {
    const username = 'defaultUser';
    try {
        const data = await storage.readData();
        const userData = data[username];

        if (!userData || !userData.holdings || userData.holdings.length === 0) {
            console.log(`No holdings found for user ${username}, returning empty graph data.`);
            return res.json([]);
        }

        // --- Find the earliest purchase date ---
        let earliestPurchaseDate = null;
        if (userData.holdings.length > 0) {
            earliestPurchaseDate = userData.holdings.reduce((earliest, current) => {
                const currentDt = new Date(current.purchaseDate + 'T00:00:00');
                return earliest === null || currentDt < earliest ? currentDt : earliest;
            }, null);
        }
        console.log("Earliest purchase date found:", earliestPurchaseDate?.toISOString().split('T')[0] || "N/A");
        // --- End Find earliest purchase date ---


        const allSymbols = [...new Set(userData.holdings.map(h => h.symbol))];

        console.log(`Generating graph data for symbols: ${allSymbols.join(', ')}`);

        const apiResults = await Promise.allSettled(
            allSymbols.map(symbol => fetchHistoricalData(symbol))
        );

        const successfulFetches = {};
        let fetchErrors = [];
        apiResults.forEach((result, index) => {
            const symbol = allSymbols[index];
            if (result.status === 'fulfilled' && Array.isArray(result.value)) {
                successfulFetches[symbol] = result.value;
            } else {
                console.error(`Failed to fetch or process data for ${symbol}:`, result.reason || 'Unknown error');
                fetchErrors.push(`Failed for ${symbol}: ${result.reason?.message || 'Unknown error'}`);
            }
        });

        if (fetchErrors.length > 0) {
            console.warn("Partial data generation possible due to fetch errors:", fetchErrors);
        }

        if (Object.keys(successfulFetches).length === 0) {
            console.log("No successful API fetches, returning empty graph data.");
            return res.json([]);
        }

        let allDates = new Set();
        Object.values(successfulFetches).forEach(history => {
            history.forEach(dayData => allDates.add(dayData.date));
        });

        let sortedDates = Array.from(allDates).sort((a, b) => new Date(a) - new Date(b));

        // --- Filter dates based on earliest purchase ---
        if (earliestPurchaseDate) {
            const earliestPurchaseDateStr = earliestPurchaseDate.toISOString().split('T')[0];
            sortedDates = sortedDates.filter(dateStr => dateStr >= earliestPurchaseDateStr);
            console.log(`Filtered dates to start from ${earliestPurchaseDateStr}. ${sortedDates.length} dates remaining.`);
        }
        // --- End Filter dates ---

        if (!sortedDates || sortedDates.length === 0) {
            console.log("No historical dates remaining after filtering, returning empty graph data.");
            return res.json([]);
        }

        const priceMap = {};
        sortedDates.forEach(date => {
            priceMap[date] = {};
        });

        Object.entries(successfulFetches).forEach(([symbol, historicalData]) => {
            historicalData.forEach(dayData => {
                if (priceMap[dayData.date]) {
                    priceMap[dayData.date][symbol] = dayData.close;
                }
            });
        });

        const graphData = sortedDates.map(dateStr => {
            const currentDt = new Date(dateStr + 'T00:00:00');
            const activeHoldingsBySymbol = {};

            userData.holdings.forEach(entry => {
                const purchaseDt = new Date(entry.purchaseDate + 'T00:00:00');
                const sellDt = entry.sellDate ? new Date(entry.sellDate + 'T00:00:00') : null;

                let sharesHeldFromEntry = 0;
                if (purchaseDt <= currentDt) {
                   const effectivelySoldQuantity = (sellDt && sellDt <= currentDt) ? (entry.soldQuantity || 0) : 0;
                   sharesHeldFromEntry = entry.quantity - effectivelySoldQuantity;
                }
                const activeQuantityInEntry = sharesHeldFromEntry;


                if (activeQuantityInEntry > 1e-9) {
                    if (!activeHoldingsBySymbol[entry.symbol]) {
                        activeHoldingsBySymbol[entry.symbol] = 0;
                    }
                    activeHoldingsBySymbol[entry.symbol] += activeQuantityInEntry;
                }
            });

            const stocksForDate = [];
            Object.entries(activeHoldingsBySymbol).forEach(([symbol, totalActiveShares]) => {
                 const price = priceMap[dateStr]?.[symbol];

                 if (price !== undefined && totalActiveShares > 1e-9) {
                    stocksForDate.push({
                        symbol: symbol,
                        price: price,
                        shares: totalActiveShares,
                        color: getStockColor(symbol)
                    });
                 } else if (totalActiveShares > 1e-9) {
                      console.warn(`Missing price for ${symbol} on ${dateStr}. Stock value for this date will be incomplete.`);
                 }
            });

            const totalValue = stocksForDate.reduce((sum, stock) => sum + (stock.price * stock.shares), 0);

            return {
                date: dateStr,
                stocks: stocksForDate,
                totalValue: totalValue
            };
        });

        console.log(`Generated graph data with ${graphData.length} date points (after filtering).`);

        res.json(graphData);

    } catch (error) {
        console.error("Error generating realtime graph data:", error);
        next(error);
    }
}


module.exports = {
    getPortfolio,
    getRealtimeGraphData
};