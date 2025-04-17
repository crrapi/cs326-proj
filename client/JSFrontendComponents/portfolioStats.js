import { getTotalPortfolioValue, getTotalPortfolioStocksQuantity} from '../db/stockTransactions';

let portfolioStats = document.getElementsByClassName("portfolio-stats")[0]
portfolioStats.innerHTML = `
    <div class="stat-card">
        <h3>Total Value</h3>
        <p id = total-portfolio-value-holdings></p>
    </div>

    <div class="stat-card">
        <h3>Number of Stocks</h3>
        <p id = total-portfolio-stocks-quantity-holdings>8</p>
    </div>
    <div class="stat-card">

`
export let updateStatsCard = () => {
    updateTotalValueStatsCard();
    updateTotalStocksQuantityStatsCard();
}




let totalPortfolioValueHoldingsStatsCard = document.getElementById("total-portfolio-value-holdings");
let updateTotalValueStatsCard = () => {
    getTotalPortfolioValue()
        .then((totalValue) => {totalPortfolioValueHoldingsStatsCard.innerHTML = `$${totalValue.toFixed(2)}`;})
        .catch((err) => {
            totalPortfolioValueHoldingsStatsCard.innerHTML = "Failed to update total value stats card"
            console.error("Failed to update total value stats card", err);
        });
};

let totalPortfolioStocksQuantityHoldings = document.getElementById("total-portfolio-stocks-quantity-holdings");
let updateTotalStocksQuantityStatsCard = () => {
    console.log("testing")
    getTotalPortfolioStocksQuantity()
        .then((totalValue) => {totalPortfolioStocksQuantityHoldings.innerHTML = totalValue;})
        .catch((err) => {
            totalPortfolioStocksQuantityHoldings.innerHTML = "Failed to update total value stats card"
            console.error("Failed to update total value stats card", err);
        });
}

updateStatsCard(); //Needs to start once at the beginning of the program


{/* <div class="stat-card">
<h3>Total Return</h3>
<p>+15.4%</p>
</div>
<h3>Best Performer</h3>
<p>AAPL +25%</p>
</div> */}