import { dbPromise } from "./indexedDBSetup";

//Adds stock transaction to DB
export async function addStockTransaction(ticker, purchaseDate, quantity, totalPrice, buyFlag) {
    const db = await dbPromise;

    const transaction = db.transaction("transactions", "readwrite");
    const store = transaction.objectStore("transactions");

    const stockEntry = { ticker, quantity, totalPrice, buyFlag, purchaseDate };

    const request = store.add(stockEntry);

    request.onsuccess = () => console.log(`Transaction added for ${ticker}`);
    request.onerror = (event) => console.error("Failed to add transaction", event);
}

//Gets how many of a current stock you have own
export async function getCurrentHolding(ticker) {
    const db = await dbPromise;

    return new Promise((resolve, reject) => {
        const transaction = db.transaction("transactions", "readonly");
        const store = transaction.objectStore("transactions");
        const index = store.index("ticker");

        const request = index.getAll(ticker);

        request.onsuccess = () => {
            const transactions = request.result;
            let netQuantity = 0;

            for (const tx of transactions) {
                if (tx.type === "buy") netQuantity += tx.quantity;
                else if (tx.type === "sell") netQuantity -= tx.quantity;
            }

            resolve(netQuantity);
        };

        request.onerror = (event) => {
            console.error("Error reading holdings", event);
            reject(event);
        };
    });
}

//Gets how much money your portfolio has in total
export async function getTotalPortfolioValue() {
    const db = await dbPromise;

    return new Promise((resolve, reject) => {
        const transaction = db.transaction("transactions", "readonly");
        const store = transaction.objectStore("transactions");

        const request = store.getAll();

        request.onsuccess = () => {
            const allTransactions = request.result;
            let netValue = 0;

            for (const tx of allTransactions) {
                if (tx.buyFlag) netValue += tx.totalPrice;
                else netValue -= tx.totalPrice;
            }
            resolve(netValue);
        };

        request.onerror = (event) => {
            console.error("Error reading holdings", event);
            reject(event);
        };
    });
}

//Gets how much many stocks your portfolio has in total
export async function getTotalPortfolioStocksQuantity() {
    const db = await dbPromise;

    return new Promise((resolve, reject) => {
        const transaction = db.transaction("transactions", "readonly");
        const store = transaction.objectStore("transactions");

        const request = store.getAll();

        request.onsuccess = () => {
            const allTransactions = request.result;
            let netQuantityStocks = 0;

            for (const tx of allTransactions) {
                if (tx.buyFlag) netQuantityStocks += Number(tx.quantity);
                else netQuantityStocks -= Number(tx.quantity);
            }
            resolve(netQuantityStocks);
        };

        request.onerror = (event) => {
            console.error("Error reading holdings", event);
            reject(event);
        };
    });
}