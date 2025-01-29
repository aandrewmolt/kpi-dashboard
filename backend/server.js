const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { logger, requestLogger } = require('./utils/logger');
const { concurrencyMiddleware } = require('./utils/concurrency');
const { backupFile } = require('./utils/backup');

const app = express();
const port = process.env.PORT || 3002;

// Enable trust proxy
app.set('trust proxy', 1);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Increased limit for development
  message: 'Too many requests from this IP, please try again later'
});

// CORS configuration
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://yourdomain.com'] // Replace with your production domain
    : ['http://localhost:3000', 'http://localhost:3002', 'http://localhost:3003'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 204
};

// Apply rate limiter to all requests
app.use(limiter);

// Middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(requestLogger);

// Routes
const padsRouter = require('./routes/pads');
const jobsRouter = require('./routes/jobs');
const operatorsRouter = require('./routes/operators');
const incidentsRouter = require('./routes/incidents');
const incidentTypesRouter = require('./routes/incident-types');
const faultCategoriesRouter = require('./routes/fault-categories');

// Apply concurrency middleware to routes that modify data
app.use('/api/pads', concurrencyMiddleware('pad'), padsRouter);
app.use('/api/jobs', concurrencyMiddleware('job'), jobsRouter);
app.use('/api/operators', concurrencyMiddleware('operator'), operatorsRouter);
app.use('/api/incidents', concurrencyMiddleware('incident'), incidentsRouter);
app.use('/api/incident-types', concurrencyMiddleware('incident-type'), incidentTypesRouter);
app.use('/api/fault-categories', concurrencyMiddleware('fault-category'), faultCategoriesRouter);

// Error handling middleware
app.use((err, req, res, next) => {
    logger.error(err.stack);
    res.status(500).json({ error: 'Something broke!' });
});

// Periodic backup of data files
const scheduleBackups = () => {
    const dataFiles = [
        'pads.json',
        'jobs.json',
        'operators.json',
        'incidents.json',
        'incident-types.json',
        'fault_categories.json',
        'sequences.json'
    ];

    // Backup each file every hour
    setInterval(async () => {
        for (const file of dataFiles) {
            try {
                await backupFile(file);
                logger.info(`Scheduled backup completed for ${file}`);
            } catch (error) {
                logger.error(`Scheduled backup failed for ${file}:`, error);
            }
        }
    }, 3600000); // 1 hour
};

// Start server
app.listen(port, () => {
    logger.info(`Server is running on port ${port}`);
    scheduleBackups();
}); 