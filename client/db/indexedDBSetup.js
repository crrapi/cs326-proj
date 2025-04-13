export const dbPromise = new Promise((resolve, reject) => {
    const indexedDB =
        window.indexedDB ||
        window.mozIndexedDB ||
        window.webkitIndexedDB ||
        window.msIndexedDB;

    const request = indexedDB.open("StockDatabase", 1);

    request.onerror = (event) => {
        console.error("IndexedDB error:", event);
        reject(event);
    };

    request.onupgradeneeded = () => {
        const db = request.result;
        const store = db.createObjectStore("transactions", {
            keyPath: "id",
            autoIncrement: true,
        });

        store.createIndex("ticker", "ticker", { unique: false });
        store.createIndex("date", "date", { unique: false });
        store.createIndex("type", "type", { unique: false });
        store.createIndex("ticker_type", ["ticker", "type"], { unique: false });
    };

    request.onsuccess = () => {
        resolve(request.result);
        console.log("Success")
    };
});
