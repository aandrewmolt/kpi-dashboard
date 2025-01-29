const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const { logger } = require('../utils/logger');

const INCIDENTS_FILE = path.join(__dirname, '../data/incidents.json');
const JOBS_FILE = path.join(__dirname, '../data/jobs.json');
const INCIDENT_TYPES_FILE = path.join(__dirname, '../data/incident_types.json');

// Helper functions to read/write data
async function readIncidents() {
    try {
        const data = await fs.readFile(INCIDENTS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading incidents:', error);
        return [];
    }
}

async function writeIncidents(incidents) {
    try {
        await fs.writeFile(INCIDENTS_FILE, JSON.stringify(incidents, null, 2));
    } catch (error) {
        console.error('Error writing incidents:', error);
        throw error;
    }
}

async function readJobs() {
    try {
        const data = await fs.readFile(JOBS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading jobs:', error);
        return [];
    }
}

async function writeJobs(jobs) {
    try {
        await fs.writeFile(JOBS_FILE, JSON.stringify(jobs, null, 2));
    } catch (error) {
        console.error('Error writing jobs:', error);
        throw error;
    }
}

async function readIncidentTypes() {
    try {
        const data = await fs.readFile(INCIDENT_TYPES_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading incident types:', error);
        return [];
    }
}

// Helper function to calculate downtime hours
function calculateDowntimeHours(startTime, endTime) {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const diffMs = end - start;
    return diffMs / (1000 * 60 * 60); // Convert milliseconds to hours
}

// Get all incidents
router.get('/', async (req, res) => {
    try {
        const incidents = await readIncidents();
        res.json(incidents);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch incidents' });
    }
});

// Get incidents by job
router.get('/job/:jobId', async (req, res) => {
    try {
        const incidents = await readIncidents();
        const jobIncidents = incidents.filter(incident => incident.job_id === parseInt(req.params.jobId));
        res.json(jobIncidents);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch job incidents' });
    }
});

// Get incidents by type
router.get('/type/:typeId', async (req, res) => {
    try {
        const incidents = await readIncidents();
        const typeIncidents = incidents.filter(incident => incident.type_id === parseInt(req.params.typeId));
        res.json(typeIncidents);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch incidents by type' });
    }
});

// Get single incident
router.get('/:id', async (req, res) => {
    try {
        const incidents = await readIncidents();
        const incident = incidents.find(i => i.id === parseInt(req.params.id));
        if (!incident) {
            return res.status(404).json({ error: 'Incident not found' });
        }
        res.json(incident);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch incident' });
    }
});

// Create new incident
router.post('/', async (req, res) => {
    try {
        const { job_id, type_id, description, start_time, end_time, fault } = req.body;

        // Validation
        const errors = {};
        if (!job_id) errors.job_id = 'Job ID is required';
        if (!type_id) errors.type_id = 'Type ID is required';
        if (!description || description.trim().length < 10) {
            errors.description = 'Description must be at least 10 characters';
        }
        if (!start_time) errors.start_time = 'Start time is required';
        if (!fault) errors.fault = 'Fault category is required';

        if (Object.keys(errors).length > 0) {
            return res.status(400).json({ errors });
        }

        const incidents = await readIncidents();
        const newId = Math.max(...incidents.map(i => i.id), 0) + 1;

        const newIncident = {
            id: newId,
            job_id: parseInt(job_id),
            type_id: parseInt(type_id),
            description,
            start_time,
            end_time: end_time || null,
            fault,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        incidents.push(newIncident);
        await writeIncidents(incidents);

        // Update job's incidents array
        const jobs = await readJobs();
        const jobIndex = jobs.findIndex(j => j.id === parseInt(job_id));
        if (jobIndex !== -1) {
            if (!jobs[jobIndex].incidents) {
                jobs[jobIndex].incidents = [];
            }
            jobs[jobIndex].incidents.push(newId);
            await writeJobs(jobs);
        }

        res.status(201).json(newIncident);
    } catch (error) {
        console.error('Error creating incident:', error);
        res.status(500).json({ error: 'Failed to create incident' });
    }
});

// Update single incident
router.put('/:id', async (req, res) => {
    try {
        const incidentId = parseInt(req.params.id);
        const { job_id, type_id, description, start_time, end_time, fault } = req.body;

        const incidents = await readIncidents();
        const incidentIndex = incidents.findIndex(i => i.id === incidentId);

        if (incidentIndex === -1) {
            return res.status(404).json({ error: 'Incident not found' });
        }

        // Validate required fields
        if (!description || description.trim().length === 0) {
            return res.status(400).json({ error: 'Description is required' });
        }

        if (!fault) {
            return res.status(400).json({ error: 'Fault category is required' });
        }

        // Validate dates
        const startDate = new Date(start_time || incidents[incidentIndex].start_time);
        if (isNaN(startDate.getTime())) {
            return res.status(400).json({ error: 'Invalid start time format' });
        }

        if (end_time) {
            const endDate = new Date(end_time);
            if (isNaN(endDate.getTime())) {
                return res.status(400).json({ error: 'Invalid end time format' });
            }
            if (endDate <= startDate) {
                return res.status(400).json({ error: 'End time must be after start time' });
            }
        }

        // If job_id is changing, validate and update references
        if (job_id && job_id !== incidents[incidentIndex].job_id) {
            const jobs = await readJobs();
            const newJob = jobs.find(j => j.id === parseInt(job_id));
            if (!newJob) {
                return res.status(400).json({ error: 'Invalid job ID' });
            }

            // Update job references
            const oldJobIndex = jobs.findIndex(j => j.id === incidents[incidentIndex].job_id);
            if (oldJobIndex !== -1 && jobs[oldJobIndex].incidents) {
                jobs[oldJobIndex].incidents = jobs[oldJobIndex].incidents.filter(i => i !== incidentId);
            }

            if (!newJob.incidents) {
                newJob.incidents = [];
            }
            newJob.incidents.push(incidentId);
            await writeJobs(jobs);
        }

        // Update the incident
        const updatedIncident = {
            ...incidents[incidentIndex],
            job_id: job_id ? parseInt(job_id) : incidents[incidentIndex].job_id,
            type_id: type_id ? parseInt(type_id) : incidents[incidentIndex].type_id,
            description: description || incidents[incidentIndex].description,
            start_time: start_time || incidents[incidentIndex].start_time,
            end_time: end_time || incidents[incidentIndex].end_time,
            fault: fault || incidents[incidentIndex].fault,
            updated_at: new Date().toISOString()
        };

        incidents[incidentIndex] = updatedIncident;
        await writeIncidents(incidents);

        res.json(updatedIncident);
    } catch (error) {
        logger.error('Error updating incident:', error);
        res.status(500).json({ error: 'Failed to update incident' });
    }
});

// Delete incident
router.delete('/:id', async (req, res) => {
    try {
        const incidentId = parseInt(req.params.id);
        const incidents = await readIncidents();
        const incidentToDelete = incidents.find(i => i.id === incidentId);
        
        if (!incidentToDelete) {
            return res.status(404).json({ error: 'Incident not found' });
        }

        // Remove incident from job's incidents array
        const jobs = await readJobs();
        const jobIndex = jobs.findIndex(j => j.id === incidentToDelete.job_id);
        if (jobIndex !== -1) {
            jobs[jobIndex].incidents = jobs[jobIndex].incidents.filter(i => i !== incidentId);
            await writeJobs(jobs);
        }

        // Remove incident
        const filteredIncidents = incidents.filter(i => i.id !== incidentId);
        await writeIncidents(filteredIncidents);
        
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete incident' });
    }
});

// Get statistics
router.get('/stats/summary', async (req, res) => {
    try {
        const incidents = await readIncidents();
        const types = await readIncidentTypes();
        
        // Calculate total downtime
        const totalDowntime = incidents.reduce((sum, incident) => sum + incident.downtime_hours, 0);
        
        // Group by type
        const byType = incidents.reduce((acc, incident) => {
            const typeId = incident.type_id;
            const typeName = types.find(t => t.id === typeId)?.name || 'Unknown';
            
            if (!acc[typeName]) {
                acc[typeName] = {
                    count: 0,
                    total_downtime: 0
                };
            }
            acc[typeName].count++;
            acc[typeName].total_downtime += incident.downtime_hours;
            return acc;
        }, {});

        res.json({
            total_incidents: incidents.length,
            total_downtime_hours: totalDowntime,
            by_type: byType
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch incident statistics' });
    }
});

module.exports = router; 