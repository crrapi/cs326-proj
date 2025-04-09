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

  function processGraphData() {
    transformedData = [];
    maxTotalValue = 0;
    let stockSet = new Map(); 

    if (!graphData || graphData.length === 0) return;

    graphData.forEach(dailyData => {
      const values = {};
      let totalValueThisStep = 0;

      dailyData.stocks.forEach(stock => {
        const value = stock.price * stock.shares;
        values[stock.symbol] = value;
        totalValueThisStep += value;


        if (!stockSet.has(stock.symbol)) {
          stockSet.set(stock.symbol, { symbol: stock.symbol, color: stock.color });
        }
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

    uniqueStocks = Array.from(stockSet.values());
  }


  p.setup = () => {
    const canvas = document.querySelector('.canvas-placeholder');
    p.createCanvas(canvas.offsetWidth, 400).parent(canvas);
    p.textFont('sans-serif');
    canvasWidth = canvas.offsetWidth;

    processGraphData();

    p.noLoop();
  };

  p.draw = () => {
    p.background('#f8fafc');

    if (!transformedData || transformedData.length < 2) {
      p.fill(100);
      p.textAlign(p.CENTER, p.CENTER);
      p.text("Not enough data to draw.", p.width / 2, p.height / 2);
      return;
    }

    const dataLength = transformedData.length;

    let cumulativeY = new Array(dataLength).fill(p.height - padding);

    const topStrokeWeight = 2.5;
    const fillLightenFactor = 0.35; // Adjust how much lighter the fill is (0=original, 1=white)
    const fillAlpha = 204;        // Alpha transparency for the fill (0-255, 204 is 80%)

    uniqueStocks.forEach((stock) => {
      let nextCumulativeY = new Array(dataLength); // To store the top edge coords for the stroke

      // --- 1. Draw the Lighter Fill Area ---
      const baseColor = p.color(stock.color); // Get p5 color object
      const whiteColor = p.color(255);      // White color for lightening
      const lighterFillColor = p.lerpColor(baseColor, whiteColor, fillLightenFactor);
      lighterFillColor.setAlpha(fillAlpha); // Apply transparency

      p.fill(lighterFillColor); // Use the calculated lighter color for fill
      p.noStroke();           // No outline for the fill shape itself

      p.beginShape();

      // Define the starting vertex at the bottom-left
      const startX = p.map(0, 0, dataLength - 1, padding, p.width - padding);
      p.vertex(startX, cumulativeY[0]);

      // Define vertices for the top edge (left to right)
      // AND store the Y coordinates for the stroke later
      for (let i = 0; i < dataLength; i++) {
        const dataPoint = transformedData[i];
        const stockValue = dataPoint.values[stock.symbol] || 0;
        const valueHeight = p.map(stockValue, 0, maxTotalValue, 0, p.height - padding * 2);
        const currentTopY = cumulativeY[i] - valueHeight;

        nextCumulativeY[i] = currentTopY; // *** Store the top Y coordinate ***

        const x = p.map(i, 0, dataLength - 1, padding, p.width - padding);
        p.vertex(x, currentTopY); // Add vertex for the top edge
      }

      // Define the ending vertex at the bottom-right
      const endX = p.map(dataLength - 1, 0, dataLength - 1, padding, p.width - padding);
      // Use the correct baseline Y for the last point to close the shape properly at the bottom
      p.vertex(endX, cumulativeY[dataLength - 1]);


      // Define vertices for the bottom edge (right to left, using the previous layer's top)
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
      p.line(padding, y, p.width - padding / 2, y);
      p.noStroke();
    }


    p.fill('#334155');
    p.textAlign(p.CENTER, p.TOP);
    p.textSize(10);

    const numXLabels = Math.min(dataLength, 7);
    for (let i = 0; i < numXLabels; i++) {
      let index;
      if (numXLabels <= 1) {
        index = 0;
      } else {
        index = Math.round(p.map(i, 0, numXLabels - 1, 0, dataLength - 1));
      }

      if (index >= dataLength) index = dataLength - 1;

      const dataPoint = transformedData[index];
      const x = p.map(index, 0, dataLength - 1, padding, p.width - padding);


      const dateLabel = dataPoint.timestamp.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric'
      });

      p.text(dateLabel, x, p.height - padding + 8);
    }



    const legendX = padding;
    const legendY = padding / 2 - 5; 
    const legendBoxSize = 10;
    const legendSpacingVertical = 18; 

    p.textSize(11);
    p.textAlign(p.LEFT, p.CENTER);
    uniqueStocks.forEach((stock, index) => {
      const currentY = legendY + index * legendSpacingVertical;

      p.fill(stock.color);
      p.noStroke();
      p.rect(legendX, currentY - legendBoxSize / 2, legendBoxSize, legendBoxSize);

      p.fill('#334155');
      p.text(stock.symbol, legendX + legendBoxSize + 5, currentY);
    });
  };

  p.windowResized = () => {
    const canvas = document.querySelector('.canvas-placeholder');
    if (canvas.offsetWidth !== canvasWidth) {
      p.resizeCanvas(canvas.offsetWidth, 400);
      canvasWidth = canvas.offsetWidth;
      p.redraw();
    }
  };
};

new p5(sketch);

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