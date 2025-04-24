

const portfolioStatsElement = document.querySelector(".portfolio-stats"); 
if (portfolioStatsElement) {
    portfolioStatsElement.innerHTML = `
        <div class="stat-card">
            <h3>Current Total Value</h3>
            <p id="total-portfolio-value-holdings">$0.00</p>
        </div>
        <div class="stat-card">
            <h3>Unique Stocks Held</h3>
            <p id="total-portfolio-stocks-quantity-holdings">0</p>
        </div>
        <!-- Add more stat cards if needed -->
        <div class="stat-card">
             <h3>Data Status</h3>
             <p id="portfolio-stats-status">Loading...</p>
        </div>
    `;

    const valueElement = portfolioStatsElement.querySelector("#total-portfolio-value-holdings");
    const countElement = portfolioStatsElement.querySelector("#total-portfolio-stocks-quantity-holdings");
    const statusElement = portfolioStatsElement.querySelector("#portfolio-stats-status");

    const API_BASE_URL = 'http://localhost:3000/api';

    const updateStats = async () => {
        if (!valueElement || !countElement || !statusElement) {
            console.error("Portfolio stats elements not found.");
            return;
        }
        statusElement.textContent = "Loading...";
        statusElement.style.color = ''; 

        try {
            
            
            const response = await fetch(`${API_BASE_URL}/portfolio/historical`);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: `HTTP error! status: ${response.status}` }));
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }
            const historicalData = await response.json();

            let latestTotalValue = 0;
            let uniqueSymbols = new Set();

            if (historicalData && historicalData.length > 0) {
                
                const latestDayData = historicalData[historicalData.length - 1];
                if (latestDayData && Array.isArray(latestDayData.stocks)) {
                    latestDayData.stocks.forEach(stock => {
                        latestTotalValue += (stock.price * stock.shares);
                        uniqueSymbols.add(stock.symbol);
                    });
                } else {
                    console.warn("Latest day data is missing or invalid:", latestDayData);
                }
            } else {
                
                const portfolioResponse = await fetch(`${API_BASE_URL}/portfolio`);
                if (!portfolioResponse.ok) {
                    const errorData = await portfolioResponse.json().catch(() => ({ message: `HTTP error! status: ${portfolioResponse.status}` }));
                    throw new Error(errorData.message || `HTTP error! status: ${portfolioResponse.status}`);
                }
                const holdings = await portfolioResponse.json();
                holdings.forEach(h => uniqueSymbols.add(h.symbol));
                
            }


            valueElement.textContent = `$${latestTotalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            countElement.textContent = uniqueSymbols.size.toString();
            statusElement.textContent = "Updated";
            statusElement.style.color = 'green';


        } catch (error) {
            console.error("Error updating portfolio stats:", error);
            valueElement.textContent = "$ --";
            countElement.textContent = "--";
            statusElement.textContent = `Error: ${error.message}`;
            statusElement.style.color = 'red';
        } finally {
            
            setTimeout(() => {
                if (statusElement.textContent === "Updated" || statusElement.textContent.startsWith("Error")) {
                    statusElement.textContent = "Idle";
                    statusElement.style.color = '';
                }
            }, 5000);
        }
    };

    window.updatePortfolioStats = updateStats;

    document.addEventListener('DOMContentLoaded', () => {
        console.log("DOM Content Loaded - Updating Portfolio Stats");
        updateStats();
    });


} else {
    console.error("Portfolio stats element not found.");
}