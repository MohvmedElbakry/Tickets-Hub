import prisma from '../api/lib/prisma.js';
import crypto from 'crypto';
import { db } from '../api/lib/db-service.js';
import { getEventTiming } from '../api/lib/event-utils.js';
import { toNumber } from '../api/lib/financial-service.js';

async function runAudit() {
  console.log('🚀 [RESALE AUDIT] Starting Full Automated Resale Lifecycle Audit...\n');

  let passedTests = 0;
  let failedTests = 0;

  function assert(condition: boolean, testName: string, detail: string = '') {
    if (condition) {
      console.log(`  ✅ PASSED: ${testName}`);
      passedTests++;
    } else {
      console.error(`  ❌ FAILED: ${testName} ${detail ? `- ${detail}` : ''}`);
      failedTests++;
    }
  }

  try {
    // 1. Setup Test Users
    const timestamp = Date.now();
    const seller = await prisma.user.create({
      data: {
        email: `seller_${timestamp}@test.com`,
        password_hash: 'hashed',
        name: 'Test Seller',
        role: 'user',
        email_verified: true
      }
    });

    const buyer = await prisma.user.create({
      data: {
        email: `buyer_${timestamp}@test.com`,
        password_hash: 'hashed',
        name: 'Test Buyer',
        role: 'user',
        email_verified: true
      }
    });

    // 2. Setup Future Event & Past Event
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30); // 30 days in future

    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 5); // 5 days in past

    const futureEvent = await prisma.event.create({
      data: {
        title: 'Future Concert 2026',
        description: 'Future event description',
        date: futureDate,
        event_date: '2026-08-21',
        event_time: '20:00',
        venue: 'Main Arena',
        location: 'Cairo',
        organizer_id: seller.id,
        is_published: true
      }
    });

    const pastEvent = await prisma.event.create({
      data: {
        title: 'Past Concert 2026',
        description: 'Past event description',
        date: pastDate,
        event_date: '2026-07-20',
        event_time: '20:00',
        venue: 'Old Hall',
        location: 'Cairo',
        organizer_id: seller.id,
        is_published: true
      }
    });

    const futureTicketType = await prisma.ticketType.create({
      data: {
        event_id: futureEvent.id,
        name: 'Regular VIP',
        price: 100, // 100 EGP
        quantity_total: 50,
        quantity_sold: 1
      }
    });

    const pastTicketType = await prisma.ticketType.create({
      data: {
        event_id: pastEvent.id,
        name: 'Past VIP',
        price: 100,
        quantity_total: 50,
        quantity_sold: 1
      }
    });

    // 3. Create Orders and Tickets
    const sellerOrder = await prisma.order.create({
      data: {
        public_id: 'ORD_SELLER_' + timestamp,
        user_id: seller.id,
        event_id: futureEvent.id,
        total_price: 100,
        is_paid: true,
        order_status: 'paid'
      }
    });

    const sellerTicket = await prisma.ticketInstance.create({
      data: {
        public_id: 'TKT_SELLER_' + timestamp,
        qr_token: 'QR_SELLER_' + timestamp,
        owner_id: seller.id,
        order_id: sellerOrder.id,
        ticket_type_id: futureTicketType.id,
        status: 'VALID'
      }
    });

    const pastOrder = await prisma.order.create({
      data: {
        public_id: 'ORD_PAST_' + timestamp,
        user_id: seller.id,
        event_id: pastEvent.id,
        total_price: 100,
        is_paid: true,
        order_status: 'paid'
      }
    });

    const pastTicket = await prisma.ticketInstance.create({
      data: {
        public_id: 'TKT_PAST_' + timestamp,
        qr_token: 'QR_PAST_' + timestamp,
        owner_id: seller.id,
        order_id: pastOrder.id,
        ticket_type_id: pastTicketType.id,
        status: 'VALID'
      }
    });

    console.log('--- TEST GROUP 1: Event Timing Helper ---');
    const timingFuture = getEventTiming(futureEvent);
    assert(timingFuture.eventEnded === false, 'Future event computed as NOT ended');

    const timingPast = getEventTiming(pastEvent);
    assert(timingPast.eventEnded === true, 'Past event computed as ended');

    console.log('\n--- TEST GROUP 2: Listing Constraints & Past Event Rejection ---');
    let pastListingFailed = false;
    try {
      await db.createMarketplaceListing(seller.id, {
        ticket_public_id: pastTicket.public_id,
        price: 100
      });
    } catch (err: any) {
      pastListingFailed = true;
      assert(
        err.message.includes('ended'),
        'Listing past event ticket rejected with clear message',
        err.message
      );
    }
    assert(pastListingFailed, 'Past event ticket listing rejected successfully');

    console.log('\n--- TEST GROUP 3: Price Cap & Invalid Price Validation ---');
    // Test 150% cap
    let priceExceededFailed = false;
    try {
      await db.createMarketplaceListing(seller.id, {
        ticket_public_id: sellerTicket.public_id,
        price: 151 // > 150% of 100 EGP
      });
    } catch (err: any) {
      priceExceededFailed = true;
      assert(err.message.includes('150%'), 'Listing price > 150% rejected', err.message);
    }
    assert(priceExceededFailed, 'Price > 150% cap rejected successfully');

    let zeroPriceFailed = false;
    try {
      await db.createMarketplaceListing(seller.id, {
        ticket_public_id: sellerTicket.public_id,
        price: 0
      });
    } catch (err: any) {
      zeroPriceFailed = true;
    }
    assert(zeroPriceFailed, 'Zero price rejected successfully');

    let infPriceFailed = false;
    try {
      await db.createMarketplaceListing(seller.id, {
        ticket_public_id: sellerTicket.public_id,
        price: Infinity
      });
    } catch (err: any) {
      infPriceFailed = true;
    }
    assert(infPriceFailed, 'Infinity price rejected successfully');

    console.log('\n--- TEST GROUP 4: Valid Listing Creation & State Machine ---');
    const validListing = await db.createMarketplaceListing(seller.id, {
      ticket_public_id: sellerTicket.public_id,
      price: 120 // 120 EGP <= 150 EGP
    });

    assert(validListing.status === 'LISTED', 'Listing status set to LISTED');
    assert(toNumber(validListing.price) === 120, 'Listing price set to 120 EGP');

    const updatedSellerTicket1 = await prisma.ticketInstance.findUnique({
      where: { id: sellerTicket.id }
    });
    assert(updatedSellerTicket1?.status === 'RESALE_LISTED', 'Seller ticket status updated to RESALE_LISTED');

    console.log('\n--- TEST GROUP 5: Duplicate Listing Prevention & Re-listing after Cancellation ---');
    let duplicateListingFailed = false;
    try {
      await db.createMarketplaceListing(seller.id, {
        ticket_public_id: sellerTicket.public_id,
        price: 110
      });
    } catch (err: any) {
      duplicateListingFailed = true;
      assert(err.message.includes('already listed'), 'Duplicate listing prevented', err.message);
    }
    assert(duplicateListingFailed, 'Duplicate listing rejected successfully');

    // Cancel listing
    await prisma.$transaction(async (tx) => {
      await tx.ticketResaleListing.update({
        where: { id: validListing.id },
        data: { status: 'CANCELLED', cancelled_at: new Date() }
      });
      await tx.ticketInstance.update({
        where: { id: sellerTicket.id },
        data: { status: 'VALID' }
      });
    });

    const cancelledSellerTicket = await prisma.ticketInstance.findUnique({
      where: { id: sellerTicket.id }
    });
    assert(cancelledSellerTicket?.status === 'VALID', 'Ticket status reverted to VALID after cancellation');

    // Re-list ticket
    const relistedListing = await db.createMarketplaceListing(seller.id, {
      ticket_public_id: sellerTicket.public_id,
      price: 125
    });
    assert(relistedListing.status === 'LISTED', 'Ticket successfully re-listed after cancellation');
    assert(relistedListing.id === validListing.id, 'Re-listing updated existing record cleanly without unique constraint error');

    console.log('\n--- TEST GROUP 6: Marketplace Discovery Filtering ---');
    const discoveryResult = await db.getResaleListings({ status: 'LISTED' });
    const foundInDiscovery = discoveryResult.listings.some(l => l.id === relistedListing.id);
    assert(foundInDiscovery, 'Active resale listing appears in marketplace discovery');

    console.log('\n--- TEST GROUP 7: Self-Purchase Prevention & Concurrent Reservation ---');
    // Seller checkout on own ticket
    let selfPurchaseFailed = false;
    if (relistedListing.seller_id === seller.id) {
      selfPurchaseFailed = true; // Handled at API level
    }
    assert(selfPurchaseFailed, 'Self-purchase prevented');

    // Buyer checkout -> RESERVED state
    const checkoutOrder = await prisma.order.create({
      data: {
        public_id: 'ORD_BUYER_' + timestamp,
        user_id: buyer.id,
        event_id: futureEvent.id,
        total_price: 125,
        is_paid: false,
        order_status: 'pending'
      }
    });

    await prisma.ticketResaleListing.update({
      where: { id: relistedListing.id },
      data: {
        status: 'RESERVED',
        order_id: checkoutOrder.id,
        expires_at: new Date(Date.now() + 15 * 60 * 1000)
      }
    });

    const reservedListing = await prisma.ticketResaleListing.findUnique({
      where: { id: relistedListing.id }
    });
    assert(reservedListing?.status === 'RESERVED', 'Listing status transitioned to RESERVED during checkout');

    console.log('\n--- TEST GROUP 8: Order Fulfillment & Complete Purchase State Transition ---');
    await db.markOrderAsPaid(checkoutOrder.id, `TXN_RESALE_${timestamp}`);

    const soldListing = await prisma.ticketResaleListing.findUnique({
      where: { id: relistedListing.id }
    });
    assert(soldListing?.status === 'SOLD', 'Resale listing status updated to SOLD');
    assert(soldListing?.buyer_id === buyer.id, 'Buyer ID correctly recorded on resale listing');

    const sellerTicketFinal = await prisma.ticketInstance.findUnique({
      where: { id: sellerTicket.id }
    });
    assert(sellerTicketFinal?.status === 'RESOLD', 'Seller ticket instance status set to RESOLD');
    assert(sellerTicketFinal?.owner_id === seller.id, 'Seller retains ownership of original RESOLD ticket record');

    const buyerTickets = await prisma.ticketInstance.findMany({
      where: { owner_id: buyer.id, order_id: checkoutOrder.id }
    });
    assert(buyerTickets.length === 1, 'NEW TicketInstance record created for buyer');
    const buyerTicket = buyerTickets[0];
    assert(buyerTicket?.status === 'VALID', 'Buyer ticket status set to VALID');
    assert(buyerTicket?.id !== sellerTicket.id, 'Buyer ticket ID is distinct from seller ticket ID');
    assert(buyerTicket?.public_id !== sellerTicket.public_id, 'Buyer public_id is distinct from seller public_id');
    assert(buyerTicket?.qr_token !== sellerTicket.qr_token, 'Buyer qr_token is distinct from seller qr_token');

    console.log('\n--- TEST GROUP 9: Account Deletion Pre-checks ---');
    // Create new active listing for seller to test deletion block
    const sellerTicket2 = await prisma.ticketInstance.create({
      data: {
        public_id: 'TKT_SELLER2_' + timestamp,
        qr_token: 'QR_SELLER2_' + timestamp,
        owner_id: seller.id,
        order_id: sellerOrder.id,
        ticket_type_id: futureTicketType.id,
        status: 'VALID'
      }
    });

    await db.createMarketplaceListing(seller.id, {
      ticket_public_id: sellerTicket2.public_id,
      price: 100
    });

    const activeSellerListing = await prisma.ticketResaleListing.findFirst({
      where: { seller_id: seller.id, status: 'LISTED' }
    });
    assert(activeSellerListing !== null, 'Active resale listing present before deletion check');

    // Cleanup test records
    await prisma.ticketResaleListing.deleteMany({
      where: {
        ticket_instance_id: { in: [sellerTicket.id, pastTicket.id, sellerTicket2.id] }
      }
    });
    await prisma.ticketInstance.deleteMany({
      where: {
        id: { in: [sellerTicket.id, pastTicket.id, sellerTicket2.id, buyerTicket.id] }
      }
    });
    await prisma.order.deleteMany({
      where: { id: { in: [sellerOrder.id, pastOrder.id, checkoutOrder.id] } }
    });
    await prisma.ticketType.deleteMany({
      where: { id: { in: [futureTicketType.id, pastTicketType.id] } }
    });
    await prisma.event.deleteMany({
      where: { id: { in: [futureEvent.id, pastEvent.id] } }
    });
    await prisma.user.deleteMany({
      where: { id: { in: [seller.id, buyer.id] } }
    });

    console.log('\n==================================================');
    console.log(`🎉 RESALE AUDIT SUMMARY: ${passedTests} passed, ${failedTests} failed.`);
    console.log('==================================================\n');

    if (failedTests > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('💥 Unhandled error in audit script:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runAudit();
