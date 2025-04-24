const portfolioInputElement = document.querySelector(".portfolio-input");
if (portfolioInputElement) {
    portfolioInputElement.innerHTML = `
        <h2>Manage Portfolio</h2>
        <form class="buy-sell-stock-form">
            <div class="form-group">
                <label for="ticker">Ticker Symbol</label>
                <input type="text" id="ticker" name="ticker" placeholder="e.g., AAPL" required>
                <div class="form-error" id="ticker-error"></div>
            </div>
            <div class="form-group">
                <label for="transaction-date">Transaction Date</label>
                <input type="date" id="transaction-date" name="transactionDate" required>
                <div class="form-error" id="transaction-date-error"></div>
            </div>
            <div class="form-group">
                <label for="quantity">Quantity</label>
                <input type="number" id="quantity" name="quantity" placeholder="# of shares" required min="0.000001" step="any">
                 <div class="form-error" id="quantity-error"></div>
            </div>
             <div class="form-group">
                <label for="transaction-price">Price per Share (Buy or Sell)</label>
                <input type="number" id="transaction-price" name="transactionPrice" placeholder="Price per share" required min="0" step="any">
                 <div class="form-error" id="transaction-price-error"></div>
            </div>
             <div class="form-error general-form-error" id="form-error"></div>

            <div class="form-buttons" style="display: flex; gap: 10px; margin-top: 1rem;">
                 <button type="submit" class="btn" id="buy-button">Buy Stock</button>
                 <button type="button" class="btn" id="sell-button" style="background-color: #E53E3E;">Sell Stock</button>
            </div>
        </form>
    `;

    const form = portfolioInputElement.querySelector('.buy-sell-stock-form');
    const buyButton = portfolioInputElement.querySelector('#buy-button');
    const sellButton = portfolioInputElement.querySelector('#sell-button');
    const tickerInput = portfolioInputElement.querySelector('#ticker');
    const quantityInput = portfolioInputElement.querySelector('#quantity');
    const transactionPriceInput = portfolioInputElement.querySelector('#transaction-price');
    const transactionDateInput = portfolioInputElement.querySelector('#transaction-date');

    const tickerError = portfolioInputElement.querySelector('#ticker-error');
    const quantityError = portfolioInputElement.querySelector('#quantity-error');
    const transactionPriceError = portfolioInputElement.querySelector('#transaction-price-error');
    const transactionDateError = portfolioInputElement.querySelector('#transaction-date-error');
    const formError = portfolioInputElement.querySelector('#form-error');

    const API_BASE_URL = 'http://localhost:3000/api';

    const clearErrors = () => {
        tickerError.textContent = '';
        quantityError.textContent = '';
        transactionPriceError.textContent = '';
        transactionDateError.textContent = '';
        formError.textContent = '';
        tickerInput.style.borderColor = '';
        quantityInput.style.borderColor = '';
        transactionPriceInput.style.borderColor = '';
        transactionDateInput.style.borderColor = '';
    };

    const displayError = (errorElement, message) => {
        if (errorElement) {
            errorElement.textContent = message;
            const inputId = errorElement.id.replace('-error', '');
            const inputField = portfolioInputElement.querySelector(`#${inputId}`);
            if (inputField) {
                inputField.style.borderColor = 'red';
            }
        } else {
            formError.textContent = message;
            formError.style.color = 'red';
        }
    };

    const triggerGraphUpdate = () => {
        console.log('Dispatching portfolioUpdated event');
        document.dispatchEvent(new CustomEvent('portfolioUpdated'));
        const graphStatusElement = document.getElementById('graph-status');
        if (graphStatusElement) {
            graphStatusElement.textContent = 'Portfolio changed. Click Generate/Update Graph.';
            graphStatusElement.style.color = '#f59e0b';
        }
    };

    const handleBuySubmit = async (event) => {
        event.preventDefault();
        clearErrors();
        formError.textContent = 'Processing purchase...';
        formError.style.color = '';

        const symbol = tickerInput.value.trim().toUpperCase();
        const quantity = parseFloat(quantityInput.value);
        const purchasePrice = parseFloat(transactionPriceInput.value);
        const purchaseDate = transactionDateInput.value;

        let isValid = true;
        if (!symbol) {
            displayError(tickerError, 'Ticker symbol is required.');
            isValid = false;
        }
        if (!purchaseDate) {
            displayError(transactionDateError, 'Transaction date is required.');
            isValid = false;
        } else if (!/^\d{4}-\d{2}-\d{2}$/.test(purchaseDate)) {
            displayError(transactionDateError, 'Invalid date format (use YYYY-MM-DD).');
            isValid = false;
        }
        if (isNaN(quantity) || quantity <= 0) {
            displayError(quantityError, 'Quantity must be a positive number.');
            isValid = false;
        }
        if (isNaN(purchasePrice) || purchasePrice < 0) {
            displayError(transactionPriceError, 'Price must be a non-negative number.');
            isValid = false;
        }
        if (!isValid) {
            formError.textContent = 'Please correct the errors above.';
            formError.style.color = 'red';
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/portfolio/buy`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ symbol, quantity, purchasePrice, purchaseDate }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || `HTTP error! status: ${response.status}`);
            }

            console.log('Buy successful:', result);
            formError.textContent = `Purchased ${quantity} ${symbol} successfully!`;
            formError.style.color = 'green';
            form.reset();
            triggerGraphUpdate();

        } catch (error) {
            console.error('Error buying stock:', error);
            formError.textContent = `Buy Error: ${error.message}`;
            formError.style.color = 'red';
        } finally {
            setTimeout(() => {
                if (formError.style.color === 'green' || formError.style.color === 'red') {
                    formError.textContent = '';
                    formError.style.color = '';
                }
            }, 7000);
        }
    };

    const handleSellSubmit = async () => {
        clearErrors();
        formError.textContent = 'Processing sale...';
        formError.style.color = '';

        const symbol = tickerInput.value.trim().toUpperCase();
        const quantity = parseFloat(quantityInput.value);
        const sellPrice = parseFloat(transactionPriceInput.value);
        const sellDate = transactionDateInput.value;

        let isValid = true;
        if (!symbol) {
            displayError(tickerError, 'Ticker symbol is required.');
            isValid = false;
        }
        if (!sellDate) {
            displayError(transactionDateError, 'Transaction date is required.');
            isValid = false;
        } else if (!/^\d{4}-\d{2}-\d{2}$/.test(sellDate)) {
            displayError(transactionDateError, 'Invalid date format (use YYYY-MM-DD).');
            isValid = false;
        }
        if (isNaN(quantity) || quantity <= 0) {
            displayError(quantityError, 'Quantity must be a positive number.');
            isValid = false;
        }
        if (isNaN(sellPrice) || sellPrice < 0) {
            displayError(transactionPriceError, 'Sell price must be a non-negative number.');
            isValid = false;
        }

        if (!isValid) {
            formError.textContent = 'Please correct the errors above.';
            formError.style.color = 'red';
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/portfolio/sell`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ symbol, quantity, sellPrice, sellDate }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || `HTTP error! status: ${response.status}`);
            }

            console.log('Sell successful:', result);
            formError.textContent = `Sold ${result.message.split(' ')[2]} ${symbol} successfully!`;
            formError.style.color = 'green';
            form.reset();
            triggerGraphUpdate();

        } catch (error) {
            console.error('Error selling stock:', error);
            formError.textContent = `Sell Error: ${error.message}`;
            formError.style.color = 'red';
        } finally {
            setTimeout(() => {
                if (formError.style.color === 'green' || formError.style.color === 'red') {
                    formError.textContent = '';
                    formError.style.color = '';
                }
            }, 7000);
        }
    };

    if (form) {
        form.addEventListener('submit', handleBuySubmit);
    }
    if (sellButton) {
        sellButton.addEventListener('click', handleSellSubmit);
    }

    [tickerInput, quantityInput, transactionPriceInput, transactionDateInput].forEach(input => {
        input?.addEventListener('input', () => {
            const errorId = `${input.id}-error`;
            const errorElement = portfolioInputElement.querySelector(`#${errorId}`);
            if (errorElement) errorElement.textContent = '';
            input.style.borderColor = '';
            if (formError.textContent && formError.style.color === 'red') {
                formError.textContent = '';
            }
        });
    });

} else {
    console.error("Portfolio input element not found.");
}