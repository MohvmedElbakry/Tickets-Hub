// api/app.ts - Pure Express Application (Synchronous Route Registration)
console.log('[App] Initializing Express Application...');

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import crypto from 'crypto';
import prisma from './lib/prisma.js';
import { db } from './lib/db-service.js';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import { Browser } from 'puppeteer-core';
import React from 'react';
import ReactDOMServer from 'react-dom/server';
import { TicketTemplate } from './pdf/TicketTemplate.js';
import QRCode from 'qrcode';
import { sendEmail, verifyEmailConfig, getPersonalizedName, sendWelcomeEmail, sendVerificationEmail, generateEmailHtml } from './lib/mailer.js';
import { validatePassword as sharedValidatePassword } from './lib/passwordValidator.js';

dotenv.config();

// Early startup verification
verifyEmailConfig().then(report => {
  console.log(`\n📬 [MAIL INIT] Startup diagnostic check complete.`);
  console.log(`   Mode detected: ${report.mode}`);
  if (report.valid) {
    console.log(`   Status: VALID & READY 🚀`);
  } else {
    console.warn(`   Status: PARTIALLY CONFIGURED OR UNCONFIGURED ⚠️`);
    report.errors.forEach(err => console.warn(`     - Error: ${err}`));
  }
  report.warnings.forEach(warn => console.warn(`     - Warning: ${warn}`));
  if (report.dnsRecords) {
    console.log(`   DNS Deliverability Profile:`);
    console.log(`     - Domain Name: ${report.dnsRecords.domain}`);
    console.log(`     - MX Records Found: ${report.dnsRecords.hasMx ? 'Yes (Pass)' : 'No (Fail)'}`);
    console.log(`     - SPF Record Configured: ${report.dnsRecords.hasSpf ? 'Yes (Pass)' : 'No (Fail)'}`);
    console.log(`     - DMARC Record Configured: ${report.dnsRecords.hasDmarc ? 'Yes (Pass)' : 'No (Fail)'}`);
  }
  console.log('');
}).catch(err => {
  console.error(`🚨 [MAIL INIT FAILED] Startup diagnostic failed:`, err);
});

// SHARED BROWSER SINGLETON (Safe for Vercel Warm Starts)
let _cachedBrowser: Browser | null = null;
let _browserLaunchPromise: Promise<Browser> | null = null;

async function getSharedBrowser(): Promise<{ browser: Browser, reused: boolean }> {
  const launchStart = Date.now();
  const wasAlreadyLaunching = !!_browserLaunchPromise;
  
  // If browser exists and is connected, reuse it
  if (_cachedBrowser && (_cachedBrowser as any).connected) {
    return { browser: _cachedBrowser, reused: true };
  }

  // If already launching, wait for the existing promise
  if (_browserLaunchPromise) {
    const b = await _browserLaunchPromise;
    return { browser: b, reused: wasAlreadyLaunching || true };
  }

  // Otherwise, start a new launch
  _browserLaunchPromise = (async () => {
    console.log('[Puppeteer] Launching new shared Chromium instance...');
    const executablePath = await chromium.executablePath();
    const b = await puppeteer.launch({
      args: [...chromium.args, '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
      defaultViewport: { width: 600, height: 800 },
      executablePath: executablePath,
      headless: (chromium as any).headless !== undefined ? (chromium as any).headless : true,
    });
    console.log(`[Puppeteer] Shared Chromium launched in ${Date.now() - launchStart}ms`);
    _cachedBrowser = b;
    return b;
  })();

  try {
    const b = await _browserLaunchPromise;
    return { browser: b, reused: false };
  } catch (err) {
    _browserLaunchPromise = null;
    throw err;
  }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_fallback_123';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || (JWT_SECRET + '_refresh');

const generateTokens = (user: any) => {
  const payload = { 
    id: user.id, 
    name: user.name, 
    email: user.email, 
    role: user.role, 
    gender: user.gender, 
    tokenVersion: user.token_version ?? 0,
    emailVerified: !!user.email_verified 
  };
  const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' });
  const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: '7d' });
  return { accessToken, refreshToken, user: payload };
};

const app = express();
app.set('trust proxy', 1);

// --- Initialization Logging ---
console.log('[App] Registering core middleware...');

// Helper to log all registered routes
function logRoutes(app: express.Application) {
  console.log('--- REGISTERED ROUTES ---');
  app._router.stack.forEach((middleware: any) => {
    if (middleware.route) { // routes registered directly on the app
      const path = middleware.route.path;
      const methods = Object.keys(middleware.route.methods).join(',').toUpperCase();
      console.log(`[Route] ${methods.padEnd(7)} ${path}`);
    } else if (middleware.name === 'router') { // router middleware
      middleware.handle.stack.forEach((handler: any) => {
        const route = handler.route;
        if (route) {
          const path = route.path;
          const methods = Object.keys(route.methods).join(',').toUpperCase();
          console.log(`[Route] ${methods.padEnd(7)} ${path}`);
        }
      });
    }
  });
  console.log('-------------------------');
}

// Diagnostic: Log connection target at startup
(async () => {
  const dbUrl = process.env.DATABASE_URL || '';
  const maskedUrl = dbUrl.replace(/:([^:@]+)@/, ':****@');
  console.log(`[Startup] Target DATABASE_URL: ${maskedUrl}`);
  try {
    const start = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    console.log(`[Startup] Prisma connection verified in ${Date.now() - start}ms`);
    
    // Diagnostic: Check for Event table columns
    const columns = await prisma.$queryRaw<any[]>`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'Event'
    `;
    const colNames = columns.map(c => c.column_name);
    console.log('[Startup] Event table columns:', colNames.join(', '));
    const criticalCols = ['is_featured', 'featured_order', 'kashier_url'];
    criticalCols.forEach(col => {
      if (colNames.includes(col)) {
        console.log(`[Startup] Column check: ${col} EXISTS`);
      } else {
        console.warn(`[Startup] Column check: ${col} MISSING!`);
      }
    });

  } catch (err: any) {
    console.error(`[Startup] Database connection failed: ${err.message}`);
  }
})();

app.get('/api/health', async (req, res) => {
  try {
    const dbUrl = process.env.DATABASE_URL || '';
    const maskedUrl = dbUrl.replace(/:([^:@]+)@/, ':****@');
    let host = 'n/a', port = 'n/a';
    try {
      if (dbUrl) {
        const match = dbUrl.match(/@([^:\/]+):?(\d+)?/);
        if (match) { host = match[1]; port = match[2] || '5432 (default)'; }
      }
    } catch (e) {}
    const connectTest = prisma.$queryRaw`SELECT 1`.catch(e => { throw e; });
    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Query Timeout')), 5000));
    await Promise.race([connectTest, timeout]);
    res.json({ status: 'ok', database: 'connected', env: process.env.NODE_ENV, vercel: !!process.env.VERCEL, db_host: host, db_port: port, url_masked: maskedUrl, time: new Date().toISOString() });
  } catch (err: any) {
    console.error('[Health Check] DB Failure:', err.message);
    const dbUrl = process.env.DATABASE_URL || '';
    const maskedUrl = dbUrl.replace(/:([^:@]+)@/, ':****@');
    res.status(503).json({ status: 'error', database: 'disconnected', url_masked: maskedUrl, error: err.message });
  }
});

app.use(helmet({ contentSecurityPolicy: { directives: { ...helmet.contentSecurityPolicy.getDefaultDirectives(), "img-src": ["'self'", "data:", "https:", "blob:", "*"], "script-src": ["'self'", "'unsafe-inline'", "'unsafe-eval'", "*"], "connect-src": ["'self'", "*"], "frame-ancestors": ["'self'", "*"], }, }, crossOriginEmbedderPolicy: false, crossOriginResourcePolicy: false, }));

// --- DIAGNOSTIC & PRODUCTION-GRADE FAILURE MONITORING MIDDLEWARE ---
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.originalUrl || req.url;
  const isTargetRoute = path.startsWith('/api/auth') || 
                        path.startsWith('/api/notifications') || 
                        path.startsWith('/api/settings') || 
                        path.startsWith('/api/events');

  // Intercept json response body to capture and log backend mistakes and Prisma codes if any
  const originalJson = res.json;
  let responseSent = false;

  res.json = function (body: any) {
    if (responseSent) return originalJson.call(this, body);
    responseSent = true;
    
    const duration = Date.now() - start;
    const statusCode = res.statusCode;

    if (isTargetRoute || statusCode >= 400) {
      const timestamp = new Date().toISOString();
      const hasPrismaError = body && (body.code?.startsWith('P') || body.prismaCode || (body.error && body.error.includes('Prisma')));
      
      console.log(`[API MONITOR] Prefix: ${isTargetRoute ? 'HARDENED' : 'STANDARD'} | ${req.method} ${path} | Status: ${statusCode} | Duration: ${duration}ms`);
      
      if (statusCode >= 500 || hasPrismaError) {
        console.error(`🚨 [BACKEND SYSTEM FAULT] Error detected on: ${req.method} ${path}`);
        console.error(`   Timestamp: ${timestamp}`);
        console.error(`   HTTP Status: ${statusCode}`);
        console.error(`   Duration: ${duration}ms`);
        if (body?.code) {
          console.error(`   Prisma Error Code: ${body.code}`);
        }
        if (body?.error || body?.message || body?.details) {
          console.error(`   Details:`, JSON.stringify({ error: body.error, message: body.message, details: body.details }));
        }
      }
    } else {
      console.log(`[API TRACE] ${req.method} ${path} - ${statusCode} (${duration}ms)`);
    }

    return originalJson.call(this, body);
  };

  next();
});

app.options('*', cors());
app.use(cors());

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 1000, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many requests, please try again later.' }, skip: (req) => process.env.NODE_ENV !== 'production' || !!process.env.AIS_PREVIEW, });
app.use('/api/', limiter);
app.use(express.json({ limit: '50mb' }));

// Start tracing
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      console.log(`[API TRACE] ${req.method} ${req.url} - ${res.statusCode} (${duration}ms)`);
    });
    next();
  });
}

const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access denied. No token provided.' });
  jwt.verify(token, JWT_SECRET, async (err: any, decoded: any) => {
    if (err) return res.status(401).json({ error: 'Invalid or expired token.' });
    if (!decoded || !decoded.id) return res.status(401).json({ error: 'Invalid token payload.' });
    
    try {
      const user = await db.getUserById(decoded.id);
      if (!user || user.is_deleted || (user.token_version ?? 0) !== (decoded.tokenVersion ?? 0)) {
        return res.status(401).json({ error: 'Session expired or invalidated. Please login again.' });
      }
      req.user = { ...decoded, emailVerified: !!user.email_verified };
      next();
    } catch (dbErr) {
      return res.status(501).json({ error: 'Internal auth service error.' });
    }
  });
};

const optionalAuthenticate = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    req.user = null;
    return next();
  }
  jwt.verify(token, JWT_SECRET, async (err: any, decoded: any) => {
    if (err || !decoded || !decoded.id) {
      req.user = null;
      return next();
    }
    try {
      const user = await db.getUserById(decoded.id);
      if (!user || user.is_deleted || (user.token_version ?? 0) !== (decoded.tokenVersion ?? 0)) {
        req.user = null;
        return next();
      }
      req.user = { ...decoded, emailVerified: !!user.email_verified };
      next();
    } catch {
      req.user = null;
      return next();
    }
  });
};

const authorizeRole = (roles: string[]) => {
  return (req: any, res: any, next: any) => {
    if (!req.user) return res.status(401).json({ error: 'Authentication required.' });
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'Access denied.' });
    next();
  };
};

// --- AUTH ROUTES ---
console.log('[App] Registering Auth Routes...');
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { name, email, password, phone, role, birthdate, gender } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'Required fields missing.' });

    const validationResult = sharedValidatePassword(password);
    if (!validationResult.isValid) {
      return res.status(400).json({
        success: false,
        error: 'Password does not meet security requirements.',
        message: 'Password does not meet security requirements.'
      });
    }

    const existingUser = await db.getUserByEmail(email);
    if (existingUser) return res.status(400).json({ error: 'Email already in use.' });
    const passwordHash = await bcrypt.hash(password, 10);
    const users = await db.getUsers();
    const userRole = users.length === 0 ? 'admin' : (role || 'user');

    const calculateAge = (dateString: string) => {
      if (!dateString) return 0;
      const today = new Date();
      const birthDate = new Date(dateString);
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      return age;
    };

    const isAdmin = userRole === 'admin';
    const rawVerificationToken = crypto.randomBytes(32).toString('hex');
    const hashedVerificationToken = hashToken(rawVerificationToken);
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const newUser = await db.addUser({ 
      name, 
      email, 
      password_hash: passwordHash, 
      phone, 
      role: userRole, 
      birthdate: birthdate || '2000-01-01', 
      age: calculateAge(birthdate || '2000-01-01'),
      gender,
      email_verified: isAdmin,
      email_verification_token: isAdmin ? null : hashedVerificationToken,
      email_verification_expires: isAdmin ? null : verificationExpires
    });
    const { accessToken, refreshToken, user } = generateTokens(newUser);

    // Asynchronously dispatch the welcome email matching TicketsHub branding
    const welcomeData = {
      title: 'Welcome to TicketsHub 🎉',
      intro: 'Thank you for creating an account with TicketsHub! We are thrilled to have you join our community.',
      featuresTitle: 'Here is what you can do with TicketsHub:',
      features: [
        '✨ Discover exciting live events, festivals, concerts, and conferences.',
        '🎟️ Buy tickets seamlessly with safe and secure payment options.',
        '📅 Manage your bookings and access all digital tickets in your personal dashboard.',
        '📱 Present your scan-ready ticket PDFs at any event entrance.'
      ],
      closing: 'Explore available events today and secure your spot! If you have any questions, feel free to reply directly to this email.',
      ctaText: 'Discover Events Now',
      ctaUrl: process.env.FRONTEND_URL || 'http://localhost:3000'
    };

    sendWelcomeEmail(newUser.email, newUser.name, 'Welcome to TicketsHub 🎉', welcomeData, newUser.id).catch(err => {
      console.error(`🚨 [WELCOME EMAIL DISPATCH EXCEPTION] Async welcome email delivery crashed:`, err);
    });

    if (!isAdmin) {
      const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${rawVerificationToken}`;
      sendVerificationEmail(newUser.email, newUser.name, verificationUrl, newUser.id).catch(err => {
        console.error(`🚨 [VERIFICATION EMAIL DISPATCH EXCEPTION] Async verification email delivery failed:`, err);
      });
    }

    res.status(201).json({ 
      user, 
      accessToken, 
      refreshToken,
      message: "Your account has been created successfully. We've sent a verification email to your inbox. Please verify your email before purchasing tickets."
    });
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  console.log('[API] Login hit! Email:', email, 'Method:', req.method, 'Path:', req.path);
  try {
    if (!email || !password) return res.status(400).json({ error: 'Required fields missing.' });
    const user = await db.getUserByEmail(email);
    if (!user || !(await bcrypt.compare(password, user.password_hash))) return res.status(401).json({ error: 'Invalid email or password.' });
    if (user.is_deleted) return res.status(401).json({ error: 'This account has been deleted.' });
    const { accessToken, refreshToken, user: userPayload } = generateTokens(user);
    res.json({ user: userPayload, accessToken, refreshToken });
  } catch (error: any) { res.status(500).json({ error: 'Failed to login', details: error.message }); }
});

app.get('/api/auth/me', authenticateToken, async (req: any, res) => {
  try {
    const user = await db.getUserById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    const { password_hash, ...userWithoutPassword } = user;
    res.json({
      ...userWithoutPassword,
      emailVerified: !!user.email_verified
    });
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.post('/api/auth/refresh', async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ error: 'Refresh token is required.' });
  jwt.verify(refreshToken, JWT_REFRESH_SECRET, async (err: any, decoded: any) => {
    if (err) return res.status(401).json({ error: 'Invalid token.' });
    const user = await db.getUserById(decoded.id);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    res.json(generateTokens(user));
  });
});

// --- PASSWORD RECOVERY & CHANGE SYSTEM ---

// Rate limit for forgot password requests (5 per hour per IP)
const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many password reset requests from this IP. Please try again after an hour.' },
  skip: (req) => process.env.NODE_ENV !== 'production' || !!process.env.AIS_PREVIEW,
});

// Account-based throttling (3 per hour per account)
const accountResetRequestTracker = new Map<string, { count: number; firstRequestTime: number }>();
function checkAccountForgotPasswordRateLimit(email: string): boolean {
  const normalizedEmail = email.toLowerCase().trim();
  const now = Date.now();
  const userTracker = accountResetRequestTracker.get(normalizedEmail);
  if (!userTracker) {
    accountResetRequestTracker.set(normalizedEmail, { count: 1, firstRequestTime: now });
    return true;
  }
  if (now - userTracker.firstRequestTime > 60 * 60 * 1000) {
    accountResetRequestTracker.set(normalizedEmail, { count: 1, firstRequestTime: now });
    return true;
  }
  if (userTracker.count >= 3) {
    return false;
  }
  userTracker.count++;
  return true;
}

// Password rules: at least 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special, no leading/trailing spaces
function validatePassword(password: string): string | null {
  const result = sharedValidatePassword(password);
  if (!result.isValid) {
    return 'Password does not meet security requirements.';
  }
  const commonPasswords = ['password', 'password123', '12345678', 'qwertyuiop', 'tickets', 'ticketshub'];
  if (commonPasswords.includes(password.toLowerCase())) {
    return 'This password is too common. Please choose a more secure password.';
  }
  return null;
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// 1. Forgot Password Endpoint
app.post('/api/auth/forgot-password', forgotPasswordLimiter, async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email address is required.' });
  }

  const successResponse = { message: 'If an account exists, a password reset email has been sent.' };

  try {
    const normalizedEmail = email.toLowerCase().trim();
    
    // Check account-based limit (3 per hour)
    if (!checkAccountForgotPasswordRateLimit(normalizedEmail)) {
      return res.json(successResponse);
    }

    const user = await db.getUserByEmail(normalizedEmail);
    if (!user || user.is_deleted) {
      return res.json(successResponse);
    }

    // Generate secure random token (32 bytes)
    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Store hashed token in DB
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password_reset_token: hashedToken,
        password_reset_expires: expiresAt
      }
    });

    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${rawToken}`;
    const recipientName = getPersonalizedName(user.name, user.email);

    // Reuse mailer utility and generate responsive HTML template
    const { generateEmailHtml } = await import('./lib/mailer.js');
    const forgotPasswordHtml = generateEmailHtml({
      recipientName,
      title: 'Reset Your TicketsHub Password 🔒',
      bodyHtml: `
        <p>You recently requested to reset your password for your TicketsHub account. Click the button below to proceed with setting a new password.</p>
        <p>This password reset link is valid for <strong>15 minutes</strong>.</p>
        <div style="text-align: center; margin: 24px 0;">
          <a href="${resetUrl}" class="btn" style="color: #ffffff; text-decoration: none;">Reset Password</a>
        </div>
        <p>If the button doesn't work, copy and paste the link below into your browser:</p>
        <p style="word-break: break-all; font-size: 13px; color: #64748b;">${resetUrl}</p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
        <p style="font-size: 13px; color: #64748b;">If you did not request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
        <p style="font-size: 13px; color: #64748b;">For any issues, please contact our support team.</p>
      `,
      ctaText: 'Reset Password',
      ctaUrl: resetUrl
    });

    const forgotPasswordPlain = `
Hi ${recipientName},

You recently requested to reset your password for your TicketsHub account.

Click the link below to set a new password:
${resetUrl}

This link is valid for 15 minutes.

If you did not request this, please ignore this email.

Best regards,
The TicketsHub Team
    `.trim();

    try {
      await sendEmail({
        to: user.email,
        subject: 'Reset Your TicketsHub Password 🔒',
        html: forgotPasswordHtml,
        text: forgotPasswordPlain
      });
    } catch (err: any) {
      console.error('🚨 [FORGOT PASSWORD EMAIL EXCEPTION]', err);
    }

    return res.json(successResponse);
  } catch (error: any) {
    console.error('🚨 [FORGOT PASSWORD EXCEPTION]', error);
    return res.status(500).json({ error: 'Internal server error processing forgot password request.' });
  }
});

// 2. Verify Reset Password Token Endpoint
app.get('/api/auth/reset-password/verify', async (req, res) => {
  const { token } = req.query;
  if (!token || typeof token !== 'string') {
    return res.status(400).json({ error: 'Token is required.' });
  }

  try {
    const hashedToken = hashToken(token);
    const user = await prisma.user.findFirst({
      where: { password_reset_token: hashedToken }
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or already used password reset token.' });
    }

    if (user.password_reset_expires && new Date() > user.password_reset_expires) {
      return res.status(410).json({ error: 'The password reset token has expired.' });
    }

    return res.status(200).json({ valid: true, email: user.email, name: user.name });
  } catch (error: any) {
    console.error('🚨 [VERIFY TOKEN EXCEPTION]', error);
    return res.status(500).json({ error: 'Internal server error verifying token.' });
  }
});

// 3. Reset Password (Unauthenticated execution)
app.post('/api/auth/reset-password', async (req, res) => {
  const { token, password, confirmPassword } = req.body;
  if (!token || typeof token !== 'string') {
    return res.status(400).json({ error: 'Token is required.' });
  }
  if (!password || !confirmPassword) {
    return res.status(400).json({ error: 'Password and password confirmation are required.' });
  }
  if (password !== confirmPassword) {
    return res.status(400).json({ error: 'Passwords do not match.' });
  }

  const passwordError = validatePassword(password);
  if (passwordError) {
    return res.status(400).json({ error: passwordError });
  }

  try {
    const hashedToken = hashToken(token);
    const user = await prisma.user.findFirst({
      where: { password_reset_token: hashedToken }
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or already used password reset token.' });
    }

    if (user.password_reset_expires && new Date() > user.password_reset_expires) {
      return res.status(410).json({ error: 'The password reset token has expired.' });
    }

    // Hash the password
    const passwordHash = await bcrypt.hash(password, 10);

    // Invalidate ALL previous sessions by incrementing token_version
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        password_hash: passwordHash,
        password_reset_token: null,
        password_reset_expires: null,
        password_changed_at: new Date(),
        token_version: { increment: 1 }
      }
    });

    const recipientName = getPersonalizedName(updatedUser.name, updatedUser.email);
    const { generateEmailHtml } = await import('./lib/mailer.js');
    const confirmationHtml = generateEmailHtml({
      recipientName,
      title: 'Your Password Was Successfully Reset 🔒',
      bodyHtml: `
        <p>This email confirms that the password for your TicketsHub account has been successfully reset.</p>
        <p>All of your previous sessions on other devices have been securely logged out.</p>
        <p>If you did this, you can safely ignore this email and log in with your new password.</p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
        <p style="font-weight: bold; color: #ef4444;">If you did not reset your password:</p>
        <p>Please contact our support team immediately to secure your account.</p>
      `,
      ctaText: 'Login to TicketsHub',
      ctaUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login`
    });

    const confirmationPlain = `
Hi ${recipientName},

This email confirms that the password for your TicketsHub account has been successfully reset.
All of your previous sessions on other devices have been securely logged out.

If you did this, you can log in with your new password.

If you did not reset your password, please contact our support team immediately.

Best regards,
The TicketsHub Team
    `.trim();

    sendEmail({
      to: updatedUser.email,
      subject: 'TicketsHub Password Reset Confirmed 🎟️',
      html: confirmationHtml,
      text: confirmationPlain
    }).catch(err => {
      console.error('🚨 [RESET CONFIRMATION EMAIL EXCEPTION]', err);
    });

    return res.json({ message: 'Password has been reset successfully.' });
  } catch (error: any) {
    console.error('🚨 [RESET PASSWORD EXCEPTION]', error);
    return res.status(500).json({ error: 'Internal server error resetting password.' });
  }
});

// 4. Logged-in Password Change (Authenticated execution)
app.post('/api/auth/change-password', authenticateToken, async (req: any, res) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;
  if (!currentPassword || !newPassword || !confirmPassword) {
    return res.status(400).json({ error: 'Current password, new password, and password confirmation are required.' });
  }
  if (newPassword !== confirmPassword) {
    return res.status(400).json({ error: 'New passwords do not match.' });
  }
  if (currentPassword === newPassword) {
    return res.status(400).json({ error: 'New password cannot be the same as your current password.' });
  }

  const passwordError = validatePassword(newPassword);
  if (passwordError) {
    return res.status(400).json({ error: passwordError });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: parseInt(req.user.id) }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Incorrect current password.' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Increment token_version to invalidate all other device sessions
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        password_hash: passwordHash,
        password_changed_at: new Date(),
        token_version: { increment: 1 }
      }
    });

    // Generate new tokens to keep current session alive
    const { accessToken, refreshToken, user: userPayload } = generateTokens(updatedUser);

    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'Unknown IP';
    const device = req.headers['user-agent'] || 'Unknown Device';
    const changeTime = new Date().toLocaleString();

    const recipientName = getPersonalizedName(updatedUser.name, updatedUser.email);
    const { generateEmailHtml } = await import('./lib/mailer.js');
    const changeHtml = generateEmailHtml({
      recipientName,
      title: 'Your Password Was Changed Successfully 🔐',
      bodyHtml: `
        <p>This email confirms that the password for your TicketsHub account was recently changed.</p>
        <p><strong>Change Details:</strong></p>
        <ul style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 16px; border-radius: 6px; list-style-type: none;">
          <li>⏰ <strong>Time:</strong> ${changeTime}</li>
          <li>🌐 <strong>IP Address:</strong> ${ip}</li>
          <li>📱 <strong>Device/Browser:</strong> ${device}</li>
        </ul>
        <p>All other active sessions on other devices have been signed out to ensure your account security.</p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
        <p style="font-weight: bold; color: #ef4444;">If you did not make this change:</p>
        <p>Please contact our support team immediately or reset your password to secure your account.</p>
      `,
      ctaText: 'Manage Your Account',
      ctaUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard`
    });

    const changePlain = `
Hi ${recipientName},

This email confirms that the password for your TicketsHub account was recently changed.

Change Details:
- Time: ${changeTime}
- IP Address: ${ip}
- Device/Browser: ${device}

All other active sessions on other devices have been signed out.

If you did not make this change, please contact our support team immediately.

Best regards,
The TicketsHub Team
    `.trim();

    sendEmail({
      to: updatedUser.email,
      subject: 'TicketsHub Password Change Notification 🎟️',
      html: changeHtml,
      text: changePlain
    }).catch(err => {
      console.error('🚨 [PASSWORD CHANGE EMAIL EXCEPTION]', err);
    });

    return res.json({
      message: 'Password has been updated successfully. Other devices have been logged out.',
      accessToken,
      refreshToken,
      user: userPayload
    });
  } catch (error: any) {
    console.error('🚨 [CHANGE PASSWORD EXCEPTION]', error);
    return res.status(500).json({ error: 'Internal server error changing password.' });
  }
});

// --- EMAIL VERIFICATION SYSTEM ---

const requireEmailVerification = (req: any, res: any, next: any) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required.' });
  }
  // Admins bypass verification check
  if (req.user.role === 'admin') {
    return next();
  }
  // Check if verified
  if (!req.user.emailVerified) {
    return res.status(403).json({
      error: 'email_not_verified',
      message: 'Your email has not been verified. Please verify your email to perform this action.'
    });
  }
  next();
};

app.post('/api/auth/verify-email', async (req, res) => {
  const { token } = req.body;
  if (!token) {
    return res.status(400).json({ error: 'Verification token is required.' });
  }

  try {
    const hashedToken = hashToken(token);
    
    // Find user with this token
    const user = await prisma.user.findFirst({
      where: {
        email_verification_token: hashedToken
      }
    });

    if (!user) {
      return res.status(400).json({ error: 'invalid_link', message: 'The verification link is invalid.' });
    }

    if (user.email_verification_expires && user.email_verification_expires < new Date()) {
      return res.status(400).json({ error: 'expired_link', message: 'The verification link has expired.' });
    }

    // Update user to verified
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        email_verified: true,
        email_verification_token: null,
        email_verification_expires: null
      }
    });

    // Generate fresh tokens for the user in case they are logged in
    const { accessToken, refreshToken, user: userPayload } = generateTokens(updatedUser);

    res.json({ 
      message: 'Email verified successfully!',
      accessToken,
      refreshToken,
      user: userPayload
    });
  } catch (error: any) {
    res.status(500).json({ error: 'unexpected_error', message: error.message });
  }
});

const resendTracker = new Map<number, number>();

app.post('/api/auth/resend-verification', authenticateToken, async (req: any, res) => {
  const userId = req.user.id;
  const now = Date.now();
  
  try {
    const user = await db.getUserById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    if (user.email_verified) {
      return res.status(400).json({ error: 'already_verified', message: 'Your email is already verified.' });
    }

    // Cooldown check (60 seconds)
    const lastSent = resendTracker.get(userId);
    if (lastSent && now - lastSent < 60000) {
      const waitSeconds = Math.ceil((60000 - (now - lastSent)) / 1000);
      return res.status(429).json({ 
        error: 'cooldown', 
        message: `Please wait ${waitSeconds} seconds before requesting another verification email.` 
      });
    }

    // Generate new secure token
    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await prisma.user.update({
      where: { id: userId },
      data: {
        email_verification_token: hashedToken,
        email_verification_expires: expiresAt
      }
    });

    resendTracker.set(userId, now);

    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${rawToken}`;
    
    sendVerificationEmail(user.email, user.name, verificationUrl, user.id).catch(err => {
      console.error(`🚨 [RESEND VERIFICATION EMAIL EXCEPTION] Async delivery failed:`, err);
    });

    res.json({ message: 'Verification email has been sent successfully. Please check your inbox.' });
  } catch (error: any) {
    res.status(500).json({ error: 'failed_resend', message: error.message });
  }
});

// --- ACCOUNT DELETION ENDPOINTS ---

// Request account deletion link
app.post('/api/auth/request-account-deletion', authenticateToken, async (req: any, res) => {
  const { password } = req.body;
  if (!password) {
    return res.status(400).json({ error: 'password_required', message: 'Current password is required to request account deletion.' });
  }

  try {
    const user = await db.getUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'user_not_found', message: 'User not found.' });
    }

    // Verify current password against stored hash
    const isPasswordCorrect = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordCorrect) {
      return res.status(400).json({ error: 'invalid_password', message: 'Incorrect password.' });
    }

    // --- PRE-DELETION VALIDATIONS ---

    // 1. Does not own upcoming events
    const upcomingEvent = await prisma.event.findFirst({
      where: {
        organizer_id: user.id,
        date: { gte: new Date() }
      }
    });
    if (upcomingEvent) {
      return res.status(400).json({
        error: 'owns_upcoming_events',
        message: `You cannot delete your account because you are organizing the upcoming event "${upcomingEvent.title}". Please cancel or transfer ownership of this event first.`
      });
    }

    // 2. Does not have future paid tickets
    const futurePaidTicket = await prisma.order.findFirst({
      where: {
        user_id: user.id,
        is_paid: true,
        order_status: 'paid',
        event: {
          date: { gte: new Date() }
        }
      },
      include: {
        event: true
      }
    });
    if (futurePaidTicket) {
      return res.status(400).json({
        error: 'has_future_tickets',
        message: `You cannot delete your account because you have active paid tickets for the upcoming event "${futurePaidTicket.event?.title}".`
      });
    }

    // 3. Does not have active resale listings
    const activeResale = await prisma.resellRequest.findFirst({
      where: {
        user_id: user.id,
        status: 'pending'
      }
    });
    if (activeResale) {
      return res.status(400).json({
        error: 'has_active_resales',
        message: 'You cannot delete your account because you have active ticket resale listings in progress. Please withdraw them before proceeding.'
      });
    }

    // 4. Does not have unfinished payment sessions
    const unfinishedOrder = await prisma.order.findFirst({
      where: {
        user_id: user.id,
        is_paid: false,
        order_status: { in: ['pending', 'pending_approval', 'approved', 'invited'] }
      },
      include: {
        event: true
      }
    });
    if (unfinishedOrder) {
      return res.status(400).json({
        error: 'has_unfinished_orders',
        message: `You cannot delete your account because you have an unfinished order/payment session for "${unfinishedOrder.event?.title}". Please complete or let it expire first.`
      });
    }

    // 5. Does not have pending invitations requiring action
    const pendingInvitation = await prisma.invitation.findFirst({
      where: {
        email: user.email,
        status: 'pending'
      },
      include: {
        event: true
      }
    });
    if (pendingInvitation) {
      return res.status(400).json({
        error: 'has_pending_invitations',
        message: `You cannot delete your account because you have a pending invitation to "${pendingInvitation.event?.title}" requiring action.`
      });
    }

    // Generate secure token and store its hash in the database
    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await prisma.user.update({
      where: { id: user.id },
      data: {
        deletion_token_hash: hashedToken,
        deletion_token_expires: expiresAt
      }
    });

    const deletionUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/confirm-delete-account?token=${rawToken}`;
    const recipientName = getPersonalizedName(user.name, user.email);

    const emailHtml = generateEmailHtml({
      recipientName,
      title: 'Confirm Your Account Deletion Request ⚠️',
      bodyHtml: `
        <p>We received a request to permanently delete your TicketsHub account.</p>
        <p>Please note that deleting your account is a permanent, high-risk action. If you proceed:</p>
        <ul style="margin: 16px 0; padding-left: 20px; line-height: 1.6;">
          <li>Your profile and login credentials will be permanently deactivated.</li>
          <li>Your reward points (${user.points} pts) and entire purchase history will be inaccessible.</li>
          <li>You will no longer be able to log back into this account.</li>
          <li>Existing ticket orders, resale logs, and system data will be preserved as anonymized archives in compliance with platform policies.</li>
        </ul>
        <p>To authorize this deletion request, please click the button below. This link is valid for <strong>15 minutes</strong> and can only be used once.</p>
        <p>If the button doesn't work, copy and paste the link below into your browser:</p>
        <p style="word-break: break-all; font-size: 13px; color: #64748b;">${deletionUrl}</p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
        <p style="font-size: 13px; color: #64748b;">If you did not make this request, your account is secure and you can safely ignore this email.</p>
      `,
      ctaText: 'Delete My Account Permanently',
      ctaUrl: deletionUrl
    });

    await sendEmail({
      to: user.email,
      subject: 'Authorize Account Deletion Request - TicketsHub 🎟️',
      html: emailHtml
    });

    res.json({ message: 'A verification link has been sent to your email. Please check your inbox within 15 minutes.' });
  } catch (error: any) {
    res.status(500).json({ error: 'failed_request_deletion', message: error.message });
  }
});

// Confirm account deletion via token
app.post('/api/auth/confirm-account-deletion', async (req, res) => {
  const { token, reason } = req.body;
  if (!token) {
    return res.status(400).json({ error: 'token_required', message: 'Deletion token is required.' });
  }

  try {
    const hashedToken = hashToken(token);

    // Find user with this token
    const user = await prisma.user.findFirst({
      where: {
        deletion_token_hash: hashedToken
      }
    });

    if (!user) {
      return res.status(400).json({ error: 'invalid_link', message: 'The deletion confirmation link is invalid or has already been used.' });
    }

    if (user.deletion_token_expires && user.deletion_token_expires < new Date()) {
      // Clear token even if expired for safety
      await prisma.user.update({
        where: { id: user.id },
        data: {
          deletion_token_hash: null,
          deletion_token_expires: null
        }
      });
      return res.status(400).json({ error: 'expired_link', message: 'The deletion confirmation link has expired.' });
    }

    // --- SECOND PASS PRE-DELETION VALIDATIONS (FOR SAFETY) ---

    // 1. Does not own upcoming events
    const upcomingEvent = await prisma.event.findFirst({
      where: {
        organizer_id: user.id,
        date: { gte: new Date() }
      }
    });
    if (upcomingEvent) {
      return res.status(400).json({
        error: 'owns_upcoming_events',
        message: `Account deletion blocked: you own upcoming event "${upcomingEvent.title}".`
      });
    }

    // 2. Does not have future paid tickets
    const futurePaidTicket = await prisma.order.findFirst({
      where: {
        user_id: user.id,
        is_paid: true,
        order_status: 'paid',
        event: {
          date: { gte: new Date() }
        }
      }
    });
    if (futurePaidTicket) {
      return res.status(400).json({
        error: 'has_future_tickets',
        message: 'Account deletion blocked: you have active tickets for an upcoming event.'
      });
    }

    // 3. Does not have active resale listings
    const activeResale = await prisma.resellRequest.findFirst({
      where: {
        user_id: user.id,
        status: 'pending'
      }
    });
    if (activeResale) {
      return res.status(400).json({
        error: 'has_active_resales',
        message: 'Account deletion blocked: you have active ticket resale listings.'
      });
    }

    // 4. Does not have unfinished payment sessions
    const unfinishedOrder = await prisma.order.findFirst({
      where: {
        user_id: user.id,
        is_paid: false,
        order_status: { in: ['pending', 'pending_approval', 'approved', 'invited'] }
      }
    });
    if (unfinishedOrder) {
      return res.status(400).json({
        error: 'has_unfinished_orders',
        message: 'Account deletion blocked: you have pending/unfinished order sessions.'
      });
    }

    // 5. Does not have pending invitations requiring action
    const pendingInvitation = await prisma.invitation.findFirst({
      where: {
        email: user.email,
        status: 'pending'
      }
    });
    if (pendingInvitation) {
      return res.status(400).json({
        error: 'has_pending_invitations',
        message: 'Account deletion blocked: you have pending invitations.'
      });
    }

    // Perform soft-deletion
    await prisma.user.update({
      where: { id: user.id },
      data: {
        is_deleted: true,
        deleted_at: new Date(),
        deleted_reason: reason || 'Requested by user',
        deletion_token_hash: null,
        deletion_token_expires: null,
        password_reset_token: null,
        password_reset_expires: null,
        email_verification_token: null,
        email_verification_expires: null,
        token_version: { increment: 1 } // Invalidate all active sessions!
      }
    });

    // Send Email 2 (success confirmation)
    const recipientName = getPersonalizedName(user.name, user.email);
    const emailHtml = generateEmailHtml({
      recipientName,
      title: 'Your Account Has Been Soft-Deleted 🛡️',
      bodyHtml: `
        <p>We are writing to confirm that your TicketsHub account has been successfully deleted.</p>
        <p>In accordance with our privacy policy, your login credentials and profile have been permanently deactivated. You will no longer receive transactional updates, and you cannot log into this account anymore.</p>
        <p>Your previous orders, tickets, and payment transaction history have been preserved as secure, anonymized records for reporting, compliance, and auditing purposes. No further charges or actions can be initiated on this account.</p>
        <p>Thank you for using TicketsHub. If you ever decide to return, you are welcome to sign up for a fresh account at any time.</p>
      `
    });

    await sendEmail({
      to: user.email,
      subject: 'Account Successfully Deleted - TicketsHub 🎟️',
      html: emailHtml
    }).catch(err => {
      console.error(`🚨 [DELETION CONFIRMATION EMAIL EXCEPTION] Delivery failed:`, err);
    });

    res.json({ message: 'Your account has been deleted successfully.' });
  } catch (error: any) {
    res.status(500).json({ error: 'failed_confirm_deletion', message: error.message });
  }
});

// --- NOTIFICATION ROUTES ---
console.log('[App] Registering Notification Routes...');
app.get('/api/notifications', authenticateToken, async (req: any, res) => {
  try { res.json(await db.getNotificationsByUserId(parseInt(req.user.id))); }
  catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.put('/api/notifications/:id/read', authenticateToken, async (req: any, res) => {
  try { res.json(await db.markNotificationAsRead(parseInt(req.params.id))); }
  catch (error: any) { res.status(500).json({ error: error.message }); }
});

// --- EVENT ROUTES ---
console.log('[App] Registering Event Routes...');
app.get('/api/events', optionalAuthenticate, async (req: any, res) => {
  try {
    const events = await db.getEvents();
    const userId = req.user?.id ? parseInt(req.user.id) : null;
    
    const result = events.map((e: any) => {
      const preReg = e.pre_registrations || [];
      return {
        ...e,
        ticket_types: e.ticket_types || [],
        pre_registration_count: preReg.length,
        is_pre_registered: userId ? preReg.some((r: any) => r.user_id === userId) : false
      };
    });
    res.json(result);
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.get('/api/events/:id', optionalAuthenticate, async (req: any, res) => {
  try {
    const id = parseInt(req.params.id);
    const userId = req.user?.id ? parseInt(req.user.id) : null;
    
    // Background cleanup
    db.cleanupExpiredReservations().catch(err => console.error('[Cleanup Error]', err));
    
    const event: any = await db.getEventById(id);
    if (!event) return res.status(404).json({ error: 'Not found' });
    
    const preReg = event.pre_registrations || [];
    res.json({
      ...event,
      ticket_types: event.ticket_types || [],
      pre_registration_count: preReg.length,
      is_pre_registered: userId ? preReg.some((r: any) => r.user_id === userId) : false
    });
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.post('/api/events', authenticateToken, authorizeRole(['admin']), requireEmailVerification, async (req: any, res) => {
  try {
    const { ticket_types, ...data } = req.body;
    const newEvent = await db.addEvent({ ...data, organizer_id: req.user.id });
    if (ticket_types) await db.setTicketTypesForEvent(newEvent.id, ticket_types);
    res.status(201).json({ ...newEvent, ticket_types: await db.getTicketTypesByEventId(newEvent.id) });
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.put('/api/events/:id', authenticateToken, authorizeRole(['admin']), requireEmailVerification, async (req: any, res: any) => {
  const id = parseInt(req.params.id);
  console.log(`[EVENT UPDATE] Starting update for event #${id}`);
  try {
    const { ticket_types, ...data } = req.body;
    
    // Log payload for debugging (omitting large image data if too big)
    const logData = { ...data };
    if (logData.image_url && typeof logData.image_url === 'string' && logData.image_url.length > 500) {
      logData.image_url = `[TRUNCATED BASE64, length: ${logData.image_url.length}]`;
    }
    console.log(`[EVENT UPDATE] Payload:`, JSON.stringify(logData, null, 2));

    const updated = await db.updateEvent(id, data);
    console.log(`[EVENT UPDATE] Event record updated successfully`);

    if (ticket_types) {
      console.log(`[EVENT UPDATE] Syncing ${ticket_types.length} ticket types`);
      await db.setTicketTypesForEvent(id, ticket_types);
      console.log(`[EVENT UPDATE] Ticket types synced successfully`);
    }

    const finalEvent = { ...updated, ticket_types: await db.getTicketTypesByEventId(id) };
    res.json(finalEvent);
  } catch (error: any) { 
    console.error(`[EVENT UPDATE ERROR] Failed for event #${id}:`, error);
    if (error.code === 'P2002') {
      res.status(400).json({ error: 'Unique constraint failed', details: error.meta });
    } else if (error.message && error.message.includes('Unknown argument')) {
      res.status(400).json({ error: 'Schema mismatch error. Please contact developer.', details: error.message });
    } else {
      res.status(500).json({ error: error.message || 'Internal server error during update' }); 
    }
  }
});

app.delete('/api/events/:id', authenticateToken, authorizeRole(['admin']), requireEmailVerification, async (req: any, res) => {
  try { await db.deleteEvent(parseInt(req.params.id)); res.json({ message: 'Deleted' }); }
  catch (error: any) { res.status(500).json({ error: error.message }); }
});

// --- ORDER ROUTES ---
console.log('[App] Registering Order Routes...');
app.post('/api/orders', authenticateToken, requireEmailVerification, async (req: any, res) => {
  try {
    // Background cleanup - randomized to prevent every order from triggering it simultaneously
    if (Math.random() < 0.2) {
      db.cleanupExpiredReservations().catch(err => console.error('[Cleanup Error]', err));
    }
    const { event_id, tickets, instagram_username, phone, age, voucher_code, ticket_holders } = req.body;
    if (!event_id || !tickets || !Array.isArray(tickets) || tickets.length === 0) return res.status(400).json({ error: 'Event ID and tickets are required.' });

    const result = await prisma.$transaction(async (tx) => {
      const event = await tx.event.findUnique({ where: { id: parseInt(event_id) } });
      if (!event) throw new Error('Event not found.');

      let totalPrice = 0;
      let discountPercent = 0;
      let voucherId = null;

      if (voucher_code) {
        const vs = await tx.$queryRaw<any[]>`SELECT * FROM "Voucher" WHERE code = ${voucher_code} FOR UPDATE`;
        const v = vs[0];
        if (!v) throw new Error('Invalid voucher.');
        if (new Date(v.expiration_date) < new Date()) throw new Error('Expired voucher.');
        if (v.current_uses >= v.max_uses) throw new Error('Voucher limit reached.');
        discountPercent = v.discount_percent;
        voucherId = v.id;
      }

      const orderItems = [];
      for (const item of tickets) {
        const ttList = await tx.$queryRaw<any[]>`SELECT * FROM "TicketType" WHERE id = ${parseInt(item.ticket_type_id)} FOR UPDATE`;
        const tt = ttList[0];
        if (!tt || tt.event_id !== event.id) throw new Error(`Invalid ticket type: ${item.ticket_type_id}`);

        const now = new Date();
        if (tt.sale_start && new Date(tt.sale_start) > now) throw new Error(`Sale for ${tt.name} not started.`);
        if (tt.sale_end && new Date(tt.sale_end) < now) throw new Error(`Sale for ${tt.name} ended.`);

        const available = (tt.quantity_total - tt.quantity_sold) + (tt.resale_queue || 0);
        if (item.quantity > available) throw new Error(`Unavailable: ${tt.name}`);

        totalPrice += tt.price * item.quantity;
        orderItems.push({
          ticket_type_id: tt.id,
          quantity: item.quantity,
          price_each: tt.price,
          name: tt.name,
          is_resale: (tt.quantity_total - tt.quantity_sold) < item.quantity
        });
      }

      if (discountPercent > 0) totalPrice *= (1 - discountPercent / 100);

      const order = await tx.order.create({
        data: {
          user_id: req.user.id,
          event_id: event.id,
          total_price: totalPrice,
          order_status: event.require_approval ? 'pending_approval' : 'pending',
          reserved_at: new Date(),
          instagram_username,
          phone,
          age: parseInt(age || '0'),
          voucher_id: voucherId,
          is_paid: false,
          processing_payment: false,
          points_awarded: false,
          ticket_holders_raw: ticket_holders ? JSON.stringify(ticket_holders) : null
        }
      });

      if (voucherId) await tx.voucher.update({ where: { id: voucherId }, data: { current_uses: { increment: 1 } } });

      let hIdx = 0;
      for (const it of orderItems) {
        const tt = await tx.ticketType.findUnique({ where: { id: it.ticket_type_id } });
        if (!tt) throw new Error('Missing TT');
        const qtyOrg = Math.min(it.quantity, tt.quantity_total - tt.quantity_sold);
        const qtyRes = it.quantity - qtyOrg;
        const holders = ticket_holders ? ticket_holders.slice(hIdx, hIdx + it.quantity) : [];
        hIdx += it.quantity;
        const hNames = holders.map((h: any) => (typeof h === 'string' ? h : ([h.first_name, h.last_name].filter(Boolean).join(' ') || 'Guest'))).join(', ');

        await tx.orderTicket.create({
          data: {
            order_id: order.id,
            ticket_type_id: it.ticket_type_id,
            quantity: it.quantity,
            price_each: it.price_each,
            qty_original: qtyOrg,
            qty_resale: qtyRes,
            holder_name: hNames
          }
        });

        await tx.ticketType.update({
          where: { id: tt.id },
          data: { quantity_sold: { increment: qtyOrg }, resale_queue: { decrement: qtyRes } }
        });

        if (qtyRes > 0) {
          const resales = await tx.resellRequest.findMany({ where: { status: 'pending', ticket_type_id: tt.id }, orderBy: { created_at: 'asc' }, take: qtyRes });
          for (const rr of resales) await tx.resellRequest.update({ where: { id: rr.id }, data: { status: 'resold' } });
        }
      }
      return { ...order, items: orderItems, event };
    });
    res.status(201).json(result);
  } catch (error: any) { 
    console.error('[Order Error]', error);
    res.status(500).json({ error: error.message }); 
  }
});

app.get('/api/orders', authenticateToken, async (req: any, res) => {
  try {
    const orders = await db.getOrdersByUserId(req.user.id);
    const now = new Date();
    
    // Map to result format
    const result = orders.map((o: any) => {
      const items = (o.order_tickets || []).map((it: any) => ({
        ...it,
        name: it.ticket_type?.name || it.name
      }));
      return { 
        ...o, 
        items, 
        event: o.event 
      };
    });
    
    res.json(result);
    
    // Background check for expirations to avoid blocking the response
    (async () => {
      for (const o of orders) {
        if (o.order_status === 'approved' && o.payment_deadline && new Date(o.payment_deadline) < now) {
          try {
            await db.updateOrder(o.id, { order_status: 'expired' });
            const items = o.order_tickets || [];
            for (const it of items) {
              if (it.ticket_type) {
                const tt = it.ticket_type;
                await db.updateTicketType(tt.id, { 
                  quantity_sold: Math.max(0, tt.quantity_sold - (it.qty_original || 0)), 
                  resale_queue: (tt.resale_queue || 0) + (it.qty_resale || 0) 
                });
              }
            }
          } catch (e: any) {
            console.error(`[Background Expiration] Failed for order #${o.id}:`, e.message);
          }
        }
      }
    })();
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.get('/api/admin/orders', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const orders = await db.getOrders();
    const now = new Date();
    
    const result = orders.map((o: any) => {
      const items = (o.order_tickets || []).map((it: any) => ({
        ...it,
        name: it.ticket_type?.name || it.name
      }));
      return { 
        ...o, 
        items, 
        event: o.event,
        user: o.user ? { name: o.user.name, email: o.user.email, phone: o.user.phone } : null
      };
    });
    
    res.json(result);

    // Background expiration process
    (async () => {
      for (const o of orders) {
        if (o.order_status === 'approved' && o.payment_deadline && new Date(o.payment_deadline) < now) {
          try {
            await db.updateOrder(o.id, { order_status: 'expired' });
            const items = o.order_tickets || [];
            for (const it of items) {
              if (it.ticket_type) {
                const tt = it.ticket_type;
                await db.updateTicketType(tt.id, { 
                  quantity_sold: Math.max(0, tt.quantity_sold - (it.qty_original || 0)), 
                  resale_queue: (tt.resale_queue || 0) + (it.qty_resale || 0) 
                });
              }
            }
          } catch (e: any) {
             console.error(`[Admin Background Expiration] Failed for order #${o.id}:`, e.message);
          }
        }
      }
    })();
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.get('/api/orders/:publicId', async (req: any, res) => {
  try {
    const order = await db.getOrderByPublicId(req.params.publicId);
    if (!order) return res.status(404).json({ error: 'Not found' });
    
    // Auto-generate ticket instances for paid orders
    if (order.is_paid || order.order_status === 'paid') {
      await db.ensureTicketInstancesForOrder(order.id);
    }
    
    const itemsRaw = await db.getOrderTicketsByOrderId(order.id);
    const items = itemsRaw.map((it: any) => ({
      ...it,
      name: it.ticket_type?.name || it.name
    }));
    const event = await db.getEventById(order.event_id);
    
    const ticketInstances = await prisma.ticketInstance.findMany({
      where: { order_id: order.id },
      include: { ticket_type: true, owner: true, order: { include: { event: true } } }
    });
    
    res.json({ ...order, items, event, ticket_instances: ticketInstances });
  } catch (error: any) { 
    console.error('[API ERROR] /api/orders/:publicId:', error);
    res.status(500).json({ error: error.message }); 
  }
});

// --- SETTINGS ROUTES ---
console.log('[App] Registering Settings Routes...');
app.get('/api/settings', async (req, res) => {
  try { res.json(await db.getSettings()); }
  catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.put('/api/settings', authenticateToken, authorizeRole(['admin']), requireEmailVerification, async (req: any, res) => {
  try { res.json(await db.updateSettings(req.body)); }
  catch (error: any) { res.status(500).json({ error: error.message }); }
});

  app.post('/api/payments/create-session', authenticateToken, requireEmailVerification, async (req: any, res) => {
    const { order_id } = req.body;
    
    if (!order_id) {
      return res.status(400).json({ error: 'order_id is required' });
    }

    try {
      // PROPER LOOKUP: Public APIs use Public ID (UUID)
      const order = await db.getOrderByPublicId(order_id);

      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }

      // Security: Ensure the order belongs to the authenticated user
      if (order.user_id !== req.user.id) {
        return res.status(403).json({ error: 'Unauthorized access to order' });
      }

      // CHECK FOR EXISTING SESSION
      if (order.kashier_url && !order.is_paid) {
        console.log(`[Payment] REUSING existing Kashier session for order: ${order.public_id}`);
        return res.json({ 
          payment_url: order.kashier_url, 
          checkoutUrl: order.kashier_url,
          reused: true 
        });
      }

      // Business Logic: Only approved orders (or pending if no approval required) can proceed to payment
      const event = await db.getEventById(order.event_id);
      const isAllowedToPay = order.order_status === 'approved' || (order.order_status === 'pending' && !event?.require_approval);

      if (!isAllowedToPay) {
        return res.status(400).json({ 
          error: order.order_status === 'pending' 
            ? `Your booking for ${event?.title} is pending admin approval.` 
            : `Payment not allowed for status: ${order.order_status}.`
        });
      }

      const settings = await db.getSettings();
      const serviceFeePercent = settings?.service_fee_percent ?? 10;
      const processingFeePercent = settings?.processing_fee_percent ?? 2.75;
      const fixedFeeEgp = settings?.fixed_fee_egp ?? 3;

      const basePrice = order.total_price || 0;
      const dynamicFee = basePrice * (serviceFeePercent / 100);
      const gatewayFee = (basePrice * (processingFeePercent / 100)) + fixedFeeEgp;
      const finalAmount = Number((basePrice + dynamicFee + gatewayFee).toFixed(2));

      const KASHIER_API_KEY = process.env.KASHIER_API_KEY;
      const KASHIER_SECRET_KEY = process.env.KASHIER_SECRET_KEY;
      const KASHIER_MERCHANT_ID = process.env.KASHIER_MERCHANT_ID;
      const KASHIER_TEST_MODE = process.env.KASHIER_TEST_MODE === 'true';
      
      const protocol = req.get('x-forwarded-proto') || req.protocol;
      const host = req.get('host');
      const APP_URL = process.env.APP_URL || `${protocol}://${host}`;

      if (!KASHIER_API_KEY || !KASHIER_SECRET_KEY || !KASHIER_MERCHANT_ID) {
        console.error('[Kashier] Configuration missing (API Key, Secret Key, or Merchant ID)');
        return res.status(500).json({ error: 'Kashier configuration missing. Please contact support.' });
      }

      const kashierApiUrl = KASHIER_TEST_MODE 
        ? 'https://test-api.kashier.io/v3/payment/sessions' 
        : 'https://api.kashier.io/v3/payment/sessions';

      const expireAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

      console.log('[Payment] Creating Kashier session for order:', order.public_id);
      console.log(`[Payment] URL: ${kashierApiUrl}`);
      console.log(`[Payment] Merchant ID: ${KASHIER_MERCHANT_ID}`);
      console.log(`[Payment] Amount: ${finalAmount}`);

      const orderIdentifier = order.public_id;

      const response = await fetch(kashierApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': KASHIER_SECRET_KEY,
          'api-key': KASHIER_API_KEY
        },
        body: JSON.stringify({
          amount: finalAmount.toString(),
          currency: 'EGP',
          order: orderIdentifier,
          merchantId: KASHIER_MERCHANT_ID,
          merchantRedirect: `${APP_URL}/payment-return?order_id=${orderIdentifier}&origin=kashier`,
          expireAt: expireAt,
          display: 'en',
          type: 'one-time',
          customer: {
            email: req.user.email,
            reference: req.user.id.toString()
          }
        })
      });

      const responseText = await response.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error('[Payment] Kashier API returned non-JSON response:', responseText);
        return res.status(500).json({ error: 'Invalid response from payment gateway.' });
      }

      console.log('[Kashier FULL response]:', data);
      
      if (response.ok && data.sessionUrl) {
        console.log(`[Payment] Session created successfully for order #${order.public_id}.`);
        
        const kashierOrderId = data.orderId || (data.session && data.session.orderId);
        console.log(`[Payment] Persisting session data for #${order.public_id}`);
        // INTERNAL DB CALL: uses numeric order.id
        await db.updateOrder(order.id, { 
          kashier_order_id: kashierOrderId || undefined,
          kashier_url: data.sessionUrl 
        });

        res.json({ 
          payment_url: data.sessionUrl,
          checkoutUrl: data.sessionUrl
        });
      } else {
        console.error('[Kashier ERROR]:', data);
        res.status(500).json({ 
          error: 'Kashier session creation failed',
          details: data
        });
      }
    } catch (error: any) {
      console.error('[Kashier] Internal Error:', error);
      res.status(500).json({ 
        error: 'Internal Server Error', 
        details: error.message 
      });
    }
  });

  app.get('/api/payments/verify/:publicId', async (req: any, res) => {
    const publicId = req.params.publicId;
    console.log(`[API] Checking payment verify state for order identifier: ${publicId}`);

    try {
      // PROPER LOOKUP: Public APIs use Public ID (UUID)
      const order = await db.getOrderByPublicId(publicId);

      if (!order) {
        console.warn(`[API] Order for verification not found: ${publicId}`);
        return res.status(404).json({ error: 'Order not found' });
      }

      console.log(`[API] Returning payment state for order #${order.id}: ${order.is_paid ? 'PAID' : 'NOT PAID'}`);
      return res.json({ 
        success: order.is_paid, 
        is_paid: order.is_paid,
        status: order.is_paid ? 'paid' : order.order_status,
        order: order 
      });

    } catch (error: any) {
      console.error(`[API ERROR] /api/payments/verify/${publicId}:`, error);
      res.status(500).json({ 
        error: 'Internal Server Error', 
        details: error.message 
      });
    }
  });

  app.post('/api/payments/confirm-from-return', async (req, res) => {
    const { orderId, transactionId, status } = req.body;
    
    console.log(`[API] Confirm from return signal received for order ${orderId}, status ${status}, transaction ${transactionId}`);

    if (status !== 'SUCCESS') {
      console.log(`[API FAILED] Invalid status from kashier return: ${status}`);
      return res.status(400).json({ error: 'Invalid status for confirmation.' });
    }

    try {
      // PROPER LOOKUP: Public APIs use Public ID (UUID)
      const order = await db.getOrderByPublicId(orderId);

      if (!order) {
        console.warn(`[API] Order for confirm-from-return not found: ${orderId}`);
        return res.status(404).json({ error: 'Order not found.' });
      }

      // BACKEND IDEMPOTENCY
      if (order.is_paid) {
        console.log(`[API] Order #${order.id} (Public: ${order.public_id}) already marked as paid. Returning cached success.`);
        return res.json({ success: true, is_paid: true, order });
      }

      // INTERNAL DB CALL: uses numeric order.id
      const result = await db.markOrderAsPaid(order.id, transactionId);
      
      if (result.success) {
        console.log(`[PAYMENT VERIFIED] Order #${order.id} confirmed via return.`);
        console.log(`[ORDER UPDATED] Order #${order.id} status updated to paid in DB.`);
        // Dispatch email notification and await to ensure it completes before container freezes
        try {
          await sendTicketEmail(order.public_id);
        } catch (err) {
          console.error(`🚨 [EMAIL DISPATCH ERROR in confirm-from-return]:`, err);
        }
        return res.json({ success: true, is_paid: true, order: result.order });
      } else {
        console.warn(`[API FAILED] Order #${order.id} confirmation failed: ${result.reason}`);
        return res.status(400).json({ success: false, error: result.reason });
      }
    } catch (error: any) {
      console.error(`[API ERROR] /api/payments/confirm-from-return:`, error);
      res.status(500).json({ 
        error: 'Internal Server Error', 
        details: error.message 
      });
    }
  });

  app.post('/api/payments/webhook', express.raw({ type: 'application/json' }) as any, async (req: any, res: any) => {
    console.log('[Webhook] Receive trigger');
    try {
      const rawBody = req.body;
      if (!rawBody || rawBody.length === 0) return res.status(200).send();

      const payload = JSON.parse(rawBody.toString());
      const signature = req.headers['x-kashier-signature'] as string;
      const KASHIER_API_KEY = process.env.KASHIER_API_KEY;

      if (!KASHIER_API_KEY) return res.status(200).send(); // Always 200 to Kashier unless strictly auth/sig fail

      if (signature) {
        const expectedSignature = crypto.createHmac('sha256', KASHIER_API_KEY).update(rawBody).digest('hex');
        if (signature !== expectedSignature) return res.status(200).send();
      }

      const transactionId = payload.transactionId || payload.referenceNumber;
      const orderIdStr = payload.orderId || payload.merchantOrderId;
      const status = payload.status || (payload.response && payload.response.status);
      
      if (!orderIdStr || !transactionId || status !== 'SUCCESS') {
        console.log('[Webhook] Skipping incomplete or non-success payload');
        return res.status(200).send();
      }

      // Resolve order and trigger markOrderAsPaid
      // We pass order.public_id in our checkout session creation, so we check that first.
      let order: any = await db.getOrderByPublicId(orderIdStr);
      
      if (!order) {
        order = await db.getOrderByKashierOrderId(orderIdStr);
      }

      if (order) {
        console.log(`[PAYMENT VERIFIED] Order #${order.id} (Public: ${order.public_id}) confirmed via webhook.`);
        await db.markOrderAsPaid(order.id, transactionId);
        console.log(`[ORDER UPDATED] Order #${order.id} status updated to paid in DB via webhook.`);
        // Dispatch email notification and await to ensure it completes before container freezes
        try {
          await sendTicketEmail(order.public_id);
        } catch (err) {
          console.error(`🚨 [EMAIL DISPATCH ERROR in webhook]:`, err);
        }
      }

      return res.status(200).send();
    } catch (error) {
      console.error('[Webhook] Error:', error);
      return res.status(200).send(); // Always converge to 200 for webhooks
    }
  });

// --- USER MANAGEMENT API (Admin) ---
app.get('/api/admin/users', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    console.log('[API] Admin: Fetching all users');
    const users = await db.getUsers();
    res.json(users.map(({ password_hash, ...u }: any) => u));
  } catch (error: any) { 
    console.error('[API ERROR] /api/admin/users:', error);
    res.status(500).json({ error: error.message }); 
  }
});

app.get('/api/admin/users/:id', authenticateToken, async (req: any, res) => {
  try {
    const userId = parseInt(req.params.id);
    if (req.user.role !== 'admin' && req.user.id !== userId) return res.status(403).json({ error: 'Access denied.' });
    const user = await db.getUserById(userId);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    const { password_hash, ...u } = user;
    res.json({
      ...u,
      emailVerified: !!user.email_verified
    });
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.put('/api/admin/users/:id', authenticateToken, async (req: any, res) => {
  try {
    const userId = parseInt(req.params.id);
    if (req.user.role !== 'admin' && req.user.id !== userId) return res.status(403).json({ error: 'Access denied.' });
    const updated = await db.updateUser(userId, req.body);
    if (!updated) return res.status(404).json({ error: 'User not found.' });
    const { password_hash, ...u } = updated;
    res.json({
      ...u,
      emailVerified: !!updated.email_verified
    });
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.delete('/api/admin/users/:id', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const success = await db.deleteUser(parseInt(req.params.id));
    if (!success) return res.status(404).json({ error: 'User not found.' });
    res.json({ message: 'User deleted.' });
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.put('/api/admin/users/:id/role', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const updated = await db.updateUser(parseInt(req.params.id), { role: req.body.role });
    if (!updated) return res.status(404).json({ error: 'User not found.' });
    const { password_hash, ...u } = updated;
    res.json(u);
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

// --- TICKET TYPES API ---
app.get('/api/ticket-types/:eventId', async (req, res) => {
  try { res.json(await db.getTicketTypesByEventId(parseInt(req.params.eventId))); }
  catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.post('/api/ticket-types', authenticateToken, authorizeRole(['admin']), requireEmailVerification, async (req, res) => {
  try { res.status(201).json(await db.addTicketType(req.body)); }
  catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.put('/api/ticket-types/:id', authenticateToken, authorizeRole(['admin']), requireEmailVerification, async (req, res) => {
  try {
    const updated = await db.updateTicketType(parseInt(req.params.id), req.body);
    if (!updated) return res.status(404).json({ error: 'Not found' });
    res.json(updated);
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.delete('/api/ticket-types/:id', authenticateToken, authorizeRole(['admin']), requireEmailVerification, async (req, res) => {
  try {
    await db.deleteTicketType(parseInt(req.params.id));
    res.json({ message: 'Deleted' });
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

// --- PRE-REGISTRATION ROUTES ---
app.get('/api/pre-registrations', authenticateToken, async (req: any, res) => {
  try {
    const registrations = await db.getPreRegistrationsByUserId(req.user.id);
    const result = await Promise.all(registrations.map(async (r: any) => {
      const event = await db.getEventById(r.event_id);
      return { ...r, event };
    }));
    res.json(result);
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.post('/api/events/:id/pre-register', authenticateToken, requireEmailVerification, async (req: any, res: any) => {
  try {
    const eventId = parseInt(req.params.id);
    const userId = parseInt(req.user.id);
    const registrations = await db.getPreRegistrationsByUserId(userId);
    const alreadyRegistered = registrations.find((r: any) => r.event_id === eventId);
    
    if (alreadyRegistered) {
      return res.status(200).json({ 
        message: 'Already pre-registered.', 
        is_pre_registered: true,
        already_registered: true 
      });
    }
    
    const result = await db.addPreRegistration({ user_id: userId, event_id: eventId });
    
    // Create notifications asynchronously without blocking response
    (async () => {
      try {
        const event = await db.getEventById(eventId);
        const eventTitle = event ? event.title : `Event #${eventId}`;
        
        // 1. Notify current user
        await db.addNotification({
          user_id: userId,
          title: 'Waitlist Joined',
          message: `You joined the waitlist for ${eventTitle}. We will notify you when tickets become available.`,
          type: 'info'
        });
        
        // 2. Notify admins
        const users = await db.getUsers();
        const admins = users.filter((u: any) => u.role === 'admin');
        const userName = req.user.name || req.user.email || 'A user';
        
        for (const admin of admins) {
          await db.addNotification({
            user_id: admin.id,
            title: 'New Waitlist Registration',
            message: `${userName} joined the waitlist for ${eventTitle}.`,
            type: 'info'
          });
        }
      } catch (notifErr) {
        console.error('[Notification Error] Failed to create join notifications:', notifErr);
      }
    })();

    res.status(201).json({
      ...result,
      is_pre_registered: true,
      success: true
    });
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.delete('/api/events/:id/pre-register', authenticateToken, requireEmailVerification, async (req: any, res) => {
  try {
    const eventId = parseInt(req.params.id);
    const userId = parseInt(req.user.id);
    const event = await db.getEventById(eventId);
    const eventTitle = event ? event.title : `Event #${eventId}`;

    await db.removePreRegistration(userId, eventId);

    // Create notifications asynchronously without blocking response
    (async () => {
      try {
        // 1. Notify current user
        await db.addNotification({
          user_id: userId,
          title: 'Waitlist Left',
          message: `You have successfully left the waitlist for ${eventTitle}.`,
          type: 'info'
        });

        // 2. Notify admins
        const users = await db.getUsers();
        const admins = users.filter((u: any) => u.role === 'admin');
        const userName = req.user.name || req.user.email || 'A user';

        for (const admin of admins) {
          await db.addNotification({
            user_id: admin.id,
            title: 'Waitlist Removal',
            message: `${userName} removed themselves from the waitlist for ${eventTitle}.`,
            type: 'info'
          });
        }
      } catch (notifErr) {
        console.error('[Notification Error] Failed to create removal notifications:', notifErr);
      }
    })();

    res.json({ message: 'Removed', success: true });
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

// --- REWARD POINTS API ---
app.get('/api/user/points', authenticateToken, async (req: any, res) => {
  try {
    const user = await db.getUserById(req.user.id);
    const history = await db.getPointsHistoryByUserId(req.user.id);
    res.json({ balance: user?.points || 0, history });
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.post(['/api/user/redeem', '/api/user/points/redeem'], authenticateToken, requireEmailVerification, async (req: any, res: any) => {
  try {
    const points_to_redeem = req.body.points_to_redeem || req.body.points;
    const user = await db.getUserById(req.user.id);
    if (!user || (user.points || 0) < points_to_redeem) return res.status(400).json({ error: 'Insufficient points.' });
    if (points_to_redeem < 100) return res.status(400).json({ error: 'Min 100 required.' });

    const discount = Math.min(Math.floor(points_to_redeem / 10), 50);
    const code = `REWARD-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const expirationDate = new Date();
    expirationDate.setMonth(expirationDate.getMonth() + 1);

    const voucher = await db.addVoucher({
      code,
      discount_percent: discount,
      max_uses: 1,
      current_uses: 0,
      expiration_date: expirationDate.toISOString(),
      created_by_type: 'points',
      created_by_id: user.id
    });

    await db.updateUser(user.id, { points: user.points - points_to_redeem });
    await db.addPointsHistory({
      user_id: user.id,
      points: -points_to_redeem,
      type: 'redeem',
      description: `Redeemed for ${code}`
    });
    res.json({ message: 'Redeemed', voucher });
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

// --- REAL PDF GENERATOR & EMAIL SYSTEM ---

/**
 * Reusable PDF Generation function utilizing a shared browser instance
 */
export async function generateTicketPdfBuffer(publicId: string): Promise<{ pdfBuffer: Buffer; order: any }> {
  const requestStart = Date.now();
  console.log(`[PDF GEN] Starting ticket generation for public ID: ${publicId}`);
  let page: any = null;
  try {
    // 1. Parallelize DB Fetch and Browser Acquisition
    const parallelStart = Date.now();
    const [dbResult, browserResult] = await Promise.all([
      (async () => {
        // Try fetching ticket instance first
        const ticket = await db.getTicketInstanceByPublicId(publicId);
        if (ticket) {
          await db.ensureTicketInstancesForOrder(ticket.order_id);
          const freshTicket = await db.getTicketInstanceByPublicId(publicId);
          return { ticket: freshTicket || ticket, order: null, time: Date.now() - parallelStart };
        }
        
        // Otherwise try fetching legacy order
        const o = await db.getOrderByPublicId(publicId);
        if (o) {
          if (o.is_paid || o.order_status === 'paid') {
            const instances = await db.ensureTicketInstancesForOrder(o.id);
            if (instances && instances.length > 0) {
              // Fallback to first ticket instance to strictly respect the single-ticket rule
              return { ticket: instances[0], order: null, time: Date.now() - parallelStart };
            }
          }
        }
        return { ticket: null, order: o, time: Date.now() - parallelStart };
      })(),
      (async () => {
        const info = await getSharedBrowser();
        return { info, time: Date.now() - parallelStart };
      })()
    ]);

    const { ticket, order: fetchedOrder, time: dbTime } = dbResult;
    const { info: browserInfo, time: acquireTime } = browserResult;
    const { browser, reused } = browserInfo;

    const order = ticket ? (ticket as any).order : fetchedOrder;
    if (!order) {
      throw new Error(`Order not found for public ID: ${publicId}`);
    }
    const isPaid = order.is_paid || order.order_status === 'paid';
    const event: any = order.event || {};
    
    // 2. QR Generation
    const qrStart = Date.now();
    let qrDataUrl = '';
    let statusText = isPaid ? 'CONFIRMED' : (order.order_status || 'PENDING').toUpperCase();

    if (ticket) {
      const ticketAny = ticket as any;
      if (isPaid && ticketAny.status !== 'PENDING' && ticketAny.qr_token) {
        const eventTimeStr = event.event_time || '00:00';
        const eventDateStr = event.event_date ? (typeof event.event_date === 'string' ? event.event_date.split('T')[0] : event.event_date.toISOString().split('T')[0]) : new Date().toISOString().split('T')[0];
        const eventDateTime = new Date(`${eventDateStr}T${eventTimeStr.includes(':') ? eventTimeStr : eventTimeStr + ':00'}`);
        
        let visible = false;
        if (event.qr_enabled_manual === true) {
          visible = true;
        } else if (!isNaN(eventDateTime.getTime()) && Date.now() >= eventDateTime.getTime() - (60 * 60 * 1000)) {
          visible = true;
        }

        if (visible) {
          const qrData = `TicketsHub-Ticket-${ticketAny.qr_token}`;
          qrDataUrl = await QRCode.toDataURL(qrData, { 
            margin: 1, 
            width: 256,
            errorCorrectionLevel: 'H',
            color: { dark: '#000000', light: '#FFFFFF' }
          });
        }
      }
    } else {
      if (isPaid && order.qr_code_token) {
        const eventTimeStr = event.event_time || '00:00';
        const eventDateStr = event.event_date ? (typeof event.event_date === 'string' ? event.event_date.split('T')[0] : event.event_date.toISOString().split('T')[0]) : new Date().toISOString().split('T')[0];
        const eventDateTime = new Date(`${eventDateStr}T${eventTimeStr.includes(':') ? eventTimeStr : eventTimeStr + ':00'}`);
        
        let visible = false;
        if (event.qr_enabled_manual === true) {
          visible = true;
        } else if (!isNaN(eventDateTime.getTime()) && Date.now() >= eventDateTime.getTime() - (60 * 60 * 1000)) {
          visible = true;
        }

        if (visible) {
          const qrData = `TicketsHub-Order-${order.qr_code_token}`;
          qrDataUrl = await QRCode.toDataURL(qrData, { 
            margin: 1, 
            width: 256,
            errorCorrectionLevel: 'H',
            color: { dark: '#000000', light: '#FFFFFF' }
          });
        }
      }
    }
    const qrTime = Date.now() - qrStart;

    // 3. SSR Rendering (Zero Hydration)
    const ssrStart = Date.now();
    const htmlBody = ReactDOMServer.renderToStaticMarkup(
      React.createElement(TicketTemplate, { order, ticket, qrDataUrl, isPaid, statusText })
    );

    const fullHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { margin: 0; padding: 0; background-color: #0A0F0E; -webkit-print-color-adjust: exact; }
          </style>
        </head>
        <body>
          ${htmlBody}
        </body>
      </html>
    `;
    const ssrTime = Date.now() - ssrStart;
    const htmlSize = Buffer.byteLength(fullHtml, 'utf8');

    // 4. Puppeteer Pipeline
    const pageStart = Date.now();
    page = await browser.newPage();
    const pageTime = Date.now() - pageStart;
    
    // Minimal interception
    await page.setRequestInterception(true);
    page.on('request', (request: any) => {
      request.abort(); 
    });

    await page.emulateMediaType('screen');
    
    // Inject Content Directly
    const setStart = Date.now();
    await page.setContent(fullHtml, { waitUntil: 'load' });
    const setTime = Date.now() - setStart;

    // Font readiness check
    const fontStart = Date.now();
    await Promise.race([
      page.evaluateHandle('document.fonts.ready'),
      new Promise(resolve => setTimeout(resolve, 1500))
    ]);
    const fontTime = Date.now() - fontStart;

    // Dimension Measurement
    const measureStart = Date.now();
    const element = await page.$('#print-content');
    const boundingBox = await element?.boundingBox();
    const measureTime = Date.now() - measureStart;
    
    if (!boundingBox) throw new Error('Render failed: Could not measure #print-content');

    // PDF Generation
    const pdfStart = Date.now();
    const pdfBuffer = await page.pdf({
      width: `${Math.ceil(boundingBox.width)}px`,
      height: `${Math.ceil(boundingBox.height)}px`,
      printBackground: true,
      margin: { top: '0px', right: '0px', bottom: '0px', left: '0px' },
      pageRanges: '1',
    });
    const pdfGenTime = Date.now() - pdfStart;

    const totalTime = Date.now() - requestStart;

    console.log(`
[PDF REPORT] - #${publicId}
---------------------------------------
Warm/Reused:        ${reused ? 'YES' : 'NO (Cold)'}
HTML Size:          ${(htmlSize / 1024).toFixed(2)} KB
PDF Size:           ${(pdfBuffer.length / 1024).toFixed(2)} KB
---------------------------------------
1. DB Fetch:        ${dbTime}ms
2. QR Gen:          ${qrTime}ms
3. SSR Render:      ${ssrTime}ms
4. Browser Acquire: ${acquireTime}ms
5. New Page:        ${pageTime}ms
6. Set Content:     ${setTime}ms
7. Fonts Ready:     ${fontTime}ms
8. Measure:         ${measureTime}ms
9. PDF Generate:    ${pdfGenTime}ms
---------------------------------------
TOTAL:              ${totalTime}ms
---------------------------------------`);

    if (!pdfBuffer || pdfBuffer.length < 500) {
       throw new Error(`Invalid PDF buffer generated`);
    }

    return { pdfBuffer, order };

  } catch (error: any) {
    console.error(`[PDF GENERATION EXCEPTION] #${publicId}:`, error);
    throw error;
  } finally {
    if (page) {
      await page.close().catch(() => {});
    }
  }
}

/**
 * Automates emailing ticket PDFs to buyers upon successful order payment.
 */
export async function sendTicketEmail(publicId: string): Promise<{ success: boolean; messageId?: string }> {
  console.log(`[EMAIL STEP 1] Entering sendTicketEmail()`);
  console.log(`📡 [EMAIL DISPATCH] Dispatching ticket email for order #${publicId}...`);
  try {
    // 1. Fetch the Order from DB
    const order = await db.getOrderByPublicId(publicId);
    if (!order) {
      throw new Error(`Order not found for public ID: ${publicId}`);
    }
    console.log(`[EMAIL STEP 2] Loaded Order ${order.public_id}`);

    // 2. Fetch User associated with the order from DB
    const user = await prisma.user.findUnique({ where: { id: order.user_id } });
    if (!user || !user.email) {
      throw new Error(`Recipient user or email address not found for order public ID: ${publicId}`);
    }

    const recipientName = getPersonalizedName(user.name, user.email);

    const eventTitle = order.event?.title || 'Your Event';
    const eventDate = order.event?.event_date ? new Date(order.event.event_date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A';
    const eventTime = order.event?.event_time || 'N/A';
    const eventVenue = order.event?.venue || 'N/A';
    const orderNum = order.id;

    // Ensure individual ticket instances exist
    await db.ensureTicketInstancesForOrder(order.id);

    // Fetch all ticket instances for this order
    const ticketInstances = await prisma.ticketInstance.findMany({
      where: { order_id: order.id },
      include: { ticket_type: true }
    });

    console.log(`[EMAIL STEP 3] Found ${ticketInstances.length} TicketInstances`);

    if (ticketInstances.length === 0) {
      throw new Error(`No ticket instances found/created for paid order ID: ${order.id}`);
    }

    console.log(`[TICKET INSTANCES CREATED] Generated/Confirmed ${ticketInstances.length} ticket instances for Order #${order.id}.`);

    // Generate PDF for EACH ticket instance in parallel to minimize checkout delay
    const attachments: any[] = [];
    const pdfPromises = ticketInstances.map(async (ticket) => {
      const ticketId = ticket.public_id;
      console.log(`[TICKET PDF START] Starting PDF generation for Ticket ${ticketId}`);
      const startPdf = Date.now();
      try {
        const { pdfBuffer } = await generateTicketPdfBuffer(ticketId);
        const duration = Date.now() - startPdf;
        const sizeBytes = pdfBuffer ? pdfBuffer.length : 0;
        console.log(`[TICKET PDF COMPLETE] PDF generation complete for Ticket ${ticketId} in ${duration}ms`);
        console.log(`[TICKET PDF SIZE] Ticket ${ticketId} PDF size: ${sizeBytes} bytes`);
        return {
          success: true,
          ticketId,
          pdfBuffer,
          sizeBytes,
          filename: `Ticket-${ticketId}.pdf`,
          contentType: 'application/pdf'
        };
      } catch (err: any) {
        console.error(`🚨 [TICKET PDF FAILURE] Failed to generate PDF for Ticket ${ticketId}:`, err.stack || err.message || err);
        return {
          success: false,
          ticketId,
          error: err
        };
      }
    });

    const pdfResults = await Promise.all(pdfPromises);
    let totalSizeBytes = 0;

    for (const result of pdfResults) {
      if (result.success && result.pdfBuffer) {
        attachments.push({
          filename: result.filename,
          content: result.pdfBuffer,
          contentType: result.contentType
        });
        totalSizeBytes += result.sizeBytes;
        console.log(`[ATTACHMENT ADDED] Attached Ticket-${result.ticketId}.pdf (${result.sizeBytes} bytes)`);
      } else {
        console.error(`🚨 [ATTACHMENT FAILURE] Skipping attachment for Ticket ${result.ticketId} due to PDF generation failure`);
      }
    }

    console.log(`[ATTACHMENT COUNT] Total attachments: ${attachments.length}`);
    console.log(`[TOTAL ATTACHMENT SIZE] Total attachments size: ${totalSizeBytes} bytes`);

    if (totalSizeBytes > 10 * 1024 * 1024) {
      console.warn(`⚠️ [TOTAL ATTACHMENT SIZE WARNING] Total attachments size (${totalSizeBytes} bytes) exceeds Resend limit of 10MB. Email might be rejected.`);
    }

    // 3. Compose high-polish HTML template
    const htmlText = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f4f7; color: #51545e; margin: 0; padding: 0; }
            .wrapper { width: 100%; table-layout: fixed; background-color: #f4f4f7; padding-bottom: 40px; }
            .content { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; margin-top: 40px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05); }
            .header { background-color: #0A0F0E; padding: 32px; text-align: center; border-bottom: 2px solid #1E2D2A; }
            .header h1 { color: #10B981; font-size: 24px; margin: 0; font-weight: 700; letter-spacing: 0.05em; }
            .body { padding: 32px; line-height: 1.6; }
            .body h2 { color: #1E2D2A; font-size: 20px; margin-top: 0; }
            .order-details { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 20px; margin: 24px 0; }
            .details-table { width: 100%; border-collapse: collapse; }
            .details-table td { padding: 6px 0; font-size: 14px; }
            .details-table td.label { font-weight: 600; color: #475569; width: 120px; }
            .details-table td.value { color: #0f172a; }
            .footer { text-align: center; padding: 24px; font-size: 12px; color: #94a3b8; }
          </style>
        </head>
        <body>
          <div class="wrapper">
            <div class="content">
              <div class="header">
                <h1 style="color: #10B981;">🎟️ TicketsHub</h1>
              </div>
              <div class="body">
                <h2>Your Order is Confirmed!</h2>
                <p>Hi ${recipientName},</p>
                <p>Thank you for your purchase. Your payment was successful, and your ticket for <strong>${eventTitle}</strong> is secured!</p>
                
                <p>We've attached your printable PDF ticket(s) to this email. You can also view/present them directly from your dashboard.</p>
                
                <div class="order-details">
                  <h3 style="margin-top: 0; color: #0f172a; font-size: 16px;">Order Receipt Summary</h3>
                  <table class="details-table">
                    <tr>
                      <td class="label">Order ID:</td>
                      <td class="value">#${orderNum}</td>
                    </tr>
                    <tr>
                      <td class="label">Event:</td>
                      <td class="value"><strong>${eventTitle}</strong></td>
                    </tr>
                    <tr>
                      <td class="label">Date:</td>
                      <td class="value">${eventDate}</td>
                    </tr>
                    <tr>
                      <td class="label">Time:</td>
                      <td class="value">${eventTime}</td>
                    </tr>
                    <tr>
                      <td class="label">Venue:</td>
                      <td class="value">${eventVenue}</td>
                    </tr>
                    <tr>
                      <td class="label">Ticket Qty:</td>
                      <td class="value">${ticketInstances.length}</td>
                    </tr>
                  </table>
                </div>

                <div class="order-details" style="margin-top: 20px;">
                  <h3 style="margin-top: 0; color: #0f172a; font-size: 16px;">Attendee Tickets</h3>
                  <table class="details-table">
                    ${ticketInstances.map((ticket, idx) => `
                      <tr style="border-bottom: 1px solid #e2e8f0;">
                        <td class="label" style="padding: 8px 0; font-weight: bold;">Ticket #${idx + 1}:</td>
                        <td class="value" style="padding: 8px 0;">
                          <strong>${ticket.attendee_name || 'Attendee'}</strong> (${ticket.ticket_type?.name || 'General Admission'})<br/>
                          <span style="font-family: monospace; font-size: 13px; color: #10B981; font-weight: bold; letter-spacing: 0.05em;">Ticket ID: ${ticket.public_id}</span>
                        </td>
                      </tr>
                    `).join('')}
                  </table>
                </div>
                
                <p><strong>Instructions:</strong> Please print or save the attached PDF ticket(s). The QR code on each ticket will be scanned at the entrance. Note that QR codes are activated as per the event rules (usually 1 hour before the gate opens).</p>
                
                <p>If you have any questions or require support, reply directly to this email or visit our website.</p>
                
                <p>Warm regards,<br/>The TicketsHub Team</p>
              </div>
              <div class="footer">
                <p>&copy; 2026 TicketsHub Inc. All rights reserved.</p>
                <p>This is an automated operational operational email. If you did not make this purchase, please contact security immediately.</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    const plainText = `
Hi ${recipientName},

Thank you for your purchase. Your payment was successful, and your tickets for "${eventTitle}" are secured!

We have attached your printable PDF ticket(s) to this email.

Order Details:
- Order ID: #${orderNum}
- Event: ${eventTitle}
- Date: ${eventDate}
- Time: ${eventTime}
- Venue: ${eventVenue}
- Quantity: ${ticketInstances.length}

Tickets Issued:
${ticketInstances.map((t, idx) => `Ticket #${idx + 1}: ${t.attendee_name} (${t.ticket_type?.name || 'Ticket'}) | Ticket ID: ${t.public_id}`).join('\n')}

Instructions:
Please present the attached PDF ticket(s) at the entrance. The QR code located on each ticket will be scanned at the gates.

If you have any questions, reply to this email or contact support.

Best regards,
The TicketsHub Team
    `;

    // 4. Send email
    console.log(`[EMAIL STEP 6] Calling sendEmail()`);
    console.log(`[SENDING EMAIL] Dispatching ticket email to ${user.email} with ${attachments.length} attachments.`);
    try {
      const mailResult = await sendEmail({
        to: user.email,
        subject: `🎟️ Your Event Tickets: ${eventTitle} (#${orderNum})`,
        html: htmlText,
        text: plainText,
        attachments
      });

      if (mailResult && mailResult.success) {
        console.log(`[EMAIL SUCCESS] Email sent successfully for Order #${orderNum} (Message ID: ${mailResult.messageId || 'N/A'})`);
      } else {
        console.error(`[EMAIL FAILURE] Email dispatch returned success=false for Order #${orderNum}`);
      }
      return mailResult;
    } catch (mailErr: any) {
      console.error(`[EMAIL FAILURE] Email dispatch threw exception for Order #${orderNum}: ${mailErr.message}`);
      console.error(`[FULL STACK TRACE] ${mailErr.stack}`);
      throw mailErr;
    }
  } catch (error: any) {
    console.error(`🚨 [EMAIL DISPATCH ERROR] Failed to email ticket for order public ID: ${publicId}. Error: ${error.stack || error.message}`);
    console.error(`[EMAIL FATAL] Execution stopped because: ${error.message}`);
    return { success: false };
  }
}

/**
 * Automates emailing invitation information to users.
 */
export async function sendInvitationEmail(email: string, eventId: number): Promise<void> {
  console.log(`📡 [EMAIL DISPATCH] Dispatching invitation email to ${email} for event #${eventId}...`);
  try {
    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) {
      throw new Error(`Event not found for invitation email: ${eventId}`);
    }
    const eventTitle = event.title;
    const eventDate = event.event_date ? new Date(event.event_date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A';
    const eventTime = event.event_time || 'N/A';
    const eventVenue = event.venue || 'N/A';

    const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}`;

    // Look up user by email to personalize greeting
    const user = await prisma.user.findUnique({ where: { email } });
    const recipientName = getPersonalizedName(user?.name, email);

    const htmlText = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f4f7; color: #51545e; margin: 0; padding: 0; }
            .wrapper { width: 100%; table-layout: fixed; background-color: #f4f4f7; padding-bottom: 40px; }
            .content { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; margin-top: 40px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05); }
            .header { background-color: #0A0F0E; padding: 32px; text-align: center; border-bottom: 2px solid #1E2D2A; }
            .header h1 { color: #10B981; font-size: 24px; margin: 0; font-weight: 700; letter-spacing: 0.05em; }
            .body { padding: 32px; line-height: 1.6; }
            .body h2 { color: #1E2D2A; font-size: 20px; margin-top: 0; }
            .event-details { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 20px; margin: 24px 0; }
            .details-table { width: 100%; border-collapse: collapse; }
            .details-table td { padding: 6px 0; font-size: 14px; }
            .details-table td.label { font-weight: 600; color: #475569; width: 120px; }
            .details-table td.value { color: #0f172a; }
            .btn { display: inline-block; background-color: #10B981; color: #ffffff; text-decoration: none; padding: 12px 24px; font-weight: bold; border-radius: 6px; margin: 20px 0; text-align: center; }
            .footer { text-align: center; padding: 24px; font-size: 12px; color: #94a3b8; }
          </style>
        </head>
        <body>
          <div class="wrapper">
            <div class="content">
              <div class="header">
                <h1 style="color: #10B981;">🎟️ TicketsHub</h1>
              </div>
              <div class="body">
                <h2>You're Invited!</h2>
                <p>Hi ${recipientName},</p>
                <p>You have been personally invited to attend <strong>${eventTitle}</strong>!</p>
                
                <div class="event-details">
                  <h3 style="margin-top: 0; color: #0f172a; font-size: 16px;">Event Details</h3>
                  <table class="details-table">
                    <tr>
                      <td class="label">Event:</td>
                      <td class="value"><strong>${eventTitle}</strong></td>
                    </tr>
                    <tr>
                      <td class="label">Date:</td>
                      <td class="value">${eventDate}</td>
                    </tr>
                    <tr>
                      <td class="label">Time:</td>
                      <td class="value">${eventTime}</td>
                    </tr>
                    <tr>
                      <td class="label">Venue:</td>
                      <td class="value">${eventVenue}</td>
                    </tr>
                  </table>
                </div>

                <p>To accept this invitation and claim your tickets, log in or sign up on our platform using your email address, and check your digital tickets dashboard.</p>
                
                <div style="text-align: center;">
                  <a href="${loginUrl}" class="btn" style="color: #ffffff;">Access Your Portal</a>
                </div>

                <p>Warm regards,<br/>The TicketsHub Team</p>
              </div>
              <div class="footer">
                <p>&copy; 2026 TicketsHub Inc. All rights reserved.</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    // Send the email
    await sendEmail({
      to: email,
      subject: `🎟️ Personal Invitation: ${eventTitle}`,
      html: htmlText
    });
    console.log(`✨ [EMAIL DISPATCH SUCCESS] Invitation email dispatched to ${email} for event #${eventId}`);

  } catch (error: any) {
    console.error(`🚨 [EMAIL DISPATCH ERROR] Failed to send invitation email to ${email}. Error: ${error.stack || error.message}`);
  }
}

// --- TICKET PRINT & PDF API ---
app.get('/api/tickets/:publicId/pdf', async (req: any, res: any) => {
  const publicId = req.params.publicId;
  const requestStart = Date.now();
  console.log(`[PDF DOWNLOAD] Starting export for order public ID ${publicId}`);
  
  try {
    const { pdfBuffer } = await generateTicketPdfBuffer(publicId);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Ticket-${publicId}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    
    res.end(pdfBuffer);
    console.log(`[PDF DOWNLOAD SUCCESS] Sent PDF file response in: ${Date.now() - requestStart}ms`);
  } catch (error: any) {
    console.error(`[PDF DOWNLOAD ERROR] Error downloading PDF ticket #${publicId}:`, error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to generate PDF ticket', details: error.message });
    }
  }
});


// --- SAFE EMAIL TEST ENDPOINT ---
app.post('/api/debug/test-email', async (req: any, res: any) => {
  console.log('📡 [DEBUG API] Received request on /api/debug/test-email');
  
  // Guard check: strictly require admin role OR allow in development mode without token
  const devMode = process.env.NODE_ENV !== 'production';
  let isAuthorized = devMode;

  if (!isAuthorized) {
    // If not in dev, try to authenticate standard token
    try {
      const authHeader = req.headers['authorization'];
      const token = authHeader && authHeader.split(' ')[1];
      if (token) {
        const decoded: any = jwt.verify(token, process.env.JWT_SECRET || 'secret');
        if (decoded && decoded.role === 'admin') {
          isAuthorized = true;
        }
      }
    } catch (err) {
      console.warn('[DEBUG API AUTHERR] Auth check failed on test-email endpoint:', err);
    }
  }

  if (!isAuthorized) {
    return res.status(403).json({ 
      success: false, 
      error: 'Forbidden. This endpoint is restricted to administrators or local dev environment only.' 
    });
  }

  try {
    const { email, publicId } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: 'Recipient address "email" is required.' });
    }

    const report: any = {
      timestamp: new Date().toISOString(),
      validationChecks: {},
      pdfGeneration: {},
      deliveryResult: {}
    };

    // 1. Diagnose Configuration & DNS
    console.log('[DEBUG API] Running Mailer configuration diagnostics...');
    const configReport = await verifyEmailConfig();
    report.validationChecks = {
      valid: configReport.valid,
      mode: configReport.mode,
      errors: configReport.errors,
      warnings: configReport.warnings,
      dns: configReport.dnsRecords
    };

    // 2. Validate/Generate PDF attachment
    let pdfBuffer: Buffer | null = null;
    let targetPublicId = publicId;

    if (targetPublicId) {
      try {
        console.log(`[DEBUG API] Generating PDF content for order public_id: ${targetPublicId}`);
        const genResult = await generateTicketPdfBuffer(targetPublicId);
        pdfBuffer = genResult.pdfBuffer;
        report.pdfGeneration = {
          success: true,
          publicId: targetPublicId,
          pdfSizeKb: (pdfBuffer.length / 1024).toFixed(2),
          orderId: genResult.order.id,
          eventTitle: genResult.order.event?.title
        };
      } catch (err: any) {
        console.error(`[DEBUG API PDF ERR] Failed to generate PDF for ${targetPublicId}:`, err);
        report.pdfGeneration = {
          success: false,
          error: err.message,
          stack: err.stack
        };
      }
    } else {
      // Find a mock or existing paid order in DB to test on if no publicId was supplied!
      try {
        const existingOrder = await prisma.order.findFirst({
          where: { is_paid: true },
          select: { public_id: true }
        });
        if (existingOrder) {
          targetPublicId = existingOrder.public_id;
          console.log(`[DEBUG API] Automatically selected paid order public_id: ${targetPublicId} for generation validation.`);
          const genResult = await generateTicketPdfBuffer(targetPublicId);
          pdfBuffer = genResult.pdfBuffer;
          report.pdfGeneration = {
            success: true,
            automaticallySelected: true,
            publicId: targetPublicId,
            pdfSizeKb: (pdfBuffer.length / 1024).toFixed(2),
            orderId: genResult.order.id,
            eventTitle: genResult.order.event?.title
          };
        } else {
          report.pdfGeneration = {
            success: false,
            error: 'No is_paid order exists in the database to run PDF generation test. Bypass PDF test.'
          };
        }
      } catch (err: any) {
        console.error('[DEBUG API] DB lookup / auto PDF generation test failed:', err);
        report.pdfGeneration = {
          success: false,
          error: `Auto lookup failed: ${err.message}`
        };
      }
    }

    // 3. Dispatch test email
    console.log(`[DEBUG API] Dispatching transaction email test to ${email}...`);
    const attachments = pdfBuffer ? [
      {
        filename: `Test-Ticket-Order-${targetPublicId || 'none'}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf'
      }
    ] : [];

    const mailResult = await sendEmail({
      to: email,
      subject: `🧪 TicketsHub Production Email Test System`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
          <h2 style="color: #10B981; border-bottom: 2px solid #10B981; padding-bottom: 10px;">🧪 Test Email Delivery Audit</h2>
          <p>This is a real-time production email delivery test from your **TicketsHub App**.</p>
          <p><strong>Execution Time:</strong> ${new Date().toUTCString()} (UTC)</p>
          <p><strong>Configured Mode:</strong> ${configReport.mode}</p>
          <p><strong>SMTP/Resend Credentials Valid:</strong> ${configReport.valid ? '✅ YES' : '❌ NO'}</p>
          
          <h3>Diagnostic Summary:</h3>
          <ul>
            <li><strong>PDF Attachment Rendered:</strong> ${pdfBuffer ? '✅ YES' : '❌ NO'}</li>
            ${pdfBuffer ? `<li><strong>Attachment Size:</strong> ${(pdfBuffer.length / 1024).toFixed(2)} KB</li>` : ''}
            <li><strong>MX Records check:</strong> ${configReport.dnsRecords?.hasMx ? 'Passed' : 'Failed'}</li>
            <li><strong>SPF Record check:</strong> ${configReport.dnsRecords?.hasSpf ? 'Passed' : 'Failed'}</li>
            <li><strong>DMARC Record check:</strong> ${configReport.dnsRecords?.hasDmarc ? 'Passed/Active' : 'Missing/Inactive'}</li>
          </ul>
          
          <p>If you see the PDF ticket attached to this email and can open it, then your **Puppeteer Chrome headless instance, React-SSR template parser, and attachments pipeline are 100% operationally sound!** 🚀</p>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;"/>
          <p style="font-size: 12px; color: #777;">Admin Delivery Diagnosis Panel &copy; 2026 TicketsHub.</p>
        </div>
      `,
      text: `Production Delivery Test: Real-time SMTP/Resend checks completed successfully. Attachment presence: ${!!pdfBuffer}`,
      attachments
    });

    report.deliveryResult = mailResult;

    if (mailResult.success) {
      console.log(`✨ [DEBUG API SUCCESS] Delivery audit completed successfully for recipient ${email}`);
      return res.status(200).json({
        success: true,
        message: 'Delivery audit dispatched successfully. Check your mailbox/attachment.',
        report
      });
    } else {
      console.warn(`🚨 [DEBUG API WARNING] Email dispatched but failed to deliver. Report:`, report);
      return res.status(502).json({
        success: false,
        error: 'Email dispatcher completed with delivery failure. Check logs.',
        report
      });
    }

  } catch (error: any) {
    console.error('🚨 [DEBUG API EXCEPTION] Encountered crash inside /api/debug/test-email endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Crash inside delivery test dispatcher route',
      details: error.message,
      stack: error.stack
    });
  }
});


// --- TICKET RESALE API ---
app.post('/api/tickets/resale', authenticateToken, requireEmailVerification, async (req: any, res) => {
  try {
    const { ticket_id } = req.body;
    const result = await prisma.$transaction(async (tx) => {
      const tickets = await tx.$queryRaw<any[]>`SELECT * FROM "OrderTicket" WHERE id = ${parseInt(ticket_id)} FOR UPDATE`;
      const ticket = tickets[0];
      if (!ticket) throw new Error('Ticket not found.');
      const order = await tx.order.findUnique({ where: { id: ticket.order_id } });
      if (!order || order.user_id !== req.user.id) throw new Error('Unauthorized.');
      if (order.order_status !== 'paid') throw new Error('Not paid.');
      if (ticket.status === 'reselling' || ticket.status === 'resold') throw new Error('Already reselling.');

      await tx.orderTicket.update({ where: { id: ticket.id }, data: { status: 'reselling' } });
      const ttList = await tx.$queryRaw<any[]>`SELECT * FROM "TicketType" WHERE id = ${ticket.ticket_type_id} FOR UPDATE`;
      const tt = ttList[0];
      if (tt) {
        await tx.ticketType.update({
          where: { id: tt.id },
          data: {
            quantity_sold: Math.max(0, tt.quantity_sold - 1),
            resale_queue: (tt.resale_queue || 0) + 1
          }
        });
      }
      return await tx.resellRequest.create({
        data: {
          user_id: req.user.id,
          order_ticket_id: ticket.id,
          ticket_type_id: ticket.ticket_type_id,
          order_id: order.id,
          status: 'pending'
        }
      });
    });
    res.json({ message: 'Submitted', resaleRequest: result });
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.get('/api/admin/resale', authenticateToken, authorizeRole(['admin']), async (req: any, res) => {
  try {
    const reqs = await db.getResellRequests();
    const users = await db.getUsers();
    res.json(reqs.map((r: any) => ({ ...r, userName: users.find((u: any) => u.id === r.user_id)?.name || 'Unknown' })));
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.put('/api/admin/resale/:id/status', authenticateToken, authorizeRole(['admin']), async (req: any, res) => {
  try {
    await db.updateResellRequest(parseInt(req.params.id), { status: req.body.status });
    res.json({ message: 'Status updated' });
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.put('/api/admin/resale/:id/payout', authenticateToken, authorizeRole(['admin']), async (req: any, res) => {
  try {
    await db.updateResellRequest(parseInt(req.params.id), { status: 'paid', paid_at: new Date().toISOString() });
    res.json({ message: 'Paid' });
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

// --- VOUCHER MANAGEMENT API ---
app.get('/api/admin/vouchers', authenticateToken, authorizeRole(['admin']), async (req: any, res) => {
  try {
    const vouchers = await db.getVouchers();
    const users = await db.getUsers();
    const enriched = vouchers.map((v: any) => {
      let creatorName = v.name || 'System';
      if (v.created_by_type === 'points') {
        const user = users.find((u: any) => u.id === v.created_by_id);
        creatorName = user ? user.name : 'Unknown';
      }
      const now = new Date();
      const status = new Date(v.expiration_date) < now ? 'expired' : (v.current_uses >= v.max_uses ? 'redeemed' : 'active');
      return { ...v, creatorName, status };
    });
    res.json(enriched);
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.post('/api/admin/vouchers', authenticateToken, authorizeRole(['admin']), requireEmailVerification, async (req: any, res) => {
  try {
    const { code, discount_percent, max_uses, expiration_date, name } = req.body;
    res.status(201).json(await db.addVoucher({
      code,
      discount_percent: parseFloat(discount_percent),
      max_uses: parseInt(max_uses),
      current_uses: 0,
      expiration_date,
      name: name || null,
      created_by_type: 'admin',
      created_by_id: req.user.id
    }));
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.delete('/api/admin/vouchers/:id', authenticateToken, authorizeRole(['admin']), requireEmailVerification, async (req: any, res) => {
  try {
    await db.deleteVoucher(parseInt(req.params.id));
    res.json({ success: true, message: 'Voucher deleted.' });
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.put('/api/admin/orders/:id/status', authenticateToken, authorizeRole(['admin']), async (req: any, res) => {
  try {
    const orderId = parseInt(req.params.id);
    const { status } = req.body;
    const result = await prisma.$transaction(async (tx) => {
      const orders = await tx.$queryRaw<any[]>`SELECT * FROM "Order" WHERE id = ${orderId} FOR UPDATE`;
      const order = orders[0];
      if (!order) throw new Error('Order not found.');
      const oldStatus = order.order_status;
      const updates: any = { order_status: status };
      if (status === 'approved') {
        const deadline = new Date();
        deadline.setHours(deadline.getHours() + 24);
        updates.payment_deadline = deadline;
      }
      const isReserved = (s: string) => ['pending', 'approved', 'paid', 'pending_approval', 'invited'].includes(s);
      const isNotReserved = (s: string) => ['rejected', 'cancelled'].includes(s);

      if (isReserved(oldStatus) && isNotReserved(status)) {
        const items = await tx.orderTicket.findMany({ where: { order_id: orderId } });
        for (const item of items) {
          const ttList = await tx.$queryRaw<any[]>`SELECT * FROM "TicketType" WHERE id = ${item.ticket_type_id} FOR UPDATE`;
          const tt = ttList[0];
          if (tt) {
            await tx.ticketType.update({
              where: { id: tt.id },
              data: {
                quantity_sold: Math.max(0, tt.quantity_sold - (item.qty_original || 0)),
                resale_queue: (tt.resale_queue || 0) + (item.qty_resale || 0)
              }
            });
          }
        }
      }
      if (isNotReserved(oldStatus) && isReserved(status)) {
        const items = await tx.orderTicket.findMany({ where: { order_id: orderId } });
        for (const item of items) {
          const ttList = await tx.$queryRaw<any[]>`SELECT * FROM "TicketType" WHERE id = ${item.ticket_type_id} FOR UPDATE`;
          const tt = ttList[0];
          if (tt && tt.quantity_sold + (item.qty_original || 0) > tt.quantity_total) throw new Error('Overselling risk');
          if (tt) {
            await tx.ticketType.update({
              where: { id: tt.id },
              data: {
                quantity_sold: tt.quantity_sold + (item.qty_original || 0),
                resale_queue: Math.max(0, (tt.resale_queue || 0) - (item.qty_resale || 0))
              }
            });
          }
        }
      }
      return await tx.order.update({ where: { id: orderId }, data: updates });
    });
    res.json(result);
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.put('/api/orders/:publicId/approve', authenticateToken, authorizeRole(['admin']), async (req: any, res) => {
  try {
    const order = await db.getOrderByPublicId(req.params.publicId);
    if (!order) return res.status(404).json({ error: 'Not found' });
    
    const deadline = new Date();
    deadline.setHours(deadline.getHours() + 24);
    
    // INTERNAL DB CALL: uses numeric order.id
    const updated = await db.updateOrder(order.id, { 
      order_status: 'approved', 
      payment_deadline: deadline 
    });
    
    const event = await db.getEventById(order.event_id);
    await db.addNotification({ 
      user_id: order.user_id, 
      title: 'Approved!', 
      message: `Your booking for ${event?.title} was approved. Payload valid for 24h.`, 
      type: 'success' 
    });
    res.json(updated);
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.put('/api/orders/:publicId/reject', authenticateToken, authorizeRole(['admin']), async (req: any, res) => {
  try {
    const order = await db.getOrderByPublicId(req.params.publicId);
    if (!order) return res.status(404).json({ error: 'Not found' });

    // INTERNAL DB CALL: uses numeric order.id
    const updated = await db.updateOrder(order.id, { order_status: 'rejected' });
    
    const event = await db.getEventById(order.event_id);
    await db.addNotification({ 
      user_id: order.user_id, 
      title: 'Rejected', 
      message: `Your booking for ${event?.title} was rejected.`, 
      type: 'error' 
    });
    res.json(updated);
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.put('/api/orders/:publicId/pay', authenticateToken, requireEmailVerification, async (req: any, res) => {
  try {
    const order = await db.getOrderByPublicId(req.params.publicId);
    if (!order) return res.status(404).json({ error: 'Not found' });
    
    // Security: Only user or admin can pay
    if (order.user_id !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: 'Unauthorized' });

    console.log(`[PAYMENT VERIFIED] Order #${order.id} manually paid / simulated.`);

    // INTERNAL DB CALL: uses numeric order.id
    const result = await db.updateOrder(order.id, { 
      order_status: 'paid', 
      is_paid: true, 
      paid_at: new Date() 
    });

    console.log(`[ORDER UPDATED] Order #${order.id} status updated to paid in DB.`);

    if (result) {
      // Generate individual TicketInstance records immediately
      await db.ensureTicketInstancesForOrder(order.id);
      console.log(`[TICKET INSTANCES CREATED] Generated/confirmed ticket instances for Order #${order.id}.`);

      // Dispatch email notification and await to ensure it completes before container freezes
      try {
        await sendTicketEmail(order.public_id);
      } catch (err) {
        console.error(`🚨 [EMAIL DISPATCH ERROR in simulated pay]:`, err);
      }
    }

    res.json(result);
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.post('/api/admin/scan', authenticateToken, authorizeRole(['admin']), async (req: any, res) => {
  try {
    const { ticket_id, event_id } = req.body;
    if (!ticket_id || !event_id) {
      return res.status(400).json({ error: 'Ticket ID and Event ID are required.' });
    }

    // 1. Try finding by TicketInstance qr_token or public_id
    let ticketInstance = await db.getTicketInstanceByQrToken(ticket_id);
    if (!ticketInstance) {
      ticketInstance = await db.getTicketInstanceByPublicId(ticket_id);
    }

    if (ticketInstance) {
      const order = ticketInstance.order;
      if (!order || order.event_id !== parseInt(event_id)) {
        return res.status(400).json({ error: 'Mismatch event' });
      }
      if (order.order_status !== 'paid') {
        return res.status(400).json({ error: 'Order not paid' });
      }
      if (ticketInstance.status === 'CHECKED_IN') {
        return res.status(400).json({ error: 'Already scanned', scanned_count: 1 });
      }
      if (ticketInstance.status !== 'VALID') {
        return res.status(400).json({ error: `Invalid ticket status: ${ticketInstance.status}` });
      }

      await db.updateTicketInstance(ticketInstance.id, {
        status: 'CHECKED_IN',
        checked_in_at: new Date()
      });

      return res.json({ 
        message: 'Approved', 
        ticket: {
          id: ticketInstance.id,
          public_id: ticketInstance.public_id,
          name: ticketInstance.ticket_type.name,
          attendee_name: ticketInstance.attendee_name,
          status: 'CHECKED_IN'
        } 
      });
    }

    // 2. Try finding by legacy Order qr_code_token
    const legacyOrder = await prisma.order.findFirst({
      where: { qr_code_token: ticket_id, event_id: parseInt(event_id) },
      include: { order_tickets: { include: { ticket_type: true } } }
    });

    if (legacyOrder) {
      if (legacyOrder.order_status !== 'paid') {
        return res.status(400).json({ error: 'Not paid' });
      }
      
      const unusedOrderTicket = legacyOrder.order_tickets.find(ot => !ot.is_used);
      if (!unusedOrderTicket) {
        return res.status(400).json({ 
          error: 'Already scanned', 
          scanned_count: legacyOrder.order_tickets.reduce((acc, t) => acc + t.scanned_count, 0) 
        });
      }

      await db.updateOrderTicket(unusedOrderTicket.id, { is_used: true, scanned_count: 1 });
      
      // Also ensure ticket instances are backfilled and check in the first one
      const instances = await db.ensureTicketInstancesForOrder(legacyOrder.id);
      const unusedInstance = instances.find(inst => inst.status === 'VALID');
      if (unusedInstance) {
        await db.updateTicketInstance(unusedInstance.id, { status: 'CHECKED_IN', checked_in_at: new Date() });
      }

      return res.json({
        message: 'Approved (Legacy Order)',
        ticket: {
          id: unusedOrderTicket.id,
          name: unusedOrderTicket.ticket_type.name,
          status: 'CHECKED_IN'
        }
      });
    }

    // 3. Fallback to legacy numeric OrderTicket ID
    if (!isNaN(parseInt(ticket_id))) {
      const ticket = await db.getOrderTicketById(parseInt(ticket_id));
      if (ticket) {
        const order = await db.getOrderById(ticket.order_id);
        if (!order || order.event_id !== parseInt(event_id)) {
          return res.status(400).json({ error: 'Mismatch event' });
        }
        if (order.order_status !== 'paid') {
          return res.status(400).json({ error: 'Not paid' });
        }
        if (ticket.is_used) {
          return res.status(400).json({ error: 'Already scanned', scanned_count: ticket.scanned_count });
        }
        
        await db.updateOrderTicket(ticket.id, { is_used: true, scanned_count: 1 });
        
        // Also update any corresponding backfilled instance
        const instances = await db.ensureTicketInstancesForOrder(order.id);
        const unusedInstance = instances.find(inst => inst.status === 'VALID');
        if (unusedInstance) {
          await db.updateTicketInstance(unusedInstance.id, { status: 'CHECKED_IN', checked_in_at: new Date() });
        }

        return res.json({ message: 'Approved', ticket });
      }
    }

    return res.status(404).json({ error: 'Ticket not found' });
  } catch (error: any) { 
    console.error('[API ERROR] /api/admin/scan:', error);
    res.status(500).json({ error: error.message }); 
  }
});

app.get('/api/tickets', authenticateToken, async (req: any, res) => {
  try {
    // Lazy migration backfill of legacy orders
    const orders = await db.getOrdersByUserId(req.user.id);
    for (const o of orders) {
      if (o.is_paid || o.order_status === 'paid') {
        await db.ensureTicketInstancesForOrder(o.id);
      }
    }

    const tickets = await db.getTicketInstancesByOwnerId(req.user.id);
    res.json(tickets);
  } catch (error: any) {
    console.error('[API ERROR] /api/tickets:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/tickets/:publicId', authenticateToken, async (req: any, res) => {
  try {
    const ticket = await db.getTicketInstanceByPublicId(req.params.publicId);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    if (ticket.owner_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    res.json(ticket);
  } catch (error: any) {
    console.error('[API ERROR] /api/tickets/:publicId:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/tickets/:publicId/qr-status', async (req: any, res) => {
  try {
    const ticket = await db.getTicketInstanceByPublicId(req.params.publicId);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

    const order = ticket.order;
    const event = order?.event;
    if (!event) return res.status(404).json({ error: 'Event not found' });
    if (order.order_status !== 'paid' || ticket.status === 'PENDING') {
      return res.json({ visible: false, reason: 'Payment pending' });
    }
    if (ticket.status === 'CHECKED_IN') {
      return res.json({ visible: false, reason: 'Already scanned' });
    }
    if (ticket.status !== 'VALID') {
      return res.json({ visible: false, reason: `Ticket status is ${ticket.status}` });
    }

    const qrData = `TicketsHub-Ticket-${ticket.qr_token}`;
    if (event.qr_enabled_manual === true) {
      return res.json({ visible: true, qr_data: qrData });
    }

    const eventDate = event.event_date;
    if (!eventDate) return res.json({ visible: false, reason: 'Event date not set' });
    const eventTime = new Date(eventDate).getTime();
    if (Date.now() >= eventTime - (60 * 60 * 1000)) {
      return res.json({ visible: true, qr_data: qrData });
    }
    res.json({ visible: false, reason: 'Available 1h before event' });
  } catch (error: any) {
    console.error('[API ERROR] /api/tickets/:publicId/qr-status:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/orders/:publicId/qr-status', async (req: any, res) => {
  try {
    const publicId = req.params.publicId;
    const order = await db.getOrderByPublicId(publicId);

    if (!order) return res.status(404).json({ error: 'Not found' });
    const event = await db.getEventById(order.event_id);
    if (!event) return res.status(404).json({ error: 'Event not found' });
    if (!order.is_paid || !order.qr_code_token) return res.json({ visible: false, reason: 'Payment pending' });
    
    const qrData = `TicketsHub-Order-${order.qr_code_token}`;
    if (event.qr_enabled_manual === true) return res.json({ visible: true, qr_data: qrData });
    
    const eventDate = event.event_date;
    if (!eventDate) return res.json({ visible: false, reason: 'Event date not set' });
    const eventTime = new Date(eventDate).getTime();
    if (Date.now() >= eventTime - (60 * 60 * 1000)) return res.json({ visible: true, qr_data: qrData });
    res.json({ visible: false, reason: 'Available 1h before event' });
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.put('/api/events/:id/toggle-qr', authenticateToken, authorizeRole(['admin']), async (req: any, res) => {
  try {
    const updated = await db.updateEvent(parseInt(req.params.id), { qr_enabled_manual: req.body.enabled });
    if (!updated) return res.status(404).json({ error: 'Not found' });
    res.json(updated);
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.get('/api/admin/invitations', authenticateToken, authorizeRole(['admin']), async (req: any, res) => {
  try { res.json(await db.getInvitations()); }
  catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.post('/api/admin/invitations', authenticateToken, authorizeRole(['admin']), requireEmailVerification, async (req: any, res) => {
  try {
    const { email, event_id, ticket_type_id } = req.body;
    const result = await prisma.$transaction(async (tx) => {
      const event = await tx.event.findUnique({ where: { id: parseInt(event_id) } });
      if (!event) throw new Error('Event not found.');
      const ttList = await tx.$queryRaw<any[]>`SELECT * FROM "TicketType" WHERE id = ${parseInt(ticket_type_id)} FOR UPDATE`;
      const tt = ttList[0];
      if (!tt || tt.event_id !== event.id) throw new Error('Invalid ticket type.');
      if (tt.quantity_sold >= tt.quantity_total) throw new Error('Sold out.');

      const invitation = await tx.invitation.create({
        data: { email, event_id: parseInt(event_id), ticket_type_id: parseInt(ticket_type_id), status: 'pending' }
      });

      const user = await tx.user.findUnique({ where: { email } });
      if (user) {
        const order = await tx.order.create({
          data: {
            user_id: user.id,
            event_id: parseInt(event_id),
            total_price: 0,
            order_status: 'invited',
            instagram_username: 'invited',
            phone: user.phone || 'N/A',
            age: user.age || 0,
            is_paid: true,
            processing_payment: false,
            points_awarded: false
          }
        });
        await tx.orderTicket.create({
          data: { order_id: order.id, ticket_type_id: parseInt(ticket_type_id), quantity: 1, price_each: 0, qty_original: 1, qty_resale: 0 }
        });
        await tx.ticketType.update({ where: { id: tt.id }, data: { quantity_sold: { increment: 1 } } });
        await tx.notification.create({
          data: { user_id: user.id, title: 'Invitation!', message: `You are invited to ${event.title}.`, type: 'info' }
        });
      }
      return invitation;
    });
    // Trigger invitation email as non-blocking async call
    sendInvitationEmail(email, parseInt(event_id)).catch(err => {
      console.error(`[ASYNC INVITATION DISPATCH ERROR]:`, err);
    });
    res.status(201).json(result);
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.put('/api/admin/invitations/:id', authenticateToken, authorizeRole(['admin']), requireEmailVerification, async (req: any, res) => {
  try { res.json(await db.updateInvitation(parseInt(req.params.id), req.body)); }
  catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.delete('/api/admin/invitations/:id', authenticateToken, authorizeRole(['admin']), requireEmailVerification, async (req: any, res) => {
  try { await db.deleteInvitation(parseInt(req.params.id)); res.json({ message: 'Deleted' }); }
  catch (error: any) { res.status(500).json({ error: error.message }); }
});

// --- FINALIZATION ---
console.log('[App] All routes registered synchronously.');

const listRoutes = () => {
    console.log('--- FINAL REGISTERED ROUTES ---');
    const registered: string[] = [];
    
    function processStack(stack: any[], prefix = '') {
        stack.forEach((middleware: any) => {
            if (middleware.route) {
                const methods = Object.keys(middleware.route.methods).join(',').toUpperCase();
                registered.push(`${methods.padEnd(7)} ${prefix}${middleware.route.path}`);
            } else if (middleware.name === 'router') {
                const newPrefix = prefix + (middleware.regexp.source.replace('^\\', '').replace('\\/?(?=\\/|$)', '') || '');
                processStack(middleware.handle.stack, newPrefix);
            }
        });
    }

    processStack(app._router.stack);
    registered.sort().forEach(r => console.log(r));
    console.log('-------------------------------');
};

listRoutes();

// --- CATCH ALL 404 ---
app.use((req, res) => {
    console.log('[EXPRESS 404]', req.method, req.url);
    res.status(404).json({ 
        error: 'Route not found in Express', 
        method: req.method, 
        url: req.url,
        timestamp: new Date().toISOString()
    });
});

// --- GLOBAL EXPRESS ERROR-HANDLING MIDDLEWARE ---
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  const timestamp = new Date().toISOString();
  const statusCode = err.status || err.statusCode || 500;
  
  console.error(`\n❌ [GLOBAL SEVERE UNHANDLED EXCEPTION] ${timestamp}`);
  console.error(`   Method: ${req.method}`);
  console.error(`   Path: ${req.originalUrl || req.url}`);
  console.error(`   Prisma Error Code: ${err.code || 'N/A'}`);
  console.error(`   Error Message: ${err.message || err}`);
  if (err.stack) {
    console.error(`   Stack Trace:\n${err.stack}`);
  }
  
  res.status(statusCode).json({
    error: 'An internal backend server error occurred.',
    message: err.message || 'Unknown database or server failure.',
    code: err.code || undefined,
    path: req.originalUrl || req.url,
    method: req.method,
    timestamp
  });
});

// Eagerly pre-warm Chromium and DB on module load (background)
setTimeout(() => {
  console.log('[Puppeteer] Module loaded. Eagerly warming up browser instance...');
  getSharedBrowser().catch(err => console.error('[Puppeteer] Eager warmup FAILED:', err));
  
  console.log('[DB] Module loaded. Warming up database connection...');
  db.getSettings().catch(err => console.error('[DB] Eager warmup FAILED:', err));
}, 100);

export default app;
