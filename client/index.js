import './style.css';
import p5 from 'p5';

const API_BASE_URL = 'http://localhost:3000/api';

let graphData = [];
let transformedData = [];
let uniqueStocks = [];
let maxTotalValue = 0;
let canvasWidth = 0;
let p5Instance = null;

async function fetchAndUpdateGraphData() {
  console.log("Fetching historical data...");
  try {
    const response = await fetch(`${API_BASE_URL}/portfolio/historical`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const fetchedData = await response.json();
    console.log("Fetched data:", fetchedData);

    graphData = fetchedData.map(dailyData => ({
      ...dailyData,
      date: new Date(dailyData.date)
    }));

    if (p5Instance) {
      processGraphData(p5Instance);
      p5Instance.redraw();
    }

  } catch (error) {
    console.error("Failed to fetch historical portfolio data:", error);
    graphData = [];
    if (p5Instance) {
      console.error("Error fetching data, graph cannot be drawn.");
      p5Instance.redraw();
    }
  }
}

function processGraphData(p) {
  transformedData = [];
  maxTotalValue = 0;
  let stockSet = new Map();

  if (!graphData || graphData.length === 0) {
    console.log("No graph data to process.");
    uniqueStocks = [];
    return;
  }

  graphData.forEach(dailyData => {
    const values = {};
    let totalValueThisStep = 0;

    if (!Array.isArray(dailyData.stocks)) {
      console.warn("dailyData.stocks is not an array:", dailyData);
      return;
    }

    dailyData.stocks.forEach(stock => {
      const value = stock.price * stock.shares;
      values[stock.symbol] = value;
      totalValueThisStep += value;

      if (!stockSet.has(stock.symbol)) {
        stockSet.set(stock.symbol, { symbol: stock.symbol, color: stock.color || '#cccccc' });
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
  console.log("Processed Data:", transformedData);
  console.log("Unique Stocks:", uniqueStocks);
  console.log("Max Total Value:", maxTotalValue);

}


const sketch = (p) => {
  const padding = 60;

  p.setup = () => {
    const canvasContainer = document.querySelector('.canvas-placeholder');
    if (!canvasContainer) {
      console.error("Canvas placeholder element not found!");
      return;
    }
    p.createCanvas(canvasContainer.offsetWidth, 400).parent(canvasContainer);
    p.textFont('sans-serif');
    canvasWidth = canvasContainer.offsetWidth;

    p5Instance = p;

    fetchAndUpdateGraphData();

    p.noLoop();
  };

  p.draw = () => {
    p.background('#f8fafc');

    p.stroke('#e2e8f0');
    p.strokeWeight(0.5);

    const numYLabels = 5;
    for (let i = 0; i <= numYLabels; i++) {
      const y = p.map(i, 0, numYLabels, p.height - padding, padding);
      if (y < padding / 2) continue;
      p.line(padding, y, p.width - padding / 2, y);
    }

    p.stroke('#334155');
    p.strokeWeight(1);
    p.line(padding, padding / 2, padding, p.height - padding);
    p.line(padding, p.height - padding, p.width - padding / 2, p.height - padding);


    if (!transformedData || transformedData.length < 2) {
      p.fill('#64748b');
      p.noStroke();
      p.textAlign(p.CENTER, p.CENTER);
      p.textSize(14);
      const message = (graphData === null || graphData.length === 0) ? "No portfolio data available." : "Not enough data points to draw graph.";
      p.text(message, p.width / 2, p.height / 2);
      drawAxisLabels(p, numYLabels);
      return;
    }

    const dataLength = transformedData.length;
    let cumulativeY = new Array(dataLength).fill(p.height - padding);

    const topStrokeWeight = 2;
    const fillLightenFactor = 0.45;
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
        p.vertex(x, p.max(padding / 2, currentTopY));
      }

      const endX = p.map(dataLength - 1, 0, dataLength - 1, padding, p.width - padding);
      p.vertex(endX, cumulativeY[dataLength - 1]);

      for (let i = dataLength - 1; i >= 0; i--) {
        const x = p.map(i, 0, dataLength - 1, padding, p.width - padding);
        p.vertex(x, p.min(p.height - padding, cumulativeY[i]));
      }

      p.endShape(p.CLOSE);

      p.stroke(stock.color);
      p.strokeWeight(topStrokeWeight);
      p.noFill();
      p.beginShape();
      for (let i = 0; i < dataLength; i++) {
        const x = p.map(i, 0, dataLength - 1, padding, p.width - padding);
        p.vertex(x, p.constrain(nextCumulativeY[i], padding / 2, p.height - padding));
      }
      p.endShape();

      cumulativeY = nextCumulativeY;
    });

    drawAxisLabels(p, numYLabels);
    drawLegend(p);

  };

  function drawAxisLabels(p, numYLabels) {
    p.fill('#334155');
    p.noStroke();
    p.textSize(10);

    p.textAlign(p.RIGHT, p.CENTER);
    const effectiveMaxY = maxTotalValue / 1.05;
    for (let i = 0; i <= numYLabels; i++) {
      const value = p.map(i, 0, numYLabels, 0, effectiveMaxY);
      const y = p.map(value, 0, maxTotalValue, p.height - padding, padding);
      if (y < padding / 2) continue;
      p.text(`$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, padding - 8, y);
    }

    p.textAlign(p.CENTER, p.TOP);
    const dataLength = transformedData.length;
    if (dataLength > 0) {
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
        if (!dataPoint || !dataPoint.timestamp) continue;

        const x = p.map(index, 0, dataLength - 1, padding, p.width - padding);

        const dateLabel = dataPoint.timestamp.toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric'
        });
        p.text(dateLabel, x, p.height - padding + 8);
      }
    }
  }

  function drawLegend(p) {
    const legendX = padding;
    const legendY = padding / 2 - 15;
    const legendBoxSize = 10;
    const legendSpacingHorizontal = 80;
    const legendPadding = 5;


    p.textSize(11);
    p.textAlign(p.LEFT, p.CENTER);
    let currentX = legendX;

    uniqueStocks.forEach((stock) => {
      const textWidth = p.textWidth(stock.symbol);
      const itemWidth = legendBoxSize + legendPadding + textWidth;
      if (currentX + itemWidth > p.width - padding) {
        console.warn("Legend might overflow canvas width");
      }

      p.fill(stock.color);
      p.noStroke();
      p.rect(currentX, legendY - legendBoxSize / 2, legendBoxSize, legendBoxSize);

      p.fill('#334155');
      p.text(stock.symbol, currentX + legendBoxSize + legendPadding, legendY);

      currentX += itemWidth + legendSpacingHorizontal;
    });
  }

  p.windowResized = () => {
    const canvasContainer = document.querySelector('.canvas-placeholder');
    if (!canvasContainer) return;

    const newWidth = canvasContainer.offsetWidth;
    if (newWidth !== canvasWidth) {
      p.resizeCanvas(newWidth, 400);
      canvasWidth = newWidth;
      p.redraw();
    }
  };
};

new p5(sketch);

document.addEventListener('portfolioUpdated', () => {
  console.log("Received portfolioUpdated event. Fetching new data...");
  fetchAndUpdateGraphData();
  if (typeof window.updatePortfolioStats === 'function') {
    window.updatePortfolioStats();
  } else {
    console.warn("updatePortfolioStats function not found on window object.");
  }
});

// Optionally, fetch data on initial load (redundant if p5 setup does it, but safe)
// document.addEventListener('DOMContentLoaded', () => {
//     if (!p5Instance) { // Only if p5 hasn't initialized yet
//         fetchAndUpdateGraphData();
//     }
// });