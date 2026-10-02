// api/lib/rate-limiter.ts - Centralized & Distributed Rate Limiting System

import { rateLimit, Options, Store } from 'express-rate-limit';
import ioredisPkg from 'ioredis';
import { RedisStore } from 'rate-limit-redis';
import { env } from './env.js';
import express from 'express';

const RedisClass: any = (ioredisPkg as any).default || ioredisPkg;
let redisClient: any = null;
let redisStore: Store | undefined = undefined;

// Initialize Redis Store if REDIS_URL is configured
if (env.REDIS_URL) {
  try {
    redisClient = new RedisClass(env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      enableOfflineQueue: false, // Prevents queuing when Redis is unreachable
      connectTimeout: 5000,
      lazyConnect: true,
    });

    redisClient.on('error', (err: any) => {
      console.error('⚠️ [RateLimiter] Redis connection error:', err?.message || err);
    });

    redisClient.connect().catch((err: any) => {
      console.error('⚠️ [RateLimiter] Initial Redis connect failed:', err?.message || err);
    });

    redisStore = new RedisStore({
      sendCommand: (...args: string[]) => redisClient.call(args[0], ...args.slice(1)),
      prefix: 'tickethub_rl:',
    }) as unknown as Store;

    console.log('✅ [RateLimiter] Distributed Redis rate limit store enabled.');
  } catch (err: any) {
    console.error('⚠️ [RateLimiter] Failed to initialize Redis rate limit store:', err.message);
  }
} else if (env.NODE_ENV === 'production') {
  console.warn('⚠️ [RateLimiter] REDIS_URL not set in production. Falling back to local MemoryStore.');
}

// Key Generator helper: Uses authenticated user ID if present, otherwise falls back to req.ip
const defaultKeyGenerator = (req: express.Request): string => {
  const reqWithUser = req as express.Request & { user?: { id: number | string } };
  if (reqWithUser.user?.id) {
    return `user:${reqWithUser.user.id}`;
  }
  return req.ip || 'unknown-ip';
};

// Common skip logic: skip in non-production or preview mode unless explicitly tested
const defaultSkip = (req: express.Request): boolean => {
  if (process.env.TEST_RATE_LIMITS === 'true') return false;
  return process.env.NODE_ENV !== 'production' || !!process.env.AIS_PREVIEW;
};

// Helper factory to create standard rate limiters with fail-safe defaults
function createConfiguredLimiter(options: Partial<Options>) {
  return rateLimit({
    standardHeaders: true,
    legacyHeaders: false,
    passOnStoreError: true, // Fail-open gracefully if Redis drops connection
    keyGenerator: defaultKeyGenerator,
    skip: defaultSkip,
    store: redisStore,
    validate: { keyGeneratorIpFallback: false },
    ...options,
  });
}

// 1. Global API Limiter (1000 requests per 15 minutes)
export const globalLimiter = createConfiguredLimiter({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: { error: 'Too many requests, please try again later.' },
});

// 2. Authentication Limiter (20 requests per 15 minutes)
export const authLimiter = createConfiguredLimiter({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many login/registration attempts. Please try again after 15 minutes.' },
});

// 3. Password Reset Limiter (5 requests per 1 hour)
export const forgotPasswordLimiter = createConfiguredLimiter({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { error: 'Too many password reset requests from this IP. Please try again after an hour.' },
});

// 4. Checkout & Payment Creation Limiter (30 requests per 15 minutes)
export const checkoutLimiter = createConfiguredLimiter({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { error: 'Too many payment creation attempts. Please wait a few minutes before trying again.' },
});

// 5. Venue Scanner Limiter (500 requests per 15 minutes per admin/IP - high capacity for event entry)
export const scannerLimiter = createConfiguredLimiter({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: { error: 'Scan request limit exceeded. Please wait a moment.' },
});

export { redisClient, redisStore };
