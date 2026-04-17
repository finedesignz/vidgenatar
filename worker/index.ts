import { Worker } from 'bullmq'
import { QUEUE_NAME, createRedisConnection } from '@/lib/queue'
import { runPipeline } from './pipeline'
import type { VideoJobData } from '@/lib/types'

console.log('[Worker] Starting vidgenatar worker...')

const worker = new Worker<VideoJobData>(
  QUEUE_NAME,
  async (job) => {
    console.log(`[Worker] Processing job ${job.data.jobId}`)
    await runPipeline(job.data.jobId)
  },
  {
    connection: createRedisConnection(),
    concurrency: 2,
  }
)

worker.on('completed', (job) => console.log(`[Worker] Job ${job.data.jobId} completed`))
worker.on('failed', (job, err) => console.error(`[Worker] Job ${job?.data.jobId} failed:`, err.message))

process.on('SIGTERM', async () => {
  console.log('[Worker] Shutting down...')
  await worker.close()
  process.exit(0)
})
