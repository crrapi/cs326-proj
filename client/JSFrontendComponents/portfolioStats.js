const portfolioStatsElement = document.querySelector(".portfolio-stats");
if (portfolioStatsElement) {
    portfolioStatsElement.innerHTML = `
        <div class="stat-card">
            <h3>Current Portfolio Value</h3>
            <p id="total-portfolio-value">Loading...</p>
        </div>
        <div class="stat-card">
            <h3>Total Cost Basis</h3>
            <p id="total-cost-basis">Loading...</p>
        </div>
        <div class="stat-card">
            <h3>Total Profit/Loss</h3>
            <p id="total-profit-loss">Loading...</p>
            <small id="profit-loss-detail"></small>
        </div>
        <div class="stat-card">
            <h3>Active Holdings</h3>
            <p id="active-holdings-count">Loading...</p>
        </div>
         <div class="stat-card">
             <h3>Data Status</h3>
             <p id="portfolio-stats-status">Idle</p>
        </div>
    `;

    const valueElement = portfolioStatsElement.querySelector("#total-portfolio-value");
    const costBasisElement = portfolioStatsElement.querySelector("#total-cost-basis");
    const profitLossElement = portfolioStatsElement.querySelector("#total-profit-loss");
    const profitLossDetailElement = portfolioStatsElement.querySelector("#profit-loss-detail");
    const activeCountElement = portfolioStatsElement.querySelector("#active-holdings-count");
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
        if (!valueElement || !costBasisElement || !profitLossElement || !activeCountElement || !statusElement) {
            console.error("Portfolio stats elements not found.");
            return;
        }

        statusElement.textContent = "Loading stats...";
        statusElement.style.color = '#f59e0b';
        valueElement.textContent = "Calculating...";
        costBasisElement.textContent = "Calculating...";
        profitLossElement.textContent = "Calculating...";
        activeCountElement.textContent = "-";
        if (profitLossDetailElement) profitLossDetailElement.textContent = '';


        try {
            const portfolioResponse = await fetch(`${API_BASE_URL}/portfolio`);
            if (!portfolioResponse.ok) {
                const errorData = await portfolioResponse.json().catch(() => ({ message: `HTTP error! status: ${portfolioResponse.status}` }));
                throw new Error(`Failed to fetch portfolio: ${errorData.message || portfolioResponse.statusText}`);
            }
            const portfolioData = await portfolioResponse.json();

            if (!portfolioData || !Array.isArray(portfolioData.holdings) || typeof portfolioData.cashWithdrawnFromSales !== 'number') {
                throw new Error("Invalid portfolio data structure received from server.");
            }

            const allHoldings = portfolioData.holdings;
            const cashWithdrawn = portfolioData.cashWithdrawnFromSales;

            let totalCostBasis = 0;
            let currentTotalValue = 0;
            const activeHoldingsMap = new Map();

            allHoldings.forEach(entry => {
                totalCostBasis += entry.quantity * entry.purchasePrice;

                const soldQty = entry.soldQuantity || 0;
                const activeQty = entry.quantity - soldQty;

                if (activeQty > 1e-9) {
                    const symbol = entry.symbol;
                    if (!activeHoldingsMap.has(symbol)) {
                        activeHoldingsMap.set(symbol, { quantity: 0, cost: 0 });
                    }
                    const currentSymbolData = activeHoldingsMap.get(symbol);
                    currentSymbolData.quantity += activeQty;
                }
            });

            costBasisElement.textContent = `$${totalCostBasis.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            activeCountElement.textContent = activeHoldingsMap.size.toString();

            if (activeHoldingsMap.size > 0) {
                const graphDataResponse = await fetch(`${API_BASE_URL}/portfolio/realtime-graph`);
                if (!graphDataResponse.ok) {
                    console.warn(`Could not fetch recent prices from graph endpoint (status: ${graphDataResponse.status}). Value calculation might be inaccurate.`);
                    valueElement.textContent = "$ -- (Price Error)";
                    profitLossElement.textContent = "$ -- (Price Error)";
                    const profitLoss = cashWithdrawn - totalCostBasis;
                    profitLossElement.textContent = `$${profitLoss.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                    if (profitLossDetailElement) profitLossDetailElement.textContent = "(Based on sales only)";
                    profitLossElement.style.color = profitLoss >= 0 ? 'green' : 'red';
                    throw new Error("Could not fetch current prices for value calculation.");
                }
                const graphData = await graphDataResponse.json();

                if (graphData && graphData.length > 0) {
                    const latestDayData = graphData[graphData.length - 1];
                    if (latestDayData && Array.isArray(latestDayData.stocks)) {
                        const latestPrices = {};
                        latestDayData.stocks.forEach(stock => {
                            latestPrices[stock.symbol] = stock.price;
                        });

                        activeHoldingsMap.forEach((data, symbol) => {
                            const latestPrice = latestPrices[symbol];
                            if (latestPrice !== undefined) {
                                currentTotalValue += data.quantity * latestPrice;
                            } else {
                                console.warn(`Missing latest price for active holding ${symbol}. Current value will be incomplete.`);
                            }
                        });

                        valueElement.textContent = `$${currentTotalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

                    } else {
                        console.warn("Latest day data from graph endpoint is missing or invalid:", latestDayData);
                        valueElement.textContent = "$ -- (Data Error)";
                        throw new Error("Invalid price data format received.");
                    }
                } else {
                    console.warn("Graph data endpoint returned empty or invalid data. Cannot calculate current value.");
                    valueElement.textContent = "$ -- (No Price Data)";
                    const profitLoss = cashWithdrawn - totalCostBasis;
                    profitLossElement.textContent = `$${profitLoss.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                    if (profitLossDetailElement) profitLossDetailElement.textContent = "(Based on sales only)";
                    profitLossElement.style.color = profitLoss >= 0 ? 'green' : 'red';
                }

            } else {
                valueElement.textContent = "$0.00";
            }

            const totalGainOrLoss = (currentTotalValue + cashWithdrawn) - totalCostBasis;

            profitLossElement.textContent = `$${totalGainOrLoss.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            profitLossElement.style.color = totalGainOrLoss >= 0 ? 'green' : 'red';
            if (profitLossDetailElement) profitLossDetailElement.textContent = '';

            statusElement.textContent = "Updated";
            statusElement.style.color = 'green';


        } catch (error) {
            console.error("Error updating portfolio stats:", error);
            valueElement.textContent = "$ --";
            costBasisElement.textContent = "$ --";
            profitLossElement.textContent = "$ --";
            profitLossElement.style.color = '';
            if (profitLossDetailElement) profitLossDetailElement.textContent = '';
            activeCountElement.textContent = "-";
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

    window.updatePortfolioStats = debounce(updateStats, 300);

    document.addEventListener('portfolioUpdated', () => {
        console.log("Portfolio updated event received, refreshing stats...");
        window.updatePortfolioStats();
    });

    document.addEventListener('DOMContentLoaded', () => {
        console.log("DOM Content Loaded - Initial Portfolio Stats Update");
        window.updatePortfolioStats();
    });

} else {
    console.error("Portfolio stats element '.portfolio-stats' not found.");
}