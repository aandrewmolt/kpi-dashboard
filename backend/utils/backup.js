const fs = require('fs').promises;
const path = require('path');
const { logger } = require('./logger');

const DATA_DIR = path.join(__dirname, '../data');
const BACKUP_DIR = path.join(__dirname, '../data/backups');

// Ensure backup directory exists
const ensureBackupDir = async () => {
    try {
        await fs.access(BACKUP_DIR);
    } catch {
        await fs.mkdir(BACKUP_DIR, { recursive: true });
    }
};

// Create backup of a file
const backupFile = async (filename) => {
    try {
        await ensureBackupDir();
        
        const sourceFile = path.join(DATA_DIR, filename);
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupFile = path.join(BACKUP_DIR, `${path.parse(filename).name}_${timestamp}${path.parse(filename).ext}`);
        
        await fs.copyFile(sourceFile, backupFile);
        logger.info(`Backup created: ${backupFile}`);
        
        // Clean up old backups (keep last 5)
        const files = await fs.readdir(BACKUP_DIR);
        const relevantBackups = files.filter(f => f.startsWith(path.parse(filename).name));
        
        if (relevantBackups.length > 5) {
            relevantBackups.sort();
            const toDelete = relevantBackups.slice(0, relevantBackups.length - 5);
            
            for (const file of toDelete) {
                await fs.unlink(path.join(BACKUP_DIR, file));
                logger.info(`Deleted old backup: ${file}`);
            }
        }
        
        return backupFile;
    } catch (error) {
        logger.error('Backup failed:', error);
        throw error;
    }
};

// Restore from backup
const restoreFromBackup = async (filename, backupTimestamp) => {
    try {
        const files = await fs.readdir(BACKUP_DIR);
        const backup = files.find(f => f.includes(backupTimestamp) && f.startsWith(path.parse(filename).name));
        
        if (!backup) {
            throw new Error(`Backup not found for timestamp: ${backupTimestamp}`);
        }
        
        const backupPath = path.join(BACKUP_DIR, backup);
        const restorePath = path.join(DATA_DIR, filename);
        
        await fs.copyFile(backupPath, restorePath);
        logger.info(`Restored from backup: ${backup}`);
        
        return true;
    } catch (error) {
        logger.error('Restore failed:', error);
        throw error;
    }
};

// List available backups for a file
const listBackups = async (filename) => {
    try {
        const files = await fs.readdir(BACKUP_DIR);
        return files
            .filter(f => f.startsWith(path.parse(filename).name))
            .sort()
            .reverse();
    } catch (error) {
        logger.error('Failed to list backups:', error);
        throw error;
    }
};

module.exports = {
    backupFile,
    restoreFromBackup,
    listBackups
}; 