const express = require('express');
const router = express.Router();
const { readPads, writePads, readJobs, writeJobs } = require('../utils/dataAccess');
const { validatePadData } = require('../middleware/validation');
const { updateRelatedData } = require('../utils/dataConsistency');
const { logger } = require('../utils/logger');
const { backupFile } = require('../utils/backup');

// Get all pads
router.get('/', async (req, res) => {
    try {
        const pads = await readPads();
        res.json(pads);
    } catch (error) {
        logger.error('Error fetching pads:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get single pad
router.get('/:id', async (req, res) => {
    try {
        const pads = await readPads();
        const pad = pads.find(p => p.id === parseInt(req.params.id));
        if (!pad) {
            logger.warn(`Pad not found with ID: ${req.params.id}`);
            return res.status(404).json({ error: 'Pad not found' });
        }
        res.json(pad);
    } catch (error) {
        logger.error('Error fetching pad:', error);
        res.status(500).json({ error: 'Failed to fetch pad' });
    }
});

// Create new pad
router.post('/', validatePadData, async (req, res) => {
    try {
        const pads = await readPads();
        const newPad = {
            id: Math.max(...pads.map(p => p.id), 0) + 1,
            ...req.validatedData
        };
        
        // Create backup before modification
        await backupFile('pads.json');
        
        await writePads([...pads, newPad]);
        logger.info(`Created new pad with ID: ${newPad.id}`);
        res.status(201).json(newPad);
    } catch (error) {
        logger.error('Error creating pad:', error);
        res.status(500).json({ error: error.message });
    }
});

// Update pad
router.put('/:id', validatePadData, async (req, res) => {
    try {
        const padId = parseInt(req.params.id);
        const pads = await readPads();
        const padIndex = pads.findIndex(p => p.id === padId);
        
        if (padIndex === -1) {
            logger.warn(`Attempt to update non-existent pad with ID: ${padId}`);
            return res.status(404).json({ error: 'Pad not found' });
        }

        // Create backup before modification
        await backupFile('pads.json');

        const updatedPad = {
            ...pads[padIndex],
            ...req.validatedData
        };
        pads[padIndex] = updatedPad;
        
        // Update related jobs
        const updatedJobs = await updateRelatedData('pad', padId, updatedPad);
        if (updatedJobs) {
            await backupFile('jobs.json');
            await writeJobs(updatedJobs);
        }
        
        await writePads(pads);
        logger.info(`Updated pad with ID: ${padId}`);
        res.json(updatedPad);
    } catch (error) {
        logger.error('Error updating pad:', error);
        res.status(500).json({ error: error.message });
    }
});

// Delete pad
router.delete('/:id', async (req, res) => {
    try {
        const padId = parseInt(req.params.id);
        const [pads, jobs] = await Promise.all([readPads(), readJobs()]);
        
        // Check if pad has active jobs
        const activeJobs = jobs.filter(j => j.pad_id === padId && !j.end_date);
        if (activeJobs.length > 0) {
            logger.warn(`Attempt to delete pad ${padId} with active jobs`);
            return res.status(400).json({ error: 'Cannot delete pad with active jobs' });
        }
        
        const padIndex = pads.findIndex(p => p.id === padId);
        if (padIndex === -1) {
            logger.warn(`Attempt to delete non-existent pad with ID: ${padId}`);
            return res.status(404).json({ error: 'Pad not found' });
        }
        
        // Create backup before modification
        await backupFile('pads.json');
        
        // Soft delete
        pads[padIndex] = {
            ...pads[padIndex],
            deleted: true
        };
        
        await writePads(pads);
        logger.info(`Soft deleted pad with ID: ${padId}`);
        res.json({ message: 'Pad deleted successfully' });
    } catch (error) {
        logger.error('Error deleting pad:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router; 