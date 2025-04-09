import './style.css';
import p5 from 'p5';
import { openDB, addStock, getAllStocks, deleteStock } from './db.js';

let currentPortfolio = []; // Holds the stocks loaded from IndexedDB
let p5Instance = null; // To hold the p5 sketch instance

const createDate = (day) => {
  const date = new Date(2024, 3, 1);
  date.setDate(date.getDate() + day);
  return date;
};


const stockBases = [
  { symbol: 'AAPL', initialPrice: 180, shares: 50, color: '#E53E3E' }, 
  { symbol: 'GOOGL', initialPrice: 140, shares: 30, color: '#48BB78' },
  { symbol: 'MSFT', initialPrice: 420, shares: 25, color: '#4299E1' }, 
  { symbol: 'AMZN', initialPrice: 175, shares: 40, color: '#F6E05E' }, 
  { symbol: 'TSLA', initialPrice: 165, shares: 60, color: '#B794F4' }  
];

const numDays = 14;
const graphData = [];

for (let i = 0; i < numDays; i++) {
  const currentDate = createDate(i);
  const stocksForDay = stockBases.map((stock, index) => {
    const priceFluctuation = Math.sin(i * 0.6 + index * 0.5) * (stock.initialPrice * 0.03) +
      (Math.random() - 0.5) * (stock.initialPrice * 0.02); 
    const currentPrice = Math.max(1, parseFloat((stock.initialPrice + priceFluctuation).toFixed(2))); // Ensure positive price

    return {
      symbol: stock.symbol,
      price: currentPrice,
      shares: stock.shares,
      color: stock.color
    };
  });

  graphData.push({
    date: currentDate,
    stocks: stocksForDay
  });
}


const sketch = (p) => {
  const padding = 60;

  let transformedData = []; 
  let uniqueStocks = [];    
  let maxTotalValue = 0;
  let canvasWidth = 0;


  const colorPalette = ['#E53E3E', '#48BB78', '#4299E1', '#F6E05E', '#B794F4', '#ED8936', '#38B2AC', '#9F7AEA'];
  const assignedColors = {};
  let colorIndex = 0;

  function getStockColor(symbol) {
      if (!assignedColors[symbol]) {
          assignedColors[symbol] = colorPalette[colorIndex % colorPalette.length];
          colorIndex++;
      }
      return assignedColors[symbol];
  }

  function processPortfolioData(portfolio) {
      transformedData = [];
      maxTotalValue = 0;
      let stockSet = new Map();
      assignedColors = {};
      colorIndex = 0;

      if (!portfolio || portfolio.length === 0) {
           uniqueStocks = [];
           return;
      }

      portfolio.forEach(stock => {
           if (!stockSet.has(stock.ticker)) {
               stockSet.set(stock.ticker, {
                   symbol: stock.ticker,
                   color: getStockColor(stock.ticker),
                   totalShares: 0,
                   avgPurchasePrice: 0,
                   totalCost: 0
               });
           }
           const stockInfo = stockSet.get(stock.ticker);
           stockInfo.totalShares += stock.quantity;
           stockInfo.totalCost += stock.quantity * stock.purchasePrice;
       });

       stockSet.forEach(stockInfo => {
          if (stockInfo.totalShares > 0) {
             stockInfo.avgPurchasePrice = stockInfo.totalCost / stockInfo.totalShares;
          } else {
             stockInfo.avgPurchasePrice = 0;
          }
       });

      uniqueStocks = Array.from(stockSet.values());

      const numDays = 14; 
      const mockGraphData = [];

      for (let i = 0; i < numDays; i++) {
          const currentDate = new Date();
          currentDate.setDate(currentDate.getDate() - (numDays - 1 - i));

          const stocksForDay = [];
           uniqueStocks.forEach((stockInfo, index) => { 
              const basePrice = stockInfo.avgPurchasePrice;
               const priceFluctuation = Math.sin(i * 0.6 + index * 0.5) * (basePrice * 0.03) +
                 (Math.random() - 0.5) * (basePrice * 0.02);
               const currentPrice = Math.max(1, parseFloat((basePrice + priceFluctuation).toFixed(2)));

               stocksForDay.push({
                   symbol: stockInfo.symbol,
                   price: currentPrice,
                   shares: stockInfo.totalShares,
                   color: stockInfo.color
               });
           });

           mockGraphData.push({
               date: currentDate,
               stocks: stocksForDay
           });
      }

      mockGraphData.forEach(dailyData => {
          const values = {};
          let totalValueThisStep = 0;

          dailyData.stocks.forEach(stock => {
              const value = stock.price * stock.shares;
              values[stock.symbol] = value;
              totalValueThisStep += value;
          });

          transformedData.push({
              timestamp: dailyData.date,
              values: values,
              totalValue: totalValueThisStep
          });

          if (totalValueThisStep > maxTotalValue) {
              maxTotalValue = totalValueThisStep;
          }
      });

      maxTotalValue *= 1.05; 
      if (maxTotalValue <= 0) maxTotalValue = 1;

      console.log("Processed data for graph:", transformedData);
      console.log("Unique stocks for legend:", uniqueStocks);

  }

  p.setup = () => {
      const canvasElement = document.querySelector('.canvas-placeholder');
      if (!canvasElement) {
          console.error("Canvas placeholder element not found!");
          return;
      }
      p.createCanvas(canvasElement.offsetWidth, 400).parent(canvasElement);
      p.textFont('sans-serif');
      canvasWidth = canvasElement.offsetWidth;

      p.noLoop();
  };

  p.updateData = (newPortfolioData) => {
      console.log("p5: Updating data with:", newPortfolioData);
      processPortfolioData(newPortfolioData);
      p.redraw();
  };


  p.draw = () => {
      p.background('#f8fafc');

      if (!transformedData || transformedData.length === 0) {
          p.fill(100);
          p.textAlign(p.CENTER, p.CENTER);
          p.text("No portfolio data to display. Add stocks using the form.", p.width / 2, p.height / 2);
          return;
      }
       if (transformedData.length < 2) {
            p.fill(100);
            p.textAlign(p.CENTER, p.CENTER);
            p.text("Need at least 2 data points to draw a line.", p.width / 2, p.height / 2);
            return;
       }

      const dataLength = transformedData.length;

      let cumulativeY = new Array(dataLength).fill(p.height - padding);

      const topStrokeWeight = 2; 
      const fillLightenFactor = 0.35;
      const fillAlpha = 200; 

      uniqueStocks.forEach((stock) => { 
          let nextCumulativeY = new Array(dataLength);

          const baseColor = p.color(stock.color);
          const whiteColor = p.color(255);
          const lighterFillColor = p.lerpColor(baseColor, whiteColor, fillLightenFactor);
          lighterFillColor.setAlpha(fillAlpha);

          p.fill(lighterFillColor);
          p.noStroke();

          p.beginShape();
          const startX = p.map(0, 0, dataLength - 1, padding, p.width - padding);
          p.vertex(startX, cumulativeY[0]);

           for (let i = 0; i < dataLength; i++) {
              const dataPoint = transformedData[i];
              const stockValue = dataPoint.values[stock.symbol] || 0;
              const valueHeight = p.map(stockValue, 0, maxTotalValue, 0, p.height - padding * 2);
              const currentTopY = cumulativeY[i] - valueHeight;

              nextCumulativeY[i] = currentTopY;

              const x = p.map(i, 0, dataLength - 1, padding, p.width - padding);
              p.vertex(x, currentTopY);
          }

          const endX = p.map(dataLength - 1, 0, dataLength - 1, padding, p.width - padding);
          p.vertex(endX, cumulativeY[dataLength - 1]);


          for (let i = dataLength - 1; i >= 0; i--) {
              const x = p.map(i, 0, dataLength - 1, padding, p.width - padding);
               p.vertex(x, cumulativeY[i]);
          }
          p.endShape(p.CLOSE);

          p.stroke(stock.color);
          p.strokeWeight(topStrokeWeight);
          p.noFill();

          p.beginShape();
          for (let i = 0; i < dataLength; i++) {
              const x = p.map(i, 0, dataLength - 1, padding, p.width - padding);
              p.vertex(x, nextCumulativeY[i]);
          }
          p.endShape();

          cumulativeY = nextCumulativeY;
      });

      p.noStroke();
      p.noFill();
      p.stroke('#334155');
      p.strokeWeight(1);
      p.line(padding, padding / 2, padding, p.height - padding);
      p.line(padding, p.height - padding, p.width - padding / 2, p.height - padding);

      p.fill('#334155');
      p.noStroke();
      p.textAlign(p.RIGHT, p.CENTER);
      p.textSize(10);
      const numYLabels = 5;
      for (let i = 0; i <= numYLabels; i++) {
          const value = p.map(i, 0, numYLabels, 0, maxTotalValue / 1.05);
          const y = p.map(value, 0, maxTotalValue, p.height - padding, padding);
          if (y < padding / 2) continue;
          p.text(`$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, padding - 8, y);

           p.stroke('#e2e8f0');
           p.strokeWeight(0.5);
           p.line(padding + 1, y, p.width - padding / 2, y);
           p.noStroke();
      }

      p.fill('#334155');
      p.textAlign(p.CENTER, p.TOP);
      p.textSize(10);
       const numXLabels = Math.min(dataLength, Math.floor((p.width - padding * 2) / 70) );
      for (let i = 0; i < numXLabels; i++) {
           let index;
           if (numXLabels <= 1) {
               index = Math.floor(dataLength / 2);
           } else {
               index = Math.round(p.map(i, 0, numXLabels - 1, 0, dataLength - 1));
           }
           if (index >= dataLength) index = dataLength - 1;

          const dataPoint = transformedData[index];
           if (!dataPoint) continue;

          const x = p.map(index, 0, dataLength - 1, padding, p.width - padding);

           const dateLabel = dataPoint.timestamp.toLocaleDateString(undefined, {
               month: 'short',
               day: 'numeric'
           });
           p.text(dateLabel, x, p.height - padding + 8);
       }

      const legendX = padding + 10;
      const legendY = padding / 2 - 5;
      const legendBoxSize = 10;
      const legendSpacing = 18;

      p.textSize(11);
      p.textAlign(p.LEFT, p.CENTER);
       uniqueStocks.forEach((stock, index) => {
           const currentY = legendY + index * legendSpacing;
           if (currentY > padding - legendBoxSize) return;

           p.fill(stock.color);
           p.noStroke();
           p.rect(legendX, currentY - legendBoxSize / 2, legendBoxSize, legendBoxSize, 2);

           p.fill('#334155');
           p.text(stock.symbol, legendX + legendBoxSize + 6, currentY);
       });
  };

  p.windowResized = () => {
      const canvasElement = document.querySelector('.canvas-placeholder');
      if (!canvasElement) return;
       if (canvasElement.offsetWidth !== canvasWidth && canvasElement.offsetWidth > 0) {
           p.resizeCanvas(canvasElement.offsetWidth, 400);
           canvasWidth = canvasElement.offsetWidth;
           p.redraw();
       }
  };

};

document.addEventListener('DOMContentLoaded', () => {
  const addStockForm = document.querySelector('.portfolio-input form');
  const tickerInput = document.getElementById('ticker');
  const quantityInput = document.getElementById('quantity');
  const purchaseDateInput = document.getElementById('purchase-date');
  const purchasePriceInput = document.getElementById('purchase-price');
  const submitButton = addStockForm.querySelector('button[type="submit"]');

  function validateForm() {
      let isValid = true;
      clearErrors();

      if (!tickerInput.value.trim()) {
          showError(tickerInput, 'Ticker symbol is required.');
          isValid = false;
      }

      const quantity = parseFloat(quantityInput.value);
      if (isNaN(quantity) || quantity <= 0) {
          showError(quantityInput, 'Quantity must be a positive number.');
          isValid = false;
      }

      if (!purchaseDateInput.value) {
          showError(purchaseDateInput, 'Purchase date is required.');
          isValid = false;
      }

      const price = parseFloat(purchasePriceInput.value);
      if (isNaN(price) || price <= 0) {
          showError(purchasePriceInput, 'Purchase price must be a positive number.');
          isValid = false;
      }

      return isValid;
  }

  function showError(inputElement, message) {
      const formGroup = inputElement.closest('.form-group');
      const errorElement = document.createElement('p');
      errorElement.className = 'error-message';
      errorElement.style.color = 'red';
      errorElement.style.fontSize = '0.8em';
      errorElement.textContent = message;
      formGroup.appendChild(errorElement);
      inputElement.classList.add('input-error');
  }

  function clearErrors() {
      document.querySelectorAll('.error-message').forEach(el => el.remove());
      document.querySelectorAll('.input-error').forEach(el => el.classList.remove('input-error'));
  }

  function showSuccessMessage(message) {
      const successElement = document.createElement('p');
      successElement.textContent = message;
      successElement.style.color = 'green';
      successElement.style.marginTop = '10px';
      addStockForm.appendChild(successElement);
      setTimeout(() => successElement.remove(), 3000);
  }

  addStockForm.addEventListener('submit', async (event) => {
      event.preventDefault();

      if (validateForm()) {
          const newStock = {
              ticker: tickerInput.value.trim().toUpperCase(),
              quantity: parseFloat(quantityInput.value),
              purchaseDate: purchaseDateInput.value, 
              purchasePrice: parseFloat(purchasePriceInput.value)
          };

          try {
              await addStock(newStock);
              showSuccessMessage('Stock added successfully!');
              addStockForm.reset(); 
              clearErrors();
              await loadPortfolioAndUpdateUI();
          } catch (error) {
              console.error("Failed to add stock:", error);
              showError(submitButton, 'Failed to save stock. See console.');
          }
      }
  });

  async function initializeApp() {
      try {
          await openDB();
          await loadPortfolioAndUpdateUI();
      } catch (error) {
          console.error("Initialization failed:", error);
      }
  }

  initializeApp();
});

async function loadPortfolioAndUpdateUI() {
  try {
      currentPortfolio = await getAllStocks();
      console.log("Loaded portfolio:", currentPortfolio);

      if (p5Instance) {
          p5Instance.updateData(currentPortfolio);
      }

      updateStats(currentPortfolio);

  } catch (error) {
      console.error("Error loading portfolio or updating UI:", error);
  }
}

function updateStats(portfolio) {
  const statsContainer = document.querySelector('.portfolio-stats');
  if (!statsContainer) return;

  const numStocks = portfolio.length;

  const totalPurchaseValue = portfolio.reduce((sum, stock) => sum + (stock.purchasePrice * stock.quantity), 0);
  const uniqueTickers = new Set(portfolio.map(s => s.ticker)).size;

  const valueCard = statsContainer.querySelector('.stat-card:nth-child(1) p');
  const returnCard = statsContainer.querySelector('.stat-card:nth-child(2) p');
  const countCard = statsContainer.querySelector('.stat-card:nth-child(3) p');
  const bestPerformerCard = statsContainer.querySelector('.stat-card:nth-child(4) p');

  if (valueCard) {
       valueCard.textContent = `$${totalPurchaseValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
       valueCard.previousElementSibling.textContent = "Total Purchase Value";
  }
   if (returnCard) {
      returnCard.textContent = "N/A"; 
   }
   if (countCard) {
      countCard.textContent = `${numStocks} (${uniqueTickers} unique)`;
   }
   if (bestPerformerCard) {
      bestPerformerCard.textContent = "N/A";
   }
}

new p5(sketch);