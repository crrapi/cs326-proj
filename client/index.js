import './style.css';
import p5 from 'p5';

const API_BASE_URL = 'http://localhost:3000/api';

let rawGraphData = [];
let transformedData = [];
let uniqueStocks = [];
let maxTotalValue = 0;
let canvasWidth = 0;
let p5Instance = null;
let isFetchingGraphData = false;

const graphStatusElement = document.getElementById('graph-status');
const generateGraphButton = document.getElementById('generate-graph-button');

async function fetchAndUpdateGraphData() {
    if (isFetchingGraphData) {
        console.log("Graph data fetch already in progress.");
        if (graphStatusElement) graphStatusElement.textContent = "Fetch already in progress...";
        return;
    }
    isFetchingGraphData = true;
    console.log("Fetching real-time graph data...");
    if (graphStatusElement) {
        graphStatusElement.textContent = "Fetching data from API...";
        graphStatusElement.style.color = '#f59e0b';
    }

    try {
        const response = await fetch(`${API_BASE_URL}/portfolio/realtime-graph`);

        if (!response.ok) {
            let errorData = { message: `HTTP error! status: ${response.status}` };
            try {
                errorData = await response.json();
            } catch (e) { /* ignore json parsing error */ }
            throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }

        const fetchedData = await response.json();
        console.log("Fetched real-time graph data:", fetchedData);

        rawGraphData = fetchedData;

        if (p5Instance) {
            processGraphData(p5Instance);
            p5Instance.redraw();
            if (graphStatusElement) {
                graphStatusElement.textContent = `Graph updated: ${new Date().toLocaleTimeString()}`;
                graphStatusElement.style.color = 'green';
            }
        } else {
             console.warn("p5 instance not ready when data was fetched.");
             if (graphStatusElement) {
                graphStatusElement.textContent = "Data fetched, waiting for graph...";
                graphStatusElement.style.color = '#f59e0b';
             }
        }

    } catch (error) {
        console.error("Failed to fetch real-time graph data:", error);
        rawGraphData = [];
        transformedData = [];
        uniqueStocks = [];
        maxTotalValue = 0;
        if (p5Instance) {
            p5Instance.redraw();
        }
        if (graphStatusElement) {
            graphStatusElement.textContent = `Error fetching graph data: ${error.message}`;
            graphStatusElement.style.color = 'red';
        }
    } finally {
        isFetchingGraphData = false;
         setTimeout(() => {
             if (graphStatusElement && (graphStatusElement.style.color === 'green' || graphStatusElement.style.color === 'red')) {
                graphStatusElement.textContent = 'Ready to generate graph.';
                graphStatusElement.style.color = '#64748b';
             }
         }, 7000);
    }
}

function processGraphData(p) {
    transformedData = [];
    maxTotalValue = 0;
    let stockSet = new Map();

    if (!rawGraphData || !Array.isArray(rawGraphData) || rawGraphData.length === 0) {
        console.log("No raw graph data to process.");
        uniqueStocks = [];
        return;
    }

    rawGraphData.forEach(dailyData => {
        const values = {};
        let totalValueThisDay = 0;

        if (!dailyData || typeof dailyData.date !== 'string' || !Array.isArray(dailyData.stocks)) {
            console.warn("Skipping invalid daily data point:", dailyData);
            return;
        }

        dailyData.stocks.forEach(stock => {
            if (!stock || typeof stock.symbol !== 'string' || typeof stock.price !== 'number' || typeof stock.shares !== 'number') {
                 console.warn("Skipping invalid stock data within a day:", stock, "on date", dailyData.date);
                return;
            }

            const value = stock.price * stock.shares;
            values[stock.symbol] = value;
            totalValueThisDay += value;

            if (!stockSet.has(stock.symbol)) {
                stockSet.set(stock.symbol, {
                    symbol: stock.symbol,
                    color: stock.color || '#cccccc'
                });
            }
        });

        transformedData.push({
             timestamp: new Date(dailyData.date + 'T00:00:00'),
            values: values,
            totalValue: totalValueThisDay
        });

        if (totalValueThisDay > maxTotalValue) {
            maxTotalValue = totalValueThisDay;
        }
    });

    maxTotalValue *= 1.05;
    if (maxTotalValue <= 0) maxTotalValue = 1;

    uniqueStocks = Array.from(stockSet.values());

    console.log("Processed Data for graph:", transformedData);
    console.log("Unique Stocks for legend:", uniqueStocks);
    console.log("Max Total Value for Y-axis:", maxTotalValue);
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

        p.noLoop();

        if (graphStatusElement) graphStatusElement.textContent = 'Ready to generate graph.';
        p.redraw();
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
             let message = "Click 'Generate/Update Graph' to load data.";
             if (isFetchingGraphData) {
                 message = "Loading graph data...";
             } else if (rawGraphData && rawGraphData.length > 0 && transformedData.length < 2) {
                 message = "Not enough historical data points to draw graph.";
             } else if (rawGraphData && rawGraphData.length === 0 && graphStatusElement && graphStatusElement.textContent.startsWith("Error")) {
             } else if (rawGraphData && rawGraphData.length === 0 && !isFetchingGraphData) {
                 message = "No portfolio data found or API fetch failed.";
             }

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

                const valueHeight = p.map(stockValue, 0, maxTotalValue, 0, p.height - padding * 1.5);

                const currentTopY = cumulativeY[i] - valueHeight;

                nextCumulativeY[i] = currentTopY;

                const x = p.map(i, 0, dataLength - 1, padding, p.width - padding);
                p.vertex(x, p.max(padding / 2, currentTopY));
            }

            const endX = p.map(dataLength - 1, 0, dataLength - 1, padding, p.width - padding);
            p.vertex(endX, nextCumulativeY[dataLength - 1]);

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
        const effectiveMaxY = maxTotalValue > 1 ? maxTotalValue / 1.05 : 0;
        for (let i = 0; i <= numYLabels; i++) {
            const value = p.map(i, 0, numYLabels, 0, effectiveMaxY);
            const y = p.map(value, 0, maxTotalValue, p.height - padding, padding);
            if (y < padding / 2) continue;
             let labelText = `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
             if (value > 1e9) labelText = `$${(value / 1e9).toFixed(1)}B`;
             else if (value > 1e6) labelText = `$${(value / 1e6).toFixed(1)}M`;
             else if (value > 1e3) labelText = `$${(value / 1e3).toFixed(1)}K`;

            p.text(labelText, padding - 8, y);
        }

        p.textAlign(p.CENTER, p.TOP);
        const dataLength = transformedData.length;
        if (dataLength > 0) {
             const approxLabelWidth = 50;
             const maxPossibleLabels = Math.floor((p.width - padding * 1.5) / approxLabelWidth);
             const numXLabels = Math.min(dataLength, Math.max(2, maxPossibleLabels), 7);

            for (let i = 0; i < numXLabels; i++) {
                let index;
                if (numXLabels <= 1) {
                    index = 0;
                } else {
                    index = Math.round(p.map(i, 0, numXLabels - 1, 0, dataLength - 1));
                }
                index = Math.max(0, Math.min(index, dataLength - 1));


                const dataPoint = transformedData[index];
                if (!dataPoint || !dataPoint.timestamp || isNaN(dataPoint.timestamp.getTime())) continue;

                const x = p.map(index, 0, dataLength - 1, padding, p.width - padding);

                const dateLabel = dataPoint.timestamp.toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric'
                });
                p.text(dateLabel, x, p.height - padding + 8);
            }
        } else {
             p.textAlign(p.CENTER, p.TOP);
             p.text("Date Range", p.width/2, p.height - padding + 8);
        }
    }

    function drawLegend(p) {
        if (uniqueStocks.length === 0) return;

        const legendXStart = padding;
        const legendY = padding / 2 - 15;
        const legendBoxSize = 10;
        const legendSpacingHorizontal = 15;
        const legendTextPadding = 5;

        p.textSize(11);
        p.textAlign(p.LEFT, p.CENTER);
        let currentX = legendXStart;

        uniqueStocks.forEach((stock) => {
            const textWidth = p.textWidth(stock.symbol);
            const itemWidth = legendBoxSize + legendTextPadding + textWidth;

            if (currentX + itemWidth > p.width - padding / 2 && currentX !== legendXStart) {
                 console.warn("Legend might overflow canvas width or wrap crudely.");
             }

            p.fill(stock.color);
            p.noStroke();
            p.rect(currentX, legendY - legendBoxSize / 2, legendBoxSize, legendBoxSize);

            p.fill('#334155');
            p.text(stock.symbol, currentX + legendBoxSize + legendTextPadding, legendY);

            currentX += itemWidth + legendSpacingHorizontal;
        });
    }

    p.windowResized = () => {
        const canvasContainer = document.querySelector('.canvas-placeholder');
        if (!canvasContainer) return;

        const newWidth = canvasContainer.offsetWidth;
        if (newWidth > 0 && newWidth !== canvasWidth) {
             p.resizeCanvas(newWidth, 400);
             canvasWidth = newWidth;
             p.redraw();
             console.log(`Resized canvas to ${newWidth}x400`);
        }
    };
};

new p5(sketch);

if (generateGraphButton) {
    generateGraphButton.addEventListener('click', () => {
        fetchAndUpdateGraphData();
         if (typeof window.updatePortfolioStats === 'function') {
            window.updatePortfolioStats();
         }
    });
} else {
    console.error("Generate Graph button not found!");
}

document.addEventListener('portfolioUpdated', () => {
    console.log("Received portfolioUpdated event. User should click 'Generate/Update Graph' to see changes.");
    if (typeof window.updatePortfolioStats === 'function') {
        window.updatePortfolioStats();
    } else {
        console.warn("updatePortfolioStats function not found on window object.");
    }
     if (graphStatusElement) {
         graphStatusElement.textContent = 'Portfolio changed. Click Generate/Update Graph.';
         graphStatusElement.style.color = '#f59e0b';
     }
});

document.addEventListener('DOMContentLoaded', () => {
     if (graphStatusElement && !generateGraphButton?.disabled) {
         graphStatusElement.textContent = 'Ready to generate graph.';
         graphStatusElement.style.color = '#64748b';
     }
     if (typeof window.updatePortfolioStats === 'function') {
         window.updatePortfolioStats();
     }
 });