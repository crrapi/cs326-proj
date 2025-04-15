/**
 * Portfolio management service
 */
class PortfolioService {
    constructor() {
        this.STORAGE_KEY = 'stock_portfolio_data';
        this.currentUser = null;
    }

    /**
     * Initialize the portfolio service
     */
    init() {
        // Load portfolios from storage
        const storedData = localStorage.getItem(this.STORAGE_KEY);
        if (!storedData) {
            // Initialize with empty data structure
            this._saveData({
                users: {
                    'demo@example.com': {
                        name: 'Demo User',
                        portfolios: {
                            'default': {
                                name: 'My Portfolio',
                                stocks: [],
                                created: new Date().toISOString()
                            }
                        },
                        activePortfolio: 'default'
                    }
                }
            });
        }

        // Set demo user as active by default
        this.setCurrentUser('demo@example.com');

        return this;
    }

    /**
     * Set the current active user
     * @param {string} email - User email
     */
    setCurrentUser(email) {
        const data = this._loadData();

        if (!data.users[email]) {
            throw new Error(`User ${email} not found`);
        }

        this.currentUser = email;
    }

    /**
     * Get current user data
     * @returns {Object} User data
     */
    getCurrentUser() {
        if (!this.currentUser) return null;

        const data = this._loadData();
        return {
            email: this.currentUser,
            ...data.users[this.currentUser]
        };
    }

    /**
     * Get active portfolio
     * @returns {Object} Active portfolio data
     */
    getActivePortfolio() {
        const user = this.getCurrentUser();
        if (!user) return null;

        const data = this._loadData();
        const portfolioId = user.activePortfolio;

        return {
            id: portfolioId,
            ...data.users[this.currentUser].portfolios[portfolioId]
        };
    }

    /**
     * Add stock to active portfolio
     * @param {Object} stock - Stock data
     * @returns {Object} Updated portfolio
     */
    addStock(stock) {
        const data = this._loadData();
        const user = this.getCurrentUser();
        const portfolioId = user.activePortfolio;

        // Generate unique ID for the stock entry
        const stockId = Date.now().toString();

        // Add stock to portfolio
        data.users[this.currentUser].portfolios[portfolioId].stocks.push({
            id: stockId,
            symbol: stock.symbol,
            name: stock.name,
            quantity: stock.quantity,
            purchasePrice: stock.purchasePrice,
            purchaseDate: stock.purchaseDate,
            color: stock.color,
            sector: stock.sector
        });

        // Update last modified timestamp
        data.users[this.currentUser].portfolios[portfolioId].lastModified = new Date().toISOString();

        this._saveData(data);

        return this.getActivePortfolio();
    }

    /**
     * Remove stock from active portfolio
     * @param {string} stockId - Stock ID
     * @returns {Object} Updated portfolio
     */
    removeStock(stockId) {
        const data = this._loadData();
        const user = this.getCurrentUser();
        const portfolioId = user.activePortfolio;

        const portfolio = data.users[this.currentUser].portfolios[portfolioId];
        portfolio.stocks = portfolio.stocks.filter(stock => stock.id !== stockId);

        // Update last modified timestamp
        portfolio.lastModified = new Date().toISOString();

        this._saveData(data);

        return this.getActivePortfolio();
    }

    /**
     * Update stock in active portfolio
     * @param {string} stockId - Stock ID
     * @param {Object} updates - Properties to update
     * @returns {Object} Updated portfolio
     */
    updateStock(stockId, updates) {
        const data = this._loadData();
        const user = this.getCurrentUser();
        const portfolioId = user.activePortfolio;

        const portfolio = data.users[this.currentUser].portfolios[portfolioId];
        const stockIndex = portfolio.stocks.findIndex(stock => stock.id === stockId);

        if (stockIndex === -1) {
            throw new Error(`Stock ${stockId} not found in portfolio`);
        }

        // Update stock with new values
        portfolio.stocks[stockIndex] = {
            ...portfolio.stocks[stockIndex],
            ...updates
        };

        // Update last modified timestamp
        portfolio.lastModified = new Date().toISOString();

        this._saveData(data);

        return this.getActivePortfolio();
    }

    /**
     * Create a new portfolio
     * @param {string} name - Portfolio name
     * @returns {Object} New portfolio
     */
    createPortfolio(name) {
        const data = this._loadData();
        const portfolioId = `portfolio_${Date.now()}`;

        data.users[this.currentUser].portfolios[portfolioId] = {
            name,
            stocks: [],
            created: new Date().toISOString()
        };

        // Set as active portfolio
        data.users[this.currentUser].activePortfolio = portfolioId;

        this._saveData(data);

        return {
            id: portfolioId,
            ...data.users[this.currentUser].portfolios[portfolioId]
        };
    }

    /**
     * Get all portfolios for current user
     * @returns {Array} List of portfolios
     */
    getAllPortfolios() {
        const data = this._loadData();
        const user = data.users[this.currentUser];

        return Object.entries(user.portfolios).map(([id, portfolio]) => ({
            id,
            ...portfolio
        }));
    }

    /**
     * Set active portfolio
     * @param {string} portfolioId - Portfolio ID
     */
    setActivePortfolio(portfolioId) {
        const data = this._loadData();

        if (!data.users[this.currentUser].portfolios[portfolioId]) {
            throw new Error(`Portfolio ${portfolioId} not found`);
        }

        data.users[this.currentUser].activePortfolio = portfolioId;
        this._saveData(data);
    }

    // Private helper methods
    _loadData() {
        const data = localStorage.getItem(this.STORAGE_KEY);
        return data ? JSON.parse(data) : {
            users: {}
        };
    }

    _saveData(data) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    }
}

export default new PortfolioService();