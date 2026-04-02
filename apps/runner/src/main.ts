import Redis from 'ioredis';
import { createTestExecutionWorker } from './workers/test-execution.worker';
import { createReportGenerationWorker } from './workers/report-generation.worker';

const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379', 10);

async function main(): Promise<void> {
  console.log('[Runner] Starting QARevel runner service...');

  const redisConnection = new Redis(REDIS_PORT, REDIS_HOST, {
    maxRetriesPerRequest: null,
  });

  redisConnection.on('connect', () => {
    console.log(`[Runner] Connected to Redis at ${REDIS_HOST}:${REDIS_PORT}`);
  });

  redisConnection.on('error', (err) => {
    console.error('[Runner] Redis connection error:', err.message);
  });

  const connectionOpts = { host: REDIS_HOST, port: REDIS_PORT };

  const testExecutionWorker = createTestExecutionWorker(connectionOpts);
  const reportGenerationWorker = createReportGenerationWorker(connectionOpts);

  console.log('[Runner] Workers registered:');
  console.log('  - test-execution worker');
  console.log('  - report-generation worker');
  console.log('[Runner] Waiting for jobs...');

  const shutdown = async (): Promise<void> => {
    console.log('[Runner] Shutting down...');
    await testExecutionWorker.close();
    await reportGenerationWorker.close();
    await redisConnection.quit();
    console.log('[Runner] Shutdown complete.');
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error('[Runner] Fatal error:', err);
  process.exit(1);
});
