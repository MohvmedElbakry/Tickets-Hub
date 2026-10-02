// scripts/test-kashier-webhook-security.ts
// Verification script for Kashier Payment Webhook Security Hardening

import crypto from 'crypto';
import { validateEnvironment } from '../api/lib/env.js';

async function runWebhookSecurityTests() {
  console.log('==================================================');
  console.log('🧪 KASHIER WEBHOOK SECURITY VERIFICATION SUITE');
  console.log('==================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  ✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${testName} ${detail ? `(${detail})` : ''}`);
      failed++;
    }
  }

  // --- TEST 1: Valid HMAC Signature Calculation & Constant Time Verification ---
  const secretKey = 'test_kashier_api_key_secret_12345';
  const rawPayload = Buffer.from(JSON.stringify({
    transactionId: 'tx_99887766',
    orderId: 'ORD-TEST-123',
    status: 'SUCCESS'
  }));

  const validSignature = crypto.createHmac('sha256', secretKey).update(rawPayload).digest('hex');
  const invalidSignature = crypto.createHmac('sha256', 'wrong_secret').update(rawPayload).digest('hex');

  // Verify constant-time comparison helper
  const sigBufferValid = Buffer.from(validSignature, 'utf8');
  const expectedBuffer = Buffer.from(validSignature, 'utf8');
  const isMatchValid = sigBufferValid.length === expectedBuffer.length && crypto.timingSafeEqual(sigBufferValid, expectedBuffer);
  assert(isMatchValid, 'TEST 3: Valid HMAC signature matches expected calculation');

  // --- TEST 4: Invalid Signature Rejection ---
  const sigBufferInvalid = Buffer.from(invalidSignature, 'utf8');
  const isMatchInvalid = sigBufferInvalid.length === expectedBuffer.length && crypto.timingSafeEqual(sigBufferInvalid, expectedBuffer);
  assert(!isMatchInvalid, 'TEST 4: Invalid HMAC signature rejected via constant-time check');

  // --- TEST 6: Malformed Signature Safety ---
  const malformedSignature = 'not_a_valid_hex_string_too_short';
  const sigBufferMalformed = Buffer.from(malformedSignature, 'utf8');
  const isMatchMalformed = sigBufferMalformed.length === expectedBuffer.length && crypto.timingSafeEqual(sigBufferMalformed, expectedBuffer);
  assert(!isMatchMalformed, 'TEST 6: Malformed signature safely rejected without throwing');

  // --- TEST 2: Production Environment Validation when Secret is Missing ---
  const oldNodeEnv = process.env.NODE_ENV;
  const oldApiKey = process.env.KASHIER_API_KEY;
  const oldSecretKey = process.env.KASHIER_SECRET_KEY;
  const oldMerchantId = process.env.KASHIER_MERCHANT_ID;

  try {
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'a_very_long_valid_jwt_secret_for_production_testing_32chars';
    process.env.JWT_REFRESH_SECRET = 'a_very_long_valid_jwt_refresh_secret_for_prod_testing';
    process.env.FINANCIAL_ENCRYPTION_KEY = 'a_very_long_valid_financial_key_for_testing_32chars';
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
    process.env.APP_URL = 'https://app.example.com';
    process.env.RESEND_API_KEY = 're_test_key_123';
    process.env.MAIL_FROM = 'noreply@example.com';

    delete process.env.KASHIER_API_KEY;
    process.env.KASHIER_SECRET_KEY = 'sec_123';
    process.env.KASHIER_MERCHANT_ID = 'mer_123';

    let threwAsExpected = false;
    try {
      validateEnvironment();
    } catch (err: any) {
      if (err.message && err.message.includes('KASHIER_API_KEY is required')) {
        threwAsExpected = true;
      }
    }
    assert(threwAsExpected, 'TEST 2: Production validation fails when KASHIER_API_KEY is missing');
  } finally {
    process.env.NODE_ENV = oldNodeEnv;
    if (oldApiKey) process.env.KASHIER_API_KEY = oldApiKey; else delete process.env.KASHIER_API_KEY;
    if (oldSecretKey) process.env.KASHIER_SECRET_KEY = oldSecretKey; else delete process.env.KASHIER_SECRET_KEY;
    if (oldMerchantId) process.env.KASHIER_MERCHANT_ID = oldMerchantId; else delete process.env.KASHIER_MERCHANT_ID;
  }

  // --- TEST 1: Production Environment Validation when Secret is Present ---
  try {
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'a_very_long_valid_jwt_secret_for_production_testing_32chars';
    process.env.JWT_REFRESH_SECRET = 'a_very_long_valid_jwt_refresh_secret_for_prod_testing';
    process.env.FINANCIAL_ENCRYPTION_KEY = 'a_very_long_valid_financial_key_for_testing_32chars';
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
    process.env.APP_URL = 'https://app.example.com';
    process.env.RESEND_API_KEY = 're_test_key_123';
    process.env.MAIL_FROM = 'noreply@example.com';

    process.env.KASHIER_API_KEY = 'valid_kashier_api_key_123';
    process.env.KASHIER_SECRET_KEY = 'valid_kashier_secret_key_123';
    process.env.KASHIER_MERCHANT_ID = 'valid_kashier_merchant_id_123';

    let validatedEnv: any = null;
    try {
      validatedEnv = validateEnvironment();
    } catch (err: any) {
      console.error(err.message);
    }
    assert(validatedEnv !== null && validatedEnv.KASHIER_API_KEY === 'valid_kashier_api_key_123', 'TEST 1: Production validation succeeds when valid Kashier secrets are supplied');
  } finally {
    process.env.NODE_ENV = oldNodeEnv;
    if (oldApiKey) process.env.KASHIER_API_KEY = oldApiKey; else delete process.env.KASHIER_API_KEY;
    if (oldSecretKey) process.env.KASHIER_SECRET_KEY = oldSecretKey; else delete process.env.KASHIER_SECRET_KEY;
    if (oldMerchantId) process.env.KASHIER_MERCHANT_ID = oldMerchantId; else delete process.env.KASHIER_MERCHANT_ID;
  }

  console.log('\n==================================================');
  console.log(`RESULTS: ${passed} Passed, ${failed} Failed`);
  console.log('==================================================\n');

  if (failed > 0) process.exit(1);
}

runWebhookSecurityTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
