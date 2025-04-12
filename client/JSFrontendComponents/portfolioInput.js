let portfolioInput = document.getElementsByClassName("portfolio-input")[0];
portfolioInput.innerHTML = `
    <h2>Buy/Sell Stock</h2>
    <form class="buy-sell-stock-form">
        <div class="form-group">
            <label for="ticker">Ticker Symbol</label>
            <input type="text" id="ticker" placeholder="e.g., AAPL">
        </div>
        <div class="form-group">
            <label for="purchase-date">Purchase Date</label>
            <input type="date" id="purchase-date">
        </div>
        <div class="form-group">
            <label for="quantity">Quantity</label>
            <input type="number" id="quantity" placeholder="Number of shares">
        </div>
        <div class="form-group">
            <label for="total-price">Purchase Price</label>
            <input type="number" id="total-price" placeholder="Total Price">
        </div>
        <button type="submit" class="btn">Add to Portfolio</button>
    </form>
`;

let buySellStockForm = document.getElementsByClassName("buy-sell-stock-form")[0];
buySellStockForm.addEventListener('submit', (e) => {
    e.preventDefault(); // Prevent Page Reload

    let ticker = document.getElementById("ticker").value
    let purchaseDate = document.getElementById("purchase-date").value
    let quantity = document.getElementById("quantity").value
    let totalPrice = document.getElementById("total-price").value

    

    

    console.log({"ticker": ticker, "purchaseDate": purchaseDate, "quantity": quantity, "totalPrice": totalPrice})


    console.log(e);     // This should now work
});
