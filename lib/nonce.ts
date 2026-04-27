import { createHash } from 'crypto'
import IORedis from 'ioredis'

const NONCE_TTL = 900 // 15 min

let _client: IORedis | null = null
function getRedis(): IORedis {
  if (!_client) {
    _client = new IORedis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
      maxRetriesPerRequest: null,
    })
  }
  return _client
}

function nonceKey(token: string): string {
  return `ml:nonce:${createHash('sha256').update(token).digest('hex')}`
}

export async function registerNonce(token: string): Promise<void> {
  await getRedis().set(nonceKey(token), '1', 'EX', NONCE_TTL)
}

export async function consumeNonce(token: string): Promise<boolean> {
  const key = nonceKey(token)
  const value = await getRedis().getdel(key)
  return value !== null
}
