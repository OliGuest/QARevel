import { Worker, Job, ConnectionOptions } from 'bullmq';
import { ReportGenerator, ReportJobData } from '../reporters/report.generator';

const QUEUE_NAME = 'report-generation';
const JOB_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

export function createReportGenerationWorker(connection: ConnectionOptions): Worker {
  const reportGenerator = new ReportGenerator();

  const worker = new Worker(
    QUEUE_NAME,
    async (job: Job) => {
      const jobData = job.data as ReportJobData;

      console.log(
        `[ReportGenerationWorker] Processing job ${job.id} (attempt ${job.attemptsMade + 1}) | testRun=${jobData.testRunId}`,
      );

      const reportId = await Promise.race([
        reportGenerator.generate(jobData),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`Report generation timed out after ${JOB_TIMEOUT_MS / 1000}s`)), JOB_TIMEOUT_MS),
        ),
      ]);

      console.log(
        `[ReportGenerationWorker] Job ${job.id} completed | reportId=${reportId}`,
      );

      return { reportId };
    },
    {
      connection,
      concurrency: 4,
      removeOnComplete: { count: 200 },
      removeOnFail: { count: 50 },
      settings: {
        backoffStrategy: (attemptsMade: number) => {
          return Math.min(3000 * Math.pow(2, attemptsMade), 30000);
        },
      },
    },
  );

  worker.on('failed', (job, err) => {
    const attempts = job?.opts?.attempts ?? 1;
    const attemptsMade = (job?.attemptsMade ?? 0) + 1;
    if (attemptsMade < attempts) {
      console.warn(
        `[ReportGenerationWorker] Job ${job?.id} failed (attempt ${attemptsMade}/${attempts}), will retry: ${err.message}`,
      );
    } else {
      console.error(
        `[ReportGenerationWorker] Job ${job?.id} failed permanently after ${attemptsMade} attempts: ${err.message}`,
      );
    }
  });

  worker.on('error', (err) => {
    console.error('[ReportGenerationWorker] Worker error:', err.message);
  });

  return worker;
}
