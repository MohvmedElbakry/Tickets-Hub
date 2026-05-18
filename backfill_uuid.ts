
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

async function backfill() {
  console.log('Starting backfill for public_id...');
  const orders = await prisma.order.findMany();

  console.log(`Checking ${orders.length} orders...`);

  for (const order of orders) {
    if (!order.public_id) {
      await prisma.order.update({
        where: { id: order.id },
        data: { public_id: crypto.randomUUID() }
      });
      console.log(`Updated order #${order.id}`);
    }
  }

  console.log('Backfill complete.');
  await prisma.$disconnect();
}

backfill().catch(err => {
  console.error('Backfill failed:', err);
  process.exit(1);
});
