const fs = require('fs').promises;
const path = require('path');

const dataFilePath = path.join(__dirname, 'data.json');

const defaultData = {
    defaultUser: {
        holdings: [],
        cashWithdrawnFromSales: 0,
    }
};

async function readData() {
    try {
        await fs.access(dataFilePath);
        const jsonData = await fs.readFile(dataFilePath, 'utf-8');

        if (!jsonData || jsonData.trim() === '') {
            console.log('Data file is empty, initializing with default structure.');
            await writeData(defaultData);
            return JSON.parse(JSON.stringify(defaultData));
        }

        const parsedData = JSON.parse(jsonData);

        if (!parsedData.defaultUser) {
            parsedData.defaultUser = { holdings: [], cashWithdrawnFromSales: 0 };
        }
        if (!parsedData.defaultUser.holdings) {
            parsedData.defaultUser.holdings = [];
        }
        if (typeof parsedData.defaultUser.cashWithdrawnFromSales !== 'number') {
            parsedData.defaultUser.cashWithdrawnFromSales = 0;
        }
         if (!Array.isArray(parsedData.defaultUser.holdings)) {
            console.warn("User holdings data was not an array, resetting to empty array.");
            parsedData.defaultUser.holdings = [];
         }


        return parsedData;
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.log('Data file not found, initializing with default structure.');
            await writeData(defaultData);
            return JSON.parse(JSON.stringify(defaultData));
        } else {
            console.error("Error reading data file:", error);
             console.warn("Returning default data due to read error.");
            return JSON.parse(JSON.stringify(defaultData));
        }
    }
}

module.exports = {
    readData,
};