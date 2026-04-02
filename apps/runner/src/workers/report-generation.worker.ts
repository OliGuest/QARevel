import { Worker, Job, ConnectionOptions } from 'bullmq';
import { ReportGenerator, ReportJobData } from '../reporters/report.generator';

const QUEUE_NAME = 'report-generation';

export function createReportGenerationWorker(connection: ConnectionOptions): Worker {
  const reportGenerator = new ReportGenerator();

  const worker = new Worker(
    QUEUE_NAME,
    async (job: Job) => {
      const jobData = job.data as ReportJobData;

      console.log(
        `[ReportGenerationWorker] Processing job ${job.id} | testRun=${jobData.testRunId}`,
      );

      const reportId = await reportGenerator.generate(jobData);

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
    },
  );

  worker.on('failed', (job, err) => {
    console.error(`[ReportGenerationWorker] Job ${job?.id} failed:`, err.message);
  });

  worker.on('error', (err) => {
    console.error('[ReportGenerationWorker] Worker error:', err.message);
  });

  return worker;
}
