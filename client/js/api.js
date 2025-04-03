/**
 * Mock API service for stock data
 */
class StockAPI {
    constructor() {
        this.apiDelay = 600; // Simulate network delay
        this.PRICE_CACHE_KEY = 'stock_app_price_cache';
        this.GLOBAL_SEED = 42897; // Fixed seed for deterministic generation

        // Common stock tickers for autocomplete
        this.availableStocks = [
            { symbol: 'AAPL', name: 'Apple Inc.', sector: 'Technology' },
            { symbol: 'MSFT', name: 'Microsoft Corporation', sector: 'Technology' },
            { symbol: 'GOOGL', name: 'Alphabet Inc.', sector: 'Technology' },
            { symbol: 'AMZN', name: 'Amazon.com Inc.', sector: 'Consumer Cyclical' },
            { symbol: 'TSLA', name: 'Tesla Inc.', sector: 'Automotive' },
            { symbol: 'META', name: 'Meta Platforms Inc.', sector: 'Technology' },
            { symbol: 'NVDA', name: 'NVIDIA Corporation', sector: 'Technology' },
            { symbol: 'NFLX', name: 'Netflix Inc.', sector: 'Entertainment' },
            { symbol: 'JPM', name: 'JPMorgan Chase & Co.', sector: 'Financial Services' },
            { symbol: 'V', name: 'Visa Inc.', sector: 'Financial Services' },
            { symbol: 'DIS', name: 'The Walt Disney Company', sector: 'Entertainment' },
            { symbol: 'ADBE', name: 'Adobe Inc.', sector: 'Technology' },
            { symbol: 'PG', name: 'Procter & Gamble Co.', sector: 'Consumer Defensive' },
            { symbol: 'MA', name: 'Mastercard Inc.', sector: 'Financial Services' },
            { symbol: 'HD', name: 'The Home Depot Inc.', sector: 'Consumer Cyclical' },
            { symbol: 'BAC', name: 'Bank of America Corp.', sector: 'Financial Services' },
            { symbol: 'XOM', name: 'Exxon Mobil Corporation', sector: 'Energy' },
            { symbol: 'PFE', name: 'Pfizer Inc.', sector: 'Healthcare' },
            { symbol: 'CSCO', name: 'Cisco Systems Inc.', sector: 'Technology' },
            { symbol: 'KO', name: 'The Coca-Cola Company', sector: 'Consumer Defensive' }
        ];

        // Generate random colors for stocks
        this.stockColors = {};
        const colors = [
            '#E53E3E', '#DD6B20', '#D69E2E', '#38A169', '#319795',
            '#3182CE', '#5A67D8', '#805AD5', '#D53F8C', '#718096'
        ];

        this.availableStocks.forEach((stock, index) => {
            this.stockColors[stock.symbol] = colors[index % colors.length];
        });

        // Initialize or load the price cache
        this.initPriceCache();

        // Market factors that affect all stocks
        this.marketFactors = this._generateMarketFactors();

        // Sector correlations
        this.sectorCorrelations = {
            'Technology': { volatility: 1.5, marketBeta: 1.2 },
            'Financial Services': { volatility: 1.2, marketBeta: 1.1 },
            'Healthcare': { volatility: 0.9, marketBeta: 0.8 },
            'Consumer Cyclical': { volatility: 1.3, marketBeta: 1.0 },
            'Consumer Defensive': { volatility: 0.7, marketBeta: 0.6 },
            'Energy': { volatility: 1.6, marketBeta: 1.1 },
            'Automotive': { volatility: 1.4, marketBeta: 1.2 },
            'Entertainment': { volatility: 1.3, marketBeta: 1.1 }
        };
    }

    // Initialize or load the price cache
    initPriceCache() {
        let cache = localStorage.getItem(this.PRICE_CACHE_KEY);

        if (!cache) {
            // Create new empty cache if none exists
            cache = {
                lastUpdated: new Date().toISOString(),
                globalSeed: this.GLOBAL_SEED,
                prices: {}
            };
            localStorage.setItem(this.PRICE_CACHE_KEY, JSON.stringify(cache));
        } else {
            try {
                cache = JSON.parse(cache);
                // Keep the same global seed for consistency
                this.GLOBAL_SEED = cache.globalSeed;
            } catch (e) {
                console.error('Error parsing price cache', e);
                cache = {
                    lastUpdated: new Date().toISOString(),
                    globalSeed: this.GLOBAL_SEED,
                    prices: {}
                };
                localStorage.setItem(this.PRICE_CACHE_KEY, JSON.stringify(cache));
            }
        }

        this.priceCache = cache;
    }

    // Save the price cache to localStorage
    savePriceCache() {
        this.priceCache.lastUpdated = new Date().toISOString();
        localStorage.setItem(this.PRICE_CACHE_KEY, JSON.stringify(this.priceCache));
    }

    // Seeded random number generator
    seededRandom(seed) {
        const x = Math.sin(seed) * 10000;
        return x - Math.floor(x);
    }

    // Get a consistent seed for a given symbol and date
    getStockSeed(symbol, dateString) {
        const dateHash = new Date(dateString).getTime() / 86400000; // Days since epoch
        const symbolHash = symbol.split('').reduce((acc, char, i) => acc + char.charCodeAt(0) * (i + 1), 0);
        return this.GLOBAL_SEED + symbolHash + dateHash;
    }

    // Generate market-wide factors that affect all stocks
    _generateMarketFactors() {
        const startDate = new Date('2023-01-01');
        const endDate = new Date('2025-12-31');
        const daysBetween = Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24));

        const factors = {
            dailyChanges: {},
            // Major market events with significant impact
            events: [
                { date: '2023-03-15', impact: -0.08, description: 'Banking crisis' },
                { date: '2023-06-21', impact: 0.05, description: 'Fed pause' },
                { date: '2023-10-05', impact: -0.06, description: 'Geopolitical tensions' },
                { date: '2024-01-18', impact: 0.07, description: 'Tech rally' },
                { date: '2024-05-10', impact: -0.05, description: 'Inflation concerns' },
                { date: '2024-08-23', impact: 0.04, description: 'Economic recovery' },
                { date: '2024-11-07', impact: 0.06, description: 'Post-election rally' },
                { date: '2025-02-14', impact: -0.07, description: 'Yield curve concerns' }
            ],
            // Market trend components - long term and cyclical
            trends: {
                longTerm: 0.0001, // Slight upward bias (about 2.5% per year)
                monthly: { amplitude: 0.02, period: 30 },
                weekly: { amplitude: 0.01, period: 5 }
            }
        };

        // Pre-generate daily market changes
        for (let i = 0; i < daysBetween; i++) {
            const date = new Date(startDate);
            date.setDate(date.getDate() + i);
            const dateString = date.toISOString().split('T')[0];

            // Seed based on date to get consistent random values
            const seed = this.getStockSeed('MARKET', dateString);

            // Base volatility with weekday effects (more volatile on Mon/Fri)
            const dayOfWeek = date.getDay();
            const dailyVolatility = 0.005 * (1 + 0.2 * (dayOfWeek === 1 || dayOfWeek === 5));

            // Daily random component
            const randomComponent = (this.seededRandom(seed) * 2 - 1) * dailyVolatility;

            // Long term trend
            const longTermComponent = factors.trends.longTerm;

            // Cyclical components
            const daysSinceStart = i;
            const monthCycle = Math.sin(2 * Math.PI * daysSinceStart / factors.trends.monthly.period) *
                factors.trends.monthly.amplitude;
            const weekCycle = Math.sin(2 * Math.PI * daysSinceStart / factors.trends.weekly.period) *
                factors.trends.weekly.amplitude;

            // Combined daily change
            let dailyChange = randomComponent + longTermComponent + (monthCycle * 0.05) + (weekCycle * 0.02);

            // Apply market events if this is an event day
            const event = factors.events.find(e => e.date === dateString);
            if (event) {
                // Apply event impact over a few days, with strongest on the event day
                const eventImpact = event.impact;
                dailyChange += eventImpact;

                // Also store the event for reference
                factors.dailyChanges[dateString] = {
                    change: dailyChange,
                    event: event.description
                };
            } else {
                factors.dailyChanges[dateString] = { change: dailyChange };
            }
        }

        return factors;
    }

    // Generate or retrieve price for a specific stock on a specific date
    getStockPriceForDate(symbol, dateString, basePrice = null) {
        const cache = this.priceCache;

        // Initialize symbol cache if needed
        if (!cache.prices[symbol]) {
            cache.prices[symbol] = {};
        }

        // Return cached price if available
        if (cache.prices[symbol][dateString]) {
            return cache.prices[symbol][dateString];
        }

        // If no base price is provided, calculate one
        if (basePrice === null) {
            basePrice = this._getBasePrice(symbol);
        }

        // Get stock details
        const stock = this.availableStocks.find(s => s.symbol === symbol);
        const sector = stock ? stock.sector : 'Other';
        const sectorFactor = this.sectorCorrelations[sector] || { volatility: 1.0, marketBeta: 1.0 };

        // Get date details
        const date = new Date(dateString);
        const prevDate = new Date(date);
        prevDate.setDate(prevDate.getDate() - 1);
        const prevDateString = prevDate.toISOString().split('T')[0];

        // Calculate the price
        let price;

        // If we have the previous day's price, calculate from that
        if (cache.prices[symbol][prevDateString]) {
            const prevPrice = cache.prices[symbol][prevDateString];

            // Get the market change for this date
            const marketFactor = this.marketFactors.dailyChanges[dateString] || { change: 0 };

            // Stock-specific factor with sector influence
            const seed = this.getStockSeed(symbol, dateString);
            const stockSpecific = (this.seededRandom(seed) * 2 - 1) * 0.01 * sectorFactor.volatility;

            // Market correlation component (beta) - how much this stock follows the market
            const marketCorrelation = marketFactor.change * sectorFactor.marketBeta;

            // Calculate the daily return
            const dailyReturn = marketCorrelation + stockSpecific;

            // Apply return to previous price
            price = prevPrice * (1 + dailyReturn);

            // Ensure price doesn't go too low
            price = Math.max(price, prevPrice * 0.75, 0.01);
        } else {
            // No previous price, calculate based on seed and base price
            const seed = this.getStockSeed(symbol, dateString);
            const daysFromNow = Math.floor((new Date() - date) / (1000 * 60 * 60 * 24));

            // More variation the further back in time
            const variationFactor = Math.min(0.5, daysFromNow / 365 * 0.3);
            const variation = (this.seededRandom(seed) * 2 - 1) * variationFactor;

            price = basePrice * (1 + variation);
        }

        // Store in cache
        cache.prices[symbol][dateString] = parseFloat(price.toFixed(2));
        this.savePriceCache();

        return cache.prices[symbol][dateString];
    }

    /**
     * Search for stocks by symbol or name
     * @param {string} query - Search term
     * @returns {Promise<Array>} Matching stocks
     */
    async searchStocks(query) {
        await this._delay();

        if (!query) return [];

        query = query.toUpperCase();
        return this.availableStocks.filter(stock =>
            stock.symbol.includes(query) ||
            stock.name.toUpperCase().includes(query)
        ).slice(0, 5);
    }

    /**
     * Get current price for a stock
     * @param {string} symbol - Stock ticker symbol
     * @returns {Promise<Object>} Stock price data
     */
    async getCurrentPrice(symbol) {
        await this._delay();

        const stock = this.availableStocks.find(s => s.symbol === symbol);
        if (!stock) throw new Error(`Stock ${symbol} not found`);

        // Get today's date in YYYY-MM-DD format
        const today = new Date().toISOString().split('T')[0];

        // Get yesterday's date for change calculation
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayString = yesterday.toISOString().split('T')[0];

        // Get prices from cache or generate them
        const todayPrice = this.getStockPriceForDate(symbol, today);
        const yesterdayPrice = this.getStockPriceForDate(symbol, yesterdayString);

        // Calculate percent change
        const change = ((todayPrice / yesterdayPrice) - 1) * 100;

        return {
            symbol,
            price: todayPrice,
            change: parseFloat(change.toFixed(2)),
            updated: new Date()
        };
    }

    /**
     * Get historical data for a stock
     * @param {string} symbol - Stock ticker symbol
     * @param {string} period - Time period (1d, 1w, 1m, 3m, 1y)
     * @returns {Promise<Array>} Historical price data
     */
    async getHistoricalData(symbol, period = '1m') {
        await this._delay();

        const stock = this.availableStocks.find(s => s.symbol === symbol);
        if (!stock) throw new Error(`Stock ${symbol} not found`);

        const points = this._getDataPoints(period);
        const endDate = new Date();
        const data = [];

        // Get baseline price for consistent generation
        const basePrice = this._getBasePrice(symbol);

        for (let i = points - 1; i >= 0; i--) {
            const date = new Date(endDate);

            // Adjust date based on period
            if (period === '1d') {
                date.setMinutes(date.getMinutes() - (i * 15));
            } else if (period === '1w') {
                date.setHours(date.getHours() - (i * 4));
            } else if (period === '1m') {
                date.setDate(date.getDate() - i);
            } else if (period === '3m') {
                date.setDate(date.getDate() - (i * 3));
            } else if (period === '1y') {
                date.setDate(date.getDate() - (i * 7));
            }

            // Format date as YYYY-MM-DD
            const dateString = date.toISOString().split('T')[0];

            // Get price for this date
            const price = this.getStockPriceForDate(symbol, dateString, basePrice);

            data.push({
                date,
                price,
                volume: Math.floor(this.seededRandom(this.getStockSeed(symbol, dateString) + 1000) * 1000000) + 500000
            });
        }

        return data;
    }

    /**
     * Get color for a stock
     * @param {string} symbol - Stock ticker symbol 
     * @returns {string} Color hex value
     */
    getStockColor(symbol) {
        return this.stockColors[symbol] || '#718096';
    }

    /**
     * Get company details
     * @param {string} symbol - Stock ticker symbol
     * @returns {Promise<Object>} Company details
     */
    async getCompanyDetails(symbol) {
        await this._delay();

        const stock = this.availableStocks.find(s => s.symbol === symbol);
        if (!stock) throw new Error(`Stock ${symbol} not found`);

        return {
            ...stock,
            color: this.getStockColor(symbol),
            marketCap: this._getMarketCap(symbol),
            peRatio: parseFloat((Math.random() * 30 + 10).toFixed(2)),
            dividendYield: parseFloat((Math.random() * 2).toFixed(2)),
            fiftyTwoWeekHigh: parseFloat((this._getBasePrice(symbol) * 1.3).toFixed(2)),
            fiftyTwoWeekLow: parseFloat((this._getBasePrice(symbol) * 0.7).toFixed(2))
        };
    }

    // Private helper methods
    async _delay() {
        return new Promise(resolve => setTimeout(resolve, this.apiDelay));
    }

    _getBasePrice(symbol) {
        // Deterministic base price based on symbol
        const hash = symbol.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        return (hash % 900) + 50; // Price between $50 and $950
    }

    _getDataPoints(period) {
        switch (period) {
            case '1d': return 96; // 15-min intervals
            case '1w': return 42; // 4-hour intervals
            case '1m': return 30; // Daily
            case '3m': return 30; // 3-day intervals
            case '1y': return 52; // Weekly
            default: return 30;
        }
    }

    _getVolatility(symbol) {
        // Some stocks are more volatile than others
        const hash = symbol.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        return (hash % 20 + 5) / 1000; // Volatility between 0.005 and 0.025
    }

    _getTrend(symbol, i, points) {
        // Create a more realistic trend with some cycles
        const hash = symbol.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const baseDirection = ((hash % 10) - 5) / 10000; // Base trend direction
        const cycle = Math.sin((i / points) * Math.PI * 2) * 0.0005; // Cyclical component

        return baseDirection + cycle;
    }

    _getMarketCap(symbol) {
        const basePrice = this._getBasePrice(symbol);
        // Calculate approximate market cap (price * random number of outstanding shares)
        const outstandingShares = (Math.random() * 10 + 0.5) * 1000000000; // 0.5B to 10.5B shares
        const marketCap = basePrice * outstandingShares;

        // Format market cap in billions or trillions
        if (marketCap >= 1000000000000) {
            return `$${(marketCap / 1000000000000).toFixed(2)}T`;
        } else {
            return `$${(marketCap / 1000000000).toFixed(2)}B`;
        }
    }
}

export default new StockAPI();