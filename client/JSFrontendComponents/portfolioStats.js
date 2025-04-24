const portfolioStatsElement = document.querySelector(".portfolio-stats");
if (portfolioStatsElement) {
    portfolioStatsElement.innerHTML = `
        <div class="stat-card">
            <h3>Current Total Value</h3>
             <p id="total-portfolio-value-holdings">Loading...</p>
        </div>
        <div class="stat-card">
            <h3>Unique Stocks Held</h3>
             <p id="total-portfolio-stocks-quantity-holdings">Loading...</p>
        </div>
        <div class="stat-card">
             <h3>Data Status</h3>
             <p id="portfolio-stats-status">Idle</p>
        </div>
    `;

    const valueElement = portfolioStatsElement.querySelector("#total-portfolio-value-holdings");
    const countElement = portfolioStatsElement.querySelector("#total-portfolio-stocks-quantity-holdings");
    const statusElement = portfolioStatsElement.querySelector("#portfolio-stats-status");

    const API_BASE_URL = 'http://localhost:3000/api';

    let debounceTimeout;
    function debounce(func, wait) {
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(debounceTimeout);
                func(...args);
            };
            clearTimeout(debounceTimeout);
            debounceTimeout = setTimeout(later, wait);
        };
    }


    const updateStats = async () => {
        if (!valueElement || !countElement || !statusElement) {
            console.error("Portfolio stats elements not found.");
            return;
        }
        statusElement.textContent = "Loading stats...";
        statusElement.style.color = '#f59e0b';

         valueElement.textContent = "Calculating...";
         countElement.textContent = "-";

        try {
            const holdingsResponse = await fetch(`${API_BASE_URL}/portfolio`);
            if (!holdingsResponse.ok) {
                const errorData = await holdingsResponse.json().catch(() => ({ message: `HTTP error! status: ${holdingsResponse.status}` }));
                throw new Error(`Failed to fetch holdings: ${errorData.message || holdingsResponse.statusText}`);
            }
            const currentHoldings = await holdingsResponse.json();

            if (!Array.isArray(currentHoldings)) {
                 throw new Error("Invalid holdings data received from server.");
            }

            const uniqueSymbols = new Set(currentHoldings.map(h => h.symbol));
            countElement.textContent = uniqueSymbols.size.toString();

            if (currentHoldings.length === 0) {
                 valueElement.textContent = "$0.00";
                 statusElement.textContent = "Portfolio empty";
                 statusElement.style.color = 'green';
                 return;
            }

            const graphDataResponse = await fetch(`${API_BASE_URL}/portfolio/realtime-graph`);
             if (!graphDataResponse.ok) {
                 console.warn(`Could not fetch recent prices from graph endpoint (status: ${graphDataResponse.status}). Value calculation might be inaccurate.`);
                  let estimatedValue = 0;
                  currentHoldings.forEach(h => {
                      estimatedValue += h.quantity * h.averagePurchasePrice;
                  });
                  valueElement.textContent = `$${estimatedValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (Cost Basis)`;
                  throw new Error("Could not fetch current prices for value calculation.");
             }
             const graphData = await graphDataResponse.json();

            let latestTotalValue = 0;
            if (graphData && graphData.length > 0) {
                 const latestDayData = graphData[graphData.length - 1];

                 if (latestDayData && Array.isArray(latestDayData.stocks)) {
                     const latestPrices = {};
                     latestDayData.stocks.forEach(stock => {
                         latestPrices[stock.symbol] = stock.price;
                     });

                     currentHoldings.forEach(holding => {
                         const latestPrice = latestPrices[holding.symbol];
                         if (latestPrice !== undefined) {
                             latestTotalValue += holding.quantity * latestPrice;
                         } else {
                             console.warn(`Missing latest price for ${holding.symbol} in graph data. Using average purchase price for this stock.`);
                             latestTotalValue += holding.quantity * holding.averagePurchasePrice;
                         }
                     });
                     valueElement.textContent = `$${latestTotalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                     statusElement.textContent = "Updated";
                     statusElement.style.color = 'green';

                 } else {
                     console.warn("Latest day data from graph endpoint is missing or invalid:", latestDayData);
                      valueElement.textContent = "$ -- (Error)";
                     throw new Error("Invalid price data format received.");
                 }

            } else {
                 console.warn("Graph data endpoint returned empty array. Cannot calculate current value accurately.");
                 valueElement.textContent = "$0.00";
                 if (currentHoldings.length > 0) {
                     statusElement.textContent = "Update Pending Prices";
                     statusElement.style.color = '#f59e0b';
                 } else {
                      statusElement.textContent = "Portfolio empty";
                      statusElement.style.color = 'green';
                 }
            }

        } catch (error) {
            console.error("Error updating portfolio stats:", error);
            valueElement.textContent = "$ --";
            statusElement.textContent = `Error: ${error.message}`;
            statusElement.style.color = 'red';
        } finally {
            setTimeout(() => {
                if (statusElement.textContent !== "Loading stats..." && statusElement.textContent !== "Idle") {
                    statusElement.textContent = "Idle";
                    statusElement.style.color = '';
                }
            }, 7000);
        }
    };

    window.updatePortfolioStats = debounce(updateStats, 500);

    document.addEventListener('DOMContentLoaded', () => {
        console.log("DOM Content Loaded - Initial Portfolio Stats Update");
        window.updatePortfolioStats();
    });

} else {
    console.error("Portfolio stats element not found.");
}