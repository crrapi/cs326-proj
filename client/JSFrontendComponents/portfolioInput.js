import stocks from 'stock-ticker-symbol';
import { addStockTransaction } from '../db/stockTransactions';

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


let buySellStockForm = document.getElementsByClassName("buy-sell-stock-form")[0];
let formValidation = (ticker, purchaseDate, quantity, totalPrice) => {
    let formErrorElements = document.getElementsByClassName("form-error")
    
    if (!ticker) formErrorElements[0].innerHTML = "No Stock Ticker Symbol Inputted"
    else if (!stocks.lookup(ticker)) formErrorElements[0].innerHTML = "Invalid Stock Ticker Symbol"
    else formErrorElements[0].innerHTML = ""
    
    if (!purchaseDate) formErrorElements[1].innerHTML = "No Purchase date Inputted"
    else if (purchaseDate > (new Date()).toISOString().split('T')[0]) formErrorElements[1].innerHTML = "Invalid Date Inputted"
    else formErrorElements[1].innerHTML = ""

    
    if (!quantity && !totalPrice) formErrorElements[2].innerHTML = "No quantity or total price"
    else if (quantity && totalPrice) formErrorElements[2].innerHTML = "Can't have quantity and total price"
    else if (quantity && quantity < 0) formErrorElements[2].innerHTML = "Invalid Quantity Inputted"
    else if (totalPrice && totalPrice < 0) formErrorElements[2].innerHTML = "Invalid Price Inputted"
    else formErrorElements[2].innerHTML = ""

    return [...formErrorElements].every(e => e.innerHTML === "");
}

let grabbingFormInputs = () => {
    let ticker = document.getElementById("ticker").value
    let purchaseDate = document.getElementById("purchase-date").value
    let quantity = document.getElementById("quantity").value
    let totalPrice = document.getElementById("total-price").value
    return [ticker, purchaseDate, quantity, totalPrice]
}


buySellStockForm.addEventListener('submit', (e) => {
    e.preventDefault(); // Prevent Page Reload

    let [ticker, purchaseDate, quantity, totalPrice] = grabbingFormInputs();
    let buyFlag = e.submitter.id === "buy-button" ? true : false;
    if (!formValidation(ticker, purchaseDate, quantity, totalPrice)) return 

    if (buyFlag) {
        console.log("buy")
        addStockTransaction(ticker, purchaseDate, quantity, totalPrice, buyFlag)
    }
    else console.log("sell")
});
