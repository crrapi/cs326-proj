import { dbPromise } from "./indexedDBSetup";

export async function addStockTransaction(ticker, purchaseDate, quantity, totalPrice, buyFlag) {
    const db = await dbPromise;

    const transaction = db.transaction("transactions", "readwrite");
    const store = transaction.objectStore("transactions");

    const stockEntry = { ticker, quantity, totalPrice, buyFlag, purchaseDate };

    const request = store.add(stockEntry);

    request.onsuccess = () => console.log(`Transaction added for ${ticker}`);
    request.onerror = (event) => console.error("Failed to add transaction", event);
}

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
