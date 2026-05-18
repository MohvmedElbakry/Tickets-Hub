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
import puppeteer from 'puppeteer';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_fallback_123';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || (JWT_SECRET + '_refresh');

const generateTokens = (user: any) => {
  const payload = { id: user.id, name: user.name, email: user.email, role: user.role, gender: user.gender };
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

// --- DIAGNOSTIC MIDDLEWARE ---
app.use((req, res, next) => {
  console.log('[API DIAGNOSTIC]', req.method, req.originalUrl || req.url, 'Headers:', JSON.stringify(req.headers));
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
  jwt.verify(token, JWT_SECRET, (err: any, decoded: any) => {
    if (err) return res.status(401).json({ error: 'Invalid or expired token.' });
    if (!decoded || !decoded.id) return res.status(401).json({ error: 'Invalid token payload.' });
    req.user = decoded;
    next();
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

    const newUser = await db.addUser({ 
      name, 
      email, 
      password_hash: passwordHash, 
      phone, 
      role: userRole, 
      birthdate: birthdate || '2000-01-01', 
      age: calculateAge(birthdate || '2000-01-01'),
      gender 
    });
    const { accessToken, refreshToken, user } = generateTokens(newUser);
    res.status(201).json({ user, accessToken, refreshToken });
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  console.log('[API] Login hit! Email:', email, 'Method:', req.method, 'Path:', req.path);
  try {
    if (!email || !password) return res.status(400).json({ error: 'Required fields missing.' });
    const user = await db.getUserByEmail(email);
    if (!user || !(await bcrypt.compare(password, user.password_hash))) return res.status(401).json({ error: 'Invalid email or password.' });
    const { accessToken, refreshToken, user: userPayload } = generateTokens(user);
    res.json({ user: userPayload, accessToken, refreshToken });
  } catch (error: any) { res.status(500).json({ error: 'Failed to login', details: error.message }); }
});

app.get('/api/auth/me', authenticateToken, async (req: any, res) => {
  try {
    const user = await db.getUserById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    const { password_hash, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
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
app.get('/api/events', async (req, res) => {
  try {
    const events = await db.getEvents();
    const result = events.map((e: any) => ({
      ...e,
      ticket_types: e.ticket_types || [],
      pre_registration_count: (e.pre_registrations || []).length
    }));
    res.json(result);
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.get('/api/events/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    // Background cleanup
    db.cleanupExpiredReservations().catch(err => console.error('[Cleanup Error]', err));
    
    const event: any = await db.getEventById(id);
    if (!event) return res.status(404).json({ error: 'Not found' });
    
    res.json({
      ...event,
      ticket_types: event.ticket_types || [],
      pre_registration_count: (event.pre_registrations || []).length
    });
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.post('/api/events', authenticateToken, authorizeRole(['admin']), async (req: any, res) => {
  try {
    const { ticket_types, ...data } = req.body;
    const newEvent = await db.addEvent({ ...data, organizer_id: req.user.id });
    if (ticket_types) await db.setTicketTypesForEvent(newEvent.id, ticket_types);
    res.status(201).json({ ...newEvent, ticket_types: await db.getTicketTypesByEventId(newEvent.id) });
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.put('/api/events/:id', authenticateToken, authorizeRole(['admin']), async (req: any, res: any) => {
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

app.delete('/api/events/:id', authenticateToken, authorizeRole(['admin']), async (req: any, res) => {
  try { await db.deleteEvent(parseInt(req.params.id)); res.json({ message: 'Deleted' }); }
  catch (error: any) { res.status(500).json({ error: error.message }); }
});

// --- ORDER ROUTES ---
console.log('[App] Registering Order Routes...');
app.post('/api/orders', authenticateToken, async (req: any, res) => {
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
          points_awarded: false
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
      return { 
        ...o, 
        items: o.order_tickets || [], 
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
      return { 
        ...o, 
        items: o.order_tickets || [], 
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
    const items = await db.getOrderTicketsByOrderId(order.id);
    const event = await db.getEventById(order.event_id);
    res.json({ ...order, items, event });
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

// --- SETTINGS ROUTES ---
console.log('[App] Registering Settings Routes...');
app.get('/api/settings', async (req, res) => {
  try { res.json(await db.getSettings()); }
  catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.put('/api/settings', authenticateToken, authorizeRole(['admin']), async (req: any, res) => {
  try { res.json(await db.updateSettings(req.body)); }
  catch (error: any) { res.status(500).json({ error: error.message }); }
});

  app.post('/api/payments/create-session', authenticateToken, async (req: any, res) => {
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
        console.log(`[API SUCCESS] Order #${order.id} confirmed via return.`);
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
        console.log(`[Webhook] Triggering markOrderAsPaid for order #${order.id} (Public: ${order.public_id})`);
        await db.markOrderAsPaid(order.id, transactionId);
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
    res.json(u);
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.put('/api/admin/users/:id', authenticateToken, async (req: any, res) => {
  try {
    const userId = parseInt(req.params.id);
    if (req.user.role !== 'admin' && req.user.id !== userId) return res.status(403).json({ error: 'Access denied.' });
    const updated = await db.updateUser(userId, req.body);
    if (!updated) return res.status(404).json({ error: 'User not found.' });
    const { password_hash, ...u } = updated;
    res.json(u);
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

app.post('/api/ticket-types', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try { res.status(201).json(await db.addTicketType(req.body)); }
  catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.put('/api/ticket-types/:id', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const updated = await db.updateTicketType(parseInt(req.params.id), req.body);
    if (!updated) return res.status(404).json({ error: 'Not found' });
    res.json(updated);
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.delete('/api/ticket-types/:id', authenticateToken, authorizeRole(['admin']), async (req, res) => {
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

app.post('/api/events/:id/pre-register', authenticateToken, async (req: any, res) => {
  try {
    const eventId = parseInt(req.params.id);
    const existing = await db.getPreRegistrationsByUserId(req.user.id);
    if (existing.find((r: any) => r.event_id === eventId)) return res.status(400).json({ error: 'Already pre-registered.' });
    res.status(201).json(await db.addPreRegistration({ user_id: req.user.id, event_id: eventId }));
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.delete('/api/events/:id/pre-register', authenticateToken, async (req: any, res) => {
  try {
    await db.removePreRegistration(req.user.id, parseInt(req.params.id));
    res.json({ message: 'Removed' });
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

app.post(['/api/user/redeem', '/api/user/points/redeem'], authenticateToken, async (req: any, res: any) => {
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

// --- TICKET PRINT & PDF API ---
app.get('/api/tickets/:publicId/pdf', async (req: any, res) => {
  const publicId = req.params.publicId;
  console.log(`[PDF Export] Starting export for order public ID #${publicId}`);
  
  let browser;
  try {
    const order = await db.getOrderByPublicId(publicId);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    const protocol = req.get('x-forwarded-proto') || req.protocol;
    const host = req.get('host');
    const APP_URL = process.env.APP_URL || `${protocol}://${host}`;
    const targetUrl = `${APP_URL}/ticket/print/${publicId}`;

    console.log(`[PDF Export] Navigating to: ${targetUrl}`);

    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1200,800'
      ]
    });

    const page = await browser.newPage();
    
    // Set viewport to a reasonable size
    await page.setViewport({ width: 1200, height: 800, deviceScaleFactor: 2 });
    
    // Set medium to screen to preserve full cinematic appearance (backgrounds, etc)
    await page.emulateMediaType('screen');

    // Navigate and wait for content
    await page.goto(targetUrl, { 
      waitUntil: ['networkidle0', 'domcontentloaded'],
      timeout: 30000 
    });

    // Wait for fonts to be ready
    await page.evaluateHandle('document.fonts.ready');

    // Wait for a small buffer to ensure QR code and any other dynamic elements are fully rendered
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Wait for the ticket card to be visible
    await page.waitForSelector('#print-content', { timeout: 10000 });

    // Generate the PDF
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        bottom: '20mm',
        left: '10mm',
        right: '10mm'
      },
      scale: 0.8 // Scale down slightly to fit well on A4
    });

    console.log(`[PDF Export] PDF generated successfully for order public ID #${publicId}`);

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=Ticket-${publicId}.pdf`);
    res.contentType('application/pdf');
    res.send(pdf);

  } catch (error: any) {
    console.error(`[PDF Export] Error for order public ID #${publicId}:`, error);
    res.status(500).json({ error: 'Failed to generate PDF ticket', details: error.message });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
});

// --- TICKET RESALE API ---
app.post('/api/tickets/resale', authenticateToken, async (req: any, res) => {
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

app.post('/api/admin/vouchers', authenticateToken, authorizeRole(['admin']), async (req: any, res) => {
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

app.delete('/api/admin/vouchers/:id', authenticateToken, authorizeRole(['admin']), async (req: any, res) => {
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

app.put('/api/orders/:publicId/pay', authenticateToken, async (req: any, res) => {
  try {
    const order = await db.getOrderByPublicId(req.params.publicId);
    if (!order) return res.status(404).json({ error: 'Not found' });
    
    // Security: Only user or admin can pay
    if (order.user_id !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: 'Unauthorized' });

    // INTERNAL DB CALL: uses numeric order.id
    const result = await db.updateOrder(order.id, { 
      order_status: 'paid', 
      is_paid: true, 
      paid_at: new Date() 
    });
    res.json(result);
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.post('/api/admin/scan', authenticateToken, authorizeRole(['admin']), async (req: any, res) => {
  try {
    const { ticket_id, event_id } = req.body;
    const ticket = await db.getOrderTicketById(parseInt(ticket_id));
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    const order = await db.getOrderById(ticket.order_id);
    if (!order || order.event_id !== parseInt(event_id)) return res.status(400).json({ error: 'Mismatch event' });
    if (order.order_status !== 'paid') return res.status(400).json({ error: 'Not paid' });
    if (ticket.is_used) return res.status(400).json({ error: 'Already scanned', scanned_count: ticket.scanned_count });
    await db.updateOrderTicket(ticket.id, { is_used: true, scanned_count: 1 });
    res.json({ message: 'Approved', ticket });
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.get('/api/orders/:publicId/qr-status', async (req: any, res) => {
  try {
    const publicId = req.params.publicId;
    // PROPER LOOKUP: Public APIs use Public ID (UUID)
    const order = await db.getOrderByPublicId(publicId);

    if (!order) return res.status(404).json({ error: 'Not found' });
    const event = await db.getEventById(order.event_id);
    if (!event) return res.status(404).json({ error: 'Event not found' });
    if (!order.is_paid || !order.qr_code_token) return res.json({ visible: false, reason: 'Payment pending' });
    
    // Check if QR is manually enabled or if it's within the 1h window
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

app.post('/api/admin/invitations', authenticateToken, authorizeRole(['admin']), async (req: any, res) => {
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
    res.status(201).json(result);
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.put('/api/admin/invitations/:id', authenticateToken, authorizeRole(['admin']), async (req: any, res) => {
  try { res.json(await db.updateInvitation(parseInt(req.params.id), req.body)); }
  catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.delete('/api/admin/invitations/:id', authenticateToken, authorizeRole(['admin']), async (req: any, res) => {
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

export default app;
