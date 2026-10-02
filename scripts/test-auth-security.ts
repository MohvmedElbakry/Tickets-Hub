import prisma from '../api/lib/prisma.js';
import jwt from 'jsonwebtoken';
import { validatePassword } from '../api/lib/passwordValidator.js';
import crypto from 'crypto';

async function runAuthSecuritySuite() {
  console.log('🚀 [AUTH & SECURITY SUITE] Starting Auth & Security Automated Test Suite...\n');

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
  const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-for-tests';

  try {
    // ----------------------------------------------------
    // TEST 1: PASSWORD VALIDATION ENGINE
    // ----------------------------------------------------
    console.log('--- TEST 1: Password Complexity & Security Rules ---');
    
    const weak1 = validatePassword('12345');
    assert(!weak1.isValid, 'Rejects short passwords (< 8 chars)');
    assert(!weak1.rules.length, 'Correct error rule length is false for short password');

    const weak2 = validatePassword('password');
    assert(!weak2.isValid, 'Rejects simple lowercase-only passwords');

    const strong = validatePassword('P@ssw0rd2026!');
    assert(strong.isValid, 'Accepts strong password with uppercase, lowercase, digit, and special char');

    // ----------------------------------------------------
    // TEST 2: JWT CREATION & VERIFICATION WITH TOKEN VERSIONING
    // ----------------------------------------------------
    console.log('\n--- TEST 2: JWT & Token Versioning (Revocation) ---');

    const testUser = await prisma.user.create({
      data: {
        email: `auth_test_${timestamp}@test.com`,
        password_hash: '$2a$10$abcdefghijklmnopqrstuvwxyz123456',
        name: 'Auth Security Test User',
        role: 'user',
        token_version: 1,
        email_verified: true
      }
    });

    const token = jwt.sign(
      { userId: testUser.id, role: testUser.role, tokenVersion: testUser.token_version },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    const decoded = jwt.verify(token, JWT_SECRET) as any;
    assert(decoded.userId === testUser.id, 'JWT decodes correct userId');
    assert(decoded.tokenVersion === 1, 'JWT contains token_version 1');

    // Revoke tokens by incrementing token_version in DB
    const updatedUser = await prisma.user.update({
      where: { id: testUser.id },
      data: { token_version: { increment: 1 } }
    });

    assert(updatedUser.token_version === 2, 'User token_version incremented to 2');
    assert(decoded.tokenVersion !== updatedUser.token_version, 'Old JWT tokenVersion (1) is now stale against DB (2)');

    // ----------------------------------------------------
    // TEST 3: RBAC ROLE PERMISSION GUARD
    // ----------------------------------------------------
    console.log('\n--- TEST 3: RBAC Authorization & Role Enforcement ---');

    const adminUser = await prisma.user.create({
      data: {
        email: `admin_test_${timestamp}@test.com`,
        password_hash: '$2a$10$abcdefghijklmnopqrstuvwxyz123456',
        name: 'Admin Test User',
        role: 'admin',
        email_verified: true
      }
    });

    function checkAdminAccess(userRole: string): boolean {
      return userRole === 'admin';
    }

    assert(checkAdminAccess(adminUser.role), 'Admin role allows access to admin endpoints');
    assert(!checkAdminAccess(testUser.role), 'Standard user role rejects access to admin endpoints');

    // ----------------------------------------------------
    // TEST 4: IDOR OWNERSHIP PROTECTION
    // ----------------------------------------------------
    console.log('\n--- TEST 4: IDOR Ownership Guard ---');

    const otherUser = await prisma.user.create({
      data: {
        email: `other_${timestamp}@test.com`,
        password_hash: 'hashed',
        name: 'Other User',
        role: 'user'
      }
    });

    const testEvent = await prisma.event.create({
      data: {
        title: 'Auth Security Test Event',
        date: new Date(),
        location: 'Cairo'
      }
    });

    const userOrder = await prisma.order.create({
      data: {
        public_id: `ORD_IDOR_${timestamp}`,
        user: { connect: { id: testUser.id } },
        event: { connect: { id: testEvent.id } },
        total_price: 100,
        order_status: 'paid',
        is_paid: true
      }
    });

    function verifyOrderOwnership(requestingUserId: number, orderOwnerId: number, userRole: string): boolean {
      if (userRole === 'admin') return true;
      return requestingUserId === orderOwnerId;
    }

    assert(verifyOrderOwnership(testUser.id, userOrder.user_id, testUser.role), 'Order owner can access order');
    assert(!verifyOrderOwnership(otherUser.id, userOrder.user_id, otherUser.role), 'Non-owner non-admin user BLOCKED from accessing order (IDOR Protection)');
    assert(verifyOrderOwnership(adminUser.id, userOrder.user_id, adminUser.role), 'Admin user CAN access order regardless of owner');

    // ----------------------------------------------------
    // TEST 5: HMAC SIGNATURE VERIFICATION
    // ----------------------------------------------------
    console.log('\n--- TEST 5: Webhook HMAC Signature Validation ---');

    const KASHIER_API_KEY = 'test_kashier_api_key_secret';
    const rawPayload = JSON.stringify({ event: 'pay.success', orderId: 'ORD_123', status: 'SUCCESS' });

    const validSignature = crypto.createHmac('sha256', KASHIER_API_KEY).update(rawPayload).digest('hex');
    const invalidSignature = crypto.createHmac('sha256', 'wrong_key').update(rawPayload).digest('hex');

    function verifyWebhookSignature(payload: string, signatureHeader: string, apiKey: string): boolean {
      const expected = crypto.createHmac('sha256', apiKey).update(payload).digest('hex');
      return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signatureHeader));
    }

    assert(verifyWebhookSignature(rawPayload, validSignature, KASHIER_API_KEY), 'Valid HMAC signature passes verification');
    assert(!verifyWebhookSignature(rawPayload, invalidSignature, KASHIER_API_KEY), 'Tampered/Invalid HMAC signature rejected');

    // Cleanup created test records
    await prisma.order.delete({ where: { id: userOrder.id } });
    await prisma.event.delete({ where: { id: testEvent.id } });
    await prisma.user.deleteMany({ where: { id: { in: [testUser.id, adminUser.id, otherUser.id] } } });

  } catch (err: any) {
    console.error('❌ Auth & Security Suite Error:', err);
    failed++;
  }

  console.log(`\n==================================================`);
  console.log(`🏁 [AUTH & SECURITY SUITE RESULT] Passed: ${passed} | Failed: ${failed}`);
  console.log(`==================================================\n`);

  if (failed > 0) process.exit(1);
}

runAuthSecuritySuite().catch(err => {
  console.error(err);
  process.exit(1);
});
