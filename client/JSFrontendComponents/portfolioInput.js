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
             <div class="form-group" id="date-group">
                 <label for="purchase-date">Purchase Date</label>
                 <input type="date" id="purchase-date" name="purchaseDate" required>
                 <div class="form-error" id="date-error"></div>
             </div>
            <div class="form-group">
                <label for="quantity">Quantity</label>
                <input type="number" id="quantity" name="quantity" placeholder="# of shares" required min="0.000001" step="any">
                 <div class="form-error" id="quantity-error"></div>
            </div>
             <div class="form-group" id="price-group">
                <label for="price">Price per Share</label>
                <input type="number" id="price" name="price" placeholder="Price per share" required min="0" step="any">
                 <div class="form-error" id="price-error"></div>
            </div>
             <div class="form-error" id="form-error"></div>

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
    const priceInput = portfolioInputElement.querySelector('#price');
    const dateInput = portfolioInputElement.querySelector('#purchase-date');
    const priceGroup = portfolioInputElement.querySelector('#price-group');
    const dateGroup = portfolioInputElement.querySelector('#date-group');

    const tickerError = portfolioInputElement.querySelector('#ticker-error');
    const quantityError = portfolioInputElement.querySelector('#quantity-error');
    const priceError = portfolioInputElement.querySelector('#price-error');
    const dateError = portfolioInputElement.querySelector('#date-error');
    const formError = portfolioInputElement.querySelector('#form-error');

    const API_BASE_URL = 'http://localhost:3000/api';

    const clearErrors = () => {
        tickerError.textContent = '';
        quantityError.textContent = '';
        priceError.textContent = '';
        dateError.textContent = '';
        formError.textContent = '';
        tickerInput.style.borderColor = '';
        quantityInput.style.borderColor = '';
        priceInput.style.borderColor = '';
        dateInput.style.borderColor = '';
    };

    const displayError = (element, message) => {
        if (element) {
            element.textContent = message;

            const inputId = element.id.replace('-error', '');
            const inputField = portfolioInputElement.querySelector(`#${inputId}`);
            if (inputField) {
                inputField.style.borderColor = 'red';
            }
        }
    };

     const triggerGraphUpdate = () => {
        console.log('Dispatching portfolioUpdated event');
        document.dispatchEvent(new CustomEvent('portfolioUpdated'));
         const generateButton = document.getElementById('generate-graph-button');
         if (generateButton) {
         }
    };


    const handleBuySubmit = async (event) => {
        event.preventDefault();
        clearErrors();
        formError.textContent = 'Processing...';
        formError.style.color = '';

        const symbol = tickerInput.value.trim().toUpperCase();
        const quantity = parseFloat(quantityInput.value);
        const purchasePrice = parseFloat(priceInput.value);
        const purchaseDate = dateInput.value;

        let isValid = true;
        if (!symbol) {
            displayError(tickerError, 'Ticker symbol is required.');
            isValid = false;
        }
        if (!purchaseDate) {
            displayError(dateError, 'Purchase date is required.');
             isValid = false;
         } else if (!/^\d{4}-\d{2}-\d{2}$/.test(purchaseDate)) {
            displayError(dateError, 'Invalid date format (use YYYY-MM-DD).');
             isValid = false;
         }
        if (isNaN(quantity) || quantity <= 0) {
            displayError(quantityError, 'Quantity must be a positive number.');
            isValid = false;
        }
        if (isNaN(purchasePrice) || purchasePrice < 0) {
            displayError(priceError, 'Price must be a non-negative number.');
            isValid = false;
        }
        if (!isValid) {
            formError.textContent = '';
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/portfolio/buy`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ symbol, quantity, purchasePrice, purchaseDate }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || `HTTP error! status: ${response.status}`);
            }

            console.log('Buy successful:', result);
            formError.textContent = 'Stock purchased successfully!';
            formError.style.color = 'green';
            form.reset();
            triggerGraphUpdate();

        } catch (error) {
            console.error('Error buying stock:', error);
            formError.textContent = `Error: ${error.message}`;
            formError.style.color = 'red';
        } finally {
            setTimeout(() => {
                formError.textContent = '';
                formError.style.color = '';
            }, 5000);
        }
    };

    const handleSellSubmit = async () => {
        clearErrors();
        formError.textContent = 'Processing...';
         formError.style.color = '';

        const symbol = tickerInput.value.trim().toUpperCase();
        const quantity = parseFloat(quantityInput.value);

        let isValid = true;
        if (!symbol) {
            displayError(tickerError, 'Ticker symbol is required.');
            isValid = false;
        }
        if (isNaN(quantity) || quantity <= 0) {
            displayError(quantityError, 'Quantity must be a positive number.');
            isValid = false;
        }

        if (!isValid) {
            formError.textContent = '';
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/portfolio/sell`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ symbol, quantity }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || `HTTP error! status: ${response.status}`);
            }

            console.log('Sell successful:', result);
            formError.textContent = 'Stock sold successfully!';
            formError.style.color = 'green';
            form.reset();
            triggerGraphUpdate();

        } catch (error) {
            console.error('Error selling stock:', error);
            formError.textContent = `Error: ${error.message}`;
            formError.style.color = 'red';
        } finally {
            setTimeout(() => {
                formError.textContent = '';
                formError.style.color = '';
            }, 5000);
        }
    };

    if (form) {
        form.addEventListener('submit', handleBuySubmit);
    }
    if (sellButton) {
        sellButton.addEventListener('click', handleSellSubmit);
    }

    [tickerInput, quantityInput, priceInput, dateInput].forEach(input => {
        input?.addEventListener('input', () => {
            const errorId = `${input.id}-error`;
            const errorElement = portfolioInputElement.querySelector(`#${errorId}`);
            if (errorElement) errorElement.textContent = '';
            input.style.borderColor = '';
             formError.textContent = '';
        });
    });


} else {
    console.error("Portfolio input element not found.");
}