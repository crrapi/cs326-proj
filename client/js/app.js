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

        // Get form elements
        const symbol = this.tickerInput.value.trim().toUpperCase();
        const name = this.tickerInput.dataset.name || 'Unknown Company';
        const sector = this.tickerInput.dataset.sector || 'Other';
        const quantity = parseFloat(this.quantityInput.value);
        const purchaseDate = this.purchaseDateInput.value;
        const purchasePrice = parseFloat(this.purchasePriceInput.value);

        // Form validation
        let isValid = true;
        let firstInvalidField = null;

        // Ticker validation
        if (!symbol) {
            this.showFieldError(this.tickerInput, 'Please enter a stock symbol');
            isValid = false;
            firstInvalidField = firstInvalidField || this.tickerInput;
        } else {
            this.clearFieldError(this.tickerInput);
        }

        // Quantity validation
        if (!quantity || isNaN(quantity) || quantity <= 0) {
            this.showFieldError(this.quantityInput, 'Please enter a valid quantity greater than 0');
            isValid = false;
            firstInvalidField = firstInvalidField || this.quantityInput;
        } else {
            this.clearFieldError(this.quantityInput);
        }

        // Date validation
        if (!purchaseDate) {
            this.showFieldError(this.purchaseDateInput, 'Please select a purchase date');
            isValid = false;
            firstInvalidField = firstInvalidField || this.purchaseDateInput;
        } else {
            const purchaseDateObj = new Date(purchaseDate);
            const today = new Date();

            if (purchaseDateObj > today) {
                this.showFieldError(this.purchaseDateInput, 'Purchase date cannot be in the future');
                isValid = false;
                firstInvalidField = firstInvalidField || this.purchaseDateInput;
            } else {
                this.clearFieldError(this.purchaseDateInput);
            }
        }

        // Price validation
        if (!purchasePrice || isNaN(purchasePrice) || purchasePrice <= 0) {
            this.showFieldError(this.purchasePriceInput, 'Please enter a valid purchase price greater than 0');
            isValid = false;
            firstInvalidField = firstInvalidField || this.purchasePriceInput;
        } else {
            this.clearFieldError(this.purchasePriceInput);
        }

        // If validation fails, focus the first invalid field and exit
        if (!isValid) {
            if (firstInvalidField) {
                firstInvalidField.focus();
            }
            return;
        }

        try {
            // Show loading state
            const submitButton = this.stockForm.querySelector('button[type="submit"]');
            submitButton.classList.add('loading');
            submitButton.disabled = true;

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

            // Remove loading state
            submitButton.classList.remove('loading');
            submitButton.disabled = false;
        } catch (error) {
            // Handle errors
            this.showNotification(`Error adding stock: ${error.message}`, 'error');

            // Remove loading state
            const submitButton = this.stockForm.querySelector('button[type="submit"]');
            submitButton.classList.remove('loading');
            submitButton.disabled = false;
        }
    }

    // Add helper methods for form validation
    showFieldError(field, message) {
        // Remove any existing error
        this.clearFieldError(field);

        // Add error class to form group
        const formGroup = field.closest('.form-group');
        formGroup.classList.add('has-error');

        // Create and append error message
        const errorElement = document.createElement('div');
        errorElement.className = 'field-error';
        errorElement.textContent = message;
        formGroup.appendChild(errorElement);
    }

    clearFieldError(field) {
        const formGroup = field.closest('.form-group');
        formGroup.classList.remove('has-error');

        const errorElement = formGroup.querySelector('.field-error');
        if (errorElement) {
            errorElement.remove();
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

    // Enhanced portfolio statistics with more meaningful metrics
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
                    <h3>Stocks</h3>
                    <p>0</p>
                </div>
                <div class="stat-card">
                    <h3>Sectors</h3>
                    <p>0</p>
                </div>
            `;
            return;
        }

        // Calculate portfolio stats
        let totalValue = 0;
        let totalCost = 0;
        let bestPerformer = null;
        let worstPerformer = null;
        let bestReturn = -Infinity;
        let worstReturn = Infinity;
        let sectors = {};
        let largestHolding = null;
        let largestHoldingValue = 0;

        // Get current prices (with more realistic simulation)
        const currentPrices = {};
        const today = new Date().toISOString().split('T')[0];

        // Calculate portfolio metrics
        for (const stock of portfolio.stocks) {
            // Get current price from our API service using the more realistic price simulator
            const currentPrice = this.stockAPI.getStockPriceForDate(
                stock.symbol,
                today,
                stock.purchasePrice
            );
            currentPrices[stock.symbol] = currentPrice;

            const stockValue = currentPrice * stock.quantity;
            const stockCost = stock.purchasePrice * stock.quantity;
            const stockReturn = ((currentPrice / stock.purchasePrice) - 1) * 100;

            totalValue += stockValue;
            totalCost += stockCost;

            // Track best and worst performers
            if (stockReturn > bestReturn) {
                bestReturn = stockReturn;
                bestPerformer = {
                    symbol: stock.symbol,
                    return: stockReturn,
                    value: stockValue
                };
            }

            if (stockReturn < worstReturn) {
                worstReturn = stockReturn;
                worstPerformer = {
                    symbol: stock.symbol,
                    return: stockReturn,
                    value: stockValue
                };
            }

            // Track largest holding by value
            if (stockValue > largestHoldingValue) {
                largestHoldingValue = stockValue;
                largestHolding = {
                    symbol: stock.symbol,
                    value: stockValue,
                    percentage: 0 // Will calculate after we know total value
                };
            }

            // Track sector diversification
            sectors[stock.sector] = (sectors[stock.sector] || 0) + stockValue;
        }

        // Calculate overall portfolio metrics
        const totalReturn = ((totalValue / totalCost) - 1) * 100;
        const numSectors = Object.keys(sectors).length;

        // Calculate largest holding percentage
        if (largestHolding) {
            largestHolding.percentage = (largestHoldingValue / totalValue) * 100;
        }

        // Find largest sector
        let largestSector = { name: 'None', value: 0, percentage: 0 };
        for (const [sector, value] of Object.entries(sectors)) {
            if (value > largestSector.value) {
                largestSector = {
                    name: sector,
                    value: value,
                    percentage: (value / totalValue) * 100
                };
            }
        }

        // Calculate daily change
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayString = yesterday.toISOString().split('T')[0];

        let yesterdayValue = 0;
        for (const stock of portfolio.stocks) {
            const yesterdayPrice = this.stockAPI.getStockPriceForDate(
                stock.symbol,
                yesterdayString,
                stock.purchasePrice
            );
            yesterdayValue += yesterdayPrice * stock.quantity;
        }

        const dailyChange = ((totalValue / yesterdayValue) - 1) * 100;
        const dailyChangeValue = totalValue - yesterdayValue;

        // Update stats UI with enhanced metrics
        statsContainer.innerHTML = `
            <div class="stat-card">
                <h3>Total Value</h3>
                <p>$${totalValue.toLocaleString(undefined, { maximumFractionDigits: 2, minimumFractionDigits: 2 })}</p>
                <div class="stat-trend ${dailyChange >= 0 ? 'trend-up' : 'trend-down'}">
                    ${dailyChange >= 0 ? '↑' : '↓'} ${Math.abs(dailyChange).toFixed(2)}% today
                    (${dailyChangeValue >= 0 ? '+' : ''}$${Math.abs(dailyChangeValue).toLocaleString(undefined, { maximumFractionDigits: 2 })})
                </div>
            </div>
            <div class="stat-card ${totalReturn >= 0 ? 'positive' : 'negative'}">
                <h3>Total Return</h3>
                <p>${totalReturn >= 0 ? '+' : ''}${totalReturn.toFixed(2)}%</p>
                <div class="stat-trend">
                    $${(totalValue - totalCost).toLocaleString(undefined, { maximumFractionDigits: 2 })} total
                </div>
            </div>
            <div class="stat-card">
                <h3>Composition</h3>
                <p>${portfolio.stocks.length} <span style="font-size: 1rem">stocks</span></p>
                <div class="stat-trend">
                    ${numSectors} sectors • ${largestSector.name} ${largestSector.percentage.toFixed(1)}%
                </div>
            </div>
            <div class="stat-card">
                <h3>Top Performer</h3>
                <p>${bestPerformer ? bestPerformer.symbol : 'N/A'}</p>
                <div class="stat-trend trend-up">
                    ${bestPerformer ? `+${bestPerformer.return.toFixed(2)}% • $${bestPerformer.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : 'N/A'}
                </div>
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

    // Enhanced stock selection with more detailed stock information
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

        // Show loading state
        this.stockDetails.innerHTML = `
            <div class="loading-indicator">Loading stock details...</div>
        `;
        this.stockDetails.style.display = 'block';

        // Fetch stock details and show in details panel
        this.stockAPI.getCompanyDetails(this.selectedStock.symbol)
            .then(details => {
                // Get current price
                const today = new Date().toISOString().split('T')[0];
                const currentPrice = this.stockAPI.getStockPriceForDate(
                    this.selectedStock.symbol,
                    today,
                    this.selectedStock.purchasePrice
                );

                // Calculate stock metrics
                const totalShares = this.selectedStock.quantity;
                const totalCost = this.selectedStock.purchasePrice * totalShares;
                const currentValue = currentPrice * totalShares;
                const totalReturn = ((currentPrice / this.selectedStock.purchasePrice) - 1) * 100;
                const totalGainLoss = currentValue - totalCost;

                // Get historical performance
                const purchaseDate = new Date(this.selectedStock.purchaseDate);
                const daysHeld = Math.floor((new Date() - purchaseDate) / (1000 * 60 * 60 * 24));

                this.stockDetails.innerHTML = `
                    <div class="stock-details-header">
                        <div class="stock-details-title">
                            <div class="stock-color" style="background-color: ${this.selectedStock.color}"></div>
                            <div>
                                <div class="stock-details-symbol">${details.symbol}</div>
                                <div class="stock-details-name">${details.name}</div>
                            </div>
                        </div>
                        <div class="stock-details-price-container">
                            <div class="stock-details-price">$${currentPrice.toFixed(2)}</div>
                            <div class="stock-details-change ${details.change >= 0 ? 'positive' : 'negative'}">
                                ${details.change >= 0 ? '+' : ''}${details.change}%
                            </div>
                        </div>
                    </div>
                    
                    <div class="stock-details-section">
                        <h4>Your Position</h4>
                        <div class="stock-details-info">
                            <div class="stock-details-item">
                                <div class="stock-details-item-label">Shares</div>
                                <div class="stock-details-item-value">${totalShares.toLocaleString()}</div>
                            </div>
                            <div class="stock-details-item">
                                <div class="stock-details-item-label">Cost Basis</div>
                                <div class="stock-details-item-value">$${this.selectedStock.purchasePrice.toFixed(2)}</div>
                            </div>
                            <div class="stock-details-item">
                                <div class="stock-details-item-label">Current Value</div>
                                <div class="stock-details-item-value">$${currentValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
                            </div>
                            <div class="stock-details-item">
                                <div class="stock-details-item-label">Total Cost</div>
                                <div class="stock-details-item-value">$${totalCost.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
                            </div>
                            <div class="stock-details-item ${totalReturn >= 0 ? 'positive' : 'negative'}">
                                <div class="stock-details-item-label">Total Return</div>
                                <div class="stock-details-item-value">
                                    ${totalReturn >= 0 ? '+' : ''}${totalReturn.toFixed(2)}%
                                </div>
                            </div>
                            <div class="stock-details-item ${totalGainLoss >= 0 ? 'positive' : 'negative'}">
                                <div class="stock-details-item-label">Gain/Loss</div>
                                <div class="stock-details-item-value">
                                    ${totalGainLoss >= 0 ? '+' : ''}$${Math.abs(totalGainLoss).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                </div>
                            </div>
                            <div class="stock-details-item">
                                <div class="stock-details-item-label">Days Held</div>
                                <div class="stock-details-item-value">${daysHeld}</div>
                            </div>
                            <div class="stock-details-item">
                                <div class="stock-details-item-label">Purchase Date</div>
                                <div class="stock-details-item-value">${new Date(this.selectedStock.purchaseDate).toLocaleDateString()}</div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="stock-details-section">
                        <h4>Company Details</h4>
                        <div class="stock-details-info">
                            <div class="stock-details-item">
                                <div class="stock-details-item-label">Sector</div>
                                <div class="stock-details-item-value sector-tag">${details.sector}</div>
                            </div>
                            <div class="stock-details-item">
                                <div class="stock-details-item-label">Market Cap</div>
                                <div class="stock-details-item-value">${details.marketCap}</div>
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
                                <div class="stock-details-item-label">52-Week High</div>
                                <div class="stock-details-item-value">$${details.fiftyTwoWeekHigh}</div>
                            </div>
                            <div class="stock-details-item">
                                <div class="stock-details-item-label">52-Week Low</div>
                                <div class="stock-details-item-value">$${details.fiftyTwoWeekLow}</div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="stock-details-actions">
                        <button class="btn btn-primary btn-sm" id="edit-stock">Edit Position</button>
                        <button class="btn btn-danger btn-sm" id="remove-stock" data-id="${this.selectedStock.id}">Remove from Portfolio</button>
                    </div>
                `;

                // Add event listeners for the action buttons
                const removeButton = this.stockDetails.querySelector('#remove-stock');
                if (removeButton) {
                    removeButton.addEventListener('click', (e) => {
                        this.handleStockRemove(e.target.dataset.id);
                    });
                }

                const editButton = this.stockDetails.querySelector('#edit-stock');
                if (editButton) {
                    editButton.addEventListener('click', () => {
                        this.handleEditStock(this.selectedStock.id);
                    });
                }
            })
            .catch(error => {
                console.error('Error fetching stock details:', error);
                this.stockDetails.innerHTML = `
                    <div class="error-display">
                        <p>Error loading stock details: ${error.message}</p>
                        <button class="btn btn-sm" id="retry-details">Retry</button>
                    </div>
                `;

                document.getElementById('retry-details')?.addEventListener('click', () => {
                    this.handleStockSelect(stockId);
                });
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
                let hoveredStock = null;
                let animationProgress = 0;

                // Enhanced animation timing
                const animationDuration = 30; // frames

                // Enhanced theme colors with better contrast
                const colors = {
                    background: '#0f172a',      // dark-bg
                    cardBg: '#1e293b',          // dark-card
                    border: '#334155',          // dark-border
                    text: '#e2e8f0',            // dark-text
                    textSecondary: '#94a3b8',   // dark-text-secondary
                    gridLines: '#1f2937',       // subtle grid lines
                    axisLines: '#475569',       // more visible axis lines
                    highlight: '#60a5fa'        // highlight color
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

                    // Add 10% padding to max value for better visualization
                    maxTotalValue *= 1.1;
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
                    p.frameRate(60); // Higher framerate for smoother animations
                };

                p.draw = function () {
                    // Change from white to dark background
                    p.background(colors.background);

                    if (transformedData.length === 0) {
                        drawEmptyState();
                        return;
                    }

                    // Update animation progress for enter animation
                    if (animationProgress < animationDuration) {
                        animationProgress++;
                    }

                    const animationFactor = p.ease(animationProgress / animationDuration);

                    drawChart(animationFactor);
                    drawAxes();
                    drawLegend();
                    handleTooltip();
                };

                // Add easing function for smoother animations
                p.ease = function (t) {
                    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
                };

                function drawEmptyState() {
                    // More engaging empty state with icon
                    p.fill(colors.textSecondary);
                    p.textAlign(p.CENTER, p.CENTER);
                    p.textSize(16);
                    p.text('No portfolio data to display', canvasWidth / 2, canvasHeight / 2 - 15);

                    p.textSize(14);
                    p.text('Add stocks to your portfolio to see visualization', canvasWidth / 2, canvasHeight / 2 + 15);

                    // Draw simple chart icon
                    p.stroke(colors.textSecondary);
                    p.strokeWeight(2);
                    const iconSize = 40;
                    const iconX = canvasWidth / 2 - iconSize / 2;
                    const iconY = canvasHeight / 2 - 60;

                    // Draw chart bars
                    p.line(iconX, iconY + iconSize, iconX + iconSize, iconY + iconSize);
                    p.line(iconX, iconY, iconX, iconY + iconSize);

                    p.line(iconX + 10, iconY + 30, iconX + 15, iconY + 20);
                    p.line(iconX + 15, iconY + 20, iconX + 25, iconY + 35);
                    p.line(iconX + 25, iconY + 35, iconX + 30, iconY + 25);
                    p.line(iconX + 30, iconY + 25, iconX + 40, iconY + 10);
                }

                function drawChart(animationFactor) {
                    const chartWidth = canvasWidth - (padding * 2);
                    const chartHeight = canvasHeight - (padding * 2);
                    const xStep = chartWidth / (transformedData.length - 1);

                    // Draw areas for each stock, starting from bottom
                    uniqueStocks.forEach((stock, stockIndex) => {
                        p.beginShape();
                        p.noStroke();

                        // Use the stock's color with controlled opacity
                        let stockColor = p.color(stock.color);

                        // Handle hover highlight
                        if (hoveredStock === stock.symbol) {
                            stockColor = p.color(colors.highlight);
                            p.strokeWeight(2);
                            p.stroke(colors.highlight);
                        } else {
                            stockColor.setAlpha(180);
                            p.noStroke();
                        }

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

                            // Scale the value to fit the chart height and animate
                            const scaledTotal = (total / maxTotalValue) * chartHeight * animationFactor;
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

                            // Scale the value to fit the chart height and animate
                            const scaledTotal = (total / maxTotalValue) * chartHeight * animationFactor;
                            y = canvasHeight - padding - scaledTotal;

                            p.vertex(x, y);
                        }

                        p.endShape(p.CLOSE);

                        // Draw boundary line at top of each area for better distinction
                        p.beginShape();
                        p.noFill();
                        p.stroke(p.color(stock.color));
                        p.strokeWeight(1.5);

                        for (let i = 0; i < transformedData.length; i++) {
                            const x = padding + (i * xStep);
                            let yTop = canvasHeight - padding;

                            // Calculate positions with all stocks up to this one
                            let totalTop = 0;
                            for (let j = 0; j <= stockIndex; j++) {
                                const currentStock = uniqueStocks[j];
                                totalTop += transformedData[i].stockValues[currentStock.symbol] || 0;
                            }

                            const scaledTotalTop = (totalTop / maxTotalValue) * chartHeight * animationFactor;
                            yTop = canvasHeight - padding - scaledTotalTop;

                            p.vertex(x, yTop);
                        }

                        p.endShape();
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

                    // More intelligent date label formatting based on timeframe
                    const timeframe = appContext.currentTimeframe;
                    let dateFormat;
                    let numLabels;

                    if (timeframe === '1w') {
                        dateFormat = 'short'; // e.g., "Mon"
                        numLabels = 7;
                    } else if (timeframe === '1m') {
                        dateFormat = 'short'; // e.g., "Mar 15"
                        numLabels = 6;
                    } else if (timeframe === '3m') {
                        dateFormat = 'short'; // e.g., "Mar 15"
                        numLabels = 6;
                    } else if (timeframe === '1y') {
                        dateFormat = 'long'; // e.g., "March"
                        numLabels = 6;
                    } else {
                        dateFormat = 'short';
                        numLabels = 6;
                    }

                    numLabels = Math.min(numLabels, transformedData.length);
                    const labelStep = Math.floor(transformedData.length / (numLabels - 1)) || 1;

                    for (let i = 0; i < transformedData.length; i += labelStep) {
                        if (i < transformedData.length) {
                            const x = padding + (i * (chartWidth / (transformedData.length - 1)));
                            const date = new Date(transformedData[i].date);

                            let dateLabel;
                            if (dateFormat === 'short' && timeframe === '1w') {
                                // For weekly view, show day names
                                dateLabel = date.toLocaleDateString('en-US', { weekday: 'short' });
                            } else if (dateFormat === 'short') {
                                // For monthly view, show short date
                                dateLabel = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                            } else {
                                // For yearly view, show month names
                                dateLabel = date.toLocaleDateString('en-US', { month: 'short' });
                            }

                            p.text(dateLabel, x, canvasHeight - padding + 10);
                        }
                    }

                    // Draw Y-axis labels (values) with smart formatting
                    p.textAlign(p.RIGHT, p.CENTER);
                    const numYLabels = 5;

                    for (let i = 0; i <= numYLabels; i++) {
                        const y = canvasHeight - padding - (i * (chartHeight / numYLabels));
                        const value = (i * (maxTotalValue / numYLabels));

                        // Smart formatting for large numbers
                        let formattedValue;
                        if (value >= 1000000) {
                            formattedValue = '$' + (value / 1000000).toFixed(1) + 'M';
                        } else if (value >= 1000) {
                            formattedValue = '$' + (value / 1000).toFixed(1) + 'K';
                        } else {
                            formattedValue = '$' + formatCurrency(value);
                        }

                        p.text(formattedValue, padding - 10, y);

                        // Draw horizontal grid line
                        p.stroke(colors.gridLines);
                        p.line(padding, y, canvasWidth - padding, y);
                    }
                }

                function drawLegend() {
                    const legendX = canvasWidth - padding - 150;
                    const legendY = padding;
                    const legendWidth = 150;
                    const itemHeight = 22; // Slightly increased for better spacing

                    // Better looking legend background with rounded corners
                    p.fill(colors.cardBg);
                    p.stroke(colors.border);
                    p.rect(legendX, legendY, legendWidth, (uniqueStocks.length * itemHeight) + 30, 6);

                    // Legend title with better styling
                    p.noStroke();
                    p.fill(colors.text);
                    p.textAlign(p.LEFT, p.TOP);
                    p.textSize(12);
                    p.text('Portfolio Composition', legendX + 10, legendY + 10);

                    // Draw divider
                    p.stroke(colors.border);
                    p.line(legendX + 10, legendY + 25, legendX + legendWidth - 10, legendY + 25);

                    // Legend items with improved interaction
                    uniqueStocks.forEach((stock, i) => {
                        const y = legendY + 35 + (i * itemHeight);

                        // Check if mouse is over this legend item
                        const isHovered =
                            p.mouseX >= legendX + 10 &&
                            p.mouseX <= legendX + legendWidth - 10 &&
                            p.mouseY >= y &&
                            p.mouseY <= y + 15;

                        if (isHovered) {
                            // Highlight background of hovered item
                            p.noStroke();
                            p.fill(colors.gridLines);
                            p.rect(legendX + 5, y - 3, legendWidth - 10, itemHeight, 3);

                            // Update hovered stock state
                            hoveredStock = stock.symbol;
                        }

                        // Color box with better styling
                        p.fill(stock.color);
                        p.stroke(255, 50);
                        p.rect(legendX + 10, y, 14, 14, 3);

                        // Symbol text - with better styling
                        p.noStroke();
                        p.fill(isHovered ? colors.highlight : colors.text);
                        p.textAlign(p.LEFT, p.CENTER);
                        p.textSize(12);
                        p.text(stock.symbol, legendX + 32, y + 7);

                        // If not hovering on any legend item, clear hover state
                        if (!isHovered && hoveredStock === stock.symbol) {
                            hoveredStock = null;
                        }
                    });
                }

                function handleTooltip() {
                    const chartWidth = canvasWidth - (padding * 2);
                    const xStep = chartWidth / (transformedData.length - 1);
                    let showTooltip = false;

                    if (p.mouseX > padding && p.mouseX < canvasWidth - padding &&
                        p.mouseY > padding && p.mouseY < canvasHeight - padding) {

                        // Find closest data point to mouse position
                        const mouseXRelative = p.mouseX - padding;
                        const dataIndex = Math.round(mouseXRelative / xStep);

                        if (dataIndex >= 0 && dataIndex < transformedData.length) {
                            const data = transformedData[dataIndex];
                            const x = padding + (dataIndex * xStep);
                            showTooltip = true;

                            // Draw vertical line at data point - brighter guide line
                            p.stroke(colors.textSecondary);
                            p.strokeWeight(1);
                            p.setLineDash([5, 3]); // Dashed line
                            p.line(x, padding, x, canvasHeight - padding);
                            p.setLineDash([]); // Reset to solid line

                            // Draw dot at the top of the stack
                            const topY = canvasHeight - padding - ((data.total / maxTotalValue) * (canvasHeight - padding * 2) * (animationProgress / animationDuration));
                            p.fill(colors.highlight);
                            p.noStroke();
                            p.circle(x, topY, 8);

                            // Draw value at top
                            p.fill(colors.text);
                            p.textAlign(p.CENTER, p.BOTTOM);
                            p.textSize(11);
                            p.text('$' + formatCurrency(data.total), x, topY - 10);

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
                    }

                    if (!showTooltip) {
                        tooltip.style('display', 'none');
                    }
                }

                function buildTooltipHtml(data) {
                    const date = new Date(data.date).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        weekday: 'short'
                    });

                    let html = `
                    <div class="chart-tooltip-header">
                        <span class="chart-tooltip-date">${date}</span>
                        <span class="chart-tooltip-price">$${formatCurrency(data.total)}</span>
                    </div>
                    <div class="chart-tooltip-stocks">
                `;

                    // Sort stocks by value for better readability
                    const stockValuePairs = uniqueStocks
                        .map(stock => ({
                            symbol: stock.symbol,
                            color: stock.color,
                            value: data.stockValues[stock.symbol] || 0
                        }))
                        .filter(stock => stock.value > 0)
                        .sort((a, b) => b.value - a.value);

                    // Calculate percentages
                    const total = data.total;

                    // Add each stock with its value and percentage
                    stockValuePairs.forEach(stock => {
                        const percentage = total > 0 ? ((stock.value / total) * 100).toFixed(1) : 0;
                        html += `
                        <div class="chart-tooltip-stock ${hoveredStock === stock.symbol ? 'highlighted' : ''}">
                            <div class="chart-tooltip-color" style="background-color:${stock.color}"></div>
                            <span class="chart-tooltip-symbol">${stock.symbol}</span>
                            <span class="chart-tooltip-value">$${formatCurrency(stock.value)}</span>
                            <span class="chart-tooltip-percentage">${percentage}%</span>
                        </div>
                    `;
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

                // Add line dash capability to p5
                p.setLineDash = function (list) {
                    p.drawingContext.setLineDash(list);
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

    // Add a new method to handle stock position editing
    handleEditStock(stockId) {
        const portfolio = this.portfolioService.getActivePortfolio();
        const stock = portfolio.stocks.find(s => s.id === stockId);

        if (!stock) return;

        // Create a modal for editing
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <span class="close">&times;</span>
                <h2>Edit ${stock.symbol} Position</h2>
                <form id="edit-stock-form">
                    <div class="form-group">
                        <label for="edit-quantity">Quantity</label>
                        <input type="number" id="edit-quantity" value="${stock.quantity}" required min="0.01" step="0.01">
                    </div>
                    <div class="form-group">
                        <label for="edit-purchase-date">Purchase Date</label>
                        <input type="date" id="edit-purchase-date" value="${stock.purchaseDate}" required>
                    </div>
                    <div class="form-group">
                        <label for="edit-purchase-price">Purchase Price</label>
                        <input type="number" id="edit-purchase-price" value="${stock.purchasePrice}" required min="0.01" step="0.01">
                    </div>
                    <div class="form-actions">
                        <button type="button" class="btn btn-secondary" id="cancel-edit">Cancel</button>
                        <button type="submit" class="btn btn-primary">Save Changes</button>
                    </div>
                </form>
            </div>
        `;
        document.body.appendChild(modal);

        // Show the modal
        setTimeout(() => {
            modal.classList.add('show');
        }, 10);

        // Close button functionality
        const closeBtn = modal.querySelector('.close');
        const cancelBtn = modal.querySelector('#cancel-edit');

        const closeModal = () => {
            modal.classList.remove('show');
            setTimeout(() => {
                modal.remove();
            }, 300);
        };

        closeBtn.addEventListener('click', closeModal);
        cancelBtn.addEventListener('click', closeModal);

        // Form submission
        const form = modal.querySelector('#edit-stock-form');
        form.addEventListener('submit', (e) => {
            e.preventDefault();

            const quantity = parseFloat(document.getElementById('edit-quantity').value);
            const purchaseDate = document.getElementById('edit-purchase-date').value;
            const purchasePrice = parseFloat(document.getElementById('edit-purchase-price').value);

            // Validate inputs
            if (!quantity || quantity <= 0 || !purchaseDate || !purchasePrice || purchasePrice <= 0) {
                this.showNotification('Please fill all fields with valid values', 'error');
                return;
            }

            // Update the stock
            try {
                this.portfolioService.updateStock(stockId, {
                    quantity,
                    purchaseDate,
                    purchasePrice
                });

                this.showNotification(`Updated ${stock.symbol} position`);

                // Update UI
                this.updatePortfolioList();
                this.updatePortfolioStats();
                this.renderVisualization();

                // Re-select the stock to refresh details
                this.handleStockSelect(stockId);

                // Close the modal
                closeModal();
            } catch (error) {
                this.showNotification(`Error updating stock: ${error.message}`, 'error');
            }
        });
    }
}

export default new StockPortfolioApp();