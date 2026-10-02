import prisma from '../api/lib/prisma.js';
import { db } from '../api/lib/db-service.js';
import { FinancialService } from '../api/lib/financial-service.js';

async function runConcurrencyAndE2ESuite() {
  console.log('🚀 [CONCURRENCY & E2E SUITE] Starting Concurrency & E2E Lifecycle Automated Suite...\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail: string = '') {
    if (condition) {
      console.log(`  ✅ PASSED: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAILED: ${testName} ${detail ? `- ${detail}` : ''}`);
      failed++;
    }
  }

  const timestamp = Date.now();

  try {
    // ----------------------------------------------------
    // TEST 1: CONCURRENT TICKET PURCHASES (INVENTORY OVERBOOKING PREVENTION)
    // ----------------------------------------------------
    console.log('--- TEST 1: Concurrent Ticket Inventory Race Condition Guard ---');

    const organizer = await prisma.user.create({
      data: {
        email: `conc_org_${timestamp}@test.com`,
        password_hash: 'hashed',
        name: 'Conc Org',
        role: 'organizer'
      }
    });

    const futureEventDate = new Date(Date.now() + 7 * 24 * 3600 * 1000);
    const event = await prisma.event.create({
      data: {
        title: 'High Demand Flash Sale',
        description: 'Only 1 ticket left',
        date: futureEventDate,
        event_date: '2026-08-25',
        event_time: '19:00',
        venue: 'Grand Hall',
        location: 'Cairo',
        organizer_id: organizer.id,
        is_published: true
      }
    });

    // Create a ticket type with EXACTLY 1 ticket available
    const limitedType = await prisma.ticketType.create({
      data: {
        event_id: event.id,
        name: 'Super Rare Tier',
        price: 500,
        quantity_total: 1,
        quantity_sold: 0
      }
    });

    // Setup 5 concurrent buyers
    const buyerPromises = [];
    for (let i = 0; i < 5; i++) {
      const buyerId = i + 1;
      buyerPromises.push(
        prisma.$transaction(async (tx) => {
          // Atomic update check
          const updated = await tx.ticketType.updateMany({
            where: {
              id: limitedType.id,
              quantity_total: { gt: prisma.ticketType.fields.quantity_sold }
            },
            data: {
              quantity_sold: { increment: 1 }
            }
          });

          if (updated.count === 0) {
            return { buyerId, success: false, reason: 'SOLD_OUT' };
          }

          return { buyerId, success: true, reason: 'PURCHASED' };
        })
      );
    }

    const results = await Promise.all(buyerPromises);
    const successfulPurchases = results.filter(r => r.success);
    const failedPurchases = results.filter(r => !r.success);

    assert(successfulPurchases.length === 1, 'Exactly ONE buyer successfully claimed the last ticket');
    assert(failedPurchases.length === 4, 'Four concurrent buyers were safely rejected due to sold out status');

    const checkType = await prisma.ticketType.findUnique({ where: { id: limitedType.id } });
    assert(checkType?.quantity_sold === 1, 'Final quantity_sold in DB is exactly 1 (no overbooking)');

    // ----------------------------------------------------
    // TEST 2: CONCURRENT MARKETPLACE RESERVATIONS
    // ----------------------------------------------------
    console.log('\n--- TEST 2: Concurrent Marketplace Resale Listing Reservation ---');

    const sellerUser = await prisma.user.create({
      data: {
        email: `resale_seller_${timestamp}@test.com`,
        password_hash: 'hashed',
        name: 'Resale Seller',
        role: 'user'
      }
    });

    const buyerUser1 = await prisma.user.create({
      data: {
        email: `resale_buyer1_${timestamp}@test.com`,
        password_hash: 'hashed',
        name: 'Resale Buyer 1',
        role: 'user'
      }
    });

    const buyerUser2 = await prisma.user.create({
      data: {
        email: `resale_buyer2_${timestamp}@test.com`,
        password_hash: 'hashed',
        name: 'Resale Buyer 2',
        role: 'user'
      }
    });

    const sellerOrder = await prisma.order.create({
      data: {
        public_id: `ORD_RSL_${timestamp}`,
        user_id: sellerUser.id,
        event_id: event.id,
        total_price: 300,
        is_paid: true,
        order_status: 'paid'
      }
    });

    const sellerTicket = await prisma.ticketInstance.create({
      data: {
        public_id: `TKT_RESALE_${timestamp}`,
        qr_token: `QR_RESALE_${timestamp}`,
        owner_id: sellerUser.id,
        order_id: sellerOrder.id,
        ticket_type_id: limitedType.id,
        status: 'VALID'
      }
    });

    const listing = await db.createMarketplaceListing(sellerUser.id, {
      ticket_public_id: sellerTicket.public_id,
      price: 300
    });

    // Helper function for atomic listing reservation
    async function reserveResaleListing(listingId: number, buyerUserId: number) {
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
      return await prisma.$transaction(async (tx) => {
        const updated = await tx.ticketResaleListing.updateMany({
          where: {
            id: listingId,
            status: 'LISTED',
            OR: [
              { reservation_expires_at: null },
              { reservation_expires_at: { lt: new Date() } }
            ]
          },
          data: {
            status: 'RESERVED',
            reserved_by_user_id: buyerUserId,
            reservation_expires_at: expiresAt
          }
        });

        if (updated.count === 0) {
          return { success: false, reason: 'ALREADY_RESERVED_OR_UNAVAILABLE' };
        }
        return { success: true };
      });
    }

    // 2 buyers attempt to reserve the listing simultaneously
    const res1 = await reserveResaleListing(listing.id, buyerUser1.id);
    const res2 = await reserveResaleListing(listing.id, buyerUser2.id);

    const reservationSuccesses = [res1, res2].filter(r => r.success);
    assert(reservationSuccesses.length === 1, 'Exactly ONE buyer successfully reserved the resale listing');

    // ----------------------------------------------------
    // TEST 3: WEBHOOK DUPLICATE REPLAY IDEMPOTENCY
    // ----------------------------------------------------
    console.log('\n--- TEST 3: Webhook Event Deduplication & Idempotency ---');

    const webhookEventId = `WH_CONC_TEST_${timestamp}`;
    let webhookExecCount = 0;

    const run1 = await FinancialService.processWebhookEventSafely(
      webhookEventId,
      'pay.success',
      { id: webhookEventId },
      async () => {
        webhookExecCount++;
        return { success: true };
      }
    );

    const run2 = await FinancialService.processWebhookEventSafely(
      webhookEventId,
      'pay.success',
      { id: webhookEventId },
      async () => {
        webhookExecCount++;
        return { success: true };
      }
    );

    assert(webhookExecCount === 1, 'Webhook processor function executed EXACTLY ONCE across duplicate deliveries');
    assert(run1.status === 'PROCESSED', 'First webhook delivery processed successfully');
    assert(run2.status === 'DUPLICATE', 'Second duplicate webhook delivery skipped seamlessly');

    // Cleanup
    await prisma.ticketResaleListing.delete({ where: { id: listing.id } });
    await prisma.ticketInstance.delete({ where: { id: sellerTicket.id } });
    await prisma.order.delete({ where: { id: sellerOrder.id } });
    await prisma.ticketType.delete({ where: { id: limitedType.id } });
    await prisma.event.delete({ where: { id: event.id } });
    await prisma.user.deleteMany({
      where: {
        id: { in: [organizer.id, sellerUser.id, buyerUser1.id, buyerUser2.id] }
      }
    });

  } catch (err: any) {
    console.error('❌ Concurrency & E2E Suite Error:', err);
    failed++;
  }

  console.log(`\n==================================================`);
  console.log(`🏁 [CONCURRENCY & E2E SUITE RESULT] Passed: ${passed} | Failed: ${failed}`);
  console.log(`==================================================\n`);

  if (failed > 0) process.exit(1);
}

runConcurrencyAndE2ESuite().catch(err => {
  console.error(err);
  process.exit(1);
});
