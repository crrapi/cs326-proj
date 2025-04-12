let portfolioInput = document.getElementsByClassName("portfolio-input")[0]
portfolioInput.innerHTML = `
    <h2>Add Stock</h2>
    <form>
        <div class="form-group">
            <label for="ticker">Ticker Symbol</label>
            <input type="text" id="ticker" placeholder="e.g., AAPL">
            <!-- TODO autocomplete / debounced lookup -->
        </div>
        <div class="form-group">
            <label for="quantity">Quantity</label>
            <input type="number" id="quantity" placeholder="Number of shares">
        </div>
        <div class="form-group">
            <label for="purchase-date">Purchase Date</label>
            <input type="date" id="purchase-date">
        </div>
        <div class="form-group">
            <label for="purchase-price">Purchase Price</label>
            <input type="number" id="purchase-price" placeholder="Price per share">
        </div>
        <button type="submit" class="btn">Add to Portfolio</button>
        <!-- TODO onSubmit add to local storage, or hit backend API -->
    </form>
`