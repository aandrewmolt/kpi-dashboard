const { readJobs, readPads, writeJobs } = require('./dataAccess');
const fs = require('fs').promises;
const path = require('path');

const OPERATORS_FILE = path.join(__dirname, '../data/operators.json');

async function readOperators() {
    try {
        const data = await fs.readFile(OPERATORS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading operators:', error);
        return [];
    }
}

const validateRelationships = async () => {
    const [jobs, pads, operators, incidents] = await Promise.all([
        readJobs(),
        readPads(),
        readOperators(),
        readIncidents()
    ]);

    // Validate pad-operator relationships
    pads.forEach(pad => {
        const operator = operators.find(op => op.id === pad.operator_id);
        if (!operator) {
            console.error(`Invalid operator_id ${pad.operator_id} for pad ${pad.id}`);
        }
    });

    // Validate job-pad relationships
    jobs.forEach(job => {
        const pad = pads.find(p => p.id === job.pad_id);
        if (!pad) {
            console.error(`Invalid pad_id ${job.pad_id} for job ${job.id}`);
        } else {
            // Ensure job has correct pad and operator names
            const operator = operators.find(op => op.id === pad.operator_id);
            if (operator && (job.operator_name !== operator.name || job.pad_name !== pad.name)) {
                console.error(`Inconsistent names for job ${job.id}`);
            }
        }
    });

    // Validate incident-job relationships
    incidents.forEach(incident => {
        const job = jobs.find(j => j.id === incident.job_id);
        if (!job) {
            console.error(`Invalid job_id ${incident.job_id} for incident ${incident.id}`);
        }
    });
};

const enrichJobData = (job, pad, operator) => {
    return {
        ...job,
        pad_name: pad.name,
        operator_name: operator.name,
        incidents: job.incidents || [],
        status: job.end_date ? 'completed' : 'active'
    };
};

const updateRelatedData = async (entityType, id, updates) => {
    try {
        const [jobs, pads, operators] = await Promise.all([
            readJobs(),
            readPads(),
            readOperators()
        ]);

        switch (entityType) {
            case 'operator':
                const operatorPads = pads.filter(p => p.operator_id === id);
                const affectedJobs = jobs.filter(j => 
                    operatorPads.some(p => p.id === j.pad_id)
                );
                return affectedJobs.map(job => ({
                    ...job,
                    operator_name: updates.name
                }));

            case 'pad':
                const pad = pads.find(p => p.id === id);
                if (!pad) return jobs;
                
                const operator = operators.find(o => o.id === pad.operator_id);
                return jobs.map(job => 
                    job.pad_id === id 
                        ? { 
                            ...job, 
                            pad_name: updates.name,
                            operator_name: operator ? operator.name : job.operator_name 
                        }
                        : job
                );

            default:
                return null;
        }
    } catch (error) {
        console.error('Error in updateRelatedData:', error);
        return null;
    }
};

module.exports = {
    validateRelationships,
    enrichJobData,
    updateRelatedData
}; 