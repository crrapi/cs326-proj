
const fs = require('fs').promises;
const path = require('path');

const dataFilePath = path.join(__dirname, 'data.json');


const defaultData = {
    defaultUser: {
        holdings: [],

    }
};

async function readData() {
    try {
        await fs.access(dataFilePath);
        const jsonData = await fs.readFile(dataFilePath, 'utf-8');
        if (!jsonData) {
            return JSON.parse(JSON.stringify(defaultData));
        }
        const parsedData = JSON.parse(jsonData);

        if (!parsedData.defaultUser) parsedData.defaultUser = { holdings: [] };
        if (!parsedData.defaultUser.holdings) parsedData.defaultUser.holdings = [];
        return parsedData;
    } catch (error) {

        if (error.code === 'ENOENT') {
            console.log('Data file not found, initializing with default structure.');
            await writeData(defaultData);
            return JSON.parse(JSON.stringify(defaultData));
        } else {
            console.error("Error reading data file:", error);
            return JSON.parse(JSON.stringify(defaultData));
        }
    }
}

async function writeData(data) {
    try {
        const jsonData = JSON.stringify(data, null, 2);
        await fs.writeFile(dataFilePath, jsonData, 'utf-8');
    } catch (error) {
        console.error("Error writing data file:", error);
        throw new Error("Failed to write data to storage.");
    }
}

module.exports = {
    readData,
    writeData,
};