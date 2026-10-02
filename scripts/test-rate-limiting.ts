// scripts/test-rate-limiting.ts - Verification Suite for Rate Limiting Architecture

import { validateEnvironment } from '../api/lib/env.js';
import { globalLimiter, authLimiter, forgotPasswordLimiter, checkoutLimiter, scannerLimiter } from '../api/lib/rate-limiter.js';
import express from 'express';
import http from 'http';

async function runRateLimitingVerification() {
  console.log('==================================================');
  console.log('🧪 TICKETS HUB RATE-LIMITING HARDENING TEST SUITE');
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

  // Set environment variable to enable rate limit enforcement during testing
  process.env.TEST_RATE_LIMITS = 'true';

  // --- TEST 1 & 2: Requests under and over limit ---
  const testApp = express();
  testApp.set('trust proxy', 1);

  // Setup test endpoint with small window/max
  const testLimiter = (globalLimiter as any);

  testApp.use('/test-api/', testLimiter);
  testApp.get('/test-api/ping', (req, res) => res.json({ status: 'ok' }));

  const server = http.createServer(testApp);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as any).port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    const res1 = await fetch(`${baseUrl}/test-api/ping`);
    assert(res1.status === 200, 'TEST 1: Normal request under limit returns 200 OK');

    const headersHaveLimit = res1.headers.has('ratelimit-limit') || res1.headers.has('x-ratelimit-limit');
    assert(headersHaveLimit, 'TEST 1b: Rate limit headers (RateLimit-* or X-RateLimit-*) included in response');
  } finally {
    server.close();
  }

  // --- TEST 3: Isolated Limiter Exceeded (429 Too Many Requests) ---
  const strictApp = express();
  strictApp.set('trust proxy', 1);

  // Custom 3-request limit for quick testing
  const { rateLimit } = await import('express-rate-limit');
  const miniLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 3,
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => false, // Force active
    message: { error: 'Too many requests' },
  });

  strictApp.use('/strict/', miniLimiter);
  strictApp.get('/strict/resource', (req, res) => res.json({ success: true }));

  const strictServer = http.createServer(strictApp);
  await new Promise<void>((resolve) => strictServer.listen(0, resolve));
  const strictPort = (strictServer.address() as any).port;
  const strictUrl = `http://127.0.0.1:${strictPort}`;

  try {
    const req1 = await fetch(`${strictUrl}/strict/resource`);
    const req2 = await fetch(`${strictUrl}/strict/resource`);
    const req3 = await fetch(`${strictUrl}/strict/resource`);
    const req4 = await fetch(`${strictUrl}/strict/resource`);

    assert(req1.status === 200 && req2.status === 200 && req3.status === 200, 'TEST 2: Requests within max limit succeed with 200 OK');
    assert(req4.status === 429, 'TEST 2: Request exceeding max limit receives 429 Too Many Requests');
  } finally {
    strictServer.close();
  }

  // --- TEST 4 & 5: Key Strategy & Spoofed Identity Headers ---
  const keyGenApp = express();
  keyGenApp.set('trust proxy', 1);

  // Key generator test
  const userLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 2,
    skip: () => false,
    validate: { keyGeneratorIpFallback: false },
    keyGenerator: (req) => {
      const reqWithUser = req as any;
      if (reqWithUser.user?.id) return `user:${reqWithUser.user.id}`;
      return req.ip || 'unknown-ip';
    }
  });

  keyGenApp.use('/user-api/', (req: any, res, next) => {
    // Simulate auth token parsing
    if (req.headers['x-simulated-user']) {
      req.user = { id: req.headers['x-simulated-user'] };
    }
    next();
  }, userLimiter);

  keyGenApp.get('/user-api/data', (req, res) => res.json({ ok: true }));

  const keyServer = http.createServer(keyGenApp);
  await new Promise<void>((resolve) => keyServer.listen(0, resolve));
  const keyPort = (keyServer.address() as any).port;
  const keyUrl = `http://127.0.0.1:${keyPort}`;

  try {
    // User 1 requests (limit 2)
    const u1_r1 = await fetch(`${keyUrl}/user-api/data`, { headers: { 'x-simulated-user': '101' } });
    const u1_r2 = await fetch(`${keyUrl}/user-api/data`, { headers: { 'x-simulated-user': '101' } });
    const u1_r3 = await fetch(`${keyUrl}/user-api/data`, { headers: { 'x-simulated-user': '101' } });

    assert(u1_r1.status === 200 && u1_r2.status === 200, 'TEST 4: Authenticated user 101 requests within limit succeed');
    assert(u1_r3.status === 429, 'TEST 4: Authenticated user 101 exceeding limit receives 429');

    // User 2 requests (independent counter for User 102)
    const u2_r1 = await fetch(`${keyUrl}/user-api/data`, { headers: { 'x-simulated-user': '102' } });
    assert(u2_r1.status === 200, 'TEST 4b: Independent authenticated user 102 is NOT blocked by user 101 limit');
  } finally {
    keyServer.close();
  }

  // --- TEST 7: Missing REDIS_URL in Production with REQUIRE_DISTRIBUTED_RATE_LIMIT ---
  const oldNodeEnv = process.env.NODE_ENV;
  const oldReqDist = process.env.REQUIRE_DISTRIBUTED_RATE_LIMIT;
  const oldRedis = process.env.REDIS_URL;

  try {
    process.env.NODE_ENV = 'production';
    process.env.REQUIRE_DISTRIBUTED_RATE_LIMIT = 'true';
    delete process.env.REDIS_URL;

    process.env.JWT_SECRET = 'a_very_long_valid_jwt_secret_for_production_testing_32chars';
    process.env.JWT_REFRESH_SECRET = 'a_very_long_valid_jwt_refresh_secret_for_prod_testing';
    process.env.FINANCIAL_ENCRYPTION_KEY = 'a_very_long_valid_financial_key_for_testing_32chars';
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
    process.env.APP_URL = 'https://app.example.com';
    process.env.RESEND_API_KEY = 're_test_key_123';
    process.env.MAIL_FROM = 'noreply@example.com';

    let threwAsExpected = false;
    try {
      validateEnvironment();
    } catch (err: any) {
      if (err.message && err.message.includes('REDIS_URL is required in production')) {
        threwAsExpected = true;
      }
    }
    assert(threwAsExpected, 'TEST 7: Production validation aborts when REQUIRE_DISTRIBUTED_RATE_LIMIT=true but REDIS_URL is missing');
  } finally {
    process.env.NODE_ENV = oldNodeEnv;
    if (oldReqDist) process.env.REQUIRE_DISTRIBUTED_RATE_LIMIT = oldReqDist; else delete process.env.REQUIRE_DISTRIBUTED_RATE_LIMIT;
    if (oldRedis) process.env.REDIS_URL = oldRedis; else delete process.env.REDIS_URL;
  }

  // Clean up TEST_RATE_LIMITS env var
  delete process.env.TEST_RATE_LIMITS;

  console.log('\n==================================================');
  console.log(`RESULTS: ${passed} Passed, ${failed} Failed`);
  console.log('==================================================\n');

  if (failed > 0) process.exit(1);
}

runRateLimitingVerification().catch((err) => {
  console.error('Fatal test execution error:', err);
  process.exit(1);
});
