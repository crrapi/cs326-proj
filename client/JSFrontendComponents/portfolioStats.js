import { getTotalPortfolioValue } from '../db/stockTransactions';

let portfolioStats = document.getElementsByClassName("portfolio-stats")[0]
portfolioStats.innerHTML = `
    <div class="stat-card">
        <h3>Total Value</h3>
        <p id = total-portfolio-value-holdings></p>
    </div>

    <div class="stat-card">
        <h3>Number of Stocks</h3>
        <p>8</p>
    </div>
    <div class="stat-card">

`
export let updateStatsCard = () => {
    updateTotalValueStatsCard();

}




let totalPortFolioValueHoldingsStatsCard = document.getElementById("total-portfolio-value-holdings");
let updateTotalValueStatsCard =  () => {
    console.log("HELLO");

    getTotalPortfolioValue()
        .then((totalValue) => {
            console.log(totalValue)
            totalPortFolioValueHoldingsStatsCard.innerHTML = `$${totalValue.toFixed(2)}`;
        })
        .catch((err) => {
            console.error("Failed to update total value stats card", err);
        });
};

updateStatsCard(); //Needs to start once at the beginning of the program


{/* <div class="stat-card">
<h3>Total Return</h3>
<p>+15.4%</p>
</div>
<h3>Best Performer</h3>
<p>AAPL +25%</p>
</div> */}