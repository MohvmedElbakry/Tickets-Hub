import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: [
      { level: 'query', emit: 'event' },
      { level: 'error', emit: 'stdout' },
      { level: 'warn', emit: 'stdout' },
    ],
  })

// Add query logging in development
if (process.env.NODE_ENV !== 'production') {
  (prisma as any).$on('query', (e: any) => {
    console.log('Query: ' + e.query)
    console.log('Params: ' + e.params)
    console.log('Duration: ' + e.duration + 'ms')
  })
}

globalForPrisma.prisma = prisma

// Graceful disconnect handling of Prisma Client to prevent database connection leaks on instance terminations
const handleShutdown = async (signal: string) => {
  console.log(`[Prisma Client] Received ${signal}. Gracefully disconnecting...`);
  try {
    await prisma.$disconnect();
    console.log('[Prisma Client] Successfully disconnected.');
  } catch (err) {
    console.error('[Prisma Client] Error during graceful disconnect:', err);
  } finally {
    process.exit(0);
  }
};

process.on('SIGINT', () => handleShutdown('SIGINT'));
process.on('SIGTERM', () => handleShutdown('SIGTERM'));

export default prisma
