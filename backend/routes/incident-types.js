const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const { validateIncidentType } = require('../utils/validation');
const { backupFile } = require('../utils/backup');
const logger = require('../utils/logger');
const { readIncidentTypes, writeIncidentTypes } = require('../utils/dataAccess');
const { getNextId } = require('../utils/sequence');

const INCIDENT_TYPES_FILE = path.join(__dirname, '../data/incident-types.json');

// Get all incident types
router.get('/', async (req, res) => {
  try {
    const data = await fs.readFile(INCIDENT_TYPES_FILE, 'utf8');
    const incidentTypes = JSON.parse(data);
    res.json(incidentTypes);
  } catch (error) {
    logger.error('Error reading incident types:', error);
    res.status(500).json({ error: 'Failed to read incident types' });
  }
});

// Get single incident type
router.get('/:id', async (req, res) => {
    try {
        const data = await fs.readFile(INCIDENT_TYPES_FILE, 'utf8');
        const incidentTypes = JSON.parse(data);
        const type = incidentTypes.find(t => t.id === parseInt(req.params.id));
        if (!type) {
            return res.status(404).json({ error: 'Incident type not found' });
        }
        res.json(type);
    } catch (error) {
        logger.error('Error reading incident type:', error);
        res.status(500).json({ error: 'Failed to fetch incident type' });
    }
});

// Create new incident type
router.post('/', async (req, res) => {
  try {
    const { name, description = '' } = req.body;
    
    if (!validateIncidentType(req.body)) {
      return res.status(400).json({ error: 'Invalid incident type data' });
    }

    const data = await fs.readFile(INCIDENT_TYPES_FILE, 'utf8');
    const incidentTypes = JSON.parse(data);
    
    // Find highest existing ID
    const maxId = Math.max(...incidentTypes.map(type => type.id), 0);
    
    const newIncidentType = {
      id: maxId + 1,
      name,
      description,
      created_at: new Date().toISOString()
    };

    incidentTypes.push(newIncidentType);
    
    await backupFile('incident-types.json');
    await fs.writeFile(INCIDENT_TYPES_FILE, JSON.stringify(incidentTypes, null, 2));
    
    logger.info(`Created new incident type with ID: ${newIncidentType.id}`);
    res.status(201).json(newIncidentType);
  } catch (error) {
    logger.error('Error creating incident type:', error);
    res.status(500).json({ error: 'Failed to create incident type' });
  }
});

// Update incident type
router.put('/:id', async (req, res) => {
  try {
    const incidentTypes = await readIncidentTypes();
    const typeId = parseInt(req.params.id);
    const { name, description, fault_category } = req.body;

    const typeIndex = incidentTypes.findIndex(type => type.id === typeId);
    if (typeIndex === -1) {
      return res.status(404).json({ error: 'Incident type not found' });
    }

    // Check for duplicate names
    const duplicateName = incidentTypes.find(
      type => type.name === name && type.id !== typeId
    );
    if (duplicateName) {
      return res.status(400).json({ error: 'An incident type with this name already exists' });
    }

    const updatedType = {
      ...incidentTypes[typeIndex],
      name: name || incidentTypes[typeIndex].name,
      description: description || incidentTypes[typeIndex].description,
      fault_category: fault_category || incidentTypes[typeIndex].fault_category,
      updated_at: new Date().toISOString()
    };

    incidentTypes[typeIndex] = updatedType;
    await writeIncidentTypes(incidentTypes);

    res.json(updatedType);
  } catch (error) {
    console.error('Error updating incident type:', error);
    res.status(500).json({ error: 'Failed to update incident type' });
  }
});

// Delete incident type
router.delete('/:id', async (req, res) => {
  try {
    const typeId = parseInt(req.params.id);
    
    const data = await fs.readFile(INCIDENT_TYPES_FILE, 'utf8');
    const incidentTypes = JSON.parse(data);
    
    const typeIndex = incidentTypes.findIndex(type => type.id === typeId);
    if (typeIndex === -1) {
      return res.status(404).json({ error: 'Incident type not found' });
    }

    incidentTypes.splice(typeIndex, 1);
    
    await backupFile('incident-types.json');
    await fs.writeFile(INCIDENT_TYPES_FILE, JSON.stringify(incidentTypes, null, 2));
    
    logger.info(`Deleted incident type with ID: ${typeId}`);
    res.status(204).send();
  } catch (error) {
    logger.error('Error deleting incident type:', error);
    res.status(500).json({ error: 'Failed to delete incident type' });
  }
});

module.exports = router; 