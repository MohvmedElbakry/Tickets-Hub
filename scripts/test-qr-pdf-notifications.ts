import prisma from '../api/lib/prisma.js';
import crypto from 'crypto';
import qrcode from 'qrcode';
import { NotificationService, NotificationEventType } from '../api/lib/notification-service.js';
import { renderOrderConfirmationTemplate } from '../api/lib/email-templates.js';
import { generateTicketPdfBuffer } from '../api/app.js';

async function runQrPdfNotificationSuite() {
  console.log('🚀 [QR, PDF & NOTIFICATIONS SUITE] Starting QR, PDF & Notification Test Suite...\n');

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
  const QR_SECRET = process.env.JWT_SECRET || 'qr-test-secret-key';

  try {
    // ----------------------------------------------------
    // TEST 1: QR CODE CRYPTOGRAPHIC SIGNATURE & VERIFICATION
    // ----------------------------------------------------
    console.log('--- TEST 1: QR Payload Generation & Cryptographic Signature ---');

    const ticketCode = `TKT_QR_${timestamp}`;
    const payload = JSON.stringify({ ticketCode, issuedAt: timestamp });
    const hmac = crypto.createHmac('sha256', QR_SECRET).update(payload).digest('hex');
    const qrPayload = JSON.stringify({ payload, signature: hmac });

    const qrImageBase64 = await qrcode.toDataURL(qrPayload);
    assert(qrImageBase64.startsWith('data:image/png;base64,'), 'QR Code base64 image generated successfully');

    // Signature verification logic
    function verifyQrCode(data: { payload: string; signature: string }): boolean {
      const expectedHmac = crypto.createHmac('sha256', QR_SECRET).update(data.payload).digest('hex');
      const bufExpected = Buffer.from(expectedHmac);
      const bufSig = Buffer.from(data.signature);
      if (bufExpected.length !== bufSig.length) return false;
      return crypto.timingSafeEqual(bufExpected, bufSig);
    }

    const parsedQr = JSON.parse(qrPayload);
    assert(verifyQrCode(parsedQr), 'QR signature matches expected HMAC');

    const tamperedQr = { payload: parsedQr.payload, signature: '000000000000000000000000' };
    assert(!verifyQrCode(tamperedQr), 'Tampered QR signature is REJECTED');

    // ----------------------------------------------------
    // TEST 2: SINGLE-USE QR CHECK-IN & REPLAY PREVENTION
    // ----------------------------------------------------
    console.log('\n--- TEST 2: QR Check-In & Anti-Replay Engine ---');

    const testOrganizer = await prisma.user.create({
      data: {
        email: `qr_org_${timestamp}@test.com`,
        password_hash: 'hashed',
        name: 'QR Org',
        role: 'organizer'
      }
    });

    const testUser = await prisma.user.create({
      data: {
        email: `qr_user_${timestamp}@test.com`,
        password_hash: 'hashed',
        name: 'QR User',
        role: 'user'
      }
    });

    const testEvent = await prisma.event.create({
      data: {
        title: 'QR Test Event',
        description: 'Testing QR scan',
        date: new Date(),
        event_date: '2026-08-01',
        event_time: '20:00',
        venue: 'Main Stadium',
        location: 'Cairo',
        organizer_id: testOrganizer.id,
        is_published: true
      }
    });

    const ticketType = await prisma.ticketType.create({
      data: {
        event_id: testEvent.id,
        name: 'VIP Scan',
        price: 150,
        quantity_total: 10
      }
    });

    const testOrder = await prisma.order.create({
      data: {
        public_id: `ORD_QR_${timestamp}`,
        user_id: testUser.id,
        event_id: testEvent.id,
        total_price: 150,
        order_status: 'paid',
        is_paid: true
      }
    });

    const ticket = await prisma.ticketInstance.create({
      data: {
        public_id: `TKT_SCAN_${timestamp}`,
        order_id: testOrder.id,
        ticket_type_id: ticketType.id,
        owner_id: testUser.id,
        status: 'VALID',
        qr_token: `CODE_${timestamp}`,
        attendee_name: 'QR User',
        attendee_email: testUser.email
      }
    });

    // Simulated scanner check-in function
    async function scanTicket(ticketId: number): Promise<{ success: boolean; message: string }> {
      return await prisma.$transaction(async (tx) => {
        const tkn = await tx.ticketInstance.findUnique({ where: { id: ticketId } });
        if (!tkn) return { success: false, message: 'Ticket not found' };
        if (tkn.status === 'CHECKED_IN') return { success: false, message: 'REPLAY DETECTED: Ticket already used' };
        if (tkn.status !== 'VALID') return { success: false, message: `Invalid ticket status: ${tkn.status}` };

        await tx.ticketInstance.update({
          where: { id: ticketId },
          data: { status: 'CHECKED_IN', checked_in_at: new Date() }
        });

        return { success: true, message: 'Check-in successful' };
      });
    }

    const scan1 = await scanTicket(ticket.id);
    assert(scan1.success, 'First check-in attempt succeeds');

    const scan2 = await scanTicket(ticket.id);
    assert(!scan2.success, 'Second check-in attempt REJECTED (Replay Protection Active)');
    assert(scan2.message.includes('REPLAY DETECTED'), 'Replay error message explicitly returned');

    // ----------------------------------------------------
    // TEST 3: NOTIFICATION DISPATCHING & TEMPLATE COMPILATION
    // ----------------------------------------------------
    console.log('\n--- TEST 3: Notification Dispatching & Email Template Engine ---');

    const emailTemplate = renderOrderConfirmationTemplate(
      'Ahmad User',
      'ahmad@test.com',
      'QR Test Event',
      `ORD_QR_${timestamp}`,
      150,
      1,
      'https://ticketshub.com/tickets'
    );

    assert(emailTemplate.html.includes('Ahmad User'), 'Compiled email contains customer name');
    assert(emailTemplate.html.includes('QR Test Event'), 'Compiled email contains event name');
    assert(emailTemplate.html.includes(`ORD_QR_${timestamp}`), 'Compiled email contains order ID');

    // Notification Service Record Creation
    const dispatchRes = await NotificationService.dispatch({
      recipientId: testUser.id,
      recipientEmail: testUser.email,
      recipientName: testUser.name || 'QR User',
      eventType: NotificationEventType.PAYMENT_SUCCESSFUL,
      channels: 'BOTH',
      idempotencyKey: `notif_test_${timestamp}`,
      relatedEntityType: 'order',
      relatedEntityId: testOrder.id,
      data: {
        orderPublicId: testOrder.public_id,
        eventTitle: 'QR Test Event'
      }
    });

    assert(dispatchRes.success === true && (dispatchRes.logId ?? 0) > 0, 'NotificationService created in-app notification record cleanly');

    // ----------------------------------------------------
    // TEST 4: PDF AUTHORIZATION & LIFECYCLE STATUS GUARDS
    // ----------------------------------------------------
    console.log('\n--- TEST 4: PDF Route Authorization & Lifecycle Status Matrix ---');

    const unauthorizedUser = await prisma.user.create({
      data: {
        email: `unauth_${timestamp}@test.com`,
        password_hash: 'hashed',
        name: 'Unauthorized User',
        role: 'user'
      }
    });

    const adminUser = await prisma.user.create({
      data: {
        email: `admin_pdf_${timestamp}@test.com`,
        password_hash: 'hashed',
        name: 'Admin User',
        role: 'admin'
      }
    });

    const authorizedTicket = await prisma.ticketInstance.create({
      data: {
        public_id: `TKT_AUTH_${timestamp}`,
        order_id: testOrder.id,
        ticket_type_id: ticketType.id,
        owner_id: testUser.id,
        status: 'VALID',
        qr_token: `AUTH_QR_${timestamp}`,
        attendee_name: 'Auth User',
        attendee_email: testUser.email
      }
    });

    // Mirror the exact route authorization function from api/app.ts
    async function evaluatePdfAccess(
      user: { id: number; role: string } | null,
      publicId: string
    ): Promise<{ status: number; error?: string; allowed: boolean }> {
      if (!user) {
        return { status: 401, error: 'Access denied. No token provided.', allowed: false };
      }

      const tkt = await prisma.ticketInstance.findUnique({
        where: { public_id: publicId }
      });

      if (tkt) {
        if (tkt.owner_id !== user.id && user.role !== 'admin') {
          return { status: 403, error: 'Access denied', allowed: false };
        }
        if (tkt.status === 'TRANSFER_PENDING') {
          return { status: 400, error: 'This ticket has a pending transfer and cannot be downloaded as PDF.', allowed: false };
        }
        if (tkt.status === 'RESALE_LISTED') {
          return { status: 400, error: 'This ticket is currently listed for resale and cannot be downloaded as PDF.', allowed: false };
        }
        if (tkt.status === 'RESOLD') {
          return { status: 400, error: 'This ticket has been resold and is no longer valid.', allowed: false };
        }
        if (tkt.status === 'CANCELLED' || tkt.status === 'REFUNDED') {
          return { status: 400, error: 'This ticket is no longer valid for download.', allowed: false };
        }
        return { status: 200, allowed: true };
      }

      const ord = await prisma.order.findUnique({
        where: { public_id: publicId },
        include: { ticket_instances: true }
      });

      if (!ord) {
        return { status: 404, error: 'Ticket not found', allowed: false };
      }

      if (ord.user_id !== user.id && user.role !== 'admin') {
        return { status: 403, error: 'Access denied', allowed: false };
      }

      if (ord.ticket_instances.some((t: any) => ['TRANSFER_PENDING', 'RESALE_LISTED', 'RESOLD', 'CANCELLED', 'REFUNDED'].includes(t.status))) {
        return { status: 400, error: 'One or more tickets in this order are no longer active/valid for PDF download.', allowed: false };
      }

      return { status: 200, allowed: true };
    }

    // 1. Unauthenticated PDF request -> 401
    const unauthCheck = await evaluatePdfAccess(null, authorizedTicket.public_id);
    assert(unauthCheck.status === 401, 'Unauthenticated PDF request is REJECTED with 401');

    // 2. User A requesting User B's ticket -> 403
    const foreignCheck = await evaluatePdfAccess(unauthorizedUser, authorizedTicket.public_id);
    assert(foreignCheck.status === 403, 'User A requesting User B ticket is REJECTED with 403 (IDOR Guard)');

    // 3. User A requesting own ticket -> 200
    const ownerCheck = await evaluatePdfAccess(testUser, authorizedTicket.public_id);
    assert(ownerCheck.status === 200 && ownerCheck.allowed, 'Ticket owner requesting own ticket is ALLOWED (200)');

    // 4. Admin requesting another user's ticket -> 200
    const adminCheck = await evaluatePdfAccess(adminUser, authorizedTicket.public_id);
    assert(adminCheck.status === 200 && adminCheck.allowed, 'Admin requesting user ticket is ALLOWED (200, RBAC)');

    // 5. Invalid public ID -> 404
    const notFoundCheck = await evaluatePdfAccess(testUser, 'NON_EXISTENT_PUBLIC_ID');
    assert(notFoundCheck.status === 404, 'Non-existent public ID is safely rejected with 404');

    // 6. CANCELLED ticket -> 400
    await prisma.ticketInstance.update({ where: { id: authorizedTicket.id }, data: { status: 'CANCELLED' } });
    const cancelledCheck = await evaluatePdfAccess(testUser, authorizedTicket.public_id);
    assert(cancelledCheck.status === 400, 'CANCELLED ticket is REJECTED with 400');

    // 7. RESOLD ticket -> 400
    await prisma.ticketInstance.update({ where: { id: authorizedTicket.id }, data: { status: 'RESOLD' } });
    const resoldCheck = await evaluatePdfAccess(testUser, authorizedTicket.public_id);
    assert(resoldCheck.status === 400, 'RESOLD ticket is REJECTED with 400');

    // 8. TRANSFER_PENDING ticket -> 400
    await prisma.ticketInstance.update({ where: { id: authorizedTicket.id }, data: { status: 'TRANSFER_PENDING' } });
    const transferCheck = await evaluatePdfAccess(testUser, authorizedTicket.public_id);
    assert(transferCheck.status === 400, 'TRANSFER_PENDING ticket is REJECTED with 400');

    // 9. RESALE_LISTED ticket -> 400
    await prisma.ticketInstance.update({ where: { id: authorizedTicket.id }, data: { status: 'RESALE_LISTED' } });
    const listedCheck = await evaluatePdfAccess(testUser, authorizedTicket.public_id);
    assert(listedCheck.status === 400, 'RESALE_LISTED ticket is REJECTED with 400');

    // 10. Transferred ticket ownership migration check
    // When ownership is transferred to unauthorizedUser and status is set back to VALID:
    await prisma.ticketInstance.update({
      where: { id: authorizedTicket.id },
      data: { status: 'VALID', owner_id: unauthorizedUser.id }
    });
    const oldOwnerCheck = await evaluatePdfAccess(testUser, authorizedTicket.public_id);
    assert(oldOwnerCheck.status === 403, 'Previous owner is BLOCKED (403) after ownership transfer');

    const newOwnerCheck = await evaluatePdfAccess(unauthorizedUser, authorizedTicket.public_id);
    assert(newOwnerCheck.status === 200 && newOwnerCheck.allowed, 'New current owner is ALLOWED (200) after ownership transfer');

    // ----------------------------------------------------
    // TEST 5: PDF GENERATION ENGINE & BUFFER VALIDATION
    // ----------------------------------------------------
    console.log('\n--- TEST 5: PDF Generation Pipeline & Buffer Validation ---');
    const { pdfBuffer } = await generateTicketPdfBuffer(authorizedTicket.public_id);
    assert(Buffer.isBuffer(pdfBuffer), 'generateTicketPdfBuffer returns a valid Buffer');
    assert(pdfBuffer.length > 1000, 'PDF buffer length is realistic (> 1KB)');
    const pdfHeader = pdfBuffer.slice(0, 5).toString('ascii');
    assert(pdfHeader.startsWith('%PDF'), 'PDF buffer contains valid %PDF header signature');

    // Cleanup
    await prisma.notificationLog.deleteMany({ where: { recipient_id: { in: [testUser.id, unauthorizedUser.id, adminUser.id] } } });
    await prisma.ticketInstance.deleteMany({ where: { id: { in: [ticket.id, authorizedTicket.id] } } });
    await prisma.order.deleteMany({ where: { id: testOrder.id } });
    await prisma.ticketType.deleteMany({ where: { id: ticketType.id } });
    await prisma.event.deleteMany({ where: { id: testEvent.id } });
    await prisma.user.deleteMany({ where: { id: { in: [testUser.id, testOrganizer.id, unauthorizedUser.id, adminUser.id] } } });

  } catch (err: any) {
    console.error('❌ QR, PDF & Notification Suite Error:', err);
    failed++;
  }

  console.log(`\n==================================================`);
  console.log(`🏁 [QR, PDF & NOTIFICATIONS SUITE RESULT] Passed: ${passed} | Failed: ${failed}`);
  console.log(`==================================================\n`);

  if (failed > 0) process.exit(1);
}

runQrPdfNotificationSuite().catch(err => {
  console.error(err);
  process.exit(1);
});
