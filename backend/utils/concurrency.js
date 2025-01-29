const { logger } = require('./logger');

class LockManager {
    constructor() {
        this.locks = new Map();
        this.waitingOperations = new Map();
    }

    // Generate a unique lock key for a resource
    _getLockKey(resourceType, resourceId) {
        return `${resourceType}:${resourceId}`;
    }

    // Acquire a lock for a resource
    async acquireLock(resourceType, resourceId, maxWaitTime = 5000) {
        const lockKey = this._getLockKey(resourceType, resourceId);
        const startTime = Date.now();

        while (this.locks.has(lockKey)) {
            if (Date.now() - startTime > maxWaitTime) {
                logger.warn(`Lock acquisition timeout for ${lockKey}`);
                throw new Error('Lock acquisition timeout');
            }
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        this.locks.set(lockKey, {
            timestamp: Date.now(),
            resourceType,
            resourceId
        });

        logger.info(`Lock acquired for ${lockKey}`);
        return true;
    }

    // Release a lock
    releaseLock(resourceType, resourceId) {
        const lockKey = this._getLockKey(resourceType, resourceId);
        
        if (this.locks.has(lockKey)) {
            this.locks.delete(lockKey);
            logger.info(`Lock released for ${lockKey}`);
            return true;
        }
        
        return false;
    }

    // Check if a resource is locked
    isLocked(resourceType, resourceId) {
        return this.locks.has(this._getLockKey(resourceType, resourceId));
    }

    // Clean up stale locks (older than 30 seconds)
    cleanupStaleLocks() {
        const now = Date.now();
        for (const [key, lock] of this.locks.entries()) {
            if (now - lock.timestamp > 30000) {
                this.locks.delete(key);
                logger.warn(`Cleaned up stale lock for ${key}`);
            }
        }
    }
}

// Create a singleton instance
const lockManager = new LockManager();

// Clean up stale locks every minute
setInterval(() => lockManager.cleanupStaleLocks(), 60000);

// Middleware to handle concurrent modifications
const concurrencyMiddleware = (resourceType) => async (req, res, next) => {
    const resourceId = req.params.id;
    
    if (!resourceId || !['PUT', 'DELETE', 'PATCH'].includes(req.method)) {
        return next();
    }

    try {
        await lockManager.acquireLock(resourceType, resourceId);
        
        // Release lock after response is sent
        res.on('finish', () => {
            lockManager.releaseLock(resourceType, resourceId);
        });
        
        next();
    } catch (error) {
        if (error.message === 'Lock acquisition timeout') {
            return res.status(409).json({
                error: 'Resource is currently being modified by another request'
            });
        }
        next(error);
    }
};

module.exports = {
    lockManager,
    concurrencyMiddleware
}; 