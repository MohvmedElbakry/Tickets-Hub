import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: [
    { level: 'query', emit: 'event' },
    { level: 'info', emit: 'stdout' },
    { level: 'warn', emit: 'stdout' },
    { level: 'error', emit: 'stdout' },
  ],
});

// @ts-ignore
prisma.$on('query', (e: any) => {
  console.log(`[PRISMA QUERY] ${e.query}`);
  console.log(`[PRISMA PARAMS] ${e.params}`);
  console.log(`[PRISMA DURATION] ${e.duration}ms`);
});

export default prisma;
