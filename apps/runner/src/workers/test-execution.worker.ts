import { Worker, Job, ConnectionOptions } from 'bullmq';
import { PlaywrightExecutor } from '../executors/playwright.executor';
import { RecordingExecutor } from '../executors/recording.executor';
import { JobData } from '../executors/base.executor';

const QUEUE_NAME = 'test-execution';

export function createTestExecutionWorker(connection: ConnectionOptions): Worker {
  const worker = new Worker(
    QUEUE_NAME,
    async (job: Job) => {
      const jobData = job.data as JobData & { executorType?: string };
      const executorType = jobData.executorType || 'playwright';

      console.log(
        `[TestExecutionWorker] Processing job ${job.id} | testRun=${jobData.testRunId} | executor=${executorType}`,
      );

      let executor;

      switch (executorType) {
        case 'playwright':
          executor = new PlaywrightExecutor();
          break;
        case 'recording':
          executor = new RecordingExecutor();
          break;
        default:
          throw new Error(`Unknown executor type: ${executorType}`);
      }

      const result = await executor.execute(jobData);

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
    },
  );

  worker.on('failed', (job, err) => {
    console.error(`[TestExecutionWorker] Job ${job?.id} failed:`, err.message);
  });

  worker.on('error', (err) => {
    console.error('[TestExecutionWorker] Worker error:', err.message);
  });

  return worker;
}
