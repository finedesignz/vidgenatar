import { Queue, QueueEvents } from 'bullmq'
import IORedis from 'ioredis'
import type { VideoJobData } from '@/lib/types'

export const QUEUE_NAME = 'video-generation'

export function createRedisConnection() {
  return new IORedis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
    maxRetriesPerRequest: null,
  })
}

export function createQueue() {
  return new Queue<VideoJobData>(QUEUE_NAME, {
    connection: createRedisConnection(),
    defaultJobOptions: {
      attempts: 2,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: 100,
      removeOnFail: 200,
    },
  })
}

export function createQueueEvents() {
  return new QueueEvents(QUEUE_NAME, { connection: createRedisConnection() })
}
