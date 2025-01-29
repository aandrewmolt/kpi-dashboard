const fs = require('fs');
const path = require('path');

// Paths
const jobsPath = path.join(__dirname, '../data/jobs.json');
const backupDir = path.join(__dirname, '../data/backups');

// Create backup
function createBackup(data, type) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(backupDir, `${type}_${timestamp}.json`);
    fs.writeFileSync(backupPath, JSON.stringify(data, null, 2));
    console.log(`Backup created: ${backupPath}`);
}

// Validate and fix jobs
function validateJobs() {
    console.log('Validating jobs data...');
    
    // Read jobs data
    const jobsData = JSON.parse(fs.readFileSync(jobsPath, 'utf8'));
    
    // Create backup before modifications
    createBackup(jobsData, 'jobs');
    
    // Fix jobs
    const fixedJobs = jobsData.map(job => {
        // Ensure all required fields exist
        if (!job.id || !job.pad_id || !job.start_date) {
            console.log(`Warning: Job ${job.id} missing required fields`);
        }
        
        // Set status based on end_date if status is missing
        if (!job.status) {
            job.status = job.end_date ? 'completed' : 'active';
            console.log(`Fixed status for job ${job.id}`);
        }
        
        // Ensure incidents array exists
        if (!job.incidents) {
            job.incidents = [];
            console.log(`Added incidents array to job ${job.id}`);
        }
        
        // Validate dates
        try {
            new Date(job.start_date).toISOString();
        } catch (e) {
            console.log(`Warning: Invalid start_date for job ${job.id}`);
        }
        
        if (job.end_date) {
            try {
                new Date(job.end_date).toISOString();
            } catch (e) {
                console.log(`Warning: Invalid end_date for job ${job.id}`);
            }
        }
        
        return job;
    });
    
    // Save fixed data
    fs.writeFileSync(jobsPath, JSON.stringify(fixedJobs, null, 2));
    console.log('Jobs validation complete');
}

// Run validation
try {
    validateJobs();
    console.log('Data validation completed successfully');
} catch (error) {
    console.error('Error during validation:', error);
    process.exit(1);
} 