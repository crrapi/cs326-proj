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
     const purchaseDt = new Date(purchaseDate + 'T00:00:00');
     if (isNaN(purchaseDt.getTime())) {
        return res.status(400).json({ message: "Invalid purchase date." });
     }


    const upperSymbol = symbol.trim().toUpperCase();

    try {
        const data = await storage.readData();
        if (!data[username]) {
            data[username] = { holdings: [], cashWithdrawnFromSales: 0 };
        }
        if (!data[username].holdings) {
            data[username].holdings = [];
        }
         if (typeof data[username].cashWithdrawnFromSales !== 'number') {
            data[username].cashWithdrawnFromSales = 0;
         }

        const newHoldingEntry = {
            entryId: uuidv4(),
            symbol: upperSymbol,
            quantity: quantity,
            purchaseDate: purchaseDate,
            purchasePrice: purchasePrice,
        };

        data[username].holdings.push(newHoldingEntry);
        console.log(`Added new holding entry for ${upperSymbol}. Entry ID: ${newHoldingEntry.entryId}, Quantity: ${quantity}, Price: ${purchasePrice}, Date: ${purchaseDate}`);

        data[username].holdings.sort((a, b) => new Date(a.purchaseDate) - new Date(b.purchaseDate));

        await storage.writeData(data);
        res.status(201).json({
            message: `Successfully bought ${quantity} shares of ${upperSymbol}`,
            entry: newHoldingEntry,
            userData: {
                 holdings: data[username].holdings,
                 cashWithdrawnFromSales: data[username].cashWithdrawnFromSales
            }
        });
    } catch (error) {
        console.error("Error buying stock:", error);
        next(error);
    }
}

async function sellStock(req, res, next) {
    const username = 'defaultUser';
    const { symbol, quantity, sellPrice, sellDate } = req.body;

    if (!symbol || typeof symbol !== 'string' || symbol.trim() === "") {
        return res.status(400).json({ message: "Invalid or missing stock symbol." });
    }
    if (quantity === undefined || typeof quantity !== 'number' || quantity <= 0) {
        return res.status(400).json({ message: "Invalid or missing quantity to sell. Must be a positive number." });
    }
    if (sellPrice === undefined || typeof sellPrice !== 'number' || sellPrice < 0) {
        return res.status(400).json({ message: "Invalid or missing sell price. Must be a non-negative number." });
    }
    if (!sellDate || !/^\d{4}-\d{2}-\d{2}$/.test(sellDate)) {
        return res.status(400).json({ message: "Invalid or missing sell date. Required format: YYYY-MM-DD." });
    }
     const sellDt = new Date(sellDate + 'T00:00:00');
     if (isNaN(sellDt.getTime())) {
        return res.status(400).json({ message: "Invalid sell date." });
     }

    const upperSymbol = symbol.trim().toUpperCase();
    let quantityToSell = quantity;

    try {
        const data = await storage.readData();
        if (!data[username] || !data[username].holdings) {
            return res.status(404).json({ message: `No portfolio found for user ${username}.` });
        }

        const holdings = data[username].holdings;
        if (typeof data[username].cashWithdrawnFromSales !== 'number') {
             data[username].cashWithdrawnFromSales = 0;
        }

        const relevantEntries = holdings
            .filter(h => h.symbol === upperSymbol && (h.soldQuantity || 0) < h.quantity)
            .sort((a, b) => new Date(a.purchaseDate) - new Date(b.purchaseDate));

        const totalAvailableQuantity = relevantEntries.reduce((sum, entry) => {
            const availableInEntry = entry.quantity - (entry.soldQuantity || 0);
            return sum + availableInEntry;
        }, 0);

        if (totalAvailableQuantity < quantityToSell) {
            return res.status(400).json({
                message: `Not enough shares to sell. You have ${totalAvailableQuantity.toFixed(6)} available ${upperSymbol}, tried to sell ${quantityToSell}.`
            });
        }

        let totalCashFromThisSale = 0;
        let sharesSoldInThisTx = 0;

        for (const entry of relevantEntries) {
            if (quantityToSell <= 0) break;

             const purchaseDt = new Date(entry.purchaseDate + 'T00:00:00');
             if (sellDt < purchaseDt) {
                 console.warn(`Skipping entry ${entry.entryId} for sell date ${sellDate} as it was purchased later on ${entry.purchaseDate}`);
                 // Continue to next entry if this one wasn't purchased yet
                 continue;
             }

            const availableInEntry = entry.quantity - (entry.soldQuantity || 0);
            const sellFromThisEntry = Math.min(quantityToSell, availableInEntry);

            if (sellFromThisEntry > 0) {
                entry.sellDate = sellDate;
                entry.sellPrice = sellPrice;
                entry.soldQuantity = (entry.soldQuantity || 0) + sellFromThisEntry;

                quantityToSell -= sellFromThisEntry;
                sharesSoldInThisTx += sellFromThisEntry;
                totalCashFromThisSale += sellFromThisEntry * sellPrice;

                console.log(`Sold ${sellFromThisEntry.toFixed(6)} shares from entry ${entry.entryId} (purchased ${entry.purchaseDate}). Remaining in entry: ${(entry.quantity - entry.soldQuantity).toFixed(6)}`);
            }
        }

        data[username].cashWithdrawnFromSales += totalCashFromThisSale;

        console.log(`Total sold in this transaction: ${sharesSoldInThisTx.toFixed(6)} shares of ${upperSymbol} for $${totalCashFromThisSale.toFixed(2)}.`);
        console.log(`Total cash withdrawn from all sales: $${data[username].cashWithdrawnFromSales.toFixed(2)}`);

        await storage.writeData(data);
        res.status(200).json({
            message: `Successfully sold ${sharesSoldInThisTx.toFixed(6)} shares of ${upperSymbol}`,
             userData: {
                 holdings: data[username].holdings,
                 cashWithdrawnFromSales: data[username].cashWithdrawnFromSales
             }
        });

    } catch (error) {
        console.error("Error selling stock:", error);
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
    buyStock,
    sellStock,
    getRealtimeGraphData
};