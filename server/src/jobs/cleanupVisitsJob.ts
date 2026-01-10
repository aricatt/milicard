import cron from 'node-cron';
import pointVisitService from '../services/pointVisitService';

/**
 * Scheduled job to cleanup old point visit records (older than 7 days)
 * Runs daily at 2:00 AM
 */
export function startCleanupVisitsJob() {
  // Run daily at 2:00 AM
  cron.schedule('0 2 * * *', async () => {
    try {
      console.log('[CleanupVisitsJob] Starting cleanup of old visit records...');
      const count = await pointVisitService.cleanupOldVisits();
      console.log(`[CleanupVisitsJob] Successfully cleaned up ${count} old visit records`);
    } catch (error) {
      console.error('[CleanupVisitsJob] Failed to cleanup old visits:', error);
    }
  });

  console.log('[CleanupVisitsJob] Scheduled to run daily at 2:00 AM');
}
