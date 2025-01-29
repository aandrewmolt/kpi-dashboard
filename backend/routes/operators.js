const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const { getNextId } = require('../utils/sequence');
const { readOperators, writeOperators } = require('../utils/dataAccess');
const { logger } = require('../utils/logger');

const OPERATORS_FILE = path.join(__dirname, '../data/operators.json');
const JOBS_FILE = path.join(__dirname, '../data/jobs.json');
const PADS_FILE = path.join(__dirname, '../data/pads.json');

// Helper functions to read/write data
async function readJobs() {
    try {
        const data = await fs.readFile(JOBS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading jobs:', error);
        return [];
    }
}

async function readPads() {
    try {
        const data = await fs.readFile(PADS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading pads:', error);
        return [];
    }
}

// Get all operators
router.get('/', async (req, res) => {
    try {
        const operators = await readOperators();
        res.json(operators);
    } catch (error) {
        logger.error('Error fetching operators:', error);
        res.status(500).json({ error: 'Failed to fetch operators' });
    }
});

// Get single operator
router.get('/:id', async (req, res) => {
    try {
        const operators = await readOperators();
        const operator = operators.find(o => o.id === parseInt(req.params.id));
        if (!operator) {
            return res.status(404).json({ error: 'Operator not found' });
        }
        res.json(operator);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch operator' });
    }
});

// Create new operator
router.post('/', async (req, res) => {
    try {
        const { name, role = 'Operator', status = 'Inactive' } = req.body;
        if (!name) {
            return res.status(400).json({ error: 'Name is required' });
        }

        const operators = await readOperators();
        
        // Check for existing operator with same name (case-insensitive)
        const normalizedNewName = name.toLowerCase().trim();
        const operatorExists = operators.some(op => 
            op.name.toLowerCase().trim() === normalizedNewName
        );
        
        if (operatorExists) {
            return res.status(400).json({ 
                error: `An operator with the name "${name}" already exists (names are case-insensitive)` 
            });
        }

        const newOperator = {
            id: await getNextId('operators'),
            name: name.trim(), // Store the trimmed name
            role,
            status
        };
        operators.push(newOperator);
        await writeOperators(operators);
        res.status(201).json(newOperator);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create operator' });
    }
});

// Update operator
router.put('/:id', async (req, res) => {
    try {
        const operatorId = parseInt(req.params.id);
        const { name, role, status } = req.body;
        const operators = await readOperators();
        const operatorIndex = operators.findIndex(o => o.id === operatorId);
        
        if (operatorIndex === -1) {
            return res.status(404).json({ error: 'Operator not found' });
        }

        // If name is being changed, check for duplicates (case-insensitive)
        if (name && name.toLowerCase().trim() !== operators[operatorIndex].name.toLowerCase().trim()) {
            const normalizedNewName = name.toLowerCase().trim();
            const nameExists = operators.some(op => 
                op.id !== operatorId && 
                op.name.toLowerCase().trim() === normalizedNewName
            );
            
            if (nameExists) {
                return res.status(400).json({ 
                    error: `An operator with the name "${name}" already exists (names are case-insensitive)` 
                });
            }
        }

        const updatedOperator = {
            ...operators[operatorIndex],
            name: name ? name.trim() : operators[operatorIndex].name,
            role: role || operators[operatorIndex].role,
            status: status || operators[operatorIndex].status
        };

        operators[operatorIndex] = updatedOperator;
        await writeOperators(operators);

        // If name changed, update all related jobs
        if (name && name.trim() !== operators[operatorIndex].name) {
            // Update jobs that reference this operator
            const jobs = await readJobs();
            const pads = await readPads();
            
            const updatedJobs = jobs.map(job => {
                const pad = pads.find(p => p.id === job.pad_id);
                if (pad && pad.operator_id === operatorId) {
                    return {
                        ...job,
                        operator_name: name.trim()
                    };
                }
                return job;
            });

            await fs.writeFile(JOBS_FILE, JSON.stringify(updatedJobs, null, 2));
        }

        res.json(updatedOperator);
    } catch (error) {
        console.error('Error updating operator:', error);
        res.status(500).json({ error: 'Failed to update operator' });
    }
});

// Delete operator
router.delete('/:id', async (req, res) => {
    try {
        const operatorId = parseInt(req.params.id);
        
        // Check for associated data
        const [pads, jobs] = await Promise.all([readPads(), readJobs()]);
        
        // Find operator's pads
        const operatorPads = pads.filter(pad => pad.operator_id === operatorId);
        
        // Check for active jobs on any of the operator's pads
        const hasActiveJobs = jobs.some(job => {
            const isOperatorPad = operatorPads.some(pad => pad.id === job.pad_id);
            return isOperatorPad && job.status === 'active';
        });
        
        if (hasActiveJobs) {
            return res.status(400).json({ 
                error: 'Cannot delete operator with active jobs. Please complete or reassign all jobs first.' 
            });
        }

        const operators = await readOperators();
        const operatorIndex = operators.findIndex(o => o.id === operatorId);
        
        if (operatorIndex === -1) {
            return res.status(404).json({ error: 'Operator not found' });
        }

        // If operator has pads but no active jobs, reassign or delete pads
        if (operatorPads.length > 0) {
            // Remove pads associated with this operator
            const updatedPads = pads.filter(pad => pad.operator_id !== operatorId);
            await fs.writeFile(PADS_FILE, JSON.stringify(updatedPads, null, 2));
        }

        // Remove the operator
        operators.splice(operatorIndex, 1);
        await writeOperators(operators);
        
        res.json({ 
            message: 'Operator deleted successfully',
            deletedPads: operatorPads.length
        });
    } catch (error) {
        console.error('Error deleting operator:', error);
        res.status(500).json({ error: 'Failed to delete operator' });
    }
});

module.exports = router; 