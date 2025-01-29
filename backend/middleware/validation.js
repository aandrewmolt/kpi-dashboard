const validateJobData = async (req, res, next) => {
    try {
        const { pad_id, start_date, end_date } = req.body;

        // Basic field validation
        if (!pad_id || !start_date) {
            return res.status(400).json({ error: 'Pad ID and start date are required' });
        }

        // Date format validation
        const startDate = new Date(start_date);
        if (isNaN(startDate.getTime())) {
            return res.status(400).json({ error: 'Invalid start date format' });
        }

        if (end_date) {
            const endDate = new Date(end_date);
            if (isNaN(endDate.getTime())) {
                return res.status(400).json({ error: 'Invalid end date format' });
            }
            if (endDate < startDate) {
                return res.status(400).json({ error: 'End date must be after start date' });
            }
        }

        // Store validated dates in ISO format with consistent precision
        req.validatedData = {
            ...req.body,
            start_date: startDate.toISOString(),
            end_date: end_date ? new Date(end_date).toISOString() : null,
            status: end_date ? 'completed' : 'active'
        };

        next();
    } catch (error) {
        console.error('Validation error:', error);
        res.status(400).json({ error: 'Invalid request data' });
    }
};

const validatePadData = async (req, res, next) => {
    try {
        const { name, location, operator_id } = req.body;

        if (!name || !location || !operator_id) {
            return res.status(400).json({ 
                error: 'Name, location, and operator ID are required' 
            });
        }

        // Store validated data
        req.validatedData = {
            ...req.body,
            operator_id: parseInt(operator_id),
            deleted: false
        };

        next();
    } catch (error) {
        console.error('Validation error:', error);
        res.status(400).json({ error: 'Invalid request data' });
    }
};

const validateIncidentData = async (req, res, next) => {
    try {
        const { job_id, type_id, description, start_time, end_time, fault } = req.body;

        if (!job_id || !type_id || !description || !start_time || !fault) {
            return res.status(400).json({ 
                error: 'Job ID, type ID, description, start time, and fault are required' 
            });
        }

        // Date validation
        const startTime = new Date(start_time);
        if (isNaN(startTime.getTime())) {
            return res.status(400).json({ error: 'Invalid start time format' });
        }

        if (end_time) {
            const endTime = new Date(end_time);
            if (isNaN(endTime.getTime())) {
                return res.status(400).json({ error: 'Invalid end time format' });
            }
            if (endTime < startTime) {
                return res.status(400).json({ error: 'End time must be after start time' });
            }
        }

        // Store validated data
        req.validatedData = {
            ...req.body,
            job_id: parseInt(job_id),
            type_id: parseInt(type_id),
            start_time: startTime.toISOString(),
            end_time: end_time ? new Date(end_time).toISOString() : null
        };

        next();
    } catch (error) {
        console.error('Validation error:', error);
        res.status(400).json({ error: 'Invalid request data' });
    }
};

module.exports = {
    validateJobData,
    validatePadData,
    validateIncidentData
}; 