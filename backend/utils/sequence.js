const fs = require('fs').promises;
const path = require('path');
const { logger } = require('./logger');

const SEQUENCE_FILE = path.join(__dirname, '../data/sequences.json');

// Single declaration of initializeSequences
const initializeSequences = async () => {
  try {
    await fs.access(SEQUENCE_FILE);
  } catch {
    await fs.writeFile(SEQUENCE_FILE, JSON.stringify({
      jobs: 0,
      incidents: 0,
      operators: 0,
      pads: 0
    }));
  }
};

const getNextId = async (sequenceName) => {
  try {
    await initializeSequences();
    
    const sequences = JSON.parse(await fs.readFile(SEQUENCE_FILE, 'utf8'));
    
    // Increment the sequence
    sequences[sequenceName] = (sequences[sequenceName] || 0) + 1;
    
    // Write back to file
    await fs.writeFile(SEQUENCE_FILE, JSON.stringify(sequences, null, 2));
    
    return sequences[sequenceName];
  } catch (error) {
    logger.error(`Error getting next ID for ${sequenceName}:`, error);
    throw new Error(`Failed to generate unique ID for ${sequenceName}`);
  }
};

async function writeSequences(sequences) {
    try {
        await fs.writeFile(SEQUENCE_FILE, JSON.stringify(sequences, null, 2));
    } catch (error) {
        console.error('Error writing sequences:', error);
        throw error;
    }
}

async function resetSequence(entityType) {
    const sequences = await readSequences();
    sequences[entityType] = 0;
    await writeSequences(sequences);
}

// Helper function to find next available ID including gaps
function findNextAvailableId(existingIds) {
    if (existingIds.length === 0) return 0;
    
    // Sort IDs in ascending order
    const sortedIds = existingIds.sort((a, b) => a - b);
    
    // Find first gap or return next number after highest
    for (let i = 1; i <= sortedIds[sortedIds.length - 1]; i++) {
        if (!sortedIds.includes(i)) {
            return i - 1; // Return previous number since getNextId will increment
        }
    }
    
    return sortedIds[sortedIds.length - 1]; // Return highest ID
}

module.exports = {
    getNextId,
    resetSequence,
    initializeSequences
}; 