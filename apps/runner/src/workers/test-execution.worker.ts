import { Worker, Job, ConnectionOptions } from 'bullmq';
import { PlaywrightExecutor } from '../executors/playwright.executor';
import { RecordingExecutor } from '../executors/recording.executor';
import { AndroidCdpExecutor } from '../executors/android-cdp.executor';
import { JobData } from '../executors/base.executor';

const QUEUE_NAME = 'test-execution';
const JOB_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

export function createTestExecutionWorker(connection: ConnectionOptions): Worker {
  const worker = new Worker(
    QUEUE_NAME,
    async (job: Job) => {
      const jobData = job.data as JobData & { executorType?: string };
      const executorType = jobData.executorType || 'playwright';

      console.log(
        `[TestExecutionWorker] Processing job ${job.id} (attempt ${job.attemptsMade + 1}) | testRun=${jobData.testRunId} | executor=${executorType}`,
      );

      let executor;

      switch (executorType) {
        case 'playwright':
          executor = new PlaywrightExecutor();
          break;
        case 'recording':
          executor = new RecordingExecutor();
          break;
        case 'android-cdp':
          executor = new AndroidCdpExecutor();
          break;
        default:
          throw new Error(`Unknown executor type: ${executorType}`);
      }

      // Wrap execution with timeout
      const result = await Promise.race([
        executor.execute(jobData),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`Job timed out after ${JOB_TIMEOUT_MS / 1000}s`)), JOB_TIMEOUT_MS),
        ),
      ]);

      console.log(
        `[TestExecutionWorker] Job ${job.id} completed | status=${result.status} | duration=${result.durationMs}ms`,
      );

      return result;
    },
    {
      connection,
      concurrency: 2,
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 50 },
      settings: {
        backoffStrategy: (attemptsMade: number) => {
          // Exponential backoff: 5s, 15s, 45s
          return Math.min(5000 * Math.pow(3, attemptsMade), 60000);
        },
      },
    },
  );

  worker.on('failed', (job, err) => {
    const attempts = job?.opts?.attempts ?? 1;
    const attemptsMade = (job?.attemptsMade ?? 0) + 1;
    if (attemptsMade < attempts) {
      console.warn(
        `[TestExecutionWorker] Job ${job?.id} failed (attempt ${attemptsMade}/${attempts}), will retry: ${err.message}`,
      );
    } else {
      console.error(
        `[TestExecutionWorker] Job ${job?.id} failed permanently after ${attemptsMade} attempts: ${err.message}`,
      );
    }
  });

  worker.on('error', (err) => {
    console.error('[TestExecutionWorker] Worker error:', err.message);
  });

  return worker;
}
