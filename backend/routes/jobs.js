const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const { getNextId } = require('../utils/sequence');
const { logger } = require('../utils/logger');

const JOBS_FILE = path.join(__dirname, '../data/jobs.json');
const PADS_FILE = path.join(__dirname, '../data/pads.json');
const OPERATORS_FILE = path.join(__dirname, '../data/operators.json');
const INCIDENTS_FILE = path.join(__dirname, '../data/incidents.json');

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

async function writeJobs(jobs) {
    try {
        await fs.writeFile(JOBS_FILE, JSON.stringify(jobs, null, 2));
    } catch (error) {
        console.error('Error writing jobs:', error);
        throw error;
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

async function readOperators() {
    try {
        const data = await fs.readFile(OPERATORS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading operators:', error);
        return [];
    }
}

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

// Helper functions
const validateJobData = async (jobData, pads, operators) => {
  const { pad_id, start_date } = jobData;
  
  if (!pad_id || !start_date) {
    throw new Error('Pad ID and start date are required');
  }

  const pad = pads.find(p => p.id === parseInt(pad_id));
  if (!pad) {
    throw new Error('Invalid pad ID');
  }

  const operator = operators.find(o => o.id === pad.operator_id);
  if (!operator) {
    throw new Error('Invalid operator ID');
  }

  return {
    pad,
    operator
  };
};

const enrichJobData = (job, pad, operator) => {
  return {
    ...job,
    pad_name: pad.name,
    operator_name: operator.name,
    incidents: job.incidents || []
  };
};

// Get all jobs
router.get('/', async (req, res) => {
    try {
        const [jobs, pads, operators] = await Promise.all([readJobs(), readPads(), readOperators()]);

        // Enrich jobs with pad and operator information
        const enrichedJobs = jobs.map(job => {
            const pad = pads.find(p => p.id === job.pad_id);
            const operator = pad ? operators.find(o => o.id === pad.operator_id) : null;
            
            if (!pad || !operator) {
                console.warn('Invalid job data:', { job, pad, operator });
                return null;
            }
            
            return enrichJobData(job, pad, operator);
        }).filter(Boolean); // Remove any null entries

        console.log('Enriched jobs:', enrichedJobs);
        res.json(enrichedJobs);
    } catch (error) {
        console.error('Error fetching jobs:', error);
        res.status(500).json({ error: 'Failed to fetch jobs' });
    }
});

// Get single job
router.get('/:id', async (req, res) => {
    try {
        const [jobs, pads, operators] = await Promise.all([readJobs(), readPads(), readOperators()]);

        const job = jobs.find(j => j.id === parseInt(req.params.id));
        if (!job) {
            return res.status(404).json({ error: 'Job not found' });
        }

        const pad = pads.find(p => p.id === job.pad_id);
        const operator = pad ? operators.find(o => o.id === pad.operator_id) : null;

        if (!pad || !operator) {
            return res.status(404).json({ error: 'Invalid job data - missing pad or operator' });
        }

        const enrichedJob = enrichJobData(job, pad, operator);
        res.json(enrichedJob);
    } catch (error) {
        console.error('Error fetching job:', error);
        res.status(500).json({ error: 'Failed to fetch job' });
    }
});

// Create new job
router.post('/', async (req, res) => {
    try {
        const [jobs, pads, operators] = await Promise.all([readJobs(), readPads(), readOperators()]);
        const { pad_id, start_date } = req.body;

        // Get next unique ID from sequence
        const newId = await getNextId('jobs');

        // Validate no duplicate IDs
        if (jobs.some(job => job.id === newId)) {
            logger.error(`Duplicate job ID detected: ${newId}`);
            return res.status(500).json({ error: 'Failed to generate unique job ID' });
        }

        // Get pad and operator info
        const pad = pads.find(p => p.id === parseInt(pad_id));
        if (!pad) {
            return res.status(400).json({ error: 'Invalid pad ID' });
        }

        const operator = operators.find(o => o.id === pad.operator_id);
        if (!operator) {
            return res.status(400).json({ error: 'Invalid operator ID for pad' });
        }

        const newJob = {
            id: newId,
            pad_id: parseInt(pad_id),
            start_date,
            status: 'active',
            incidents: [],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            operator_name: operator.name,
            pad_name: pad.name
        };

        jobs.push(newJob);
        await writeJobs(jobs);

        logger.info(`Created new job with ID: ${newId}`);
        res.status(201).json(newJob);
    } catch (error) {
        logger.error('Error creating job:', error);
        res.status(500).json({ error: 'Failed to create job' });
    }
});

// Update job
router.put('/:id', async (req, res) => {
    try {
        const jobs = await readJobs();
        const jobId = parseInt(req.params.id);
        const jobIndex = jobs.findIndex(j => j.id === jobId);
        
        if (jobIndex === -1) {
            return res.status(404).json({ error: 'Job not found' });
        }

        const { pad_id, start_date, end_date, status } = req.body;

        // If we're completing a job, we only need to validate that end_date is after start_date
        if (status === 'completed') {
            const startDate = new Date(jobs[jobIndex].start_date);
            const endDate = new Date(end_date);

            if (endDate < startDate) {
                return res.status(400).json({
                    error: 'End date cannot be before start date'
                });
            }
        }
        // Only check for overlaps if we're updating dates or pad_id for an active job
        else if ((pad_id || start_date || end_date) && status !== 'completed') {
            const updatedPadId = pad_id ? parseInt(pad_id) : jobs[jobIndex].pad_id;
            const updatedStartDate = start_date || jobs[jobIndex].start_date;
            const updatedEndDate = end_date || jobs[jobIndex].end_date;

            // Check for date overlaps with other jobs for the same pad
            const padJobs = jobs.filter(job => 
                job.pad_id === updatedPadId && job.id !== jobId
            );

            const hasOverlap = padJobs.some(existingJob => {
                const jobStart = new Date(updatedStartDate);
                const jobEnd = updatedEndDate ? new Date(updatedEndDate) : new Date();
                const existingJobStart = new Date(existingJob.start_date);
                const existingJobEnd = existingJob.end_date ? new Date(existingJob.end_date) : new Date();

                return (
                    (jobStart >= existingJobStart && jobStart <= existingJobEnd) ||
                    (jobEnd >= existingJobStart && jobEnd <= existingJobEnd) ||
                    (jobStart <= existingJobStart && jobEnd >= existingJobEnd)
                );
            });

            if (hasOverlap) {
                return res.status(400).json({ 
                    error: 'Cannot update job: Date range overlaps with an existing job for this pad' 
                });
            }
        }

        // Update the job
        const updatedJob = {
            ...jobs[jobIndex],
            ...req.body,
            updated_at: new Date().toISOString()
        };

        jobs[jobIndex] = updatedJob;
        await writeJobs(jobs);
        res.json(updatedJob);
    } catch (error) {
        console.error('Error updating job:', error);
        res.status(500).json({ error: 'Failed to update job' });
    }
});

// Delete job
router.delete('/:id', async (req, res) => {
    try {
        const jobId = parseInt(req.params.id);
        console.log(`Attempting to delete job with ID: ${jobId}`); // Debug log
        
        // Read both jobs and incidents
        const [jobs, incidents] = await Promise.all([readJobs(), readIncidents()]);
        
        // Find the job
        const jobIndex = jobs.findIndex(j => j.id === jobId);
        if (jobIndex === -1) {
            console.log(`Job with ID ${jobId} not found`); // Debug log
            return res.status(404).json({ error: 'Job not found' });
        }

        // Check if job has active incidents
        const jobIncidents = incidents.filter(i => i.job_id === jobId);
        console.log(`Found ${jobIncidents.length} incidents for job ${jobId}`); // Debug log
        
        if (jobIncidents.length > 0) {
            // Remove all associated incidents first
            const updatedIncidents = incidents.filter(i => i.job_id !== jobId);
            await writeIncidents(updatedIncidents);
            console.log(`Deleted ${jobIncidents.length} incidents for job ${jobId}`); // Debug log
        }

        // Remove the job
        jobs.splice(jobIndex, 1);
        await writeJobs(jobs);
        console.log(`Successfully deleted job ${jobId}`); // Debug log
        
        res.status(200).json({ 
            message: 'Job and associated incidents deleted successfully',
            deletedIncidents: jobIncidents.length
        });
    } catch (error) {
        console.error('Error deleting job:', error);
        res.status(500).json({ error: 'Failed to delete job' });
    }
});

module.exports = router; 