import prisma from '../api/lib/prisma.js';
import app from '../api/app.js';
import { env } from '../api/lib/env.js';
import jwt from 'jsonwebtoken';
import http from 'http';

async function runVenueScannerSuite() {
  console.log('================================================================');
  console.log('   TICKETS HUB — VENUE SCANNER & QR CHECK-IN CERTIFICATION SUITE ');
  console.log('================================================================\n');

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
  const JWT_SECRET = env.JWT_SECRET;

  // Spin up an ephemeral HTTP server to test against the real Express stack
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address() as any;
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    // ----------------------------------------------------
    // SETUP: TEST USERS, EVENT & TICKET TYPES
    // ----------------------------------------------------
    const adminUser = await prisma.user.create({
      data: {
        email: `admin_scan_${timestamp}@test.com`,
        password_hash: 'hashed',
        name: 'Gate Admin',
        role: 'admin',
        email_verified: true,
        token_version: 0
      }
    });

    const regularUser = await prisma.user.create({
      data: {
        email: `reg_scan_${timestamp}@test.com`,
        password_hash: 'hashed',
        name: 'Regular Attendee',
        role: 'user',
        email_verified: true,
        token_version: 0
      }
    });

    const adminToken = jwt.sign(
      { id: adminUser.id, role: 'admin', email: adminUser.email, tokenVersion: 0 },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    const userToken = jwt.sign(
      { id: regularUser.id, role: 'user', email: regularUser.email, tokenVersion: 0 },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    const eventDate = new Date(Date.now() + 86400000);
    const testEventA = await prisma.event.create({
      data: {
        title: 'Festival Stage Alpha',
        date: eventDate,
        event_date: eventDate.toISOString().split('T')[0],
        event_time: '20:00',
        venue: 'Main Arena',
        location: 'Cairo',
        is_published: true
      }
    });

    const testEventB = await prisma.event.create({
      data: {
        title: 'Festival Stage Beta',
        date: eventDate,
        event_date: eventDate.toISOString().split('T')[0],
        event_time: '22:00',
        venue: 'Side Arena',
        location: 'Cairo',
        is_published: true
      }
    });

    const ticketTypeA = await prisma.ticketType.create({
      data: {
        event_id: testEventA.id,
        name: 'General Admission A',
        price: 150,
        quantity_total: 100,
        quantity_sold: 5
      }
    });

    const paidOrderA = await prisma.order.create({
      data: {
        user_id: regularUser.id,
        event_id: testEventA.id,
        total_price: 150,
        is_paid: true,
        order_status: 'paid',
        qr_code_token: `legacy_order_qr_${timestamp}`,
        public_id: `ORD_SCAN_A_${timestamp}`
      }
    });

    const unpaidOrderA = await prisma.order.create({
      data: {
        user_id: regularUser.id,
        event_id: testEventA.id,
        total_price: 150,
        is_paid: false,
        order_status: 'pending',
        public_id: `ORD_UNPAID_${timestamp}`
      }
    });

    // Helper to send scan requests
    async function sendScanRequest(body: any, token: string | null = adminToken) {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${baseUrl}/api/admin/scan`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      });

      const data = await res.json().catch(() => ({}));
      return { status: res.status, data };
    }

    // ----------------------------------------------------
    // TEST 1: AUTHENTICATION & RBAC ENFORCEMENT
    // ----------------------------------------------------
    console.log('--- TEST 1: Gate Scanner Auth & RBAC Security ---');

    const noAuth = await sendScanRequest({ ticket_id: 'any', event_id: testEventA.id }, null);
    assert(noAuth.status === 401, 'Unauthenticated scan request rejected with 401 Unauthorized');

    const regularUserScan = await sendScanRequest({ ticket_id: 'any', event_id: testEventA.id }, userToken);
    assert(regularUserScan.status === 403, 'Non-admin user rejected with 403 Forbidden (RBAC Enforcement)');

    const missingParams = await sendScanRequest({}, adminToken);
    assert(missingParams.status === 400, 'Missing parameters rejected with 400');

    // ----------------------------------------------------
    // TEST 2: MODERN QR PAYLOAD PARSING & CHECK-IN
    // ----------------------------------------------------
    console.log('\n--- TEST 2: Modern QR Code Format (TicketsHub-Ticket-{qr_token}) ---');

    const qrToken1 = `hex_token_${timestamp}_1`;
    const ticket1 = await prisma.ticketInstance.create({
      data: {
        public_id: `TKT_SCAN_1_${timestamp}`,
        qr_token: qrToken1,
        order_id: paidOrderA.id,
        ticket_type_id: ticketTypeA.id,
        owner_id: regularUser.id,
        attendee_name: 'Layla Ahmed',
        status: 'VALID'
      }
    });

    // Send the real formatted string emitted by TicketsHub QR generator
    const modernQrString = `TicketsHub-Ticket-${qrToken1}`;
    const scan1 = await sendScanRequest({ ticket_id: modernQrString, event_id: testEventA.id });
    assert(scan1.status === 200, 'Scans modern format TicketsHub-Ticket-{qr_token} successfully (200 Approved)');
    assert(scan1.data.message === 'Approved', 'Response returns Approved message');
    assert(scan1.data.ticket?.attendee_name === 'Layla Ahmed', 'Returns correct attendee name');
    assert(scan1.data.ticket?.status === 'CHECKED_IN', 'Ticket status in response is CHECKED_IN');

    // Verify DB update
    const dbTicket1 = await prisma.ticketInstance.findUnique({ where: { id: ticket1.id } });
    assert(dbTicket1?.status === 'CHECKED_IN', 'Database status updated to CHECKED_IN');
    assert(dbTicket1?.checked_in_at !== null, 'checked_in_at timestamp recorded');

    // ----------------------------------------------------
    // TEST 3: REPLAY ATTACK DEFENSE (DUPLICATE SCAN DETECTION)
    // ----------------------------------------------------
    console.log('\n--- TEST 3: Replay Protection & Duplicate Scan Defense ---');

    const replayScan = await sendScanRequest({ ticket_id: modernQrString, event_id: testEventA.id });
    assert(replayScan.status === 400, 'Duplicate scan rejected with 400');
    assert(replayScan.data.error === 'Already scanned', 'Explicit Already scanned error message');
    assert(replayScan.data.scanned_count === 1, 'Previous scan count returned for venue audit');

    // ----------------------------------------------------
    // TEST 4: CONCURRENT CHECK-IN RACE CONDITIONS
    // ----------------------------------------------------
    console.log('\n--- TEST 4: Multi-Gate Concurrency (Simultaneous Dual Scan) ---');

    const qrTokenConc = `hex_token_conc_${timestamp}`;
    const ticketConc = await prisma.ticketInstance.create({
      data: {
        public_id: `TKT_CONC_${timestamp}`,
        qr_token: qrTokenConc,
        order_id: paidOrderA.id,
        ticket_type_id: ticketTypeA.id,
        owner_id: regularUser.id,
        attendee_name: 'Concurrent Attendee',
        status: 'VALID'
      }
    });

    const concurrentQrPayload = `TicketsHub-Ticket-${qrTokenConc}`;
    // Fire 10 simultaneous scan attempts across parallel gates
    const concurrentResponses = await Promise.all([
      sendScanRequest({ ticket_id: concurrentQrPayload, event_id: testEventA.id }),
      sendScanRequest({ ticket_id: concurrentQrPayload, event_id: testEventA.id }),
      sendScanRequest({ ticket_id: concurrentQrPayload, event_id: testEventA.id }),
      sendScanRequest({ ticket_id: concurrentQrPayload, event_id: testEventA.id }),
      sendScanRequest({ ticket_id: concurrentQrPayload, event_id: testEventA.id }),
      sendScanRequest({ ticket_id: concurrentQrPayload, event_id: testEventA.id }),
      sendScanRequest({ ticket_id: concurrentQrPayload, event_id: testEventA.id }),
      sendScanRequest({ ticket_id: concurrentQrPayload, event_id: testEventA.id }),
      sendScanRequest({ ticket_id: concurrentQrPayload, event_id: testEventA.id }),
      sendScanRequest({ ticket_id: concurrentQrPayload, event_id: testEventA.id })
    ]);

    const approvedCount = concurrentResponses.filter(r => r.status === 200).length;
    const rejectedCount = concurrentResponses.filter(r => r.status === 400).length;

    assert(approvedCount === 1, `Exactly ONE concurrent scan admitted (Got: ${approvedCount})`);
    assert(rejectedCount === 9, `All other 9 concurrent attempts rejected as duplicates (Got: ${rejectedCount})`);

    // ----------------------------------------------------
    // TEST 5: EVENT MISMATCH DEFENSE (CROSS-VENUE / WRONG GATE)
    // ----------------------------------------------------
    console.log('\n--- TEST 5: Gate/Event Mismatch Validation ---');

    const qrTokenMismatch = `hex_mismatch_${timestamp}`;
    await prisma.ticketInstance.create({
      data: {
        public_id: `TKT_MISMATCH_${timestamp}`,
        qr_token: qrTokenMismatch,
        order_id: paidOrderA.id,
        ticket_type_id: ticketTypeA.id,
        owner_id: regularUser.id,
        status: 'VALID'
      }
    });

    // Try scanning ticket for Event A at Event B's gate
    const mismatchScan = await sendScanRequest({
      ticket_id: `TicketsHub-Ticket-${qrTokenMismatch}`,
      event_id: testEventB.id
    });
    assert(mismatchScan.status === 400, 'Cross-event scan rejected with 400');
    assert(mismatchScan.data.error === 'Mismatch event', 'Returns Mismatch event error');

    // ----------------------------------------------------
    // TEST 6: PAYMENT & LIFECYCLE STATUS VALIDATIONS
    // ----------------------------------------------------
    console.log('\n--- TEST 6: Payment & Lifecycle Status Guards ---');

    // Unpaid Order
    const unpaidTicket = await prisma.ticketInstance.create({
      data: {
        public_id: `TKT_UNPAID_${timestamp}`,
        qr_token: `qr_unpaid_${timestamp}`,
        order_id: unpaidOrderA.id,
        ticket_type_id: ticketTypeA.id,
        owner_id: regularUser.id,
        status: 'VALID'
      }
    });
    const unpaidScan = await sendScanRequest({
      ticket_id: `TicketsHub-Ticket-${unpaidTicket.qr_token}`,
      event_id: testEventA.id
    });
    assert(unpaidScan.status === 400, 'Unpaid ticket rejected with 400');
    assert(unpaidScan.data.error === 'Order not paid', 'Returns Order not paid error');

    // Transfer Pending Ticket
    const transferPendingTicket = await prisma.ticketInstance.create({
      data: {
        public_id: `TKT_XFER_${timestamp}`,
        qr_token: `qr_xfer_${timestamp}`,
        order_id: paidOrderA.id,
        ticket_type_id: ticketTypeA.id,
        owner_id: regularUser.id,
        status: 'TRANSFER_PENDING'
      }
    });
    const xferScan = await sendScanRequest({
      ticket_id: `TicketsHub-Ticket-${transferPendingTicket.qr_token}`,
      event_id: testEventA.id
    });
    assert(xferScan.status === 400, 'TRANSFER_PENDING ticket rejected with 400');
    assert(xferScan.data.error.includes('pending transfer'), 'Pending transfer reason provided');

    // Resale Listed Ticket
    const resaleTicket = await prisma.ticketInstance.create({
      data: {
        public_id: `TKT_RESALE_${timestamp}`,
        qr_token: `qr_resale_${timestamp}`,
        order_id: paidOrderA.id,
        ticket_type_id: ticketTypeA.id,
        owner_id: regularUser.id,
        status: 'RESALE_LISTED'
      }
    });
    const resaleScan = await sendScanRequest({
      ticket_id: `TicketsHub-Ticket-${resaleTicket.qr_token}`,
      event_id: testEventA.id
    });
    assert(resaleScan.status === 400, 'RESALE_LISTED ticket rejected with 400');
    assert(resaleScan.data.error.includes('listed for resale'), 'Resale listed reason provided');

    // Resold Ticket
    const resoldTicket = await prisma.ticketInstance.create({
      data: {
        public_id: `TKT_SOLD_${timestamp}`,
        qr_token: `qr_sold_${timestamp}`,
        order_id: paidOrderA.id,
        ticket_type_id: ticketTypeA.id,
        owner_id: regularUser.id,
        status: 'RESOLD'
      }
    });
    const resoldScan = await sendScanRequest({
      ticket_id: `TicketsHub-Ticket-${resoldTicket.qr_token}`,
      event_id: testEventA.id
    });
    assert(resoldScan.status === 400, 'RESOLD ticket rejected with 400');
    assert(resoldScan.data.error.includes('resold'), 'Resold reason provided');

    // ----------------------------------------------------
    // TEST 7: ALTERNATIVE IDENTIFIER & WRAPPER NORMALIZATION
    // ----------------------------------------------------
    console.log('\n--- TEST 7: Raw Token, Public ID, URL & Whitespace Normalization ---');

    // 7A: Raw token without TicketsHub-Ticket- prefix
    const rawTicket = await prisma.ticketInstance.create({
      data: {
        public_id: `TKT_RAW_${timestamp}`,
        qr_token: `raw_token_${timestamp}`,
        order_id: paidOrderA.id,
        ticket_type_id: ticketTypeA.id,
        owner_id: regularUser.id,
        status: 'VALID'
      }
    });
    const rawScan = await sendScanRequest({
      ticket_id: `  raw_token_${timestamp}  `, // with whitespace
      event_id: testEventA.id
    });
    assert(rawScan.status === 200, 'Raw token with leading/trailing whitespace admitted (200 Approved)');

    // 7B: Public ID
    const publicIdTicket = await prisma.ticketInstance.create({
      data: {
        public_id: `TKT_PUB_${timestamp}`,
        qr_token: `qr_pub_${timestamp}`,
        order_id: paidOrderA.id,
        ticket_type_id: ticketTypeA.id,
        owner_id: regularUser.id,
        status: 'VALID'
      }
    });
    const pubScan = await sendScanRequest({
      ticket_id: `TKT_PUB_${timestamp}`,
      event_id: testEventA.id
    });
    assert(pubScan.status === 200, 'Admission via Ticket Public ID admitted (200 Approved)');

    // 7C: URL-wrapped token (e.g. from customer web link or full URL barcode)
    const urlTicket = await prisma.ticketInstance.create({
      data: {
        public_id: `TKT_URL_${timestamp}`,
        qr_token: `qr_url_${timestamp}`,
        order_id: paidOrderA.id,
        ticket_type_id: ticketTypeA.id,
        owner_id: regularUser.id,
        status: 'VALID'
      }
    });
    const urlScan = await sendScanRequest({
      ticket_id: `https://ticketshub.com/tickets/TKT_URL_${timestamp}`,
      event_id: testEventA.id
    });
    assert(urlScan.status === 200, 'URL-wrapped ticket admitted via path extraction (200 Approved)');

    // ----------------------------------------------------
    // TEST 8: LEGACY ORDER QR CODE PARSING & BACKFILL
    // ----------------------------------------------------
    console.log('\n--- TEST 8: Legacy Order Format (TicketsHub-Order-{qr_code_token}) ---');

    const legacyOrderTicket = await prisma.orderTicket.create({
      data: {
        order_id: paidOrderA.id,
        ticket_type_id: ticketTypeA.id,
        quantity: 1,
        holder_name: 'Legacy Attendee',
        is_used: false,
        scanned_count: 0
      }
    });

    const legacyQrPayload = `TicketsHub-Order-${paidOrderA.qr_code_token}`;
    const legacyScan = await sendScanRequest({
      ticket_id: legacyQrPayload,
      event_id: testEventA.id
    });
    assert(legacyScan.status === 200, 'Admitted via legacy format TicketsHub-Order-{qr_code_token} (200 Approved)');
    assert(legacyScan.data.message.includes('Approved'), 'Approved response for legacy order');

    // Replay of legacy order
    const legacyReplay = await sendScanRequest({
      ticket_id: legacyQrPayload,
      event_id: testEventA.id
    });
    assert(legacyReplay.status === 400, 'Duplicate scan of legacy order rejected (400 Already scanned)');

    // ----------------------------------------------------
    // TEST 9: NON-EXISTENT & MALFORMED PAYLOADS
    // ----------------------------------------------------
    console.log('\n--- TEST 9: Malformed & Non-Existent Payload Rejections ---');

    const nonExistentScan = await sendScanRequest({
      ticket_id: 'TicketsHub-Ticket-TOTALLY_FAKE_TOKEN_XYZ',
      event_id: testEventA.id
    });
    assert(nonExistentScan.status === 404, 'Non-existent ticket rejected with 404 Ticket not found');

    // ----------------------------------------------------
    // CLEANUP
    // ----------------------------------------------------
    await prisma.ticketInstance.deleteMany({
      where: {
        order_id: { in: [paidOrderA.id, unpaidOrderA.id] }
      }
    });
    await prisma.orderTicket.deleteMany({
      where: { id: legacyOrderTicket.id }
    });
    await prisma.order.deleteMany({
      where: { id: { in: [paidOrderA.id, unpaidOrderA.id] } }
    });
    await prisma.ticketType.deleteMany({
      where: { id: ticketTypeA.id }
    });
    await prisma.event.deleteMany({
      where: { id: { in: [testEventA.id, testEventB.id] } }
    });
    await prisma.user.deleteMany({
      where: { id: { in: [adminUser.id, regularUser.id] } }
    });

  } catch (err: any) {
    console.error('❌ Venue Scanner Suite Exception:', err);
    failed++;
  } finally {
    server.close();
  }

  console.log(`\n================================================================`);
  console.log(`🏁 [VENUE SCANNER SUITE RESULT] Passed: ${passed} | Failed: ${failed}`);
  console.log(`================================================================\n`);

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runVenueScannerSuite().catch(err => {
  console.error(err);
  process.exit(1);
});
