// api/lib/env.ts - Centralized Environment Validation & Safe Configuration Access

import dotenv from 'dotenv';
dotenv.config();

export interface EnvConfig {
  NODE_ENV: 'development' | 'test' | 'production';
  JWT_SECRET: string;
  JWT_REFRESH_SECRET: string;
  FINANCIAL_ENCRYPTION_KEY: string;
  DATABASE_URL: string;
  FRONTEND_URL: string;
  APP_URL: string;
  REDIS_URL?: string;
  REQUIRE_DISTRIBUTED_RATE_LIMIT?: boolean;
  KASHIER_MERCHANT_ID?: string;
  KASHIER_API_KEY?: string;
  KASHIER_SECRET_KEY?: string;
  RESEND_API_KEY?: string;
  SMTP_HOST?: string;
  SMTP_PORT?: number;
  SMTP_USER?: string;
  SMTP_PASS?: string;
  SMTP_FROM?: string;
  MAIL_FROM?: string;
}

/**
 * Validates mandatory environment variables.
 * Throws a formatted Error if validation fails (never calls process.exit directly in library code).
 */
export function validateEnvironment(): EnvConfig {
  const rawNodeEnv = (process.env.NODE_ENV || 'development').trim();
  const validEnvs = ['development', 'test', 'production'];

  const errors: string[] = [];

  // 1. Strict NODE_ENV Validation
  if (!validEnvs.includes(rawNodeEnv)) {
    errors.push(`Invalid NODE_ENV "${rawNodeEnv}". Allowed values: 'development', 'test', 'production'.`);
  }
  const nodeEnv = (validEnvs.includes(rawNodeEnv) ? rawNodeEnv : 'development') as 'development' | 'test' | 'production';
  const isProduction = nodeEnv === 'production';

  // 2. JWT_SECRET
  let jwtSecret = process.env.JWT_SECRET ? process.env.JWT_SECRET.trim() : '';
  if (!jwtSecret) {
    if (isProduction) {
      errors.push('JWT_SECRET environment variable is missing in production.');
    } else {
      console.warn('⚠️ [DEV ONLY] JWT_SECRET missing. Using DEVELOPMENT ONLY fallback key.');
      jwtSecret = 'dev_secret_fallback_1234567890_min32chars';
    }
  } else if (isProduction && jwtSecret.length < 32) {
    errors.push(`JWT_SECRET is too short (${jwtSecret.length} chars). Production requires a secret of at least 32 characters.`);
  }

  // 3. JWT_REFRESH_SECRET
  let jwtRefreshSecret = process.env.JWT_REFRESH_SECRET ? process.env.JWT_REFRESH_SECRET.trim() : '';
  if (!jwtRefreshSecret) {
    if (isProduction) {
      errors.push('JWT_REFRESH_SECRET environment variable is missing in production. Refresh secret must be explicitly defined and independent.');
    } else {
      console.warn('⚠️ [DEV ONLY] JWT_REFRESH_SECRET missing. Using DEVELOPMENT ONLY derived fallback key.');
      jwtRefreshSecret = jwtSecret + '_refresh_key_32chars_long_dev';
    }
  } else if (isProduction && jwtRefreshSecret.length < 32) {
    errors.push(`JWT_REFRESH_SECRET is too short (${jwtRefreshSecret.length} chars). Production requires a secret of at least 32 characters.`);
  }

  // 4. Prevent Identical JWT Secrets
  if (jwtSecret && jwtRefreshSecret && jwtSecret === jwtRefreshSecret) {
    errors.push('JWT_SECRET and JWT_REFRESH_SECRET must be independent and cannot be identical.');
  }

  // 5. FINANCIAL_ENCRYPTION_KEY
  let financialKey = process.env.FINANCIAL_ENCRYPTION_KEY ? process.env.FINANCIAL_ENCRYPTION_KEY.trim() : '';
  if (!financialKey) {
    if (isProduction) {
      errors.push('FINANCIAL_ENCRYPTION_KEY environment variable is missing in production.');
    } else {
      console.warn('⚠️ [DEV ONLY] FINANCIAL_ENCRYPTION_KEY missing. Using DEVELOPMENT ONLY fallback key.');
      financialKey = 'tickets-hub-financial-encryption-secret-key-32';
    }
  } else if (isProduction && financialKey.length < 32) {
    errors.push(`FINANCIAL_ENCRYPTION_KEY is too short (${financialKey.length} chars). Production requires at least 32 characters.`);
  }

  if (financialKey && (financialKey === jwtSecret || financialKey === jwtRefreshSecret)) {
    errors.push('FINANCIAL_ENCRYPTION_KEY must be distinct from JWT_SECRET and JWT_REFRESH_SECRET.');
  }

  // 6. DATABASE_URL
  const databaseUrl = process.env.DATABASE_URL ? process.env.DATABASE_URL.trim() : '';
  if (!databaseUrl) {
    if (isProduction) {
      errors.push('DATABASE_URL environment variable is missing in production.');
    }
  }

  // 7. APP_URL & FRONTEND_URL
  const appUrl = process.env.APP_URL ? process.env.APP_URL.trim() : (process.env.FRONTEND_URL || 'http://localhost:3000');
  const frontendUrl = process.env.FRONTEND_URL ? process.env.FRONTEND_URL.trim() : appUrl;
  const redisUrl = process.env.REDIS_URL ? process.env.REDIS_URL.trim() : undefined;

  if (isProduction) {
    if (!process.env.APP_URL && !process.env.FRONTEND_URL) {
      errors.push('APP_URL or FRONTEND_URL environment variable is missing in production.');
    }

    // 8. Email Configuration Validation (Production)
    const hasResend = !!process.env.RESEND_API_KEY;
    const hasSmtp = !!(process.env.SMTP_HOST || process.env.SMTP_PASS);

    if (!hasResend && !hasSmtp) {
      errors.push('Email service unconfigured in production. You must provide either Resend configuration (RESEND_API_KEY, MAIL_FROM) or SMTP configuration (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM).');
    } else if (hasResend) {
      if (!process.env.RESEND_API_KEY?.startsWith('re_')) {
        errors.push('RESEND_API_KEY must start with "re_".');
      }
      if (!process.env.MAIL_FROM && !process.env.SMTP_FROM) {
        errors.push('MAIL_FROM or SMTP_FROM is required when using Resend email provider.');
      }
    } else if (hasSmtp) {
      if (!process.env.SMTP_HOST) errors.push('SMTP_HOST is required when using SMTP email provider.');
      if (!process.env.SMTP_USER) errors.push('SMTP_USER is required when using SMTP email provider.');
      if (!process.env.SMTP_PASS) errors.push('SMTP_PASS is required when using SMTP email provider.');
      if (!process.env.SMTP_FROM && !process.env.MAIL_FROM) errors.push('SMTP_FROM or MAIL_FROM is required when using SMTP email provider.');
    }

    // 9. Payment Gateway Configuration (Kashier) if specified
    if (process.env.KASHIER_API_KEY || process.env.KASHIER_SECRET_KEY || process.env.KASHIER_MERCHANT_ID) {
      if (!process.env.KASHIER_API_KEY) errors.push('KASHIER_API_KEY is required for Kashier payment integration and webhook signature verification.');
      if (!process.env.KASHIER_SECRET_KEY) errors.push('KASHIER_SECRET_KEY is required for Kashier payment integration.');
      if (!process.env.KASHIER_MERCHANT_ID) errors.push('KASHIER_MERCHANT_ID is required for Kashier payment integration.');
    }

    // 10. Distributed Rate Limiting Configuration Check
    if (process.env.REQUIRE_DISTRIBUTED_RATE_LIMIT === 'true' && !redisUrl) {
      errors.push('REDIS_URL is required in production when REQUIRE_DISTRIBUTED_RATE_LIMIT is enabled.');
    }
  }

  if (redisUrl && !redisUrl.startsWith('redis://') && !redisUrl.startsWith('rediss://')) {
    errors.push('REDIS_URL must start with "redis://" or "rediss://".');
  }

  // If there are validation errors, throw a clean, formatted Error
  if (errors.length > 0) {
    const formattedError = [
      '',
      '==================================================',
      '🚨 FATAL CONFIGURATION ERROR',
      '==================================================',
      ...errors.map(err => `  ❌ ${err}`),
      '==================================================',
      'Application startup aborted.',
      ''
    ].join('\n');

    throw new Error(formattedError);
  }

  return {
    NODE_ENV: nodeEnv,
    JWT_SECRET: jwtSecret,
    JWT_REFRESH_SECRET: jwtRefreshSecret,
    FINANCIAL_ENCRYPTION_KEY: financialKey,
    DATABASE_URL: databaseUrl,
    FRONTEND_URL: frontendUrl,
    APP_URL: appUrl,
    REDIS_URL: redisUrl,
    REQUIRE_DISTRIBUTED_RATE_LIMIT: process.env.REQUIRE_DISTRIBUTED_RATE_LIMIT === 'true',
    KASHIER_MERCHANT_ID: process.env.KASHIER_MERCHANT_ID,
    KASHIER_API_KEY: process.env.KASHIER_API_KEY,
    KASHIER_SECRET_KEY: process.env.KASHIER_SECRET_KEY,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    SMTP_HOST: process.env.SMTP_HOST,
    SMTP_PORT: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : undefined,
    SMTP_USER: process.env.SMTP_USER,
    SMTP_PASS: process.env.SMTP_PASS,
    SMTP_FROM: process.env.SMTP_FROM,
    MAIL_FROM: process.env.MAIL_FROM
  };
}

// Singleton env configuration loaded on module import
export const env = validateEnvironment();
