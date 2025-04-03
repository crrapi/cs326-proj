import '../style.css';
import p5 from 'p5';
import stockAPI from './api.js';
import portfolioService from './portfolio.js';
import authService from './auth.js';

class StockPortfolioApp {
    constructor() {
        // Services
        this.stockAPI = stockAPI;
        this.portfolioService = portfolioService;
        this.authService = authService;

        // State
        this.currentTimeframe = '1m';
        this.sketch = null;
        this.p5Instance = null;
        this.selectedStock = null;
        this.graphData = [];

        // UI Elements (to be initialized when DOM is ready)
        this.stockForm = null;
        this.tickerInput = null;
        this.tickerAutocomplete = null;
        this.quantityInput = null;
        this.purchaseDateInput = null;
        this.purchasePriceInput = null;
        this.portfolioListElement = null;
        this.timeframeSelector = null;
        this.stockDetails = null;
        this.loginModal = null;
        this.portfolioSelector = null;

        // For debouncing search
        this.searchDebounceTimer = null;
        this.searchDebounceDelay = 300; // ms
    }

    // Add cleanup method to class
    cleanup() {
        // Remove event listeners
        if (this.tickerInput) {
            this.tickerInput.removeEventListener('input', this.handleTickerInput);
            this.tickerInput.removeEventListener('keydown', this.handleTickerKeydown);
        }

        if (this.stockForm) {
            this.stockForm.removeEventListener('submit', this.handleStockFormSubmit);
        }

        // Remove p5 instance
        if (this.p5Instance) {
            this.p5Instance.remove();
            this.p5Instance = null;
        }

        // Clear any pending timers
        clearTimeout(this.searchDebounceTimer);
    }

    // Modify the init method to handle re-initialization
    init() {
        // Cleanup previous instance if reinitializing
        this.cleanup();

        // Initialize services
        this.portfolioService.init();
        this.authService.init();

        // Make sure DOM is loaded
        document.addEventListener('DOMContentLoaded', () => {
            this.initUI();
            this.addEventListeners();
            this.updateUI();
        });
    }

    // Improved initUI with safer element selection
    initUI() {
        // Get existing elements with safety checks
        this.stockForm = document.getElementById('stock-form');
        this.tickerInput = document.getElementById('ticker');
        this.quantityInput = document.getElementById('quantity');
        this.purchaseDateInput = document.getElementById('purchase-date');
        this.purchasePriceInput = document.getElementById('purchase-price');

        // Validate essential elements exist
        if (!this.stockForm || !this.tickerInput || !this.quantityInput ||
            !this.purchaseDateInput || !this.purchasePriceInput) {
            console.error('Required form elements not found in the DOM');
            this.showNotification('Application error: UI elements missing', 'error');
            return;
        }

        // Create autocomplete container
        this.tickerAutocomplete = document.createElement('div');
        this.tickerAutocomplete.className = 'autocomplete-container';
        this.tickerInput.parentNode.appendChild(this.tickerAutocomplete);

        this.portfolioListElement = document.createElement('div');
        this.portfolioListElement.className = 'portfolio-list';
        document.querySelector('.portfolio-input').appendChild(this.portfolioListElement);

        this.timeframeSelector = document.createElement('div');
        this.timeframeSelector.className = 'timeframe-selector';
        this.timeframeSelector.innerHTML = `
      <div class="btn-group">
        <button class="btn btn-sm active" data-timeframe="1w">1W</button>
        <button class="btn btn-sm" data-timeframe="1m">1M</button>
        <button class="btn btn-sm" data-timeframe="3m">3M</button>
        <button class="btn btn-sm" data-timeframe="1y">1Y</button>
      </div>
    `;
        document.querySelector('.visualization h2').after(this.timeframeSelector);

        this.stockDetails = document.createElement('div');
        this.stockDetails.className = 'stock-details';
        document.querySelector('.visualization').appendChild(this.stockDetails);

        this.portfolioSelector = document.createElement('div');
        this.portfolioSelector.className = 'portfolio-selector';
        document.querySelector('.visualization h2').after(this.portfolioSelector);

        // Create login modal
        this.loginModal = document.createElement('div');
        this.loginModal.className = 'modal';
        this.loginModal.innerHTML = `
      <div class="modal-content">
        <span class="close">&times;</span>
        <div class="tabs">
          <button class="tab active" data-tab="login">Login</button>
          <button class="tab" data-tab="register">Register</button>
        </div>
        <div class="tab-content" id="login-tab">
          <h2>Login</h2>
          <form id="login-form">
            <div class="form-group">
              <label for="login-email">Email</label>
              <input type="email" id="login-email" required>
            </div>
            <div class="form-group">
              <label for="login-password">Password</label>
              <input type="password" id="login-password" required>
            </div>
            <button type="submit" class="btn">Login</button>
          </form>
        </div>
        <div class="tab-content hidden" id="register-tab">
          <h2>Register</h2>
          <form id="register-form">
            <div class="form-group">
              <label for="register-name">Name</label>
              <input type="text" id="register-name" required>
            </div>
            <div class="form-group">
              <label for="register-email">Email</label>
              <input type="email" id="register-email" required>
            </div>
            <div class="form-group">
              <label for="register-password">Password</label>
              <input type="password" id="register-password" required>
            </div>
            <button type="submit" class="btn">Register</button>
          </form>
        </div>
      </div>
    `;
        document.body.appendChild(this.loginModal);

        // Set up login button
        const loginButton = document.getElementById('login-button');
        if (loginButton) {
            loginButton.addEventListener('click', () => this.toggleLoginModal(true));
        }

        // Set up modal close button
        const closeButton = this.loginModal.querySelector('.close');
        if (closeButton) {
            closeButton.addEventListener('click', () => this.toggleLoginModal(false));
        }
    }

    // Add event listeners
    addEventListeners() {
        if (this.tickerInput) {
            this.tickerInput.addEventListener('input', this.handleTickerInput.bind(this));
        }

        if (this.stockForm) {
            this.stockForm.addEventListener('submit', this.handleStockFormSubmit.bind(this));
        }

        if (this.timeframeSelector) {
            this.timeframeSelector.addEventListener('click', this.handleTimeframeClick.bind(this));
        }

        // Add tab switching in modal
        const tabs = this.loginModal.querySelectorAll('.tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                // Remove active class from all tabs
                tabs.forEach(t => t.classList.remove('active'));

                // Add active class to clicked tab
                tab.classList.add('active');

                // Hide all tab content
                this.loginModal.querySelectorAll('.tab-content').forEach(content => {
                    content.classList.add('hidden');
                });

                // Show the selected tab content
                const tabContentId = tab.dataset.tab + '-tab';
                const tabContent = document.getElementById(tabContentId);
                if (tabContent) {
                    tabContent.classList.remove('hidden');
                }
            });
        });

        // Add form submission handlers
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', this.handleLogin.bind(this));
        }

        const registerForm = document.getElementById('register-form');
        if (registerForm) {
            registerForm.addEventListener('submit', this.handleRegister.bind(this));
        }

        // Add keyboard navigation for autocomplete
        if (this.tickerInput) {
            this.tickerInput.addEventListener('keydown', (e) => {
                const items = this.tickerAutocomplete.querySelectorAll('.autocomplete-item:not(.no-results):not(.loading):not(.error)');
                const isVisible = this.tickerAutocomplete.style.display === 'block';

                if (!isVisible || items.length === 0) return;

                let activeIndex = Array.from(items).findIndex(item => item.classList.contains('active'));

                // Handle arrow down
                if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    activeIndex = (activeIndex + 1) % items.length;
                    this.highlightAutocompleteItem(items, activeIndex);
                }

                // Handle arrow up
                else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    activeIndex = activeIndex <= 0 ? items.length - 1 : activeIndex - 1;
                    this.highlightAutocompleteItem(items, activeIndex);
                }

                // Handle Enter/Tab to select
                else if ((e.key === 'Enter' || e.key === 'Tab') && activeIndex >= 0) {
                    e.preventDefault();
                    items[activeIndex].click();
                }

                // Handle Escape to close
                else if (e.key === 'Escape') {
                    this.tickerAutocomplete.innerHTML = '';
                    this.tickerAutocomplete.style.display = 'none';
                }
            });
        }
    }

    // Add new helper method
    highlightAutocompleteItem(items, activeIndex) {
        items.forEach(item => item.classList.remove('active'));
        items[activeIndex].classList.add('active');
        items[activeIndex].scrollIntoView({ block: 'nearest' });
    }

    // Update UI with initial data
    updateUI() {
        this.updatePortfolioList();
        this.updatePortfolioStats();
        this.updatePortfolioSelector();
        this.renderVisualization();
    }

    // Toggle login modal
    toggleLoginModal(show) {
        if (show) {
            this.loginModal.classList.add('show');
        } else {
            this.loginModal.classList.remove('show');
        }
    }

    // Handle ticker input for autocomplete with debouncing
    async handleTickerInput(e) {
        const query = e.target.value.trim();

        // Clear previous timer
        clearTimeout(this.searchDebounceTimer);

        if (query.length < 1) {
            this.tickerAutocomplete.innerHTML = '';
            this.tickerAutocomplete.style.display = 'none';
            return;
        }

        // Add "Searching..." indicator
        this.tickerAutocomplete.innerHTML = '<div class="autocomplete-item loading">Searching...</div>';
        this.tickerAutocomplete.style.display = 'block';

        // Debounce the search
        this.searchDebounceTimer = setTimeout(async () => {
            try {
                const results = await this.stockAPI.searchStocks(query);

                if (results.length === 0) {
                    this.tickerAutocomplete.innerHTML = '<div class="autocomplete-item no-results">No results found</div>';
                } else {
                    this.tickerAutocomplete.innerHTML = results.map(stock =>
                        `<div class="autocomplete-item" data-symbol="${stock.symbol}" data-name="${stock.name}" data-sector="${stock.sector}">
                            <div class="symbol">${stock.symbol}</div>
                            <div class="name">${stock.name}</div>
                        </div>`
                    ).join('');

                    // Add click handlers to autocomplete items
                    this.tickerAutocomplete.querySelectorAll('.autocomplete-item').forEach(item => {
                        item.addEventListener('click', this.handleAutocompleteSelect.bind(this));
                    });
                }
            } catch (error) {
                this.tickerAutocomplete.innerHTML = `<div class="autocomplete-item error">Error: ${error.message}</div>`;
                console.error('Error searching stocks:', error);
            }
        }, this.searchDebounceDelay);
    }

    // Handle autocomplete selection
    handleAutocompleteSelect(e) {
        const item = e.currentTarget;
        const symbol = item.dataset.symbol;
        const name = item.dataset.name;
        const sector = item.dataset.sector;

        this.tickerInput.value = symbol;
        this.tickerInput.dataset.name = name;
        this.tickerInput.dataset.sector = sector;

        // Hide autocomplete
        this.tickerAutocomplete.innerHTML = '';
        this.tickerAutocomplete.style.display = 'none';

        // Get current price for the selected stock
        this.stockAPI.getCurrentPrice(symbol).then(data => {
            this.purchasePriceInput.value = data.price;
        });
    }

    // Improved stock form submission with better validation
    async handleStockFormSubmit(e) {
        e.preventDefault();

        const symbol = this.tickerInput.value.trim().toUpperCase();
        const name = this.tickerInput.dataset.name || 'Unknown Company';
        const sector = this.tickerInput.dataset.sector || 'Other';
        const quantity = parseFloat(this.quantityInput.value);
        const purchaseDate = this.purchaseDateInput.value;
        const purchasePrice = parseFloat(this.purchasePriceInput.value);

        // Enhanced validation
        if (!symbol) {
            this.showNotification('Please enter a stock symbol', 'error');
            this.tickerInput.focus();
            return;
        }
        if (!quantity || isNaN(quantity) || quantity <= 0) {
            this.showNotification('Please enter a valid quantity (greater than 0)', 'error');
            this.quantityInput.focus();
            return;
        }
        if (!purchaseDate) {
            this.showNotification('Please select a purchase date', 'error');
            this.purchaseDateInput.focus();
            return;
        }
        if (!purchasePrice || isNaN(purchasePrice) || purchasePrice <= 0) {
            this.showNotification('Please enter a valid purchase price (greater than 0)', 'error');
            this.purchasePriceInput.focus();
            return;
        }

        try {
            // Get color for the stock
            const color = this.stockAPI.getStockColor(symbol);

            // Add stock to portfolio
            this.portfolioService.addStock({
                symbol,
                name,
                quantity,
                purchaseDate,
                purchasePrice,
                color,
                sector
            });

            // Update UI
            this.showNotification(`Added ${symbol} to portfolio`);
            this.updatePortfolioList();
            this.updatePortfolioStats();
            this.renderVisualization();

            // Reset form
            this.stockForm.reset();
            this.tickerInput.dataset.name = '';
            this.tickerInput.dataset.sector = '';
        } catch (error) {
            this.showNotification(`Error adding stock: ${error.message}`, 'error');
        }
    }

    // Handle timeframe click
    handleTimeframeClick(e) {
        if (!e.target.matches('button')) return;

        const timeframe = e.target.dataset.timeframe;

        // Update active button
        this.timeframeSelector.querySelectorAll('button').forEach(btn => {
            btn.classList.remove('active');
        });
        e.target.classList.add('active');

        // Update timeframe and re-render
        this.currentTimeframe = timeframe;
        this.renderVisualization();
    }

    // Handle login
    async handleLogin(e) {
        e.preventDefault();

        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;

        try {
            await this.authService.login(email, password);
            this.showNotification('Login successful');
            this.toggleLoginModal(false);
            this.updateUI();
        } catch (error) {
            this.showNotification(error.message, 'error');
        }
    }

    // Handle register
    async handleRegister(e) {
        e.preventDefault();

        const name = document.getElementById('register-name').value;
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;

        try {
            await this.authService.register({ name, email, password });
            this.showNotification('Registration successful');
            this.toggleLoginModal(false);
            this.updateUI();
        } catch (error) {
            this.showNotification(error.message, 'error');
        }
    }

    // Update portfolio list
    updatePortfolioList() {
        const portfolio = this.portfolioService.getActivePortfolio();

        if (!portfolio || portfolio.stocks.length === 0) {
            this.portfolioListElement.innerHTML = '<div class="empty-state">No stocks in portfolio yet</div>';
            return;
        }

        this.portfolioListElement.innerHTML = `
      <h3>Portfolio Holdings</h3>
      <div class="stock-list">
        ${portfolio.stocks.map(stock => `
          <div class="stock-item" data-id="${stock.id}">
            <div class="stock-color" style="background-color: ${stock.color}"></div>
            <div class="stock-info">
              <div class="stock-symbol">${stock.symbol}</div>
              <div class="stock-details">${stock.quantity} shares @ $${stock.purchasePrice}</div>
            </div>
            <button class="remove-stock" data-id="${stock.id}">&times;</button>
          </div>
        `).join('')}
      </div>
    `;

        // Add event listeners for stock list items
        this.portfolioListElement.querySelectorAll('.stock-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (!e.target.matches('.remove-stock')) {
                    this.handleStockSelect(item.dataset.id);
                }
            });
        });

        // Add event listeners for remove buttons
        this.portfolioListElement.querySelectorAll('.remove-stock').forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                this.handleStockRemove(button.dataset.id);
            });
        });
    }

    // Update portfolio stats
    updatePortfolioStats() {
        const portfolio = this.portfolioService.getActivePortfolio();
        const statsContainer = document.querySelector('.portfolio-stats');

        if (!portfolio || portfolio.stocks.length === 0) {
            statsContainer.innerHTML = `
        <div class="stat-card">
          <h3>Total Value</h3>
          <p>$0.00</p>
        </div>
        <div class="stat-card">
          <h3>Total Return</h3>
          <p>0.00%</p>
        </div>
        <div class="stat-card">
          <h3>Number of Stocks</h3>
          <p>0</p>
        </div>
        <div class="stat-card">
          <h3>Diversification</h3>
          <p>N/A</p>
        </div>
      `;
            return;
        }

        // Calculate portfolio stats
        let totalValue = 0;
        let totalCost = 0;
        let bestPerformer = null;
        let bestReturn = -Infinity;
        let sectors = {};

        // Simulate current prices
        for (const stock of portfolio.stocks) {
            const currentPrice = stock.purchasePrice * (1 + (Math.random() * 0.3 - 0.1));
            const stockValue = currentPrice * stock.quantity;
            const stockCost = stock.purchasePrice * stock.quantity;
            const stockReturn = ((currentPrice / stock.purchasePrice) - 1) * 100;

            totalValue += stockValue;
            totalCost += stockCost;

            if (stockReturn > bestReturn) {
                bestReturn = stockReturn;
                bestPerformer = {
                    symbol: stock.symbol,
                    return: stockReturn
                };
            }

            sectors[stock.sector] = (sectors[stock.sector] || 0) + stockValue;
        }

        const totalReturn = ((totalValue / totalCost) - 1) * 100;
        const numSectors = Object.keys(sectors).length;

        // Update stats UI
        statsContainer.innerHTML = `
      <div class="stat-card">
        <h3>Total Value</h3>
        <p>$${totalValue.toLocaleString(undefined, { maximumFractionDigits: 2, minimumFractionDigits: 2 })}</p>
      </div>
      <div class="stat-card ${totalReturn >= 0 ? 'positive' : 'negative'}">
        <h3>Total Return</h3>
        <p>${totalReturn >= 0 ? '+' : ''}${totalReturn.toFixed(2)}%</p>
      </div>
      <div class="stat-card">
        <h3>Number of Stocks</h3>
        <p>${portfolio.stocks.length}</p>
      </div>
      <div class="stat-card">
        <h3>Best Performer</h3>
        <p>${bestPerformer ? `${bestPerformer.symbol} ${bestPerformer.return >= 0 ? '+' : ''}${bestPerformer.return.toFixed(2)}%` : 'N/A'}</p>
      </div>
    `;
    }

    // Update portfolio selector
    updatePortfolioSelector() {
        const portfolios = this.portfolioService.getAllPortfolios();
        const activePortfolio = this.portfolioService.getActivePortfolio();

        if (!activePortfolio) return;

        this.portfolioSelector.innerHTML = `
      <div class="portfolio-dropdown">
        <span class="current-portfolio">${activePortfolio.name}</span>
        <div class="dropdown-content">
          ${portfolios.map(p => `
            <div class="dropdown-item ${p.id === activePortfolio.id ? 'active' : ''}" data-id="${p.id}">
              ${p.name}
            </div>
          `).join('')}
          <div class="dropdown-item new-portfolio">+ New Portfolio</div>
        </div>
      </div>
    `;

        // Add event listeners
        this.portfolioSelector.querySelector('.current-portfolio').addEventListener('click', () => {
            this.portfolioSelector.querySelector('.dropdown-content').classList.toggle('show');
        });

        this.portfolioSelector.querySelectorAll('.dropdown-item').forEach(item => {
            item.addEventListener('click', () => {
                if (item.classList.contains('new-portfolio')) {
                    this.handleCreatePortfolio();
                } else {
                    this.portfolioService.setActivePortfolio(item.dataset.id);
                    this.updatePortfolioList();
                    this.updatePortfolioStats();
                    this.renderVisualization();
                    this.updatePortfolioSelector();
                }

                this.portfolioSelector.querySelector('.dropdown-content').classList.remove('show');
            });
        });
    }

    // Handle stock selection
    handleStockSelect(stockId) {
        const portfolio = this.portfolioService.getActivePortfolio();
        this.selectedStock = portfolio.stocks.find(stock => stock.id === stockId);

        if (!this.selectedStock) return;

        // Update UI to show selected stock
        this.portfolioListElement.querySelectorAll('.stock-item').forEach(item => {
            if (item.dataset.id === stockId) {
                item.classList.add('selected');
            } else {
                item.classList.remove('selected');
            }
        });

        // Fetch stock details and show in details panel
        this.stockAPI.getCompanyDetails(this.selectedStock.symbol)
            .then(details => {
                this.stockDetails.innerHTML = `
          <div class="stock-details-header">
            <div class="stock-details-title">
              <div class="stock-details-symbol">${details.symbol}</div>
              <div class="stock-details-name">${details.name}</div>
            </div>
            <div>
              <span class="stock-details-price">$${(details.price || this.selectedStock.purchasePrice).toFixed(2)}</span>
              <span class="stock-details-change ${details.change >= 0 ? 'positive' : 'negative'}">
                ${details.change >= 0 ? '+' : ''}${details.change}%
              </span>
            </div>
          </div>
          <div class="stock-details-info">
            <div class="stock-details-item">
              <div class="stock-details-item-label">Shares</div>
              <div class="stock-details-item-value">${this.selectedStock.quantity}</div>
            </div>
            <div class="stock-details-item">
              <div class="stock-details-item-label">Cost Basis</div>
              <div class="stock-details-item-value">$${this.selectedStock.purchasePrice}</div>
            </div>
            <div class="stock-details-item">
              <div class="stock-details-item-label">Total Cost</div>
              <div class="stock-details-item-value">$${(this.selectedStock.purchasePrice * this.selectedStock.quantity).toFixed(2)}</div>
            </div>
            <div class="stock-details-item">
              <div class="stock-details-item-label">Market Cap</div>
              <div class="stock-details-item-value">${details.marketCap}</div>
            </div>
            <div class="stock-details-item">
              <div class="stock-details-item-label">Sector</div>
              <div class="stock-details-item-value">${details.sector}</div>
            </div>
            <div class="stock-details-item">
              <div class="stock-details-item-label">P/E Ratio</div>
              <div class="stock-details-item-value">${details.peRatio}</div>
            </div>
            <div class="stock-details-item">
              <div class="stock-details-item-label">Div Yield</div>
              <div class="stock-details-item-value">${details.dividendYield}%</div>
            </div>
            <div class="stock-details-item">
              <div class="stock-details-item-label">Purchase Date</div>
              <div class="stock-details-item-value">${new Date(this.selectedStock.purchaseDate).toLocaleDateString()}</div>
            </div>
          </div>
        `;

                this.stockDetails.style.display = 'block';
            })
            .catch(error => {
                console.error('Error fetching stock details:', error);
            });
    }

    // Handle stock removal
    handleStockRemove(stockId) {
        if (confirm('Are you sure you want to remove this stock from your portfolio?')) {
            this.portfolioService.removeStock(stockId);

            if (this.selectedStock && this.selectedStock.id === stockId) {
                this.selectedStock = null;
                this.stockDetails.style.display = 'none';
            }

            this.updatePortfolioList();
            this.updatePortfolioStats();
            this.renderVisualization();
        }
    }

    // Handle portfolio creation
    handleCreatePortfolio() {
        const name = prompt('Enter a name for your new portfolio:');

        if (name) {
            this.portfolioService.createPortfolio(name);
            this.updatePortfolioList();
            this.updatePortfolioStats();
            this.updatePortfolioSelector();
            this.renderVisualization();
        }
    }

    // Improved notification system
    showNotification(message, type = 'success') {
        // Create notification container if it doesn't exist
        let container = document.querySelector('.notification-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'notification-container';
            document.body.appendChild(container);
        }

        // Limit number of notifications
        const existingNotifications = container.querySelectorAll('.notification');
        if (existingNotifications.length >= 3) {
            container.removeChild(existingNotifications[0]);
        }

        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;

        const closeBtn = document.createElement('button');
        closeBtn.className = 'notification-close';
        closeBtn.innerHTML = '&times;';
        closeBtn.setAttribute('aria-label', 'Close notification');
        closeBtn.addEventListener('click', () => {
            notification.remove();
        });

        notification.appendChild(closeBtn);
        container.appendChild(notification);

        setTimeout(() => {
            notification.classList.add('show');
        }, 10);

        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 5000);
    }

    // Generate mock portfolio data
    async generateMockPortfolioData() {
        const portfolio = this.portfolioService.getActivePortfolio();

        if (!portfolio || portfolio.stocks.length === 0) {
            return [];
        }

        const timeframeMap = {
            '1w': 7,
            '1m': 30,
            '3m': 90,
            '1y': 365
        };

        const numDays = timeframeMap[this.currentTimeframe] || 30;
        const mockData = [];

        // Generate dates
        for (let i = 0; i < numDays; i++) {
            const date = new Date();
            date.setDate(date.getDate() - (numDays - 1 - i));
            const dateString = date.toISOString().split('T')[0];

            const stocksForDay = [];

            // Get data for each stock in portfolio from the API
            for (const stock of portfolio.stocks) {
                // Get price from our persistent price system
                const price = this.stockAPI.getStockPriceForDate(
                    stock.symbol,
                    dateString,
                    stock.purchasePrice // Use purchase price as reference for consistency
                );

                stocksForDay.push({
                    symbol: stock.symbol,
                    price: price,
                    shares: stock.quantity,
                    color: stock.color
                });
            }

            mockData.push({
                date,
                stocks: stocksForDay
            });
        }

        return mockData;
    }

    // Fix context issue in p5 sketch and add error handling
    async renderVisualization() {
        try {
            // Generate mock data based on our portfolio
            this.graphData = await this.generateMockPortfolioData();

            if (this.p5Instance) {
                this.p5Instance.remove();
            }

            const canvasPlaceholder = document.querySelector('.canvas-placeholder');
            if (!canvasPlaceholder) {
                console.error('Canvas placeholder not found');
                return;
            }

            // Show loading indicator
            canvasPlaceholder.innerHTML = '<div class="loading-indicator">Loading visualization...</div>';

            // Bind the app context for use in the sketch
            const appContext = this;

            // Setup p5 sketch
            this.sketch = function (p) {
                const padding = 60;
                let transformedData = [];
                let uniqueStocks = [];
                let maxTotalValue = 0;
                let canvasWidth = 0;
                let canvasHeight = 0;
                let tooltip;

                // Theme colors matching app dark theme
                const colors = {
                    background: '#0f172a',      // dark-bg
                    cardBg: '#1e293b',          // dark-card
                    border: '#334155',          // dark-border
                    text: '#e2e8f0',            // dark-text
                    textSecondary: '#94a3b8',   // dark-text-secondary
                    gridLines: '#1f2937',       // subtle grid lines
                    axisLines: '#475569'        // more visible axis lines
                };

                function processGraphData() {
                    transformedData = [];
                    maxTotalValue = 0;
                    let stockSet = new Map();

                    if (!appContext.graphData || appContext.graphData.length === 0) return;

                    // Extract unique stocks
                    appContext.graphData.forEach(dailyData => {
                        dailyData.stocks.forEach(stock => {
                            stockSet.set(stock.symbol, {
                                symbol: stock.symbol,
                                color: stock.color
                            });
                        });
                    });

                    uniqueStocks = Array.from(stockSet.values());

                    // Transform data for stacked area chart
                    appContext.graphData.forEach(dailyData => {
                        const dateObj = dailyData.date;
                        const stockValues = {};
                        let dailyTotal = 0;

                        // Initialize all stocks with 0 for this day
                        uniqueStocks.forEach(stock => {
                            stockValues[stock.symbol] = 0;
                        });

                        // Fill in actual values for stocks present on this day
                        dailyData.stocks.forEach(stock => {
                            const value = stock.price * stock.shares;
                            stockValues[stock.symbol] = value;
                            dailyTotal += value;
                        });

                        transformedData.push({
                            date: dateObj,
                            total: dailyTotal,
                            stockValues
                        });

                        maxTotalValue = Math.max(maxTotalValue, dailyTotal);
                    });
                }

                p.setup = function () {
                    // Get dimensions from container
                    canvasWidth = canvasPlaceholder.offsetWidth;
                    canvasHeight = 400;

                    // Clear the loading indicator before creating the canvas
                    canvasPlaceholder.innerHTML = '';

                    let canvas = p.createCanvas(canvasWidth, canvasHeight);
                    canvas.parent(canvasPlaceholder);

                    // Create tooltip element
                    tooltip = p.createDiv('');
                    tooltip.addClass('chart-tooltip');
                    tooltip.parent(canvasPlaceholder);
                    tooltip.style('display', 'none');

                    processGraphData();
                    p.frameRate(30);
                };

                p.draw = function () {
                    // Change from white to dark background
                    p.background(colors.background);

                    if (transformedData.length === 0) {
                        drawEmptyState();
                        return;
                    }

                    drawChart();
                    drawAxes();
                    drawLegend();
                    handleTooltip();
                };

                function drawEmptyState() {
                    // Use light text color on dark background
                    p.fill(colors.textSecondary);
                    p.textAlign(p.CENTER, p.CENTER);
                    p.textSize(16);
                    p.text('No portfolio data to display', canvasWidth / 2, canvasHeight / 2);
                    p.textSize(14);
                    p.text('Add stocks to your portfolio to see visualization', canvasWidth / 2, canvasHeight / 2 + 30);
                }

                function drawChart() {
                    const chartWidth = canvasWidth - (padding * 2);
                    const chartHeight = canvasHeight - (padding * 2);
                    const xStep = chartWidth / (transformedData.length - 1);

                    // Draw area for each stock, starting from bottom
                    uniqueStocks.forEach((stock, stockIndex) => {
                        p.beginShape();
                        p.noStroke();

                        // Use the stock's color with 80% opacity
                        const stockColor = p.color(stock.color);
                        stockColor.setAlpha(180);
                        p.fill(stockColor);

                        // Bottom line (starting from right)
                        for (let i = transformedData.length - 1; i >= 0; i--) {
                            const x = padding + (i * xStep);
                            let y = canvasHeight - padding;

                            // Calculate y position based on all stocks below this one
                            let total = 0;
                            for (let j = 0; j <= stockIndex; j++) {
                                const currentStock = uniqueStocks[j];
                                total += transformedData[i].stockValues[currentStock.symbol] || 0;
                            }

                            // Scale the value to fit the chart height
                            const scaledTotal = (total / maxTotalValue) * chartHeight;
                            y = canvasHeight - padding - scaledTotal;

                            p.vertex(x, y);
                        }

                        // Connect to bottom line (starting from left)
                        for (let i = 0; i < transformedData.length; i++) {
                            const x = padding + (i * xStep);
                            let y = canvasHeight - padding;

                            // Calculate y position based on all stocks below this one minus this stock
                            let total = 0;
                            for (let j = 0; j < stockIndex; j++) {
                                const currentStock = uniqueStocks[j];
                                total += transformedData[i].stockValues[currentStock.symbol] || 0;
                            }

                            // Scale the value to fit the chart height
                            const scaledTotal = (total / maxTotalValue) * chartHeight;
                            y = canvasHeight - padding - scaledTotal;

                            p.vertex(x, y);
                        }

                        p.endShape(p.CLOSE);
                    });
                }

                function drawAxes() {
                    const chartWidth = canvasWidth - (padding * 2);
                    const chartHeight = canvasHeight - (padding * 2);

                    // Darker axis lines
                    p.stroke(colors.axisLines);
                    p.strokeWeight(1);

                    // X-axis
                    p.line(padding, canvasHeight - padding, canvasWidth - padding, canvasHeight - padding);

                    // Y-axis
                    p.line(padding, padding, padding, canvasHeight - padding);

                    // Draw X-axis labels (dates)
                    p.fill(colors.textSecondary);
                    p.noStroke();
                    p.textAlign(p.CENTER, p.TOP);
                    p.textSize(10);

                    const numLabels = Math.min(6, transformedData.length);
                    const labelStep = Math.floor(transformedData.length / (numLabels - 1));

                    for (let i = 0; i < transformedData.length; i += labelStep) {
                        if (i < transformedData.length) {
                            const x = padding + (i * (chartWidth / (transformedData.length - 1)));
                            const dateLabel = new Date(transformedData[i].date).toLocaleDateString();
                            p.text(dateLabel, x, canvasHeight - padding + 10);
                        }
                    }

                    // Draw Y-axis labels (values)
                    p.textAlign(p.RIGHT, p.CENTER);
                    const numYLabels = 5;

                    for (let i = 0; i <= numYLabels; i++) {
                        const y = canvasHeight - padding - (i * (chartHeight / numYLabels));
                        const value = (i * (maxTotalValue / numYLabels));
                        p.text('$' + formatCurrency(value), padding - 10, y);

                        // Draw horizontal grid line
                        p.stroke(colors.gridLines);
                        p.line(padding, y, canvasWidth - padding, y);
                    }
                }

                function drawLegend() {
                    const legendX = canvasWidth - padding - 150;
                    const legendY = padding;
                    const legendWidth = 150;
                    const itemHeight = 20;

                    // Dark legend background
                    p.fill(colors.cardBg);
                    p.stroke(colors.border);
                    p.rect(legendX, legendY, legendWidth, (uniqueStocks.length * itemHeight) + 10, 4);

                    // Legend title
                    p.noStroke();
                    p.fill(colors.text);
                    p.textAlign(p.LEFT, p.TOP);
                    p.textSize(11);
                    p.text('Portfolio Stocks', legendX + 10, legendY + 5);

                    // Legend items
                    uniqueStocks.forEach((stock, i) => {
                        const y = legendY + 15 + (i * itemHeight);

                        // Color box
                        p.fill(stock.color);
                        p.noStroke();
                        p.rect(legendX + 10, y, 12, 12, 2);

                        // Symbol text - lighter text color
                        p.fill(colors.text);
                        p.textAlign(p.LEFT, p.CENTER);
                        p.text(stock.symbol, legendX + 30, y + 6);
                    });
                }

                function handleTooltip() {
                    const chartWidth = canvasWidth - (padding * 2);
                    const xStep = chartWidth / (transformedData.length - 1);

                    if (p.mouseX > padding && p.mouseX < canvasWidth - padding &&
                        p.mouseY > padding && p.mouseY < canvasHeight - padding) {

                        // Find closest data point to mouse position
                        const mouseXRelative = p.mouseX - padding;
                        const dataIndex = Math.round(mouseXRelative / xStep);

                        if (dataIndex >= 0 && dataIndex < transformedData.length) {
                            const data = transformedData[dataIndex];
                            const x = padding + (dataIndex * xStep);

                            // Draw vertical line at data point - brighter guide line
                            p.stroke(colors.textSecondary);
                            p.strokeWeight(1);
                            p.line(x, padding, x, canvasHeight - padding);

                            // Show tooltip
                            const tooltipHtml = buildTooltipHtml(data);
                            tooltip.html(tooltipHtml);
                            tooltip.style('display', 'block');

                            // Position tooltip near but not overlapping the cursor
                            let tooltipX = p.mouseX + 20;
                            if (tooltipX + 200 > canvasWidth) {
                                tooltipX = p.mouseX - 220;
                            }

                            tooltip.position(tooltipX, p.mouseY - 100);
                        }
                    } else {
                        tooltip.style('display', 'none');
                    }
                }

                function buildTooltipHtml(data) {
                    const date = new Date(data.date).toLocaleDateString();
                    let html = `
                        <div class="chart-tooltip-header">
                            <span class="chart-tooltip-date">${date}</span>
                            <span class="chart-tooltip-price">$${formatCurrency(data.total)}</span>
                        </div>
                        <div class="chart-tooltip-stocks">
                    `;

                    // Add each stock with its value
                    uniqueStocks.forEach(stock => {
                        const value = data.stockValues[stock.symbol] || 0;
                        if (value > 0) {
                            html += `
                                <div class="chart-tooltip-stock">
                                    <div class="chart-tooltip-color" style="background-color:${stock.color}"></div>
                                    <span>${stock.symbol}: $${formatCurrency(value)}</span>
                                </div>
                            `;
                        }
                    });

                    html += '</div>';
                    return html;
                }

                function formatCurrency(value) {
                    return value.toLocaleString(undefined, {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0
                    });
                }

                // Handle window resize
                p.windowResized = function () {
                    canvasWidth = canvasPlaceholder.offsetWidth;
                    p.resizeCanvas(canvasWidth, canvasHeight);
                    processGraphData();
                };
            };

            this.p5Instance = new p5(this.sketch);
        } catch (error) {
            console.error('Error rendering visualization:', error);
            const canvasPlaceholder = document.querySelector('.canvas-placeholder');
            if (canvasPlaceholder) {
                canvasPlaceholder.innerHTML = `
                    <div class="error-display">
                        <p>Error rendering visualization: ${error.message}</p>
                        <button class="btn btn-sm" id="retry-visualization">Retry</button>
                    </div>
                `;
                document.getElementById('retry-visualization')?.addEventListener('click', () => {
                    this.renderVisualization();
                });
            }
        }
    }
}

export default new StockPortfolioApp();