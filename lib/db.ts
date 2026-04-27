import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

function getClient(): PrismaClient {
  if (!globalForPrisma.prisma) {
    // Prisma v7 removed datasourceUrl from PrismaClientOptions.
    // DATABASE_URL is read directly from the environment at runtime.
    globalForPrisma.prisma = new PrismaClient()
  }
  return globalForPrisma.prisma
}

export const db = new Proxy({} as PrismaClient, {
  get(_, prop: string | symbol) {
    const client = getClient()
    const value = (client as any)[prop]
    return typeof value === 'function' ? value.bind(client) : value
  },
})
