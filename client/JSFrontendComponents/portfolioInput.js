let portfolioInput = document.getElementsByClassName("portfolio-input")[0];
portfolioInput.innerHTML = `
    <h2>Buy/Sell Stock</h2>
    <form class="buy-sell-stock-form">
        <div class="form-group">
            <label for="ticker">Ticker Symbol</label>
            <input type="text" id="ticker" placeholder="e.g., AAPL">
            <div class="form-error"></div>
        </div>
        <div class="form-group">
            <label for="purchase-date">Purchase Date</label>
            <input type="date" id="purchase-date">
            <div class="form-error"></div>
        </div>
        <div class="form-group">
            <div class="quantity-purchaseprice">
                <div>
                    <label for="quantity">Quantity</label>
                    <input type="number" id="quantity" placeholder="# of shares">
                </div>
                <div>
                    <label for="total-price">Total Price</label>
                    <input type="number" id="total-price" placeholder="Total Price">
                </div>
            </div>
            <div class="form-error"></div>
        </div>
        <div class="form-group">

        </div>
        <button type="submit" class="btn" id="buy-button">Add to Portfolio</button>
        <button type="submit" class="btn" id="sell-button">Sell to Portfolio</button>
    </form>
`;