const DB_NAME = 'StockPortfolioDB';
const STORE_NAME = 'portfolio';
const DB_VERSION = 1;

let db;

function openDB() {
    return new Promise((resolve, reject) => {
        if (db) {
            resolve(db);
            return;
        }

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = (event) => {
            console.error("Database error:", event.target.error);
            reject("Database error: " + event.target.error);
        };

        request.onsuccess = (event) => {
            db = event.target.result;
            console.log("Database opened successfully");
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            console.log("Database upgrade needed");
            const tempDb = event.target.result;

            if (!tempDb.objectStoreNames.contains(STORE_NAME)) {
                const objectStore = tempDb.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
                objectStore.createIndex('ticker', 'ticker', { unique: false });
                objectStore.createIndex('purchaseDate', 'purchaseDate', { unique: false });
                console.log(`Object store "${STORE_NAME}" created.`);
            }
        };
    });
}

async function addStock(stock) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.add(stock);

        request.onsuccess = (event) => {
            console.log("Stock added successfully with ID:", event.target.result);
            resolve(event.target.result); 
        };

        request.onerror = (event) => {
            console.error("Error adding stock:", event.target.error);
            reject("Error adding stock: " + event.target.error);
        };
    });
}

async function getAllStocks() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onsuccess = (event) => {
            console.log("Stocks retrieved successfully:", event.target.result);
            resolve(event.target.result || []); 
        };

        request.onerror = (event) => {
            console.error("Error retrieving stocks:", event.target.error);
            reject("Error retrieving stocks: " + event.target.error);
        };
    });
}

async function deleteStock(id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(id);

        request.onsuccess = () => {
            console.log(`Stock with ID ${id} deleted successfully.`);
            resolve();
        };

        request.onerror = (event) => {
            console.error(`Error deleting stock with ID ${id}:`, event.target.error);
            reject(`Error deleting stock: ${event.target.error}`);
        };
    });
}

export { openDB, addStock, getAllStocks, deleteStock };