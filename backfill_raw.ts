
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

async function backfillRaw() {
  console.log('Adding public_id column via raw SQL...');
  try {
    await prisma.$executeRawUnsafe('ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "public_id" TEXT UNIQUE');
    console.log('Column added or already exists.');
  } catch (err) {
    console.error('Failed to add column:', err);
  }

  const orders: any[] = await prisma.$queryRawUnsafe('SELECT id, public_id FROM "Order"');
  console.log(`Checking ${orders.length} orders...`);

  for (const order of orders) {
    if (!order.public_id) {
      const newUuid = crypto.randomUUID();
      await prisma.$executeRawUnsafe(`UPDATE "Order" SET public_id = '${newUuid}' WHERE id = ${order.id}`);
      console.log(`Updated order #${order.id} with UUID ${newUuid}`);
    }
  }

  // Make it NOT NULL after backfill
  try {
    await prisma.$executeRawUnsafe('ALTER TABLE "Order" ALTER COLUMN public_id SET NOT NULL');
    console.log('Column set to NOT NULL.');
  } catch (err) {
    console.error('Failed to set NOT NULL:', err);
  }

  console.log('Done.');
  await prisma.$disconnect();
}

backfillRaw().catch(err => {
  console.error('Process failed:', err);
  process.exit(1);
});
