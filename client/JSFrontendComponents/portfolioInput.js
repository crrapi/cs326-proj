import stocks from 'stock-ticker-symbol';
import { addStockTransaction } from '../db/stockTransactions';
import { updateStatsCard } from './portfolioStats'

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


let buySellStockFormElement = document.getElementsByClassName("buy-sell-stock-form")[0];
let formErrorElements = document.getElementsByClassName("form-error")
let tickerFormElement = document.getElementById("ticker")
let purchaseDateFormElement = document.getElementById("purchase-date")
let quantityFormElement = document.getElementById("quantity")
let totalPriceFormElement = document.getElementById("total-price")

let formValidation = () => {
    let tickerSymbol = tickerFormElement.value;
    if (!tickerSymbol) formErrorElements[0].innerHTML = "No Stock Ticker Symbol Inputted";
    else if (!stocks.lookup(tickerSymbol)) formErrorElements[0].innerHTML = "Invalid Stock Ticker Symbol"
    else formErrorElements[0].innerHTML = ""
    
    let purchaseDate = purchaseDateFormElement.value;
    if (!purchaseDate) formErrorElements[1].innerHTML = "No Purchase date Inputted"
    else if (purchaseDate > (new Date()).toISOString().split('T')[0]) formErrorElements[1].innerHTML = "Invalid Date Inputted"
    else formErrorElements[1].innerHTML = ""

    let quantity = quantityFormElement.value;
    let totalPrice = totalPriceFormElement.value;
    if (!quantity && !totalPrice) formErrorElements[2].innerHTML = "No quantity or total price"
    else if (quantity && totalPrice) formErrorElements[2].innerHTML = "Can't have quantity and total price"
    else if (quantity && quantity < 0) formErrorElements[2].innerHTML = "Invalid Quantity Inputted"
    else if (totalPrice && totalPrice < 0) formErrorElements[2].innerHTML = "Invalid Price Inputted"
    else formErrorElements[2].innerHTML = ""

    return [...formErrorElements].every(e => e.innerHTML === "");
}

let grabbingFormInputs = (e) => {
    let ticker = document.getElementById("ticker").value
    let purchaseDate = document.getElementById("purchase-date").value
    let quantity = document.getElementById("quantity").value
    let totalPrice = document.getElementById("total-price").value
    let buyFlag = e.submitter.id === "buy-button" ? true : false;

    let currentStockPrice = 100; //Change this later
    if (quantity) totalPrice = currentStockPrice*quantity;
    else quantity = totalPrice / currentStockPrice;


    return [ticker, purchaseDate, quantity, totalPrice, buyFlag]
}



buySellStockFormElement.addEventListener('submit', (e) => {
    e.preventDefault(); // Prevent Page Reload

    //Do form Validation first
    if (!formValidation()) return 

    //The do grab form inputs
    let [ticker, purchaseDate, quantity, totalPrice, buyFlag] = grabbingFormInputs(e);

    //Add to DB
    addStockTransaction(ticker, purchaseDate, quantity, totalPrice, buyFlag)

    //Update Screen
    updateStatsCard();
});
