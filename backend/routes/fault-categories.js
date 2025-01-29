const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');

const FAULT_CATEGORIES_FILE = path.join(__dirname, '../data/fault_categories.json');

// Helper functions to read/write data
async function readFaultCategories() {
    try {
        const data = await fs.readFile(FAULT_CATEGORIES_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading fault categories:', error);
        return [];
    }
}

async function writeFaultCategories(categories) {
    try {
        await fs.writeFile(FAULT_CATEGORIES_FILE, JSON.stringify(categories, null, 2));
    } catch (error) {
        console.error('Error writing fault categories:', error);
        throw error;
    }
}

// Get all fault categories
router.get('/', async (req, res) => {
    try {
        const categories = await readFaultCategories();
        res.json(categories);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch fault categories' });
    }
});

// Get single fault category
router.get('/:id', async (req, res) => {
    try {
        const categories = await readFaultCategories();
        const category = categories.find(c => c.id === parseInt(req.params.id));
        if (!category) {
            return res.status(404).json({ error: 'Fault category not found' });
        }
        res.json(category);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch fault category' });
    }
});

// Create new fault category
router.post('/', async (req, res) => {
    try {
        const { name, description } = req.body;
        const categories = await readFaultCategories();
        const newCategory = {
            id: categories.length > 0 ? Math.max(...categories.map(c => c.id)) + 1 : 1,
            name,
            description,
            created_at: new Date().toISOString()
        };
        categories.push(newCategory);
        await writeFaultCategories(categories);
        res.status(201).json(newCategory);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create fault category' });
    }
});

// Update fault category
router.put('/:id', async (req, res) => {
    try {
        const categoryId = parseInt(req.params.id);
        const categories = await readFaultCategories();
        const categoryIndex = categories.findIndex(c => c.id === categoryId);
        
        if (categoryIndex === -1) {
            return res.status(404).json({ error: 'Fault category not found' });
        }

        const updatedCategory = {
            ...categories[categoryIndex],
            ...req.body,
            id: categoryId,
            updated_at: new Date().toISOString()
        };

        categories[categoryIndex] = updatedCategory;
        await writeFaultCategories(categories);
        res.json(updatedCategory);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update fault category' });
    }
});

// Delete fault category
router.delete('/:id', async (req, res) => {
    try {
        const categoryId = parseInt(req.params.id);
        const categories = await readFaultCategories();
        const filteredCategories = categories.filter(c => c.id !== categoryId);
        
        if (filteredCategories.length === categories.length) {
            return res.status(404).json({ error: 'Fault category not found' });
        }

        await writeFaultCategories(filteredCategories);
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete fault category' });
    }
});

module.exports = router; 