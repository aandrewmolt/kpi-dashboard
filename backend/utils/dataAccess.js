const fs = require('fs').promises;
const path = require('path');
const { logger } = require('./logger');

const DATA_DIR = path.join(__dirname, '../data');

// Ensure data directory exists
const ensureDataDir = async () => {
    try {
        await fs.access(DATA_DIR);
    } catch {
        await fs.mkdir(DATA_DIR, { recursive: true });
    }
};

// Read data from a JSON file
const readData = async (filename) => {
    try {
        const filePath = path.join(DATA_DIR, filename);
        const data = await fs.readFile(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') {
            logger.warn(`File not found: ${filename}, returning empty array`);
            return [];
        }
        throw error;
    }
};

// Write data to a JSON file
const writeData = async (filename, data) => {
    try {
        await ensureDataDir();
        const filePath = path.join(DATA_DIR, filename);
        await fs.writeFile(filePath, JSON.stringify(data, null, 2));
    } catch (error) {
        logger.error(`Error writing ${filename}:`, error);
        throw error;
    }
};

// Specific functions for each data type using the generic read/write functions
const readPads = () => readData('pads.json');
const writePads = (data) => writeData('pads.json', data);
const readJobs = () => readData('jobs.json');
const writeJobs = (data) => writeData('jobs.json', data);
const readOperators = () => readData('operators.json');
const writeOperators = (data) => writeData('operators.json', data);
const readIncidents = () => readData('incidents.json');
const writeIncidents = (data) => writeData('incidents.json', data);
const readIncidentTypes = () => readData('incident-types.json');
const writeIncidentTypes = (data) => writeData('incident-types.json', data);

module.exports = {
    readPads,
    writePads,
    readJobs,
    writeJobs,
    readOperators,
    writeOperators,
    readIncidents,
    writeIncidents,
    readIncidentTypes,
    writeIncidentTypes
}; 