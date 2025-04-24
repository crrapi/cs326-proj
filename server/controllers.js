const { readData, writeData } = require('./storage');

const getPortfolio = async (req, res, next) => {
    try {
        const data = await readData();
        res.status(200).json(data.defaultUser.holdings || []);
    } catch (error) {
        next(error);
    }
};

const buyStock = async (req, res, next) => {
    try {
        const { symbol, quantity, purchasePrice } = req.body;

        if (!symbol || typeof symbol !== 'string' || symbol.trim() === '') {
            return res.status(400).json({ message: 'Invalid or missing stock symbol.' });
        }
        if (quantity == null || typeof quantity !== 'number' || !Number.isFinite(quantity) || quantity <= 0) {
            return res.status(400).json({ message: 'Invalid or missing quantity. Must be a positive number.' });
        }
        if (purchasePrice == null || typeof purchasePrice !== 'number' || !Number.isFinite(purchasePrice) || purchasePrice < 0) {
            return res.status(400).json({ message: 'Invalid or missing purchase price. Must be a non-negative number.' });
        }

        const data = await readData();
        const userHoldings = data.defaultUser.holdings;

        const existingHoldingIndex = userHoldings.findIndex(h => h.symbol.toUpperCase() === symbol.toUpperCase());

        if (existingHoldingIndex > -1) {
            const existing = userHoldings[existingHoldingIndex];
            const currentTotalValue = existing.quantity * existing.averagePurchasePrice;
            const purchaseTotalValue = quantity * purchasePrice;

            const newTotalQuantity = existing.quantity + quantity;
            const newAveragePrice = (currentTotalValue + purchaseTotalValue) / newTotalQuantity;

            userHoldings[existingHoldingIndex].quantity = newTotalQuantity;
            userHoldings[existingHoldingIndex].averagePurchasePrice = parseFloat(newAveragePrice.toFixed(2));
        } else {
            userHoldings.push({
                symbol: symbol.toUpperCase(),
                quantity: quantity,
                averagePurchasePrice: parseFloat(purchasePrice.toFixed(2))
            });
        }

        await writeData(data);
        res.status(201).json(userHoldings);

    } catch (error) {
        next(error);
    }
};

const sellStock = async (req, res, next) => {
    try {
        const { symbol, quantity } = req.body;

        if (!symbol || typeof symbol !== 'string' || symbol.trim() === '') {
            return res.status(400).json({ message: 'Invalid or missing stock symbol.' });
        }
        if (quantity == null || typeof quantity !== 'number' || !Number.isFinite(quantity) || quantity <= 0) {
            return res.status(400).json({ message: 'Invalid or missing quantity. Must be a positive number.' });
        }

        const data = await readData();
        const userHoldings = data.defaultUser.holdings;

        const existingHoldingIndex = userHoldings.findIndex(h => h.symbol.toUpperCase() === symbol.toUpperCase());

        if (existingHoldingIndex === -1) {
            return res.status(404).json({ message: `Stock symbol ${symbol.toUpperCase()} not found in portfolio.` });
        }

        const existing = userHoldings[existingHoldingIndex];

        if (existing.quantity < quantity) {
            return res.status(400).json({ message: `Not enough shares to sell. You have ${existing.quantity}, tried to sell ${quantity}.` });
        }

        existing.quantity -= quantity;

        if (existing.quantity === 0) {
            userHoldings.splice(existingHoldingIndex, 1);
        } else {
            userHoldings[existingHoldingIndex] = existing;
        }

        await writeData(data);
        res.status(200).json(userHoldings);

    } catch (error) {
        next(error);
    }
};


const createDate = (baseDate, dayOffset) => {
    const date = new Date(baseDate);
    date.setDate(date.getDate() + dayOffset);
    return date;
};


const stockColors = ['#E53E3E', '#48BB78', '#4299E1', '#F6E05E', '#B794F4', '#ED8936', '#38B2AC', '#9F7AEA'];
let colorIndex = 0;
const assignedColors = {};

const getOrAssignColor = (symbol) => {
    if (!assignedColors[symbol]) {
        assignedColors[symbol] = stockColors[colorIndex % stockColors.length];
        colorIndex++;
    }
    return assignedColors[symbol];
}

const getPortfolioHistoricalData = async (req, res, next) => {
    try {
        const data = await readData();
        const holdings = data.defaultUser.holdings || [];

        if (holdings.length === 0) {
            return res.status(200).json([]);
        }

        const numDays = 14;
        const graphData = [];
        const simulationStartDate = new Date();
        simulationStartDate.setDate(simulationStartDate.getDate() - numDays);

        colorIndex = 0;
        Object.keys(assignedColors).forEach(key => delete assignedColors[key]);

        const stockBases = holdings.map(holding => ({
            symbol: holding.symbol,

            initialPrice: holding.averagePurchasePrice,
            shares: holding.quantity,
            color: getOrAssignColor(holding.symbol)
        }));

        for (let i = 0; i < numDays; i++) {
            const currentDate = createDate(simulationStartDate, i);
            const stocksForDay = stockBases.map((stock, index) => {

                const priceFluctuation = Math.sin(i * 0.6 + index * 0.5) * (stock.initialPrice * 0.03) +
                    (Math.random() - 0.5) * (stock.initialPrice * 0.02);

                const currentPrice = Math.max(0.01, parseFloat((stock.initialPrice + priceFluctuation).toFixed(2)));

                return {
                    symbol: stock.symbol,
                    price: currentPrice,
                    shares: stock.shares,
                    color: stock.color
                };
            });

            graphData.push({
                date: currentDate.toISOString(),
                stocks: stocksForDay
            });
        }
        res.status(200).json(graphData);

    } catch (error) {
        next(error);
    }
};


module.exports = {
    getPortfolio,
    buyStock,
    sellStock,
    getPortfolioHistoricalData
};